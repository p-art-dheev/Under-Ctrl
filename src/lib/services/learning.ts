// Server operations behind every learner action. Pattern: load the snapshot,
// call Gemma (or the labeled fixture) BEFORE writing, validate the proposal
// with backend rules, then commit one atomic change set with an idempotency
// key and, for graph changes, the expected graph version.

import type {
  AdaptationEvent,
  Attempt,
  Course,
  CourseState,
  Difficulty,
  GroupKind,
  LearningGoal,
  Lesson,
  LessonContent,
  Mastery,
  MasteryEvent,
  MisconceptionTag,
  Question,
  QuestionKey,
  Resource,
  Skill,
  SkillEdge,
  TutorMessage,
} from "@/lib/types";
import type { ChangeSet, Store } from "@/lib/db/store";
import { validateGraph, topoOrder } from "@/lib/domain/graph";
import { applyObservation, isMastered, isProvisional, RULES, UNASSESSED } from "@/lib/domain/mastery";
import { checkConfirmsGap, detectGap, followupPassed, planRemediation, shouldRequestCheck } from "@/lib/domain/adaptation";
import { sanitizeLessonCitations } from "@/lib/domain/citations";
import {
  contentMode,
  evaluateShortAnswer,
  generateLesson,
  generateQuestions,
  interpretGoal,
  proposeAdaptation,
  proposeGraph,
  rankSources,
  tutorReply,
  type QuestionPurpose,
  type TutorMode,
} from "@/lib/ai/tasks";
import type { QuestionOutT } from "@/lib/ai/schemas";
import { curatedFor, searchConfigured, tavilySearch, type SourceHit } from "@/lib/search";
import { loadSnapshot, masteryState, NotFound, skillViews, type Snapshot } from "./snapshot";

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export class UserError extends Error {}

// ------------------------------------------------------------------ helpers
function ancestors(snap: Pick<Snapshot, "edges">, skillId: string): Set<string> {
  const out = new Set<string>();
  const stack = [skillId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of snap.edges) {
      if (e.dependent_id === cur && !out.has(e.prerequisite_id)) {
        out.add(e.prerequisite_id);
        stack.push(e.prerequisite_id);
      }
    }
  }
  return out;
}

function masteryRow(course: Course, skillId: string, prev?: Mastery): Mastery {
  return (
    prev ?? {
      skill_id: skillId,
      course_id: course.id,
      owner_id: course.owner_id,
      score: null,
      evidence_count: 0,
      correct_no_hint: 0,
      provisional: true,
      unlock_override: false,
      last_assessed_at: null,
      updated_at: now(),
    }
  );
}

/** Turn generated questions into public rows plus private key rows. Unknown skill keys are dropped. */
function questionRows(
  course: Course,
  skills: Skill[],
  out: QuestionOutT[],
  group: { id: string; kind: GroupKind; lessonId: string | null; allowHints: boolean },
): { questions: Question[]; keys: QuestionKey[] } {
  const byKey = new Map(skills.map((s) => [s.key, s]));
  const questions: Question[] = [];
  const keys: QuestionKey[] = [];
  const t = now();
  out.forEach((q) => {
    const skill = byKey.get(q.skill_key);
    if (!skill) return;
    const qid = id();
    questions.push({
      id: qid,
      course_id: course.id,
      owner_id: course.owner_id,
      group_id: group.id,
      group_kind: group.kind,
      lesson_id: group.lessonId,
      skill_ids: [skill.id],
      type: q.type,
      prompt: q.prompt,
      options: q.type === "mcq" ? q.options : null,
      difficulty: q.difficulty,
      position: questions.length,
      allow_hints: group.allowHints,
      created_at: t,
    });
    const tags: Record<string, MisconceptionTag> = {};
    for (const tag of q.distractor_tags) {
      tags[String(tag.option)] = {
        code: tag.code,
        suspected_skill_id: tag.suspected_skill_key ? (byKey.get(tag.suspected_skill_key)?.id ?? null) : null,
        note: tag.note,
      };
    }
    keys.push({
      question_id: qid,
      course_id: course.id,
      owner_id: course.owner_id,
      correct_option: q.type === "mcq" ? q.correct_option : null,
      option_tags: tags,
      rubric: q.rubric,
      hint: q.hint,
      explanation: q.explanation,
    });
  });
  return { questions, keys };
}

const usedPrompts = (snap: Snapshot) => snap.questions.map((q) => q.prompt);
const skillBrief = (s: Skill) => ({ key: s.key, title: s.title, objective: s.objective });

async function makeQuestions(
  snap: Snapshot,
  purpose: QuestionPurpose,
  targets: Skill[],
  count: number,
  extra: { evidence?: string; focus?: string } = {},
) {
  const blame = new Set<string>();
  for (const t of targets) for (const a of ancestors(snap, t.id)) blame.add(a);
  const blameable = snap.skills.filter((s) => blame.has(s.id)).map((s) => s.key);
  return generateQuestions({
    purpose,
    goal: snap.goal.goal_text,
    skills: targets.map(skillBrief),
    blameableKeys: blameable,
    count,
    usedPrompts: usedPrompts(snap),
    ...extra,
  });
}

// ------------------------------------------------------------------ onboarding
export interface OnboardingInput {
  goal: string;
  experience: string;
  dailyMinutes: number;
  format: string;
  targetDate: string | null;
  clarification: string | null;
}

export type OnboardingResult = { status: "clarify"; question: string } | { status: "created"; courseId: string };

export async function startCourse(store: Store, input: OnboardingInput): Promise<OnboardingResult> {
  const interp = await interpretGoal({
    goal: input.goal,
    experience: input.experience,
    dailyMinutes: input.dailyMinutes,
    clarification: input.clarification,
  });
  if (!interp.is_specific && !input.clarification) {
    return { status: "clarify", question: interp.clarification_question ?? "Could you say more about what you want to be able to do?" };
  }
  const goalText = input.clarification ? `${input.goal}\n(Clarified: ${input.clarification})` : input.goal;
  const goal: LearningGoal = {
    id: id(),
    owner_id: store.userId,
    goal_text: goalText,
    experience: input.experience,
    daily_minutes: input.dailyMinutes,
    explanation_format: input.format,
    target_date: input.targetDate,
    interpretation: { title: interp.title, domain: interp.domain, summary: interp.summary },
    created_at: now(),
  };
  await store.insert("learning_goals", goal as unknown as Record<string, unknown>);
  const course: Course = {
    id: id(),
    goal_id: goal.id,
    owner_id: store.userId,
    title: interp.title,
    status: "setup",
    graph_version: 0,
    content_mode: contentMode(),
    state: { setup_stage: "graph" },
    created_at: now(),
    updated_at: now(),
  };
  await store.createCourse(course);
  await setActiveCourse(store, course.id, input.format);
  return { status: "created", courseId: course.id };
}

export async function setActiveCourse(store: Store, courseId: string, format?: string) {
  const [profile] = await store.select<{ id: string }>("profiles");
  if (profile) {
    await store.update("profiles", {}, { active_course_id: courseId, ...(format ? { explanation_format: format } : {}) });
  } else {
    await store.insert("profiles", { id: store.userId, active_course_id: courseId, explanation_format: format ?? null, display_name: null, timezone: null });
  }
}

export async function activeCourseId(store: Store): Promise<string | null> {
  const [profile] = await store.select<{ active_course_id: string | null }>("profiles");
  if (profile?.active_course_id) {
    const [c] = await store.select<Course>("courses", { id: profile.active_course_id });
    if (c) return c.id;
  }
  const courses = await store.select<Course>("courses");
  return courses.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.id ?? null;
}

// ------------------------------------------------------------------ setup pipeline
/**
 * Runs the next generation step of course setup. Each step commits on its own,
 * so a failed retrieval or lesson call can be retried without losing the
 * diagnostic. Returns the stage the course is now waiting on.
 */
export async function advanceSetup(store: Store, courseId: string): Promise<CourseState["setup_stage"]> {
  const snap = await loadSnapshot(store, courseId);
  const { course } = snap;
  const stage = course.state.setup_stage;
  const key = `setup:${course.id}:${stage}:${course.graph_version}:${snap.questions.length}:${snap.resources.length}:${snap.lessons.length}`;

  if (stage === "graph") {
    const interp = snap.goal.interpretation;
    const proposal = await proposeGraph({
      goal: snap.goal.goal_text,
      experience: snap.goal.experience,
      dailyMinutes: snap.goal.daily_minutes,
      title: interp?.title ?? course.title,
      summary: interp?.summary ?? snap.goal.goal_text,
    });
    const keys = new Set<string>();
    const skillsIn = proposal.skills.filter((s) => !keys.has(s.key) && keys.add(s.key));
    const seen = new Set<string>();
    const edgesIn = proposal.edges.filter((e) => {
      const k = `${e.prerequisite}->${e.dependent}`;
      if (seen.has(k) || !keys.has(e.prerequisite) || !keys.has(e.dependent) || e.prerequisite === e.dependent) return false;
      seen.add(k);
      return true;
    });
    const check = validateGraph(
      skillsIn.map((s) => ({ id: s.key })),
      edgesIn.map((e) => ({ from: e.prerequisite, to: e.dependent })),
    );
    if (!check.ok) throw new UserError(`The proposed skill graph was rejected (${check.errors[0]}). Please retry.`);
    const order = topoOrder(
      skillsIn.map((s, i) => ({ id: s.key, order: i })),
      edgesIn.map((e) => ({ from: e.prerequisite, to: e.dependent })),
    );
    const t = now();
    const skills: Skill[] = order.map((k, i) => {
      const s = skillsIn.find((x) => x.key === k)!;
      return {
        id: id(),
        course_id: course.id,
        owner_id: course.owner_id,
        key: s.key,
        title: s.title,
        objective: s.objective,
        goal_contribution: s.goal_contribution,
        estimated_minutes: s.estimated_minutes,
        kind: "core",
        remediates_skill_id: null,
        order_index: i,
        difficulty: "standard",
        search_query: s.search_query,
        created_version: 1,
        created_at: t,
      };
    });
    const byKey = new Map(skills.map((s) => [s.key, s.id]));
    const edges: SkillEdge[] = edgesIn.map((e) => ({
      id: id(),
      course_id: course.id,
      owner_id: course.owner_id,
      prerequisite_id: byKey.get(e.prerequisite)!,
      dependent_id: byKey.get(e.dependent)!,
      created_version: 1,
      created_at: t,
    }));
    const event: AdaptationEvent = {
      id: id(),
      course_id: course.id,
      owner_id: course.owner_id,
      kind: "graph_created",
      from_version: 0,
      to_version: 1,
      patch: null,
      evidence_attempt_ids: [],
      reason: `Initial skill graph: ${skills.length} skills and ${edges.length} prerequisite links, proposed by ${course.content_mode === "fixture" ? "the fixture course" : "Gemma"} and validated as acyclic.`,
      created_at: t,
    };
    await store.commit(
      course.id,
      {
        course: { graph_version: 1, state: { ...course.state, setup_stage: "diagnostic_1" } },
        upsert: {
          skills: rows(skills),
          skill_edges: rows(edges),
          skill_mastery: rows(skills.map((s) => masteryRow(course, s.id))),
          adaptation_events: rows([event]),
        },
      },
      { expectedVersion: 0, idempotencyKey: key },
    );
    return "diagnostic_1";
  }

  if (stage === "diagnostic_1" || stage === "diagnostic_2") {
    if (snap.questions.some((q) => q.group_kind === stage)) return stage; // waiting on the learner
    let targets: Skill[];
    let evidence: string | undefined;
    if (stage === "diagnostic_1") {
      // foundational skills first: those with no or few prerequisites
      targets = snap.skills.filter((s) => s.kind === "core").slice(0, 6);
    } else {
      const results = snap.attempts.filter((a) => snap.questions.find((q) => q.id === a.question_id)?.group_kind === "diagnostic_1");
      const missed = new Set<string>();
      const passed = new Set<string>();
      for (const a of results) {
        const sid = snap.questions.find((q) => q.id === a.question_id)!.skill_ids[0];
        (a.is_correct ? passed : missed).add(sid);
      }
      const pick: Skill[] = [];
      for (const sid of passed) {
        const dep = snap.edges.find((e) => e.prerequisite_id === sid && !passed.has(e.dependent_id) && !missed.has(e.dependent_id));
        if (dep) pick.push(snap.skills.find((s) => s.id === dep.dependent_id)!);
      }
      for (const sid of missed) pick.push(snap.skills.find((s) => s.id === sid)!);
      targets = [...new Map(pick.filter(Boolean).map((s) => [s.id, s])).values()].slice(0, 3);
      if (targets.length < 3) {
        for (const s of snap.skills) if (targets.length < 3 && !targets.includes(s) && !passed.has(s.id) && !missed.has(s.id)) targets.push(s);
      }
      evidence = results
        .map((a) => {
          const q = snap.questions.find((x) => x.id === a.question_id)!;
          const s = snap.skills.find((x) => x.id === q.skill_ids[0]);
          return `${s?.key}: ${a.is_correct ? "correct" : "incorrect"} (${q.difficulty})`;
        })
        .join("\n");
    }
    const out = await makeQuestions(snap, stage, targets, stage === "diagnostic_1" ? 4 : 3, { evidence });
    if (out.length === 0) throw new UserError("No diagnostic questions could be generated. Please retry.");
    const { questions, keys } = questionRows(course, snap.skills, out, { id: id(), kind: stage, lessonId: null, allowHints: false });
    await store.commit(course.id, { upsert: { questions: rows(questions), question_keys: rows(keys) } }, { idempotencyKey: key });
    return stage;
  }

  if (stage === "resources") {
    const resources = await retrieveResources(snap);
    await store.commit(
      course.id,
      {
        course: {
          state: {
            ...course.state,
            setup_stage: "lesson",
            resource_origin: resources.some((r) => r.origin === "live_search") ? "live_search" : "curated",
          },
        },
        upsert: { resources: rows(resources) },
      },
      { idempotencyKey: key },
    );
    return "lesson";
  }

  if (stage === "lesson") {
    const views = skillViews(snap);
    const first = snap.skills.find((s) => views.get(s.id)!.state !== "locked" && !views.get(s.id)!.mastered) ?? snap.skills[0];
    await ensureLesson(store, course.id, first.id);
    const fresh = await loadSnapshot(store, course.id);
    await store.commit(
      course.id,
      { course: { status: "active", state: { ...fresh.course.state, setup_stage: "done" } } },
      { idempotencyKey: `setup:done:${course.id}` },
    );
    return "done";
  }
  return stage;
}

const rows = <T>(list: T[]) => list as unknown as Record<string, unknown>[];

async function retrieveResources(snap: Snapshot): Promise<Resource[]> {
  const { course } = snap;
  const t = now();
  const hits: { skill: Skill; hit: SourceHit }[] = [];
  const core = snap.skills.filter((s) => s.kind === "core");
  if (searchConfigured()) {
    try {
      const candidates: { id: string; skill: Skill; title: string; url: string; snippet: string; query: string }[] = [];
      // bounded: one search per skill, four results each, four at a time
      for (let i = 0; i < core.length; i += 4) {
        const batch = core.slice(i, i + 4);
        const results = await Promise.all(
          batch.map(async (s) => {
            const query = s.search_query || `${s.title} tutorial for beginners`;
            return { s, query, results: await tavilySearch(query, 4) };
          }),
        );
        for (const r of results) {
          for (const x of r.results) {
            candidates.push({ id: `C${candidates.length + 1}`, skill: r.s, title: x.title, url: x.url, snippet: x.content, query: r.query });
          }
        }
      }
      const ranking = await rankSources(
        snap.goal.goal_text,
        core.map((s) => ({ key: s.key, title: s.title })),
        candidates.map((c) => ({ id: c.id, skill_key: c.skill.key, title: c.title, url: c.url, snippet: c.snippet })),
      );
      const perSkill = new Map<string, number>();
      for (const sel of ranking.selections) {
        const c = candidates.find((x) => x.id === sel.candidate_id && x.skill.key === sel.skill_key);
        if (!c || (perSkill.get(c.skill.id) ?? 0) >= 3) continue;
        if (hits.some((h) => h.skill.id === c.skill.id && h.hit.url === c.url)) continue;
        perSkill.set(c.skill.id, (perSkill.get(c.skill.id) ?? 0) + 1);
        hits.push({
          skill: c.skill,
          hit: {
            title: c.title,
            url: c.url,
            provider: new URL(c.url).hostname.replace(/^www\./, ""),
            excerpt: `${c.snippet} (Search-result snippet; the full page was not read.)`,
            format: sel.format,
            origin: "live_search",
            verification_status: "retrieved via Tavily search; ranked by Gemma; not independently verified",
            selection_reason: sel.reason,
            estimated_minutes: null,
            query: c.query,
          },
        });
      }
    } catch (err) {
      // fall through to the curated catalog, which is labeled as such
      console.error("live search failed, using curated catalog:", (err as Error).message);
      hits.length = 0;
    }
  }
  if (hits.length === 0) {
    for (const s of core) for (const hit of curatedFor(s)) hits.push({ skill: s, hit });
  }
  return hits.map(({ skill, hit }, i) => ({
    id: id(),
    course_id: course.id,
    owner_id: course.owner_id,
    skill_id: skill.id,
    source_key: `S${i + 1}`,
    url: hit.url,
    title: hit.title,
    provider: hit.provider,
    excerpt: hit.excerpt,
    format: hit.format,
    origin: hit.origin,
    verification_status: hit.verification_status,
    selection_reason: hit.selection_reason,
    estimated_minutes: hit.estimated_minutes,
    retrieved_at: t,
  }));
}

// ------------------------------------------------------------------ lessons
/** Returns the current lesson for a skill, generating it on demand (cached by version and difficulty). */
export async function ensureLesson(store: Store, courseId: string, skillId: string): Promise<Lesson> {
  const snap = await loadSnapshot(store, courseId);
  const skill = snap.skills.find((s) => s.id === skillId);
  if (!skill) throw new NotFound("Skill not found.");
  const lessons = snap.lessons.filter((l) => l.skill_id === skillId);
  const latest = lessons[lessons.length - 1];
  const latestCompleted = latest && snap.progress.some((p) => p.lesson_id === latest.id && p.status === "completed");
  // a new version is generated only when the target difficulty changed and the
  // current version is unfinished; earlier versions and their attempts are kept
  if (latest && (latest.difficulty === skill.difficulty || latestCompleted)) return latest;

  const reviewOf = skill.remediates_skill_id ? snap.skills.find((s) => s.id === skill.remediates_skill_id) ?? null : null;
  const gapNote =
    reviewOf &&
    ([...snap.adaptations].reverse().find((e) => e.kind === "remediation_inserted" && e.patch?.add_skills?.some((s) => s.id === skill.id))?.reason ?? "");
  const sourceSkillIds = new Set([skill.id, ...(reviewOf ? [reviewOf.id] : [])]);
  const resources = snap.resources.filter((r) => sourceSkillIds.has(r.skill_id)).slice(0, 4);
  const prereqTitles = snap.edges
    .filter((e) => e.dependent_id === skill.id)
    .map((e) => snap.skills.find((s) => s.id === e.prerequisite_id)?.title ?? "");
  const mistakes = recentMistakes(snap, reviewOf?.id ?? skill.id);
  const target = reviewOf ?? skill;
  const blame = [...ancestors(snap, target.id)].map((x) => snap.skills.find((s) => s.id === x)!.key);

  const out = await generateLesson({
    goal: snap.goal.goal_text,
    skill: { key: skill.key, title: skill.title, objective: skill.objective, kind: skill.kind },
    reviewOf: reviewOf ? { key: reviewOf.key, title: reviewOf.title, gapNote: gapNote || "a confirmed gap" } : null,
    prerequisites: prereqTitles,
    difficulty: skill.difficulty,
    minutes: Math.min(snap.goal.daily_minutes, skill.estimated_minutes + 10),
    format: snap.goal.explanation_format,
    sources: resources.map((r) => ({ id: r.source_key, title: r.title, excerpt: r.excerpt })),
    recentMistakes: mistakes,
    blameableKeys: blame,
    usedPrompts: usedPrompts(snap),
  });

  const allowed = resources.map((r) => r.source_key);
  const content: LessonContent = {
    objective: out.objective,
    prerequisite_recap: out.prerequisite_recap,
    sections: out.sections,
    worked_example: out.worked_example,
    exercise_intro: out.exercise.prompt,
    estimated_minutes: Math.min(snap.goal.daily_minutes, skill.estimated_minutes + 10),
  };
  const clean = sanitizeLessonCitations(content, allowed);
  const lesson: Lesson = {
    id: id(),
    course_id: snap.course.id,
    owner_id: snap.course.owner_id,
    skill_id: skill.id,
    version: (latest?.version ?? 0) + 1,
    difficulty: skill.difficulty,
    content: clean.content,
    source_keys: clean.used,
    practice_group_id: id(),
    content_mode: snap.course.content_mode,
    created_at: now(),
  };
  // practice targets this skill; a remediation lesson's practice is the follow-up on the prerequisite
  const practiceOut = out.practice.map((q) => ({ ...q, skill_key: reviewOf ? reviewOf.key : skill.key }));
  const exerciseQ: QuestionOutT = {
    skill_key: reviewOf ? reviewOf.key : skill.key,
    type: "short",
    difficulty: "medium",
    prompt: out.exercise.prompt,
    options: null,
    correct_option: null,
    distractor_tags: [],
    rubric: out.exercise.rubric,
    hint: out.exercise.hint,
    explanation: out.exercise.rubric.join(" "),
  };
  const hasExercise = practiceOut.some((q) => q.prompt === exerciseQ.prompt);
  const { questions, keys } = questionRows(snap.course, snap.skills, hasExercise ? practiceOut : [...practiceOut, exerciseQ].slice(0, 5), {
    id: lesson.practice_group_id,
    kind: reviewOf ? "followup" : "practice",
    lessonId: lesson.id,
    allowHints: true,
  });
  const state = { ...snap.course.state };
  if (reviewOf) {
    state.followups = (state.followups ?? []).map((f) =>
      f.remediation_skill_id === skill.id && f.status === "scheduled" ? { ...f, group_id: lesson.practice_group_id } : f,
    );
  }
  await store.commit(
    snap.course.id,
    { course: reviewOf ? { state } : undefined, upsert: { lessons: rows([lesson]), questions: rows(questions), question_keys: rows(keys) } },
    { idempotencyKey: `lesson:${skill.id}:${lesson.version}` },
  );
  const [saved] = await store.select<Lesson>("lessons", { skill_id: skill.id, version: lesson.version });
  return saved ?? lesson;
}

function recentMistakes(snap: Snapshot, skillId: string): string[] {
  return snap.attempts
    .filter((a) => !a.is_correct && snap.questions.find((q) => q.id === a.question_id)?.skill_ids.includes(skillId))
    .slice(-4)
    .flatMap((a) => (a.misconceptions.length ? a.misconceptions.map((m) => m.note) : [a.feedback.slice(0, 160)]));
}

/** Additional independent practice for a skill (new questions; old attempts stay as they are). */
export async function addPractice(store: Store, courseId: string, skillId: string) {
  const snap = await loadSnapshot(store, courseId);
  const skill = snap.skills.find((s) => s.id === skillId);
  if (!skill) throw new NotFound("Skill not found.");
  const target = skill.remediates_skill_id ? snap.skills.find((s) => s.id === skill.remediates_skill_id)! : skill;
  const lesson = snap.lessons.filter((l) => l.skill_id === skillId).pop() ?? null;
  const out = await makeQuestions(snap, skill.kind === "remediation" ? "followup" : "practice", [target], 3, {
    evidence: recentMistakes(snap, target.id).join("\n") || undefined,
  });
  if (out.length === 0) throw new UserError("No new practice questions are available for this skill right now.");
  const groupId = id();
  const { questions, keys } = questionRows(snap.course, snap.skills, out, {
    id: groupId,
    kind: skill.kind === "remediation" ? "followup" : "practice",
    lessonId: lesson?.id ?? null,
    allowHints: true,
  });
  const state = { ...snap.course.state };
  if (skill.kind === "remediation") {
    state.followups = (state.followups ?? []).map((f) =>
      f.remediation_skill_id === skill.id && f.status === "scheduled" ? { ...f, group_id: groupId } : f,
    );
  }
  await store.commit(snap.course.id, {
    course: skill.kind === "remediation" ? { state } : undefined,
    upsert: { questions: rows(questions), question_keys: rows(keys) },
  });
  return groupId;
}

// ------------------------------------------------------------------ hints and tutor
export async function requestHint(store: Store, courseId: string, questionId: string): Promise<string> {
  const snap = await loadSnapshot(store, courseId);
  const q = snap.questions.find((x) => x.id === questionId);
  if (!q) throw new NotFound("Question not found.");
  if (!q.allow_hints) throw new UserError("Hints are not available for diagnostic questions.");
  if (snap.attempts.some((a) => a.question_id === questionId)) throw new UserError("This question was already answered.");
  const [key] = await store.questionKeys(courseId, [questionId]);
  await store.insert("hint_uses", { question_id: questionId, course_id: courseId, created_at: now() });
  return key?.hint ?? "Re-read the question and the worked example.";
}

export async function askTutor(store: Store, courseId: string, skillId: string, mode: TutorMode, message: string) {
  const snap = await loadSnapshot(store, courseId);
  const skill = snap.skills.find((s) => s.id === skillId);
  if (!skill) throw new NotFound("Skill not found.");
  const target = skill.remediates_skill_id ? snap.skills.find((s) => s.id === skill.remediates_skill_id)! : skill;
  const lesson = snap.lessons.filter((l) => l.skill_id === skillId).pop() ?? null;
  const history = (await store.select<TutorMessage>("tutor_messages", { course_id: courseId, skill_id: skillId })).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const m = masteryState(snap.mastery.find((x) => x.skill_id === target.id));
  const sources = snap.resources.filter((r) => r.skill_id === target.id).slice(0, 3);
  const learnerText = message.trim().slice(0, 1500) || { ask: "", simpler: "Explain more simply", example: "Give an example", check: "Check my understanding", hint: "Give me a hint" }[mode];
  const reply = await tutorReply({
    mode,
    message: learnerText,
    skill: skillBrief(target),
    lessonSummary: lesson ? `${lesson.content.objective} Sections: ${lesson.content.sections.map((s) => s.heading).join(", ")}` : "No lesson yet.",
    sources: sources.map((r) => ({ id: r.source_key, title: r.title, excerpt: r.excerpt })),
    recentMistakes: recentMistakes(snap, target.id),
    mastery: m.score === null ? "unassessed" : `${Math.round(m.score * 100)}% from ${m.evidence_count} answers`,
    history: history.map((h) => ({ role: h.role, content: h.content })),
    hintsGiven: history.filter((h) => h.role === "tutor").length,
  });
  const allowed = new Set(sources.map((s) => s.source_key));
  const cited = reply.cited_source_ids.filter((c) => allowed.has(c));
  const t = Date.now();
  await store.insert("tutor_messages", { course_id: courseId, skill_id: skillId, lesson_id: lesson?.id ?? null, role: "learner", content: learnerText, created_at: new Date(t).toISOString() });
  const content = cited.length ? `${reply.reply}\n\nSources: ${cited.join(", ")}` : reply.reply;
  await store.insert("tutor_messages", { course_id: courseId, skill_id: skillId, lesson_id: lesson?.id ?? null, role: "tutor", content, created_at: new Date(t + 1).toISOString() });
}

// ------------------------------------------------------------------ lesson progress and learner choices
export async function markLesson(store: Store, courseId: string, lessonId: string, action: "start" | "complete" | "tick") {
  const [lesson] = await store.select<Lesson>("lessons", { id: lessonId, course_id: courseId });
  if (!lesson) throw new NotFound("Lesson not found.");
  const [p] = await store.select<{ id: string; status: string; active_minutes: number }>("lesson_progress", { lesson_id: lessonId });
  if (!p) {
    await store.insert("lesson_progress", {
      course_id: courseId,
      lesson_id: lessonId,
      skill_id: lesson.skill_id,
      status: action === "complete" ? "completed" : "started",
      started_at: now(),
      completed_at: action === "complete" ? now() : null,
      active_minutes: action === "tick" ? 1 : 0,
    });
    return;
  }
  if (action === "complete" && p.status !== "completed") {
    await store.update("lesson_progress", { lesson_id: lessonId }, { status: "completed", completed_at: now() });
  } else if (action === "tick") {
    await store.update("lesson_progress", { lesson_id: lessonId }, { active_minutes: Math.min(600, p.active_minutes + 1) });
  }
}

export async function postponeRemediation(store: Store, courseId: string, remediationId: string) {
  const snap = await loadSnapshot(store, courseId);
  const r = snap.skills.find((s) => s.id === remediationId && s.kind === "remediation");
  if (!r) throw new NotFound("Review activity not found.");
  const dependents = snap.edges.filter((e) => e.prerequisite_id === r.id).map((e) => e.dependent_id);
  const postponed = { ...(snap.course.state.postponed ?? {}) };
  for (const d of dependents) postponed[d] = r.id;
  const event: AdaptationEvent = {
    id: id(),
    course_id: courseId,
    owner_id: snap.course.owner_id,
    kind: "remediation_postponed",
    from_version: snap.course.graph_version,
    to_version: snap.course.graph_version,
    patch: null,
    evidence_attempt_ids: [],
    reason: `You postponed "${r.title}". The next lesson is unlocked, and the review stays recommended.`,
    created_at: now(),
  };
  await store.commit(courseId, { course: { state: { ...snap.course.state, postponed } }, upsert: { adaptation_events: rows([event]) } }, { idempotencyKey: `postpone:${r.id}` });
}

/** Documented learner override: unlock a skill whose prerequisites are not ready yet. */
export async function overrideUnlock(store: Store, courseId: string, skillId: string) {
  const snap = await loadSnapshot(store, courseId);
  if (!snap.skills.some((s) => s.id === skillId)) throw new NotFound("Skill not found.");
  const row = { ...masteryRow(snap.course, skillId, snap.mastery.find((m) => m.skill_id === skillId)), unlock_override: true, updated_at: now() };
  await store.commit(courseId, { upsert: { skill_mastery: rows([row]) } });
}

// ------------------------------------------------------------------ assessment
export interface AnswerInput {
  question_id: string;
  option?: number | null;
  text?: string | null;
  confidence?: number | null;
  dont_understand?: boolean;
}

export interface GradedResult {
  question_id: string;
  score: number;
  is_correct: boolean;
  feedback: string;
  explanation: string;
  correct_option: number | null;
}

export interface SubmitResult {
  duplicate: boolean;
  results: GradedResult[];
  outcome: string | null;
}

export async function submitAssessment(
  store: Store,
  courseId: string,
  groupId: string,
  answers: AnswerInput[],
  idempotencyKey: string,
): Promise<SubmitResult> {
  const snap = await loadSnapshot(store, courseId);
  const { course } = snap;
  const questions = snap.questions.filter((q) => q.group_id === groupId);
  if (questions.length === 0) throw new NotFound("Assessment not found.");
  const kind = questions[0].group_kind;
  const keys = new Map((await store.questionKeys(courseId, questions.map((q) => q.id))).map((k) => [k.question_id, k]));

  const already = snap.attempts.filter((a) => a.group_id === groupId);
  if (already.length > 0) {
    // a retry or a second tab: return what was graded the first time
    return { duplicate: true, results: already.map((a) => toResult(a, keys.get(a.question_id))), outcome: null };
  }
  const byQ = new Map(answers.map((a) => [a.question_id, a]));
  for (const q of questions) {
    const a = byQ.get(q.id);
    const empty = !a || (q.type === "mcq" ? a.option === null || a.option === undefined : !a.text?.trim());
    if (empty) throw new UserError("Please answer every question before submitting.");
  }

  const hintCount = (qid: string) => snap.hints.filter((h) => h.question_id === qid).length;
  const allowedBlame = (q: Question) => new Set([q.skill_ids[0], ...ancestors(snap, q.skill_ids[0])]);
  const t = now();

  // grade (short answers in parallel, before any write)
  const attempts: Attempt[] = await Promise.all(
    questions.map(async (q): Promise<Attempt> => {
      const a = byQ.get(q.id)!;
      const key = keys.get(q.id);
      if (!key) throw new Error("answer key missing");
      let score: number;
      let feedback: string;
      let misconceptions: MisconceptionTag[] = [];
      if (q.type === "mcq") {
        const opt = Number(a.option);
        if (!Number.isInteger(opt) || opt < 0 || opt >= (q.options?.length ?? 0)) throw new UserError("Invalid option.");
        score = opt === key.correct_option ? 1 : 0;
        const tag = key.option_tags[String(opt)];
        if (score === 0 && tag) misconceptions = [tag];
        feedback = score === 1 ? `Correct. ${key.explanation}` : `${tag ? `${tag.note} ` : ""}${key.explanation}`;
      } else {
        const blame = [...allowedBlame(q)].map((sid) => snap.skills.find((s) => s.id === sid)!.key);
        const evalOut = await evaluateShortAnswer({
          prompt: q.prompt,
          rubric: key.rubric,
          explanation: key.explanation,
          answer: String(a.text ?? "").slice(0, 3000),
          skillKey: snap.skills.find((s) => s.id === q.skill_ids[0])!.key,
          blameableKeys: blame.slice(1),
        });
        score = evalOut.score;
        feedback = evalOut.feedback;
        const okIds = allowedBlame(q);
        misconceptions = evalOut.misconceptions
          .map((m) => ({
            code: m.code,
            suspected_skill_id: m.suspected_skill_key ? (snap.skills.find((s) => s.key === m.suspected_skill_key)?.id ?? null) : null,
            note: m.note,
          }))
          .filter((m) => m.suspected_skill_id === null || okIds.has(m.suspected_skill_id));
      }
      return {
        id: id(),
        question_id: q.id,
        course_id: course.id,
        owner_id: course.owner_id,
        group_id: groupId,
        answer: q.type === "mcq" ? { option: Number(a.option) } : { text: String(a.text).slice(0, 3000) },
        score,
        is_correct: score >= RULES.CORRECT_AT,
        hint_count: hintCount(q.id),
        confidence: typeof a.confidence === "number" ? Math.min(1, Math.max(0, a.confidence)) : null,
        dont_understand: Boolean(a.dont_understand),
        feedback,
        misconceptions,
        idempotency_key: idempotencyKey,
        created_at: t,
      };
    }),
  );

  // mastery: direct evidence only updates the skill each question maps to
  const masteryRows = new Map<string, Mastery>();
  const events: MasteryEvent[] = [];
  for (const sid of new Set(questions.map((q) => q.skill_ids[0]))) {
    const prev = snap.mastery.find((m) => m.skill_id === sid);
    let state = masteryState(prev);
    const used = attempts.filter((a) => questions.find((q) => q.id === a.question_id)!.skill_ids[0] === sid);
    for (const a of used) state = applyObservation(state, { r: a.score, hintUsed: a.hint_count > 0 });
    masteryRows.set(sid, {
      ...masteryRow(course, sid, prev),
      score: state.score,
      evidence_count: state.evidence_count,
      correct_no_hint: state.correct_no_hint,
      provisional: isProvisional(state),
      last_assessed_at: t,
      updated_at: t,
    });
    events.push({
      id: id(),
      course_id: course.id,
      owner_id: course.owner_id,
      skill_id: sid,
      old_score: prev?.score ?? null,
      new_score: state.score ?? 0,
      evidence_count: state.evidence_count,
      attempt_ids: used.map((a) => a.id),
      reason: `${used.length} ${kindLabel(kind)} answer${used.length === 1 ? "" : "s"}: ${used.filter((a) => a.is_correct).length} correct${used.some((a) => a.hint_count > 0) ? ", hints used" : ""}.`,
      created_at: t,
    });
  }

  const changes: ChangeSet = {
    upsert: {
      assessment_attempts: rows(attempts),
      skill_mastery: rows([...masteryRows.values()]),
      mastery_events: rows(events),
    },
  };
  const state: CourseState = { ...course.state };
  let expectedVersion: number | null = null;
  let outcome: string | null = null;
  const adaptations: AdaptationEvent[] = [];
  const scores = attempts.map((a) => (a.hint_count > 0 ? a.score * RULES.HINT_FACTOR : a.score));

  if (kind === "diagnostic_1") {
    state.setup_stage = "diagnostic_2";
  } else if (kind === "diagnostic_2") {
    state.setup_stage = "resources";
  } else if (kind === "practice") {
    const gap = detectGap(
      attempts.map((a) => ({
        attempt_id: a.id,
        skill_ids: questions.find((q) => q.id === a.question_id)!.skill_ids,
        score: a.hint_count > 0 ? a.score * RULES.HINT_FACTOR : a.score,
        misconceptions: a.misconceptions,
      })),
      new Set(snap.skills.filter((s) => s.kind === "core").map((s) => s.id)),
    );
    if (shouldRequestCheck(kind, gap, Boolean(state.pending_check))) {
      const suspected = snap.skills.find((s) => s.id === gap.suspected_skill_id)!;
      const dependent = snap.skills.find((s) => s.id === gap.dependent_skill_id)!;
      const openRemediation = snap.skills.find(
        (s) => s.kind === "remediation" && s.remediates_skill_id === suspected.id && (state.followups ?? []).some((f) => f.remediation_skill_id === s.id && f.status === "scheduled"),
      );
      if (openRemediation) {
        outcome = `These answers point at ${suspected.title}, which already has an open review. Finishing that review is the best next step.`;
        adaptations.push(event(course, "remediation_reused", course.graph_version, course.graph_version, null, gap.evidence_attempt_ids, `New evidence linked to the open review "${openRemediation.title}" instead of adding another.`));
      } else {
        const out = await makeQuestions(snap, "check", [suspected], 2, { focus: gap.note });
        if (out.length > 0) {
          const checkGroup = id();
          const q = questionRows(course, snap.skills, out, { id: checkGroup, kind: "check", lessonId: null, allowHints: false });
          changes.upsert!.questions = rows(q.questions);
          changes.upsert!.question_keys = rows(q.keys);
          state.pending_check = {
            group_id: checkGroup,
            gap_code: gap.code,
            gap_note: gap.note,
            suspected_skill_id: suspected.id,
            dependent_skill_id: dependent.id,
            evidence_attempt_ids: gap.evidence_attempt_ids,
            created_at: t,
          };
          outcome = `In ${gap.evidence_attempt_ids.length} answers you ${lower(gap.note)} That may point to ${suspected.title}. Two quick questions will check before anything changes.`;
          adaptations.push(event(course, "check_requested", course.graph_version, course.graph_version, null, gap.evidence_attempt_ids, outcome));
        }
      }
    }
  } else if (kind === "check" && state.pending_check?.group_id === groupId) {
    const pc = state.pending_check;
    const prereq = snap.skills.find((s) => s.id === pc.suspected_skill_id)!;
    const dependent = snap.skills.find((s) => s.id === pc.dependent_skill_id)!;
    const evidenceIds = [...pc.evidence_attempt_ids, ...attempts.map((a) => a.id)];
    if (checkConfirmsGap(scores)) {
      const proposal = await proposeAdaptation({
        graphVersion: course.graph_version,
        prerequisite: { key: prereq.key, title: prereq.title },
        dependent: { key: dependent.key, title: dependent.title },
        gapNote: pc.gap_note,
        evidence: [
          ...pc.evidence_attempt_ids.map((aid) => ({ attempt_id: aid, summary: summarize(snap, aid) })),
          ...attempts.map((a) => ({ attempt_id: a.id, summary: `targeted check on ${prereq.title}: ${a.is_correct ? "correct" : "incorrect"}` })),
        ],
      });
      // the model proposes wording; the backend decides the patch and checks every reference
      if (proposal.expected_graph_version !== course.graph_version) throw new UserError("The course changed while this was being prepared. Please submit again.");
      const support = proposal.supporting_attempt_ids.filter((x) => evidenceIds.includes(x));
      const plan = planRemediation({
        graphVersion: course.graph_version,
        skills: snap.skills,
        edges: snap.edges,
        prerequisite: prereq,
        dependent,
        resolvedRemediationIds: new Set((state.followups ?? []).filter((f) => f.status === "passed").map((f) => f.remediation_skill_id)),
        proposal: { title: proposal.patch.remediation_title, objective: proposal.patch.remediation_objective },
        newIds: { skill: id(), edge: id() },
        now: t,
      });
      const nextVersion = course.graph_version + 1;
      const updatedSkills = plan.patch.difficulty_changes.map((c) => ({ ...snap.skills.find((s) => s.id === c.skill_id)!, difficulty: c.difficulty as Difficulty }));
      changes.upsert!.skills = rows([...plan.patch.add_skills, ...updatedSkills]);
      changes.upsert!.skill_edges = rows(plan.patch.add_edges);
      changes.upsert!.skill_mastery = rows([...masteryRows.values(), ...plan.patch.add_skills.map((s) => masteryRow(course, s.id))]);
      if (plan.patch.followup) {
        state.followups = [
          ...(state.followups ?? []),
          { ...plan.patch.followup, status: "scheduled", group_id: null, created_at: t },
        ];
      }
      state.postponed = Object.fromEntries(Object.entries(state.postponed ?? {}).filter(([d]) => d !== dependent.id));
      changes.course = { graph_version: nextVersion };
      expectedVersion = course.graph_version;
      outcome = proposal.rationale;
      adaptations.push(
        event(course, plan.kind, course.graph_version, nextVersion, plan.patch, support.length ? support : evidenceIds, proposal.rationale),
      );
    } else {
      outcome = `The check on ${prereq.title} went well, so your path stays the same. The earlier mistakes were probably about ${dependent.title} itself; the feedback above explains them.`;
      adaptations.push(event(course, "check_passed", course.graph_version, course.graph_version, null, evidenceIds, outcome));
    }
    state.pending_check = null;
  } else if (kind === "followup") {
    const f = (state.followups ?? []).find((x) => x.group_id === groupId && x.status === "scheduled");
    if (f) {
      const prereq = snap.skills.find((s) => s.id === f.skill_id)!;
      if (followupPassed(scores)) {
        state.followups = (state.followups ?? []).map((x) => (x === f ? { ...x, status: "passed" } : x));
        outcome = `Follow-up passed: ${prereq.title} looks solid now, so the review is resolved and the next lesson is open.`;
        adaptations.push(event(course, "followup_passed", course.graph_version, course.graph_version, null, attempts.map((a) => a.id), outcome));
      } else {
        outcome = `Not there yet: the review stays open. Ask the tutor or try a fresh set of follow-up questions.`;
        adaptations.push(event(course, "followup_missed", course.graph_version, course.graph_version, null, attempts.map((a) => a.id), outcome));
      }
    }
  }
  if (adaptations.length) changes.upsert!.adaptation_events = rows(adaptations);
  changes.course = { ...(changes.course ?? {}), state };

  const res = await store.commit(course.id, changes, { idempotencyKey: `submit:${groupId}`, expectedVersion });
  if (res.status === "duplicate") {
    const saved = (await store.select<Attempt>("assessment_attempts", { group_id: groupId })) ?? [];
    return { duplicate: true, results: saved.map((a) => toResult(a, keys.get(a.question_id))), outcome: null };
  }
  return { duplicate: false, results: attempts.map((a) => toResult(a, keys.get(a.question_id))), outcome };
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const kindLabel = (k: GroupKind) =>
  ({ diagnostic_1: "diagnostic", diagnostic_2: "diagnostic", practice: "practice", check: "targeted check", followup: "follow-up" })[k];

function summarize(snap: Snapshot, attemptId: string) {
  const a = snap.attempts.find((x) => x.id === attemptId);
  const q = a && snap.questions.find((x) => x.id === a.question_id);
  return a && q ? `"${q.prompt.split("\n")[0].slice(0, 90)}" answered ${a.is_correct ? "correctly" : "incorrectly"}${a.misconceptions[0] ? ` (${a.misconceptions[0].note})` : ""}` : "attempt";
}

function event(
  course: Course,
  kind: AdaptationEvent["kind"],
  from: number,
  to: number,
  patch: AdaptationEvent["patch"],
  evidence: string[],
  reason: string,
): AdaptationEvent {
  return { id: id(), course_id: course.id, owner_id: course.owner_id, kind, from_version: from, to_version: to, patch, evidence_attempt_ids: evidence, reason, created_at: now() };
}

function toResult(a: Attempt, key: QuestionKey | undefined): GradedResult {
  return {
    question_id: a.question_id,
    score: a.score,
    is_correct: a.is_correct,
    feedback: a.feedback,
    explanation: key?.explanation ?? "",
    correct_option: key?.correct_option ?? null,
  };
}

export { isMastered, UNASSESSED };

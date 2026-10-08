// Loads everything about one course that the learner may see, and derives the
// read-only views (display states, plan, next action, dashboard numbers).
// Every number here is computed from persisted rows.

import type {
  AdaptationEvent,
  Attempt,
  Course,
  HintUse,
  LearningGoal,
  Lesson,
  LessonProgress,
  Mastery,
  MasteryEvent,
  Question,
  Resource,
  Skill,
  SkillEdge,
} from "@/lib/types";
import type { Store } from "@/lib/db/store";
import { computeDisplayStates, type SkillStatus } from "@/lib/domain/state";
import { isMastered, isWeak, UNASSESSED, type MasteryState } from "@/lib/domain/mastery";
import { topoOrder } from "@/lib/domain/graph";

export interface Snapshot {
  course: Course;
  goal: LearningGoal;
  skills: Skill[];
  edges: SkillEdge[];
  mastery: Mastery[];
  resources: Resource[];
  lessons: Lesson[];
  progress: LessonProgress[];
  questions: Question[];
  attempts: Attempt[];
  masteryEvents: MasteryEvent[];
  adaptations: AdaptationEvent[];
  hints: HintUse[];
}

export class NotFound extends Error {}

export async function loadSnapshot(store: Store, courseId: string): Promise<Snapshot> {
  const [course] = await store.select<Course>("courses", { id: courseId });
  if (!course) throw new NotFound("Course not found.");
  const by = { course_id: courseId };
  const [goals, skills, edges, mastery, resources, lessons, progress, questions, attempts, masteryEvents, adaptations, hints] =
    await Promise.all([
      store.select<LearningGoal>("learning_goals", { id: course.goal_id }),
      store.select<Skill>("skills", by),
      store.select<SkillEdge>("skill_edges", by),
      store.select<Mastery>("skill_mastery", by),
      store.select<Resource>("resources", by),
      store.select<Lesson>("lessons", by),
      store.select<LessonProgress>("lesson_progress", by),
      store.select<Question>("questions", by),
      store.select<Attempt>("assessment_attempts", by),
      store.select<MasteryEvent>("mastery_events", by),
      store.select<AdaptationEvent>("adaptation_events", by),
      store.select<HintUse>("hint_uses", by),
    ]);
  const byTime = <T extends { created_at: string }>(a: T, b: T) => a.created_at.localeCompare(b.created_at);
  return {
    course,
    goal: goals[0],
    skills: skills.sort((a, b) => a.order_index - b.order_index),
    edges,
    mastery,
    resources,
    lessons: lessons.sort((a, b) => a.version - b.version),
    progress,
    questions: questions.sort((a, b) => byTime(a, b) || a.position - b.position),
    attempts: attempts.sort(byTime),
    masteryEvents: masteryEvents.sort(byTime),
    adaptations: adaptations.sort(byTime),
    hints,
  };
}

export const masteryState = (m: Mastery | undefined): MasteryState =>
  m ? { score: m.score, evidence_count: m.evidence_count, correct_no_hint: m.correct_no_hint } : UNASSESSED;

export type RemediationStatus = "open" | "postponed" | "resolved";

export interface SkillView extends SkillStatus {
  skill: Skill;
  mastery: MasteryState;
  prerequisites: string[];
  dependents: string[];
  remediation: RemediationStatus | null;
  latestLesson: Lesson | null;
  lessonStatus: "none" | "started" | "completed";
  resources: Resource[];
}

export function remediationStatus(snap: Snapshot, skill: Skill): RemediationStatus | null {
  if (skill.kind !== "remediation") return null;
  const f = (snap.course.state.followups ?? []).find((x) => x.remediation_skill_id === skill.id);
  if (f?.status === "passed") return "resolved";
  if (Object.values(snap.course.state.postponed ?? {}).includes(skill.id)) return "postponed";
  return "open";
}

export function skillViews(snap: Snapshot): Map<string, SkillView> {
  const masteryMap = new Map(snap.mastery.map((m) => [m.skill_id, { ...masteryState(m), unlock_override: m.unlock_override }]));
  const followupDue = new Set(
    (snap.course.state.followups ?? []).filter((f) => f.status === "scheduled").map((f) => f.skill_id),
  );
  const readyOverride = new Set<string>();
  for (const s of snap.skills) {
    const r = remediationStatus(snap, s);
    if (r === "resolved" || r === "postponed") readyOverride.add(s.id);
  }
  const active = new Set(snap.progress.map((p) => p.skill_id));
  const states = computeDisplayStates({ skills: snap.skills, edges: snap.edges, mastery: masteryMap, active, followupDue, readyOverride });
  const views = new Map<string, SkillView>();
  for (const skill of snap.skills) {
    const st = states.get(skill.id)!;
    const lessons = snap.lessons.filter((l) => l.skill_id === skill.id);
    const latest = lessons[lessons.length - 1] ?? null;
    const prog = latest ? snap.progress.find((p) => p.lesson_id === latest.id) : undefined;
    const remediation = remediationStatus(snap, skill);
    let state = st.state;
    let reason = st.reason;
    if (remediation === "open") {
      state = "needs_review";
      reason = "Recommended review inserted because of a confirmed gap. Complete its follow-up questions, or postpone it.";
    } else if (remediation === "postponed") {
      state = "available";
      reason = "You postponed this review. It is still recommended before the dependent lesson.";
    } else if (remediation === "resolved") {
      state = "mastered";
      reason = "Resolved: the follow-up questions were answered correctly.";
    }
    views.set(skill.id, {
      ...st,
      state,
      reason,
      skill,
      mastery: masteryState(snap.mastery.find((m) => m.skill_id === skill.id)),
      prerequisites: snap.edges.filter((e) => e.dependent_id === skill.id).map((e) => e.prerequisite_id),
      dependents: snap.edges.filter((e) => e.prerequisite_id === skill.id).map((e) => e.dependent_id),
      remediation,
      latestLesson: latest,
      lessonStatus: prog ? prog.status : "none",
      resources: snap.resources.filter(
        (r) => r.skill_id === skill.id || (skill.remediates_skill_id !== null && r.skill_id === skill.remediates_skill_id),
      ),
    });
  }
  return views;
}

/** Plan order: a stable topological order of the current graph (remediation sorts just before its dependent). */
export function planOrder(snap: Snapshot): Skill[] {
  const ids = topoOrder(
    snap.skills.map((s) => ({ id: s.id, order: s.order_index })),
    snap.edges.map((e) => ({ from: e.prerequisite_id, to: e.dependent_id })),
  );
  const byId = new Map(snap.skills.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)!);
}

export interface NextAction {
  label: string;
  detail: string;
  href: string;
  skillId: string | null;
  why: string[];
}

export function nextAction(snap: Snapshot, views = skillViews(snap)): NextAction {
  const { course } = snap;
  const title = (id: string) => snap.skills.find((s) => s.id === id)?.title ?? "a skill";
  if (course.status === "setup") {
    return { label: "Finish setting up your course", detail: "Your diagnostic and course plan are not complete yet.", href: "/setup", skillId: null, why: [] };
  }
  const check = course.state.pending_check;
  if (check) {
    return {
      label: `Take the quick check on ${title(check.suspected_skill_id)}`,
      detail: "Two short questions decide whether a review is needed before you continue.",
      href: `/assess/${check.group_id}`,
      skillId: check.suspected_skill_id,
      why: [check.gap_note, `This check was triggered by ${check.evidence_attempt_ids.length} related answers in ${title(check.dependent_skill_id)}.`],
    };
  }
  const plan = planOrder(snap);
  const open = plan.find((s) => views.get(s.id)?.remediation === "open");
  if (open) {
    const v = views.get(open.id)!;
    return {
      label: `Review: ${title(open.remediates_skill_id ?? "")}`,
      detail: "A short targeted review was added to your path. It unlocks the next lesson.",
      href: `/learn/${open.id}`,
      skillId: open.id,
      why: whyFor(snap, views, v),
    };
  }
  const candidates = plan.filter((s) => {
    const v = views.get(s.id)!;
    return v.state !== "locked" && v.state !== "mastered" && v.remediation === null;
  });
  const inProgress = candidates.find((s) => views.get(s.id)!.lessonStatus === "started");
  const pick = inProgress ?? candidates.find((s) => views.get(s.id)!.state === "needs_review") ?? candidates[0];
  if (!pick) {
    return { label: "Every skill is mastered or waiting", detail: "Review your skill map for what is left.", href: "/map", skillId: null, why: [] };
  }
  const v = views.get(pick.id)!;
  return {
    label: `${v.lessonStatus === "started" ? "Continue" : v.state === "needs_review" ? "Strengthen" : "Start"}: ${pick.title}`,
    detail: pick.goal_contribution,
    href: `/learn/${pick.id}`,
    skillId: pick.id,
    why: whyFor(snap, views, v),
  };
}

const pct = (m: MasteryState) => (m.score === null ? "unassessed" : `${Math.round(m.score * 100)}% from ${m.evidence_count} answer${m.evidence_count === 1 ? "" : "s"}`);

export function whyFor(snap: Snapshot, views: Map<string, SkillView>, v: SkillView): string[] {
  const lines: string[] = [];
  const prereqs = v.prerequisites.map((id) => views.get(id)!).filter(Boolean);
  if (prereqs.length === 0) lines.push("It has no prerequisites, so it is a starting point.");
  else
    lines.push(
      `Prerequisites: ${prereqs.map((p) => `${p.skill.title} (${p.remediation ? p.remediation : pct(p.mastery)})`).join("; ")}.`,
    );
  if (v.mastery.score !== null) lines.push(`Your evidence on this skill so far: ${pct(v.mastery)}.`);
  if (v.skill.difficulty === "simplified") lines.push("The next lesson was simplified after a confirmed prerequisite gap.");
  const event = [...snap.adaptations].reverse().find((e) => e.patch && JSON.stringify(e.patch).includes(v.skill.id));
  if (event) lines.push(`Path change: ${event.reason}`);
  lines.push(`Goal link: ${v.skill.goal_contribution}`);
  return lines;
}

export interface DashboardStats {
  coreSkills: number;
  assessed: number;
  mastered: number;
  lessonsCompleted: number;
  studyMinutes7d: number;
  answers: number;
  weak: { id: string; title: string; detail: string }[];
  daily: { day: string; answers: number; lessons: number }[];
  masteryHistory: { at: string; average: number; assessed: number }[];
}

export function dashboardStats(snap: Snapshot, views = skillViews(snap)): DashboardStats {
  const core = snap.skills.filter((s) => s.kind === "core");
  const masteryOf = (id: string) => masteryState(snap.mastery.find((m) => m.skill_id === id));
  const weekAgo = Date.now() - 7 * 86400_000;
  const days: DashboardStats["daily"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    days.push({
      day: d,
      answers: snap.attempts.filter((a) => a.created_at.slice(0, 10) === d).length,
      lessons: snap.progress.filter((p) => p.completed_at?.slice(0, 10) === d).length,
    });
  }
  // replay mastery events to get the average score of assessed core skills over time
  const latest = new Map<string, number>();
  const coreIds = new Set(core.map((s) => s.id));
  const history: DashboardStats["masteryHistory"] = [];
  for (const e of snap.masteryEvents) {
    if (!coreIds.has(e.skill_id)) continue;
    latest.set(e.skill_id, e.new_score);
    const vals = [...latest.values()];
    history.push({ at: e.created_at, average: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100), assessed: vals.length });
  }
  return {
    coreSkills: core.length,
    assessed: core.filter((s) => masteryOf(s.id).evidence_count > 0).length,
    mastered: core.filter((s) => isMastered(masteryOf(s.id))).length,
    lessonsCompleted: snap.progress.filter((p) => p.status === "completed").length,
    studyMinutes7d: snap.progress
      .filter((p) => new Date(p.started_at).getTime() >= weekAgo)
      .reduce((a, p) => a + p.active_minutes, 0),
    answers: snap.attempts.length,
    weak: core
      .filter((s) => views.get(s.id)?.state === "needs_review" || isWeak(masteryOf(s.id)))
      .map((s) => ({ id: s.id, title: s.title, detail: views.get(s.id)!.reason })),
    daily: days,
    masteryHistory: history,
  };
}

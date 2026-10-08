// Task-specific Gemma calls. Each task has a prompt template, a Zod schema
// (schemas.ts) and a deterministic fixture used only in labeled fixture mode.
// All tasks share the single adapter in gemma.ts.

import { aiConfig, generateJson } from "./gemma";
import {
  AdaptationProposal,
  GoalInterpretation,
  GraphProposal,
  LessonOut,
  QuestionSet,
  ShortAnswerEvaluation,
  SourceRanking,
  TutorReply,
  type LessonOutT,
  type QuestionOutT,
} from "./schemas";
import { FIXTURE_BY_KEY, FIXTURE_SKILLS, RUBRIC_KEYWORDS, type FixtureMcq, type FixtureSkill } from "./fixture-data";
import type { z } from "zod";

export const isFixture = () => aiConfig().fixture;
export const contentMode = () => (isFixture() ? ("fixture" as const) : ("live" as const));

const untrusted = (label: string, text: string) =>
  `<untrusted kind="${label}">\n${text.replace(/<\/?untrusted[^>]*>/gi, "")}\n</untrusted>`;

const TEACHER =
  "You are Cognify's teaching engine, powered by Gemma. You design concise, accurate learning material " +
  "for adult self-learners. Never invent URLs, titles, dates or citations.";

// ---------------------------------------------------------------- 1. goal
export interface GoalInput {
  goal: string;
  experience: string;
  dailyMinutes: number;
  clarification?: string | null;
}

export async function interpretGoal(input: GoalInput): Promise<z.infer<typeof GoalInterpretation>> {
  if (isFixture()) {
    const words = input.goal.trim().split(/\s+/).filter(Boolean);
    const vague = words.length < 4 && !input.clarification;
    return {
      is_specific: !vague,
      clarification_question: vague
        ? "What do you want to be able to do when you finish? For example: \"analyse a CSV of sales data in Python\"."
        : null,
      title: "Python for data analysis",
      domain: "Programming",
      summary:
        "Fixture mode: the demo course is always \"Python for data analysis\", whatever goal is entered. Connect Gemma to plan other goals.",
    };
  }
  return generateJson({
    task: "goal_interpretation",
    schema: GoalInterpretation,
    system:
      `${TEACHER}\nInterpret a learner's goal. If it is too vague to plan a course (no subject or no outcome), ` +
      "set is_specific=false and write ONE short clarification question. Self-reported experience is context, not proof.",
    user:
      `Fields: is_specific (bool), clarification_question (string or null), title (<=80 chars course title), ` +
      `domain (<=60 chars), summary (<=400 chars restating the outcome).\n\n` +
      `Experience: ${input.experience}. Minutes per day: ${input.dailyMinutes}.\n` +
      untrusted("goal", input.goal) +
      (input.clarification ? `\n${untrusted("clarification", input.clarification)}\nThe learner already answered a clarification, so set is_specific=true.` : ""),
  });
}

// ---------------------------------------------------------------- 2. graph
export async function proposeGraph(input: GoalInput & { title: string; summary: string }) {
  if (isFixture()) {
    const skills = FIXTURE_SKILLS.map((s) => ({
      key: s.key,
      title: s.title,
      objective: s.objective,
      goal_contribution: s.contribution,
      estimated_minutes: s.minutes,
      search_query: s.query,
    }));
    const edges = FIXTURE_SKILLS.flatMap((s) => s.prereqs.map((p) => ({ prerequisite: p, dependent: s.key })));
    return { skills, edges };
  }
  return generateJson({
    task: "graph_proposal",
    schema: GraphProposal,
    maxOutputTokens: 6000,
    system:
      `${TEACHER}\nPropose a compact prerequisite graph (a directed acyclic graph) of 12-16 skills for the course. ` +
      "Edges point from prerequisite to dependent. A skill may have several prerequisites. No cycles, no duplicate keys.",
    user:
      `Fields: skills[] {key (lowercase-kebab-case), title, objective, goal_contribution (how it serves the goal), ` +
      `estimated_minutes (5-180), search_query (a web search query for beginner resources)}, edges[] {prerequisite, dependent} using keys.\n` +
      `List skills from foundational to advanced.\nCourse: ${input.title}\nOutcome: ${input.summary}\n` +
      `Experience: ${input.experience}; ${input.dailyMinutes} minutes per day.\n` +
      untrusted("goal", input.goal),
  });
}

// ---------------------------------------------------------------- 3. questions
export type QuestionPurpose = "diagnostic_1" | "diagnostic_2" | "check" | "followup" | "practice";

export interface QuestionInput {
  purpose: QuestionPurpose;
  goal: string;
  skills: { key: string; title: string; objective: string }[];
  /** keys of skills that may be blamed in misconception tags */
  blameableKeys: string[];
  count: number;
  evidence?: string;
  focus?: string;
  /** prompts already used in this course, to avoid repeats */
  usedPrompts: string[];
}

const PURPOSE_TEXT: Record<QuestionPurpose, string> = {
  diagnostic_1:
    "First diagnostic batch: accessible questions spread across the foundational skills, mostly multiple choice, one short explanation.",
  diagnostic_2:
    "Second diagnostic batch: respond to the first batch's evidence. Probe below a skill that was missed; go a little harder above a skill that was answered well.",
  check: "Targeted check of a suspected prerequisite gap: direct questions on the prerequisite only.",
  followup: "Follow-up after remediation: independent questions on the prerequisite, similar difficulty to the check.",
  practice: "Extra practice for the skill.",
};

export async function generateQuestions(input: QuestionInput): Promise<QuestionOutT[]> {
  if (isFixture()) return fixtureQuestions(input);
  const out = await generateJson({
    task: `questions_${input.purpose}`,
    schema: QuestionSet,
    maxOutputTokens: 5000,
    system:
      `${TEACHER}\nWrite assessment questions. ${PURPOSE_TEXT[input.purpose]} ` +
      "Multiple-choice distractors should reflect real misconceptions; tag each such distractor with a snake_case code " +
      "and, when the mistake reveals a gap in another skill, that skill's key in suspected_skill_key.",
    user:
      `Return {questions: [...]}, exactly ${input.count} items. Each: skill_key, type ("mcq"|"short"), difficulty, prompt ` +
      `(markdown, code in fences), options (3-5 strings, null for short), correct_option (index, null for short), ` +
      `distractor_tags[] {option (0-based index of a WRONG option, a number), code (snake_case), suspected_skill_key (one of: ${input.blameableKeys.join(", ") || "none"}; or null), note}, ` +
      `rubric (1-4 criteria for short answers, [] for mcq), hint (does not reveal the answer), explanation.\n` +
      `Course goal: ${input.goal}\nSkills (use only these keys):\n` +
      input.skills.map((s) => `- ${s.key}: ${s.title}. ${s.objective}`).join("\n") +
      (input.evidence ? `\nEvidence so far:\n${input.evidence}` : "") +
      (input.focus ? `\nFocus: ${input.focus}` : "") +
      (input.usedPrompts.length ? `\nDo not repeat these prompts:\n${input.usedPrompts.slice(-20).map((p) => `- ${p.slice(0, 80)}`).join("\n")}` : ""),
  });
  const allowed = new Set(input.skills.map((s) => s.key));
  return out.questions.filter((q) => allowed.has(q.skill_key)).slice(0, input.count);
}

function mcqOut(skill: FixtureSkill, q: FixtureMcq): QuestionOutT {
  return {
    skill_key: skill.key,
    type: "mcq",
    difficulty: q.d ?? "medium",
    prompt: q.p,
    options: q.o,
    correct_option: q.c,
    distractor_tags: Object.entries(q.tags ?? {}).map(([opt, [code, suspected, note]]) => ({
      option: Number(opt),
      code,
      suspected_skill_key: suspected,
      note,
    })),
    rubric: [],
    hint: q.h,
    explanation: q.e,
  };
}

function shortOut(skill: FixtureSkill): QuestionOutT {
  return {
    skill_key: skill.key,
    type: "short",
    difficulty: "medium",
    prompt: skill.short.p,
    options: null,
    correct_option: null,
    distractor_tags: [],
    rubric: skill.short.rubric.map(([c]) => c),
    hint: skill.short.h,
    explanation: skill.short.e,
  };
}

/** Deterministic picks from the hand-written bank, never repeating a used prompt. */
function fixtureQuestions(input: QuestionInput): QuestionOutT[] {
  const used = new Set(input.usedPrompts);
  const out: QuestionOutT[] = [];
  const take = (skill: FixtureSkill | undefined, preferShort = false) => {
    if (!skill || out.length >= input.count) return false;
    if (preferShort && !used.has(skill.short.p)) {
      used.add(skill.short.p);
      out.push(shortOut(skill));
      return true;
    }
    const q = skill.mcq.find((m) => !used.has(m.p));
    if (!q) return false;
    used.add(q.p);
    out.push(mcqOut(skill, q));
    return true;
  };
  const skills = input.skills.map((s) => FIXTURE_BY_KEY.get(s.key)).filter(Boolean) as FixtureSkill[];
  if (input.purpose === "diagnostic_1") {
    for (const key of ["variables-types", "lists", "list-indexing"]) take(FIXTURE_BY_KEY.get(key));
    take(FIXTURE_BY_KEY.get("operators-expressions"), true);
  } else {
    // diagnostic_2 lists its target skills first; check/followup/practice pass one skill.
    let guard = 0;
    while (out.length < input.count && guard++ < 20) {
      const before = out.length;
      for (const s of skills) take(s);
      if (out.length === before) break;
    }
  }
  return out;
}

// ---------------------------------------------------------------- 4. sources
export interface SourceCandidate {
  id: string;
  skill_key: string;
  title: string;
  url: string;
  snippet: string;
}

export async function rankSources(
  goal: string,
  skills: { key: string; title: string }[],
  candidates: SourceCandidate[],
) {
  return generateJson({
    task: "source_ranking",
    schema: SourceRanking,
    maxOutputTokens: 4000,
    system:
      `${TEACHER}\nSelect learning resources from search results. Prefer primary documentation and reputable, ` +
      "beginner-friendly, publicly accessible material. A search result is not automatically authoritative. " +
      "Choose 1-3 per skill, only from the candidates given, and say briefly why.",
    user:
      `Return {selections: [{skill_key, candidate_id, reason, format}]}. format is one of documentation, tutorial, article, video, course, reference.\n` +
      `Goal: ${goal}\nSkills: ${skills.map((s) => `${s.key} (${s.title})`).join("; ")}\nCandidates:\n` +
      untrusted(
        "search_results",
        candidates.map((c) => `[${c.id}] skill=${c.skill_key} | ${c.title} | ${c.url} | ${c.snippet.slice(0, 220)}`).join("\n"),
      ),
  });
}

// ---------------------------------------------------------------- 5. lesson
export interface LessonInput {
  goal: string;
  skill: { key: string; title: string; objective: string; kind: "core" | "remediation" };
  /** for remediation lessons: the prerequisite being reviewed */
  reviewOf?: { key: string; title: string; gapNote: string } | null;
  prerequisites: string[];
  difficulty: "simplified" | "standard" | "accelerated";
  minutes: number;
  format: string;
  sources: { id: string; title: string; excerpt: string }[];
  recentMistakes: string[];
  blameableKeys: string[];
  usedPrompts: string[];
}

export async function generateLesson(input: LessonInput): Promise<LessonOutT> {
  if (isFixture()) return fixtureLesson(input);
  return generateJson({
    task: "lesson_generation",
    schema: LessonOut,
    maxOutputTokens: 8000,
    system:
      `${TEACHER}\nWrite one lesson. Cite sources only by the IDs supplied (e.g. "S1") in the citations arrays; ` +
      "never cite anything else and never write URLs. The sources are short excerpts or summaries, not full pages. " +
      "When three or more sources are supplied, draw on and cite at least three different ones across the sections and worked example. " +
      "Write maths as LaTeX in $...$ or $$...$$. " +
      "Scope the lesson to the learner's daily study time. Practice questions test this skill directly.",
    user:
      `Fields: objective, prerequisite_recap, sections[1-3] {heading, body (markdown, code in fences), citations[]}, ` +
      `worked_example {title, body, citations[]}, exercise {prompt, rubric[1-4], hint}, practice[3-5] questions ` +
      `(same question format: skill_key "${input.skill.key}", type, difficulty, prompt, options, correct_option, ` +
      `distractor_tags[] {option (0-based index of a WRONG option, a number), code (snake_case), suspected_skill_key (one of: ${input.blameableKeys.join(", ") || "none"}; or null), note}, rubric, hint, explanation). ` +
      `Include at least 2 multiple-choice questions whose distractors are tagged with misconceptions.\n` +
      `Goal: ${input.goal}\nSkill: ${input.skill.title} (${input.skill.key}). Objective: ${input.skill.objective}\n` +
      (input.reviewOf
        ? `This is a short REMEDIATION activity reviewing "${input.reviewOf.title}" because: ${input.reviewOf.gapNote}. Practice must target ${input.reviewOf.key} (use skill_key "${input.reviewOf.key}").\n`
        : "") +
      `Prerequisites already covered: ${input.prerequisites.join(", ") || "none"}\n` +
      `Difficulty: ${input.difficulty}${input.difficulty === "simplified" ? " (smaller steps, more scaffolding, extra example)" : ""}. ` +
      `About ${input.minutes} minutes. Preferred explanation style: ${input.format}.\n` +
      (input.recentMistakes.length ? `Recent mistakes to address:\n${input.recentMistakes.map((m) => `- ${m}`).join("\n")}\n` : "") +
      `Sources:\n${input.sources.length ? untrusted("source_excerpts", input.sources.map((s) => `[${s.id}] ${s.title}: ${s.excerpt}`).join("\n")) : "(none supplied: use empty citations arrays)"}`,
  });
}

function fixtureLesson(input: LessonInput): LessonOutT {
  const target = FIXTURE_BY_KEY.get(input.reviewOf?.key ?? input.skill.key) ?? FIXTURE_SKILLS[0];
  const simplified = input.difficulty === "simplified";
  const ids = input.sources.map((s) => s.id);
  // spread the supplied sources over the sections and the example so at least three are cited
  const sections = target.sections.map(([heading, body], i) => ({
    heading,
    body,
    citations: ids[i] ? [ids[i]] : [],
  }));
  const n = target.sections.length;
  const cite = ids.slice(n, Math.max(n + 1, 3));
  if (!cite.length) cite.push(...ids.slice(0, 1));
  if (simplified || input.reviewOf) sections.unshift({ heading: "Picture it first", body: target.analogy, citations: [] });
  const practice = fixtureQuestions({
    purpose: "practice",
    goal: input.goal,
    skills: [{ key: target.key, title: target.title, objective: target.objective }],
    blameableKeys: input.blameableKeys,
    count: input.reviewOf ? 3 : 4,
    usedPrompts: input.usedPrompts,
  });
  if (!input.reviewOf && !input.usedPrompts.includes(target.short.p) && practice.length >= 3) {
    practice[practice.length - 1] = shortOut(target);
  }
  return {
    objective: input.reviewOf
      ? `Review ${target.title.toLowerCase()} before continuing with ${input.skill.title.replace(/^Review: /, "")}.`
      : target.objective,
    prerequisite_recap: target.recap,
    sections,
    worked_example: { title: target.example[0], body: target.example[1], citations: cite },
    exercise: { prompt: target.short.p, rubric: target.short.rubric.map(([c]) => c), hint: target.short.h },
    practice,
  };
}

// ---------------------------------------------------------------- 6. evaluation
export interface EvalInput {
  prompt: string;
  rubric: string[];
  explanation: string;
  answer: string;
  /** photos of handwritten or typeset work (derivations, diagrams, code) */
  images?: { mime: string; data: string }[];
  skillKey: string;
  blameableKeys: string[];
}

export async function evaluateShortAnswer(input: EvalInput) {
  if (isFixture()) {
    if (input.images?.length && !input.answer.trim()) {
      return {
        score: 0,
        feedback: "Fixture mode cannot read photos. Connect Gemma, or type the answer, to have this graded.",
        misconceptions: [],
        confidence: 0,
        suggested_followup_skill_keys: [],
        transcription: null,
      };
    }
    const text = input.answer.toLowerCase();
    const met = input.rubric.filter((c) => (RUBRIC_KEYWORDS.get(c) ?? []).some((k) => text.includes(k.toLowerCase())));
    const score = input.rubric.length ? met.length / input.rubric.length : 0;
    const missing = input.rubric.filter((c) => !met.includes(c));
    return {
      score: Math.round(score * 100) / 100,
      feedback:
        missing.length === 0
          ? "Covers every rubric point. (Fixture keyword grader.)"
          : `Missing: ${missing.join("; ")}. (Fixture keyword grader.)`,
      misconceptions: [],
      confidence: 0.5,
      suggested_followup_skill_keys: [],
      transcription: null,
    };
  }
  return generateJson({
    task: "short_answer_evaluation",
    schema: ShortAnswerEvaluation,
    temperature: 0.1,
    maxOutputTokens: 2500,
    images: input.images,
    system:
      `${TEACHER}\nGrade a short answer strictly against the rubric. score is the fraction of rubric criteria met (0-1). ` +
      "Feedback is concise and actionable and does not mention scores. Only propose misconceptions the answer itself shows; " +
      "never infer personal traits or conditions. When photos are attached they show the learner's own working " +
      "(handwriting, maths derivations, diagrams, code): read them carefully, grade every step against the rubric, " +
      "and copy what you read into transcription (maths as LaTeX between $...$). If a photo is unreadable, say so in the feedback " +
      "and grade only what you can read.",
    user:
      `Fields: score, feedback, misconceptions[] {code (snake_case), suspected_skill_key (one of: ${[input.skillKey, ...input.blameableKeys].join(", ")}; or null), note}, ` +
      `confidence (0-1), suggested_followup_skill_keys[], transcription (string, only when photos are attached, else null).\nQuestion: ${input.prompt}\nRubric:\n${input.rubric.map((r) => `- ${r}`).join("\n")}\n` +
      `Reference explanation: ${input.explanation}\n${untrusted("learner_answer", input.answer.slice(0, 3000) || "(no typed answer: the work is in the attached photos)")}`,
  });
}

// ---------------------------------------------------------------- 7. tutor
export type TutorMode = "ask" | "simpler" | "example" | "check" | "hint";

export interface TutorInput {
  mode: TutorMode;
  message: string;
  skill: { key: string; title: string; objective: string };
  lessonSummary: string;
  sources: { id: string; title: string; excerpt: string }[];
  recentMistakes: string[];
  mastery: string;
  history: { role: "learner" | "tutor"; content: string }[];
  hintsGiven: number;
}

export async function tutorReply(input: TutorInput) {
  if (isFixture()) {
    const s = FIXTURE_BY_KEY.get(input.skill.key);
    const reply =
      !s
        ? "Fixture tutor: connect Gemma for open-ended tutoring on this skill."
        : input.mode === "simpler"
          ? `Simpler: ${s.analogy}\n\n${s.recap}`
          : input.mode === "example"
            ? `Example: ${s.example[0]}\n\n${s.example[1]}`
            : input.mode === "check"
              ? `Check your understanding: ${s.short.p}\n\nAnswer in the box below and I'll point you at the key idea.`
              : input.mode === "hint"
                ? `Hint: ${s.short.h}`
                : `${s.sections[0][1].split("\n\n")[0]}\n\nTry the worked example next, then ask for a hint if you get stuck.`;
    return { reply: `${reply}\n\n_(Fixture tutor: scripted response, not Gemma.)_`, hint_level: 1, cited_source_ids: [] };
  }
  const modeText: Record<TutorMode, string> = {
    ask: "Answer the learner's question.",
    simpler: "Explain the current idea more simply, with an everyday analogy.",
    example: "Give one new short worked example.",
    check: "Ask the learner one quick question to check understanding (do not give the answer).",
    hint: "Give the next progressive hint.",
  };
  return generateJson({
    task: "tutor_reply",
    schema: TutorReply,
    maxOutputTokens: 2000,
    system:
      `${TEACHER}\nYou are a patient tutor inside a lesson. Teach progressively: a hint first, then a simpler example or ` +
      "an alternative explanation, and only give a full solution after the learner has tried twice or explicitly asks. " +
      "Cite only supplied source IDs. Keep replies under 180 words. Do not reveal answers to graded practice questions.",
    user:
      `Fields: reply (markdown), hint_level (1-4, how much you revealed), cited_source_ids[].\nTask: ${modeText[input.mode]}\n` +
      `Skill: ${input.skill.title}. ${input.skill.objective}\nLesson: ${input.lessonSummary}\nMastery: ${input.mastery}\n` +
      `Hints already given: ${input.hintsGiven}\n` +
      (input.recentMistakes.length ? `Recent mistakes: ${input.recentMistakes.join("; ")}\n` : "") +
      `Sources: ${input.sources.map((s) => `[${s.id}] ${s.title}`).join("; ") || "none"}\n` +
      `Conversation so far:\n${input.history.slice(-8).map((m) => `${m.role}: ${m.content.slice(0, 400)}`).join("\n")}\n` +
      untrusted("learner_message", input.message || modeText[input.mode]),
  });
}

// ---------------------------------------------------------------- 8. adaptation
export interface AdaptInput {
  graphVersion: number;
  prerequisite: { key: string; title: string };
  dependent: { key: string; title: string };
  gapNote: string;
  evidence: { attempt_id: string; summary: string }[];
}

export async function proposeAdaptation(input: AdaptInput) {
  if (isFixture()) {
    return {
      expected_graph_version: input.graphVersion,
      patch: {
        op: "insert_remediation" as const,
        remediation_title: `Review: ${input.prerequisite.title}`,
        remediation_objective: `Practise ${input.prerequisite.title.toLowerCase()} until it is solid enough for ${input.dependent.title.toLowerCase()}.`,
      },
      rationale: `In ${input.evidence.length} answers you ${input.gapNote.charAt(0).toLowerCase()}${input.gapNote.slice(1).replace(/\.$/, "")}, and the targeted check confirmed it. A short review of ${input.prerequisite.title.toLowerCase()} should make ${input.dependent.title.toLowerCase()} easier.`,
      supporting_attempt_ids: input.evidence.map((e) => e.attempt_id),
    };
  }
  return generateJson({
    task: "adaptation_proposal",
    schema: AdaptationProposal,
    temperature: 0.2,
    maxOutputTokens: 1200,
    system:
      `${TEACHER}\nThe backend has confirmed a prerequisite gap from assessment evidence. Propose the remediation activity's ` +
      "title and objective and a short learner-facing rationale grounded only in the evidence. Frame it as a suggestion, " +
      "mention uncertainty, and never infer personal traits.",
    user:
      `Fields: expected_graph_version (${input.graphVersion}), patch {op: "insert_remediation", remediation_title (<=80), ` +
      `remediation_objective}, rationale (<=500 chars), supporting_attempt_ids (subset of the evidence IDs).\n` +
      `Prerequisite: ${input.prerequisite.title}. Dependent: ${input.dependent.title}. Pattern: ${input.gapNote}\nEvidence:\n` +
      input.evidence.map((e) => `- ${e.attempt_id}: ${e.summary}`).join("\n"),
  });
}

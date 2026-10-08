// Zod schemas for the eight Gemma tasks. Model output is a proposal: it is
// validated here and then checked again against stored data before any write.

import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const key = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab-case key")
  .max(60);
// Gemma sometimes quotes numbers ("2") or names options by letter ("B");
// accept those spellings and validate the number as usual.
const lenient = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^[A-Ea-e]$/.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
  return v;
};
const num = (schema: z.ZodNumber) => z.preprocess(lenient, schema);
const unit = num(z.number().min(0).max(1));

// 1. Goal interpretation
export const GoalInterpretation = z.object({
  is_specific: z.boolean(),
  clarification_question: z.string().trim().max(240).nullable(),
  title: text(80),
  domain: text(60),
  summary: text(400),
});

// 2. Graph proposal
export const GraphProposal = z.object({
  skills: z
    .array(
      z.object({
        key,
        title: text(80),
        objective: text(300),
        goal_contribution: text(300),
        estimated_minutes: num(z.number().int().min(5).max(180)),
        search_query: text(160),
      }),
    )
    .min(8)
    .max(20),
  edges: z.array(z.object({ prerequisite: key, dependent: key })).max(60),
});

// 3. Diagnostic / check / practice / follow-up questions
const snake = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) : v;

export const MisconceptionOut = z.object({
  code: z.preprocess(snake, z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "snake_case code")
    .max(40)),
  suspected_skill_key: key.nullable(),
  note: text(200),
});

/**
 * Normalise a raw question before validation. Gemma often names options by
 * text or letter instead of index; resolve those, and drop distractor tags that
 * still don't point at a wrong option (tags are hints for gap detection, so a
 * missing tag is safer than a failed generation).
 */
function normaliseQuestion(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const q = { ...(raw as Record<string, unknown>) };
  const options = Array.isArray(q.options) ? (q.options as unknown[]).map((o) => String(o).trim()) : null;
  const toIndex = (v: unknown): number | null => {
    const n = lenient(v);
    if (typeof n === "number" && Number.isInteger(n)) return options && n >= 0 && n < options.length ? n : null;
    if (typeof v === "string" && options) {
      const t = v.trim().replace(/^[A-Ea-e][).:]\s*/, "");
      const i = options.findIndex((o) => o === t || o === v.trim());
      return i === -1 ? null : i;
    }
    return null;
  };
  if (options && q.correct_option !== null && q.correct_option !== undefined) q.correct_option = toIndex(q.correct_option) ?? q.correct_option;
  if (Array.isArray(q.distractor_tags)) {
    q.distractor_tags = (q.distractor_tags as Record<string, unknown>[])
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        ...t,
        option: toIndex(t.option),
        code: typeof t.code === "string" ? t.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) : t.code,
      }))
      .filter((t) => t.option !== null && t.option !== q.correct_option)
      .slice(0, 5);
  } else if (q.distractor_tags === undefined || q.distractor_tags === null) {
    q.distractor_tags = [];
  }
  return q;
}

export const QuestionOut = z.preprocess(normaliseQuestion, z
  .object({
    skill_key: key,
    type: z.enum(["mcq", "short"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: text(1200),
    options: z.array(text(300)).min(3).max(5).nullable(),
    correct_option: num(z.number().int().min(0).max(4)).nullable(),
    distractor_tags: z.array(MisconceptionOut.extend({ option: num(z.number().int().min(0).max(4)) })).max(5),
    rubric: z.array(text(240)).max(5),
    hint: text(400),
    explanation: text(800),
  })
  .superRefine((q, ctx) => {
    if (q.type === "mcq") {
      if (!q.options || q.correct_option === null || q.correct_option >= q.options.length) {
        ctx.addIssue({ code: "custom", message: "mcq needs options and a valid correct_option" });
      }
      if (q.distractor_tags.some((t) => t.option === q.correct_option)) {
        ctx.addIssue({ code: "custom", message: "the correct option cannot carry a misconception tag" });
      }
    } else if (q.rubric.length === 0) {
      ctx.addIssue({ code: "custom", message: "short questions need a rubric" });
    }
  }));
export type QuestionOutT = z.infer<typeof QuestionOut>;

export const QuestionSet = z.object({ questions: z.array(QuestionOut).min(1).max(6) });

// 4. Source ranking
export const SourceRanking = z.object({
  selections: z
    .array(
      z.object({
        skill_key: key,
        candidate_id: text(20),
        reason: text(240),
        format: z.enum(["documentation", "tutorial", "article", "video", "course", "reference"]),
      }),
    )
    .max(60),
});

// 5. Lesson generation (practice included)
const cited = z.array(z.string().trim().max(20)).max(6);
export const LessonOut = z.object({
  objective: text(300),
  prerequisite_recap: text(600),
  sections: z.array(z.object({ heading: text(100), body: text(3000), citations: cited })).min(1).max(4),
  worked_example: z.object({ title: text(120), body: text(3000), citations: cited }),
  exercise: z.object({ prompt: text(1200), rubric: z.array(text(240)).min(1).max(5), hint: text(400) }),
  practice: z.array(QuestionOut).min(3).max(5),
});
export type LessonOutT = z.infer<typeof LessonOut>;

// 6. Short-answer evaluation
export const ShortAnswerEvaluation = z.object({
  score: unit,
  feedback: text(600),
  misconceptions: z.array(MisconceptionOut).max(3),
  confidence: unit,
  suggested_followup_skill_keys: z.array(key).max(3),
});

// 7. Tutor reply
export const TutorReply = z.object({
  reply: text(2400),
  hint_level: num(z.number().int().min(1).max(4)),
  cited_source_ids: cited,
});

// 8. Adaptation proposal
export const AdaptationProposal = z.object({
  expected_graph_version: num(z.number().int().min(1)),
  patch: z.object({
    op: z.literal("insert_remediation"),
    remediation_title: text(80),
    remediation_objective: text(300),
  }),
  rationale: text(500),
  supporting_attempt_ids: z.array(z.string()).min(1).max(10),
});

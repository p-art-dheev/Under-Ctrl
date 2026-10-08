// Zod schemas for the eight Gemma tasks. Model output is a proposal: it is
// validated here and then checked again against stored data before any write.

import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const key = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab-case key")
  .max(60);
const unit = z.number().min(0).max(1);

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
        estimated_minutes: z.number().int().min(5).max(180),
        search_query: text(160),
      }),
    )
    .min(8)
    .max(20),
  edges: z.array(z.object({ prerequisite: key, dependent: key })).max(60),
});

// 3. Diagnostic / check / practice / follow-up questions
export const MisconceptionOut = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "snake_case code")
    .max(40),
  suspected_skill_key: key.nullable(),
  note: text(200),
});

export const QuestionOut = z
  .object({
    skill_key: key,
    type: z.enum(["mcq", "short"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: text(1200),
    options: z.array(text(300)).min(3).max(5).nullable(),
    correct_option: z.number().int().min(0).max(4).nullable(),
    distractor_tags: z.array(MisconceptionOut.extend({ option: z.number().int().min(0).max(4) })).max(5),
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
  });
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
  hint_level: z.number().int().min(1).max(4),
  cited_source_ids: cited,
});

// 8. Adaptation proposal
export const AdaptationProposal = z.object({
  expected_graph_version: z.number().int().min(1),
  patch: z.object({
    op: z.literal("insert_remediation"),
    remediation_title: text(80),
    remediation_objective: text(300),
  }),
  rationale: text(500),
  supporting_attempt_ids: z.array(z.string()).min(1).max(10),
});

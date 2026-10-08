// Row shapes shared by the Supabase store and the local demo store.
// Column names match supabase/migrations exactly.

export type Difficulty = "simplified" | "standard" | "accelerated";
export type GroupKind = "diagnostic_1" | "diagnostic_2" | "practice" | "check" | "followup";
export type ContentMode = "live" | "fixture";
export type DisplayState = "needs_review" | "mastered" | "locked" | "learning" | "available";

export interface Profile {
  id: string;
  display_name: string | null;
  timezone: string | null;
  explanation_format: string | null;
  active_course_id: string | null;
  created_at: string;
}

export interface GoalInterpretationData {
  title: string;
  domain: string;
  summary: string;
}

export interface LearningGoal {
  id: string;
  owner_id: string;
  goal_text: string;
  experience: string;
  daily_minutes: number;
  explanation_format: string;
  target_date: string | null;
  interpretation: GoalInterpretationData | null;
  created_at: string;
}

export interface PendingCheck {
  group_id: string;
  gap_code: string;
  gap_note: string;
  suspected_skill_id: string;
  dependent_skill_id: string;
  evidence_attempt_ids: string[];
  created_at: string;
}

export interface Followup {
  skill_id: string;
  remediation_skill_id: string;
  status: "scheduled" | "passed";
  group_id: string | null;
  created_at: string;
}

export type SetupStage = "graph" | "diagnostic_1" | "diagnostic_2" | "resources" | "lesson" | "done";

export interface CourseState {
  setup_stage: SetupStage;
  resource_origin?: "live_search" | "curated";
  pending_check?: PendingCheck | null;
  followups?: Followup[];
  /** dependent skill id -> remediation skill the learner chose to postpone */
  postponed?: Record<string, string>;
}

export interface Course {
  id: string;
  goal_id: string;
  owner_id: string;
  title: string;
  status: "setup" | "active";
  graph_version: number;
  content_mode: ContentMode;
  state: CourseState;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  course_id: string;
  owner_id: string;
  key: string;
  title: string;
  objective: string;
  goal_contribution: string;
  estimated_minutes: number;
  kind: "core" | "remediation";
  remediates_skill_id: string | null;
  order_index: number;
  difficulty: Difficulty;
  search_query: string | null;
  created_version: number;
  created_at: string;
}

export interface SkillEdge {
  id: string;
  course_id: string;
  owner_id: string;
  prerequisite_id: string;
  dependent_id: string;
  created_version: number;
  created_at: string;
}

export interface Mastery {
  skill_id: string;
  course_id: string;
  owner_id: string;
  score: number | null;
  evidence_count: number;
  correct_no_hint: number;
  provisional: boolean;
  unlock_override: boolean;
  last_assessed_at: string | null;
  updated_at: string;
}

export interface Resource {
  id: string;
  course_id: string;
  owner_id: string;
  skill_id: string;
  source_key: string;
  url: string;
  title: string;
  provider: string;
  excerpt: string;
  format: string;
  origin: "live_search" | "curated";
  verification_status: string;
  selection_reason: string;
  estimated_minutes: number | null;
  retrieved_at: string;
}

export interface LessonSection {
  heading: string;
  body: string;
  citations: string[];
}

export interface LessonContent {
  objective: string;
  prerequisite_recap: string;
  sections: LessonSection[];
  worked_example: { title: string; body: string; citations: string[] };
  exercise_intro: string;
  estimated_minutes: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  owner_id: string;
  skill_id: string;
  version: number;
  difficulty: Difficulty;
  content: LessonContent;
  source_keys: string[];
  practice_group_id: string;
  content_mode: ContentMode;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  owner_id: string;
  course_id: string;
  lesson_id: string;
  skill_id: string;
  status: "started" | "completed";
  started_at: string;
  completed_at: string | null;
  active_minutes: number;
}

export interface Question {
  id: string;
  course_id: string;
  owner_id: string;
  group_id: string;
  group_kind: GroupKind;
  lesson_id: string | null;
  skill_ids: string[];
  type: "mcq" | "short";
  prompt: string;
  options: string[] | null;
  difficulty: "easy" | "medium" | "hard";
  position: number;
  allow_hints: boolean;
  created_at: string;
}

export interface MisconceptionTag {
  code: string;
  suspected_skill_id: string | null;
  note: string;
}

/** Private grading data. Never selectable by learners (RLS on, no policies). */
export interface QuestionKey {
  question_id: string;
  course_id: string;
  owner_id: string;
  correct_option: number | null;
  /** option index (as string) -> misconception tag for that distractor */
  option_tags: Record<string, MisconceptionTag>;
  rubric: string[];
  hint: string;
  explanation: string;
}

export interface HintUse {
  question_id: string;
  course_id: string;
  owner_id: string;
  created_at: string;
}

export interface Attempt {
  id: string;
  question_id: string;
  course_id: string;
  owner_id: string;
  group_id: string;
  answer: { option?: number; text?: string };
  score: number;
  is_correct: boolean;
  hint_count: number;
  confidence: number | null;
  dont_understand: boolean;
  feedback: string;
  misconceptions: MisconceptionTag[];
  idempotency_key: string;
  created_at: string;
}

export interface MasteryEvent {
  id: string;
  course_id: string;
  owner_id: string;
  skill_id: string;
  old_score: number | null;
  new_score: number;
  evidence_count: number;
  attempt_ids: string[];
  reason: string;
  created_at: string;
}

export interface GraphPatch {
  add_skills: Skill[];
  add_edges: SkillEdge[];
  difficulty_changes: { skill_id: string; difficulty: Difficulty }[];
  followup: { skill_id: string; remediation_skill_id: string } | null;
}

export type AdaptationKind =
  | "graph_created"
  | "check_requested"
  | "check_passed"
  | "remediation_inserted"
  | "remediation_reused"
  | "remediation_postponed"
  | "followup_passed"
  | "followup_missed";

export interface AdaptationEvent {
  id: string;
  course_id: string;
  owner_id: string;
  kind: AdaptationKind;
  from_version: number;
  to_version: number;
  patch: Partial<GraphPatch> | null;
  evidence_attempt_ids: string[];
  reason: string;
  created_at: string;
}

export interface TutorMessage {
  id: string;
  course_id: string;
  owner_id: string;
  skill_id: string;
  lesson_id: string | null;
  role: "learner" | "tutor";
  content: string;
  created_at: string;
}

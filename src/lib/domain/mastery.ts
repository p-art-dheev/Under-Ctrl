// Transparent mastery heuristic (spec section 5). These are configurable demo
// heuristics, not a validated knowledge-tracing model.

export const RULES = {
  /** Multiplier applied to a score when a hint was used. */
  HINT_FACTOR: 0.7,
  /** m_new = OLD_WEIGHT * m_old + NEW_WEIGHT * r_effective */
  OLD_WEIGHT: 0.7,
  NEW_WEIGHT: 0.3,
  MASTERY_THRESHOLD: 0.8,
  MASTERY_MIN_OBSERVATIONS: 3,
  MASTERY_MIN_CORRECT_NO_HINT: 2,
  READY_THRESHOLD: 0.65,
  READY_MIN_OBSERVATIONS: 2,
  /** Rubric correctness at or above this counts as a correct answer. */
  CORRECT_AT: 0.8,
  /** Rubric correctness below this counts as a low-scoring answer. */
  LOW_BELOW: 0.5,
  /** Low answers sharing one misconception needed before a targeted check. */
  GAP_MIN_ANSWERS: 2,
  /** A targeted check confirms the gap when its mean score is below this. */
  CHECK_CONFIRM_BELOW: 0.6,
  /** A follow-up passes when its mean score is at or above this. */
  FOLLOWUP_PASS_AT: 0.8,
} as const;

export interface MasteryState {
  score: number | null;
  evidence_count: number;
  correct_no_hint: number;
}

export interface Observation {
  /** Rubric correctness in [0, 1]. */
  r: number;
  hintUsed: boolean;
}

export const UNASSESSED: MasteryState = { score: null, evidence_count: 0, correct_no_hint: 0 };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function effectiveScore(obs: Observation): number {
  const r = clamp01(obs.r);
  return obs.hintUsed ? r * RULES.HINT_FACTOR : r;
}

export function applyObservation(state: MasteryState, obs: Observation): MasteryState {
  const rEff = effectiveScore(obs);
  const score =
    state.score === null ? rEff : RULES.OLD_WEIGHT * state.score + RULES.NEW_WEIGHT * rEff;
  const independentCorrect = !obs.hintUsed && clamp01(obs.r) >= RULES.CORRECT_AT;
  return {
    score: round4(clamp01(score)),
    evidence_count: state.evidence_count + 1,
    correct_no_hint: state.correct_no_hint + (independentCorrect ? 1 : 0),
  };
}

export function isAssessed(state: MasteryState): boolean {
  return state.evidence_count > 0 && state.score !== null;
}

export function isProvisional(state: MasteryState): boolean {
  return state.evidence_count < RULES.MASTERY_MIN_OBSERVATIONS;
}

export function isMastered(state: MasteryState): boolean {
  return (
    state.score !== null &&
    state.score >= RULES.MASTERY_THRESHOLD &&
    state.evidence_count >= RULES.MASTERY_MIN_OBSERVATIONS &&
    state.correct_no_hint >= RULES.MASTERY_MIN_CORRECT_NO_HINT
  );
}

/** Ready as a prerequisite: enough direct evidence at a moderate score. */
export function isReady(state: MasteryState): boolean {
  return (
    state.score !== null &&
    state.score >= RULES.READY_THRESHOLD &&
    state.evidence_count >= RULES.READY_MIN_OBSERVATIONS
  );
}

/** Enough direct evidence to say the skill is currently below the ready bar. */
export function isWeak(state: MasteryState): boolean {
  return (
    state.score !== null &&
    state.evidence_count >= RULES.READY_MIN_OBSERVATIONS &&
    state.score < RULES.READY_THRESHOLD
  );
}

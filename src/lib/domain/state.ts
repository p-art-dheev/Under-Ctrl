// Server-side display state for every skill.
//
// Precedence (first match wins):
//   1. needs_review  a follow-up is due, or >= 2 direct observations put the
//                    score below the ready threshold
//   2. mastered      score >= 0.8, >= 3 observations, >= 2 correct without hints
//   3. locked        a prerequisite is not ready and there is no learner override
//   4. learning      the lesson was started/completed or there is direct evidence
//   5. available     everything else
// "assessed" is reported separately so the UI can badge unassessed skills.

import type { DisplayState } from "@/lib/types";
import { isAssessed, isMastered, isReady, isWeak, UNASSESSED, type MasteryState } from "./mastery";

export interface StateInput {
  skills: { id: string; title: string }[];
  edges: { prerequisite_id: string; dependent_id: string }[];
  mastery: Map<string, MasteryState & { unlock_override?: boolean }>;
  /** skills whose lesson has been started or completed */
  active: Set<string>;
  /** skills with a scheduled follow-up assessment */
  followupDue: Set<string>;
}

export interface SkillStatus {
  state: DisplayState;
  assessed: boolean;
  ready: boolean;
  mastered: boolean;
  /** true when the learner unlocked this skill despite unmet prerequisites */
  overridden: boolean;
  /** titles of prerequisites that are not ready yet */
  unmet: string[];
  reason: string;
}

export function computeDisplayStates(input: StateInput): Map<string, SkillStatus> {
  const titles = new Map(input.skills.map((s) => [s.id, s.title]));
  const prereqs = new Map<string, string[]>(input.skills.map((s) => [s.id, []]));
  for (const e of input.edges) prereqs.get(e.dependent_id)?.push(e.prerequisite_id);

  const result = new Map<string, SkillStatus>();
  for (const skill of input.skills) {
    const m = input.mastery.get(skill.id) ?? UNASSESSED;
    const overridden = Boolean(input.mastery.get(skill.id)?.unlock_override);
    const unmet = prereqs
      .get(skill.id)!
      .filter((p) => !isReady(input.mastery.get(p) ?? UNASSESSED))
      .map((p) => titles.get(p) ?? p);
    const assessed = isAssessed(m);
    const mastered = isMastered(m);
    const pct = m.score === null ? "" : `${Math.round(m.score * 100)}%`;
    const evidence = `${m.evidence_count} direct observation${m.evidence_count === 1 ? "" : "s"}`;

    let state: DisplayState;
    let reason: string;
    if (input.followupDue.has(skill.id)) {
      state = "needs_review";
      reason = `A follow-up check is scheduled for this skill (currently ${pct} from ${evidence}).`;
    } else if (isWeak(m)) {
      state = "needs_review";
      reason = `${evidence} put this skill at ${pct}, below the 65% ready threshold.`;
    } else if (mastered) {
      state = "mastered";
      reason = `${pct} from ${evidence}, including ${m.correct_no_hint} correct answers without hints.`;
    } else if (unmet.length > 0 && !overridden) {
      state = "locked";
      reason = `Waiting on ${unmet.join(", ")} (a prerequisite is ready at 65% with at least 2 observations).`;
    } else if (input.active.has(skill.id) || assessed) {
      state = "learning";
      reason = assessed
        ? `In progress: ${pct} from ${evidence}. Mastery needs 80%, 3 observations and 2 correct answers without hints.`
        : "Lesson started; no scored answers yet.";
    } else {
      state = "available";
      reason =
        unmet.length > 0
          ? `Unlocked by your choice; ${unmet.join(", ")} is still recommended first.`
          : "Prerequisites are ready. No scored answers yet.";
    }
    result.set(skill.id, {
      state,
      assessed,
      ready: isReady(m),
      mastered,
      overridden: overridden && unmet.length > 0,
      unmet,
      reason,
    });
  }
  return result;
}

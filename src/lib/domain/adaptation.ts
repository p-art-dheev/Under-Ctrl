// Backend rules that decide when evidence is strong enough to change the course.
// The model only proposes hypotheses and wording; these functions decide.

import type { GraphPatch, GroupKind, MisconceptionTag, Skill, SkillEdge } from "@/lib/types";
import { validatePatch } from "./graph";
import { RULES } from "./mastery";

export interface BatchAttempt {
  attempt_id: string;
  skill_ids: string[];
  score: number;
  misconceptions: MisconceptionTag[];
}

export interface GapCandidate {
  code: string;
  note: string;
  suspected_skill_id: string;
  dependent_skill_id: string;
  evidence_attempt_ids: string[];
}

/**
 * A gap candidate needs at least two low-scoring answers in one batch that
 * share a misconception code pointing at the same other skill. One wrong
 * answer, or wrong answers with unrelated causes, never produces a candidate.
 */
export function detectGap(attempts: BatchAttempt[], knownSkillIds: Set<string>): GapCandidate | null {
  const groups = new Map<string, { tag: MisconceptionTag; attempts: BatchAttempt[] }>();
  for (const a of attempts) {
    if (a.score >= RULES.LOW_BELOW) continue;
    const seen = new Set<string>();
    for (const tag of a.misconceptions) {
      const suspected = tag.suspected_skill_id;
      if (!suspected || !knownSkillIds.has(suspected) || a.skill_ids.includes(suspected)) continue;
      const key = `${tag.code}|${suspected}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const g = groups.get(key) ?? { tag, attempts: [] };
      g.attempts.push(a);
      groups.set(key, g);
    }
  }
  let best: { tag: MisconceptionTag; attempts: BatchAttempt[] } | null = null;
  for (const g of groups.values()) {
    if (g.attempts.length >= RULES.GAP_MIN_ANSWERS && (!best || g.attempts.length > best.attempts.length)) {
      best = g;
    }
  }
  if (!best) return null;
  const counts = new Map<string, number>();
  for (const a of best.attempts) counts.set(a.skill_ids[0], (counts.get(a.skill_ids[0]) ?? 0) + 1);
  const dependent = [...counts.entries()].sort((x, y) => y[1] - x[1])[0][0];
  return {
    code: best.tag.code,
    note: best.tag.note,
    suspected_skill_id: best.tag.suspected_skill_id!,
    dependent_skill_id: dependent,
    evidence_attempt_ids: best.attempts.map((a) => a.attempt_id),
  };
}

/** Only lesson practice can open a targeted check, and only one check is open at a time. */
export function shouldRequestCheck(
  kind: GroupKind,
  gap: GapCandidate | null,
  hasPendingCheck: boolean,
): gap is GapCandidate {
  return kind === "practice" && gap !== null && !hasPendingCheck;
}

export function mean(scores: number[]): number {
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

/** The targeted check is direct evidence on the prerequisite; a low mean confirms the gap. */
export function checkConfirmsGap(scores: number[]): boolean {
  return scores.length > 0 && mean(scores) < RULES.CHECK_CONFIRM_BELOW;
}

export function followupPassed(scores: number[]): boolean {
  return scores.length > 0 && mean(scores) >= RULES.FOLLOWUP_PASS_AT;
}

export interface RemediationPlanInput {
  graphVersion: number;
  skills: Skill[];
  edges: SkillEdge[];
  prerequisite: Skill;
  dependent: Skill;
  /** remediation skills whose follow-up has already passed */
  resolvedRemediationIds: Set<string>;
  proposal: { title: string; objective: string };
  newIds: { skill: string; edge: string };
  now: string;
}

export interface RemediationPlan {
  kind: "remediation_inserted" | "remediation_reused";
  remediationSkillId: string;
  patch: GraphPatch;
}

/**
 * Build the single allowed patch for a confirmed gap: one remediation node R
 * with edge R -> dependent, a simpler next lesson for the dependent, and a
 * scheduled follow-up on the prerequisite. An unresolved remediation node for
 * the same prerequisite is reused instead of inserting a second one.
 */
export function planRemediation(input: RemediationPlanInput): RemediationPlan {
  const { prerequisite, dependent, skills, edges } = input;
  const nextVersion = input.graphVersion + 1;
  const simplify: GraphPatch["difficulty_changes"] =
    dependent.difficulty === "simplified" ? [] : [{ skill_id: dependent.id, difficulty: "simplified" }];

  const open = skills.find(
    (s) =>
      s.kind === "remediation" &&
      s.remediates_skill_id === prerequisite.id &&
      !input.resolvedRemediationIds.has(s.id),
  );
  const edgeFor = (remediationId: string): SkillEdge => ({
    id: input.newIds.edge,
    course_id: dependent.course_id,
    owner_id: dependent.owner_id,
    prerequisite_id: remediationId,
    dependent_id: dependent.id,
    created_version: nextVersion,
    created_at: input.now,
  });

  let plan: RemediationPlan;
  if (open) {
    const linked = edges.some((e) => e.prerequisite_id === open.id && e.dependent_id === dependent.id);
    plan = {
      kind: "remediation_reused",
      remediationSkillId: open.id,
      patch: {
        add_skills: [],
        add_edges: linked ? [] : [edgeFor(open.id)],
        difficulty_changes: simplify,
        followup: null,
      },
    };
  } else {
    let key = `review-${prerequisite.key}`;
    for (let n = 2; skills.some((s) => s.key === key); n++) key = `review-${prerequisite.key}-${n}`;
    const remediation: Skill = {
      id: input.newIds.skill,
      course_id: dependent.course_id,
      owner_id: dependent.owner_id,
      key,
      title: input.proposal.title,
      objective: input.proposal.objective,
      goal_contribution: `Targeted practice so that ${dependent.title} builds on solid ${prerequisite.title}.`,
      estimated_minutes: 10,
      kind: "remediation",
      remediates_skill_id: prerequisite.id,
      order_index: dependent.order_index - 0.5,
      difficulty: "simplified",
      search_query: null,
      created_version: nextVersion,
      created_at: input.now,
    };
    plan = {
      kind: "remediation_inserted",
      remediationSkillId: remediation.id,
      patch: {
        add_skills: [remediation],
        add_edges: [edgeFor(remediation.id)],
        difficulty_changes: simplify,
        followup: { skill_id: prerequisite.id, remediation_skill_id: remediation.id },
      },
    };
  }

  const check = validatePatch(
    skills.map((s) => ({ id: s.id })),
    edges.map((e) => ({ from: e.prerequisite_id, to: e.dependent_id })),
    {
      addNodes: plan.patch.add_skills.map((s) => ({ id: s.id })),
      addEdges: plan.patch.add_edges.map((e) => ({ from: e.prerequisite_id, to: e.dependent_id })),
    },
  );
  if (!check.ok) throw new Error(`remediation patch rejected: ${check.errors.join("; ")}`);
  return plan;
}

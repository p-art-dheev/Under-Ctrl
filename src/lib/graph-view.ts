// Server-side projection of the persisted graph for the React Flow view.
import { depths } from "@/lib/domain/graph";
import { planOrder, skillViews, type Snapshot } from "@/lib/services/snapshot";
import type { GraphSkill } from "@/components/skill-graph";

export function graphSkills(snap: Snapshot): GraphSkill[] {
  const views = skillViews(snap);
  const depth = depths(
    snap.skills.map((s) => ({ id: s.id })),
    snap.edges.map((e) => ({ from: e.prerequisite_id, to: e.dependent_id })),
  );
  const rowCount = new Map<number, number>();
  return planOrder(snap).map((s) => {
    const v = views.get(s.id)!;
    // a review node has no prerequisites of its own, so draw it just above the skill it unlocks
    const deps = snap.edges.filter((e) => e.prerequisite_id === s.id).map((e) => depth.get(e.dependent_id) ?? 1);
    const d = s.kind === "remediation" && deps.length ? Math.max(0, Math.min(...deps) - 1) : depth.get(s.id) ?? 0;
    const row = rowCount.get(d) ?? 0;
    rowCount.set(d, row + 1);
    const qIds = new Set(snap.questions.filter((q) => q.skill_ids[0] === (s.remediates_skill_id ?? s.id)).map((q) => q.id));
    return {
      id: s.id,
      title: s.title,
      objective: s.objective,
      contribution: s.goal_contribution,
      kind: s.kind,
      state: v.state,
      stateLabel: v.remediation === "resolved" ? "Resolved" : v.remediation === "postponed" ? "Postponed" : v.remediation === "open" ? "Review" : undefined,
      reason: v.reason,
      score: v.mastery.score,
      evidence: v.mastery.evidence_count,
      assessed: v.assessed,
      depth: d,
      row,
      prerequisites: v.prerequisites,
      dependents: v.dependents,
      lessonStatus: v.lessonStatus,
      resources: v.resources.map((r) => ({ key: r.source_key, title: r.title, url: r.url, origin: r.origin })),
      attempts: snap.attempts
        .filter((a) => qIds.has(a.question_id))
        .map((a) => ({ prompt: snap.questions.find((q) => q.id === a.question_id)!.prompt.split("\n")[0].slice(0, 70), correct: a.is_correct, at: a.created_at })),
    };
  });
}

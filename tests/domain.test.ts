import { describe, expect, it } from "vitest";
import { topoOrder, validateGraph, validatePatch } from "@/lib/domain/graph";
import {
  applyObservation,
  isMastered,
  isReady,
  UNASSESSED,
  type MasteryState,
} from "@/lib/domain/mastery";
import { computeDisplayStates } from "@/lib/domain/state";
import { checkConfirmsGap, detectGap, planRemediation, shouldRequestCheck } from "@/lib/domain/adaptation";
import { filterCitations, sanitizeLessonCitations } from "@/lib/domain/citations";
import type { Skill, SkillEdge } from "@/lib/types";

const n = (...ids: string[]) => ids.map((id) => ({ id }));

describe("graph validation", () => {
  it("accepts a DAG where a skill has several prerequisites and dependents", () => {
    const r = validateGraph(n("a", "b", "c", "d"), [
      { from: "a", to: "c" },
      { from: "b", to: "c" },
      { from: "a", to: "d" },
    ]);
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it("rejects cycles", () => {
    const r = validateGraph(n("a", "b", "c"), [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/^cycle: /);
  });

  it("rejects self-loops, dangling references, duplicate nodes and duplicate edges", () => {
    expect(validateGraph(n("a"), [{ from: "a", to: "a" }]).errors).toContain("self-loop on a");
    expect(validateGraph(n("a"), [{ from: "a", to: "zz" }]).errors).toContain(
      "dangling dependent reference: zz",
    );
    expect(validateGraph(n("a", "a"), []).errors).toContain("duplicate node: a");
    expect(
      validateGraph(n("a", "b"), [
        { from: "a", to: "b" },
        { from: "a", to: "b" },
      ]).errors,
    ).toContain("duplicate edge: a->b");
  });

  it("rejects a patch that would close a cycle", () => {
    const r = validatePatch(n("a", "b"), [{ from: "a", to: "b" }], {
      addNodes: n("r"),
      addEdges: [
        { from: "b", to: "r" },
        { from: "r", to: "a" },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("orders prerequisites first and is stable on the order hint", () => {
    const nodes = [
      { id: "loops", order: 2 },
      { id: "vars", order: 0 },
      { id: "lists", order: 1 },
      { id: "extra", order: 1.5 },
    ];
    const edges = [
      { from: "vars", to: "lists" },
      { from: "lists", to: "loops" },
    ];
    expect(topoOrder(nodes, edges)).toEqual(["vars", "lists", "extra", "loops"]);
    expect(() => topoOrder(nodes, [...edges, { from: "loops", to: "vars" }])).toThrow(/cycle/);
  });
});

describe("mastery heuristic", () => {
  const run = (obs: [number, boolean][], start: MasteryState = UNASSESSED) =>
    obs.reduce((m, [r, hintUsed]) => applyObservation(m, { r, hintUsed }), start);

  it("initialises from the first observation and blends 0.7/0.3 afterwards", () => {
    const first = run([[1, false]]);
    expect(first).toEqual({ score: 1, evidence_count: 1, correct_no_hint: 1 });
    expect(run([[0, false]], first).score).toBeCloseTo(0.7);
    expect(run([[0.5, false]], { score: 0.4, evidence_count: 2, correct_no_hint: 0 }).score).toBeCloseTo(
      0.43,
    );
  });

  it("scales a hinted answer by 0.7 and does not count it as independent", () => {
    const m = run([[1, true]]);
    expect(m.score).toBeCloseTo(0.7);
    expect(m.correct_no_hint).toBe(0);
  });

  it("keeps unassessed skills null and never ready", () => {
    expect(UNASSESSED.score).toBeNull();
    expect(isReady(UNASSESSED)).toBe(false);
    expect(isMastered(UNASSESSED)).toBe(false);
  });

  it("needs 0.8, three observations and two unhinted correct answers for mastery", () => {
    expect(isMastered(run([[1, false], [1, false]]))).toBe(false); // only 2 observations
    expect(isMastered(run([[1, false], [1, false], [1, false]]))).toBe(true);
    const hinted = run([[1, true], [1, true], [1, false], [1, true], [1, true], [1, true]]);
    expect(hinted.evidence_count).toBe(6);
    expect(hinted.correct_no_hint).toBe(1);
    expect(isMastered(hinted)).toBe(false); // only one independent correct answer
  });

  it("is ready at 0.65 with two observations", () => {
    expect(isReady(run([[1, false]]))).toBe(false);
    expect(isReady(run([[1, false], [0.6, false]]))).toBe(true); // 0.88
    expect(isReady(run([[0, false], [1, false]]))).toBe(false); // 0.3
  });

  it("reproduces the seeded demo arithmetic for the indexing gap", () => {
    // seeded: two observations -> 0.79 (ready, not mastered)
    let m = run([[1, false], [0.3, false]]);
    expect(m.score).toBeCloseTo(0.79);
    expect(isReady(m)).toBe(true);
    // targeted check, both wrong -> no longer ready
    m = run([[0, false], [0, false]], m);
    expect(m.score).toBeCloseTo(0.3871);
    expect(isReady(m)).toBe(false);
    // remediation practice x3 correct, then follow-up x2 correct -> mastered
    m = run([[1, false], [1, false], [1, false]], m);
    expect(isReady(m)).toBe(true);
    m = run([[1, false], [1, false]], m);
    expect(m.score).toBeGreaterThanOrEqual(0.8);
    expect(isMastered(m)).toBe(true);
  });
});

describe("display state and availability", () => {
  const skills = [
    { id: "idx", title: "Indexing" },
    { id: "loops", title: "Loops" },
    { id: "funcs", title: "Functions" },
  ];
  const edges = [
    { prerequisite_id: "idx", dependent_id: "loops" },
    { prerequisite_id: "loops", dependent_id: "funcs" },
  ];
  const base = { skills, edges, active: new Set<string>(), followupDue: new Set<string>() };

  it("locks dependents until the prerequisite is ready, and labels unassessed skills", () => {
    const s = computeDisplayStates({ ...base, mastery: new Map() });
    expect(s.get("idx")).toMatchObject({ state: "available", assessed: false });
    expect(s.get("loops")).toMatchObject({ state: "locked", assessed: false, unmet: ["Indexing"] });
  });

  it("unlocks the dependent when the prerequisite becomes ready", () => {
    const mastery = new Map([["idx", { score: 0.7, evidence_count: 2, correct_no_hint: 1 }]]);
    const s = computeDisplayStates({ ...base, mastery });
    expect(s.get("idx")!.state).toBe("learning");
    expect(s.get("loops")!.state).toBe("available");
    expect(s.get("funcs")!.state).toBe("locked");
  });

  it("applies precedence: needs_review > mastered > locked > learning > available", () => {
    const mastered = { score: 0.9, evidence_count: 4, correct_no_hint: 3 };
    const weak = { score: 0.3, evidence_count: 2, correct_no_hint: 0 };
    let s = computeDisplayStates({ ...base, mastery: new Map([["idx", mastered]]) });
    expect(s.get("idx")!.state).toBe("mastered");
    // a due follow-up outranks mastered
    s = computeDisplayStates({
      ...base,
      mastery: new Map([["idx", mastered]]),
      followupDue: new Set(["idx"]),
    });
    expect(s.get("idx")!.state).toBe("needs_review");
    // weak evidence on a locked skill is still needs_review; locked outranks learning
    s = computeDisplayStates({
      ...base,
      mastery: new Map([["loops", weak]]),
      active: new Set(["funcs"]),
    });
    expect(s.get("loops")!.state).toBe("needs_review");
    expect(s.get("funcs")!.state).toBe("locked");
  });

  it("honours a learner override and one low answer is not a review", () => {
    const mastery = new Map([
      ["loops", { score: 0, evidence_count: 1, correct_no_hint: 0, unlock_override: true }],
    ]);
    const s = computeDisplayStates({ ...base, mastery });
    expect(s.get("loops")).toMatchObject({ state: "learning", overridden: true });
  });

  it("does not turn lesson activity into mastery", () => {
    const s = computeDisplayStates({ ...base, mastery: new Map(), active: new Set(["idx"]) });
    expect(s.get("idx")).toMatchObject({ state: "learning", assessed: false, mastered: false });
  });
});

describe("adaptation rules", () => {
  const tag = { code: "value_as_index", suspected_skill_id: "idx", note: "used a value as an index" };
  const known = new Set(["idx", "loops"]);
  const wrong = (id: string, t = tag) => ({
    attempt_id: id,
    skill_ids: ["loops"],
    score: 0,
    misconceptions: [t],
  });

  it("needs two low answers with the same misconception", () => {
    expect(detectGap([wrong("a1")], known)).toBeNull();
    expect(
      detectGap([wrong("a1"), wrong("a2", { ...tag, code: "off_by_one" })], known),
    ).toBeNull();
    expect(detectGap([wrong("a1"), wrong("a2")], known)).toEqual({
      code: "value_as_index",
      note: tag.note,
      suspected_skill_id: "idx",
      dependent_skill_id: "loops",
      evidence_attempt_ids: ["a1", "a2"],
    });
  });

  it("ignores correct answers, unknown skills and self-references", () => {
    const right = { ...wrong("a2"), score: 1 };
    expect(detectGap([wrong("a1"), right], known)).toBeNull();
    const unknown = { ...tag, suspected_skill_id: "nope" };
    expect(detectGap([wrong("a1", unknown), wrong("a2", unknown)], known)).toBeNull();
    const self = { ...tag, suspected_skill_id: "loops" };
    expect(detectGap([wrong("a1", self), wrong("a2", self)], known)).toBeNull();
  });

  it("only opens a check from practice and never while one is pending", () => {
    const gap = detectGap([wrong("a1"), wrong("a2")], known);
    expect(shouldRequestCheck("practice", gap, false)).toBe(true);
    expect(shouldRequestCheck("practice", gap, true)).toBe(false);
    expect(shouldRequestCheck("check", gap, false)).toBe(false);
    expect(shouldRequestCheck("practice", null, false)).toBe(false);
  });

  it("confirms a gap only from low targeted-check scores", () => {
    expect(checkConfirmsGap([0, 0])).toBe(true);
    expect(checkConfirmsGap([1, 0])).toBe(true);
    expect(checkConfirmsGap([1, 1])).toBe(false);
    expect(checkConfirmsGap([])).toBe(false);
  });

  const skill = (id: string, order: number, extra: Partial<Skill> = {}): Skill => ({
    id,
    course_id: "c",
    owner_id: "u",
    key: id,
    title: id,
    objective: "",
    goal_contribution: "",
    estimated_minutes: 20,
    kind: "core",
    remediates_skill_id: null,
    order_index: order,
    difficulty: "standard",
    search_query: null,
    created_version: 1,
    created_at: "t",
    ...extra,
  });
  const edge = (from: string, to: string): SkillEdge => ({
    id: `${from}-${to}`,
    course_id: "c",
    owner_id: "u",
    prerequisite_id: from,
    dependent_id: to,
    created_version: 1,
    created_at: "t",
  });
  const planInput = {
    graphVersion: 1,
    skills: [skill("idx", 1), skill("loops", 2)],
    edges: [edge("idx", "loops")],
    prerequisite: skill("idx", 1),
    dependent: skill("loops", 2),
    resolvedRemediationIds: new Set<string>(),
    proposal: { title: "Indexing practice", objective: "Use positions, not values" },
    newIds: { skill: "r1", edge: "e-r1" },
    now: "t2",
  };

  it("inserts one remediation node R with edge R -> dependent and schedules a follow-up", () => {
    const plan = planRemediation(planInput);
    expect(plan.kind).toBe("remediation_inserted");
    expect(plan.patch.add_skills).toHaveLength(1);
    expect(plan.patch.add_skills[0]).toMatchObject({
      id: "r1",
      key: "review-idx",
      kind: "remediation",
      remediates_skill_id: "idx",
      order_index: 1.5,
      created_version: 2,
    });
    expect(plan.patch.add_edges).toMatchObject([{ prerequisite_id: "r1", dependent_id: "loops" }]);
    expect(plan.patch.difficulty_changes).toEqual([{ skill_id: "loops", difficulty: "simplified" }]);
    expect(plan.patch.followup).toEqual({ skill_id: "idx", remediation_skill_id: "r1" });
  });

  it("reuses an unresolved remediation node for the same gap", () => {
    const first = planRemediation(planInput);
    const again = planRemediation({
      ...planInput,
      graphVersion: 2,
      skills: [...planInput.skills, ...first.patch.add_skills],
      edges: [...planInput.edges, ...first.patch.add_edges],
      newIds: { skill: "r2", edge: "e-r2" },
    });
    expect(again.kind).toBe("remediation_reused");
    expect(again.remediationSkillId).toBe("r1");
    expect(again.patch.add_skills).toEqual([]);
    expect(again.patch.add_edges).toEqual([]);
    expect(again.patch.followup).toBeNull();
  });

  it("inserts a fresh node once the earlier remediation was resolved", () => {
    const first = planRemediation(planInput);
    const later = planRemediation({
      ...planInput,
      skills: [...planInput.skills, ...first.patch.add_skills],
      edges: [...planInput.edges, ...first.patch.add_edges],
      resolvedRemediationIds: new Set(["r1"]),
      newIds: { skill: "r2", edge: "e-r2" },
    });
    expect(later.kind).toBe("remediation_inserted");
    expect(later.patch.add_skills[0].key).toBe("review-idx-2");
  });
});

describe("source reference validation", () => {
  it("keeps only supplied source IDs", () => {
    expect(filterCitations(["S1", "S9", "S2", "S1"], ["S1", "S2", "S3"])).toEqual({
      valid: ["S1", "S2"],
      rejected: ["S9"],
    });
  });

  it("strips invented citations from lesson content", () => {
    const content = {
      sections: [
        { heading: "a", body: "", citations: ["S1", "https://made-up.example"] },
        { heading: "b", body: "", citations: ["S7"] },
      ],
      worked_example: { title: "", body: "", citations: ["S2"] },
    };
    const r = sanitizeLessonCitations(content, ["S1", "S2"]);
    expect(r.content.sections.map((s) => s.citations)).toEqual([["S1"], []]);
    expect(r.used).toEqual(["S1", "S2"]);
    expect(r.rejected).toEqual(["https://made-up.example", "S7"]);
  });
});

describe("extractJson", () => {
  it("keeps code fences that live inside JSON strings", async () => {
    const { extractJson } = await import("@/lib/ai/gemma");
    const reply = '{"questions":[{"prompt":"What prints?\\n```python\\nprint(1)\\n```"}]}';
    expect(extractJson(reply)).toEqual({ questions: [{ prompt: "What prints?\n```python\nprint(1)\n```" }] });
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("question schema", () => {
  it("resolves options named by text or letter and drops tags it cannot place", async () => {
    const { QuestionOut } = await import("@/lib/ai/schemas");
    const q = QuestionOut.parse({
      skill_key: "loops", type: "mcq", difficulty: "easy", prompt: "What prints?",
      options: ["10 20 30", "0 1 2", "1 2 3"], correct_option: "B",
      distractor_tags: [
        { option: "10 20 30", code: "Value As Index", suspected_skill_key: "list-indexing", note: "value used as position" },
        { option: 7, code: "x", suspected_skill_key: null, note: "out of range" },
      ],
      rubric: [], hint: "positions", explanation: "range gives indexes",
    });
    expect(q.correct_option).toBe(1);
    expect(q.distractor_tags).toEqual([{ option: 0, code: "value_as_index", suspected_skill_key: "list-indexing", note: "value used as position" }]);
  });
});

describe("question schema synonyms", () => {
  it("accepts common type names and fills a missing explanation from the hint", async () => {
    const { QuestionOut } = await import("@/lib/ai/schemas");
    const q = QuestionOut.parse({
      skill_key: "loops", type: "multiple_choice", difficulty: "Easy", question: "Pick one",
      options: ["a", "b", "c"], correct_answer: 2, hint: "think", rubric: [],
    });
    expect([q.type, q.prompt, q.correct_option, q.difficulty, q.explanation]).toEqual(["mcq", "Pick one", 2, "easy", "think"]);
    const s = QuestionOut.parse({ skill_key: "loops", type: "short_answer", prompt: "Explain", rubric: ["mentions range"], hint: "h", explanation: "e", difficulty: "hard" });
    expect([s.type, s.options, s.distractor_tags]).toEqual(["short", null, []]);
  });
});

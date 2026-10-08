// End-to-end learner journey through the real services, using the local demo
// store and fixture content (no network). Covers: onboarding, two-batch
// diagnostic, resources, first lesson, a repeated indexing mistake in loop
// practice, the targeted check, remediation insertion, follow-up, duplicate
// submissions and cross-user isolation.
import { beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.SKILLFORGE_DATA_DIR = mkdtempSync(path.join(tmpdir(), "sf-test-"));
process.env.SKILLFORGE_FIXTURE_MODE = "1";
delete process.env.GEMINI_API_KEY;
delete process.env.TAVILY_API_KEY;

type Mod = typeof import("@/lib/services/learning");
let L: Mod;
let S: typeof import("@/lib/services/snapshot");
let D: typeof import("@/lib/db/store");

beforeAll(async () => {
  D = await import("@/lib/db/store");
  L = await import("@/lib/services/learning");
  S = await import("@/lib/services/snapshot");
});

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

async function answerAll(store: ReturnType<typeof D.localStore>, courseId: string, groupId: string, pick: (q: { prompt: string; options: string[] | null; type: string }) => number | string) {
  const snap = await S.loadSnapshot(store, courseId);
  const qs = snap.questions.filter((q) => q.group_id === groupId);
  return L.submitAssessment(
    store,
    courseId,
    groupId,
    qs.map((q) => {
      const v = pick(q);
      return typeof v === "number" ? { question_id: q.id, option: v } : { question_id: q.id, text: v };
    }),
    `k-${groupId}`,
  );
}

describe("learner journey (fixture content, local store)", () => {
  it("goes from goal to remediation and back, with persistence and isolation", async () => {
    const store = D.localStore(A);
    const created = await L.startCourse(store, {
      goal: "Learn Python for data analysis. I know some basics and can study 30 minutes a day.",
      experience: "some",
      dailyMinutes: 30,
      format: "examples",
      targetDate: null,
      clarification: null,
    });
    expect(created.status).toBe("created");
    const courseId = (created as { courseId: string }).courseId;

    expect(await L.advanceSetup(store, courseId)).toBe("diagnostic_1");
    let snap = await S.loadSnapshot(store, courseId);
    expect(snap.skills.length).toBeGreaterThanOrEqual(12);
    const skillIds = snap.skills.map((s) => s.id);

    // diagnostic batch 1: right on variables/lists, wrong on indexing
    await L.advanceSetup(store, courseId);
    snap = await S.loadSnapshot(store, courseId);
    const d1 = snap.questions.filter((q) => q.group_kind === "diagnostic_1");
    expect(d1.length).toBe(4);
    await answerAll(store, courseId, d1[0].group_id, (q) =>
      q.type === "short" ? "The % operator gives the remainder" : q.prompt.includes("temps[1]") ? 0 : 1,
    );
    expect((await S.loadSnapshot(store, courseId)).course.state.setup_stage).toBe("diagnostic_2");

    await L.advanceSetup(store, courseId);
    snap = await S.loadSnapshot(store, courseId);
    const d2 = snap.questions.filter((q) => q.group_kind === "diagnostic_2");
    expect(d2.length).toBeGreaterThanOrEqual(2);
    await answerAll(store, courseId, d2[0].group_id, () => 1);
    expect(await L.advanceSetup(store, courseId)).toBe("lesson");
    expect(await L.advanceSetup(store, courseId)).toBe("done");

    snap = await S.loadSnapshot(store, courseId);
    expect(snap.course.status).toBe("active");
    expect(snap.resources.every((r) => r.origin === "curated" && r.url.startsWith("https://"))).toBe(true);
    // untested skills stay unassessed
    expect(snap.mastery.filter((m) => m.score === null).length).toBeGreaterThan(5);

    // jump to loops (learner override keeps the demo short) and make the indexing mistake twice
    const loops = snap.skills.find((s) => s.key === "loops")!;
    const indexing = snap.skills.find((s) => s.key === "list-indexing")!;
    await L.overrideUnlock(store, courseId, loops.id);
    const lesson = await L.ensureLesson(store, courseId, loops.id);
    expect(lesson.source_keys.every((k) => snap.resources.some((r) => r.source_key === k))).toBe(true);
    await L.markLesson(store, courseId, lesson.id, "start");
    snap = await S.loadSnapshot(store, courseId);
    const practice = snap.questions.filter((q) => q.group_id === lesson.practice_group_id);
    const pr = await answerAll(store, courseId, lesson.practice_group_id, (q) =>
      q.type === "short" ? "for name in names: print(name)" : q.prompt.includes("range(len(nums))") ? 0 : q.prompt.includes("words[w]") ? 0 : 0,
    );
    expect(pr.outcome).toMatch(/check/i);
    expect(practice.length).toBeGreaterThanOrEqual(3);

    // duplicate submission is ignored
    const again = await answerAll(store, courseId, lesson.practice_group_id, () => 1);
    expect(again.duplicate).toBe(true);
    snap = await S.loadSnapshot(store, courseId);
    expect(snap.attempts.filter((a) => a.group_id === lesson.practice_group_id).length).toBe(practice.length);
    const check = snap.course.state.pending_check!;
    expect(check.suspected_skill_id).toBe(indexing.id);
    const indexingBefore = snap.mastery.find((m) => m.skill_id === indexing.id)!;

    // fail the targeted check: remediation is inserted, graph version bumps
    const versionBefore = snap.course.graph_version;
    await answerAll(store, courseId, check.group_id, () => 3);
    snap = await S.loadSnapshot(store, courseId);
    expect(snap.course.graph_version).toBe(versionBefore + 1);
    const remediation = snap.skills.filter((s) => s.kind === "remediation");
    expect(remediation.length).toBe(1);
    expect(snap.edges.some((e) => e.prerequisite_id === remediation[0].id && e.dependent_id === loops.id)).toBe(true);
    expect(snap.skills.find((s) => s.id === loops.id)!.difficulty).toBe("simplified");
    expect(snap.mastery.find((m) => m.skill_id === indexing.id)!.evidence_count).toBe(indexingBefore.evidence_count + 2);
    expect(snap.adaptations.some((e) => e.kind === "remediation_inserted")).toBe(true);
    // stable ids: nothing from the original graph was recreated
    for (const sid of skillIds) expect(snap.skills.some((s) => s.id === sid)).toBe(true);
    let views = S.skillViews(snap);
    // loops now waits on the review (shown as unmet), and the review is the next action
    expect(views.get(loops.id)!.unmet).toContain(remediation[0].title);
    expect(S.nextAction(snap, views).skillId).toBe(remediation[0].id);

    // remediation lesson + follow-up answered correctly resolves the review
    const rl = await L.ensureLesson(store, courseId, remediation[0].id);
    snap = await S.loadSnapshot(store, courseId);
    const keys = await store.questionKeys(courseId, snap.questions.filter((q) => q.group_id === rl.practice_group_id).map((q) => q.id));
    const correct = new Map(keys.map((k) => [k.question_id, k.correct_option]));
    const fq = snap.questions.filter((q) => q.group_id === rl.practice_group_id);
    const fr = await L.submitAssessment(
      store,
      courseId,
      rl.practice_group_id,
      fq.map((q) => (q.type === "mcq" ? { question_id: q.id, option: correct.get(q.id)! } : { question_id: q.id, text: "the index is the position counting from 0; the value is what is stored" })),
      "k-follow",
    );
    expect(fr.outcome).toMatch(/passed/i);
    snap = await S.loadSnapshot(store, courseId);
    views = S.skillViews(snap);
    expect(views.get(remediation[0].id)!.remediation).toBe("resolved");
    expect(views.get(loops.id)!.unmet).not.toContain(remediation[0].title);

    // the simplified loops lesson is a new version; the old one is kept
    const v2 = await L.ensureLesson(store, courseId, loops.id);
    expect(v2.version).toBe(2);
    expect(v2.difficulty).toBe("simplified");

    // dashboard numbers come from rows
    const stats = S.dashboardStats(snap, views);
    expect(stats.answers).toBe(snap.attempts.length);
    expect(stats.mastered).toBe(0);

    // a second account sees nothing and cannot touch the first account's course
    const other = D.localStore(B);
    expect(await other.select("skills", { course_id: courseId })).toEqual([]);
    await expect(S.loadSnapshot(other, courseId)).rejects.toThrow(/not found/i);
    await expect(other.commit(courseId, {})).rejects.toThrow(/not found/i);
    await expect(other.questionKeys(courseId, keys.map((k) => k.question_id))).resolves.toEqual([]);
  });
});

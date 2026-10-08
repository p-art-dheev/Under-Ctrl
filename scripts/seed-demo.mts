// Seeds a demo learner so the dashboard has real rows to show.
//
//   npm run seed
//
// Uses the same services as the app. Content comes from the labeled sample
// (fixture) course so seeding is fast, free and repeatable; the course is
// marked as sample content in the UI. The learner finishes the diagnostic and
// the first lesson; the presenter then makes the indexing mistake live
// (see docs/demo-script.md).
//
// Local mode (no Supabase URL in .env): writes to .data/.
// Supabase mode: needs SUPABASE_SERVICE_ROLE_KEY and SEED_PASSWORD, creates a
// confirmed user through the admin API and writes through sf_commit.
import { existsSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

if (existsSync(".env")) process.loadEnvFile(".env");
process.env.SKILLFORGE_FIXTURE_MODE = "1";

const email = (process.env.SEED_EMAIL || "demo@skillforge.test").toLowerCase();
const password = process.env.SEED_PASSWORD || "";

const { dataMode, localStore, supabaseAdmin, supabaseStore, withLocalDb } = await import("@/lib/db/store");
const L = await import("@/lib/services/learning");
const S = await import("@/lib/services/snapshot");

async function demoStore() {
  if (dataMode() === "local") {
    const pw = password || "skillforge-demo";
    const id = await withLocalDb((db) => {
      const existing = db.users.find((u) => u.email === email);
      if (existing) return existing.id;
      const salt = randomBytes(16).toString("hex");
      const user = { id: crypto.randomUUID(), email, salt, hash: scryptSync(pw, salt, 32).toString("hex"), created_at: new Date().toISOString() };
      db.users.push(user);
      return user.id;
    }, true);
    return { store: localStore(id), pw };
  }
  if (password.length < 8) throw new Error("Set SEED_PASSWORD (8+ characters) to seed a Supabase project.");
  const admin = supabaseAdmin();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  let id = created.data.user?.id;
  if (!id) {
    // already exists: find it
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    id = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!id) throw created.error ?? new Error("Could not create the demo user.");
  }
  return { store: supabaseStore(admin, id), pw: password };
}

const { store, pw } = await demoStore();
const created = await L.startCourse(store, {
  goal: "Learn Python for data analysis. I know some basics and can study 30 minutes a day.",
  experience: "some",
  dailyMinutes: 30,
  format: "examples-first",
  targetDate: null,
  clarification: null,
});
if (created.status !== "created") throw new Error("Unexpected clarification request from sample content.");
const courseId = created.courseId;

async function answer(groupId: string, pick: (q: { prompt: string; type: string }, correct: number | null) => number | string) {
  const snap = await S.loadSnapshot(store, courseId);
  const qs = snap.questions.filter((q) => q.group_id === groupId);
  const keys = new Map((await store.questionKeys(courseId, qs.map((q) => q.id))).map((k) => [k.question_id, k.correct_option]));
  return L.submitAssessment(
    store,
    courseId,
    groupId,
    qs.map((q) => {
      const v = pick(q, keys.get(q.id) ?? null);
      return typeof v === "number" ? { question_id: q.id, option: v } : { question_id: q.id, text: v };
    }),
    `seed-${groupId}`,
  );
}

// diagnostic: mostly right, so the later loops mistake is what reveals the gap
await L.advanceSetup(store, courseId);
await L.advanceSetup(store, courseId);
let snap = await S.loadSnapshot(store, courseId);
const d1 = snap.questions.find((q) => q.group_kind === "diagnostic_1")!.group_id;
await answer(d1, (q, c) => (q.type === "short" ? "The % operator gives the remainder of a division" : c ?? 0));
await L.advanceSetup(store, courseId);
snap = await S.loadSnapshot(store, courseId);
const d2 = snap.questions.find((q) => q.group_kind === "diagnostic_2")!.group_id;
await answer(d2, (q, c) => (q.type === "short" ? "a list keeps items in order and you can change it" : c ?? 0));
while ((await L.advanceSetup(store, courseId)) !== "done");

// first lesson: read it and answer its practice correctly
snap = await S.loadSnapshot(store, courseId);
const views = S.skillViews(snap);
const first = S.nextAction(snap, views).skillId;
if (first) {
  const lesson = await L.ensureLesson(store, courseId, first);
  await L.markLesson(store, courseId, lesson.id, "start");
  await answer(lesson.practice_group_id, (q, c) => (q.type === "short" ? "use a for loop over the items and keep a running total" : c ?? 0));
  await L.markLesson(store, courseId, lesson.id, "complete");
}

console.log(`Seeded ${dataMode()} demo learner: ${email} / ${dataMode() === "local" && !password ? pw : "(your SEED_PASSWORD)"}`);

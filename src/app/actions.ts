"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, signIn, signOut, signUp } from "@/lib/auth";
import { smokeCheck } from "@/lib/ai/gemma";
import {
  addPractice,
  advanceSetup,
  askTutor,
  markLesson,
  overrideUnlock,
  postponeRemediation,
  requestHint,
  setActiveCourse,
  startCourse,
  submitAssessment,
  UserError,
  type AnswerInput,
} from "@/lib/services/learning";
import { NotFound } from "@/lib/services/snapshot";
import { ConflictError } from "@/lib/db/store";
import type { TutorMode } from "@/lib/ai/tasks";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Turn any failure into a message the learner can act on; details go to the server log. */
async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw err;
    console.error(err);
    if (err instanceof UserError || err instanceof NotFound) return { ok: false, error: err.message };
    if (err instanceof ConflictError) return { ok: false, error: "Your course changed in another tab. Reload and try again." };
    const msg = (err as Error).message ?? "Unknown error";
    if (/Gemma|Gemini/.test(msg)) return { ok: false, error: `The AI service failed: ${msg}. Nothing was saved; you can retry.` };
    return { ok: false, error: "Something went wrong. Nothing was lost; please retry." };
  }
}

// ------------------------------------------------------------------ auth
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function signUpAction(_: unknown, form: FormData): Promise<ActionResult | undefined> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!emailOk(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const res = await signUp(email, password, origin);
  if (!res.ok) return res;
  redirect(res.needsConfirmation ? `/check-email?email=${encodeURIComponent(email)}` : "/onboarding");
}

export async function signInAction(_: unknown, form: FormData): Promise<ActionResult | undefined> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!emailOk(email) || !password) return { ok: false, error: "Enter your email and password." };
  const res = await signIn(email, password);
  if (!res.ok) return res;
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}

// ------------------------------------------------------------------ onboarding and setup
export async function onboardingAction(_: unknown, form: FormData): Promise<ActionResult<{ clarify?: string }> | undefined> {
  const { store } = await requireUser();
  const goal = String(form.get("goal") ?? "").trim();
  const minutes = Number(form.get("minutes"));
  const experience = String(form.get("experience") ?? "");
  const format = String(form.get("format") ?? "");
  const target = String(form.get("target") ?? "").trim();
  const clarification = String(form.get("clarification") ?? "").trim() || null;
  if (goal.length < 3 || goal.length > 1000) return { ok: false, error: "Describe your goal in a sentence or two." };
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 480) return { ok: false, error: "Minutes per day must be between 5 and 480." };
  if (!["none", "some", "comfortable"].includes(experience)) return { ok: false, error: "Choose your experience level." };
  if (!["step-by-step", "examples-first", "concise"].includes(format)) return { ok: false, error: "Choose an explanation style." };
  if (target && !/^\d{4}-\d{2}-\d{2}$/.test(target)) return { ok: false, error: "Use a valid target date." };
  const res = await attempt(() =>
    startCourse(store, { goal, experience, dailyMinutes: Math.round(minutes), format, targetDate: target || null, clarification }),
  );
  if (!res.ok) return res;
  if (res.data.status === "clarify") return { ok: true, data: { clarify: res.data.question } };
  redirect("/setup");
}

export async function advanceSetupAction(courseId: string) {
  const { store } = await requireUser();
  return attempt(() => advanceSetup(store, courseId));
}

export async function switchCourseAction(courseId: string) {
  const { store } = await requireUser();
  await setActiveCourse(store, courseId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ------------------------------------------------------------------ learning
export async function submitAction(courseId: string, groupId: string, answers: AnswerInput[], key: string) {
  const { store } = await requireUser();
  const res = await attempt(() => submitAssessment(store, courseId, groupId, answers, key));
  revalidatePath("/", "layout");
  return res;
}

export async function hintAction(courseId: string, questionId: string) {
  const { store } = await requireUser();
  return attempt(() => requestHint(store, courseId, questionId));
}

export async function tutorAction(courseId: string, skillId: string, mode: TutorMode, message: string) {
  const { store } = await requireUser();
  const res = await attempt(() => askTutor(store, courseId, skillId, mode, message));
  revalidatePath(`/learn/${skillId}`);
  return res;
}

export async function lessonAction(courseId: string, lessonId: string, action: "start" | "complete" | "tick") {
  const { store } = await requireUser();
  const res = await attempt(() => markLesson(store, courseId, lessonId, action));
  if (action !== "tick") revalidatePath("/", "layout");
  return res;
}

export async function practiceAction(courseId: string, skillId: string) {
  const { store } = await requireUser();
  const res = await attempt(() => addPractice(store, courseId, skillId));
  revalidatePath(`/learn/${skillId}`);
  return res;
}

export async function postponeAction(courseId: string, remediationId: string) {
  const { store } = await requireUser();
  const res = await attempt(() => postponeRemediation(store, courseId, remediationId));
  revalidatePath("/", "layout");
  return res;
}

export async function unlockAction(courseId: string, skillId: string) {
  const { store } = await requireUser();
  const res = await attempt(() => overrideUnlock(store, courseId, skillId));
  revalidatePath("/", "layout");
  return res;
}

export async function smokeAction() {
  await requireUser();
  return smokeCheck();
}

// Shared loader for app pages: signed-in user, active course and its snapshot.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { activeCourseId } from "@/lib/services/learning";
import { loadSnapshot } from "@/lib/services/snapshot";

export async function courseContext(opts: { allowSetup?: boolean } = {}) {
  const { user, store } = await requireUser();
  const courseId = await activeCourseId(store);
  if (!courseId) redirect("/onboarding");
  const snap = await loadSnapshot(store, courseId);
  if (snap.course.status === "setup" && !opts.allowSetup) redirect("/setup");
  return { user, store, snap };
}

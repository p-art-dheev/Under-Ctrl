"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, SkipForward, Unlock } from "lucide-react";
import { lessonAction, postponeAction, practiceAction, unlockAction } from "@/app/actions";
import { btn, btnGhost } from "@/components/ui";

/** Records that the lesson was opened and counts visible minutes (active time, capped server-side). */
export function LessonTracker({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  useEffect(() => {
    void lessonAction(courseId, lessonId, "start");
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void lessonAction(courseId, lessonId, "tick");
    }, 60_000);
    return () => clearInterval(t);
  }, [courseId, lessonId]);
  return null;
}

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
      router.refresh();
    });
  return { pending, error, run };
}

export function CompleteLessonButton({ courseId, lessonId, completed }: { courseId: string; lessonId: string; completed: boolean }) {
  const { pending, error, run } = useRun();
  if (completed) return <span className="inline-flex items-center gap-1.5 text-sm text-mastered"><CheckCircle2 size={16} aria-hidden /> Activity completed</span>;
  return (
    <div>
      <button className={btnGhost} disabled={pending} onClick={() => run(() => lessonAction(courseId, lessonId, "complete"))}>
        <CheckCircle2 size={16} aria-hidden /> Mark activity complete
      </button>
      <p className="mt-1 text-xs text-muted">Completing the activity does not change mastery. Only answers do.</p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function MorePracticeButton({ courseId, skillId }: { courseId: string; skillId: string }) {
  const { pending, error, run } = useRun();
  return (
    <div>
      <button className={btnGhost} disabled={pending} onClick={() => run(() => practiceAction(courseId, skillId))}>
        <Plus size={16} aria-hidden /> {pending ? "Writing questions…" : "New practice questions"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function PostponeButton({ courseId, remediationId }: { courseId: string; remediationId: string }) {
  const { pending, run } = useRun();
  return (
    <button className={btnGhost} disabled={pending} onClick={() => run(() => postponeAction(courseId, remediationId))}>
      <SkipForward size={16} aria-hidden /> Postpone this review
    </button>
  );
}

export function UnlockButton({ courseId, skillId }: { courseId: string; skillId: string }) {
  const { pending, run } = useRun();
  return (
    <button className={btn} disabled={pending} onClick={() => run(() => unlockAction(courseId, skillId))}>
      <Unlock size={16} aria-hidden /> Unlock anyway
    </button>
  );
}

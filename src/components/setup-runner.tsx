"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { advanceSetupAction } from "@/app/actions";
import { btn } from "@/components/ui";

/** Drives the generation steps of course setup one request at a time, so each step can be retried. */
const WORKING: Record<string, string[]> = {
  graph: ["Reading your goal", "Choosing the skills it needs", "Ordering prerequisites", "Checking the graph has no cycles"],
  diagnostic_1: ["Picking skills worth testing first", "Writing diagnostic questions", "Checking answer keys"],
  diagnostic_2: ["Looking at what part 1 left uncertain", "Writing follow-up questions"],
  resources: ["Searching for sources", "Ranking them for your goal", "Recording where each one came from"],
  lesson: ["Reading the sources for your first skill", "Writing the lesson and a worked example", "Preparing practice questions"],
};

export function SetupRunner({ courseId, runnable, stage }: { courseId: string; runnable: boolean; stage: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const lines = WORKING[stage] ?? ["Working"];
  const line = lines[Math.min(Math.floor(seconds / 6), lines.length - 1)];

  const run = async () => {
    setBusy(true);
    setSeconds(0);
    setError(null);
    const res = await advanceSetupAction(courseId);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  };

  useEffect(() => {
    if (runnable && !started.current) {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runnable]);

  if (!runnable) return null;
  return (
    <div className="space-y-3" aria-live="polite">
      {busy ? (
        <div className="sf-fade space-y-2">
          <div className="sf-skeleton h-4 w-2/3" />
          <div className="sf-skeleton h-4 w-1/2" />
          <div className="sf-skeleton h-4 w-3/5" />
          <p className="flex items-center justify-between gap-3 text-sm text-muted">
            <span key={line} className="sf-fade">{line}…</span>
            <span className="tabular-nums text-xs">{seconds}s</span>
          </p>
          {seconds > 20 ? <p className="sf-fade text-xs text-muted">Live generation can take up to a minute. You can leave this page; setup resumes where it stopped.</p> : null}
        </div>
      ) : null}
      {error ? (
        <div className="sf-enter rounded-xl bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>{error}</p>
          <button className={`${btn} mt-3`} onClick={run}><RefreshCw size={14} aria-hidden /> Retry this step</button>
        </div>
      ) : null}
    </div>
  );
}

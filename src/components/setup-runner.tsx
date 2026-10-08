"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { advanceSetupAction } from "@/app/actions";
import { btn } from "@/components/ui";

/** Drives the generation steps of course setup one request at a time, so each step can be retried. */
export function SetupRunner({ courseId, runnable }: { courseId: string; runnable: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const run = async () => {
    setBusy(true);
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
        <div className="space-y-2">
          <div className="sf-skeleton h-4 w-2/3" />
          <div className="sf-skeleton h-4 w-1/2" />
          <div className="sf-skeleton h-4 w-3/5" />
          <p className="text-sm text-muted">Working… live generation can take up to a minute.</p>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>{error}</p>
          <button className={`${btn} mt-3`} onClick={run}><RefreshCw size={14} aria-hidden /> Retry this step</button>
        </div>
      ) : null}
    </div>
  );
}

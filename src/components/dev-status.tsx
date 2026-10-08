"use client";

import { useState, useTransition } from "react";
import { smokeAction } from "@/app/actions";
import { btnGhost } from "@/components/ui";
import type { LiveStatus } from "@/lib/ai/gemma";

export function SmokeButton({ initial }: { initial: LiveStatus | null }) {
  const [status, setStatus] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div>
      <button className={btnGhost} disabled={pending} onClick={() => start(async () => setStatus(await smokeAction()))}>
        {pending ? "Calling Gemma…" : "Run live Gemma check"}
      </button>
      {status ? (
        <p className={`mt-2 text-sm ${status.ok ? "text-mastered" : "text-danger"}`}>
          {status.ok ? "Live call succeeded" : `Live call failed: ${status.error}`} ({status.model}, {status.task}, {new Date(status.at).toLocaleTimeString()})
        </p>
      ) : <p className="mt-2 text-sm text-muted">No live call made since the server started.</p>}
    </div>
  );
}

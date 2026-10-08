import { FlaskConical, HardDrive } from "lucide-react";
import { runtimeInfo } from "@/lib/runtime";

/** Always-visible labels for fixture content and the local demo store. */
export function ModeBanner() {
  const { ai, data } = runtimeInfo();
  if (!ai.fixture && data === "supabase") return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-b border-ember/15 bg-ember-soft/70 px-4 py-1.5 text-center text-xs text-ember" role="status">
      {ai.fixture ? (
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical size={14} aria-hidden />
          <strong>Fixture mode:</strong> lessons and questions are hand-written demo content, not Gemma ({ai.fixtureReason}).
        </span>
      ) : null}
      {data === "local" ? (
        <span className="inline-flex items-center gap-1.5">
          <HardDrive size={14} aria-hidden />
          <strong>Local demo store:</strong> Supabase is not configured; data is saved in .data/ on this machine.
        </span>
      ) : null}
    </div>
  );
}

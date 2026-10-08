import { GitBranch, GitCommitHorizontal, SearchCheck, SkipForward, Sparkles } from "lucide-react";
import type { AdaptationEvent } from "@/lib/types";

const ICON: Record<string, typeof Sparkles> = {
  graph_created: GitCommitHorizontal,
  check_requested: SearchCheck,
  check_passed: SearchCheck,
  remediation_inserted: GitBranch,
  remediation_reused: GitBranch,
  remediation_postponed: SkipForward,
  followup_passed: Sparkles,
  followup_missed: SearchCheck,
};
const LABEL: Record<string, string> = {
  graph_created: "Course created",
  check_requested: "Quick check requested",
  check_passed: "Check passed: no change",
  remediation_inserted: "Your path changed",
  remediation_reused: "Linked to an open review",
  remediation_postponed: "Review postponed",
  followup_passed: "Review resolved",
  followup_missed: "Review still open",
};

/** The "Your path changed" timeline: every adaptation with its reason and evidence count. */
export function Timeline({ events, limit }: { events: AdaptationEvent[]; limit?: number }) {
  const list = [...events].reverse().slice(0, limit ?? events.length);
  if (!list.length) return <p className="text-sm text-muted">No changes yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {list.map((e) => {
        const Icon = ICON[e.kind] ?? Sparkles;
        const strong = e.kind === "remediation_inserted";
        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[29px] grid h-6 w-6 place-items-center rounded-full border ${strong ? "border-review bg-review-soft text-review" : "border-line bg-surface text-muted"}`}>
              <Icon size={13} aria-hidden />
            </span>
            <p className="text-sm font-medium">{LABEL[e.kind] ?? e.kind}{e.to_version !== e.from_version ? <span className="ml-2 text-xs font-normal text-muted">graph v{e.from_version} → v{e.to_version}</span> : null}</p>
            <p className="text-sm text-muted">{e.reason}</p>
            <p className="mt-0.5 text-xs text-muted">
              {new Date(e.created_at).toLocaleString()}{e.evidence_attempt_ids.length ? ` · based on ${e.evidence_attempt_ids.length} answer${e.evidence_attempt_ids.length === 1 ? "" : "s"}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

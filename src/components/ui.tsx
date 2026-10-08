import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed, Lock, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import type { DisplayState } from "@/lib/types";

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";
export const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export const STATE_META: Record<DisplayState, { label: string; cls: string; icon: typeof Lock }> = {
  locked: { label: "Locked", cls: "bg-locked-soft text-locked border-locked/30", icon: Lock },
  available: { label: "Available", cls: "bg-available-soft text-available border-available/30", icon: PlayCircle },
  learning: { label: "Learning", cls: "bg-learning-soft text-learning border-learning/30", icon: Sparkles },
  needs_review: { label: "Needs review", cls: "bg-review-soft text-review border-review/30", icon: RotateCcw },
  mastered: { label: "Mastered", cls: "bg-mastered-soft text-mastered border-mastered/30", icon: CheckCircle2 },
};

export function StateBadge({ state, label }: { state: DisplayState; label?: string }) {
  const m = STATE_META[state];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      <Icon size={12} aria-hidden /> {label ?? m.label}
    </span>
  );
}

export function UnassessedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-muted">
      <CircleDashed size={12} aria-hidden /> Unassessed
    </span>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ember" | "brand" }) {
  const cls = tone === "ember" ? "bg-ember-soft text-ember" : tone === "brand" ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function MasteryBar({ score }: { score: number | null }) {
  if (score === null) return <div className="h-1.5 w-full rounded-full border border-dashed border-line" title="No evidence yet" />;
  const pct = Math.round(score * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Mastery estimate">
      <div className={`h-full rounded-full ${score >= 0.8 ? "bg-mastered" : score >= 0.65 ? "bg-learning" : "bg-review"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

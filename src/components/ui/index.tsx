import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed, Lock, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { inputClass } from "./input";
import { Card as ShadCard } from "./card";

export { Button, buttonVariants } from "./button";
export { Badge, badgeVariants } from "./badge";
export { CardDescription, CardHeader, CardTitle } from "./card";
export { Input, Textarea } from "./input";
export { Label } from "./label";
export { Tooltip } from "./tooltip";

// Shared building blocks. The primitives are shadcn-style components in this
// folder; the helpers below keep page code short.
export const btn = buttonVariants();
export const btnGhost = buttonVariants({ variant: "outline" });
export const btnSoft = buttonVariants({ variant: "secondary" });
export const input = inputClass;

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ShadCard className={className}>{children}</ShadCard>;
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow}</p> : null}
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
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
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", m.cls)}>
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
      <div className={`sf-bar h-full rounded-full ${score >= 0.8 ? "bg-mastered" : score >= 0.65 ? "bg-learning" : "bg-review"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

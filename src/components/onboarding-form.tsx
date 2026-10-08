"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Calendar, Clock3, Footprints, Layers, Lightbulb, ListOrdered, Loader2, Rocket, Sprout, Zap, type LucideIcon } from "lucide-react";
import { onboardingAction } from "@/app/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Learn Python for data analysis. I know some basics and can study 30 minutes a day.",
  "Understand SQL well enough to answer business questions from a sales database.",
  "Get comfortable with probability for a statistics course next semester.",
];

const EXPERIENCE: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "none", label: "New to this", hint: "Starting from zero", icon: Sprout },
  { value: "some", label: "Some basics", hint: "Seen it before", icon: Footprints },
  { value: "comfortable", label: "Fairly comfortable", hint: "Filling gaps", icon: Rocket },
];

const FORMAT: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "examples-first", label: "Examples first", hint: "Show, then explain", icon: Layers },
  { value: "step-by-step", label: "Step by step", hint: "Small, ordered steps", icon: ListOrdered },
  { value: "concise", label: "Short and concise", hint: "Just the essentials", icon: Zap },
];

const MINUTES = [15, 30, 45, 60];

function Choice({ name, options, value, onChange }: { name: string; options: typeof EXPERIENCE; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
      {options.map(({ value: v, label, hint, icon: Icon }) => (
        <label
          key={v}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:border-brand/50",
            value === v ? "border-brand bg-brand-soft/60 ring-2 ring-brand/15" : "border-line bg-surface",
          )}
        >
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", value === v ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted")}>
            <Icon size={16} aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-muted">{hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function OnboardingForm() {
  const [state, run, pending] = useActionState(onboardingAction, undefined);
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("some");
  const [format, setFormat] = useState("examples-first");
  const [minutes, setMinutes] = useState(30);
  const clarify = state?.ok ? state.data.clarify : undefined;
  return (
    <form action={run} className="space-y-7">
      <div className="space-y-2">
        <Label htmlFor="goal" className="text-base">What do you want to learn, and why?</Label>
        <Textarea id="goal" name="goal" rows={3} required minLength={3} maxLength={1000} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Describe the outcome you want, in your own words" className="text-[15px]" />
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="flex items-center gap-1 text-xs text-muted"><Lightbulb size={13} aria-hidden /> Try:</span>
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} onClick={() => setGoal(ex)} className="rounded-full border border-line bg-surface px-3 py-1 text-left text-xs text-muted transition-colors hover:border-brand/50 hover:bg-brand-soft hover:text-brand">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {clarify ? (
        <div className="sf-enter rounded-xl border border-brand/30 bg-brand-soft p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-brand"><Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden /> {clarify}</p>
          <Input name="clarification" required className="mt-3" placeholder="Your answer" aria-label="Clarification" />
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Experience so far</legend>
        <Choice name="experience" options={EXPERIENCE} value={experience} onChange={setExperience} />
        <p className="text-xs text-muted">Context only; the diagnostic measures what you actually know.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">How should lessons explain things?</legend>
        <Choice name="format" options={FORMAT} value={format} onChange={setFormat} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minutes"><Clock3 size={14} className="text-muted" aria-hidden /> Minutes per day</Label>
          <div className="flex gap-2">
            {MINUTES.map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={cn("h-10 flex-1 rounded-lg border text-sm transition-colors", minutes === m ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-surface text-muted hover:border-brand/50")}>
                {m}
              </button>
            ))}
            <Input id="minutes" name="minutes" type="number" min={5} max={480} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-20" aria-label="Minutes per day" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target"><Calendar size={14} className="text-muted" aria-hidden /> Target date <span className="font-normal text-muted">(optional)</span></Label>
          <Input id="target" name="target" type="date" />
        </div>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="sf-enter flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden /> {state.error}
        </p>
      ) : null}
      <Button size="lg" disabled={pending} className="sf-shine-auto">
        {pending ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Reading your goal…</> : <>{clarify ? "Continue" : "Build my course"} <ArrowRight size={16} aria-hidden /></>}
      </Button>
    </form>
  );
}

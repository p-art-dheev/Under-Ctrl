"use client";

import { useActionState, useState } from "react";
import { Lightbulb } from "lucide-react";
import { onboardingAction } from "@/app/actions";
import { btn, input } from "@/components/ui";

const EXAMPLES = [
  "Learn Python for data analysis. I know some basics and can study 30 minutes a day.",
  "Understand SQL well enough to answer business questions from a sales database.",
  "Get comfortable with probability for a statistics course next semester.",
];

export function OnboardingForm() {
  const [state, run, pending] = useActionState(onboardingAction, undefined);
  const [goal, setGoal] = useState("");
  const clarify = state?.ok ? state.data.clarify : undefined;
  return (
    <form action={run} className="space-y-6">
      <div>
        <label htmlFor="goal" className="mb-1 block font-medium">What do you want to learn, and why?</label>
        <textarea id="goal" name="goal" rows={3} required minLength={3} maxLength={1000} value={goal} onChange={(e) => setGoal(e.target.value)} className={input} placeholder="Describe the outcome you want" />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} onClick={() => setGoal(ex)} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-left text-xs text-muted hover:border-brand hover:text-ink">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {clarify ? (
        <div className="rounded-xl border border-brand/30 bg-brand-soft p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-brand"><Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden /> {clarify}</p>
          <input name="clarification" required className={`${input} mt-3`} placeholder="Your answer" aria-label="Clarification" />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Experience so far</legend>
          <select name="experience" defaultValue="some" className={input}>
            <option value="none">New to this</option>
            <option value="some">I know some basics</option>
            <option value="comfortable">Fairly comfortable</option>
          </select>
          <p className="mt-1 text-xs text-muted">Used as context only; the diagnostic measures what you know.</p>
        </fieldset>
        <div>
          <label htmlFor="minutes" className="mb-1 block text-sm font-medium">Minutes per day</label>
          <input id="minutes" name="minutes" type="number" min={5} max={480} defaultValue={30} className={input} />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Preferred explanations</legend>
          <select name="format" defaultValue="examples-first" className={input}>
            <option value="examples-first">Examples first</option>
            <option value="step-by-step">Step by step</option>
            <option value="concise">Short and concise</option>
          </select>
        </fieldset>
        <div>
          <label htmlFor="target" className="mb-1 block text-sm font-medium">Target date <span className="font-normal text-muted">(optional)</span></label>
          <input id="target" name="target" type="date" className={input} />
        </div>
      </div>

      {state && !state.ok ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      <button className={btn} disabled={pending}>{pending ? "Reading your goal…" : clarify ? "Continue" : "Build my course"}</button>
    </form>
  );
}

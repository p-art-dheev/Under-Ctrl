"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HelpCircle, Lightbulb, XCircle } from "lucide-react";
import { hintAction, submitAction } from "@/app/actions";
import { Markdown } from "@/components/markdown";
import { btn, btnGhost, input } from "@/components/ui";
import type { GradedResult } from "@/lib/services/learning";

export interface PublicQuestion {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  options: string[] | null;
  allow_hints: boolean;
  skillTitle: string;
}

interface Props {
  courseId: string;
  groupId: string;
  questions: PublicQuestion[];
  /** results already saved for this group (shown read-only) */
  saved?: GradedResult[];
  savedAnswers?: Record<string, { option?: number; text?: string }>;
  submitLabel?: string;
  afterSubmit?: "refresh" | { href: string; label: string };
}

export function QuestionForm({ courseId, groupId, questions, saved, savedAnswers, submitLabel = "Submit answers", afterSubmit = "refresh" }: Props) {
  const router = useRouter();
  const [key] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, { option?: number; text?: string; dont?: boolean; confidence?: number }>>(() =>
    Object.fromEntries(Object.entries(savedAnswers ?? {}).map(([k, v]) => [k, { ...v }])),
  );
  const [hints, setHints] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GradedResult[] | null>(saved?.length ? saved : null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = results !== null;
  const byQ = new Map((results ?? []).map((r) => [r.question_id, r]));
  const complete = questions.every((q) => (q.type === "mcq" ? answers[q.id]?.option !== undefined : (answers[q.id]?.text ?? "").trim().length > 0));

  const set = (qid: string, patch: Partial<(typeof answers)[string]>) => setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...patch } }));

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await submitAction(
        courseId,
        groupId,
        questions.map((q) => ({
          question_id: q.id,
          option: answers[q.id]?.option ?? null,
          text: answers[q.id]?.text ?? null,
          dont_understand: answers[q.id]?.dont ?? false,
          confidence: answers[q.id]?.confidence ?? null,
        })),
        key,
      );
      if (!res.ok) return setError(res.error);
      setResults(res.data.results);
      setOutcome(res.data.outcome);
      router.refresh();
    });

  const hint = (qid: string) =>
    start(async () => {
      const res = await hintAction(courseId, qid);
      if (res.ok) setHints((h) => ({ ...h, [qid]: res.data }));
      else setError(res.error);
    });

  return (
    <div className="space-y-5">
      {questions.map((q, i) => {
        const r = byQ.get(q.id);
        const a = answers[q.id] ?? {};
        return (
          <fieldset key={q.id} className="rounded-2xl border border-line bg-surface p-5" disabled={done || pending}>
            <legend className="sr-only">Question {i + 1}</legend>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
              <span>Question {i + 1} of {questions.length} · {q.skillTitle}</span>
              {r ? (
                <span className={`sf-pop inline-flex items-center gap-1 font-medium ${r.is_correct ? "text-mastered" : "text-review"}`}>
                  {r.is_correct ? <CheckCircle2 size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
                  {q.type === "short" ? `${Math.round(r.score * 100)}% of rubric` : r.is_correct ? "Correct" : "Not quite"}
                </span>
              ) : null}
            </div>
            <Markdown text={q.prompt} />
            {q.type === "mcq" ? (
              <div className="mt-3 grid gap-2">
                {q.options!.map((opt, oi) => {
                  const chosen = a.option === oi;
                  const correct = r && r.correct_option === oi;
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors duration-150 ${
                        correct ? "border-mastered bg-mastered-soft" : chosen && r ? "border-review bg-review-soft" : chosen ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"
                      }`}
                    >
                      <input type="radio" name={q.id} className="mt-0.5 accent-[var(--brand)]" checked={chosen} onChange={() => set(q.id, { option: oi })} />
                      <span className="font-mono text-[13px]">{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea className={`${input} mt-3`} rows={4} value={a.text ?? ""} onChange={(e) => set(q.id, { text: e.target.value })} placeholder="Explain in your own words, or write code" aria-label={`Answer to question ${i + 1}`} />
            )}
            {!done ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {q.allow_hints ? (
                  <button type="button" onClick={() => hint(q.id)} className="inline-flex items-center gap-1 text-brand hover:underline" disabled={Boolean(hints[q.id])}>
                    <Lightbulb size={14} aria-hidden /> {hints[q.id] ? "Hint used" : "Show a hint"}
                  </button>
                ) : null}
                <label className="inline-flex items-center gap-1.5 text-muted">
                  <input type="checkbox" checked={a.dont ?? false} onChange={(e) => set(q.id, { dont: e.target.checked })} /> <HelpCircle size={14} aria-hidden /> I don&apos;t understand this
                </label>
                <label className="inline-flex items-center gap-1.5 text-muted">
                  Confidence
                  <select className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs" value={a.confidence ?? ""} onChange={(e) => set(q.id, { confidence: e.target.value === "" ? undefined : Number(e.target.value) })}>
                    <option value="">—</option>
                    <option value="0.25">Guessing</option>
                    <option value="0.6">Fairly sure</option>
                    <option value="0.9">Sure</option>
                  </select>
                </label>
              </div>
            ) : null}
            {hints[q.id] && !done ? <p className="sf-enter mt-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Hint: {hints[q.id]} <span className="text-xs opacity-80">(using a hint reduces this answer&apos;s weight)</span></p> : null}
            {r ? (
              <div className={`sf-enter mt-3 rounded-xl px-3 py-2 text-sm ${r.is_correct ? "bg-mastered-soft" : "bg-review-soft"}`}>
                <Markdown text={r.feedback} />
              </div>
            ) : null}
          </fieldset>
        );
      })}
      {outcome ? (
        <div className="sf-enter rounded-2xl border border-brand/30 bg-brand-soft p-4 text-sm" role="status">
          <p className="font-medium text-brand">What this means for your path</p>
          <p className="mt-1">{outcome}</p>
        </div>
      ) : null}
      {error ? <p role="alert" className="sf-enter rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      {!done ? (
        <button className={btn} onClick={submit} disabled={!complete || pending}>{pending ? "Grading…" : submitLabel}</button>
      ) : afterSubmit !== "refresh" ? (
        <a href={afterSubmit.href} className={btnGhost}>{afterSubmit.label}</a>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, HelpCircle, Lightbulb, X, XCircle } from "lucide-react";
import { hintAction, submitAction } from "@/app/actions";
import { Markdown } from "@/components/markdown";
import { btn, btnGhost, input } from "@/components/ui";
import { shrinkImage, type AttachedImage } from "@/lib/client-image";
import type { GradedResult } from "@/lib/services/learning";

const MAX_PHOTOS = 3;

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
  savedAnswers?: Record<string, { option?: number; text?: string; image_count?: number; transcript?: string | null }>;
  submitLabel?: string;
  afterSubmit?: "refresh" | { href: string; label: string };
}

export function QuestionForm({ courseId, groupId, questions, saved, savedAnswers, submitLabel = "Submit answers", afterSubmit = "refresh" }: Props) {
  const router = useRouter();
  const [key] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, { option?: number; text?: string; images?: AttachedImage[]; dont?: boolean; confidence?: number }>>(() =>
    Object.fromEntries(Object.entries(savedAnswers ?? {}).map(([k, v]) => [k, { option: v.option, text: v.text }])),
  );
  const [hints, setHints] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GradedResult[] | null>(saved?.length ? saved : null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = results !== null;
  const byQ = new Map((results ?? []).map((r) => [r.question_id, r]));
  const complete = questions.every((q) => (q.type === "mcq" ? answers[q.id]?.option !== undefined : (answers[q.id]?.text ?? "").trim().length > 0 || Boolean(answers[q.id]?.images?.length)));

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
          images: answers[q.id]?.images?.map(({ mime, data }) => ({ mime, data })),
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

  const attach = async (qid: string, files: File[]) => {
    const room = MAX_PHOTOS - (answers[qid]?.images?.length ?? 0);
    if (!files.length) return;
    if (room <= 0) return setError(`You can attach up to ${MAX_PHOTOS} photos per answer.`);
    setError(null);
    try {
      const added = await Promise.all(files.slice(0, room).map(shrinkImage));
      setAnswers((a) => ({ ...a, [qid]: { ...a[qid], images: [...(a[qid]?.images ?? []), ...added] } }));
      if (files.length > room) setError(`Only the first ${MAX_PHOTOS} photos were attached.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const detach = (qid: string, index: number) => setAnswers((a) => ({ ...a, [qid]: { ...a[qid], images: a[qid]?.images?.filter((_, i) => i !== index) } }));

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
          <fieldset key={q.id} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]" disabled={done || pending}>
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
              <div className="mt-3">
                <textarea
                  className={input}
                  rows={4}
                  value={a.text ?? ""}
                  onChange={(e) => set(q.id, { text: e.target.value })}
                  onPaste={(e) => {
                    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
                    if (files.length) {
                      e.preventDefault();
                      void attach(q.id, files);
                    }
                  }}
                  placeholder="Explain in your own words, write code, or attach a photo of your working"
                  aria-label={`Answer to question ${i + 1}`}
                />
                {!done ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-brand has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                      <Camera size={14} aria-hidden /> Attach photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={(a.images?.length ?? 0) >= MAX_PHOTOS}
                        onChange={(e) => {
                          void attach(q.id, [...(e.target.files ?? [])]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted">Handwritten derivations, diagrams or code. You can also paste a screenshot.</span>
                  </div>
                ) : null}
                {a.images?.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {a.images.map((img, k) => (
                      <li key={k} className="sf-pop relative">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL thumbnail */}
                        <img src={img.preview} alt={`Attached working ${k + 1}`} className="h-20 w-20 rounded-lg border border-line object-cover" />
                        {!done ? (
                          <button type="button" onClick={() => detach(q.id, k)} aria-label={`Remove photo ${k + 1}`} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow)] hover:text-danger">
                            <X size={11} aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {done && savedAnswers?.[q.id]?.image_count ? (
                  <div className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                    <p className="font-medium">{savedAnswers[q.id].image_count} photo{savedAnswers[q.id].image_count === 1 ? "" : "s"} submitted{savedAnswers[q.id].transcript ? ", read as:" : ""}</p>
                    {savedAnswers[q.id].transcript ? <div className="mt-1 text-ink"><Markdown text={savedAnswers[q.id].transcript!} /></div> : null}
                  </div>
                ) : null}
              </div>
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

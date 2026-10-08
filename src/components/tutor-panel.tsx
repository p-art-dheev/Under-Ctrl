"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { tutorAction } from "@/app/actions";
import { Markdown } from "@/components/markdown";
import { input } from "@/components/ui";
import type { TutorMode } from "@/lib/ai/tasks";

export function TutorPanel({ courseId, skillId, messages }: { courseId: string; skillId: string; messages: { id: string; role: string; content: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // the learner's own message shows immediately while the tutor is thinking
  const [draft, setDraft] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);
  const LABELS: Record<TutorMode, string> = { simpler: "Explain more simply", example: "Give an example", check: "Check my understanding", hint: "Give me a hint", ask: "" };
  const send = (mode: TutorMode, msg = "") =>
    start(async () => {
      setError(null);
      setDraft(msg || LABELS[mode]);
      const res = await tutorAction(courseId, skillId, mode, msg);
      if (!res.ok) setError(res.error);
      else {
        setText("");
        router.refresh();
      }
      setDraft(null);
    });
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Bot size={18} className="text-brand" aria-hidden />
        <h2 className="font-semibold">Ask tutor</h2>
      </div>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" style={{ maxHeight: 420 }} aria-live="polite">
        {messages.length === 0 ? <p className="text-muted">Stuck? Ask a question, or use a button below. The tutor gives hints before full solutions.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={`sf-enter ${m.role === "learner" ? "ml-6 rounded-xl bg-brand-soft px-3 py-2 dark:bg-surface-2" : "mr-2 rounded-xl bg-surface-2 px-3 py-2"}`}>
            <Markdown text={m.content} />
          </div>
        ))}
        {pending && draft ? <div className="sf-enter ml-6 rounded-xl bg-brand-soft px-3 py-2 opacity-80 dark:bg-surface-2">{draft}</div> : null}
        {pending ? (
          <div className="sf-fade mr-2 inline-flex items-center gap-1 rounded-xl bg-surface-2 px-3 py-2.5" aria-label="Tutor is thinking">
            {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-line p-3">
        <div className="flex flex-wrap gap-1.5">
          {([["simpler", "Explain more simply"], ["example", "Give an example"], ["check", "Check my understanding"], ["hint", "Give me a hint"]] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => send(mode)} disabled={pending} className="rounded-full border border-line px-2.5 py-1 text-xs transition-colors hover:border-brand hover:text-brand active:scale-[0.97] disabled:opacity-50">{label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send("ask", text); }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} className={input} placeholder="Ask about this lesson" maxLength={1500} aria-label="Message the tutor" />
          <button className="rounded-lg bg-brand px-3 text-brand-ink disabled:opacity-50" disabled={pending || !text.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
        {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

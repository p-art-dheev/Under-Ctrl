"use client";

import { useState, useTransition } from "react";
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
  const send = (mode: TutorMode, msg = "") =>
    start(async () => {
      setError(null);
      const res = await tutorAction(courseId, skillId, mode, msg);
      if (!res.ok) setError(res.error);
      else {
        setText("");
        router.refresh();
      }
    });
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Bot size={18} className="text-brand" aria-hidden />
        <h2 className="font-semibold">Ask tutor</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" style={{ maxHeight: 420 }} aria-live="polite">
        {messages.length === 0 ? <p className="text-muted">Stuck? Ask a question, or use a button below. The tutor gives hints before full solutions.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "learner" ? "ml-6 rounded-xl bg-brand-soft px-3 py-2" : "mr-2 rounded-xl bg-surface-2 px-3 py-2"}>
            <Markdown text={m.content} />
          </div>
        ))}
        {pending ? <div className="sf-skeleton h-10 w-3/4" /> : null}
      </div>
      <div className="space-y-2 border-t border-line p-3">
        <div className="flex flex-wrap gap-1.5">
          {([["simpler", "Explain more simply"], ["example", "Give an example"], ["check", "Check my understanding"], ["hint", "Give me a hint"]] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => send(mode)} disabled={pending} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-brand hover:text-brand disabled:opacity-50">{label}</button>
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

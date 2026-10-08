"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import type { ActionResult } from "@/app/actions";

type Action = (prev: unknown, form: FormData) => Promise<ActionResult | undefined>;

export function AuthForm({ action, mode }: { action: Action; mode: "login" | "signup" }) {
  const [state, run, pending] = useActionState(action, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={run} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="pl-9" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            required
            className="pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="sf-enter flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden /> {state.error}
        </p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending}>
        {pending ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Please wait…</> : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} aria-hidden /></>}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link href="/signup" className="font-medium text-brand hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}

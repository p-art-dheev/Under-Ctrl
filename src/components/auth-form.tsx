"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btn, input } from "@/components/ui";
import type { ActionResult } from "@/app/actions";

type Action = (prev: unknown, form: FormData) => Promise<ActionResult | undefined>;

export function AuthForm({ action, mode }: { action: Action; mode: "login" | "signup" }) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
          className={input}
        />
        {mode === "signup" ? <p className="mt-1 text-xs text-muted">At least 8 characters.</p> : null}
      </div>
      {state && !state.ok ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      <button className={`${btn} w-full`} disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
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

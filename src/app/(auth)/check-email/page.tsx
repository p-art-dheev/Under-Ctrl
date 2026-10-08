import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata = { title: "Confirm your email" };

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><MailCheck size={28} aria-hidden /></span>
      <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-2 text-sm text-muted">
        We sent a confirmation link{email ? <> to <strong className="text-ink">{email}</strong></> : null}. Open it to activate your account, then sign in.
      </p>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Back to sign in</Link>
    </div>
  );
}

import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata = { title: "Confirm your email" };

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <MailCheck className="mx-auto mb-3 text-brand" size={36} aria-hidden />
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-muted">
        We sent a confirmation link{email ? <> to <strong className="text-ink">{email}</strong></> : null}. Open it to activate your account, then sign in.
      </p>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Back to sign in</Link>
    </div>
  );
}

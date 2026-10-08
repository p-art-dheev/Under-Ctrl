import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/app/actions";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1.5 text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 text-sm text-muted">Sign in to pick up where you left off.</p>
      <AuthForm action={signInAction} mode="login" />
    </>
  );
}

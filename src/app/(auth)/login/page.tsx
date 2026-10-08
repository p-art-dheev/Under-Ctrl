import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/app/actions";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Sign in to continue your course.</p>
      <AuthForm action={signInAction} mode="login" />
    </>
  );
}

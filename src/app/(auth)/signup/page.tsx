import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "@/app/actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1.5 text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mb-8 text-sm text-muted">Your skill graph, answers and progress are saved to it.</p>
      <AuthForm action={signUpAction} mode="signup" />
    </>
  );
}

import Link from "next/link";
import { AuthShell, searchParamsNotice } from "@/app/auth/components";
import { signUp } from "@/app/auth/actions";

export const instant = false;

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const notice = await searchParamsNotice(searchParams);
  return <AuthShell eyebrow="GET STARTED" title="Create your workspace" description="Start with a private workspace. Connect repositories when you are ready." {...notice}>
    <form className="auth-form" action={signUp}>
      <label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
      <label>Password<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <p className="auth-hint">Use at least 12 characters. You may need to confirm your email before signing in.</p>
      <button className="auth-submit" type="submit">Create account</button>
    </form>
    <p className="auth-switch">Already have an account? <Link href="/auth/login">Sign in</Link></p>
  </AuthShell>;
}

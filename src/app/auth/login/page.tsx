import Link from "next/link";
import { AuthShell, searchParamsNotice } from "@/app/auth/components";
import { signIn } from "@/app/auth/actions";

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const notice = await searchParamsNotice(searchParams);
  const { next } = await searchParams;
  return <AuthShell eyebrow="WELCOME BACK" title="Sign in to your workspace" description="Continue reviewing work with a clear record of every decision." {...notice}>
    <form className="auth-form" action={signIn}>
      <input type="hidden" name="next" value={next ?? "/"} />
      <label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required minLength={12} maxLength={128} /></label>
      <div className="auth-inline"><span>Use at least 12 characters.</span><Link href="/auth/forgot-password">Forgot password?</Link></div>
      <button className="auth-submit" type="submit">Sign in</button>
    </form>
    <p className="auth-switch">New to FlowPilot? <Link href="/auth/sign-up">Create an account</Link></p>
  </AuthShell>;
}

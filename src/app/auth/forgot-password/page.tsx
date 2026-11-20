import Link from "next/link";
import { AuthShell, searchParamsNotice } from "@/app/auth/components";
import { requestPasswordReset } from "@/app/auth/actions";

export const instant = false;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const notice = await searchParamsNotice(searchParams);
  return <AuthShell eyebrow="ACCOUNT RECOVERY" title="Reset your password" description="We will send a one-time link if an account matches that address." {...notice}>
    <form className="auth-form" action={requestPasswordReset}>
      <label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
      <button className="auth-submit" type="submit">Send reset link</button>
    </form>
    <p className="auth-switch"><Link href="/auth/login">Back to sign in</Link></p>
  </AuthShell>;
}

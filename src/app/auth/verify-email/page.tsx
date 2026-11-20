import Link from "next/link";
import { AuthShell } from "@/app/auth/components";

export default function VerifyEmailPage() {
  return <AuthShell eyebrow="CHECK YOUR INBOX" title="Confirm your email" description="Use the confirmation link we sent to finish setting up your account.">
    <p className="auth-hint">If the email does not arrive, check your spam folder or try creating the account again with the same address.</p>
    <p className="auth-switch"><Link href="/auth/login">Return to sign in</Link></p>
  </AuthShell>;
}

import Link from "next/link";
import { Workflow } from "lucide-react";
import type { ReactNode } from "react";

const messages: Record<string, string> = {
  not_configured: "Authentication is unavailable until Supabase is configured. Add the required values from .env.example and restart the app.",
  check_fields: "Enter a valid email and a password with at least 12 characters.",
  check_email: "Enter a valid email address.",
  check_password: "Use a password between 12 and 128 characters.",
  invalid_credentials: "We could not sign you in with those details. Check the email and password, then try again.",
  account_exists: "An account already exists for this email. Try signing in instead.",
  sign_up_failed: "We could not create the account. Check the details and try again.",
  reset_failed: "We could not send a reset email. Check your address and try again.",
  update_failed: "We could not update your password. Request a new reset link and try again.",
  callback_failed: "That sign-in link is invalid or expired. Request a fresh link and try again.",
};

export function AuthShell({ children, eyebrow, title, description, error, info }: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  error?: string;
  info?: string;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-brand" href="/" aria-label="FlowPilot home"><span className="brand-mark"><Workflow size={18} /></span><span>flowpilot<span>.ai</span></span></Link>
        <div className="auth-heading"><p className="section-kicker">{eyebrow}</p><h1 id="auth-title">{title}</h1><p>{description}</p></div>
        {error && <p className="auth-alert" role="alert">{messages[error] ?? messages.callback_failed}</p>}
        {info && <p className="auth-info" role="status">{info}</p>}
        {children}
      </section>
      <p className="auth-footnote">Your engineering work stays yours.</p>
    </main>
  );
}

export async function searchParamsNotice(searchParams: Promise<{ error?: string; sent?: string; changed?: string }>) {
  const params = await searchParams;
  return {
    error: params.error,
    info: params.sent === "1" ? "If an account uses that address, a password reset link is on the way." :
      params.changed === "1" ? "Your password has been updated." : undefined,
  };
}

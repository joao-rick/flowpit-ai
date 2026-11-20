import { redirect } from "next/navigation";
import { AuthShell, searchParamsNotice } from "@/app/auth/components";
import { updatePassword } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/auth/login?error=not_configured");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login?error=callback_failed");
  const notice = await searchParamsNotice(searchParams);
  return <AuthShell eyebrow="ACCOUNT RECOVERY" title="Choose a new password" description="Use a strong password you do not use elsewhere." {...notice}>
    <form className="auth-form" action={updatePassword}>
      <label>New password<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <p className="auth-hint">Use at least 12 characters.</p>
      <button className="auth-submit" type="submit">Update password</button>
    </form>
  </AuthShell>;
}

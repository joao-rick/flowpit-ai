"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/auth/safe-redirect";

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
});

function authBaseError() {
  return isSupabaseConfigured() ? "invalid_credentials" : "not_configured";
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/auth/login?error=check_fields");
  if (!isSupabaseConfigured()) redirect("/auth/login?error=not_configured");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/auth/login?error=${authBaseError()}`);
  const requestedPath = formData.get("next");
  redirect(safeNextPath(typeof requestedPath === "string" ? requestedPath : null));
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/auth/sign-up?error=check_fields");
  if (!isSupabaseConfigured()) redirect("/auth/sign-up?error=not_configured");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin}/auth/callback?next=/` },
  });
  if (error) redirect(`/auth/sign-up?error=${error.code === "user_already_exists" ? "account_exists" : "sign_up_failed"}`);
  if (!data.session) redirect("/auth/verify-email");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.email().max(254).safeParse(formData.get("email"));
  if (!email.success) redirect("/auth/forgot-password?error=check_email");
  if (!isSupabaseConfigured()) redirect("/auth/forgot-password?error=not_configured");

  const supabase = await createSupabaseServerClient();
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });
  if (error) redirect("/auth/forgot-password?error=reset_failed");
  redirect("/auth/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(12).max(128).safeParse(formData.get("password"));
  if (!password.success) redirect("/auth/update-password?error=check_password");
  if (!isSupabaseConfigured()) redirect("/auth/update-password?error=not_configured");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirect("/auth/update-password?error=update_failed");
  redirect("/?password_updated=1");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/auth/login");
}

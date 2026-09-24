"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCartIntoProfile } from "@/modules/cart/mutations";
import { clearCartSessionCookie, getCartSessionToken } from "@/modules/cart/session";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/validations/auth";

/** Folds any guest cart into the now-signed-in profile's cart. Call right before redirecting. */
async function mergeGuestCartOnLogin(profileId: string) {
  const sessionToken = await getCartSessionToken();
  if (!sessionToken) return;

  await mergeGuestCartIntoProfile({ profileId, sessionToken });
  await clearCartSessionCookie();
}

export type AuthActionState = { error?: string; success?: string } | undefined;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function firstFieldError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const { fieldErrors } = error.flatten();
  return Object.values(fieldErrors).flat()[0];
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error) ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl()}/auth/callback?next=/account`,
    },
  });

  if (error) return { error: error.message };

  // No session means Supabase requires email confirmation before sign-in.
  if (!data.session) {
    return { success: "Check your email to confirm your account before signing in." };
  }

  await mergeGuestCartOnLogin(data.session.user.id);
  redirect("/account");
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error) ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Invalid email or password." };

  await mergeGuestCartOnLogin(data.user.id);
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error) ?? "Invalid input." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/update-password`,
  });

  // Always return the same message, whether or not the email is registered,
  // so this endpoint can't be used to enumerate accounts.
  return { success: "If that email is registered, a reset link has been sent." };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error) ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { error: error.message };

  redirect("/account");
}

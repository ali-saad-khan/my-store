"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { signIn } from "@/modules/auth/actions";
import { FormMessage } from "@/components/form-message";

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-muted-foreground text-sm underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <SubmitButton pendingText="Signing in...">Sign in</SubmitButton>
    </form>
  );
}

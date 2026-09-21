"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { signUp } from "@/modules/auth/actions";
import { AuthMessage } from "./auth-message";

export function RegisterForm() {
  const [state, formAction] = useActionState(signUp, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <AuthMessage error={state?.error} success={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <SubmitButton pendingText="Creating account...">Create account</SubmitButton>
    </form>
  );
}

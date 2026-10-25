"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Info, Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LOGIN_REASONS, type LoginReason } from "@/lib/auth/constants";
import { loginAction } from "./actions";

export function LoginReasonAlert() {
  const reason = useSearchParams().get("sabab");
  if (!reason || !(reason in LOGIN_REASONS)) return null;
  return (
    <Alert className="mb-4">
      <Info />
      <AlertDescription>{LOGIN_REASONS[reason as LoginReason]}</AlertDescription>
    </Alert>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Kirish</CardTitle>
        <CardDescription>Login va parolingizni kiriting</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">Login</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state?.username}
              required
              autoFocus
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <PasswordInput id="password" name="password" autoComplete="current-password" required className="h-10" />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
            Davom etish
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

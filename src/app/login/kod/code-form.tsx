"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, KeyRound, Loader2, Smartphone } from "lucide-react";
import { OtpField } from "@/components/otp-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { verifyCodeAction, type CodeState } from "../actions";

export function CodeForm({ username, backupLeft }: { username: string; backupLeft: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");

  const [state, formAction, pending] = useActionState(async (prev: CodeState, formData: FormData) => {
    const result = await verifyCodeAction(prev, formData);
    setCode("");
    return result;
  }, undefined);

  const switchMode = () => {
    setMode(mode === "totp" ? "backup" : "totp");
    setCode("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Tasdiqlash</CardTitle>
        <CardDescription>
          {mode === "totp" ? (
            <>
              <b className="text-foreground">{username}</b> — Google Authenticator ilovasidagi 6 xonali kodni kiriting
            </>
          ) : (
            "Saqlab qo'ygan zaxira kodlaringizdan birini kiriting"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          {state?.error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {mode === "totp" ? (
            <OtpField
              value={code}
              onChange={setCode}
              onComplete={() => formRef.current?.requestSubmit()}
              disabled={pending}
              invalid={Boolean(state?.error)}
            />
          ) : (
            <Input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXXX-XXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              className="h-11 text-center font-mono text-lg tracking-widest"
            />
          )}

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={pending || (mode === "totp" ? code.length !== 6 : code.trim().length < 10)}
          >
            {pending && <Loader2 className="animate-spin" />}
            Tasdiqlash
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {(mode === "backup" || backupLeft > 0) && (
          <Button variant="link" size="sm" onClick={switchMode} className="text-muted-foreground">
            {mode === "totp" ? (
              <>
                <KeyRound /> Zaxira kod bilan kirish ({backupLeft} ta qoldi)
              </>
            ) : (
              <>
                <Smartphone /> Ilovadagi kod bilan kirish
              </>
            )}
          </Button>
        )}
        <Button variant="link" size="sm" asChild className="text-muted-foreground">
          <Link href="/login">
            <ArrowLeft /> Orqaga
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

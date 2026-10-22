"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BackupCodes } from "@/components/backup-codes";
import { OtpField } from "@/components/otp-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmSetupAction, type SetupState } from "../actions";

type SetupData = { qr: string; secret: string; username: string };

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-6">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function SetupForm({ setup }: { setup: SetupData | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: SetupState, formData: FormData) => {
    const result = await confirmSetupAction(prev, formData);
    setCode("");
    return result;
  }, undefined);

  if (state?.backupCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CircleCheck className="size-5 text-income" /> Himoya yoqildi
          </CardTitle>
          <CardDescription>Endi har kirishda Google Authenticator kodi so&apos;raladi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BackupCodes codes={state.backupCodes} />
          <Button asChild className="h-10 w-full">
            <Link href="/">Saqladim, davom etish</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!setup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Google Authenticator ulangan</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Dashboard&apos;ga o&apos;tish</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret.replace(/\s/g, ""));
      toast.success("Kalit nusxalandi");
    } catch {
      toast.error("Nusxa olib bo'lmadi");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ikki bosqichli himoya</CardTitle>
        <CardDescription>Bir marta sozlanadi — keyin har kirishda ilovadagi kod so&apos;raladi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Step n={1} title="Telefoningizga Google Authenticator ilovasini o'rnating" />
        <Step n={2} title="Ilovada «+» → «QR kodni skanerlash» ni bosing">
          {/* QR kod har doim oq fonda — skanerlar qorong'i fonni yaxshi o'qimaydi */}
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, optimallashtirish kerak emas */}
          <img
            src={setup.qr}
            alt="Google Authenticator uchun QR kod"
            width={180}
            height={180}
            className="rounded-lg border bg-white p-2"
          />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Skanerlay olmasangiz, kalitni qo&apos;lda kiriting:</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all">
                {setup.secret}
              </code>
              <Button type="button" variant="outline" size="icon-sm" onClick={copySecret} aria-label="Kalitni nusxalash">
                <Copy />
              </Button>
            </div>
          </div>
        </Step>
        <Step n={3} title="Ilovada chiqqan 6 xonali kodni kiriting">
          <form ref={formRef} action={formAction} className="space-y-4">
            {state?.error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <OtpField
              value={code}
              onChange={setCode}
              onComplete={() => formRef.current?.requestSubmit()}
              disabled={pending}
              invalid={Boolean(state?.error)}
            />
            <Button type="submit" className="h-10 w-full" disabled={pending || code.length !== 6}>
              {pending && <Loader2 className="animate-spin" />}
              Tasdiqlash va yoqish
            </Button>
          </form>
        </Step>
      </CardContent>
    </Card>
  );
}

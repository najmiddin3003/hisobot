"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CircleAlert, KeyRound, Loader2, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BackupCodes } from "@/components/backup-codes";
import { OtpField } from "@/components/otp-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import {
  changePasswordAction,
  regenerateBackupCodesAction,
  revokeSessionAction,
  type BackupCodesState,
  type PasswordState,
} from "./actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(async (prev: PasswordState, formData: FormData) => {
    const result = await changePasswordAction(prev, formData);
    if (result?.success) toast.success("Parol o'zgartirildi. Boshqa seanslar yopildi.");
    return result;
  }, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="current">Joriy parol</Label>
        <PasswordInput id="current" name="current" autoComplete="current-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="next">Yangi parol</Label>
        <PasswordInput
          id="next"
          name="next"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Yangi parolni takrorlang</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Parolni o&apos;zgartirish
      </Button>
    </form>
  );
}

function RegenerateBackupCodes({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: BackupCodesState, formData: FormData) => {
    const result = await regenerateBackupCodesAction(prev, formData);
    setCode("");
    return result;
  }, undefined);

  if (state?.codes) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Yangi zaxira kodlar</DialogTitle>
          <DialogDescription>Eski kodlar endi ishlamaydi</DialogDescription>
        </DialogHeader>
        <BackupCodes codes={state.codes} />
        <DialogFooter>
          <Button onClick={onDone}>Saqladim</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Yangi zaxira kodlar</DialogTitle>
        <DialogDescription>
          Tasdiqlash uchun Google Authenticator&apos;dagi kodni kiriting. Eski zaxira kodlar bekor qilinadi.
        </DialogDescription>
      </DialogHeader>
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
        <Button type="submit" className="w-full" disabled={pending || code.length !== 6}>
          {pending && <Loader2 className="animate-spin" />}
          Yangi kodlar yaratish
        </Button>
      </form>
    </>
  );
}

export function BackupCodesDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <RefreshCw /> Yangi zaxira kodlar
        </Button>
      </DialogTrigger>
      {/* Yopilganda ichki holat (kodlar) yo'qoladi — qayta ochilganda forma yangidan boshlanadi */}
      <DialogContent className="sm:max-w-md">
        <RegenerateBackupCodes onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revokeSessionAction(sessionId);
          toast.success("Seans yopildi");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Chiqarish
    </Button>
  );
}

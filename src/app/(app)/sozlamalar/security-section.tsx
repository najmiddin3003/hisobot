import { Bot, KeyRound, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSecurityOverview, type SessionRow } from "@/lib/data/security";
import { formatDateTime } from "@/lib/dates";
import { REVOKE_REASON_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { BackupCodesDialog, ChangePasswordForm, RevokeSessionButton } from "./security-forms";

export async function SecuritySection() {
  const { sessions, totpEnabled, backupCodesLeft } = await getSecurityOverview();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Seanslar va kirishlar tarixi</CardTitle>
          <CardDescription>
            Saytda bir vaqtda faqat bitta seans bo&apos;ladi — yangi kirishda oldingisi avtomatik yopiladi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-income" /> Google Authenticator
            </CardTitle>
            <CardDescription>
              {totpEnabled ? "Yoqilgan — har kirishda kod so'raladi" : "Hali ulanmagan"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <KeyRound className="size-4" /> Zaxira kodlar
              </span>
              <span className={cn("font-semibold tabular-nums", backupCodesLeft <= 2 && "text-expense")}>
                {backupCodesLeft} ta qoldi
              </span>
            </div>
            <BackupCodesDialog />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parolni o&apos;zgartirish</CardTitle>
            <CardDescription>Saytdagi boshqa seanslar va bot seansi yopiladi</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SessionItem({ session }: { session: SessionRow }) {
  const Icon = session.channel === "telegram" ? Bot : /mobil|planshet/.test(session.device) ? Smartphone : Monitor;
  const isActive = session.state === "active";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center",
        session.isCurrent && "border-income/40 bg-income/5",
        !isActive && "opacity-70",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{session.device}</span>
            {session.isCurrent ? (
              <Badge className="bg-income/15 text-income">Shu qurilma</Badge>
            ) : isActive ? (
              <Badge variant="secondary">Faol</Badge>
            ) : session.state === "expired" ? (
              <Badge variant="outline">Muddati tugagan</Badge>
            ) : (
              <Badge variant="outline">
                {session.revokeReason ? REVOKE_REASON_LABELS[session.revokeReason] : "Yopilgan"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Kirilgan: {formatDateTime(session.createdAt)}
            {session.ip && <> · IP {session.ip}</>}
          </p>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? `Oxirgi faollik: ${formatDateTime(session.lastSeenAt)} · tugaydi: ${formatDateTime(session.expiresAt)}`
              : session.revokedAt
                ? `Yopilgan: ${formatDateTime(session.revokedAt)}`
                : `Tugagan: ${formatDateTime(session.expiresAt)}`}
          </p>
        </div>
      </div>
      {isActive && !session.isCurrent && <RevokeSessionButton sessionId={session.id} />}
    </div>
  );
}

export function SecuritySectionSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

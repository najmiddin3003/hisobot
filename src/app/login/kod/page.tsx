import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPendingLogin } from "@/lib/auth/session";
import { backupCodesLeft } from "@/lib/auth/two-factor";
import { AuthCardSkeleton } from "../auth-card-skeleton";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Tasdiqlash kodi" };

export default function CodePage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <CodeGate />
    </Suspense>
  );
}

async function CodeGate() {
  const pending = await getPendingLogin();
  if (!pending) redirect("/login");
  if (!pending.user.totpEnabled) redirect("/login/sozlash");
  return <CodeForm username={pending.user.username} backupLeft={backupCodesLeft(pending.user)} />;
}

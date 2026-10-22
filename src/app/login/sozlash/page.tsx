import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/dal";
import { getPendingLogin } from "@/lib/auth/session";
import { prepareTotpSetup } from "@/lib/auth/two-factor";
import { AuthCardSkeleton } from "../auth-card-skeleton";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Google Authenticator ulash" };

export default function SetupPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SetupGate />
    </Suspense>
  );
}

async function SetupGate() {
  const pending = await getPendingLogin();
  if (!pending) {
    // Tasdiqlangandan keyin sahifa yangilanadi: seans ochilgan — forma zaxira kodlarni ko'rsatib turadi
    if ((await getCurrentSession()).status === "ok") return <SetupForm setup={null} />;
    redirect("/login");
  }
  if (pending.user.totpEnabled) redirect("/login/kod");
  return <SetupForm setup={await prepareTotpSetup(pending.user)} />;
}

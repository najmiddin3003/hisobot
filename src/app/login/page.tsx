import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/dal";
import { LoginForm, LoginReasonAlert } from "./login-form";

export const metadata: Metadata = { title: "Kirish" };

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={null}>
        <LoginReasonAlert />
      </Suspense>
      <LoginForm />
    </>
  );
}

async function RedirectIfSignedIn() {
  const session = await getCurrentSession();
  if (session.status === "ok") redirect("/");
  return null;
}

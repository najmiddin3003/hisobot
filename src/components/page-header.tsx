import { Suspense } from "react";
import { AuthCheck } from "@/components/auth-check";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  /** O'ng tomondagi tugmalar */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {/*
        Layout sahifalar almashganda qayta ishlamaydi, shuning uchun seans har bir sahifada
        alohida tekshiriladi. Barcha sahifalar PageHeader ishlatgani uchun tekshiruv shu yerda.
      */}
      <Suspense fallback={null}>
        <AuthCheck />
      </Suspense>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-expense/10 text-expense">
        <CircleAlert className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Nimadir xato ketdi</p>
        <p className="text-sm text-muted-foreground">Sahifani yuklab bo&apos;lmadi. Qayta urinib ko&apos;ring.</p>
      </div>
      <Button onClick={() => retry()}>
        <RotateCcw /> Qayta urinish
      </Button>
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import { useEntryEditor } from "@/components/entries/entry-editor";
import { Button } from "@/components/ui/button";

/** Yangi yozuv: "fab" — pastki paneldagi dumaloq tugma, "pill" — yuqori paneldagi tugma */
export function QuickAddButton({ variant }: { variant: "fab" | "pill" }) {
  const editor = useEntryEditor();
  return <QuickAddShell variant={variant} onClick={() => editor.openNew("chiqim")} />;
}

/** Tugmaning o'zi — ma'lumotlar yuklanguncha o'chiq holda ham shu ko'rinadi (sahifa sakramasligi uchun) */
export function QuickAddShell({ variant, onClick }: { variant: "fab" | "pill"; onClick?: () => void }) {
  if (variant === "pill") {
    return (
      <Button onClick={onClick} disabled={!onClick}>
        <Plus /> Yozuv
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label="Yangi yozuv"
      className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 ring-4 ring-background transition-transform active:scale-95 disabled:opacity-60"
    >
      <Plus className="size-6" />
    </button>
  );
}

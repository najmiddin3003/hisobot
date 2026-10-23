"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Check, Loader2, Monitor, Moon, Sun, Trash2, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearAiHistory } from "./catalog-actions";

const THEMES: { value: string; label: string; icon: LucideIcon; preview: string }[] = [
  { value: "light", label: "Yorug'", icon: Sun, preview: "bg-[#f4efe6]" },
  { value: "dark", label: "Qorong'i", icon: Moon, preview: "bg-[#15120e]" },
  { value: "system", label: "Tizim bo'yicha", icon: Monitor, preview: "bg-linear-to-r from-[#f4efe6] from-50% to-[#15120e] to-50%" },
];

const noop = () => () => {};

/** Mavzu tanlash: yorug', qorong'i yoki qurilma sozlamasi bo'yicha */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // Tanlangan mavzu faqat brauzerda ma'lum — serverda hech biri belgilanmaydi
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-3 gap-3">
      {THEMES.map((t) => {
        const selected = mounted && theme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(t.value)}
            className={cn(
              "group space-y-2 rounded-xl border p-2 text-left transition-colors hover:bg-accent/50",
              selected && "border-primary ring-2 ring-primary/30",
            )}
          >
            <div className={cn("relative h-16 overflow-hidden rounded-xl border", t.preview)}>
              <div className="absolute top-2 left-2 h-1.5 w-8 rounded-full bg-stone-400/60" />
              <div className="absolute top-5 left-2 h-1.5 w-12 rounded-full bg-stone-400/40" />
              <div className="absolute right-2 bottom-2 size-4 rounded-full bg-[#c35f36]" />
            </div>
            {/* Tor ustunda ham nomi to'liq ko'rinsin: ikonka va nom ustma-ust */}
            <span className="flex flex-col items-center gap-1 text-center text-xs font-medium sm:text-sm">
              {selected ? <Check className="size-3.5 text-primary" /> : <t.icon className="size-3.5 text-muted-foreground" />}
              <span className="leading-tight">{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ClearAiHistoryButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const clear = () =>
    startTransition(async () => {
      const result = await clearAiHistory();
      if (result.ok) toast.success("AI suhbatlari va tahlillari o'chirildi");
      else toast.error(result.error);
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Tarixni tozalash
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>AI tarixi o&apos;chirilsinmi?</AlertDialogTitle>
          <AlertDialogDescription>
            Barcha suhbatlar va Dashboard&apos;dagi oylik tahlillar o&apos;chiriladi. Kirim-chiqim yozuvlaringizga tegilmaydi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={clear}>
            O&apos;chirish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

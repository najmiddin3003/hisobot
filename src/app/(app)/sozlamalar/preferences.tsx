"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Check, Loader2, Moon, Sun, Trash2, type LucideIcon } from "lucide-react";
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
import { Oydin } from "@/components/robot/oydin";
import { setRobotEnabled, useRobotEnabled } from "@/components/robot/use-robot";
import { centerOf, useThemeSwitch, type ThemeName } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { clearAiHistory } from "./catalog-actions";

const THEMES: { value: ThemeName; label: string; icon: LucideIcon; preview: string }[] = [
  { value: "light", label: "Yorug'", icon: Sun, preview: "bg-[#f4efe6]" },
  { value: "dark", label: "Qorong'i", icon: Moon, preview: "bg-[#15120e]" },
];

const noop = () => () => {};

/** Mavzu tanlash: yorug' yoki qorong'i (birinchi kirishda — qurilma mavzusi) */
export function ThemePicker() {
  const { theme, switchTheme } = useThemeSwitch();
  // Tanlangan mavzu faqat brauzerda ma'lum — serverda hech biri belgilanmaydi
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const selected = mounted && theme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={(e) => t.value !== theme && switchTheme(t.value, centerOf(e.currentTarget))}
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

/** Oydin robotchani yoqish/o'chirish (shu brauzerda saqlanadi) */
export function RobotToggle() {
  const enabled = useRobotEnabled();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50">
      <Oydin className="h-12 w-auto shrink-0" eyes={mounted && !enabled ? "closed" : "happy"} thrust={mounted && !enabled ? 0 : 1} />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">Oydin robotcha</span>
        <span className="block text-xs text-muted-foreground">Sayt bo&apos;ylab uchib yuradi, bosilsa AI yordamchini ochadi</span>
      </span>
      <Switch
        checked={mounted ? enabled : true}
        onCheckedChange={(on) => {
          setRobotEnabled(on);
          toast.success(on ? "Oydin qaytdi! 👋" : "Oydin dam olishga ketdi");
        }}
        aria-label="Oydin robotcha"
      />
    </label>
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

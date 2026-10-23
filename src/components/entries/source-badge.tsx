import { Bot, Globe, Repeat } from "lucide-react";
import type { Source } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Yozuv manbasi: Telegram va avtomatik yozuvlar aniq belgi bilan, saytdagilar — kichik ikonka */
export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  if (source === "web") {
    return (
      <span title="Saytdan kiritilgan" className={cn("inline-flex text-muted-foreground/70", className)}>
        <Globe className="size-3.5" />
        <span className="sr-only">Sayt</span>
      </span>
    );
  }
  const telegram = source === "telegram";
  return (
    <span
      title={telegram ? "Telegram botdan kiritilgan" : "Takroriy to'lov — avtomatik qo'shilgan"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        telegram ? "bg-receivable/10 text-receivable" : "bg-primary/10 text-primary",
        className,
      )}
    >
      {telegram ? <Bot className="size-3" /> : <Repeat className="size-3" />}
      {telegram ? "Telegram" : "Avtomatik"}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Keyingi bosqichlarda to'ldiriladigan blok uchun vaqtinchalik kartochka */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  stage,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  stage: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 p-8 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="secondary">{stage}-bosqichda tayyor bo&apos;ladi</Badge>
    </div>
  );
}

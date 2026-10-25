// Bo'sh holatlar uchun kichik rasmlar: iliq fon dog'i, siyoh chiziqlar va bento rangidagi urg'ular.
// Ranglar mavzuga moslashadi (foreground/muted tokenlari), urg'u ranglari — grafik palitrasidan.
import { cn } from "@/lib/utils";

type Props = { className?: string };

function Frame({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden className={cn("h-24 w-auto", className)}>
      {/* Fon dog'i */}
      <path d="M22 54c-6-22 12-40 36-42s44 12 44 34-14 38-40 38-34-8-40-30z" className="fill-tile-sand" />
      <ellipse cx="60" cy="88" rx="34" ry="3.5" className="fill-foreground/10" />
      {children}
    </svg>
  );
}

const ink = "stroke-foreground/45";

/** Chek: yozuvlar yo'q */
export function IllustrationReceipt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M40 16h40v62l-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4z" className={cn("fill-card", ink)} strokeWidth="2" strokeLinejoin="round" />
      <path d="M48 30h24M48 40h16M48 50h20" className={ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="84" cy="22" r="9" className="fill-chart-income" />
      <path d="M84 18v8M80 22h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </Frame>
  );
}

/** Savat: o'chirilganlar yo'q */
export function IllustrationTrash({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M42 30h36l-4 46a6 6 0 0 1-6 5H52a6 6 0 0 1-6-5z" className={cn("fill-card", ink)} strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 30h44M52 30v-6h16v6" className={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M54 42v26M66 42v26" className="stroke-foreground/25" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 20l2 4 4 .6-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1-3-2.9 4-.6z" className="fill-chart-4" />
    </Frame>
  );
}

/** Kalendar: takroriy to'lovlar yo'q */
export function IllustrationCalendar({ className }: Props) {
  return (
    <Frame className={className}>
      <rect x="34" y="22" width="52" height="54" rx="8" className={cn("fill-card", ink)} strokeWidth="2" />
      <path d="M34 36h52" className={ink} strokeWidth="2" />
      <path d="M46 16v10M74 16v10" className={ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="48" r="3" className="fill-foreground/20" />
      <circle cx="60" cy="48" r="3" className="fill-foreground/20" />
      <circle cx="72" cy="48" r="3" className="fill-chart-expense" />
      <circle cx="48" cy="62" r="3" className="fill-foreground/20" />
      <circle cx="60" cy="62" r="3" className="fill-foreground/20" />
      <path d="M84 64a10 10 0 1 1-3-7" className="stroke-chart-income" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M82 52l-1 5 5 1" className="stroke-chart-income" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Qo'l siqish: qarz/xaq yo'q */
export function IllustrationHandshake({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M28 44l14-10 12 6 10-6 12 4 14 6" className={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 34l-10 22 18 16 22-12 18-14" className={cn("fill-card", ink)} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M54 52l8 8M60 48l8 8M66 46l6 6" className="stroke-foreground/30" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="86" cy="24" r="8" className="fill-chart-4" />
      <path d="M83 24l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Diagramma: bu oyda chiqim yo'q */
export function IllustrationChart({ className }: Props) {
  return (
    <Frame className={className}>
      <circle cx="56" cy="48" r="24" className={cn("fill-card", ink)} strokeWidth="2" />
      <path d="M56 24a24 24 0 0 1 24 24H56z" className="fill-chart-expense" />
      <path d="M56 48h24a24 24 0 0 1-8 18z" className="fill-chart-4" />
      <path d="M86 70l6-14 6 6 6-16" className="stroke-chart-income" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Bo'sh idish: maqsadlar yo'q */
export function IllustrationJar({ className }: Props) {
  return (
    <Frame className={className}>
      <rect x="43" y="16" width="34" height="8" rx="3" className="fill-foreground/25" />
      <path d="M46 24h28v42a10 10 0 0 1-10 10h-8a10 10 0 0 1-10-10z" className={cn("fill-card", ink)} strokeWidth="2.5" />
      <circle cx="60" cy="66" r="6" className="fill-chart-4" />
      <path d="M88 30l-2 10M94 36l-9 3M92 26l-6 9" className="stroke-chart-income" strokeWidth="2.2" strokeLinecap="round" />
    </Frame>
  );
}

/** Lupa: qidiruv bo'yicha hech narsa topilmadi */
export function IllustrationSearch({ className }: Props) {
  return (
    <Frame className={className}>
      <circle cx="56" cy="44" r="18" className={cn("fill-card", ink)} strokeWidth="2.5" />
      <path d="M69 57l14 14" className={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 40a8 8 0 0 1 8-6" className="stroke-foreground/25" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="26" r="3" className="fill-chart-expense" />
      <circle cx="30" cy="30" r="2.5" className="fill-chart-income" />
    </Frame>
  );
}

/** Rasmli bo'sh holat: rasm, sarlavha, izoh va ixtiyoriy tugma */
export function EmptyState({
  illustration,
  title,
  text,
  action,
  className,
}: {
  illustration: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center", className)}>
      <div className="animate-rise">{illustration}</div>
      <div className="space-y-1">
        <p className="font-heading text-lg font-medium">{title}</p>
        {text && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{text}</p>}
      </div>
      {action}
    </div>
  );
}

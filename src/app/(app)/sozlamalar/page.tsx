import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Bot, ChevronRight, Palette, Repeat, ShieldCheck, Sparkles, Tags, TerminalSquare, type LucideIcon } from "lucide-react";
import { DatabaseProblem } from "@/components/database-problem";
import { PageHeader } from "@/components/page-header";
import { ListCardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettingsOverview, type SettingsOverview } from "@/lib/data/settings";
import { formatMoney } from "@/lib/money";
import { CategoriesCard, WalletsCard } from "./catalog-view";
import { ClearAiHistoryButton, ThemePicker } from "./preferences";
import { SecuritySection, SecuritySectionSkeleton } from "./security-section";

export const metadata: Metadata = { title: "Sozlamalar" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Sozlamalar" description="Hamyonlar, kategoriyalar, ko'rinish, xizmatlar va xavfsizlik" />

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>

      <SectionTitle icon={ShieldCheck} title="Xavfsizlik" />
      <Suspense fallback={<SecuritySectionSkeleton />}>
        <SecuritySection />
      </Suspense>
    </>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="-mb-2 flex items-center gap-2.5 pt-2 font-heading text-xl font-medium">
      <Icon className="size-4.5 text-muted-foreground" /> {title}
    </h2>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <SectionTitle icon={Tags} title="Hamyonlar va kategoriyalar" />
      <div className="grid gap-6 lg:grid-cols-3">
        <ListCardSkeleton rows={3} />
        <div className="lg:col-span-2">
          <ListCardSkeleton rows={6} />
        </div>
      </div>
      <SectionTitle icon={Palette} title="Ko'rinish va xizmatlar" />
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

async function SettingsContent() {
  const result = await getSettingsOverview().then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => {
      // Login sahifasiga yo'naltirish kabi Next.js signallari xato emas — o'tkazib yuboriladi
      unstable_rethrow(error);
      return { ok: false as const, error };
    },
  );
  if (!result.ok) return <DatabaseProblem error={result.error} />;

  const { wallets, categories, hasUser, integrations } = result.data;

  return (
    <>
      {!hasUser && (
        <Card className="border-debt/30 bg-debt/5">
          <CardContent className="flex items-center gap-3 text-sm">
            <TerminalSquare className="size-5 shrink-0 text-debt" />
            <p>
              Baza ulangan, lekin akkaunt hali yaratilmagan. Terminalda{" "}
              <code className="font-mono font-medium">npm run setup</code> ni ishga tushiring.
            </p>
          </CardContent>
        </Card>
      )}

      <SectionTitle icon={Tags} title="Hamyonlar va kategoriyalar" />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <WalletsCard wallets={wallets} />
        <CategoriesCard categories={categories} className="lg:col-span-2" />
      </div>

      <SectionTitle icon={Palette} title="Ko'rinish va xizmatlar" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mavzu</CardTitle>
            <CardDescription>Shu brauzerda saqlanadi · yuqoridagi quyosh/oy tugmasi ham almashtiradi</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePicker />
          </CardContent>
        </Card>
        <AiCard ai={integrations.ai} />
        <AutomationCard integrations={integrations} />
      </div>
    </>
  );
}

function StatusBadge({ on, onText = "Ulangan", offText = "Ulanmagan" }: { on: boolean; onText?: string; offText?: string }) {
  return (
    <Badge variant="outline" className={on ? "border-income/30 bg-income/10 text-income" : "border-debt/30 bg-debt/10 text-debt"}>
      {on ? onText : offText}
    </Badge>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function AiCard({ ai }: { ai: SettingsOverview["integrations"]["ai"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4.5 text-primary" /> AI yordamchi
        </CardTitle>
        <CardDescription>Ma&apos;lumotlarni faqat o&apos;qiydi, faqat saytda ishlaydi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="Holati" value={<StatusBadge on={ai.configured} />} />
        <InfoRow label="Model" value={<code className="font-mono text-xs">{ai.model}</code>} />
        <InfoRow label="Saqlangan" value={`${ai.chats} ta suhbat, ${ai.insights} ta oylik tahlil`} />
        {!ai.configured && (
          <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
            Ulash: <code className="font-mono">.env.local</code> dagi <code className="font-mono">ANTHROPIC_API_KEY</code> ga Claude API
            kalitini yozing.
          </p>
        )}
        <ClearAiHistoryButton disabled={ai.chats + ai.insights === 0} />
      </CardContent>
    </Card>
  );
}

function AutomationCard({ integrations }: { integrations: SettingsOverview["integrations"] }) {
  const { bot, recurring } = integrations;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avtomatika</CardTitle>
        <CardDescription>Telegram bot va har oy o&apos;zi yoziladigan to&apos;lovlar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4 text-muted-foreground" /> Telegram bot
            </span>
            <StatusBadge on={bot.configured} />
          </div>
          <p className="text-xs text-muted-foreground">
            {bot.configured
              ? "Bot seansi xavfsizlik bo'limidagi seanslar ro'yxatida ko'rinadi."
              : "TELEGRAM_BOT_TOKEN va TELEGRAM_ALLOWED_USER_ID .env.local faylida to'ldirilmagan."}
          </p>
        </div>

        <Link
          href="/kirim-chiqim/takroriy"
          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
        >
          <Repeat className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Takroriy to&apos;lovlar</p>
            <p className="truncate text-xs text-muted-foreground">
              {recurring.active > 0
                ? `${recurring.active} ta faol · oyiga ${formatMoney(recurring.monthlyExpense)} chiqim`
                : "Ijara, internet, obunalar — hali qo'shilmagan"}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </CardContent>
    </Card>
  );
}

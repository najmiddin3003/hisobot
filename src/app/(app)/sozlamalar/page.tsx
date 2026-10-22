import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck, Tags, TerminalSquare } from "lucide-react";
import { ColorIcon } from "@/components/color-icon";
import { ComingSoon } from "@/components/coming-soon";
import { DatabaseProblem } from "@/components/database-problem";
import { PageHeader } from "@/components/page-header";
import { ListCardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettingsOverview } from "@/lib/data/settings";
import type { WalletKind } from "@/lib/domain";

export const metadata: Metadata = { title: "Sozlamalar" };

const WALLET_KIND_LABELS: Record<WalletKind, string> = {
  naqd: "Naqd pul",
  karta: "Bank kartasi",
  boshqa: "Boshqa",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Sozlamalar" description="Kategoriyalar, hamyonlar, xavfsizlik va seanslar" />

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-3">
            <ListCardSkeleton rows={3} />
            <div className="lg:col-span-2">
              <ListCardSkeleton rows={6} />
            </div>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoon
          icon={ShieldCheck}
          title="Xavfsizlik va seanslar"
          description="Parol, Google Authenticator, zaxira kodlar va faol seanslarni boshqarish"
          stage={2}
        />
        <ComingSoon
          icon={Tags}
          title="Kategoriya va hamyonlarni tahrirlash"
          description="Yangi qo'shish, nomi, rangi, ikonkasi va bot uchun kalit so'zlar"
          stage={9}
        />
      </div>
    </>
  );
}

async function SettingsContent() {
  const result = await getSettingsOverview().then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  if (!result.ok) return <DatabaseProblem error={result.error} />;

  const { wallets, categories, hasUser } = result.data;
  const expenseCategories = categories.filter((c) => c.type === "chiqim");
  const incomeCategories = categories.filter((c) => c.type === "kirim");

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Hamyonlar</CardTitle>
            <CardDescription>{wallets.length} ta hamyon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center gap-3 rounded-lg border p-3">
                <ColorIcon icon={wallet.icon} color={wallet.color} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">{WALLET_KIND_LABELS[wallet.kind]}</p>
                </div>
              </div>
            ))}
            {wallets.length === 0 && <p className="text-sm text-muted-foreground">Hamyonlar yo&apos;q</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kategoriyalar</CardTitle>
            <CardDescription>
              {expenseCategories.length} ta chiqim, {incomeCategories.length} ta kirim
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CategoryGroup title="Chiqim" items={expenseCategories} />
            <CategoryGroup title="Kirim" items={incomeCategories} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CategoryGroup({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getSettingsOverview>>["categories"];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((category) => (
          <div key={category.id} className="flex items-center gap-3 rounded-lg border p-2.5">
            <ColorIcon icon={category.icon} color={category.color} className="size-8" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
            {category.isSystem && (
              <Badge variant="outline" className="text-[10px]">
                tizim
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

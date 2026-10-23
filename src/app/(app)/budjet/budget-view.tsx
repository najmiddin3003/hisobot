"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Banknote, Info, SlidersHorizontal, WalletCards } from "lucide-react";
import { ColorIcon } from "@/components/color-icon";
import { Money } from "@/components/money";
import { EntryEditorProvider, useEntryEditor } from "@/components/entries/entry-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { BudgetOverview, MonthHistory, WalletBalance } from "@/lib/data/budget";
import { MONTH_NAMES, currentMonthKey } from "@/lib/dates";
import { WALLET_KIND_LABELS } from "@/lib/domain";
import { formatAmount, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { BalanceForm } from "./balance-dialog";
import { SavingsChart } from "./savings-chart";


export function BudgetView({ data }: { data: BudgetOverview }) {
  return (
    <EntryEditorProvider options={data.options}>
      <BudgetBody data={data} />
    </EntryEditorProvider>
  );
}

function BudgetBody({ data }: { data: BudgetOverview }) {
  const editor = useEntryEditor();
  const [balanceWallet, setBalanceWallet] = useState<WalletBalance | null>(null);
  const positiveTotal = data.wallets.reduce((sum, w) => sum + Math.max(w.balance, 0), 0);

  const openSalary = () => {
    const month = MONTH_NAMES[Number(currentMonthKey().slice(5)) - 1].toLowerCase();
    editor.openNew("kirim", {
      title: "Oylik kiritish",
      categoryId: data.salaryCategoryId ?? undefined,
      note: `${month} oyligi`,
    });
  };

  return (
    <div className="space-y-6">
      {data.needsInitialBalances && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="text-primary" />
          <AlertDescription>
            Boshlash uchun har bir hamyon kartochkasida <b>«Qoldiqni kiritish»</b> ni bosib, unda hozir qancha pul
            borligini yozing. Shundan keyin jami budjet to&apos;g&apos;ri hisoblanadi.
          </AlertDescription>
        </Alert>
      )}

      <TotalCard data={data} onSalary={openSalary} onTransfer={() => editor.openNew("otkazma")} />

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">Hamyonlar</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              positiveTotal={positiveTotal}
              onAdjust={() => setBalanceWallet(wallet)}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Jamg&apos;arma o&apos;sishi</CardTitle>
            <CardDescription>Har oy oxiridagi jami pul</CardDescription>
          </CardHeader>
          <CardContent>
            <SavingsChart history={data.history} />
          </CardContent>
        </Card>
        <HistoryCard history={data.history} className="lg:col-span-2" />
      </div>

      <Dialog open={balanceWallet !== null} onOpenChange={(open) => !open && setBalanceWallet(null)}>
        <DialogContent className="sm:max-w-md">
          {balanceWallet && (
            <BalanceForm key={balanceWallet.id} wallet={balanceWallet} onDone={() => setBalanceWallet(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** O'zgarish: foiz (boshlang'ich qoldiq musbat bo'lsa) yoki so'mdagi farq */
function ChangeBadge({ value, delta }: { value: number | null; delta: number }) {
  if (value === null && delta === 0) return null;
  const up = (value ?? delta) >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        up ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
      )}
    >
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {value === null ? formatAmount(delta) : `${Math.abs(value).toFixed(1).replace(".", ",")}%`}
    </span>
  );
}

function TotalCard({
  data,
  onSalary,
  onTransfer,
}: {
  data: BudgetOverview;
  onSalary: () => void;
  onTransfer: () => void;
}) {
  const positive = data.wallets.filter((w) => w.balance > 0);
  const positiveTotal = positive.reduce((sum, w) => sum + w.balance, 0);

  return (
    <Card tone="olive" className="py-6">
      <CardContent className="space-y-6 px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <WalletCards className="size-4" /> Jami budjet — barcha hamyonlardagi pul
            </p>
            <Money amount={data.total} className={cn("block text-[2.75rem] sm:text-6xl", data.total < 0 && "text-expense")} />
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ChangeBadge value={data.monthChange} delta={data.total - data.monthStartTotal} />
              <span>oy boshidan beri ({formatMoney(data.monthStartTotal)} edi)</span>
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 md:w-52 md:grid-cols-1">
            <Button onClick={onSalary}>
              <Banknote /> Oylik kiritish
            </Button>
            <Button variant="outline" onClick={onTransfer}>
              <ArrowLeftRight /> O&apos;tkazma
            </Button>
          </div>
        </div>

        {positive.length > 1 && (
          <div className="space-y-2.5">
            {/* Ulush chizig'i: segmentlar orasida 2px bo'shliq, nom va foiz — afsonada */}
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {positive.map((w) => (
                <div
                  key={w.id}
                  title={`${w.name}: ${formatMoney(w.balance)}`}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(w.balance / positiveTotal) * 100}%`, backgroundColor: w.color }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {positive.map((w) => (
                <span key={w.id} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: w.color }} />
                  {w.name} · {Math.round((w.balance / positiveTotal) * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Oy boshida", value: formatMoney(data.monthStartTotal), className: "" },
            { label: "Bu oy kirim", value: formatMoney(data.monthIncome, { sign: true }), className: "text-income" },
            { label: "Bu oy chiqim", value: formatMoney(-data.monthExpense), className: "text-expense" },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("mt-1 truncate text-sm font-semibold sm:text-base", item.className)} title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WalletCard({
  wallet,
  positiveTotal,
  onAdjust,
}: {
  wallet: WalletBalance;
  positiveTotal: number;
  onAdjust: () => void;
}) {
  // Ulush — musbat qoldiqlar yig'indisiga nisbatan (manfiy hamyon bo'lsa ham 100% dan oshmaydi)
  const share = positiveTotal > 0 && wallet.balance > 0 ? Math.round((wallet.balance / positiveTotal) * 100) : 0;
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <ColorIcon icon={wallet.icon} color={wallet.color} className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{wallet.name}</p>
            <p className="text-xs text-muted-foreground">{WALLET_KIND_LABELS[wallet.kind]}</p>
          </div>
          {share > 0 && <span className="text-xs font-medium text-muted-foreground">{share}%</span>}
        </div>
        <Money amount={wallet.balance} className={cn("block truncate text-[1.75rem]", wallet.balance < 0 && "text-expense")} />
        <div className="flex gap-3 text-xs">
          <span className="text-income">+{formatMoney(wallet.monthIn)}</span>
          <span className="text-expense">−{formatMoney(wallet.monthOut)}</span>
          <span className="text-muted-foreground">bu oy</span>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onAdjust}>
          <SlidersHorizontal /> Qoldiqni kiritish
        </Button>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ history, className }: { history: MonthHistory[]; className?: string }) {
  const rows = [...history].reverse();
  return (
    <Card className={cn("gap-0 pb-0", className)}>
      <CardHeader className="border-b">
        <CardTitle>Oylar tarixi</CardTitle>
        <CardDescription>Oy boshi → oy oxiri</CardDescription>
      </CardHeader>
      <div className="max-h-80 divide-y overflow-y-auto">
        {rows.map((row) => (
          <div key={row.month} className="space-y-1.5 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{row.label}</span>
              <ChangeBadge value={row.change} delta={row.end - row.start} />
            </div>
            <p className="text-sm tabular-nums">
              <span className="text-muted-foreground">{formatMoney(row.start)}</span>
              <span className="px-1.5 text-muted-foreground">→</span>
              <span className="font-semibold">{formatMoney(row.end)}</span>
            </p>
            <p className="flex gap-3 text-xs tabular-nums">
              <span className="text-income">+{formatMoney(row.income)}</span>
              <span className="text-expense">−{formatMoney(row.expense)}</span>
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

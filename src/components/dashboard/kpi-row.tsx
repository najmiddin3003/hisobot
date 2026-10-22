import { Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/money";

/** To'rtta asosiy ko'rsatkich, har biri o'tgan oyga nisbatan */
export function KpiRow({ data }: { data: Dashboard }) {
  const compare = `${data.prevLabel}ga nisbatan`;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Kirim"
        value={formatMoney(data.income.value)}
        icon={TrendingUp}
        tone="income"
        change={data.income.change}
        hint={compare}
        detail={data.income.debt > 0 ? `Shundan qarz/kredit: ${formatMoney(data.income.debt)}` : undefined}
      />
      <StatCard
        label="Chiqim"
        value={formatMoney(data.expense.value)}
        icon={TrendingDown}
        tone="expense"
        upIsGood={false}
        change={data.expense.change}
        hint={compare}
        detail={data.expense.debt > 0 ? `Shundan qarz/kredit: ${formatMoney(data.expense.debt)}` : undefined}
      />
      <StatCard
        label="Sof natija"
        value={formatMoney(data.net.value, { sign: true })}
        icon={Scale}
        tone="primary"
        hint={`${data.prevLabel}: ${formatMoney(data.net.previous, { sign: true })}`}
        detail="Kirim − chiqim"
      />
      <StatCard
        label="Jami budjet"
        value={formatMoney(data.budget.value)}
        icon={Wallet}
        tone="receivable"
        change={data.budget.change}
        hint={data.isCurrentMonth ? "Hozir, barcha hamyonlarda" : `${data.monthLabel} oxirida`}
      />
    </div>
  );
}

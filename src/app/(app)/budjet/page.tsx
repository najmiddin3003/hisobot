import type { Metadata } from "next";
import { ArrowLeftRight, PiggyBank, Wallet } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Budjet" };

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budjet" description="Hozir qancha pulingiz bor va jamg'arma qanday o'syapti" />
      <ComingSoon
        icon={Wallet}
        title="Jami pul va hamyonlar"
        description="Naqd, Uzcard, Humo — har birining qoldig'i va 💰 Oylik kiritish tugmasi"
        stage={4}
        className="min-h-56"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoon
          icon={PiggyBank}
          title="Jamg'arma tarixi"
          description="Oy boshi va oxiridagi qoldiq, o'zgarish foizi va 12 oylik grafik"
          stage={4}
        />
        <ComingSoon
          icon={ArrowLeftRight}
          title="Hamyonlar o'rtasida o'tkazma"
          description="Kartadan naqd yechish kabi amallar — kirim-chiqimga ta'sir qilmaydi"
          stage={4}
        />
      </div>
    </>
  );
}

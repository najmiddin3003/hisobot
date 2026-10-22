import type { Metadata } from "next";
import { ArrowLeftRight, Repeat } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Kirim-chiqim" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader title="Kirim-chiqim" description="Barcha kirim va chiqimlar sana-vaqti va manbasi bilan" />
      <ComingSoon
        icon={ArrowLeftRight}
        title="Yozuvlar ro'yxati"
        description="Kunlar bo'yicha guruhlangan kartochkalar, filtrlar, qo'shish va tahrirlash, savatcha"
        stage={3}
        className="min-h-72"
      />
      <ComingSoon
        icon={Repeat}
        title="Takroriy to'lovlar"
        description="Ijara, internet, obunalar — har oy belgilangan kunda avtomatik qo'shiladi"
        stage={3}
      />
    </>
  );
}

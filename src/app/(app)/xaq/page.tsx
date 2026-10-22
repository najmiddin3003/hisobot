import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Xaq" };

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader title="Xaq" description="Sizga qarzdor bo'lganlar: siz bergan qarzlar" />
      <ComingSoon
        icon={Handshake}
        title="Bergan qarzlaringiz"
        description="Kimga, qancha, qancha qaytardi, qolgani va muddati o'tganlar qizil belgi bilan"
        stage={5}
        className="min-h-72"
      />
    </>
  );
}

import type { Metadata } from "next";
import { HandCoins, Landmark } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Qarzlar" };

export default function DebtsPage() {
  return (
    <>
      <PageHeader
        title="Qarzlar"
        description="Siz qarzdor bo'lganlar: odamlardan olingan qarzlar va kreditlar"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoon
          icon={HandCoins}
          title="Odamlardan olingan qarzlar"
          description="Jami, to'langan, qolgan, muddat va qisman qaytarishlar tarixi"
          stage={5}
          className="min-h-64"
        />
        <ComingSoon
          icon={Landmark}
          title="Kreditlar"
          description="Oylik to'lov, qolgan qarz, keyingi to'lov sanasi va necha oy qolgani"
          stage={5}
          className="min-h-64"
        />
      </div>
    </>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { DebtsSkeleton } from "@/components/debts/debts-skeleton";
import { DebtsView } from "@/components/debts/debts-view";
import { PageHeader } from "@/components/page-header";
import { getDebtsPage } from "@/lib/data/debts";

export const metadata: Metadata = { title: "Qarzlar" };

export default function DebtsPage() {
  return (
    <>
      <PageHeader
        title="Qarzlar"
        description="Siz qarzdor bo'lganlar: odamlardan olingan qarzlar va kreditlar"
      />
      <Suspense fallback={<DebtsSkeleton />}>
        <DebtsContent />
      </Suspense>
    </>
  );
}

async function DebtsContent() {
  return <DebtsView direction="olingan" data={await getDebtsPage("olingan")} />;
}

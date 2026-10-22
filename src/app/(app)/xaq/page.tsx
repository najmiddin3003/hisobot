import { Suspense } from "react";
import type { Metadata } from "next";
import { DebtsSkeleton } from "@/components/debts/debts-skeleton";
import { DebtsView } from "@/components/debts/debts-view";
import { PageHeader } from "@/components/page-header";
import { getDebtsPage } from "@/lib/data/debts";

export const metadata: Metadata = { title: "Xaq" };

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader title="Xaq" description="Sizga qarzdor bo'lganlar: siz bergan qarzlar" />
      <Suspense fallback={<DebtsSkeleton />}>
        <ReceivablesContent />
      </Suspense>
    </>
  );
}

async function ReceivablesContent() {
  return <DebtsView direction="berilgan" data={await getDebtsPage("berilgan")} />;
}

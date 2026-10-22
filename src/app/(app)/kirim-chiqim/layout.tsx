import { PageHeader } from "@/components/page-header";
import { SubNav } from "./sub-nav";

export default function EntriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Kirim-chiqim" description="Barcha kirim va chiqimlar sana-vaqti va manbasi bilan" />
      <SubNav />
      {children}
    </>
  );
}

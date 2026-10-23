import { Coins, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Coins className="size-6" />
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-3xl font-medium tracking-[-0.02em]">Hisob</p>
          <p className="text-sm text-muted-foreground">Shaxsiy moliya</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Ikki bosqichli himoya · barcha kirishlar qayd etiladi
      </p>
    </div>
  );
}

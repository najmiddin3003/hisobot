import { DatabaseZap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MissingDatabaseUriError } from "@/lib/db";

/** Baza sozlanmagan yoki ulanib bo'lmaganda nima qilish kerakligini ko'rsatadi */
export function DatabaseProblem({ error }: { error: unknown }) {
  const missingUri = error instanceof MissingDatabaseUriError;

  return (
    <Card className="border-expense/30 bg-expense/5">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-expense/10 text-expense">
          <DatabaseZap className="size-5" />
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-base font-medium">
            {missingUri ? "MongoDB hali ulanmagan" : "MongoDB'ga ulanib bo'lmadi"}
          </p>
          {missingUri ? (
            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                Loyiha papkasidagi <code className="font-mono text-foreground">.env.local</code> faylida{" "}
                <code className="font-mono text-foreground">MONGODB_URI</code> ni to&apos;ldiring
              </li>
              <li>
                Terminalda <code className="font-mono text-foreground">npm run setup</code> ni ishga tushiring
              </li>
              <li>Serverni qayta ishga tushiring</li>
            </ol>
          ) : (
            <>
              <p className="font-mono text-xs break-all text-muted-foreground">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <p className="text-muted-foreground">
                MongoDB Atlas&apos;da <b>Network Access</b> bo&apos;limida IP manzilingizga ruxsat berilganini va
                ulanish manzilidagi parol to&apos;g&apos;riligini tekshiring.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

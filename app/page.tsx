import { TpmPlanner } from "@/components/tpm/tpm-planner";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-muted/40">
      <div className="mx-auto max-w-[1520px] px-4 py-4">
        <div className="mb-3 rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-lg font-semibold tracking-tight">
                Trade Promotion Management
              </div>
              <div className="text-sm text-muted-foreground">
                Fiscal grid (4-4-5) • Budget/Actuals read-only • Forecast editable by promo mechanics
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: expand/collapse Forecast Cases to edit promo breakdown
            </div>
          </div>
        </div>
        <TpmPlanner />
      </div>
    </main>
  );
}
import { TpmPlanner } from "@/components/tpm/tpm-planner";

export default function Home() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="mb-3">
          <div className="text-lg font-semibold">Trade Promotion Management — Planner</div>
          <div className="text-sm text-muted-foreground">
            High-density fiscal grid (4-4-5) • Budget/Actuals read-only • Forecast editable by promo mechanics
          </div>
        </div>
        <TpmPlanner />
      </div>
    </main>
  );
}
import { TpmPlanner } from "@/components/tpm/tpm-planner";
import { KpiCard } from "@/components/ui/kpi-card";
import { createPublix2026Mock } from "@/lib/tpm/mockPublix2026";
import { formatNumber, sum } from "@/lib/tpm/fiscal";

export default function GridPage() {
  // MVP visuals: use existing mock until DB-backed rollups land.
  const mock = createPublix2026Mock();
  const sales = mock.sales.actual;
  const spend = mock.spend.actual;
  const vol = mock.volume.actual;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-lg font-semibold tracking-tight">Retailer KPI Forecast Grid</div>
            <div className="text-sm text-muted-foreground">
              4-4-5 periods • Budget/Actuals locked • Forecast input via promo mechanics
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: expand/collapse Forecast Cases to edit promo breakdown
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          title="Sales YTD"
          value={formatNumber(sum(sales), { style: "currency" })}
          sublabel="Actuals (mock)"
          deltaPct={2.8}
          spark={sales}
          accent="sky"
        />
        <KpiCard
          title="Volume YTD"
          value={formatNumber(sum(vol), { style: "number" })}
          sublabel="Cases (mock)"
          deltaPct={-1.4}
          spark={vol}
          accent="emerald"
        />
        <KpiCard
          title="Trade Spend YTD"
          value={formatNumber(sum(spend), { style: "currency" })}
          sublabel="DA + Scan Back (mock)"
          deltaPct={1.1}
          spark={spend}
          accent="indigo"
        />
      </div>

      <TpmPlanner />
    </div>
  );
}


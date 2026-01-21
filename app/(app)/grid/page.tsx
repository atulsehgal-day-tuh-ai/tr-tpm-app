export default function GridPage() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-lg font-semibold tracking-tight">
              Retailer KPI Forecast Grid
            </div>
            <div className="text-sm text-muted-foreground">
              4-4-5 periods • Budget/Actuals locked • Forecast input via promo mechanics
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: expand/collapse Forecast Cases to edit promo breakdown
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground shadow-sm">
        Debug mode: grid temporarily disabled while we isolate a client-side crash (React error #310).
      </div>
    </div>
  );
}


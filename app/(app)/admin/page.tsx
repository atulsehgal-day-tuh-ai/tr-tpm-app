import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="text-lg font-semibold tracking-tight">Admin</div>
        <div className="text-sm text-muted-foreground">
          Master data, fiscal calendar, promo governance, and org hierarchy.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card
          title="Fiscal Calendar (4-4-5)"
          desc="Define week boundaries and map weeks to P1–P12/P13 (retroactive truth)."
          href="/admin/calendar"
        />
        <Card
          title="Account → Division mapping"
          desc="Normalize weekly uploads into Retailer → Division rollups."
          href="/admin/account-division"
        />
        <Card
          title="Promo Types"
          desc="Manage promo type master list used across planning and validation."
          href="/admin/promo-types"
        />
        <Card
          title="Promo Type Applicability"
          desc="Map allowed promo types by Retailer/Division."
          href="/admin/promo-applicability"
        />
        <Card
          title="Team Hierarchy (Manager → Reports)"
          desc="Enable manager-level rollups + drilldowns on Insights."
          href="/admin/org"
        />
        <Card
          title="Uploads"
          desc="Upload Actuals (Circana), Budget, and Promotions. Data populates the DB with validations."
          href="/admin/uploads"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border bg-white p-4 shadow-sm hover:bg-muted/20">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</div>
      <div className="mt-3 text-xs font-medium text-primary">Open →</div>
    </Link>
  );
}


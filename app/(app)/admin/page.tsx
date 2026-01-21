import Link from "next/link";
import { CalendarDays, Upload, Shield, Users, SlidersHorizontal, Tags } from "lucide-react";

export default function AdminHome() {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border bg-white/75 px-5 py-4 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-sky-200 blur-3xl" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-emerald-200 blur-3xl" />
        </div>
        <div className="relative">
          <div className="text-2xl font-semibold tracking-tight">Admin</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Configure the 4‑4‑5 calendar, master data, promo rules, uploads, and team hierarchy.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card
          icon={<CalendarDays className="h-5 w-5" />}
          title="Fiscal Calendar (4-4-5)"
          desc="Define week boundaries and map weeks to P1–P12/P13 (retroactive truth)."
          href="/admin/calendar"
        />
        <Card
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Account → Division mapping"
          desc="Normalize weekly uploads into Retailer → Division rollups."
          href="/admin/account-division"
        />
        <Card
          icon={<Tags className="h-5 w-5" />}
          title="Promo Types"
          desc="Manage promo type master list used across planning and validation."
          href="/admin/promo-types"
        />
        <Card
          icon={<Shield className="h-5 w-5" />}
          title="Promo Type Applicability"
          desc="Map allowed promo types by Retailer/Division."
          href="/admin/promo-applicability"
        />
        <Card
          icon={<Users className="h-5 w-5" />}
          title="Team Hierarchy (Manager → Reports)"
          desc="Enable manager-level rollups + drilldowns on Insights."
          href="/admin/org"
        />
        <Card
          icon={<Upload className="h-5 w-5" />}
          title="Uploads"
          desc="Upload Actuals (Circana), Budget, and Promotions. Data populates the DB with validations."
          href="/admin/uploads"
        />
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur transition-shadow hover:bg-white/80 hover:shadow-md"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40 text-foreground">
              {icon}
            </span>
            <div className="text-base font-semibold tracking-tight">{title}</div>
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</div>
        </div>
        <div className="text-sm font-semibold text-primary opacity-80 group-hover:opacity-100">
          Open →
        </div>
      </div>
    </Link>
  );
}


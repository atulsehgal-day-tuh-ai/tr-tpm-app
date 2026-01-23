"use client";

import Link from "next/link";
import { LayoutGrid, LineChart, Shield } from "lucide-react";

function Card({
  title,
  href,
  icon,
  tone,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "indigo";
}) {
  const toneStyles =
    tone === "emerald"
      ? { bar: "from-emerald-500 via-emerald-400 to-emerald-300", ring: "ring-emerald-400/25" }
      : tone === "indigo"
      ? { bar: "from-indigo-500 via-indigo-400 to-indigo-300", ring: "ring-indigo-400/25" }
      : { bar: "from-sky-500 via-cyan-400 to-emerald-400", ring: "ring-sky-400/25" };

  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-3xl border bg-white/80 p-7 shadow-sm backdrop-blur",
        "hover:bg-white/90 hover:shadow-md transition-shadow",
        "ring-1 ring-transparent",
        toneStyles.ring,
      ].join(" ")}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneStyles.bar}`} />
      <div className="flex items-center justify-between gap-4">
        <div className="text-2xl font-semibold tracking-tight">{title}</div>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-foreground group-hover:bg-muted/60">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-sm font-semibold text-primary">Open →</div>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/75 px-5 py-4 shadow-sm backdrop-blur">
        <div className="text-3xl font-semibold tracking-tight">Leading Indicators</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Grid" href="/grid" icon={<LayoutGrid className="h-6 w-6" />} tone="sky" />
        <Card title="Insights" href="/insights" icon={<LineChart className="h-6 w-6" />} tone="emerald" />
        <Card title="Admin" href="/admin" icon={<Shield className="h-6 w-6" />} tone="indigo" />
      </div>
    </div>
  );
}


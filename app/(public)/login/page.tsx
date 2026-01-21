"use client";

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthRuntime } from "@/components/auth/auth-runtime";
import { Droplets, LineChart, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const auth = useAuthRuntime();
  const { instance, accounts } = useMsal();

  const isAuthed = (accounts?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
            Talking Rain • Retailer KPI Forecast
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Trade Planning,
            <span className="bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              {" "}
              without broken spreadsheets
            </span>
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Forecast Cases, DA (Depletion Allowance), and Scan Back across a 4‑4‑5 calendar. Upload Actuals and
            Promotions, then review KPIs by Retailer → Division → PPG with manager/team rollups.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              className={cn("min-w-[160px]")}
              onClick={async () => {
                if (auth.status !== "ready") {
                  window.location.href = "/grid";
                  return;
                }
                if (!isAuthed) {
                  await instance.loginPopup(loginRequest);
                }
                window.location.href = "/grid";
              }}
            >
              {auth.status !== "ready" ? "Open app" : isAuthed ? "Open dashboard" : "Sign in"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/grid")}
            >
              View grid
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature icon={<Sparkles className="h-4 w-4" />} title="4‑4‑5 periods" detail="Fast rollups by period and quarter." />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Locked logic" detail="Only forecast inputs are editable." />
            <Feature icon={<LineChart className="h-4 w-4" />} title="KPI visuals" detail="Trends + quarterly dashboards." />
          </div>
        </div>

        <div className="w-full max-w-xl">
          <div className="relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-200 blur-3xl" />
              <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-emerald-200 blur-3xl" />
              <div className="absolute bottom-0 left-16 h-64 w-64 rounded-full bg-indigo-100 blur-3xl" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-sky-600" />
                <div className="text-base font-semibold tracking-tight">Welcome</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Sign in to unlock uploads, admin mappings, and manager/team rollups.
              </div>
              <div className="mt-6 rounded-2xl border bg-white/80 p-4">
                <div className="text-xs font-medium text-muted-foreground">Quick start</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                    Upload Actuals (Circana) + Promotions + Budget.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    Map accounts → divisions + promo type rules (Admin).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                    Forecast volume and review KPI trends + quarters.
                  </li>
                </ul>
              </div>

              {auth.status !== "ready" ? (
                <div className="mt-4 text-xs text-amber-800">
                  Auth isn’t configured for this environment yet. You can still explore the UI, but admin APIs will be restricted.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur hover:bg-white/80">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-foreground">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}


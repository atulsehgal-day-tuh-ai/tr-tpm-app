"use client";

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { instance, accounts } = useMsal();

  const isAuthed = (accounts?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Talking Rain • Trade Promotion Management
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Retailer KPI Forecast Model
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A spreadsheet-fast experience for forecasting volume and viewing KPIs—without risking broken formulas.
            Built for sparkling water and probiotic beverage teams that need clarity, not chaos.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              className={cn("min-w-[160px]")}
              onClick={async () => {
                if (isAuthed) return;
                await instance.loginPopup(loginRequest);
                window.location.href = "/grid";
              }}
            >
              {isAuthed ? "Continue" : "Sign in with Azure AD"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/grid")}
            >
              Go to app
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature title="4-4-5 periods" detail="Period-grain budgeting, forecasting, and KPI rollups." />
            <Feature title="Locked formulas" detail="Only forecast inputs are editable; everything else derives." />
            <Feature title="Team rollups" detail="Managers see totals for their team and drill into individuals." />
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
              <div className="text-sm font-semibold tracking-tight">Welcome</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Sign in to load your retailers, divisions, promo types, and forecasts.
              </div>
              <div className="mt-6 rounded-2xl border bg-white/80 p-4">
                <div className="text-xs font-medium text-muted-foreground">What you’ll do here</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                    Edit forecast volume at the 4-4-5 period level.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    Compare Budget vs Actuals vs Forecast with instant totals.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                    Review quarterly rollups and drilldowns by team.
                  </li>
                </ul>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Note: If Azure AD is not configured, the app will run in a “no-auth” mode (for dev).
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}


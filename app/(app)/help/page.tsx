"use client";

import * as React from "react";
import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-3">
      <div className="text-xs font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-lg font-semibold tracking-tight">Help</div>
            <div className="text-sm text-muted-foreground">
              A quick guide to how <span className="font-medium text-foreground">Grid</span> and{" "}
              <span className="font-medium text-foreground">Insights</span> work.
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: keep this open while testing new flows
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section title="Workflow: Draft vs Submit">
          <Callout title="Draft (Save Draft)">
            Use <span className="font-medium text-foreground">Save Draft</span> to save your latest forecast safely
            without finalizing it. This prevents losing changes and is safe to do often.
          </Callout>
          <Callout title="Submit (Final)">
            Use <span className="font-medium text-foreground">Submit</span> when you’re ready to finalize. Submitting
            creates an auditable snapshot (who/when) and is the “official” version.
          </Callout>
          <div>
            <div className="text-xs font-semibold tracking-tight text-foreground">Important</div>
            <ul className="mt-1 list-disc pl-5">
              <li>
                <span className="font-medium text-foreground">Insights updates after you Save Draft</span> (not on
                every keystroke).
              </li>
              <li>Grid may show “Unsaved changes” until you Save Draft.</li>
            </ul>
          </div>
        </Section>

        <Section title="Current Year tracking (Actuals + Forecast)">
          <div>
            Current Year (CY) is tracked as:
            <div className="mt-2 rounded-lg border bg-white p-3 text-xs">
              <div className="font-semibold text-foreground">CY = Actuals through last completed week + Forecast through year-end</div>
              <div className="mt-1 text-muted-foreground">
                On charts, the CY line is <span className="font-medium text-foreground">solid</span> up to the cutoff
                and <span className="font-medium text-foreground">dashed</span> after (forecast).
              </div>
            </div>
          </div>
          <div>
            The cutoff uses a <span className="font-medium text-foreground">week ending Sunday</span> convention and is
            shown as a vertical marker on the chart.
          </div>
        </Section>

        <Section title="Views: Period / Quarter / Annual">
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">Period</span>: P1–P12 (4‑4‑5 fiscal periods)
            </li>
            <li>
              <span className="font-medium text-foreground">Quarter</span>: Q1–Q4
            </li>
            <li>
              <span className="font-medium text-foreground">Annual</span>: FY summary KPIs
            </li>
          </ul>
          <div>
            In Period/Quarter, you can switch <span className="font-medium text-foreground">Bucket</span> vs{" "}
            <span className="font-medium text-foreground">Cumulative</span> to see pacing (YTD style).
          </div>
        </Section>

        <Section title="Team scope (Me / My Team / Report)">
          <div>
            At the top of Insights, use <span className="font-medium text-foreground">Team scope</span> to select:
          </div>
          <ul className="list-disc pl-5">
            <li>Me</li>
            <li>My Team (rollup)</li>
            <li>Any direct report</li>
          </ul>
          <div>
            Team scope is driven by mappings in{" "}
            <Link className="text-primary hover:underline" href="/admin/org">
              Admin → Team Hierarchy
            </Link>
            .
          </div>
        </Section>
      </div>

      <Section title="FAQs">
        <div>
          <div className="text-xs font-semibold tracking-tight text-foreground">Why doesn’t Insights match what I just typed in the Grid?</div>
          <div className="mt-1">
            Insights reflects the <span className="font-medium text-foreground">latest saved Draft</span>. Click{" "}
            <span className="font-medium text-foreground">Save Draft</span> in Grid to update Insights.
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-tight text-foreground">What does the dashed part of the CY line mean?</div>
          <div className="mt-1">It indicates the forecast portion (after the actuals cutoff week).</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-tight text-foreground">Where do Actuals/Budget/Planned come from?</div>
          <div className="mt-1">
            These are ingested via{" "}
            <Link className="text-primary hover:underline" href="/admin/uploads">
              Admin → Uploads
            </Link>{" "}
            (Circana actuals, budget, promotions).
          </div>
        </div>
      </Section>
    </div>
  );
}


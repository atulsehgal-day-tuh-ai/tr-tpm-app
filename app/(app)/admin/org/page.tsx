"use client";

import * as React from "react";
import Link from "next/link";
import { useIdToken } from "@/components/auth/use-id-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrgMapping = {
  id: string;
  manager_email: string;
  report_email: string;
  created_at: string;
};

export default function AdminOrgPage() {
  const { token } = useIdToken();
  const [mappings, setMappings] = React.useState<OrgMapping[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [managerEmail, setManagerEmail] = React.useState("");
  const [reportEmail, setReportEmail] = React.useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/org", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setMappings(data.mappings);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function addMapping() {
    setError(null);
    try {
      const res = await fetch("/api/admin/org", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ managerEmail, reportEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      setManagerEmail("");
      setReportEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/org/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight">Team Hierarchy</div>
          <div className="text-sm text-muted-foreground">
            Map who reports to who (by email). Insights uses this to show manager rollups and drilldowns.
          </div>
        </div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Admin
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold tracking-tight">Add mapping</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input
            placeholder="Manager email"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
          />
          <Input
            placeholder="Report email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
          />
          <Button
            onClick={addMapping}
            disabled={!managerEmail.trim() || !reportEmail.trim() || managerEmail.trim() === reportEmail.trim()}
          >
            Save
          </Button>
        </div>
        {error ? <div className="mt-3 text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Mappings</div>
            <div className="text-xs text-muted-foreground">
              Stored in Postgres and audited. Use this to enable manager rollups.
            </div>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Manager</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Report</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2 text-xs">{m.manager_email}</td>
                  <td className="px-4 py-2 text-xs">{m.report_email}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="secondary" onClick={() => remove(m.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={3}>
                    No mappings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


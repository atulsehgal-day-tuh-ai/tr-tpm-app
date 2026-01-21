"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdToken } from "@/components/auth/use-id-token";

type UploadKind = "actuals_circana" | "promotions" | "budget";

type BatchRow = {
  id: string;
  kind: UploadKind;
  original_filename: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
  status: "processing" | "processed" | "failed";
  row_count: number;
  error_count: number;
};

export default function AdminUploadsPage() {
  const { token } = useIdToken();
  const [kind, setKind] = React.useState<UploadKind>("actuals_circana");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [batches, setBatches] = React.useState<BatchRow[]>([]);

  async function loadBatches() {
    setError(null);
    try {
      const res = await fetch("/api/admin/uploads", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load batches");
      setBatches(data.batches);
    } catch (e: any) {
      setError(e?.message || "Failed to load batches");
    }
  }

  React.useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");
      setFile(null);
      await loadBatches();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight">Uploads</div>
          <div className="text-sm text-muted-foreground">
            Admin uploads CSVs here; the app parses and populates Postgres (with validations + audit).
          </div>
        </div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Admin
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold tracking-tight">Upload a CSV</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as UploadKind)}
          >
            <option value="actuals_circana">Actuals (Circana, weekly wide)</option>
            <option value="promotions">Planned/Active/Ended Promotions</option>
            <option value="budget">Budget (Annual Plan)</option>
          </select>
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={upload} disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
          <Button variant="secondary" onClick={loadBatches} disabled={busy}>
            Refresh
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Actuals file is currently expected in Circana format: columns like{" "}
          <span className="font-mono">Week Ending 01-07-24</span> that will be unpivoted into weekly facts.
        </div>

        {error ? <div className="mt-3 text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Recent batches</div>
            <div className="text-xs text-muted-foreground">
              This list refreshes automatically after each upload.
            </div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">When</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Kind</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">File</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Rows</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Errors</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2 text-xs">{new Date(b.uploaded_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{b.kind}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{b.original_filename || "—"}</td>
                  <td className="px-4 py-2 text-right text-xs tabular-nums">{b.row_count}</td>
                  <td className="px-4 py-2 text-right text-xs tabular-nums">{b.error_count}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    <span
                      className={
                        b.status === "processed"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800"
                          : b.status === "failed"
                          ? "rounded-full bg-red-50 px-2 py-0.5 text-red-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-amber-800"
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {batches.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    No upload batches yet.
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


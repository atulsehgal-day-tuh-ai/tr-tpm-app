"use client";

import * as React from "react";
import { useIdToken } from "@/components/auth/use-id-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type PromoType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function AdminPromoTypesPage() {
  const { token } = useIdToken();
  const [promoTypes, setPromoTypes] = React.useState<PromoType[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promo-types", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setPromoTypes(data.promoTypes);
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

  async function createPromoType() {
    setError(null);
    try {
      const res = await fetch("/api/admin/promo-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code, name, description }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Create failed");
      setCode("");
      setName("");
      setDescription("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    }
  }

  async function deletePromoType(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/promo-types/${id}`, {
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
          <div className="text-lg font-semibold tracking-tight">Promo Types</div>
          <div className="text-sm text-muted-foreground">
            Admin-managed master list used in the grid and for upload validation.
          </div>
        </div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Admin
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold tracking-tight">Add Promo Type</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input placeholder="Code (e.g., B2G1)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Name (e.g., Buy 2 Get 1)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button onClick={createPromoType} disabled={!code.trim() || !name.trim()}>
            Create
          </Button>
        </div>
        {error ? <div className="mt-3 text-xs text-red-600">{error}</div> : null}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Current promo types</div>
            <div className="text-xs text-muted-foreground">
              Seeded after resets; safe to edit for your real list.
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
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Code</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Description</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoTypes.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 text-xs font-medium">{p.code}</td>
                  <td className="px-4 py-2 text-xs">{p.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{p.description || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="secondary" onClick={() => deletePromoType(p.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {promoTypes.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={4}>
                    No promo types found.
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


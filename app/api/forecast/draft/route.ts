import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const retailer = (body?.retailer || "").trim();
  const division = (body?.division || "").trim();
  const year = Number(body?.year);
  const data = body?.data;

  if (!retailer || !division || !Number.isFinite(year) || !data) {
    return NextResponse.json({ ok: false, error: "Missing retailer/division/year/data" }, { status: 400 });
  }

  const pool = getPool();

  // Upsert the single active draft (partial unique index can't be referenced by ON CONFLICT).
  const updated = await pool.query(
    `
      UPDATE forecast_snapshot
      SET saved_at = NOW(), user_email = $2, data = $7::jsonb
      WHERE user_entra_oid = $1 AND retailer = $3 AND division = $4 AND year = $5 AND status = 'draft'
      RETURNING id, saved_at
    `,
    [user.entraOid, user.email || null, retailer, division, year, JSON.stringify(data)]
  );

  if (updated.rows[0]) {
    return NextResponse.json({ ok: true, draftId: updated.rows[0].id, savedAt: updated.rows[0].saved_at });
  }

  const id = crypto.randomUUID();
  const inserted = await pool.query(
    `
      INSERT INTO forecast_snapshot (id, user_entra_oid, user_email, retailer, division, year, status, saved_at, data)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft', NOW(), $7::jsonb)
      RETURNING id, saved_at
    `,
    [id, user.entraOid, user.email || null, retailer, division, year, JSON.stringify(data)]
  );

  return NextResponse.json({ ok: true, draftId: inserted.rows[0]?.id, savedAt: inserted.rows[0]?.saved_at });
}


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
  const ppg = (body?.ppg || "").trim() || "ALL";
  const year = Number(body?.year);

  if (!retailer || !division || !Number.isFinite(year)) {
    return NextResponse.json({ ok: false, error: "Missing retailer/division/year" }, { status: 400 });
  }

  const pool = getPool();

  const draft = await pool.query(
    `
      SELECT data
      FROM forecast_snapshot
      WHERE user_entra_oid = $1 AND retailer = $2 AND division = $3 AND year = $4 AND ppg = $5 AND status = 'draft'
      LIMIT 1
    `,
    [user.entraOid, retailer, division, year, ppg]
  );

  if (!draft.rows[0]) {
    return NextResponse.json({ ok: false, error: "No draft found. Save Draft first." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const inserted = await pool.query(
    `
      INSERT INTO forecast_snapshot (id, user_entra_oid, user_email, retailer, division, year, ppg, status, saved_at, submitted_at, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', NOW(), NOW(), $8::jsonb)
      RETURNING id, submitted_at
    `,
    [id, user.entraOid, user.email || null, retailer, division, year, ppg, JSON.stringify(draft.rows[0].data)]
  );

  return NextResponse.json({ ok: true, submittedId: inserted.rows[0]?.id, submittedAt: inserted.rows[0]?.submitted_at });
}


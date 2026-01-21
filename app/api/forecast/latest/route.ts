import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function qp(req: NextRequest, key: string) {
  return (req.nextUrl.searchParams.get(key) || "").trim();
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const retailer = qp(req, "retailer");
  const division = qp(req, "division");
  const ppg = qp(req, "ppg") || "ALL";
  const year = Number(qp(req, "year"));
  if (!retailer || !division || !Number.isFinite(year)) {
    return NextResponse.json({ ok: false, error: "Missing retailer/division/year" }, { status: 400 });
  }

  const pool = getPool();

  const draft = await pool.query(
    `
      SELECT id, status, saved_at, submitted_at, data
      FROM forecast_snapshot
      WHERE user_entra_oid = $1 AND retailer = $2 AND division = $3 AND year = $4 AND ppg = $5 AND status = 'draft'
      LIMIT 1
    `,
    [user.entraOid, retailer, division, year, ppg]
  );

  const submitted = await pool.query(
    `
      SELECT id, status, saved_at, submitted_at, data
      FROM forecast_snapshot
      WHERE user_entra_oid = $1 AND retailer = $2 AND division = $3 AND year = $4 AND ppg = $5 AND status = 'submitted'
      ORDER BY submitted_at DESC NULLS LAST, saved_at DESC
      LIMIT 1
    `,
    [user.entraOid, retailer, division, year, ppg]
  );

  return NextResponse.json({
    ok: true,
    draft: draft.rows[0]
      ? {
          id: draft.rows[0].id,
          savedAt: draft.rows[0].saved_at,
          data: draft.rows[0].data,
        }
      : null,
    submitted: submitted.rows[0]
      ? {
          id: submitted.rows[0].id,
          savedAt: submitted.rows[0].saved_at,
          submittedAt: submitted.rows[0].submitted_at,
          data: submitted.rows[0].data,
        }
      : null,
  });
}


import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function qp(req: NextRequest, key: string) {
  return (req.nextUrl.searchParams.get(key) || "").trim();
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const yearStr = qp(req, "year");
  const year = yearStr ? Number(yearStr) : null;

  const pool = getPool();

  const whereYear = year && Number.isFinite(year) ? "WHERE EXTRACT(YEAR FROM week_end_date) = $1" : "";
  const params = year && Number.isFinite(year) ? [year] : [];

  const geos = await pool.query(
    `
      SELECT geography
      FROM actuals_weekly_fact
      ${whereYear}
      GROUP BY geography
      ORDER BY geography ASC
      LIMIT 2000
    `,
    params
  );

  const prods = await pool.query(
    `
      SELECT product
      FROM actuals_weekly_fact
      ${whereYear}
      GROUP BY product
      ORDER BY product ASC
      LIMIT 2000
    `,
    params
  );

  return NextResponse.json({
    ok: true,
    retailerDivisions: geos.rows.map((r) => r.geography).filter(Boolean),
    ppgs: prods.rows.map((r) => r.product).filter(Boolean),
  });
}


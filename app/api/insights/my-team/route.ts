import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const managerEmail = (user.email || "").trim().toLowerCase();
  if (!managerEmail) {
    return NextResponse.json({ ok: false, error: "No email found in token for current user" }, { status: 400 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT id, manager_email, report_email, created_at
      FROM org_reporting_email
      WHERE manager_email = $1
      ORDER BY report_email ASC
    `,
    [managerEmail]
  );

  return NextResponse.json({
    ok: true,
    managerEmail,
    reports: rows.map((r) => ({ id: r.id, email: r.report_email })),
  });
}


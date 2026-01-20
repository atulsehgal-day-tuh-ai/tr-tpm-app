import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { writeAuditEvent } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Allow admins only (this is org master data).
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT id, manager_email, report_email, created_at
      FROM org_reporting_email
      ORDER BY manager_email ASC, report_email ASC
    `
  );
  return NextResponse.json({ ok: true, mappings: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { managerEmail?: string; reportEmail?: string };
  const managerEmail = (body.managerEmail || "").trim().toLowerCase();
  const reportEmail = (body.reportEmail || "").trim().toLowerCase();

  if (!managerEmail || !reportEmail) {
    return NextResponse.json(
      { ok: false, error: "managerEmail and reportEmail are required" },
      { status: 400 }
    );
  }
  if (managerEmail === reportEmail) {
    return NextResponse.json({ ok: false, error: "managerEmail cannot equal reportEmail" }, { status: 400 });
  }

  const pool = getPool();
  const id = crypto.randomUUID();

  const { rows } = await pool.query(
    `
      INSERT INTO org_reporting_email (id, manager_email, report_email)
      VALUES ($1, $2, $3)
      ON CONFLICT (manager_email, report_email) DO UPDATE SET manager_email = EXCLUDED.manager_email
      RETURNING id, manager_email, report_email, created_at
    `,
    [id, managerEmail, reportEmail]
  );

  await writeAuditEvent({
    actor_entra_oid: user.entraOid,
    actor_email: user.email,
    action: "UPSERT",
    entity_type: "org_reporting_email",
    entity_id: id,
    after: rows[0],
  });

  return NextResponse.json({ ok: true, mapping: rows[0] });
}


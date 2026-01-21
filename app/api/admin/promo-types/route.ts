import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { writeAuditEvent } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, code, name, description, created_at FROM promo_type ORDER BY code ASC"
  );
  return NextResponse.json({ ok: true, promoTypes: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { code?: string; name?: string; description?: string };
  const code = (body.code || "").trim();
  const name = (body.name || "").trim();
  const description = (body.description || "").trim();

  if (!code || !name) {
    return NextResponse.json({ ok: false, error: "code and name are required" }, { status: 400 });
  }

  const pool = getPool();
  const id = crypto.randomUUID();

  const { rows } = await pool.query(
    `
      INSERT INTO promo_type (id, code, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, code, name, description, created_at
    `,
    [id, code, name, description || null]
  );

  await writeAuditEvent({
    actor_entra_oid: user.entraOid,
    actor_email: user.email,
    action: "INSERT",
    entity_type: "promo_type",
    entity_id: id,
    after: rows[0],
  });

  return NextResponse.json({ ok: true, promoType: rows[0] });
}


import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { writeAuditEvent } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  const pool = getPool();
  const before = await pool.query("SELECT * FROM promo_type WHERE id = $1", [id]);
  await pool.query("DELETE FROM promo_type WHERE id = $1", [id]);

  await writeAuditEvent({
    actor_entra_oid: user.entraOid,
    actor_email: user.email,
    action: "DELETE",
    entity_type: "promo_type",
    entity_id: id,
    before: before.rows[0] ?? null,
  });

  return NextResponse.json({ ok: true });
}


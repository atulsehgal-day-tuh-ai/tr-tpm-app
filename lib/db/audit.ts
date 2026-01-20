import { getPool } from "@/lib/db";

export async function writeAuditEvent(event: {
  actor_entra_oid?: string;
  actor_email?: string;
  source?: "ui" | "upload" | "system";
  action: string;
  entity_type: string;
  entity_id?: string;
  correlation_id?: string;
  before?: any;
  after?: any;
  metadata?: any;
}) {
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO audit_log (
        id,
        actor_entra_oid,
        actor_email,
        source,
        action,
        entity_type,
        entity_id,
        correlation_id,
        before,
        after,
        metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
    `,
    [
      crypto.randomUUID(),
      event.actor_entra_oid ?? null,
      event.actor_email ?? null,
      event.source ?? "ui",
      event.action,
      event.entity_type,
      event.entity_id ?? null,
      event.correlation_id ?? null,
      event.before ?? null,
      event.after ?? null,
      event.metadata ?? null,
    ]
  );
}


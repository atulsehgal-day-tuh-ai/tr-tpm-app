import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getPool } from "@/lib/db";
import { writeAuditEvent } from "@/lib/db/audit";
import { normalizeHeader, parseMdy, parseMmDdYy, parseMoneyLike, parseNumberLike } from "@/lib/csv/utils";
import { findHeaderIndex, findHeaderIndexStartsWith } from "@/lib/csv/columns";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadKind = "actuals_circana" | "promotions" | "budget";

function mustString(v: any): string {
  return (v == null ? "" : String(v)).trim();
}

async function upsertAccount(pool: ReturnType<typeof getPool>, externalKey: string) {
  const key = externalKey.trim();
  if (!key) return;
  await pool.query(
    `
      INSERT INTO account (id, external_key, name, retailer_id)
      VALUES ($1, $2, NULL, NULL)
      ON CONFLICT (external_key) DO NOTHING
    `,
    [crypto.randomUUID(), key]
  );
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT id, kind, original_filename, uploaded_by_email, uploaded_at, status, row_count, error_count
      FROM upload_batch
      ORDER BY uploaded_at DESC
      LIMIT 50
    `
  );

  return NextResponse.json({ ok: true, batches: rows, viewer: user.email || user.entraOid });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") || "") as UploadKind;
  const file = form.get("file") as unknown as File | null;

  if (!kind || !["actuals_circana", "promotions", "budget"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const text = await file.text();
  const pool = getPool();
  const batchId = crypto.randomUUID();

  await pool.query(
    `
      INSERT INTO upload_batch (id, kind, original_filename, uploaded_by_email, status)
      VALUES ($1,$2,$3,$4,'processing')
    `,
    [batchId, kind, file.name || null, (user.email || "").toLowerCase() || null]
  );

  const correlationId = crypto.randomUUID();

  try {
    const records: string[][] = parse(text, {
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });

    if (records.length < 2) {
      throw new Error("CSV appears empty");
    }

    const header = records[0].map((h) => normalizeHeader(String(h)));
    const rows = records.slice(1);

    let rowCount = 0;
    let errorCount = 0;

    const addError = async (rowNumber: number | null, message: string, rowJson: any) => {
      errorCount++;
      await pool.query(
        `INSERT INTO upload_error (id, batch_id, row_number, message, row_json) VALUES ($1,$2,$3,$4,$5)`,
        [crypto.randomUUID(), batchId, rowNumber, message, rowJson ?? null]
      );
    };

    if (kind === "actuals_circana") {
      // Expect: Geography, Product, then many "Week Ending mm-dd-yy" columns.
      const geographyIdx = findHeaderIndex(header, ["Geography"]);
      const productIdx = findHeaderIndex(header, ["Product"]);

      if (geographyIdx < 0 || productIdx < 0) {
        throw new Error("Actuals CSV must contain Geography and Product columns");
      }

      const weekCols: { idx: number; weekEndIso: string }[] = [];
      header.forEach((h, idx) => {
        const m = h.match(/^Week Ending\s+(\d{1,2}-\d{1,2}-\d{2})$/i);
        if (!m) return;
        const iso = parseMmDdYy(m[1]);
        if (iso) weekCols.push({ idx, weekEndIso: iso });
      });
      if (weekCols.length === 0) {
        throw new Error('Actuals CSV must contain columns like "Week Ending 01-07-24"');
      }

      // Insert normalized weekly facts.
      const seenAccounts = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const geography = mustString(r[geographyIdx]);
        const product = mustString(r[productIdx]);
        if (!geography || !product) continue;

        // Geography is the "Account key" dimension for actuals.
        const geoKey = geography.trim();
        if (geoKey && !seenAccounts.has(geoKey)) {
          seenAccounts.add(geoKey);
          await upsertAccount(pool, geoKey);
        }

        for (const wc of weekCols) {
          const rawVal = r[wc.idx];
          const vol = parseNumberLike(rawVal);
          // Skip blanks
          if (vol == null) continue;

          rowCount++;
          await pool.query(
            `
              INSERT INTO actuals_weekly_fact (id, batch_id, geography, product, week_end_date, volume)
              VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [crypto.randomUUID(), batchId, geography, product, wc.weekEndIso, vol]
          );
        }
      }
    }

    if (kind === "promotions") {
      // Map columns by normalized header with aliases (headers can vary).
      const dealIdIdx = findHeaderIndex(header, ["Deal ID", "DealID", "Deal Id"]);
      const callPointIdx = findHeaderIndex(header, ["Call Point", "Callpoint", "Account", "Customer"]);
      const promoStatusIdx = findHeaderIndex(header, ["Promo Status", "Status"]);
      const promoTypeIdx = findHeaderIndexStartsWith(header, ["Promo Type"]);
      const ppgIdx = findHeaderIndex(header, ["PPG", "PPG - Item", "Product", "PPG Item"]);
      const costStartIdx = findHeaderIndex(header, ["Cost Start Date", "Cost Start"]);
      const costEndIdx = findHeaderIndex(header, ["Cost End Date", "Cost End"]);
      const promoStartIdx = findHeaderIndex(header, ["Promo Start Date", "Promo Start"]);
      const promoEndIdx = findHeaderIndex(header, ["Promo End Date", "Promo End"]);
      const scanBackIdx = findHeaderIndex(header, ["Scan Back (per cs)", "Scan Back", "Scan Back $ (per case)"]);
      const trShareIdx = findHeaderIndex(header, ["TR Share of Discount", "DA", "Depletion Allowance", "TR Share"]);
      const forecastVolIdx = findHeaderIndex(header, ["Forecasted Volume", "Forecast Volume", "Forecast"]);
      const circanaGeoIdx = findHeaderIndex(header, ["Circana Geography", "Geography"]);
      const rtmIdx = findHeaderIndex(header, ["Route to Market", "RTM"]);

      if (dealIdIdx < 0 || callPointIdx < 0 || promoStatusIdx < 0 || ppgIdx < 0) {
        throw new Error("Promotions CSV missing required columns (Deal ID, Call Point, Promo Status, PPG)");
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const dealId = mustString(r[dealIdIdx]);
        const callPoint = mustString(r[callPointIdx]);
        const promoStatus = mustString(r[promoStatusIdx]);
        const promoType = promoTypeIdx >= 0 ? mustString(r[promoTypeIdx]) : "";
        const ppg = mustString(r[ppgIdx]);

        if (!dealId && !callPoint && !ppg) continue;

        // Call Point is the combined Retailer+Division "Account key" dimension.
        if (callPoint) {
          await upsertAccount(pool, callPoint);
        }

        const costStart = costStartIdx >= 0 ? parseMdy(mustString(r[costStartIdx])) : null;
        const costEnd = costEndIdx >= 0 ? parseMdy(mustString(r[costEndIdx])) : null;
        const promoStart = promoStartIdx >= 0 ? parseMdy(mustString(r[promoStartIdx])) : null;
        const promoEnd = promoEndIdx >= 0 ? parseMdy(mustString(r[promoEndIdx])) : null;

        const scanBack = scanBackIdx >= 0 ? parseMoneyLike(mustString(r[scanBackIdx])) : null;
        const trShare = trShareIdx >= 0 ? parseMoneyLike(mustString(r[trShareIdx])) : null;
        const forecastVol = forecastVolIdx >= 0 ? parseNumberLike(mustString(r[forecastVolIdx])) : null;

        const circanaGeo = circanaGeoIdx >= 0 ? mustString(r[circanaGeoIdx]) : "";
        const rtm = rtmIdx >= 0 ? mustString(r[rtmIdx]) : "";

        rowCount++;
        await pool.query(
          `
            INSERT INTO promotions_raw (
              id, batch_id, deal_id, promo_status, promo_type, call_point, ppg,
              promo_start_date, promo_end_date, cost_start_date, cost_end_date,
              scan_back_per_cs, tr_share_of_discount, forecasted_volume,
              circana_geography, route_to_market, row_json
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,
              $8,$9,$10,$11,
              $12,$13,$14,
              $15,$16,$17
            )
          `,
          [
            crypto.randomUUID(),
            batchId,
            dealId || null,
            promoStatus || null,
            promoType || null,
            callPoint || null,
            ppg || null,
            promoStart,
            promoEnd,
            costStart,
            costEnd,
            scanBack,
            trShare,
            forecastVol,
            circanaGeo || null,
            rtm || null,
            Object.fromEntries(header.map((h, j) => [h, r[j] ?? null])),
          ]
        );
      }
    }

    if (kind === "budget") {
      const callPointIdx = findHeaderIndex(header, ["Call Point", "Callpoint", "Account", "Customer"]);
      const ppgIdx = findHeaderIndex(header, ["PPG - Item", "PPG", "Product"]);
      const weeksIdx = findHeaderIndex(header, ["Weeks"]);
      const weeklyVolIdx = findHeaderIndex(header, ["Weekly Volume (cases per store)", "Weekly Volume"]);
      const totalCasesIdx = findHeaderIndex(header, ["Total Cases Budgeted", "Total Cases"]);
      const trShareIdx = findHeaderIndex(header, ["TR Share of Discount", "DA", "Depletion Allowance", "TR Share"]);
      const scanBackIdx = findHeaderIndex(header, ["Scan Back $ (per case)", "Scan Back"]);
      const trNetRevenueIdx = findHeaderIndex(header, ["TR Net Revenue", "Net Revenue"]);

      if (callPointIdx < 0 || ppgIdx < 0 || totalCasesIdx < 0) {
        throw new Error("Budget CSV missing required columns (Call Point, PPG - Item, Total Cases Budgeted)");
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const callPoint = mustString(r[callPointIdx]);
        const ppgItem = mustString(r[ppgIdx]);
        if (!callPoint || !ppgItem) continue;

        // Call Point is the combined Retailer+Division "Account key" dimension.
        if (callPoint) {
          await upsertAccount(pool, callPoint);
        }

        rowCount++;
        await pool.query(
          `
            INSERT INTO budget_raw (
              id, batch_id, call_point, ppg_item, weeks_text,
              weekly_volume_per_store, total_cases_budgeted, tr_share_of_discount,
              scan_back_per_case, tr_net_revenue, row_json
            ) VALUES (
              $1,$2,$3,$4,$5,
              $6,$7,$8,
              $9,$10,$11
            )
          `,
          [
            crypto.randomUUID(),
            batchId,
            callPoint,
            ppgItem,
            weeksIdx >= 0 ? mustString(r[weeksIdx]) : null,
            weeklyVolIdx >= 0 ? parseNumberLike(mustString(r[weeklyVolIdx])) : null,
            parseNumberLike(mustString(r[totalCasesIdx])),
            trShareIdx >= 0 ? parseMoneyLike(mustString(r[trShareIdx])) : null,
            scanBackIdx >= 0 ? parseMoneyLike(mustString(r[scanBackIdx])) : null,
            trNetRevenueIdx >= 0 ? parseMoneyLike(mustString(r[trNetRevenueIdx])) : null,
            Object.fromEntries(header.map((h, j) => [h, r[j] ?? null])),
          ]
        );
      }
    }

    await pool.query(
      `UPDATE upload_batch SET status='processed', row_count=$2, error_count=$3 WHERE id=$1`,
      [batchId, rowCount, errorCount]
    );

    await writeAuditEvent({
      actor_entra_oid: user.entraOid,
      actor_email: user.email,
      action: "UPLOAD",
      entity_type: "upload_batch",
      entity_id: batchId,
      correlation_id: correlationId,
      metadata: { kind, filename: file.name, rowCount, errorCount },
    });

    return NextResponse.json({ ok: true, batchId, rowCount, errorCount });
  } catch (e: any) {
    await pool.query(`UPDATE upload_batch SET status='failed' WHERE id=$1`, [batchId]);
    await pool.query(
      `INSERT INTO upload_error (id, batch_id, message) VALUES ($1,$2,$3)`,
      [crypto.randomUUID(), batchId, e?.message || "Upload failed"]
    );
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed", batchId }, { status: 500 });
  }
}


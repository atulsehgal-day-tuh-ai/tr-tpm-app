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

  // 10MB max upload to prevent memory exhaustion on file.text()/CSV parse.
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large (max 10 MB)." }, { status: 413 });
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
      const ids: string[] = [];
      const batchIds: string[] = [];
      const geographies: string[] = [];
      const products: string[] = [];
      const weekEnds: string[] = [];
      const volumes: number[] = [];

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

          // Guardrail: negative volumes are invalid
          if (vol < 0) {
            await addError(i + 2, "Negative volume not allowed", {
              geography,
              product,
              week_end_date: wc.weekEndIso,
              volume: vol,
            });
            continue;
          }

          rowCount++;
          ids.push(crypto.randomUUID());
          batchIds.push(batchId);
          geographies.push(geography);
          products.push(product);
          weekEnds.push(wc.weekEndIso);
          volumes.push(vol);
        }
      }

      // Batch insert (avoids N+1 queries: rows × weekCols)
      if (ids.length) {
        await pool.query(
          `
            INSERT INTO actuals_weekly_fact (id, batch_id, geography, product, week_end_date, volume)
            SELECT * FROM UNNEST(
              $1::uuid[],
              $2::uuid[],
              $3::text[],
              $4::text[],
              $5::date[],
              $6::numeric[]
            )
          `,
          [ids, batchIds, geographies, products, weekEnds, volumes]
        );
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

      // Collect unique accounts for batch upsert
      const seenAccounts = new Set<string>();
      // Collect rows for batch insert
      const promoIds: string[] = [];
      const promoBatchIds: string[] = [];
      const dealIds: (string | null)[] = [];
      const promoStatuses: (string | null)[] = [];
      const promoTypes: (string | null)[] = [];
      const callPoints: (string | null)[] = [];
      const ppgs: (string | null)[] = [];
      const promoStarts: (string | null)[] = [];
      const promoEnds: (string | null)[] = [];
      const costStarts: (string | null)[] = [];
      const costEnds: (string | null)[] = [];
      const scanBacks: (number | null)[] = [];
      const trShares: (number | null)[] = [];
      const forecastVols: (number | null)[] = [];
      const circanaGeos: (string | null)[] = [];
      const rtms: (string | null)[] = [];
      const rowJsons: object[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const dealId = mustString(r[dealIdIdx]);
        const callPoint = mustString(r[callPointIdx]);
        const promoStatus = mustString(r[promoStatusIdx]);
        const promoType = promoTypeIdx >= 0 ? mustString(r[promoTypeIdx]) : "";
        const ppg = mustString(r[ppgIdx]);

        if (!dealId && !callPoint && !ppg) continue;

        // Track unique accounts for batch upsert
        if (callPoint && !seenAccounts.has(callPoint)) {
          seenAccounts.add(callPoint);
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
        promoIds.push(crypto.randomUUID());
        promoBatchIds.push(batchId);
        dealIds.push(dealId || null);
        promoStatuses.push(promoStatus || null);
        promoTypes.push(promoType || null);
        callPoints.push(callPoint || null);
        ppgs.push(ppg || null);
        promoStarts.push(promoStart);
        promoEnds.push(promoEnd);
        costStarts.push(costStart);
        costEnds.push(costEnd);
        scanBacks.push(scanBack);
        trShares.push(trShare);
        forecastVols.push(forecastVol);
        circanaGeos.push(circanaGeo || null);
        rtms.push(rtm || null);
        rowJsons.push(Object.fromEntries(header.map((h, j) => [h, r[j] ?? null])));
      }

      // Batch upsert accounts
      for (const acct of Array.from(seenAccounts)) {
        await upsertAccount(pool, acct);
      }

      // Batch insert promotions
      if (promoIds.length) {
        await pool.query(
          `
            INSERT INTO promotions_raw (
              id, batch_id, deal_id, promo_status, promo_type, call_point, ppg,
              promo_start_date, promo_end_date, cost_start_date, cost_end_date,
              scan_back_per_cs, tr_share_of_discount, forecasted_volume,
              circana_geography, route_to_market, row_json
            )
            SELECT * FROM UNNEST(
              $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[],
              $8::date[], $9::date[], $10::date[], $11::date[],
              $12::numeric[], $13::numeric[], $14::numeric[],
              $15::text[], $16::text[], $17::jsonb[]
            )
          `,
          [
            promoIds, promoBatchIds, dealIds, promoStatuses, promoTypes, callPoints, ppgs,
            promoStarts, promoEnds, costStarts, costEnds,
            scanBacks, trShares, forecastVols,
            circanaGeos, rtms, rowJsons,
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

      // Collect unique accounts for batch upsert
      const seenAccounts = new Set<string>();
      // Collect rows for batch insert
      const budgetIds: string[] = [];
      const budgetBatchIds: string[] = [];
      const budgetCallPoints: string[] = [];
      const ppgItems: string[] = [];
      const weeksTexts: (string | null)[] = [];
      const weeklyVols: (number | null)[] = [];
      const totalCases: (number | null)[] = [];
      const trShareVals: (number | null)[] = [];
      const scanBackVals: (number | null)[] = [];
      const trNetRevenues: (number | null)[] = [];
      const budgetRowJsons: object[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const callPoint = mustString(r[callPointIdx]);
        const ppgItem = mustString(r[ppgIdx]);
        if (!callPoint || !ppgItem) continue;

        // Track unique accounts for batch upsert
        if (!seenAccounts.has(callPoint)) {
          seenAccounts.add(callPoint);
        }

        rowCount++;
        budgetIds.push(crypto.randomUUID());
        budgetBatchIds.push(batchId);
        budgetCallPoints.push(callPoint);
        ppgItems.push(ppgItem);
        weeksTexts.push(weeksIdx >= 0 ? mustString(r[weeksIdx]) || null : null);
        weeklyVols.push(weeklyVolIdx >= 0 ? parseNumberLike(mustString(r[weeklyVolIdx])) : null);
        totalCases.push(parseNumberLike(mustString(r[totalCasesIdx])));
        trShareVals.push(trShareIdx >= 0 ? parseMoneyLike(mustString(r[trShareIdx])) : null);
        scanBackVals.push(scanBackIdx >= 0 ? parseMoneyLike(mustString(r[scanBackIdx])) : null);
        trNetRevenues.push(trNetRevenueIdx >= 0 ? parseMoneyLike(mustString(r[trNetRevenueIdx])) : null);
        budgetRowJsons.push(Object.fromEntries(header.map((h, j) => [h, r[j] ?? null])));
      }

      // Batch upsert accounts
      for (const acct of Array.from(seenAccounts)) {
        await upsertAccount(pool, acct);
      }

      // Batch insert budget rows
      if (budgetIds.length) {
        await pool.query(
          `
            INSERT INTO budget_raw (
              id, batch_id, call_point, ppg_item, weeks_text,
              weekly_volume_per_store, total_cases_budgeted, tr_share_of_discount,
              scan_back_per_case, tr_net_revenue, row_json
            )
            SELECT * FROM UNNEST(
              $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[],
              $6::numeric[], $7::numeric[], $8::numeric[],
              $9::numeric[], $10::numeric[], $11::jsonb[]
            )
          `,
          [
            budgetIds, budgetBatchIds, budgetCallPoints, ppgItems, weeksTexts,
            weeklyVols, totalCases, trShareVals,
            scanBackVals, trNetRevenues, budgetRowJsons,
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


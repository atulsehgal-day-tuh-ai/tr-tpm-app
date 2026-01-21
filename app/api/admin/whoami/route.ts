import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyAzureAdAccessToken } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing Bearer token" }, { status: 401 });
  }

  try {
    const user = await verifyAzureAdAccessToken(token);
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Token verification failed" },
      { status: 401 }
    );
  }
}


import { NextRequest } from "next/server";
import { getBearerToken, verifyAzureAdAccessToken } from "@/lib/auth/server";

function parseList(v: string | undefined): string[] {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) throw new Error("Missing Bearer token");
  return await verifyAzureAdAccessToken(token);
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);

  // Dev mode user is always admin.
  if (user.entraOid === "dev") return user;

  const adminEmails = parseList(process.env.ADMIN_EMAILS);
  const adminOids = parseList(process.env.ADMIN_OIDS);
  const adminGroupOids = parseList(process.env.ADMIN_GROUP_OIDS);

  if (adminOids.includes(user.entraOid)) return user;
  if (user.email && adminEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase()))
    return user;

  // Group-based admin can be enforced if token contains "groups" claim.
  // Note: requires Entra app config to emit group claims.
  // We can't read groups from the VerifiedUser currently, so we only support env-based allowlists here.
  if (adminGroupOids.length > 0) {
    // Placeholder until we add groups claim extraction.
  }

  throw new Error("Forbidden (admin only)");
}


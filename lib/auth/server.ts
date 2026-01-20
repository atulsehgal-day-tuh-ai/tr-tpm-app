import { createRemoteJWKSet, jwtVerify } from "jose";

export type VerifiedUser = {
  entraOid: string;
  email?: string;
  name?: string;
};

function getAuthConfig() {
  const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "";
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || "";
  const audienceOverride = process.env.AZURE_AD_API_AUDIENCE || "";

  const enabled = !!(clientId && tenantId);

  // Default audience assumption for SPA calling its own exposed API:
  // Access token aud commonly becomes api://<clientId> when you expose an API in the app registration.
  const expectedAudience = audienceOverride || (clientId ? `api://${clientId}` : "");

  return { enabled, clientId, tenantId, expectedAudience };
}

export async function verifyAzureAdAccessToken(token: string): Promise<VerifiedUser> {
  const { enabled, tenantId, expectedAudience } = getAuthConfig();
  if (!enabled) {
    // Dev-mode: allow calls without verification (auth disabled).
    return { entraOid: "dev", email: "dev@local", name: "Dev Mode" };
  }

  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const jwksUri = new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
  const jwks = createRemoteJWKSet(jwksUri);

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: expectedAudience,
  });

  const entraOid = String(payload.oid || "");
  if (!entraOid) throw new Error("Token missing oid");

  const email =
    (payload.preferred_username && String(payload.preferred_username)) ||
    (payload.upn && String(payload.upn)) ||
    undefined;

  const name = (payload.name && String(payload.name)) || undefined;

  return { entraOid, email, name };
}

export function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}


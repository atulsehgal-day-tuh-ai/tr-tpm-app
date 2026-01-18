import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Exposes non-secret runtime config to the browser.
 * This is used so App Service environment variables can be changed without rebuilding the frontend bundle.
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || ''
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || ''
  const redirectUri = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || ''

  return NextResponse.json(
    {
      clientId,
      tenantId,
      redirectUri,
    },
    {
      headers: {
        // Avoid caching so changes in App Service settings take effect quickly.
        'Cache-Control': 'no-store',
      },
    }
  )
}


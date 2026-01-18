'use client'

import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { buildMsalConfig } from '@/lib/authConfig'
import { useEffect, useMemo, useState } from 'react'

type PublicConfig = {
  clientId: string
  tenantId: string
  redirectUri: string
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [config, setConfig] = useState<PublicConfig | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/public-config', { cache: 'no-store' })
        const data = (await res.json()) as PublicConfig

        const missing: string[] = []
        if (!data.clientId) missing.push('NEXT_PUBLIC_AZURE_AD_CLIENT_ID')
        if (!data.tenantId) missing.push('NEXT_PUBLIC_AZURE_AD_TENANT_ID')
        if (!data.redirectUri) missing.push('NEXT_PUBLIC_AZURE_AD_REDIRECT_URI')

        if (missing.length > 0) {
          if (!cancelled) {
            setError(
              `Azure AD is not configured. Missing: ${missing.join(', ')}. ` +
                `Set these in your hosting environment (e.g., Azure App Service → Configuration → Application settings), then restart the app.`
            )
            setStatus('error')
          }
          return
        }

        if (!cancelled) {
          setConfig(data)
          setStatus('ready')
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(`Failed to load runtime config: ${e?.message || String(e)}`)
          setStatus('error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const msalInstance = useMemo(() => {
    if (!config) return null
    const instance = new PublicClientApplication(
      buildMsalConfig({
        clientId: config.clientId,
        tenantId: config.tenantId,
        redirectUri: config.redirectUri,
      })
    )
    instance.initialize().catch((err) => {
      // Do not throw; show a helpful message instead.
      console.error('MSAL initialization error:', err)
    })
    return instance
  }, [config])

  if (status === 'loading') {
    return (
      <div className="container">
        <h1>TR TPM Test App</h1>
        <p>Loading configuration…</p>
      </div>
    )
  }

  if (status === 'error' || !msalInstance) {
    return (
      <div className="container">
        <h1>TR TPM Test App</h1>
        <div className="status-card status-error">
          <h2>Azure AD Configuration Error</h2>
          <p>{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>
}
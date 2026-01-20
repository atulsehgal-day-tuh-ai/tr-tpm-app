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
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled'>('loading')
  const [message, setMessage] = useState<string>('')
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
            setMessage(
              `Azure AD auth is not configured (missing: ${missing.join(', ')}). ` +
                `The app will run without login in this mode.`
            )
            setStatus('disabled')
          }
          return
        }

        if (!cancelled) {
          setConfig(data)
          setStatus('ready')
        }
      } catch (e: any) {
        if (!cancelled) {
          setMessage(`Azure AD config could not be loaded (${e?.message || String(e)}). Running without login.`)
          setStatus('disabled')
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

  const banner =
    status !== 'ready' ? (
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <span className="font-medium">Auth disabled:</span> {message || 'Loading Azure AD configuration…'}
      </div>
    ) : null

  if (status === 'ready' && msalInstance) {
    return (
      <>
        {banner}
        <MsalProvider instance={msalInstance}>{children}</MsalProvider>
      </>
    )
  }

  return (
    <>
      {banner}
      {children}
    </>
  )
}
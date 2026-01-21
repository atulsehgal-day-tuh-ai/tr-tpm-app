'use client'

import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { buildMsalConfig } from '@/lib/authConfig'
import { useEffect, useMemo, useState } from 'react'
import { AuthRuntimeProvider } from '@/components/auth/auth-runtime'
import { ClientErrorBoundary } from '@/components/error/client-error-boundary'

type PublicConfig = {
  clientId: string
  tenantId: string
  redirectUri: string
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled'>('loading')
  const [message, setMessage] = useState<string>('')
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null)

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

        // IMPORTANT:
        // Always provide an MsalProvider to the app once initialized.
        // Rendering client pages *before* MsalProvider exists can cause unstable runtime behavior
        // (and has shown up as React hook-order errors in production).
        const effective =
          missing.length > 0
            ? {
                clientId: '00000000-0000-0000-0000-000000000000',
                tenantId: 'common',
                redirectUri: data.redirectUri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
              }
            : data

        // Initialize MSAL *before* rendering MsalProvider to avoid runtime errors on first load.
        const instance = new PublicClientApplication(buildMsalConfig(effective))
        await instance.initialize()

        if (!cancelled) {
          setConfig(missing.length > 0 ? null : data)
          setMsalInstance(instance)
          if (missing.length > 0) {
            setMessage(
              `Azure AD auth is not configured (missing: ${missing.join(', ')}). ` +
                `The app will run without login in this mode.`
            )
            setStatus('disabled')
          } else {
            setStatus('ready')
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          // Fall back to a safe, initialized MSAL instance so hooks using useMsal() won't crash.
          try {
            const instance = new PublicClientApplication(
              buildMsalConfig({
                clientId: '00000000-0000-0000-0000-000000000000',
                tenantId: 'common',
                redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
              })
            )
            await instance.initialize()
            setMsalInstance(instance)
          } catch {
            // ignore; we'll still show boot message below
          }
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

  const banner =
    status !== 'ready' ? (
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <span className="font-medium">Auth disabled:</span> {message || 'Loading Azure AD configuration…'}
      </div>
    ) : null

  // Boot screen: don't render pages until MSAL is initialized (prevents useMsal() from running without a provider).
  if (!msalInstance) {
    return (
      <>
        {banner}
        <AuthRuntimeProvider value={{ status, message }}>
          <div className="mx-auto max-w-xl px-4 py-16">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold tracking-tight">Loading…</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Initializing authentication and app shell.
              </div>
            </div>
          </div>
        </AuthRuntimeProvider>
      </>
    )
  }

  return (
    <>
      {banner}
      <AuthRuntimeProvider value={status === 'ready' ? { status: 'ready' } : { status, message }}>
        <MsalProvider instance={msalInstance}>
          <ClientErrorBoundary>{children}</ClientErrorBoundary>
        </MsalProvider>
      </AuthRuntimeProvider>
    </>
  )
}
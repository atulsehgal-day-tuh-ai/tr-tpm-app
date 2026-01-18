'use client'

import { useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '@/lib/authConfig'

interface TestStatus {
  database: 'checking' | 'success' | 'error' | 'not-checked'
  azureAd: 'checking' | 'success' | 'error' | 'not-checked'
}

export default function Home() {
  const { instance, accounts } = useMsal()
  const [testStatus, setTestStatus] = useState<TestStatus>({
    database: 'not-checked',
    azureAd: 'not-checked',
  })
  const [dbMessage, setDbMessage] = useState<string>('')

  const isAuthenticated = accounts.length > 0

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest)
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const handleLogout = () => {
    instance.logoutPopup()
  }

  const testDatabase = async () => {
    setTestStatus((prev) => ({ ...prev, database: 'checking' }))
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      if (data.success) {
        setTestStatus((prev) => ({ ...prev, database: 'success' }))
        setDbMessage(data.message || 'Database connection successful!')
      } else {
        setTestStatus((prev) => ({ ...prev, database: 'error' }))
        setDbMessage(data.error || 'Database connection failed')
      }
    } catch (error) {
      setTestStatus((prev) => ({ ...prev, database: 'error' }))
      setDbMessage('Failed to connect to database')
      console.error('Database test error:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      setTestStatus((prev) => ({ ...prev, azureAd: 'success' }))
    }
  }, [isAuthenticated])

  return (
    <main className="container">
      <h1>TR TPM Test App</h1>
      <p>This is a basic test application to verify the stack configuration.</p>

      <div className="status-card">
        <h2>Stack Components</h2>
        
        <div className="status-card" style={{ marginTop: '1rem' }}>
          <h3>Azure AD Authentication</h3>
          {!isAuthenticated ? (
            <div>
              <p>Status: Not authenticated</p>
              <button className="button" onClick={handleLogin}>
                Login with Azure AD
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#4caf50' }}>✓ Authenticated</p>
              <p>User: {accounts[0]?.name || accounts[0]?.username}</p>
              <button className="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="status-card" style={{ marginTop: '1rem' }}>
          <h3>PostgreSQL Database</h3>
          <p>
            Status:{' '}
            {testStatus.database === 'not-checked' && 'Not tested'}
            {testStatus.database === 'checking' && 'Checking...'}
            {testStatus.database === 'success' && (
              <span style={{ color: '#4caf50' }}>✓ Connected</span>
            )}
            {testStatus.database === 'error' && (
              <span style={{ color: '#f44336' }}>✗ Connection failed</span>
            )}
          </p>
          {dbMessage && <p>{dbMessage}</p>}
          <button
            className="button"
            onClick={testDatabase}
            disabled={testStatus.database === 'checking'}
          >
            Test Database Connection
          </button>
        </div>
      </div>

      <div className="status-card" style={{ marginTop: '2rem' }}>
        <h2>Next.js Framework</h2>
        <p style={{ color: '#4caf50' }}>✓ Running on Node.js runtime</p>
        <p>Framework: Next.js (React)</p>
      </div>
    </main>
  )
}
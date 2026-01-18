import { NextResponse } from 'next/server'
import { getPool, testDatabaseConnection, initializeDatabase } from '@/lib/db'

export async function GET() {
  // During `next build`, some environments/tools may invoke route handlers.
  // We never want a production build to require DB connectivity.
  if (process.env.npm_lifecycle_event === 'build') {
    return NextResponse.json(
      { success: false, error: 'DB checks are disabled during build' },
      { status: 503 }
    )
  }

  // Fast-fail with a helpful message (avoid generic "connection failed")
  const hasDbUrl = !!(process.env.DATABASE_URL || process.env.POSTGRESQLCONNSTR_DATABASE_URL)
  if (!hasDbUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          'DATABASE_URL is not configured for this app. Set it in Azure App Service → Environment variables (App settings), then restart the app.',
      },
      { status: 500 }
    )
  }

  try {
    // Test connection
    const connectionTest = await testDatabaseConnection()
    if (!connectionTest.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          details: connectionTest.error,
        },
        { status: 500 }
      )
    }

    // Initialize database (creates test table if needed)
    await initializeDatabase()

    // Query test data
    const pool = getPool()
    const result = await pool.query('SELECT * FROM test_table ORDER BY created_at DESC LIMIT 1')
    
    return NextResponse.json({
      success: true,
      message: result.rows[0]?.message || 'Database connection successful!',
      timestamp: result.rows[0]?.created_at,
    })
  } catch (error: any) {
    console.error('Database API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Database error occurred',
      },
      { status: 500 }
    )
  }
}
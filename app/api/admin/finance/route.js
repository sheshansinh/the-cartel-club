import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFinancialReport } from '@/lib/services/finance'

const FINANCE_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'ACCOUNTANT',
]

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !FINANCE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    const from = searchParams.get('from') || null
    const to = searchParams.get('to') || null

    const report = await getFinancialReport({ range, from, to })
    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    )
  }
}


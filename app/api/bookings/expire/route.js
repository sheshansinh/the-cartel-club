import { NextResponse } from 'next/server'
import { expireOldHolds } from '@/lib/services/booking'

/**
 * POST /api/bookings/expire
 * Expires stale PENDING_PAYMENT holds where holdExpiresAt < now.
 */
export async function POST() {
  try {
    const result = await expireOldHolds()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error expiring holds:', error)
    return NextResponse.json({ error: 'Failed to expire holds' }, { status: 500 })
  }
}


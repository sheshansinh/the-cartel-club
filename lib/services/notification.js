/**
 * Notification service.
 *
 * Usage (server-side only):
 *   import { createNotification } from '@/lib/services/notification'
 *   await createNotification({
 *     userId,
 *     title: 'Booking Confirmed',
 *     message: 'Your table #01 is confirmed for 6 PM.',
 *     type: 'BOOKING',
 *     actionUrl: `/dashboard/bookings/${bookingId}`,
 *   })
 *
 * Errors are swallowed to avoid interrupting primary flows.
 */

import { prisma } from '@/lib/prisma'

/**
 * Notification types (for reference — stored as plain strings in DB):
 *   BOOKING | PAYMENT | REWARD | TICKET | ALERT | SYSTEM
 */

/**
 * @param {object} params
 * @param {string}  params.userId
 * @param {string}  params.title
 * @param {string}  params.message
 * @param {string}  params.type       - BOOKING | PAYMENT | REWARD | TICKET | ALERT | SYSTEM
 * @param {string}  [params.actionUrl]
 */
export async function createNotification({ userId, title, message, type, actionUrl }) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl: actionUrl ?? null,
      },
    })
  } catch (err) {
    console.error('[notification] Failed to create notification:', err?.message)
  }
}

/**
 * Send the same notification to multiple users at once.
 *
 * @param {string[]} userIds
 * @param {{ title: string, message: string, type: string, actionUrl?: string }} payload
 */
export async function createNotificationBulk(userIds, payload) {
  if (!userIds.length) return
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        actionUrl: payload.actionUrl ?? null,
      })),
      skipDuplicates: true,
    })
  } catch (err) {
    console.error('[notification] Failed to bulk-create notifications:', err?.message)
  }
}

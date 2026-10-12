/**
 * Audit logging service.
 *
 * Usage (server-side only):
 *   import { logAudit } from '@/lib/services/audit'
 *   await logAudit({ userId, action: 'BOOKING_CREATED', module: 'BOOKINGS', entityId: booking.id })
 *
 * This is a fire-and-forget helper — errors are swallowed so they never
 * interrupt the primary operation.
 */

import { prisma } from '@/lib/prisma'

/**
 * @param {object} params
 * @param {string}  params.userId      - ID of the user performing the action
 * @param {string}  params.action      - e.g. 'BOOKING_CREATED'
 * @param {string}  params.module      - e.g. 'BOOKINGS'
 * @param {string}  [params.entityId]  - ID of the affected record
 * @param {string}  [params.entityType]- e.g. 'Booking'
 * @param {object}  [params.changes]   - diff / before-after object
 * @param {string}  [params.ipAddress]
 * @param {string}  [params.userAgent]
 */
export async function logAudit({
  userId,
  action,
  module,
  entityId,
  entityType,
  changes,
  ipAddress,
  userAgent,
}) {
  try {
    let resolvedUserId = userId
    if (!resolvedUserId || resolvedUserId === 'system') {
      const fallbackUser = await prisma.user.findFirst({
        where: { role: { in: ['SUPER_ADMIN', 'BUSINESS_OWNER'] } },
        select: { id: true },
      })
      resolvedUserId = fallbackUser?.id || null
    }
    if (!resolvedUserId) return

    await prisma.auditLog.create({
      data: {
        userId: resolvedUserId,
        action,
        module: module || 'SYSTEM',
        entityId: entityId ?? null,
        entityType: entityType ?? null,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    })
  } catch (err) {
    // Never let audit logging break the primary flow
    console.error('[audit] Failed to write audit log:', err?.message)
  }
}

/**
 * Alias for logAudit that also accepts { oldValues, newValues, metadata }
 * and automatically derives `module` if omitted.
 */
export async function createAuditLog({
  userId,
  action,
  module,
  entityId,
  entityType,
  changes,
  oldValues,
  newValues,
  metadata,
  ipAddress,
  userAgent,
}) {
  const derivedModule =
    module ||
    (entityType ? String(entityType).toUpperCase() : null) ||
    (action ? String(action).split('_')[0].toUpperCase() : 'SYSTEM')

  const combinedChanges =
    changes ??
    (oldValues !== undefined || newValues !== undefined || metadata !== undefined
      ? {
          ...(oldValues !== undefined ? { oldValues } : {}),
          ...(newValues !== undefined ? { newValues } : {}),
          ...(metadata !== undefined ? { metadata } : {}),
        }
      : null)

  return logAudit({
    userId: userId || 'system',
    action: action || 'ACTION',
    module: derivedModule,
    entityId,
    entityType,
    changes: combinedChanges,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper to extract IP + user-agent from a Next.js Request object.
 *
 * @param {Request} req
 * @returns {{ ipAddress: string|null, userAgent: string|null }}
 */
export function getRequestMeta(req) {
  const ipAddress =
    req?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    req?.headers?.get?.('x-real-ip') ||
    null
  const userAgent = req?.headers?.get?.('user-agent') || null
  return { ipAddress, userAgent }
}

import { prisma } from '@/lib/prisma'
import { recordStockMovement } from '@/lib/services/inventory'
import { createAuditLog } from '@/lib/services/audit'

/**
 * Generates a unique human-readable POS sale reference: POS-YYYYMMDD-XXXX
 */
function generateSaleRef() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `POS-${y}${m}${d}-${rand}`
}

/**
 * Serializes a POSSale record with plain numbers for JSON consumption.
 */
export function serializePOSSale(sale) {
  if (!sale) return null
  return {
    ...sale,
    subtotal: Number(sale.subtotal || 0),
    discountAmount: Number(sale.discountAmount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    totalAmount: Number(sale.totalAmount || 0),
    items: (sale.items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      discount: Number(item.discount || 0),
      totalPrice: Number(item.totalPrice || 0),
    })),
    payments: (sale.payments || []).map((p) => ({
      ...p,
      amount: Number(p.amount || 0),
    })),
  }
}

/**
 * Completes a POS sale:
 *  - Verifies product availability & stock
 *  - Computes server-side subtotal, discounts, tax, and totalAmount
 *  - Creates POSSale, POSSaleItems, and POSPayments
 *  - Atomically deducts Product.currentStock and writes InventoryMovements (SALE)
 *  - Creates a central Payment record (paymentType: 'POS_SALE')
 *  - Increments CustomerProfile.totalSpent if a customer is linked
 */
export async function createPOSSale({
  items,
  customerId = null,
  discountAmount = 0,
  taxRate = 0,
  paymentMethod = 'CASH',
  payments = null,
  notes = null,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Cart is empty. Add at least one item to complete a sale.')
    err.status = 400
    throw err
  }

  let employeeProfileId = null
  if (staffUserId) {
    const emp = await prisma.employeeProfile.findUnique({
      where: { userId: staffUserId },
      select: { id: true },
    })
    if (emp) employeeProfileId = emp.id
  }

  const saleRef = generateSaleRef()

  const createdSale = await prisma.$transaction(async (tx) => {
    const productIds = items.map((i) => i.productId)
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const preparedItems = []
    let subtotal = 0

    for (const rawItem of items) {
      const product = productMap.get(rawItem.productId)
      if (!product) {
        const err = new Error(`Product not found or inactive`)
        err.status = 404
        throw err
      }

      const quantity = Number(rawItem.quantity || 0)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        const err = new Error(`Invalid quantity for "${product.name}"`)
        err.status = 400
        throw err
      }

      const available = Number(product.currentStock || 0)
      if (available < quantity) {
        const err = new Error(
          `Insufficient stock for "${product.name}". Available: ${available} ${product.unit}, requested: ${quantity} ${product.unit}`
        )
        err.status = 400
        throw err
      }

      // Always trust server-side sellingPrice unless an explicit item discount is provided
      const unitPrice = Number(product.sellingPrice)
      const itemDiscount = Math.max(0, Number(rawItem.discount || 0))
      const lineGross = unitPrice * quantity
      const totalPrice = Math.max(0, Number((lineGross - itemDiscount).toFixed(2)))

      subtotal += totalPrice
      preparedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        discount: itemDiscount,
        totalPrice,
      })
    }

    subtotal = Number(subtotal.toFixed(2))
    const orderDiscount = Math.max(0, Math.min(subtotal, Number(discountAmount || 0)))
    const discountedSubtotal = Math.max(0, Number((subtotal - orderDiscount).toFixed(2)))
    const effectiveTaxRate = Math.max(0, Number(taxRate || 0))
    const taxAmount = Number(((discountedSubtotal * effectiveTaxRate) / 100).toFixed(2))
    const totalAmount = Number((discountedSubtotal + taxAmount).toFixed(2))

    // Prepare POSPayment entries (supports single or split payment)
    let posPaymentsData = []
    if (Array.isArray(payments) && payments.length > 0) {
      posPaymentsData = payments.map((p) => ({
        amount: Number(p.amount || totalAmount),
        method: p.method || paymentMethod || 'CASH',
        reference: p.reference || null,
      }))
    } else {
      posPaymentsData = [
        {
          amount: totalAmount,
          method: paymentMethod || 'CASH',
          reference: null,
        },
      ]
    }

    const sale = await tx.pOSSale.create({
      data: {
        saleRef,
        customerId: customerId || null,
        employeeId: employeeProfileId,
        subtotal,
        discountAmount: orderDiscount,
        taxAmount,
        totalAmount,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: 'PAID',
        notes: notes || null,
        items: {
          create: preparedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
          })),
        },
        payments: {
          create: posPaymentsData,
        },
      },
      include: {
        customer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        items: {
          include: { product: { include: { category: true } } },
        },
        payments: true,
      },
    })

    // Deduct stock and record InventoryMovement for each line item
    for (const item of preparedItems) {
      await recordStockMovement({
        productId: item.productId,
        movementType: 'SALE',
        quantity: item.quantity,
        reason: `POS Sale ${saleRef}`,
        referenceId: sale.id,
        referenceType: 'POSSale',
        createdBy: staffUserId,
        tx,
      })
    }

    // Record in central Payment ledger so Finance & Reports include POS revenue
    if (totalAmount > 0) {
      await tx.payment.create({
        data: {
          amount: totalAmount,
          currency: 'INR',
          status: 'PAID',
          paymentType: 'POS_SALE',
          paymentMethod: paymentMethod || 'CASH',
          paidAt: new Date(),
          metadata: JSON.stringify({
            saleId: sale.id,
            saleRef: sale.saleRef,
            customerId: sale.customerId,
            itemCount: preparedItems.length,
          }),
        },
      })
    }

    // Update customer lifetimeSpending
    if (customerId && totalAmount > 0) {
      const cust = await tx.customerProfile.findUnique({
        where: { id: customerId },
      })
      if (cust) {
        const nextSpent = Number(
          (Number(cust.lifetimeSpending || 0) + totalAmount).toFixed(2)
        )
        await tx.customerProfile.update({
          where: { id: customerId },
          data: { lifetimeSpending: nextSpent },
        })
      }
    }

    return sale
  })

  await createAuditLog({
    userId: staffUserId,
    action: 'POS_SALE_CREATED',
    entityType: 'POSSale',
    entityId: createdSale.id,
    newValues: {
      saleRef: createdSale.saleRef,
      totalAmount: Number(createdSale.totalAmount),
      paymentMethod: createdSale.paymentMethod,
      itemCount: createdSale.items.length,
    },
    ipAddress,
    userAgent,
  })

  return serializePOSSale(createdSale)
}

/**
 * Voids an existing POS sale and restores stock for all items.
 */
export async function voidPOSSale({
  saleId,
  voidReason,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!voidReason || !String(voidReason).trim()) {
    const err = new Error('A reason is required to void a POS sale')
    err.status = 400
    throw err
  }

  const voidedSale = await prisma.$transaction(async (tx) => {
    const sale = await tx.pOSSale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    if (!sale) {
      const err = new Error('POS sale not found')
      err.status = 404
      throw err
    }

    if (sale.voidedAt) {
      const err = new Error('This POS sale has already been voided')
      err.status = 400
      throw err
    }

    // Restore stock for each item
    for (const item of sale.items) {
      await recordStockMovement({
        productId: item.productId,
        movementType: 'RETURN',
        quantity: Number(item.quantity),
        reason: `Voided POS Sale ${sale.saleRef}: ${voidReason}`,
        referenceId: sale.id,
        referenceType: 'POSSale',
        createdBy: staffUserId,
        tx,
      })
    }

    const updated = await tx.pOSSale.update({
      where: { id: saleId },
      data: {
        voidedAt: new Date(),
        voidReason: String(voidReason).trim(),
        paymentStatus: 'REFUNDED',
      },
      include: {
        customer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        items: {
          include: { product: { include: { category: true } } },
        },
        payments: true,
      },
    })

    // Decrement customer lifetimeSpending if linked
    const totalAmount = Number(sale.totalAmount || 0)
    if (sale.customerId && totalAmount > 0) {
      const cust = await tx.customerProfile.findUnique({
        where: { id: sale.customerId },
      })
      if (cust) {
        const nextSpent = Math.max(
          0,
          Number((Number(cust.lifetimeSpending || 0) - totalAmount).toFixed(2))
        )
        await tx.customerProfile.update({
          where: { id: sale.customerId },
          data: { lifetimeSpending: nextSpent },
        })
      }
    }

    return updated
  })

  await createAuditLog({
    userId: staffUserId,
    action: 'POS_SALE_VOIDED',
    entityType: 'POSSale',
    entityId: voidedSale.id,
    newValues: {
      saleRef: voidedSale.saleRef,
      voidReason,
    },
    ipAddress,
    userAgent,
  })

  return serializePOSSale(voidedSale)
}

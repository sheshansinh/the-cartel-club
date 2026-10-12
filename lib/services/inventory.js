import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/services/audit'

const DEFAULT_CATEGORIES = [
  { name: 'Beverages', description: 'Cold drinks, energy drinks, coffee, and water', sortOrder: 1 },
  { name: 'Snacks', description: 'Chips, sandwiches, finger food, and quick bites', sortOrder: 2 },
  { name: 'Accessories', description: 'Chalk, cue tips, gloves, and player accessories', sortOrder: 3 },
  { name: 'Equipment', description: 'Cues, ball sets, table cloth, and hardware', sortOrder: 4 },
  { name: 'Supplies', description: 'Cleaning supplies and club consumables', sortOrder: 5 },
]

const DEFAULT_PRODUCTS = [
  {
    sku: 'BEV-RB-250',
    name: 'Red Bull Energy Drink (250ml)',
    categoryName: 'Beverages',
    purchaseCost: 95,
    sellingPrice: 150,
    currentStock: 36,
    minStockLevel: 12,
    unit: 'can',
  },
  {
    sku: 'BEV-COKE-300',
    name: 'Coca-Cola',
    categoryName: 'Beverages',
    purchaseCost: 12,
    sellingPrice: 20,
    currentStock: 48,
    minStockLevel: 15,
    unit: 'can',
  },
  {
    sku: 'BEV-WATER-1L',
    name: 'Mineral Water Bottle (1L)',
    categoryName: 'Beverages',
    purchaseCost: 12,
    sellingPrice: 30,
    currentStock: 60,
    minStockLevel: 20,
    unit: 'bottle',
  },
  {
    sku: 'BEV-ICEDTEA',
    name: 'Lemon Iced Tea (300ml)',
    categoryName: 'Beverages',
    purchaseCost: 40,
    sellingPrice: 80,
    currentStock: 24,
    minStockLevel: 10,
    unit: 'bottle',
  },
  {
    sku: 'SNK-PERI-FRIES',
    name: 'Peri-Peri French Fries',
    categoryName: 'Snacks',
    purchaseCost: 45,
    sellingPrice: 120,
    currentStock: 30,
    minStockLevel: 8,
    unit: 'plate',
  },
  {
    sku: 'SNK-NACHOS',
    name: 'Loaded Cheese Nachos',
    categoryName: 'Snacks',
    purchaseCost: 60,
    sellingPrice: 160,
    currentStock: 25,
    minStockLevel: 8,
    unit: 'plate',
  },
  {
    sku: 'ACC-MASTER-CHALK',
    name: 'Master Billiard Chalk (Blue)',
    categoryName: 'Accessories',
    purchaseCost: 20,
    sellingPrice: 50,
    currentStock: 45,
    minStockLevel: 15,
    unit: 'piece',
  },
  {
    sku: 'ACC-CUE-TIP',
    name: 'Pro Leather Cue Tip (10mm)',
    categoryName: 'Accessories',
    purchaseCost: 35,
    sellingPrice: 90,
    currentStock: 8,
    minStockLevel: 15,
    unit: 'piece',
  },
  {
    sku: 'ACC-GLOVE',
    name: 'Pro Billiard Cue Glove',
    categoryName: 'Accessories',
    purchaseCost: 180,
    sellingPrice: 350,
    currentStock: 14,
    minStockLevel: 5,
    unit: 'piece',
  },
]

const DEFAULT_SUPPLIERS = [
  {
    name: 'Ahmedabad Beverage Distributors',
    contactPerson: 'Rajesh Patel',
    phone: '+91 98250 11223',
    email: 'orders@ahmbev.in',
    address: 'GIDC Naroda, Ahmedabad, Gujarat',
    gstNumber: '24AABCA1234C1Z5',
    notes: 'Primary supplier for Red Bull, soft drinks, and bottled water',
  },
  {
    name: 'Apex Billiards & Sports Co.',
    contactPerson: 'Vikram Mehta',
    phone: '+91 98980 44556',
    email: 'sales@apexbilliards.com',
    address: 'CG Road, Navrangpura, Ahmedabad',
    gstNumber: '24AAECA9876B1Z2',
    notes: 'Chalk, tips, Strachan cloth, Aramith ball sets',
  },
]

/**
 * Ensures default categories, starter products, and starter suppliers exist
 * when the database has none yet.
 */
export async function ensureDefaultProductsAndSuppliers() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  const productCount = await prisma.product.count()
  if (productCount === 0) {
    const categories = await prisma.productCategory.findMany()
    const catMap = new Map(categories.map((c) => [c.name, c.id]))

    for (const p of DEFAULT_PRODUCTS) {
      const categoryId = catMap.get(p.categoryName)
      if (!categoryId) continue
      const created = await prisma.product.create({
        data: {
          categoryId,
          sku: p.sku,
          name: p.name,
          purchaseCost: p.purchaseCost,
          sellingPrice: p.sellingPrice,
          currentStock: p.currentStock,
          minStockLevel: p.minStockLevel,
          unit: p.unit,
          isActive: true,
        },
      })

      await prisma.inventoryMovement.create({
        data: {
          productId: created.id,
          movementType: 'PURCHASE',
          quantity: p.currentStock,
          previousStock: 0,
          newStock: p.currentStock,
          reason: 'Initial opening stock',
          referenceType: 'SEED',
        },
      })
    }
  }

  const supplierCount = await prisma.supplier.count()
  if (supplierCount === 0) {
    for (const s of DEFAULT_SUPPLIERS) {
      await prisma.supplier.create({ data: s })
    }
  }
}

/**
 * Formats a product record with plain JS numbers for JSON serialization.
 */
export function serializeProduct(product) {
  if (!product) return null
  const currentStock = Number(product.currentStock || 0)
  const minStockLevel = Number(product.minStockLevel || 0)
  const purchaseCost = Number(product.purchaseCost || 0)
  const sellingPrice = Number(product.sellingPrice || 0)

  return {
    ...product,
    currentStock,
    minStockLevel,
    purchaseCost,
    sellingPrice,
    isLowStock: currentStock <= minStockLevel,
    stockCostValue: Number((currentStock * purchaseCost).toFixed(2)),
    stockRetailValue: Number((currentStock * sellingPrice).toFixed(2)),
  }
}

/**
 * Atomically records a stock movement and updates Product.currentStock.
 *
 * movementType:
 *  - 'PURCHASE'   -> adds Math.abs(quantity)
 *  - 'RETURN'     -> adds Math.abs(quantity) (customer return / voided sale)
 *  - 'SALE'       -> subtracts Math.abs(quantity)
 *  - 'WASTAGE'    -> subtracts Math.abs(quantity)
 *  - 'ADJUSTMENT' -> adds signed quantity (can be positive or negative)
 */
export async function recordStockMovement({
  productId,
  movementType,
  quantity,
  reason,
  referenceId = null,
  referenceType = null,
  createdBy = null,
  allowNegative = false,
  tx = null,
}) {
  const run = async (db) => {
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      const err = new Error('Product not found')
      err.status = 404
      throw err
    }

    const rawQty = Number(quantity)
    if (!Number.isFinite(rawQty) || rawQty === 0) {
      const err = new Error('Quantity must be a non-zero number')
      err.status = 400
      throw err
    }

    const previousStock = Number(product.currentStock || 0)
    let signedDelta = rawQty

    const normalizedType = String(movementType || 'ADJUSTMENT').toUpperCase()
    if (normalizedType === 'PURCHASE' || normalizedType === 'RETURN') {
      signedDelta = Math.abs(rawQty)
    } else if (normalizedType === 'SALE' || normalizedType === 'WASTAGE') {
      signedDelta = -Math.abs(rawQty)
    } else if (normalizedType === 'ADJUSTMENT') {
      signedDelta = rawQty
    } else {
      const err = new Error(`Invalid movementType: ${movementType}`)
      err.status = 400
      throw err
    }

    const newStock = Number((previousStock + signedDelta).toFixed(3))
    if (!allowNegative && newStock < 0) {
      const err = new Error(
        `Insufficient stock for "${product.name}". Available: ${previousStock} ${product.unit}, required: ${Math.abs(signedDelta)} ${product.unit}`
      )
      err.status = 400
      throw err
    }

    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
      include: { category: true },
    })

    const movement = await db.inventoryMovement.create({
      data: {
        productId,
        movementType: normalizedType,
        quantity: signedDelta,
        previousStock,
        newStock,
        reason: reason || `${normalizedType} stock update`,
        referenceId,
        referenceType,
        createdBy,
      },
      include: {
        product: { include: { category: true } },
      },
    })

    return {
      product: serializeProduct(updatedProduct),
      movement: {
        ...movement,
        quantity: Number(movement.quantity),
        previousStock: Number(movement.previousStock),
        newStock: Number(movement.newStock),
      },
    }
  }

  if (tx) {
    return run(tx)
  }
  return prisma.$transaction(run)
}

/**
 * Generates a unique Purchase Order number: PO-YYYYMMDD-XXXX
 */
function generatePONumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `PO-${y}${m}${d}-${rand}`
}

/**
 * Creates a Purchase Order with line items.
 */
export async function createPurchaseOrder({
  supplierId,
  expectedDate,
  items,
  taxAmount = 0,
  paidAmount = 0,
  status = 'CONFIRMED',
  notes = null,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!supplierId) {
    const err = new Error('Supplier is required')
    err.status = 400
    throw err
  }

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one product item is required')
    err.status = 400
    throw err
  }

  const normalizedItems = items.map((item) => {
    const orderedQuantity = Number(item.orderedQuantity || item.quantity || 0)
    const unitPrice = Number(item.unitPrice || 0)
    if (!item.productId || orderedQuantity <= 0 || unitPrice < 0) {
      const err = new Error('Each PO item requires a valid productId, positive quantity, and unitPrice')
      err.status = 400
      throw err
    }
    const totalPrice = Number((orderedQuantity * unitPrice).toFixed(2))
    return {
      productId: item.productId,
      orderedQuantity,
      unitPrice,
      totalPrice,
    }
  })

  const subtotal = Number(
    normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
  )
  const cleanTax = Math.max(0, Number(taxAmount || 0))
  const totalAmount = Number((subtotal + cleanTax).toFixed(2))
  const cleanPaid = Math.max(0, Number(paidAmount || 0))

  const po = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      orderNumber: generatePONumber(),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      subtotal,
      taxAmount: cleanTax,
      totalAmount,
      paidAmount: cleanPaid,
      status,
      notes,
      createdBy: staffUserId,
      items: {
        create: normalizedItems,
      },
    },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
    },
  })

  await createAuditLog({
    userId: staffUserId,
    action: 'PURCHASE_ORDER_CREATED',
    entityType: 'PurchaseOrder',
    entityId: po.id,
    newValues: {
      orderNumber: po.orderNumber,
      supplierId,
      totalAmount,
      itemCount: normalizedItems.length,
    },
    ipAddress,
    userAgent,
  })

  return po
}

/**
 * Receives items on a PurchaseOrder and increments Product stock atomically.
 */
export async function receivePurchaseOrder({
  purchaseOrderId,
  receivedItems = null, // optional [{ itemId, productId, receiveQty }]
  paidAmount = null,
  notes = null,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const result = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    })

    if (!po) {
      const err = new Error('Purchase order not found')
      err.status = 404
      throw err
    }

    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      const err = new Error(`Purchase order is already ${po.status}`)
      err.status = 400
      throw err
    }

    let allFullyReceived = true

    for (const poItem of po.items) {
      const ordered = Number(poItem.orderedQuantity)
      const alreadyReceived = Number(poItem.receivedQuantity || 0)
      const remaining = Math.max(0, Number((ordered - alreadyReceived).toFixed(3)))

      let deltaReceive = remaining
      if (Array.isArray(receivedItems)) {
        const match = receivedItems.find(
          (r) => r.itemId === poItem.id || r.productId === poItem.productId
        )
        deltaReceive = match ? Math.max(0, Number(match.receiveQty || 0)) : 0
      }

      const newReceivedTotal = Number((alreadyReceived + deltaReceive).toFixed(3))
      if (newReceivedTotal < ordered) {
        allFullyReceived = false
      }

      if (deltaReceive > 0) {
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: newReceivedTotal },
        })

        // Update product purchaseCost to latest PO unitPrice
        await tx.product.update({
          where: { id: poItem.productId },
          data: { purchaseCost: Number(poItem.unitPrice) },
        })

        await recordStockMovement({
          productId: poItem.productId,
          movementType: 'PURCHASE',
          quantity: deltaReceive,
          reason: `Received PO ${po.orderNumber} from ${po.supplier.name}`,
          referenceId: po.id,
          referenceType: 'PurchaseOrder',
          createdBy: staffUserId,
          tx,
        })
      }
    }

    const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
    const updatedPO = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: newStatus,
        receivedDate: newStatus === 'RECEIVED' ? new Date() : po.receivedDate,
        ...(paidAmount !== null && paidAmount !== undefined
          ? { paidAmount: Number(paidAmount) }
          : {}),
        ...(notes !== null && notes !== undefined ? { notes } : {}),
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    })

    return updatedPO
  })

  await createAuditLog({
    userId: staffUserId,
    action: 'PURCHASE_ORDER_RECEIVED',
    entityType: 'PurchaseOrder',
    entityId: result.id,
    newValues: {
      orderNumber: result.orderNumber,
      status: result.status,
    },
    ipAddress,
    userAgent,
  })

  return result
}

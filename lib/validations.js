/**
 * Shared Zod validation schemas.
 * Used by both API route handlers (server) and React Hook Form (client).
 * Pure JavaScript — no TypeScript annotations.
 */

import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// ── Booking ───────────────────────────────────────────────────────────────────

export const bookingSchema = z.object({
  tableId:      z.string().cuid('Invalid table ID'),
  bookingDate:  z.string().min(1, 'Select a date'),          // YYYY-MM-DD
  startTime:    z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  durationHours: z.number().min(0.5).max(8),
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone:        z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit mobile number'),
  email:        z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes:        z.string().max(500).optional(),
})

// ── Contact form ──────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone:   z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit mobile number'),
  email:   z.string().email('Enter a valid email').optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
})

// ── Customer profile ──────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
})

// ── Gaming session ────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
  tableId:      z.string().cuid('Invalid table ID'),
  sessionType:  z.enum(['ONLINE_BOOKING', 'WALK_IN', 'PREPAID', 'COMPLIMENTARY']),
  customerName: z.string().min(2).max(100).optional(),
  phone:        z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  customerId:   z.string().cuid().optional(),
  bookingId:    z.string().cuid().optional(),
  hourlyRate:   z.number().positive().optional(),  // override; defaults to table rate
  notes:        z.string().max(500).optional(),
})

export const stopSessionSchema = z.object({
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().max(200).optional(),
  paymentMethod:  z.enum(['CASH', 'UPI', 'RAZORPAY', 'CARD', 'BANK_TRANSFER']).optional(),
  notes:          z.string().max(500).optional(),
})

// ── POS ───────────────────────────────────────────────────────────────────────

export const posSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().cuid('Invalid product ID'),
    quantity:  z.number().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
    discount:  z.number().min(0).optional(),
  })).min(1, 'Cart cannot be empty'),
  paymentMethod:  z.enum(['CASH', 'UPI', 'RAZORPAY', 'CARD', 'BANK_TRANSFER']),
  discountAmount: z.number().min(0).optional(),
  customerId:     z.string().cuid().optional(),
  notes:          z.string().max(500).optional(),
})

// ── Expense ───────────────────────────────────────────────────────────────────

export const expenseSchema = z.object({
  categoryId:      z.string().cuid('Invalid category ID'),
  amount:          z.number().positive('Amount must be positive'),
  date:            z.string().min(1, 'Date is required'),
  description:     z.string().min(3, 'Add a short description').max(500),
  paymentMethod:   z.enum(['CASH', 'UPI', 'RAZORPAY', 'CARD', 'BANK_TRANSFER']),
  referenceNumber: z.string().max(100).optional(),
  supplierId:      z.string().cuid().optional(),
})

// ── Products ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  categoryId:    z.string().cuid('Invalid category ID'),
  name:          z.string().min(2).max(200),
  sku:           z.string().max(100).optional().or(z.literal('')),
  barcode:       z.string().max(100).optional().or(z.literal('')),
  description:   z.string().max(1000).optional(),
  purchaseCost:  z.number().min(0),
  sellingPrice:  z.number().min(0),
  currentStock:  z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  unit:          z.string().max(50).optional(),
})

// ── Support ticket ────────────────────────────────────────────────────────────

export const supportTicketSchema = z.object({
  subject:      z.string().min(5, 'Subject must be at least 5 characters').max(200),
  category:     z.string().min(1, 'Select a category'),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  description:  z.string().min(20, 'Please describe your issue in at least 20 characters').max(5000),
  referenceId:  z.string().optional(),
  referenceType:z.string().optional(),
})

export const ticketReplySchema = z.object({
  message:    z.string().min(1, 'Reply cannot be empty').max(5000),
  isInternal: z.boolean().optional(),
})

// ── Business settings ─────────────────────────────────────────────────────────

export const businessSettingsSchema = z.object({
  businessName:    z.string().min(2).max(200),
  phone:           z.string().min(7).max(20),
  email:           z.string().email(),
  address:         z.string().min(5).max(500),
  timezone:        z.string().min(1),
  openingTime:     z.string().regex(/^\d{2}:\d{2}$/),
  closingTime:     z.string().regex(/^\d{2}:\d{2}$/),
  advanceAmount:   z.number().min(0),
  fullPaymentOnly: z.boolean(),
  bookingHoldMins: z.number().min(5).max(60),
  maxBookingDays:  z.number().min(1).max(365),
  taxRate:         z.number().min(0).max(100),
  whatsappNumber:  z.string().max(20).optional().or(z.literal('')),
  googleMapsUrl:   z.string().url().optional().or(z.literal('')),
  instagramUrl:    z.string().url().optional().or(z.literal('')),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a Zod result and return { data, errors }.
 * errors is an object of fieldName → message or null.
 *
 * @param {z.ZodType} schema
 * @param {unknown} input
 */
export function parseSchema(schema, input) {
  const result = schema.safeParse(input)
  if (result.success) return { data: result.data, errors: null }

  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    if (!errors[key]) errors[key] = issue.message
  }
  return { data: null, errors }
}

// Payment utility functions

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
}

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export const getPaymentStatusColor = (status) => {
  switch (status) {
    case PAYMENT_STATUS.PAID:
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case PAYMENT_STATUS.FAILED:
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case PAYMENT_STATUS.REFUNDED:
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case PAYMENT_STATUS.PENDING:
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
}

export const getBookingStatusColor = (status) => {
  switch (status) {
    case BOOKING_STATUS.CONFIRMED:
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case BOOKING_STATUS.CANCELLED:
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case BOOKING_STATUS.COMPLETED:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case BOOKING_STATUS.PENDING:
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
}

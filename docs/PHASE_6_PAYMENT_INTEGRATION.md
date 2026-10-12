# Phase 6: Payment Integration with Razorpay

## Overview
This phase implements complete Razorpay payment integration for the Cue Club booking system.

## What's Been Implemented

### 1. Payment API Endpoints

#### Create Order (`/api/payments/create-order`)
- Creates Razorpay order for a booking
- Stores payment record i
n database with PENDING status
- Returns order details for frontend checkout

#### Verify Payment (`/api/payments/verify`)
- Verifies Razorpay payment signature
- Updates payment status to PAID
- Updates booking status to CONFIRMED

#### Webhook Handler (`/api/payments/webhook`)
- Handles Razorpay webhook events
- Processes `payment.captured` events
- Processes `payment.failed` events
- Automatically updates booking and payment status

#### Refund API (`/api/payments/refund`)
- Processes refunds for payments
- Updates payment status to REFUNDED
- Cancels associated booking

### 2. Payment Components

#### Payment Success Page (`/payment/success`)
- Displays booking confirmation
- Shows payment details
- Provides download receipt option
- Animated success state

#### Payment Failed Page (`/payment/failed`)
- Displays error message
- Shows common failure reasons
- Provides retry option
- Support contact information

### 3. Payment Utilities (`lib/payment.js`)
- Payment status constants
- Booking status constants
- Currency formatting
- Status color helpers

### 4. Integration Updates

#### Booking Modal
- Redirects to success page on successful payment
- Redirects to failed page on payment failure
- Passes booking details via URL params

#### Booking Page
- Same redirect logic as modal
- Consistent user experience

## Setup Instructions

### 1. Get Razorpay Credentials

1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings → API Keys
3. Generate Key ID and Key Secret
4. Copy both credentials

### 2. Configure Environment Variables

Update your `.env` file with your Razorpay credentials:

```env
# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID="rzp_live_your_key_id_here"
RAZORPAY_KEY_SECRET="your_secret_key_here"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
```

**Important:** 
- Use test mode credentials for development
- Use live credentials for production
- Never commit `.env` file to version control

### 3. Configure Webhook (Production Only)

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add new webhook with URL: `https://yourdomain.com/api/payments/webhook`
3. Set webhook secret and add to `.env`
4. Subscribe to events:
   - `payment.captured`
   - `payment.failed`

### 4. Test Mode Setup

For testing without real money:

1. Use Razorpay test credentials
2. Use test card details:
   - Card: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: Any 3 digits
   - OTP: Any 6 digits

## Payment Flow

```
User clicks "Book Now"
    ↓
Fills booking details
    ↓
Clicks "Confirm & Pay ₹100"
    ↓
POST /api/bookings (creates booking)
    ↓
POST /api/payments/create-order (creates Razorpay order)
    ↓
Razorpay checkout opens
    ↓
User completes payment
    ↓
POST /api/payments/verify (verifies signature)
    ↓
Redirect to /payment/success OR /payment/failed
```

## Database Schema Updates

The following tables are used:

### Payment Table
- `id`: Primary key
- `bookingId`: Foreign key to bookings
- `amount`: Payment amount in rupees
- `currency`: Currency code (INR)
- `status`: PENDING, PAID, FAILED, REFUNDED
- `razorpayOrderId`: Razorpay order ID
- `razorpayPaymentId`: Razorpay payment ID
- `razorpaySignature`: Payment signature
- `refundId`: Refund ID (if refunded)
- `refundAmount`: Refunded amount
- `paidAt`: Payment timestamp
- `refundedAt`: Refund timestamp
- `failureReason`: Failure reason (if failed)

### Booking Table
- `status`: PENDING, CONFIRMED, CANCELLED, COMPLETED
- `paymentStatus`: UNPAID, PAID, REFUNDED
- `advanceAmount`: Advance payment amount (₹100)

## Security Features

1. **Signature Verification**: All payments are verified using HMAC SHA256
2. **Webhook Signature**: Webhook events are verified with secret
3. **Idempotency**: Duplicate payments are prevented
4. **Status Checks**: Only valid status transitions allowed

## Error Handling

### Common Errors

1. **Invalid Signature**
   - Check RAZORPAY_KEY_SECRET
   - Ensure webhook secret matches

2. **Payment Already Processed**
   - User tried to pay for same booking twice
   - Check payment status before retry

3. **Booking Not Found**
   - Invalid booking ID
   - Booking was deleted

4. **Razorpay API Error**
   - Check API credentials
   - Verify network connectivity
   - Check Razorpay service status

## Testing Checklist

- [ ] Test successful payment with test card
- [ ] Test failed payment scenarios
- [ ] Verify payment status updates in database
- [ ] Verify booking status updates
- [ ] Test webhook events (production)
- [ ] Test refund flow
- [ ] Verify redirect URLs
- [ ] Test on mobile devices
- [ ] Test with different payment methods

## Production Deployment

1. Update `.env` with live credentials
2. Configure webhook with production URL
3. Enable SSL certificate
4. Set up monitoring for payment failures
5. Configure email notifications for bookings
6. Test live payment with small amount (₹1)

## Monitoring & Logging

All payment operations are logged:

- Order creation
- Payment verification
- Webhook events
- Refunds
- Errors

Check console logs for debugging.

## Support

For Razorpay-specific issues:
- Documentation: https://razorpay.com/docs/
- Support: support@razorpay.com

For integration issues:
- Check API endpoint logs
- Verify database connections
- Review environment variables

## Next Steps

After Phase 6 is complete:
- Phase 7: Admin Panel
- Phase 8: Testing & Polish

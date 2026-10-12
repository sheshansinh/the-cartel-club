# CUE CLUB ERP - Project Audit

## Executive Summary

This audit documents the current state of the CUE CLUB project and provides a roadmap for implementing the complete ERP system.

---

## 1. Current Technology Stack

### Framework & Core
- **Next.js**: 15.5.27 (App Router)
- **React**: 18.3.1
- **Node.js**: Compatible with current setup
- **Language**: JavaScript/JSX only (no TypeScript)

### Database & ORM
- **Database**: MySQL
- **ORM**: Prisma 6.5.0
- **Connection**: Via DATABASE_URL environment variable

### Authentication
- **Library**: next-auth 4.24.0
- **Current Status**: Installed but not configured for Google OAuth
- **Admin Login**: Basic hardcoded credentials in `app/admin/login/page.jsx`
- **Session Management**: Client-side localStorage (temporary, not secure)

### UI & Styling
- **Styling**: Tailwind CSS 3.4.0
- **Components**: shadcn/ui (Dialog, Select, Tabs, Switch, DropdownMenu, etc.)
- **Icons**: Lucide React 0.468.0
- **Animations**: Framer Motion 11.0.0, GSAP 3.12.0
- **Forms**: React Hook Form 7.48.0, Zod 3.22.0
- **Toasts**: Sonner 1.4.0

### Payment Integration
- **Provider**: Razorpay 2.8.6
- **Status**: Partially implemented
- **Endpoints**: `/api/payments/create-order`, `/api/payments/verify`
- **Webhook**: Not implemented

### Other Dependencies
- **bcryptjs**: 2.4.3 (password hashing)
- **date-fns**: 3.0.0 (date utilities)
- **matter-js**: 0.19.0 (physics for pool game)

---

## 2. Current Database Schema

### Existing Models

#### User
- Fields: id, name, email, passwordHash, role (ADMIN only), timestamps
- Purpose: Admin users only
- Missing: Customer profiles, OAuth integration, role expansion

#### Table
- Fields: id, tableNumber, name, type (POOL/SNOOKER), status, isActive, sequence, hourlyRate, timestamps
- Purpose: Pool and snooker tables
- Status: AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE
- Recent Updates: Added name, sequence, hourlyRate for dynamic table management

#### Booking
- Fields: id, customerName, phone, email, tableId, bookingDate, startTime, endTime, duration, status, paymentStatus, advanceAmount, notes, timestamps
- Status: PENDING, CONFIRMED, CANCELLED, COMPLETED, EXPIRED
- Payment Status: UNPAID, PENDING, PAID, FAILED, REFUNDED
- Relations: Table, Payment
- Missing: Customer reference, booking holds, status history, overlap prevention

#### Payment
- Fields: id, bookingId, amount, provider, transactionId, orderId, status, rawReference, timestamps
- Relations: Booking
- Missing: Refund tracking, webhook events, payment method details

#### GalleryImage
- Fields: id, title, imageUrl, category, sortOrder, isActive, timestamps
- Purpose: Website gallery

#### ContactMessage
- Fields: id, name, phone, email, message, status, timestamps
- Status: NEW, READ, RESOLVED
- Purpose: Contact form submissions

#### BusinessSettings
- Fields: id, businessName, logoUrl, phone, email, address, openingHours, advanceAmount, googleMapsUrl, instagramUrl, whatsappNumber, timestamps
- Purpose: Business configuration

---

## 3. Current API Endpoints

### Admin APIs
- `/api/admin/bookings` - GET (list), PATCH (update status)
- `/api/admin/tables` - GET (list), POST (create)
- `/api/admin/customers` - GET (list)
- `/api/admin/payments` - GET (list)
- `/api/admin/dashboard` - GET (stats)

### Public APIs
- `/api/tables` - GET (list with availability)
- `/api/bookings` - POST (create)
- `/api/payments/create-order` - POST (Razorpay order)
- `/api/payments/verify` - POST (verify payment)
- `/api/contact` - POST (contact form)
- `/api/gallery` - GET (gallery images)

### Missing APIs
- Gaming sessions
- Loyalty rewards
- POS operations
- Inventory management
- Expense tracking
- Employee management
- Support tickets
- OAuth callbacks
- Webhook handling
- Notifications

---

## 4. Current Admin Panel

### Implemented Sections
1. **Dashboard** - Basic stats (bookings, revenue, tables)
2. **Bookings** - List view with status filters
3. **Tables** - Dynamic table management with custom names, pricing, sequencing, status
4. **Customers** - Basic list
5. **Payments** - Transaction list
6. **Analytics** - Revenue, bookings, peak hours, table utilization
7. **Automation** - Notification settings (UI only)
8. **Reports** - Report generation (UI only)
9. **Inventory** - Basic inventory UI (mock data)
10. **Calendar** - Monthly calendar view
11. **Settings** - Business configuration

### Missing Admin Features
- Role-based permissions
- Gaming session management
- POS interface
- Full inventory operations
- Expense management
- Employee management
- Equipment/warranty tracking
- Support ticket management
- Audit logs
- Notification system
- Advanced financial reports

---

## 5. Current Public Website

### Implemented Sections
- Homepage with cinematic hero
- Navbar with liquid glass effect
- Booking modal (popup)
- About page
- Gallery page
- Contact page
- Booking page (multi-step form)
- Pool game (interactive physics)

### Missing Public Features
- Customer authentication
- Customer portal/dashboard
- Profile management
- Booking history
- Gaming session history
- Rewards display
- Support ticket submission

---

## 6. Current Authentication

### Status
- **Admin**: Hardcoded credentials (username: admin, password: admin123)
- **Storage**: localStorage (insecure, temporary)
- **Customers**: No authentication system
- **OAuth**: next-auth installed but not configured

### Required Changes
- Implement Google OAuth for customers
- Implement secure server-side sessions
- Add role-based access control
- Remove hardcoded admin credentials
- Implement proper password hashing for staff accounts

---

## 7. Current Payment Integration

### Implemented
- Razorpay order creation
- Payment verification (basic)
- Payment status tracking

### Missing
- Webhook handling
- Idempotent webhook processing
- Refund processing
- Payment method tracking
- Booking hold expiry
- Duplicate payment prevention
- Proper revenue recognition

---

## 8. Critical Gaps & Issues

 ### Security Issues
1. Admin credentials hardcoded
2. Session storage in localStorage (insecure)
3. No server-side authorization checks
4. No CSRF protection
5. No rate limiting
6. Payment signatures not verified properly
7. No audit logging

### Business Logic Gaps
1. No booking hold mechanism
2. No overlap prevention for concurrent bookings
3. No gaming session tracking
4. No loyalty/rewards system
5. No POS system
6. No inventory tracking
7. No expense management
8. No employee management
9. No equipment tracking
10. No support ticket system

### Database Issues
1. Missing customer profiles
2. Missing role/permission system
3. Missing gaming session models
4. Missing loyalty models
5. Missing POS/inventory models
6. Missing expense models
7. Missing employee models
8. Missing asset/warranty models
9. Missing support ticket models
10. Missing notification models
11. Missing audit log models
12. Booking model lacks customer reference
13. No booking status history
14. No webhook event tracking

---

## 9. Implementation Priority

### Phase 1: Foundation (Critical)
1. Extend Prisma schema with all ERP models
2. Implement role-based access control
3. Create shared business logic services
4. Set up Google OAuth
5. Implement secure authentication

### Phase 2: Customer & Booking (High Priority)
1. Build customer portal
2. Enhance booking system with holds and overlap prevention
3. Implement proper payment verification and webhooks
4. Add booking status history

### Phase 3: Operations (Medium Priority)
1. Gaming session management
2. Loyalty/rewards engine
3. POS system
4. Inventory management

### Phase 4: Financials (Medium Priority)
1. Expense tracking
2. Financial reporting
3. Accounting reconciliation

### Phase 5: Management (Lower Priority)
1. Employee management
2. Equipment/warranty tracking
3. Support ticket system

### Phase 6: Polish (High Priority)
1. Notifications
2. Audit logging
3. Comprehensive reports
4. Security review
5. Testing

---

## 10. Database Migration Strategy

### Current State
- Database exists with basic schema
- Some tables have data (tables, bookings, payments, etc.)
- Migration history is out of sync (drift detected)

### Recommended Approach
1. Create a new migration to add all ERP models
2. Use additive migrations only (no destructive changes)
3. Preserve existing data
4. Update seed script with new models
5. Test migration on development database first

---

## 11. Environment Variables Required

### Current Variables
- DATABASE_URL
- AUTH_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- Cloudinary credentials (optional)
- Google Maps URL (optional)
- WhatsApp number (optional)

### Additional Variables Needed
- AUTH_GOOGLE_ID
- AUTH_GOOGLE_SECRET
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- Email service credentials (if implementing email notifications)
- File storage credentials (if implementing file uploads)

---

## 12. Next Steps

1. **Immediate**: Extend Prisma schema with ERP models
2. **Then**: Implement role-based access control
3. **Then**: Set up Google OAuth
4. **Then**: Build customer portal
5. **Then**: Implement gaming sessions and loyalty
6. **Then**: Build POS and inventory
7. **Then**: Add expense tracking and financials
8. **Finally**: Complete admin dashboard and polish

---

## Conclusion

The project has a solid foundation with:
- Modern Next.js setup
- Basic booking and payment flow
- Admin panel with table management
- Premium UI design

However, it lacks the comprehensive ERP features required for complete business management. The implementation will require significant database schema extensions, new API endpoints, and additional UI components.

The existing codebase should be preserved and extended rather than replaced. All new features should integrate seamlessly with the current design and architecture.

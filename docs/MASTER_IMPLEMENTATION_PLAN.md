# CUE CLUB ERP — Master Implementation Plan

> **Version:** 2.0  
> **Created:** October 2026  
> **Status:** Active  
> **Scope:** Complete business management ERP — public website through full back-office

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Audit Findings](#2-audit-findings)
3. [Technology Decisions](#3-technology-decisions)
4. [Database Architecture](#4-database-architecture)
5. [System Modules](#5-system-modules)
6. [Implementation Phases](#6-implementation-phases)
7. [API Reference Map](#7-api-reference-map)
8. [Authentication & Security Model](#8-authentication--security-model)
9. [Environment Configuration](#9-environment-configuration)
10. [File Structure](#10-file-structure)
11. [Migration Strategy](#11-migration-strategy)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Progress Tracker](#13-progress-tracker)

---

## 1. Project Context

### What This Is

CUE CLUB is a premium pool and snooker bar in Ahmedabad. This project delivers:

- A **public-facing website** with cinematic design, gallery, and online booking
- A **customer portal** for accounts, booking history, rewards, and support
- A **complete back-office ERP** covering operations, finance, HR, assets, and reporting

### Guiding Principles

- **Additive only.** Never delete working code or data. Extend what exists.
- **Server-side trust.** Every price, permission, and business rule is enforced on the server.
- **One source of truth.** All modules share the same database and business logic layer.
- **No TypeScript.** Pure JavaScript and JSX throughout.
- **Preserve branding.** The existing dark palette, navbar, hero, and booking CTA stay intact.

### Technology Stack (Locked)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | JavaScript / JSX |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Animation | Framer Motion |
| Database | MySQL |
| ORM | Prisma 6.5 |
| Auth | next-auth v4 (Google OAuth) |
| Payments | Razorpay |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Toasts | Sonner |

---

## 2. Audit Findings

### What Already Works ✅

| Area | Status |
|---|---|
| Next.js 15 App Router setup | Working |
| Tailwind + shadcn/ui integration | Working |
| Prisma 6 + MySQL connection | Working |
| Public homepage sections (Hero, PoolGame, Gallery, etc.) | Working |
| Navbar with booking modal trigger | Working |
| Booking modal (single-page form) | Working |
| Multi-step booking page `/book` | Working |
| Razorpay order creation | Working |
| Razorpay payment verification | Working |
| Webhook handler (basic) | Working |
| Refund API | Working |
| Admin panel shell (sidebar + tab routing) | Working |
| Admin dashboard (mock data) | Working |
| Admin bookings list (mock data) | Working |
| Admin tables CRUD | Working |
| Admin customers list | Working |
| Admin payments list | Working |
| Analytics, Reports, Calendar, Inventory, Automation UI | UI only — no backend |
| Payment success / failed pages | Working |

### Critical Issues Found ❌

#### Security
- Admin authentication uses **hardcoded credentials** (`admin` / `admin123`) stored in `localStorage` — no server session
- **No authorization middleware** on any API route — every endpoint is publicly accessible
- **No rate limiting** anywhere
- Customer data fully exposed to any caller

#### Schema Mismatches
- `lib/prisma.js` uses `default export`; some routes import `{ prisma }` (named) — runtime error
- `BookingStatus` enum has `PENDING_PAYMENT` but booking routes write `'PENDING'` — invalid enum value
- `Payment` model is missing `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `paidAt`, `failureReason`, `refundId`, `refundAmount`, `refundedAt` — all referenced in routes
- `Payment` references `booking.payment` (singular) but schema has `booking.payments` (array)
- `Booking` has no `customerId` field but `CustomerProfile` declares a `bookings` relation
- `BookingStatusHistory` relation missing from `Booking` model
- `GamingSession.bookingId` has no back-relation on `Booking`
- Seed script uses `role: 'ADMIN'` — enum value does not exist (should be `SUPER_ADMIN`)

#### Business Logic
- **No booking hold / expiry** — two users can confirm the same slot simultaneously
- Time overlap detection uses **string comparison** not actual DateTime arithmetic — produces wrong results
- Price **calculated on the client** and trusted server-side — trivially manipulated
- Advance amount hard-coded to `₹100` in multiple places — not driven by `BusinessSettings`
- Webhook processing **not idempotent** — duplicate `payment.captured` events double-confirm bookings
- No `WebhookEvent` deduplication despite the model existing in schema

#### UI
- Admin dashboard, bookings, customers, analytics, reports show **mock/fake data** — not wired to APIs
- Admin sidebar uses `localStorage` logout only — no session invalidation

### What Needs to Be Built From Scratch

- Google OAuth customer sign-in + customer portal
- Real booking hold + expiry mechanism
- Server-side price calculation
- Role-based access control middleware
- Gaming session lifecycle
- Loyalty / reward engine
- POS system
- Inventory with stock movements
- Expense management
- Financial dashboard (real data)
- Employee, shift, attendance, salary management
- Asset, warranty, maintenance management
- Support ticket system (customer + admin)
- Notification system
- Audit logging
- All admin module backend connections

---

## 3. Technology Decisions

### Auth.js (next-auth v4)

Using `next-auth` v4 (already installed). Google OAuth for customers. Staff use email + password. Prisma Adapter handles session persistence.

**Required adapters:**
```
npm install @next-auth/prisma-adapter
```

**Session strategy:** `database` (not JWT) so sessions can be revoked server-side.

### Recharts

Already compatible with React 18. Used for admin analytics charts (revenue, bookings, peak hours, table utilization). Import dynamically to avoid SSR issues.

### Money handling

All monetary fields use `Decimal` in Prisma (`@db.Decimal(10,2)`). In JavaScript, convert to `Number` only for display. Never use floating-point arithmetic for totals or comparisons — use string-based addition with Prisma's `Decimal` type or a cents-based integer approach.

### Booking holds

When a customer selects a table and proceeds to checkout, a booking record is created with status `PENDING_PAYMENT` and a `holdExpiresAt` set to `now + 15 minutes` (configurable via `BusinessSettings.bookingHoldMins`). A cron-style cleanup runs on the next `/api/tables` request to expire stale holds. No external job scheduler needed.

### Timezone

All DateTime values stored in UTC. Business timezone configured in `BusinessSettings.timezone` (default `Asia/Kolkata`). All display conversions happen in the UI layer using `date-fns` timezone utilities.

---

## 4. Database Architecture

### Schema Version

The Prisma schema has been fully rewritten in `prisma/schema.prisma`. Key decisions:

- `Account`, `Session`, `VerificationToken` added for next-auth Prisma Adapter
- `User` extended with `image`, `emailVerified` (next-auth required fields)
- `Booking` now has `bookingRef` (stable public reference), `customerId`, `durationHours` (Decimal), `totalAmount`, `holdExpiresAt`, and proper status history relation
- `Payment` has all Razorpay fields: `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `paidAt`, `failureReason`, `refundId`, `refundAmount`, `refundedAt`
- `WebhookEvent` has `eventId` unique field for idempotency
- All money fields are `Decimal`, not `Float`
- `GamingSession` linked back to `Booking`
- `CustomerProfile` linked to `Booking` via `customerId`
- `SalaryRecord` uses `month Int` + `year Int` with unique constraint

### Model Inventory

```
Auth:         Account, Session, VerificationToken
Users:        User, CustomerProfile, EmployeeProfile
RBAC:         Permission, RolePermission
Tables:       Table, TableBlockout
Bookings:     Booking, BookingStatusHistory
Payments:     Payment, WebhookEvent
Sessions:     GamingSession, SessionAdjustment
Loyalty:      LoyaltyProgram, RewardRule, RewardLedger
Products:     ProductCategory, Product, InventoryMovement
Purchasing:   Supplier, PurchaseOrder, PurchaseOrderItem
POS:          POSSale, POSSaleItem, POSPayment
Expenses:     ExpenseCategory, Expense
Employees:    Shift, Attendance, SalaryRecord
Assets:       Asset, Warranty, MaintenanceRecord
Support:      SupportTicket, TicketMessage
Comms:        Notification
System:       AuditLog, GalleryImage, ContactMessage, BusinessSettings
```

---

## 5. System Modules

### Module A — Public Website

**Current state:** Complete and working.  
**Remaining work:** None. Preserve all existing sections.

Files: `app/page.jsx`, `components/home/*`, `components/layout/*`

---

### Module B — Authentication & Customer Accounts

**Current state:** Not implemented. Admin uses hardcoded localStorage hack.

**Deliverables:**

- `app/api/auth/[...nextauth]/route.js` — next-auth route handler
- `lib/auth.js` — NextAuth config (Google provider + Prisma adapter + callbacks)
- `middleware.js` — route protection at the edge
- `app/(customer)/dashboard/page.jsx` — customer portal
- `app/(customer)/profile/page.jsx` — edit profile + phone
- `app/(customer)/bookings/page.jsx` — booking history
- `app/(customer)/rewards/page.jsx` — loyalty progress
- `app/(customer)/tickets/page.jsx` — support ticket list + create
- `components/customer/*` — portal UI components
- Replace `app/admin/login/page.jsx` with proper next-auth credentials sign-in
- Replace `app/admin/layout.jsx` with server-side session check

**Business rules:**
- Google sign-in creates `User` (role `CUSTOMER`) + `CustomerProfile` automatically on first login
- Phone number is optional, never OTP-verified, shown as "Unverified" in UI
- Customer can only see their own data — enforced via `session.user.id` on every query
- Admin/staff sign in via `/admin/login` using email + password (`bcryptjs`)
- Session strategy: `database` — session rows in DB, revokable

---

### Module C — Booking Engine

**Current state:** Basic flow exists but has overlap bugs, hardcoded price, no holds.

**Deliverables:**

- `lib/services/booking.js` — all booking business logic
- Updated `app/api/bookings/route.js` — use service layer
- Updated `app/api/bookings/[id]/route.js` — full booking detail + cancel
- `app/api/bookings/hold/route.js` — create/renew hold
- `app/api/bookings/expire/route.js` — expire stale holds (called internally)
- Updated `app/book/page.jsx` — require auth, full price display, policy acceptance
- Updated `components/booking-modal.jsx` — same

**Business rules:**
- On "Select Table" → create `PENDING_PAYMENT` booking with `holdExpiresAt = now + 15 min`
- Overlap check: `existingStart < requestedEnd AND existingEnd > requestedStart`, for statuses `[PENDING_PAYMENT, CONFIRMED, CHECKED_IN, IN_PROGRESS]`
- Times stored as `"HH:MM"` 24-hour strings; overlap arithmetic done in JavaScript with minutes
- Price calculated server-side: `table.hourlyRate × durationHours`
- Advance amount read from `BusinessSettings.advanceAmount`
- `fullPaymentOnly = true` → collect full price at booking time
- Only Razorpay payment confirmation (via webhook or verify endpoint) sets status to `CONFIRMED`
- Never confirm from client-side response alone
- Hold cleanup: on every `GET /api/tables` call, run `expireOldHolds()` — sets status `EXPIRED` where `holdExpiresAt < now AND status = PENDING_PAYMENT`
- Booking cancellation records reason and creates `BookingStatusHistory` entry

**Booking status flow:**
```
PENDING_PAYMENT → (payment success) → CONFIRMED
PENDING_PAYMENT → (hold expires)   → EXPIRED
CONFIRMED       → (staff check-in) → CHECKED_IN
CHECKED_IN      → (session start)  → IN_PROGRESS
IN_PROGRESS     → (session end)    → COMPLETED
CONFIRMED       → (cancel)         → CANCELLED
CONFIRMED       → (no-show)        → NO_SHOW
```

---

### Module D — Razorpay Payments

**Current state:** Partially working. Missing idempotency, proper schema fields, full-price enforcement.

**Deliverables:**

- Updated `app/api/payments/create-order/route.js` — server-side price, reject if hold expired
- Updated `app/api/payments/verify/route.js` — idempotent, update `BookingStatusHistory`
- Updated `app/api/payments/webhook/route.js` — idempotent via `WebhookEvent.eventId`
- Updated `app/api/payments/refund/route.js` — partial + full refund, status corrections
- `lib/services/payment.js` — payment service functions

**Business rules:**
- Order amount = server-calculated `totalAmount` (or `advanceAmount` if partial allowed)
- Never trust `amount` from client body
- Webhook: check `WebhookEvent` by `eventId` before processing — skip if already processed
- Signature verification uses raw body (text, not parsed JSON)
- On `payment.captured`: set `Payment.status = PAID`, `Booking.status = CONFIRMED`, create `BookingStatusHistory`
- On `payment.failed`: set `Payment.status = FAILED`, `Booking.status = CANCELLED`
- Refund updates `Payment.status` to `REFUNDED` or `PARTIALLY_REFUNDED`, records `refundId`, `refundAmount`, `refundedAt`

---

### Module E — Gaming Session Management

**Current state:** Schema exists. Zero implementation.

**Deliverables:**

- `app/api/sessions/route.js` — start/list sessions
- `app/api/sessions/[id]/route.js` — get/extend/stop session
- `lib/services/session.js` — session lifecycle service
- `app/(admin)/sessions/page.jsx` — live sessions board (admin/staff)
- Admin sidebar addition: "Sessions" menu item

**Business rules:**
- Starting a session marks `Table.status = OCCUPIED`
- Only one `ACTIVE` or `PAUSED` session per table at a time — enforced with DB unique-style query
- Actual duration = `(endTime - startTime)` in hours, rounded to 2 decimal places
- Charge = `actualDuration × hourlyRate`, minus `discountAmount`
- On session completion: update `CustomerProfile.totalPlayingHours`, run loyalty check
- Walk-in customer record created if no `customerId` (name + phone only)
- Session types: `ONLINE_BOOKING`, `WALK_IN`, `PREPAID`, `COMPLIMENTARY`
- Extensions create a `SessionAdjustment` record with reason
- Abandoned sessions (no end event within 24h) flagged in admin view for manual resolution

---

### Module F — Loyalty & Rewards

**Current state:** Schema exists (`LoyaltyProgram`, `RewardRule`, `RewardLedger`). Zero implementation.

**Deliverables:**

- `lib/services/loyalty.js` — reward calculation engine
- `app/api/rewards/route.js` — customer reward history
- `app/api/admin/loyalty/route.js` — admin: configure rules, grant/revoke rewards
- Customer portal rewards page (Module B)

**Business rules:**
- After each session or booking completion: call `checkAndIssueRewards(customerId)`
- `checkAndIssueRewards`: reads all active `RewardRule`s, checks if customer's `totalPlayingHours` crosses any new threshold that hasn't been issued yet
- A reward is issued **exactly once** per threshold crossing — tracked via existing `RewardLedger` entries
- Default rules (seeded, configurable):
  - 5 hours played → 1 bonus hour
  - 31 hours played → 5 bonus hours
- `RewardLedger.status` transitions: `EARNED` → `REDEEMED` or `EXPIRED`
- Admin can grant/revoke with mandatory `reason` field — creates new ledger entry
- `CustomerProfile.rewardBalance` is a denormalised sum — recalculated on every change to ensure consistency
- Redemption deducts from `rewardBalance`, never goes below zero

---

### Module G — POS System

**Current state:** Schema exists. UI component exists (mock data only).

**Deliverables:**

- `app/api/pos/route.js` — create sale
- `app/api/pos/[id]/route.js` — void sale
- `app/api/pos/products/route.js` — list products for POS
- `lib/services/pos.js` — POS checkout service (transaction-safe)
- Updated `components/admin/admin-pos.jsx` (rename inventory to POS or separate)

**Business rules:**
- Every sale deducts stock via `InventoryMovement` in the same DB transaction
- If stock < quantity ordered → reject unless product has `allowNegativeStock = true`
- `saleRef` generated server-side (CUID), displayed as receipt number
- Voided sales create reversal `InventoryMovement` entries — never delete records
- Tax applied at `BusinessSettings.taxRate` — stored separately in `taxAmount`
- Cashier (`employeeId`) recorded on every sale

---

### Module H — Inventory, Purchasing & Suppliers

**Current state:** UI component exists (mock). APIs missing entirely.

**Deliverables:**

- `app/api/admin/products/route.js` — CRUD
- `app/api/admin/products/[id]/route.js`
- `app/api/admin/categories/route.js`
- `app/api/admin/inventory/movements/route.js` — stock adjustment
- `app/api/admin/suppliers/route.js` — CRUD
- `app/api/admin/purchase-orders/route.js` — create/list POs
- `app/api/admin/purchase-orders/[id]/route.js` — receive goods
- `lib/services/inventory.js` — inventory movement service
- Updated `components/admin/admin-inventory.jsx` — wired to real APIs
- New `components/admin/admin-suppliers.jsx`
- New `components/admin/admin-purchases.jsx`

**Business rules:**
- Every stock change goes through `InventoryMovement` — no direct `Product.currentStock` update
- `InventoryMovement.newStock = previousStock + quantity` (negative for outbound)
- `Product.currentStock` updated atomically in the same transaction
- Low-stock alert condition: `currentStock ≤ minStockLevel`
- Receiving a PO: for each item, record movement type `PURCHASE`, update stock
- PO status progression: `DRAFT → PENDING → CONFIRMED → PARTIALLY_RECEIVED / RECEIVED`

---

### Module I — Expenses & Financial Management

**Current state:** Schema exists. No implementation.

**Deliverables:**

- `app/api/admin/expenses/route.js` — CRUD + approval
- `app/api/admin/expenses/[id]/route.js`
- `app/api/admin/expense-categories/route.js`
- `app/api/admin/finance/summary/route.js` — P&L summary
- `app/api/admin/finance/reconciliation/route.js`
- `lib/services/finance.js` — financial calculation service
- Updated `components/admin/admin-reports.jsx` — wired to real data
- New `components/admin/admin-expenses.jsx`
- New `components/admin/admin-finance.jsx`

**Revenue sources tracked:**
1. Online booking payments (`Payment` where `paymentType = BOOKING_*`)
2. Walk-in session payments (`GamingSession` where `paymentStatus = PAID`)
3. POS sales (`POSSale.totalAmount`)

**Expense categories (seeded):**
Rent, Salaries, Electricity, Internet, Inventory Purchases, Repairs, Marketing, Software, Miscellaneous

**P&L calculation:**
```
Gross Revenue     = Booking Payments + Session Payments + POS Sales
Refunds           = Payment.refundAmount (sum)
Net Revenue       = Gross Revenue - Refunds
Cost of Goods     = SUM(POSSaleItem.quantity × Product.purchaseCost)
Gross Profit      = Net Revenue - Cost of Goods
Operating Expenses = SUM(Expense.amount WHERE status = PAID)
Operating Profit  = Gross Profit - Operating Expenses
```

> Note: Revenue is recognised on completion, not on payment receipt. Advance booking payments create a liability until the session is completed. This is tracked via booking status.

---

### Module J — Employee & Staff Management

**Current state:** Schema exists. No implementation.

**Deliverables:**

- `app/api/admin/employees/route.js` — CRUD
- `app/api/admin/employees/[id]/route.js`
- `app/api/admin/employees/[id]/attendance/route.js`
- `app/api/admin/employees/[id]/shifts/route.js`
- `app/api/admin/employees/[id]/salary/route.js`
- `lib/services/employee.js`
- New `components/admin/admin-employees.jsx`

**Business rules:**
- Each employee is a `User` with an `EmployeeProfile`
- Role assigned on `User.role` — controls what admin panel sections they see
- Salary records are append-only — use `paidAt` to mark payment, not deletion
- Attendance has unique constraint `[employeeId, date]` — upsert on check-in/out

---

### Module K — Equipment, Warranties & Maintenance

**Current state:** Schema exists. No implementation.

**Deliverables:**

- `app/api/admin/assets/route.js` — CRUD
- `app/api/admin/assets/[id]/route.js`
- `app/api/admin/assets/[id]/warranties/route.js`
- `app/api/admin/assets/[id]/maintenance/route.js`
- `lib/services/asset.js`
- New `components/admin/admin-assets.jsx`

**Business rules:**
- Warranty expiry alert: surfaced in admin dashboard for warranties expiring within 30 days
- Maintenance cost recorded as `Expense` entry (linked via `referenceId`) for financial tracking
- Asset status transitions: `OPERATIONAL → UNDER_MAINTENANCE → OPERATIONAL` or `RETIRED`

---

### Module L — Customer Support Tickets

**Current state:** Schema exists. No implementation.

**Deliverables:**

- `app/api/tickets/route.js` — customer: create, list own tickets
- `app/api/tickets/[id]/route.js` — customer: view, reply
- `app/api/admin/tickets/route.js` — admin: list all, filter, assign
- `app/api/admin/tickets/[id]/route.js` — admin: update status, internal notes, reply
- `lib/services/support.js`
- Customer portal tickets page (Module B)
- New `components/admin/admin-tickets.jsx`

**Business rules:**
- `ticketNumber` = `TKT-{year}-{5-digit-zero-padded-id}` — generated server-side
- Customer can only see/reply their own tickets
- `isInternal = true` messages visible only to staff — never exposed to customer API
- Status flow: `OPEN → IN_PROGRESS → WAITING_FOR_CUSTOMER → RESOLVED → CLOSED`
- Resolved ticket can be reopened — creates new status history entry

---

### Module M — Admin Dashboard (Complete)

**Current state:** UI shell exists with mock data. Admin bookings component also uses mock data.

**Deliverables:**

All existing admin component files updated to call real APIs and display real data:

- `components/admin/admin-dashboard.jsx` — real stats from `/api/admin/dashboard`
- `components/admin/admin-bookings.jsx` — real bookings from `/api/admin/bookings`
- `components/admin/admin-customers.jsx` — real customers from `/api/admin/customers`
- `components/admin/admin-payments.jsx` — real payments from `/api/admin/payments`
- `components/admin/admin-tables.jsx` — real tables from `/api/admin/tables`
- `components/admin/admin-calendar.jsx` — real bookings for calendar
- `components/admin/admin-analytics.jsx` — real chart data from `/api/admin/analytics`
- `components/admin/admin-settings.jsx` — real `BusinessSettings` from DB
- `components/admin/admin-sidebar.jsx` — expanded menu with all new modules
- New admin pages added to `app/admin/page.jsx` tab list

**Dashboard widgets (real data):**
- Today's revenue (sum of payments with `paidAt` = today)
- Active sessions (count of `GamingSession WHERE status = ACTIVE`)
- Tables status grid (all tables with current status)
- Upcoming bookings (next 24h)
- Pending support tickets
- Low-stock products (count)
- Upcoming warranty expiries (next 30 days)
- Recent audit log entries

---

### Module N — Notifications, Audit Logs & Settings

**Current state:** Schema exists. No implementation.

**Deliverables:**

- `lib/services/notification.js` — create notification helper
- `lib/services/audit.js` — audit log helper
- `app/api/notifications/route.js` — customer: list, mark read
- `app/api/admin/notifications/route.js` — admin notifications
- `app/api/admin/audit-logs/route.js` — admin audit log viewer
- `app/api/admin/settings/route.js` — read/write `BusinessSettings`
- `app/api/admin/roles/route.js` — view/edit role permissions

**Audit log events (sample):**
```
BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED
PAYMENT_RECEIVED, REFUND_ISSUED
SESSION_STARTED, SESSION_COMPLETED
REWARD_ISSUED, REWARD_REDEEMED, REWARD_ADJUSTED
POS_SALE_CREATED, POS_SALE_VOIDED
EXPENSE_CREATED, EXPENSE_APPROVED
EMPLOYEE_CREATED, SALARY_PAID
ASSET_ADDED, MAINTENANCE_RECORDED
TICKET_CREATED, TICKET_RESOLVED
SETTINGS_UPDATED, ROLE_PERMISSION_CHANGED
USER_LOGIN, USER_LOGOUT
```

---

## 6. Implementation Phases

### Phase 1 — Foundation (Complete First)

**Goal:** Fix all broken infrastructure. Everything else depends on this.

| Task | File(s) | Priority |
|---|---|---|
| Fix Prisma client export (named + default) | `lib/prisma.js` | 🔴 |
| Rewrite Prisma schema (all ERP models) | `prisma/schema.prisma` | 🔴 |
| Run migration, verify, preserve data | CLI | 🔴 |
| Install `@next-auth/prisma-adapter` | package.json | 🔴 |
| Create `lib/auth.js` (NextAuth config) | `lib/auth.js` | 🔴 |
| Create `app/api/auth/[...nextauth]/route.js` | API | 🔴 |
| Create `middleware.js` (edge auth guard) | `middleware.js` | 🔴 |
| Create `lib/services/audit.js` | Service | 🔴 |
| Create `lib/services/notification.js` | Service | 🔴 |
| Fix admin layout (server session check) | `app/admin/layout.jsx` | 🔴 |
| Fix admin login (next-auth sign-in) | `app/admin/login/page.jsx` | 🔴 |
| Fix seed script (correct enum values) | `prisma/seed.js` | 🔴 |
| Update `.env.example` (all variables) | `.env.example` | 🟡 |

**Done when:** App builds, DB migrates, admin can log in with a real session.

---

### Phase 2 — Customer Portal & Booking Engine

**Goal:** Customers can sign in with Google, book a table, pay the full price, receive confirmation.

| Task | File(s) | Priority |
|---|---|---|
| `lib/services/booking.js` (overlap, holds, price) | Service | 🔴 |
| Rewrite `app/api/bookings/route.js` | API | 🔴 |
| Rewrite `app/api/bookings/[id]/route.js` | API | 🔴 |
| Add booking hold endpoint | `app/api/bookings/hold/route.js` | 🔴 |
| Rewrite `app/api/tables/route.js` (expire holds) | API | 🔴 |
| Rewrite `app/api/payments/create-order/route.js` | API | 🔴 |
| Rewrite `app/api/payments/verify/route.js` | API | 🔴 |
| Rewrite `app/api/payments/webhook/route.js` | API | 🔴 |
| Customer dashboard layout | `app/(customer)/layout.jsx` | 🔴 |
| Customer dashboard home | `app/(customer)/dashboard/page.jsx` | 🔴 |
| Customer profile page | `app/(customer)/profile/page.jsx` | 🟡 |
| Customer booking history | `app/(customer)/bookings/page.jsx` | 🟡 |
| Customer rewards page | `app/(customer)/rewards/page.jsx` | 🟡 |
| Update booking modal (auth gate) | `components/booking-modal.jsx` | 🟡 |
| Update `/book` page (auth gate, full price) | `app/book/page.jsx` | 🟡 |

**Done when:** A customer can sign in with Google, book a table, pay via Razorpay, see the confirmation, and view it in their portal.

---

### Phase 3 — Gaming Sessions & Loyalty

**Goal:** Staff can manage walk-in sessions. Loyalty rewards issue automatically.

| Task | File(s) | Priority |
|---|---|---|
| `lib/services/session.js` | Service | 🔴 |
| `lib/services/loyalty.js` | Service | 🔴 |
| `app/api/sessions/route.js` | API | 🔴 |
| `app/api/sessions/[id]/route.js` | API | 🔴 |
| `app/api/rewards/route.js` | API | 🟡 |
| `app/api/admin/loyalty/route.js` | API | 🟡 |
| Live sessions board component | `components/admin/admin-sessions.jsx` | 🔴 |
| Add Sessions to admin sidebar + page | Sidebar, Page | 🔴 |
| Wire customer portal rewards page | `app/(customer)/rewards/page.jsx` | 🟡 |

**Done when:** Staff can start/stop walk-in sessions. Rewards issue at 5h and 31h milestones.

---

### Phase 4 — POS & Inventory

**Goal:** Staff can ring up sales. Stock levels update automatically.

| Task | File(s) | Priority |
|---|---|---|
| `lib/services/pos.js` | Service | 🔴 |
| `lib/services/inventory.js` | Service | 🔴 |
| `app/api/pos/route.js` | API | 🔴 |
| `app/api/pos/[id]/route.js` (void) | API | 🔴 |
| `app/api/admin/products/route.js` | API | 🔴 |
| `app/api/admin/products/[id]/route.js` | API | 🔴 |
| `app/api/admin/categories/route.js` | API | 🟡 |
| `app/api/admin/inventory/movements/route.js` | API | 🟡 |
| `app/api/admin/suppliers/route.js` | API | 🟡 |
| `app/api/admin/purchase-orders/route.js` | API | 🟡 |
| Rebuild `components/admin/admin-inventory.jsx` | Component | 🔴 |
| New `components/admin/admin-pos.jsx` | Component | 🔴 |
| New `components/admin/admin-suppliers.jsx` | Component | 🟡 |

**Done when:** Cashier can search products, add to cart, collect payment, receipt generated, stock decremented.

---

### Phase 5 — Expenses & Finance

**Goal:** Owner can track all expenses. Financial dashboard shows real P&L.

| Task | File(s) | Priority |
|---|---|---|
| `lib/services/finance.js` | Service | 🔴 |
| `app/api/admin/expenses/route.js` | API | 🔴 |
| `app/api/admin/expenses/[id]/route.js` | API | 🔴 |
| `app/api/admin/expense-categories/route.js` | API | 🟡 |
| `app/api/admin/finance/summary/route.js` | API | 🔴 |
| New `components/admin/admin-expenses.jsx` | Component | 🔴 |
| New `components/admin/admin-finance.jsx` | Component | 🔴 |
| Rebuild `components/admin/admin-reports.jsx` (real data) | Component | 🟡 |
| Rebuild `components/admin/admin-analytics.jsx` (Recharts) | Component | 🟡 |

**Done when:** Owner can log an expense, see approved/pending status, view P&L summary for any date range.

---

### Phase 6 — HR, Assets & Support

**Goal:** Staff management, equipment tracking, and customer support are fully operational.

| Task | File(s) | Priority |
|---|---|---|
| `lib/services/employee.js` | Service | 🟡 |
| `lib/services/asset.js` | Service | 🟡 |
| `lib/services/support.js` | Service | 🔴 |
| `app/api/admin/employees/route.js` + `[id]/*` | API | 🟡 |
| `app/api/admin/assets/route.js` + `[id]/*` | API | 🟡 |
| `app/api/tickets/route.js` + `[id]/route.js` | API | 🔴 |
| `app/api/admin/tickets/route.js` + `[id]/route.js` | API | 🔴 |
| New `components/admin/admin-employees.jsx` | Component | 🟡 |
| New `components/admin/admin-assets.jsx` | Component | 🟡 |
| New `components/admin/admin-tickets.jsx` | Component | 🔴 |
| Customer portal: tickets page | `app/(customer)/tickets/*` | 🔴 |

**Done when:** Customer can open a support ticket from their portal. Admin can respond, assign, and close it.

---

### Phase 7 — Complete Admin & Polish

**Goal:** All mock data replaced with real APIs. Security hardened. System production-ready.

| Task | File(s) | Priority |
|---|---|---|
| Wire all admin components to real APIs | `components/admin/*` | 🔴 |
| Expand admin sidebar (all new modules) | `components/admin/admin-sidebar.jsx` | 🔴 |
| Expand `app/admin/page.jsx` tab list | `app/admin/page.jsx` | 🔴 |
| `app/api/admin/dashboard/route.js` (real data) | API | 🔴 |
| `app/api/admin/analytics/route.js` | API | 🔴 |
| `app/api/admin/settings/route.js` | API | 🟡 |
| `app/api/admin/audit-logs/route.js` | API | 🟡 |
| `app/api/admin/roles/route.js` | API | 🟡 |
| `app/api/notifications/route.js` | API | 🟡 |
| Authorization middleware on all admin APIs | `middleware.js` + each route | 🔴 |
| Rate limiting (headers + in-memory) | `lib/rate-limit.js` | 🟡 |
| Recharts analytics dashboard (real data) | Component | 🟡 |
| Notification bell + dropdown (admin) | Navbar component | 🟡 |
| Final `npm run build` — zero errors | CLI | 🔴 |
| Update all docs | `docs/` | 🟡 |

---

## 7. API Reference Map

### Public (no auth required)
```
GET  /api/tables                     List available tables
POST /api/bookings                   Create booking hold (auth recommended)
POST /api/payments/create-order      Create Razorpay order
POST /api/payments/verify            Verify payment signature
POST /api/payments/webhook           Razorpay webhook (HMAC verified)
POST /api/contact                    Submit contact form
GET  /api/gallery                    Fetch gallery images
GET  /api/auth/[...nextauth]         Auth.js routes
POST /api/auth/[...nextauth]         Auth.js routes
```

### Customer (requires CUSTOMER session)
```
GET  /api/bookings                   Own bookings
GET  /api/bookings/[id]              Own booking detail
POST /api/bookings/[id]/cancel       Cancel own upcoming booking
GET  /api/rewards                    Own reward ledger
GET  /api/tickets                    Own support tickets
POST /api/tickets                    Create support ticket
GET  /api/tickets/[id]               Own ticket detail
POST /api/tickets/[id]/reply         Reply to own ticket
GET  /api/notifications              Own notifications
POST /api/notifications/read         Mark notifications read
GET  /api/profile                    Own profile
PATCH /api/profile                   Update profile (phone, name)
```

### Admin/Staff (requires non-CUSTOMER session)
```
GET  /api/admin/dashboard            Dashboard stats
GET  /api/admin/analytics            Chart data (date range)
GET  /api/admin/bookings             All bookings (paginated)
PATCH /api/admin/bookings            Update booking status
POST /api/admin/bookings             Create walk-in booking
GET  /api/admin/tables               All tables
POST /api/admin/tables               Create table
PATCH /api/admin/tables/[id]         Update table
DELETE /api/admin/tables/[id]        Delete table (soft)
GET  /api/admin/customers            All customers (paginated)
GET  /api/admin/customers/[id]       Customer detail + history
GET  /api/admin/payments             All payments (paginated)
POST /api/payments/refund            Process refund (MANAGER+)
GET  /api/sessions                   Active sessions
POST /api/sessions                   Start session
PATCH /api/sessions/[id]             Extend / stop session
GET  /api/admin/products             All products
POST /api/admin/products             Create product
PATCH /api/admin/products/[id]       Update product
GET  /api/admin/categories           Product categories
POST /api/pos                        Create POS sale
POST /api/pos/[id]/void              Void POS sale
GET  /api/admin/inventory/movements  Stock movement log
POST /api/admin/inventory/movements  Manual stock adjustment
GET  /api/admin/suppliers            All suppliers
POST /api/admin/suppliers            Create supplier
GET  /api/admin/purchase-orders      All POs
POST /api/admin/purchase-orders      Create PO
PATCH /api/admin/purchase-orders/[id] Receive goods / update PO
GET  /api/admin/expenses             All expenses (paginated)
POST /api/admin/expenses             Create expense
PATCH /api/admin/expenses/[id]       Approve/reject expense
GET  /api/admin/finance/summary      P&L summary (date range)
GET  /api/admin/employees            All employees
POST /api/admin/employees            Create employee
PATCH /api/admin/employees/[id]      Update employee
GET  /api/admin/employees/[id]/attendance
POST /api/admin/employees/[id]/attendance
GET  /api/admin/employees/[id]/salary
POST /api/admin/employees/[id]/salary
GET  /api/admin/assets               All assets
POST /api/admin/assets               Create asset
PATCH /api/admin/assets/[id]         Update asset
POST /api/admin/assets/[id]/warranties
POST /api/admin/assets/[id]/maintenance
GET  /api/admin/tickets              All tickets (paginated)
PATCH /api/admin/tickets/[id]        Update ticket status / assign
POST /api/admin/tickets/[id]/reply   Staff reply
GET  /api/admin/audit-logs           Audit log (paginated)
GET  /api/admin/settings             Business settings
PATCH /api/admin/settings            Update settings (OWNER+)
GET  /api/admin/loyalty              Loyalty programs + rules
PATCH /api/admin/loyalty             Update rules (MANAGER+)
POST /api/admin/loyalty/adjust       Manual reward adjustment
GET  /api/admin/roles                Role permissions
PATCH /api/admin/roles               Update permissions (SUPER_ADMIN)
```

---

## 8. Authentication & Security Model

### Roles & Permissions Matrix

| Module | SUPER_ADMIN | BUSINESS_OWNER | MANAGER | RECEPTIONIST | CASHIER | INVENTORY_MANAGER | ACCOUNTANT | SUPPORT_AGENT |
|---|---|---|---|---|---|---|---|---|
| Admin dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bookings (view) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bookings (edit) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sessions (start/stop) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POS | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory (view) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Inventory (edit) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Expenses (view) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Expenses (approve) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Employees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Salary | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Assets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Support tickets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Financial reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Role management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Refunds | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Authorization Enforcement

**Never rely on the UI alone.** Every API route checks the session:

```javascript
// Minimum pattern for every admin API route
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if (!hasPermission(session.user.role, 'REQUIRED_PERMISSION')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Customer data isolation:** Every customer query adds `WHERE customerId = session.user.customerProfileId`. Never use a customer-submitted ID as the filter.

### Security Checklist

- [ ] HMAC signature verification on Razorpay webhook (raw body, not parsed)
- [ ] Webhook idempotency via `WebhookEvent.eventId`
- [ ] No secret keys in client components, API responses, or logs
- [ ] All monetary calculations server-side
- [ ] Rate limiting on `/api/bookings`, `/api/payments/*`, `/api/auth/*`
- [ ] Input validation with Zod on every POST/PATCH handler
- [ ] Prisma parameterised queries (no raw SQL with user input)
- [ ] `HttpOnly` cookies for sessions (next-auth default)
- [ ] `NEXTAUTH_URL` set correctly in production
- [ ] File uploads (if added): MIME type validation, size limits, no executable extensions
- [ ] Error responses never include stack traces or internal details in production

---

## 9. Environment Configuration

### Required Variables

```env
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL="mysql://user:password@localhost:3306/cue_club"

# ── Next Auth ─────────────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# ── Google OAuth ──────────────────────────────────────────────────────
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# ── Razorpay ──────────────────────────────────────────────────────────
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"

# ── Optional: File Storage (Cloudinary) ───────────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# ── Optional: Email (Resend or Nodemailer) ────────────────────────────
# RESEND_API_KEY="re_..."

# ── Optional: App Config ──────────────────────────────────────────────
NEXT_PUBLIC_WHATSAPP_NUMBER="919876543210"
NEXT_PUBLIC_GOOGLE_MAPS_URL="https://maps.google.com/?q=..."
```

### How to Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### Google OAuth Setup
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. New Project → Enable "Google+ API"
3. Credentials → OAuth 2.0 Client ID (Web application)
4. Authorised redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`

### Razorpay Webhook Setup (Production)
1. Dashboard → Settings → Webhooks → Add New
2. URL: `https://yourdomain.com/api/payments/webhook`
3. Secret: set a strong random string, add to `RAZORPAY_WEBHOOK_SECRET`
4. Events to subscribe: `payment.captured`, `payment.failed`, `refund.processed`

---

## 10. File Structure

### New Files to Create

```
lib/
  auth.js                          NextAuth config
  rate-limit.js                    Simple rate limiter
  services/
    booking.js                     Booking business logic
    payment.js                     Payment service
    session.js                     Gaming session lifecycle
    loyalty.js                     Reward engine
    pos.js                         POS checkout
    inventory.js                   Stock management
    finance.js                     P&L calculations
    employee.js                    HR service
    asset.js                       Asset / warranty service
    support.js                     Ticket workflow
    notification.js                Notification helper
    audit.js                       Audit log helper

middleware.js                      Edge auth + role guard

app/
  api/
    auth/[...nextauth]/route.js    Auth.js handler
    sessions/route.js
    sessions/[id]/route.js
    rewards/route.js
    tickets/route.js
    tickets/[id]/route.js
    notifications/route.js
    profile/route.js
    pos/route.js
    pos/[id]/route.js
    admin/
      analytics/route.js
      loyalty/route.js
      products/route.js
      products/[id]/route.js
      categories/route.js
      inventory/movements/route.js
      suppliers/route.js
      purchase-orders/route.js
      purchase-orders/[id]/route.js
      expenses/route.js
      expenses/[id]/route.js
      expense-categories/route.js
      finance/summary/route.js
      employees/route.js
      employees/[id]/route.js
      employees/[id]/attendance/route.js
      employees/[id]/shifts/route.js
      employees/[id]/salary/route.js
      assets/route.js
      assets/[id]/route.js
      assets/[id]/warranties/route.js
      assets/[id]/maintenance/route.js
      tickets/route.js
      tickets/[id]/route.js
      audit-logs/route.js
      settings/route.js
      roles/route.js

  (customer)/
    layout.jsx
    dashboard/page.jsx
    profile/page.jsx
    bookings/page.jsx
    bookings/[id]/page.jsx
    rewards/page.jsx
    tickets/page.jsx
    tickets/[id]/page.jsx

components/
  customer/
    customer-layout.jsx
    customer-nav.jsx
    customer-dashboard.jsx
    customer-profile.jsx
    customer-bookings.jsx
    customer-rewards.jsx
    customer-tickets.jsx
  admin/
    admin-sessions.jsx              (new)
    admin-pos.jsx                   (new)
    admin-suppliers.jsx             (new)
    admin-employees.jsx             (new)
    admin-assets.jsx                (new)
    admin-tickets.jsx               (new)
    admin-finance.jsx               (new)
    admin-expenses.jsx              (new)
    admin-purchases.jsx             (new)
```

### Files to Modify (Not Replace)

```
prisma/schema.prisma               ✅ Already rewritten
prisma/seed.js                     Fix enum values, add expense categories
lib/prisma.js                      ✅ Already fixed (named + default export)
lib/validations.js                 Add schemas for all new forms
lib/payment.js                     Add status constants for new enum values
app/admin/layout.jsx               Replace localStorage check with getServerSession
app/admin/login/page.jsx           Replace hardcoded auth with next-auth signIn
app/admin/page.jsx                 Add new tab entries for all new modules
app/api/bookings/route.js          Use service layer, proper BookingStatus enum
app/api/bookings/[id]/route.js     Complete implementation
app/api/tables/route.js            Add hold expiry, fix overlap logic
app/api/payments/create-order/route.js    Server-side price
app/api/payments/verify/route.js          Idempotent, status history
app/api/payments/webhook/route.js         Idempotent via WebhookEvent
app/api/payments/refund/route.js          Full + partial, fix field names
app/api/admin/dashboard/route.js          Real data, new metrics
app/api/admin/bookings/route.js           Wire to real queries
app/api/admin/customers/route.js          Wire to real queries
app/api/admin/tables/route.js             Full CRUD with PATCH/DELETE
components/admin/admin-sidebar.jsx        Expand menu
components/admin/admin-dashboard.jsx      Wire to real API
components/admin/admin-bookings.jsx       Wire to real API (remove mock)
components/admin/admin-customers.jsx      Wire to real API
components/admin/admin-payments.jsx       Wire to real API
components/admin/admin-tables.jsx         Wire to real API
components/admin/admin-analytics.jsx      Recharts, real data
components/admin/admin-settings.jsx       Wire to BusinessSettings API
components/booking-modal.jsx              Auth gate, server price
app/book/page.jsx                         Auth gate, server price
```

---

## 11. Migration Strategy

### Current Situation

The database likely has data from earlier phases (tables, bookings, payments). The new schema is a superset — it adds many new models and extends existing ones.

### Steps

**Step 1 — Create migration**
```bash
npx prisma migrate dev --name erp_foundation
```

If Prisma detects drift (schema doesn't match existing DB), use:
```bash
npx prisma migrate dev --name erp_foundation --create-only
# Review the generated SQL, then:
npx prisma migrate dev
```

**Step 2 — Handle breaking changes**

The following field changes require attention:

| Model | Old Field | New Field | Action |
|---|---|---|---|
| `Booking` | `status` (string enum `PENDING`) | `BookingStatus` enum | Migration: map `PENDING` → `PENDING_PAYMENT` |
| `Booking` | `duration` (String) | `durationHours` (Decimal) | Migration: parse existing string values |
| `Payment` | `transactionId` | `razorpayPaymentId` | Migration: copy column data |
| `Payment` | `orderId` | `razorpayOrderId` | Migration: copy column data |
| `User` | `role` had implicit ADMIN | `UserRole` enum | Migration: map to SUPER_ADMIN |

If existing production data must be preserved, use a custom SQL migration script before running Prisma migrations.

**Step 3 — Seed new reference data**
```bash
npx prisma db seed
```

Seed script creates: tables (upsert), business settings (upsert), expense categories, a super admin user, default loyalty program + rules.

**Step 4 — Verify**
```bash
npx prisma studio
```

Check all models are visible. Verify existing booking/payment records survived.

### ⚠️ Never Run

```bash
npx prisma migrate reset   # Destroys all data
npx prisma db push         # Bypasses migration history
```

---

## 12. Acceptance Criteria

### Customer Flow
- [ ] Customer opens website — public pages load, navbar intact, hero intact
- [ ] Customer clicks "Book Now" — prompted to sign in with Google if not authenticated
- [ ] Customer signs in — `CustomerProfile` created, redirected to booking flow
- [ ] Customer selects table — availability correctly excludes held and confirmed slots
- [ ] Customer completes Razorpay checkout — booking status moves to `CONFIRMED`
- [ ] Customer views booking in portal — correct details, status, and amount
- [ ] Customer plays 5 hours total — reward issued exactly once, visible in portal
- [ ] Customer submits support ticket — receives ticket number, can reply, sees status updates
- [ ] Customer can see own data only — cannot access another customer's bookings or profile

### Staff / Admin Flow
- [ ] Admin signs in — real session, redirected to dashboard, no localhost credentials
- [ ] Dashboard shows real data — today's revenue, active sessions, upcoming bookings
- [ ] Admin creates walk-in booking — table availability respected
- [ ] Admin starts gaming session — table status changes to OCCUPIED
- [ ] Admin stops session — charge calculated, customer hours updated, loyalty checked
- [ ] Cashier creates POS sale — stock decrements in real time
- [ ] Manager approves expense — reflected in P&L report
- [ ] Support agent opens ticket, replies, closes — customer sees reply in portal
- [ ] Each module's data is real — no mock values in production

### System / Security
- [ ] Webhook `payment.captured` delivered twice → booking confirmed exactly once
- [ ] Concurrent booking attempts for same slot → only one succeeds
- [ ] Expired booking hold → table shows available again
- [ ] MANAGER cannot access role management page → 403
- [ ] Customer cannot view other customer's booking via direct URL → 403/404
- [ ] Admin API routes return 401 without valid session
- [ ] `npm run build` completes with zero errors and zero TypeScript files

---

## 13. Progress Tracker

### Phase 1 — Foundation
| Task | Status |
|---|---|
| Prisma schema rewrite | ✅ Done |
| Fix `lib/prisma.js` export | ✅ Done |
| Remaining Phase 1 tasks | 🔲 Pending |

### Phase 2 — Customer Portal & Booking Engine
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

### Phase 3 — Gaming Sessions & Loyalty
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

### Phase 4 — POS & Inventory
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

### Phase 5 — Expenses & Finance
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

### Phase 6 — HR, Assets & Support
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

### Phase 7 — Complete Admin & Polish
| Task | Status |
|---|---|
| All tasks | 🔲 Pending |

---

*This document is the single source of truth for all implementation decisions. Update the progress tracker as each task is completed. Never start a new phase until the previous phase passes the "Done when" verification.*

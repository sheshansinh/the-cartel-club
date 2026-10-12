// prisma/seed.js
// Run with: npm run db:seed
// Safe to run multiple times — all operations use upsert.

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // ── 1. Tables ────────────────────────────────────────────────────────────
  const tableData = [
    { tableNumber: '01', name: 'Pool Table 1',   type: 'POOL',    status: 'AVAILABLE', isActive: true, sequence: 1, hourlyRate: 200 },
    { tableNumber: '02', name: 'Pool Table 2',   type: 'POOL',    status: 'AVAILABLE', isActive: true, sequence: 2, hourlyRate: 200 },
    { tableNumber: '03', name: 'Snooker Table 1',type: 'SNOOKER', status: 'AVAILABLE', isActive: true, sequence: 3, hourlyRate: 300 },
    { tableNumber: '04', name: 'Pool Table 3',   type: 'POOL',    status: 'AVAILABLE', isActive: true, sequence: 4, hourlyRate: 200 },
    { tableNumber: '05', name: 'VIP Snooker',    type: 'SNOOKER', status: 'AVAILABLE', isActive: true, sequence: 5, hourlyRate: 500 },
    { tableNumber: '06', name: 'Pool Table 4',   type: 'POOL',    status: 'AVAILABLE', isActive: true, sequence: 6, hourlyRate: 200 },
  ]

  for (const t of tableData) {
    await prisma.table.upsert({
      where:  { tableNumber: t.tableNumber },
      update: { name: t.name, hourlyRate: t.hourlyRate, sequence: t.sequence },
      create: t,
    })
  }
  console.log('  ✓ Tables')

  // ── 2. Gallery images ────────────────────────────────────────────────────
  // Use sortOrder as part of a deterministic id so upserts are safe
  const galleryData = [
    { id: 'gallery-01', title: 'Pool Table View',  imageUrl: '/images/pool-1.jpg',     category: 'Pool',     sortOrder: 1 },
    { id: 'gallery-02', title: 'Snooker Table',    imageUrl: '/images/snooker-1.jpg',  category: 'Snooker',  sortOrder: 2 },
    { id: 'gallery-03', title: 'Interior Lounge',  imageUrl: '/images/interior-1.jpg', category: 'Interior', sortOrder: 3 },
    { id: 'gallery-04', title: 'Event Night',      imageUrl: '/images/event-1.jpg',    category: 'Events',   sortOrder: 4 },
    { id: 'gallery-05', title: 'Gaming Area',      imageUrl: '/images/pool-2.jpg',     category: 'Pool',     sortOrder: 5 },
  ]

  for (const img of galleryData) {
    await prisma.galleryImage.upsert({
      where:  { id: img.id },
      update: { title: img.title, imageUrl: img.imageUrl, category: img.category, sortOrder: img.sortOrder },
      create: img,
    })
  }
  console.log('  ✓ Gallery images')

  // ── 3. Business settings ─────────────────────────────────────────────────
  // Field names must match the NEW schema (no openingHours string field).
  await prisma.businessSettings.upsert({
    where:  { id: 'default' },
    update: {},
    create: {
      id:              'default',
      businessName:    'CUE CLUB',
      phone:           '+91 98765 43210',
      email:           'hello@cueclub.com',
      address:         '123 Premium Street, City Center, Ahmedabad',
      timezone:        'Asia/Kolkata',
      openingTime:     '12:00',
      closingTime:     '23:00',
      advanceAmount:   100,
      fullPaymentOnly: true,
      bookingHoldMins: 15,
      maxBookingDays:  30,
      currency:        'INR',
      taxRate:         0,
      whatsappNumber:  '919876543210',
    },
  })
  console.log('  ✓ Business settings')

  // ── 4. Expense categories ────────────────────────────────────────────────
  const expenseCategories = [
    'Rent',
    'Salaries & Wages',
    'Electricity & Utilities',
    'Internet & Software',
    'Inventory Purchases',
    'Repairs & Maintenance',
    'Equipment Purchases',
    'Marketing & Advertising',
    'Miscellaneous',
  ]

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where:  { name },
      update: {},
      create: { name },
    })
  }
  console.log('  ✓ Expense categories')

  // ── 5. Product categories ────────────────────────────────────────────────
  const productCategories = [
    { name: 'Beverages',   sortOrder: 1 },
    { name: 'Snacks',      sortOrder: 2 },
    { name: 'Accessories', sortOrder: 3 },
    { name: 'Equipment',   sortOrder: 4 },
    { name: 'Supplies',    sortOrder: 5 },
  ]

  for (const cat of productCategories) {
    await prisma.productCategory.upsert({
      where:  { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('  ✓ Product categories')

  // ── 6. Default loyalty program ───────────────────────────────────────────
  const loyaltyProgram = await prisma.loyaltyProgram.upsert({
    where:  { id: 'default-loyalty' },
    update: {},
    create: {
      id:          'default-loyalty',
      name:        'CUE CLUB Rewards',
      description: 'Earn bonus hours for every milestone you reach. Play more, save more.',
      isActive:    true,
    },
  })

  // Default reward rules (configurable from admin panel later)
  const rewardRules = [
    { id: 'rule-5h',  name: '5-Hour Milestone',  hoursRequired: 5,  bonusHours: 1, validForDays: 90,  sortOrder: 1 },
    { id: 'rule-31h', name: '31-Hour Milestone',  hoursRequired: 31, bonusHours: 5, validForDays: 180, sortOrder: 2 },
  ]

  for (const rule of rewardRules) {
    await prisma.rewardRule.upsert({
      where:  { id: rule.id },
      update: { name: rule.name, hoursRequired: rule.hoursRequired, bonusHours: rule.bonusHours, validForDays: rule.validForDays },
      create: { ...rule, programId: loyaltyProgram.id, isActive: true },
    })
  }
  console.log('  ✓ Loyalty program & reward rules')

  // ── 7. Super-admin user ──────────────────────────────────────────────────
  // IMPORTANT: Change this password immediately after first login.
  const passwordHash = await bcrypt.hash('Admin@2024!', 12)

  const adminUser = await prisma.user.upsert({
    where:  { email: 'admin@cueclub.com' },
    update: {},
    create: {
      name:         'Super Admin',
      email:        'admin@cueclub.com',
      passwordHash,
      role:         'SUPER_ADMIN',   // ← correct enum value
      isActive:     true,
    },
  })

  // Ensure no CustomerProfile is created for staff users
  // (CustomerProfile is only for CUSTOMER role users)
  console.log('  ✓ Super admin user  →  admin@cueclub.com / Admin@2024!')

  // ── 8. Business-owner user (optional second account) ────────────────────
  const ownerHash = await bcrypt.hash('Owner@2024!', 12)

  await prisma.user.upsert({
    where:  { email: 'owner@cueclub.com' },
    update: {},
    create: {
      name:         'Business Owner',
      email:        'owner@cueclub.com',
      passwordHash: ownerHash,
      role:         'BUSINESS_OWNER',
      isActive:     true,
    },
  })
  console.log('  ✓ Business owner user  →  owner@cueclub.com / Owner@2024!')

  // ── 9. Demo Super Admin (vijay@gmail.com) ────────────────────────────────
  const vijayHash = await bcrypt.hash('vijay@2004', 12)

  await prisma.user.upsert({
    where:  { email: 'vijay@gmail.com' },
    update: {
      passwordHash: vijayHash,
      role:         'SUPER_ADMIN',
      isActive:     true,
    },
    create: {
      name:         'Vijay (Admin)',
      email:        'vijay@gmail.com',
      passwordHash: vijayHash,
      role:         'SUPER_ADMIN',
      isActive:     true,
    },
  })
  console.log('  ✓ Demo admin user      →  vijay@gmail.com / vijay@2004')

  // ── 10. Demo Customers (sheshan@gmail.com / Sheshan@2004, etc.) ──────────
  const demoCustomers = [
    {
      name: 'Sheshan',
      email: 'sheshan@gmail.com',
      password: 'Sheshan@2004',
      phone: '6351457958',
      tier: 'GOLD',
    },
    {
      name: 'Rahul Patel',
      email: 'rahul@gmail.com',
      password: 'Rahul@2004',
      phone: '9876543211',
      tier: 'SILVER',
    },
    {
      name: 'Aryan Shah',
      email: 'aryan@gmail.com',
      password: 'Aryan@2004',
      phone: '9876543212',
      tier: 'BRONZE',
    },
  ]

  for (const dc of demoCustomers) {
    const hash = await bcrypt.hash(dc.password, 12)
    const custUser = await prisma.user.upsert({
      where: { email: dc.email },
      update: {
        name: dc.name,
        passwordHash: hash,
        role: 'CUSTOMER',
        isActive: true,
      },
      create: {
        name: dc.name,
        email: dc.email,
        passwordHash: hash,
        role: 'CUSTOMER',
        isActive: true,
      },
    })

    await prisma.customerProfile.upsert({
      where: { userId: custUser.id },
      update: {
        phone: dc.phone,
        phoneVerified: true,
        membershipTier: dc.tier,
      },
      create: {
        userId: custUser.id,
        phone: dc.phone,
        phoneVerified: true,
        membershipTier: dc.tier,
      },
    })
  }
  console.log('  ✓ Demo customer user   →  sheshan@gmail.com / Sheshan@2004')

  console.log('\n✅ Seed completed successfully!')
  console.log('\n⚠️  IMPORTANT: Change default passwords before going to production.\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

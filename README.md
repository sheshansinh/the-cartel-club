# Premium Pool & Snooker Bar Website

A premium, full-stack website for a Pool & Snooker Bar with table reservations, payment integration, and admin dashboard.

## Technology Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS, shadcn/ui, Framer Motion, GSAP
- **Backend**: Next.js API Routes, Prisma ORM, MySQL
- **Physics**: Matter.js for interactive pool game
- **Forms**: React Hook Form, Zod
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS with custom dark theme

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - MySQL connection string
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- Payment gateway credentials (optional for development)
- Cloudinary credentials (optional for development)

### 3. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── layout.jsx          # Root layout with fonts
├── page.jsx            # Home page
├── globals.css         # Global styles
├── about/              # About page
├── gallery/            # Gallery page
├── contact/            # Contact page
├── book/               # Booking page
├── admin/              # Admin panel
└── api/                # API routes

components/
├── ui/                 # shadcn/ui components
├── layout/             # Navbar, Footer
├── home/               # Home page sections
└── pool-game/          # Pool game components

lib/
├── prisma.js           # Prisma client
├── auth.js             # Authentication
├── booking.js          # Booking logic
├── validations.js      # Zod schemas
└── utils.js            # Utilities

prisma/
└── schema.prisma       # Database schema
```

## Features

### Home Page
- Cinematic hero with interactive pool game
- Table booking preview
- About section
- Gaming arena showcase
- Why choose us features
- Gallery preview
- How it works steps
- Events & group bookings
- Testimonials
- Final CTA with location

### Booking System
- Real-time table availability
- Date and time selection
- Duration options
- Customer details form
- ₹100 advance payment
- Booking confirmation

### Admin Panel
- Dashboard with statistics
- Booking management
- Calendar view
- Table management
- Gallery management
- Contact messages
- Settings

## Design System

### Colors
- Primary Background: `#080A0A`
- Secondary Background: `#111615`
- Primary Accent: `#B6F36B` (Neon Lime)
- Secondary Accent: `#D6B36A` (Luxury Gold)
- Primary Text: `#F4F1E8`
- Secondary Text: `#929B95`

### Typography
- Space Grotesk - Headings
- Sora - Subheadings
- Inter - Body text

## Development Phases

- ✅ Phase 1: Project Foundation
- ✅ Phase 2: Premium Homepage
- ✅ Phase 3: Static Pages
- ✅ Phase 4: Database Setup
- ✅ Phase 5: Booking System
- ✅ Phase 6: Payment Integration
- ✅ Phase 7: Advanced Admin Panel
- ✅ Phase 8: Testing & Polish

## Important Notes

- **JavaScript Only**: No TypeScript files (.ts, .tsx) - use .js and .jsx
- **Dark Theme**: The entire site uses a dark luxury theme
- **Responsive**: All components are mobile-first and responsive
- **Performance**: Optimized with lazy loading and code splitting

## License

Proprietary - All rights reserved.

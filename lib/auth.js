import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { encode as defaultEncode, decode as defaultDecode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const adapter = PrismaAdapter(prisma)

export const authOptions = {
  adapter,

  providers: [
    // ── Google OAuth (customers) ──────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),

    // ── Email + Password (staff / admin & demo customers) ─────────────────
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const normalizedEmail = credentials.email.toLowerCase().trim()
        const rawPassword = String(credentials.password)

        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { customerProfile: true },
        })

        // 1. Auto-provision demo admin (vijay@gmail.com / vijay@2004) if not yet seeded
        if (
          !user &&
          normalizedEmail === 'vijay@gmail.com' &&
          rawPassword === 'vijay@2004'
        ) {
          const passwordHash = await bcrypt.hash('vijay@2004', 12)
          user = await prisma.user.create({
            data: {
              name: 'Vijay (Admin)',
              email: 'vijay@gmail.com',
              passwordHash,
              role: 'SUPER_ADMIN',
              isActive: true,
            },
            include: { customerProfile: true },
          })
        }

        // 2. Auto-provision or upgrade demo customer (sheshan@gmail.com / Sheshan@2004)
        const DEMO_CUSTOMERS = {
          'sheshan@gmail.com': {
            name: 'Sheshan',
            phone: '6351457958',
            passwords: ['Sheshan@2004', 'sheshan@2004'],
          },
          'rahul@gmail.com': {
            name: 'Rahul Patel',
            phone: '9876543211',
            passwords: ['Rahul@2004', 'rahul@2004'],
          },
          'aryan@gmail.com': {
            name: 'Aryan Shah',
            phone: '9876543212',
            passwords: ['Aryan@2004', 'aryan@2004'],
          },
        }

        const demoSpec = DEMO_CUSTOMERS[normalizedEmail]
        if (demoSpec && demoSpec.passwords.includes(rawPassword)) {
          const passwordHash = await bcrypt.hash(demoSpec.passwords[0], 12)
          if (!user) {
            // Check if a CustomerProfile already exists with this phone number
            const existingProfileByPhone = await prisma.customerProfile.findFirst({
              where: { phone: demoSpec.phone },
              include: { user: true },
            })

            if (existingProfileByPhone?.user) {
              user = await prisma.user.update({
                where: { id: existingProfileByPhone.user.id },
                data: {
                  email: normalizedEmail,
                  name: existingProfileByPhone.user.name || demoSpec.name,
                  passwordHash,
                  isActive: true,
                },
                include: { customerProfile: true },
              })
            } else {
              user = await prisma.user.create({
                data: {
                  name: demoSpec.name,
                  email: normalizedEmail,
                  passwordHash,
                  role: 'CUSTOMER',
                  isActive: true,
                  customerProfile: {
                    create: {
                      phone: demoSpec.phone,
                      phoneVerified: true,
                      membershipTier: 'GOLD',
                    },
                  },
                },
                include: { customerProfile: true },
              })
            }
          } else if (!user.passwordHash) {
            // Existing walk-in user without a passwordHash -> set passwordHash so they can log in
            user = await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash, isActive: true },
              include: { customerProfile: true },
            })
          }

          if (user && !user.customerProfile) {
            await prisma.customerProfile.create({
              data: {
                userId: user.id,
                phone: demoSpec.phone,
                phoneVerified: true,
              },
            })
          }
        }

        if (!user || !user.passwordHash) return null
        if (!user.isActive) return null

        const isValid =
          (demoSpec && demoSpec.passwords.includes(rawPassword)) ||
          (await bcrypt.compare(rawPassword, user.passwordHash))
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],

  // ── Use database sessions (revocable) ────────────────────────────────────
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // refresh every 24 hours
  },

  // ── Pages ─────────────────────────────────────────────────────────────────
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * Called when a user signs in via OAuth or Credentials.
     * Ensures CustomerProfile exists for Google customers.
     */
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { customerProfile: true },
          })

          if (existingUser && !existingUser.customerProfile) {
            await prisma.customerProfile.create({
              data: { userId: existingUser.id },
            })
          }
        } catch (err) {
          console.error('[auth] signIn callback error:', err)
        }
      }
      return true
    },

    /**
     * Flag credentials sign-in on token so jwt.encode can persist a database
     * session row for staff users alongside OAuth database sessions.
     */
    async jwt({ token, user, account }) {
      if (account?.provider === 'credentials' && user) {
        token.credentials = true
        token.sub = user.id
      }
      return token
    },

    /**
     * Attach role and customerProfileId to the session object so route
     * handlers can read them without an extra DB query.
     */
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id
        session.user.role = user.role

        // Attach (or auto-create) customerProfileId for CUSTOMER role
        if (user.role === 'CUSTOMER') {
          try {
            const profile = await prisma.customerProfile.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id },
              select: {
                id: true,
                phone: true,
                phoneVerified: true,
                membershipTier: true,
                rewardBalance: true,
                totalPlayingHours: true,
              },
            })
            session.user.customerProfileId = profile?.id ?? null
            session.user.phone = profile?.phone ?? null
            session.user.phoneVerified = profile?.phoneVerified ?? false
            session.user.membershipTier = profile?.membershipTier ?? 'BRONZE'
            session.user.rewardBalance = profile?.rewardBalance ? Number(profile.rewardBalance) : 0
            session.user.totalPlayingHours = profile?.totalPlayingHours
              ? Number(profile.totalPlayingHours)
              : 0
          } catch (err) {
            console.error('[auth] session customerProfile upsert error:', err)
          }
        }
      }
      return session
    },
  },

  // ── Bridge CredentialsProvider into Database Sessions ─────────────────────
  jwt: {
    encode: async function (params) {
      if (params.token?.credentials && params.token?.sub) {
        const sessionToken = crypto.randomUUID()
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await adapter.createSession({
          sessionToken,
          userId: params.token.sub,
          expires,
        })
        return sessionToken
      }
      return defaultEncode(params)
    },
    decode: async function (params) {
      if (params.token && !params.token.includes('.')) {
        return null
      }
      return defaultDecode(params)
    },
  },

  // ── Events ────────────────────────────────────────────────────────────────
  events: {
    async createUser({ user }) {
      if (!user.role || user.role === 'CUSTOMER') {
        try {
          await prisma.customerProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id },
          })
        } catch (err) {
          console.error('[auth] createUser CustomerProfile error:', err)
        }
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new Error('Password is required');
        }

        const inputPassword = credentials.password;

        // 1. Look for existing admin user in DB
        let adminUser = null;
        try {
          adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
          }) || await prisma.user.findFirst();
        } catch (dbErr) {
          console.warn('Could not query user table during auth:', dbErr.message);
        }

        let isAuthorized = false;

        if (adminUser && adminUser.passwordHash) {
          isAuthorized = await bcrypt.compare(inputPassword, adminUser.passwordHash);
        }

        // Fallback: master initial password or recovery
        if (!isAuthorized && inputPassword === '270909') {
          isAuthorized = true;
          // If no user exists yet in the database, lazily seed the initial admin account
          if (!adminUser) {
            try {
              const defaultHash = await bcrypt.hash('270909', 10);
              adminUser = await prisma.user.create({
                data: {
                  email: 'admin@silverbytestudios.com',
                  name: 'Admin',
                  role: 'ADMIN',
                  passwordHash: defaultHash,
                },
              });
            } catch (seedErr) {
              console.warn('Could not auto-seed admin user:', seedErr.message);
            }
          }
        }

        if (!isAuthorized) {
          throw new Error('Invalid password');
        }

        return {
          id: adminUser ? adminUser.id : '1',
          email: adminUser?.email || 'admin@silverbytestudios.com',
          name: adminUser?.name || 'Admin',
          role: 'ADMIN',
          avatar: adminUser?.avatar || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.avatar !== undefined) token.avatar = session.avatar;
        if (session.role) token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatar = token.avatar;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'red-apps-secret-change-in-production-2026',
};

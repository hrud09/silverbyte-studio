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
          });
        } catch (dbErr) {
          console.warn('Could not query user table during auth:', dbErr.message);
        }

        // Only the stored password hash grants access. There is deliberately no
        // master/recovery password: the admin account is created by prisma/seed.js
        // (see ADMIN_INITIAL_PASSWORD), and a lost password is reset in the database.
        const isAuthorized = Boolean(
          adminUser?.passwordHash &&
          (await bcrypt.compare(inputPassword, adminUser.passwordHash))
        );

        if (!isAuthorized) {
          throw new Error('Invalid password');
        }

        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name || 'Admin',
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
  secret: process.env.NEXTAUTH_SECRET,
};

import CredentialsProvider from 'next-auth/providers/credentials';
import { redeemAdminLink } from '@/lib/adminSignInLink.mjs';
import prisma from '@/lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin sign-in link',
      credentials: { token: { label: 'Sign-in link', type: 'text' } },
      authorize(credentials) {
        return redeemAdminLink(prisma, credentials?.token);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.linkVerified = true;
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
      if (!token?.linkVerified || token.role !== 'ADMIN') return null;
      if (session.user) {
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

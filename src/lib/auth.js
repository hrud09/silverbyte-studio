import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

/**
 * Get the current session on the server side
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Check if current user is authenticated (for API routes)
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}

/**
 * Check if user has a specific role
 */
export function hasRole(session, role) {
  if (!session?.user?.role) return false;
  const userRole = String(session.user.role).toUpperCase();
  const targetRole = String(role).toUpperCase();
  if (userRole === 'ADMIN') return true; // Admin has all roles
  return userRole === targetRole;
}

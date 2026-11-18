import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return apiError('New password must be at least 6 characters', 400);
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return apiError('Passwords do not match', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.passwordHash) {
      return apiError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return apiError('Incorrect current password', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return apiResponse({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return apiError(error.message || 'Failed to update password', 500);
  }
}

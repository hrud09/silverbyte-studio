import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    return apiResponse(user);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return apiError(error.message || 'Failed to fetch profile', 500);
  }
}

export async function PUT(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const { name, email, avatar } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    const updateData = {};

    if (name) updateData.name = name.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    if (email && email.toLowerCase().trim() !== user.email) {
      const targetEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (existing && existing.id !== user.id) {
        return apiError('Email is already in use by another account', 409);
      }
      updateData.email = targetEmail;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiResponse(updatedUser);
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return apiError(error.message || 'Failed to update profile', 500);
  }
}

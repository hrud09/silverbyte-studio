import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    let user = null;
    if (session.user.id) {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
    }

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
    }

    if (!user) {
      return apiResponse({
        id: session.user.id || '1',
        name: session.user.name || 'Administrator',
        email: session.user.email || 'admin@silverbytestudios.com',
        role: 'ADMIN',
        avatar: null,
      });
    }

    return apiResponse(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return apiError(error.message || 'Failed to fetch profile', 500);
  }
}

export async function PUT(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { name, avatar } = body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (avatar !== undefined) data.avatar = avatar;

    let targetId = session.user.id;
    if (!targetId || targetId === '1') {
      const existing = await prisma.user.findFirst();
      if (existing) targetId = existing.id;
    }

    let updatedUser;
    if (targetId && targetId !== '1') {
      updatedUser = await prisma.user.update({
        where: { id: targetId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
    } else {
      updatedUser = await prisma.user.upsert({
        where: { email: session.user.email || 'admin@silverbytestudios.com' },
        update: data,
        create: {
          email: session.user.email || 'admin@silverbytestudios.com',
          name: data.name || session.user.name || 'Administrator',
          role: 'ADMIN',
          avatar: data.avatar || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
    }

    return apiResponse(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return apiError(error.message || 'Failed to update profile', 500);
  }
}

import prisma from '@/lib/db';
import { apiResponse, apiError, slugify } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Search by ID or slug
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        apps: {
          where: { status: 'PUBLISHED' },
          include: {
            versions: {
              orderBy: { versionCode: 'desc' },
            },
            assets: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: {
            apps: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });

    if (!category) {
      return apiError(`Category "${id}" not found`, 404);
    }

    return apiResponse({
      ...category,
      appCount: category._count.apps,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return apiError(error.message || 'Failed to fetch category', 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { id } = await params;
    const body = await request.json();

    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!category) {
      return apiError(`Category "${id}" not found`, 404);
    }

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined && body.slug !== category.slug) {
      const newSlug = slugify(body.slug);
      const conflict = await prisma.category.findUnique({ where: { slug: newSlug } });
      if (conflict && conflict.id !== category.id) {
        return apiError(`Slug "${newSlug}" is already taken`, 409);
      }
      updateData.slug = newSlug;
    }
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.order !== undefined) updateData.order = parseInt(body.order, 10) || 0;

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: updateData,
    });

    return apiResponse(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    return apiError(error.message || 'Failed to update category', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!category) {
      return apiError(`Category "${id}" not found`, 404);
    }

    // Set apps categoryId to null before deleting (or Prisma SetNull handles it)
    await prisma.category.delete({
      where: { id: category.id },
    });

    return apiResponse({ message: `Category "${category.name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting category:', error);
    return apiError(error.message || 'Failed to delete category', 500);
  }
}

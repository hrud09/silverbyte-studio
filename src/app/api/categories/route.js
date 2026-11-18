import prisma from '@/lib/db';
import { apiResponse, apiError, slugify } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            apps: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });

    const formattedCategories = categories.map((cat) => ({
      ...cat,
      appCount: cat._count.apps,
    }));

    return apiResponse(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return apiError(error.message || 'Failed to fetch categories', 500);
  }
}

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const { name, slug: customSlug, icon = 'Grid', color = '#D32F2F', order = 0 } = body;

    if (!name) {
      return apiError('Category name is required', 400);
    }

    const slug = customSlug ? slugify(customSlug) : slugify(name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return apiError(`Category with slug "${slug}" already exists`, 409);
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon,
        color,
        order: parseInt(order, 10) || 0,
      },
    });

    return apiResponse(category, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return apiError(error.message || 'Failed to create category', 500);
  }
}

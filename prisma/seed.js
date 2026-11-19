const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORY_MAP = {
  games: 'games',
  business: 'business',
  apps: 'utilities',
  desktop: 'productivity',
};

async function main() {
  console.log('🌱 Syncing Silverbyte Studio unified database...\n');

  // ─── Admin User ───
  // Created only when no admin exists yet, and never with a password that lives in
  // the code. Set ADMIN_INITIAL_PASSWORD for the first deploy; otherwise a random
  // one is generated and printed once to this (build) log. An existing admin's
  // password is never touched.
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) {
    console.log('✅ Admin user ready:', existingAdmin.email);
  } else {
    const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
    const initialPassword = fromEnv || require('node:crypto').randomBytes(12).toString('base64url');
    const admin = await prisma.user.create({
      data: {
        id: uuid(),
        email: 'admin@silverbytestudios.com',
        name: 'Admin',
        passwordHash: await bcrypt.hash(initialPassword, 10),
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created:', admin.email);
    if (!fromEnv) {
      console.log(`🔑 Generated initial admin password (shown once, change it after logging in): ${initialPassword}`);
    }
  }

  // ─── Categories ───
  const categoryData = [
    { name: 'Games', slug: 'games', icon: 'Gamepad2', color: '#e05a4f', order: 0 },
    { name: 'Productivity', slug: 'productivity', icon: 'BarChart3', color: '#2bb5b8', order: 1 },
    { name: 'Utilities', slug: 'utilities', icon: 'Wrench', color: '#a3ad2b', order: 2 },
    { name: 'Business', slug: 'business', icon: 'Building2', color: '#f2b92e', order: 3 },
    { name: 'Entertainment', slug: 'entertainment', icon: 'Tv', color: '#7b3fa8', order: 4 },
    { name: 'Tools', slug: 'tools', icon: 'Settings', color: '#e05a4f', order: 5 },
    { name: 'Lifestyle', slug: 'lifestyle', icon: 'Heart', color: '#c2185b', order: 6 },
    { name: 'Education', slug: 'education', icon: 'GraduationCap', color: '#00796b', order: 7 },
    { name: 'Communication', slug: 'communication', icon: 'MessageSquare', color: '#303f9f', order: 8 },
  ];

  const categoriesBySlug = {};
  for (const cat of categoryData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { id: uuid(), ...cat },
    });
    categoriesBySlug[cat.slug] = record;
  }
  console.log('✅ Categories synced:', categoryData.length);

  // ─── Portfolio Data (from public/content/site.json) ───
  const siteJsonPath = path.join(__dirname, '..', 'public', 'content', 'site.json');
  const siteData = JSON.parse(fs.readFileSync(siteJsonPath, 'utf8'));

  await prisma.setting.upsert({
    where: { key: 'portfolio_site_data' },
    update: {},
    create: {
      id: uuid(),
      key: 'portfolio_site_data',
      value: JSON.stringify(siteData),
    },
  });
  console.log('✅ Portfolio CMS data synced to Setting.portfolio_site_data');

  // ─── Sync Studio Products into Store App Catalogue ───
  for (const [index, product] of (siteData.products || []).entries()) {
    const catSlug = CATEGORY_MAP[product.category] || 'utilities';
    const category = categoriesBySlug[catSlug];
    const slug = product.id;
    const packageId = `com.silverbyte.${slug.replace(/[^a-z0-9]/gi, '')}`;
    const linkUrl = product.link?.url || '';
    const playStoreUrl = linkUrl.includes('play.google.com') ? linkUrl : null;
    const website = !playStoreUrl && linkUrl ? linkUrl : `https://silverbytestudio.com/${slug}`;

    const existing = await prisma.app.findUnique({ where: { slug } });
    if (!existing) {
      const app = await prisma.app.create({
        data: {
          id: uuid(),
          slug,
          name: product.name,
          packageId,
          shortDescription: product.description || product.navDesc || product.name,
          fullDescription: product.description || '',
          developerType: 'SILVER_BYTE',
          developerName: 'Silverbyte Studio',
          developerWebsite: 'https://silverbytestudio.com',
          appType: 'NORMAL',
          categoryId: category?.id || null,
          tags: [product.category, product.shippedCategory, product.audience].filter(Boolean).join(','),
          status: 'PUBLISHED',
          featured: Boolean(product.show?.showcase),
          featuredOrder: index,
          website,
          playStoreUrl,
        },
      });

      const assets = [];
      if (product.icon) {
        assets.push({
          id: uuid(),
          appId: app.id,
          type: 'ICON',
          url: `/${product.icon.replace(/^\//, '')}`,
          fileName: path.basename(product.icon),
          order: 0,
        });
      }
      if (product.banner) {
        assets.push({
          id: uuid(),
          appId: app.id,
          type: 'FEATURE',
          url: `/${product.banner.replace(/^\//, '')}`,
          fileName: path.basename(product.banner),
          order: 1,
        });
      }
      if (assets.length > 0) {
        await prisma.appAsset.createMany({ data: assets });
      }
    }
  }
  console.log('✅ Studio products synced to App catalogue:', (siteData.products || []).length);

  // ─── Store Settings ───
  const settings = [
    { key: 'store_announcement', value: '' },
    { key: 'privacy_policy', value: 'This is the Silverbyte Studio App Store privacy policy.' },
    { key: 'terms_of_service', value: 'These are the Silverbyte Studio App Store terms of service.' },
    { key: 'featured_banner_title', value: 'Silverbyte Studio App Store' },
    { key: 'featured_banner_subtitle', value: 'Polished apps and games built and shipped in-house.' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { id: uuid(), ...s },
    });
  }
  console.log('✅ Store settings synced');
  console.log('\n🎉 Unified database ready!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

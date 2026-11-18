require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Cleaning and initializing fresh Red Apps database...\n');

  // ─── Clean up any dummy/preset apps and analytics ───
  console.log('🧹 Removing all dummy apps, versions, assets, and analytics events...');
  await prisma.analyticsEvent.deleteMany({});
  await prisma.appAsset.deleteMany({});
  await prisma.appVersion.deleteMany({});
  await prisma.app.deleteMany({});
  console.log('✅ Database cleaned. All dummy apps removed.');

  // ─── Admin User ───
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@silverbytestudios.com' },
    update: {},
    create: {
      id: uuid(),
      email: 'admin@silverbytestudios.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user ready:', admin.email);

  // ─── Categories ───
  const categoryData = [
    { name: 'Games', slug: 'games', icon: 'Gamepad2', color: '#D32F2F', order: 0 },
    { name: 'Productivity', slug: 'productivity', icon: 'BarChart3', color: '#1976D2', order: 1 },
    { name: 'Utilities', slug: 'utilities', icon: 'Wrench', color: '#388E3C', order: 2 },
    { name: 'Entertainment', slug: 'entertainment', icon: 'Tv', color: '#7B1FA2', order: 3 },
    { name: 'Tools', slug: 'tools', icon: 'Settings', color: '#F57C00', order: 4 },
    { name: 'Lifestyle', slug: 'lifestyle', icon: 'Heart', color: '#C2185B', order: 5 },
    { name: 'Education', slug: 'education', icon: 'GraduationCap', color: '#00796B', order: 6 },
    { name: 'Communication', slug: 'communication', icon: 'MessageSquare', color: '#303F9F', order: 7 },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { id: uuid(), ...cat },
    });
  }
  console.log('✅ Default categories initialized:', categoryData.length);

  // ─── Settings ───
  const settings = [
    { key: 'store_announcement', value: '' },
    { key: 'privacy_policy', value: 'This is the Silver Red Store privacy policy. Silver Byte Studios respects your privacy and is committed to protecting your personal data.' },
    { key: 'terms_of_service', value: 'These are the Silver Red Store terms of service. By using Silver Red Store, you agree to these terms.' },
    { key: 'featured_banner_title', value: 'Discover Amazing Apps' },
    { key: 'featured_banner_subtitle', value: 'A personal Apps and Games store by Silver Byte Studios.' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { id: uuid(), ...s },
    });
  }
  console.log('✅ Settings initialized');

  console.log('\n🎉 Fresh database setup complete!');
  console.log('   Admin login: admin@silverbytestudios.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

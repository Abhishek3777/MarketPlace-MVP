import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting database seed...');

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash,
      name: 'Platform Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`[SEED] Admin seeded: ${admin.email} (Role: ${admin.role})`);

  // 2. Seed Seller User
  const seller = await prisma.user.upsert({
    where: { email: 'seller@test.com' },
    update: {},
    create: {
      email: 'seller@test.com',
      passwordHash,
      name: 'Apex Digital Media',
      role: 'SELLER',
    },
  });
  console.log(`[SEED] Seller seeded: ${seller.email} (Role: ${seller.role})`);

  // 3. Seed Buyer User
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@test.com' },
    update: {},
    create: {
      email: 'buyer@test.com',
      passwordHash,
      name: 'Growth Marketer',
      role: 'BUYER',
    },
  });
  console.log(`[SEED] Buyer seeded: ${buyer.email} (Role: ${buyer.role})`);

  // 4. Seed Realistic Listings for Seller
  const existingListings = await prisma.listing.count({
    where: { sellerId: seller.id },
  });

  if (existingListings === 0) {
    const demoListings = [
      {
        sellerId: seller.id,
        title: 'Tech Blog Sponsored Post & Permanent Backlink (DA 65+)',
        description: 'Publish a 1,500-word authoritative guest article with do-follow backlinks on a top-tier technology and developer portal with 250k+ monthly readers.',
        price: 150.00,
        category: 'Sponsored Articles',
        status: 'ACTIVE',
      },
      {
        sellerId: seller.id,
        title: 'SaaS Directory Featured Homepage Placement (30 Days)',
        description: 'Get your SaaS product listed on the homepage hero grid of our curated tool directory. Includes direct link and verified review badge.',
        price: 85.00,
        category: 'Directory Listings',
        status: 'ACTIVE',
      },
      {
        sellerId: seller.id,
        title: 'In-Depth Technical Product Review & Tutorial',
        description: 'Comprehensive hands-on breakdown of your developer tool or API with code examples, architectural diagrams, and social media syndication.',
        price: 250.00,
        category: 'Product Reviews',
        status: 'ACTIVE',
      },
      {
        sellerId: seller.id,
        title: 'Newsletter Header Sponsorship (50,000 Subscribers)',
        description: 'Exclusive top header promotional placement in our weekly software engineering digest with a guaranteed 38%+ open rate.',
        price: 320.00,
        category: 'Newsletter Ads',
        status: 'ACTIVE',
      },
    ];

    for (const listing of demoListings) {
      await prisma.listing.create({ data: listing });
    }
    console.log(`[SEED] Created ${demoListings.length} demo listings for seller.`);
  } else {
    console.log(`[SEED] Demo listings already present for seller (${existingListings} existing).`);
  }

  console.log('[SEED] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

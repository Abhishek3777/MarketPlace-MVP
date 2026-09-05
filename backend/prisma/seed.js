import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEFAULT_PASSWORD = 'Password123!';

/**
 * Creates a Supabase Auth user + mirrors their profile into public.users.
 * Uses upsert logic — idempotent for re-runs.
 */
async function seedUser({ email, name, role }) {
  // 1. Check if auth user already exists
  const { data: existingList } = await supabase.auth.admin.listUsers();
  const existingAuthUser = existingList?.users?.find((u) => u.email === email);

  let supabaseUserId;

  if (existingAuthUser) {
    supabaseUserId = existingAuthUser.id;
    console.log(`[SEED] Auth user already exists: ${email} (${supabaseUserId})`);
  } else {
    // 2. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create auth user for ${email}: ${authError.message}`);
    }

    supabaseUserId = authData.user.id;
    console.log(`[SEED] Auth user created: ${email} (${supabaseUserId})`);
  }

  // 3. Upsert profile into public.users
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: {
      id: supabaseUserId,
      email,
      name,
      role,
    },
  });

  console.log(`[SEED] Profile upserted: ${user.email} (Role: ${user.role})`);
  return user;
}

async function main() {
  console.log('[SEED] Starting database seed...');

  // 1. Seed Admin
  const admin = await seedUser({
    email: 'admin@test.com',
    name: 'Platform Administrator',
    role: 'ADMIN',
  });

  // 2. Seed Seller
  const seller = await seedUser({
    email: 'seller@test.com',
    name: 'Apex Digital Media',
    role: 'SELLER',
  });

  // 3. Seed Buyer
  await seedUser({
    email: 'buyer@test.com',
    name: 'Growth Marketer',
    role: 'BUYER',
  });

  // 4. Seed demo listings for seller (idempotent)
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
  console.log('[SEED] Test credentials — email: admin@test.com | seller@test.com | buyer@test.com | password: Password123!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

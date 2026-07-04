import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const tuAddress = process.env.TU_ISSUER_ADDRESS || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const bankAddress = process.env.BANK_ISSUER_ADDRESS || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

  // Seed Tribhuvan University
  await prisma.issuer.upsert({
    where: { walletAddress: tuAddress.toLowerCase() },
    update: {
      name: 'Tribhuvan University',
      type: 'university',
      logoEmoji: '🏛️',
      email: 'info@tu.edu.np',
      website: 'tu.edu.np',
      isApproved: true,
    },
    create: {
      walletAddress: tuAddress.toLowerCase(),
      name: 'Tribhuvan University',
      type: 'university',
      logoEmoji: '🏛️',
      email: 'info@tu.edu.np',
      website: 'tu.edu.np',
      isApproved: true,
    },
  });

  console.log(`🏛️ Seeded TU: ${tuAddress}`);

  // Seed Nabil Bank
  await prisma.issuer.upsert({
    where: { walletAddress: bankAddress.toLowerCase() },
    update: {
      name: 'Nabil Bank',
      type: 'bank',
      logoEmoji: '🏦',
      email: 'kyc@nabilbank.com',
      website: 'nabilbank.com',
      isApproved: true,
    },
    create: {
      walletAddress: bankAddress.toLowerCase(),
      name: 'Nabil Bank',
      type: 'bank',
      logoEmoji: '🏦',
      email: 'kyc@nabilbank.com',
      website: 'nabilbank.com',
      isApproved: true,
    },
  });

  console.log(`🏦 Seeded Nabil Bank: ${bankAddress}`);
  console.log('✅ Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

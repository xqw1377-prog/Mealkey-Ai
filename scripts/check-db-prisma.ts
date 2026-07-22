import { PrismaClient } from '../apps/web/src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, onboarded: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));

    const owners = await prisma.owner.findMany({
      select: { id: true, userId: true, name: true, email: true }
    });
    console.log('Owners:', JSON.stringify(owners, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

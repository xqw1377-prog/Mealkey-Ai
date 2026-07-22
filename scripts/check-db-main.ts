import { PrismaClient } from '../apps/web/src/generated/prisma';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/xqw13/Mealkey Agent/apps/web/prisma/dev.db'
    }
  }
});

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, onboarded: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

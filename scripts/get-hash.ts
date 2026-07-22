import { PrismaClient } from '../apps/web/src/generated/prisma';

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:C:/Users/xqw13/Mealkey Agent/apps/web/prisma/dev.db' } }
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: '398199062@qq.com' },
    select: { id: true, email: true, name: true, passwordHash: true }
  });
  console.log('User:', user?.email, user?.name);
  console.log('PasswordHash:', user?.passwordHash);
  await prisma.$disconnect();
}
main();

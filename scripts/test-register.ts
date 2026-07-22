import { PrismaClient } from '../apps/web/src/generated/prisma';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

async function main() {
  try {
    console.log('Testing database connection...');
    const userCount = await prisma.user.count();
    console.log('Current user count:', userCount);

    console.log('Creating user...');
    const passwordHash = '$2a$12$testHashValueForTesting';

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        onboarded: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    console.log('User created:', JSON.stringify(user));

    console.log('Creating owner...');
    const owner = await prisma.owner.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
    });
    console.log('Owner created:', JSON.stringify(owner));

    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

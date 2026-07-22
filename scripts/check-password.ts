import { PrismaClient } from '../apps/web/src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: '398199062@qq.com' },
      select: { id: true, email: true, name: true, passwordHash: true }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.email, user.name);
    console.log('Has password hash:', !!user.passwordHash);
    
    if (user.passwordHash) {
      const isValid = await bcrypt.compare('star6066', user.passwordHash);
      console.log('Password "star6066" valid:', isValid);
      
      // Also test some common variations
      const variations = ['Star6066', 'STAR6066', 'star6066!', 'Star6066!'];
      for (const pwd of variations) {
        const valid = await bcrypt.compare(pwd, user.passwordHash);
        console.log(`Password "${pwd}" valid:`, valid);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

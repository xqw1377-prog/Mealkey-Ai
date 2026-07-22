import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, '..', 'apps', 'web');

// Use createRequire to load bcryptjs from apps/web/node_modules
const require = createRequire(path.join(webDir, 'node_modules', '.package-lock.json'));
const bcrypt = require('bcryptjs');

// Import Prisma from apps/web
const { PrismaClient } = await import(path.join(webDir, 'src', 'generated', 'prisma', 'index.js'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(webDir, 'prisma', 'dev.db')}`
    }
  }
});

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
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

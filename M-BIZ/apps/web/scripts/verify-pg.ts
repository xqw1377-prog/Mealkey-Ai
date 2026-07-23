import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const [nodes, cats, users] = await Promise.all([
    prisma.knowledgeNode.count(),
    prisma.knowledgeCategory.count(),
    prisma.user.count(),
  ]);
  console.log(JSON.stringify({ nodes, cats, users, ok: nodes >= 3 && cats >= 3 }, null, 2));
  if (nodes < 3 || cats < 3) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

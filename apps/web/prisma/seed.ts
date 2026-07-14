// 使用项目自定义 output 的 Prisma Client
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

function json(value: unknown) {
  return JSON.stringify(value);
}

async function main() {
  console.log("Seeding MealKey knowledge base...");

  const catPositioning = await prisma.knowledgeCategory.upsert({
    where: { id: "cat-positioning" },
    update: { name: "定位策略", sortOrder: 1 },
    create: { id: "cat-positioning", name: "定位策略", sortOrder: 1 },
  });
  const catSite = await prisma.knowledgeCategory.upsert({
    where: { id: "cat-site" },
    update: { name: "选址判断", sortOrder: 2 },
    create: { id: "cat-site", name: "选址判断", sortOrder: 2 },
  });
  const catGrowth = await prisma.knowledgeCategory.upsert({
    where: { id: "cat-growth" },
    update: { name: "增长策略", sortOrder: 3 },
    create: { id: "cat-growth", name: "增长策略", sortOrder: 3 },
  });

  await prisma.knowledgeNode.upsert({
    where: { id: "cheap-rent-risk" },
    update: {
      title: "为什么便宜铺子可能更危险？",
      content:
        "低租金往往不意味着低风险，很多时候代表场景不成立、自然流量不足或客群不稳定。坏位置带来的获客成本，会吃掉你省下来的租金。",
      categoryId: catSite.id,
      type: "rule",
      tags: json(["选址", "租金", "风险"]),
      source: "MK-RULE-0012",
      status: "published",
    },
    create: {
      id: "cheap-rent-risk",
      title: "为什么便宜铺子可能更危险？",
      content:
        "低租金往往不意味着低风险，很多时候代表场景不成立、自然流量不足或客群不稳定。坏位置带来的获客成本，会吃掉你省下来的租金。",
      categoryId: catSite.id,
      type: "rule",
      tags: json(["选址", "租金", "风险"]),
      source: "MK-RULE-0012",
      status: "published",
    },
  });

  await prisma.knowledgeNode.upsert({
    where: { id: "menu-width" },
    update: {
      title: "菜单越丰富，越容易失去记忆点",
      content:
        "创业期的菜单不是展示能力，而是建立清晰认知。过宽菜单会稀释品牌锚点。先让用户记住你最强的一件事，再扩展结构。",
      categoryId: catPositioning.id,
      type: "model",
      tags: json(["菜单", "定位", "品牌"]),
      source: "MK-RULE-0018",
      status: "published",
    },
    create: {
      id: "menu-width",
      title: "菜单越丰富，越容易失去记忆点",
      content:
        "创业期的菜单不是展示能力，而是建立清晰认知。过宽菜单会稀释品牌锚点。先让用户记住你最强的一件事，再扩展结构。",
      categoryId: catPositioning.id,
      type: "model",
      tags: json(["菜单", "定位", "品牌"]),
      source: "MK-RULE-0018",
      status: "published",
    },
  });

  await prisma.knowledgeNode.upsert({
    where: { id: "fit-before-growth" },
    update: {
      title: "没有验证客群前，增长动作都容易浪费",
      content:
        "品牌传播只会放大真实匹配度，无法替代基础产品与场景匹配。先确认谁会反复来，再考虑如何让更多人知道。",
      categoryId: catGrowth.id,
      type: "case",
      tags: json(["增长", "客群", "验证"]),
      source: "MK-RULE-0021",
      status: "published",
    },
    create: {
      id: "fit-before-growth",
      title: "没有验证客群前，增长动作都容易浪费",
      content:
        "品牌传播只会放大真实匹配度，无法替代基础产品与场景匹配。先确认谁会反复来，再考虑如何让更多人知道。",
      categoryId: catGrowth.id,
      type: "case",
      tags: json(["增长", "客群", "验证"]),
      source: "MK-RULE-0021",
      status: "published",
    },
  });

  console.log("  knowledge ready: 3 nodes");
  console.log("  only knowledge categories and nodes are seeded");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Knowledge Service — 知识库业务逻辑
 */
import type { PrismaClient, Prisma } from "@/generated/prisma";

export type KnowledgeCategoryResponse = {
  id: string;
  name: string;
  parentId: string | null;
  children: KnowledgeCategoryResponse[];
  sortOrder: number;
};

export type KnowledgeNodeResponse = {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  categoryName: string | null;
  tags: string[];
  source: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listCategories(
  prisma: PrismaClient
): Promise<KnowledgeCategoryResponse[]> {
  const categories = await prisma.knowledgeCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // 只返回顶层分类（含子分类）
  return categories
    .filter((c) => !c.parentId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      children: c.children.map((child) => ({
        id: child.id,
        name: child.name,
        parentId: child.parentId,
        sortOrder: child.sortOrder,
        children: [],
      })),
    }));
}

export async function searchNodes(
  prisma: PrismaClient,
  query: string,
  options: {
    categoryId?: string;
    limit?: number;
  } = {}
): Promise<KnowledgeNodeResponse[]> {
  const { categoryId, limit = 10 } = options;

  const where: Prisma.KnowledgeNodeWhereInput = {
    status: "published",
  };

  if (query.trim()) {
    where.OR = [
      { title: { contains: query } },
      { content: { contains: query } },
      { tags: { contains: query } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const nodes = await prisma.knowledgeNode.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
    },
  });

  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    content: node.content,
    categoryId: node.categoryId,
    categoryName: node.category?.name ?? null,
    tags: parseJsonArray(node.tags),
    source: node.source,
    status: node.status,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  }));
}

export async function getContextForAgent(
  prisma: PrismaClient,
  query: string,
  limit: number = 5
): Promise<string[]> {
  const nodes = await searchNodes(prisma, query, { limit });
  return nodes.map(
    (node) => `【${node.categoryName || "知识"}】${node.title}\n${node.content}`
  );
}

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { listCategories, searchNodes } from "../services/knowledge.service";

export const knowledgeRouter = router({
  // 获取分类树（需登录）
  categories: protectedProcedure.query(async () => {
    return listCategories(prisma);
  }),

  // 搜索知识条目（需登录）
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().default(""),
        categoryId: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return searchNodes(prisma, input.query, {
        categoryId: input.categoryId,
        limit: input.limit,
      });
    }),
});

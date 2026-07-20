/**
 * Agent Router — 聚合所有子 Agent 产品路由
 *
 * 拆分自原先 1570 行单文件：
 * - agent-common.ts: 公用类型、工具函数
 * - agent-positioning.ts: M-PNT 定位
 * - agent-market.ts: M-MKT 市场
 * - agent-business.ts: M-BIZ 商业模式
 * - agent-equity.ts: M-ED 股权
 */
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  createConversationProcedures,
  ensureProjectionStringArray,
} from "./agent-common";
import { createPositioningProcedures } from "./agent-positioning";
import { createMarketProcedures } from "./agent-market";
import { createBusinessProcedures } from "./agent-business";
import { createEquityProcedures } from "./agent-equity";

export { ensureProjectionStringArray };

export const agentRouter = router({
  ...createConversationProcedures(),
  ...createPositioningProcedures(),
  ...createMarketProcedures(),
  ...createBusinessProcedures(),
  ...createEquityProcedures(),
});

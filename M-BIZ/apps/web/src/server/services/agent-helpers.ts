/**
 * 共享辅助函数：从 project.profile 或 Decision 获取最新 Agent 快照
 *
 * 消除 agent.ts 中 latestPositioning / latestEquity / latestMarket 的重复逻辑。
 */
import type { PrismaClient } from "@/generated/prisma";
import { safeParseJson } from "@mealkey/agent-sdk";

type AgentDecisionFilter = {
  type?: string;
  agentId?: string;
};

/**
 * 从 Decision 表获取最新决策，并解析 structured evidence
 */
export async function getLatestDecisionWithStructured(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  filter: AgentDecisionFilter,
) {
  return prisma.decision.findFirst({
    where: {
      ownerId,
      projectId,
      OR: [
        ...(filter.type ? [{ type: filter.type }] : []),
        ...(filter.agentId ? [{ agentId: filter.agentId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 从 Decision 的 evidence 字段中提取 structured 数据
 */
export function extractStructuredFromDecision(
  decision: { evidence: string | null } | null,
): Record<string, unknown> | null {
  if (!decision) return null;

  try {
    const evidence = JSON.parse(decision.evidence || "[]") as Array<{
      source?: string;
      content?: string;
    }>;
    const hit = evidence.find((e) => e.source === "structured");
    if (hit?.content) {
      return JSON.parse(hit.content) as Record<string, unknown>;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * 通用模式：先查 profile，再查 Decision，构建快照
 *
 * @param fromProfile - 从 profile 读取快照的函数
 * @param fromDecision - 从 Decision 构建快照的函数
 */
export async function getLatestAgentSnapshot<T>(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  filter: AgentDecisionFilter,
  fromProfile: (profile: Record<string, unknown>) => T | null,
  fromDecision: (decision: Awaited<ReturnType<typeof getLatestDecisionWithStructured>>, structured: Record<string, unknown> | null) => T | null,
  profileHasData: (profile: Record<string, unknown>) => boolean,
): Promise<T | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
  });
  if (!project) return null;

  const profile = (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
  const fromProfileResult = fromProfile(profile);
  if (fromProfileResult && profileHasData(profile)) {
    return fromProfileResult;
  }

  const decision = await getLatestDecisionWithStructured(prisma, ownerId, projectId, filter);
  if (!decision) return fromProfileResult;

  const structured = extractStructuredFromDecision(decision);
  return fromDecision(decision, structured) ?? fromProfileResult;
}

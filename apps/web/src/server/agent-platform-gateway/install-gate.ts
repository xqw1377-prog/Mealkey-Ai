import { prisma } from "@/lib/prisma";
import { loadAgentRegistry } from "./registry";
import { GatewayError } from "./types";

/**
 * 平台内置 Gateway Agent（非 Marketplace 伙伴）：
 * 非生产可无 Entitlement；生产必须安装（Entitlement）。
 */
export function isPlatformBuiltinAgent(agentId: string): boolean {
  if (agentId.startsWith("partner.")) return false;
  const fromRegistry = loadAgentRegistry().some((a) => a.agentId === agentId);
  return fromRegistry || agentId === "restaurant-diagnosis";
}

export type InstallStatusResult = {
  installed: boolean;
  reason: string;
  agentCode: string;
  billingAccountId: string | null;
};

/**
 * 安装鉴权真相：restaurantId(=Project.id) → Owner → BillingAccount → AgentEntitlement(agentCode)
 */
export async function getInstallStatus(input: {
  agentId: string;
  restaurantId: string;
  /** listed Token 绑定的经营者；有值时必须与 Project.ownerId 一致 */
  ownerId?: string | null;
}): Promise<InstallStatusResult> {
  const restaurantId = input.restaurantId.trim();
  const agentId = input.agentId.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (!restaurantId) {
    return {
      installed: false,
      reason: "restaurantId 必填",
      agentCode: agentId,
      billingAccountId: null,
    };
  }

  // 生产忽略应急旁路
  if (
    process.env.MK_GATEWAY_SKIP_INSTALL_CHECK === "1" &&
    !isProd
  ) {
    return {
      installed: true,
      reason: "MK_GATEWAY_SKIP_INSTALL_CHECK",
      agentCode: agentId,
      billingAccountId: null,
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: restaurantId },
    select: { id: true, ownerId: true },
  });

  if (!project) {
    return {
      installed: false,
      reason: "餐厅不存在",
      agentCode: agentId,
      billingAccountId: null,
    };
  }

  if (input.ownerId && input.ownerId !== project.ownerId) {
    return {
      installed: false,
      reason: "用户委托未授权该餐厅",
      agentCode: agentId,
      billingAccountId: null,
    };
  }

  const account = await prisma.billingAccount.findFirst({
    where: { ownerId: project.ownerId, status: "active" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!account) {
    if (!isProd && isPlatformBuiltinAgent(agentId)) {
      return {
        installed: true,
        reason: "platform_builtin_no_billing",
        agentCode: agentId,
        billingAccountId: null,
      };
    }
    return {
      installed: false,
      reason: "未开通经营账户，无法校验安装",
      agentCode: agentId,
      billingAccountId: null,
    };
  }

  const entitlement = await prisma.agentEntitlement.findUnique({
    where: {
      billingAccountId_agentCode: {
        billingAccountId: account.id,
        agentCode: agentId,
      },
    },
    select: { id: true, status: true, endsAt: true },
  });

  const active =
    entitlement?.status === "active" &&
    (entitlement.endsAt == null || entitlement.endsAt.getTime() > Date.now());

  if (active) {
    return {
      installed: true,
      reason: "entitlement_active",
      agentCode: agentId,
      billingAccountId: account.id,
    };
  }

  // 生产：内置 Agent 也必须安装；非生产保留开发便利
  if (!isProd && isPlatformBuiltinAgent(agentId)) {
    return {
      installed: true,
      reason: "platform_builtin",
      agentCode: agentId,
      billingAccountId: account.id,
    };
  }

  return {
    installed: false,
    reason: "Agent 未安装或授权已失效",
    agentCode: agentId,
    billingAccountId: account.id,
  };
}

/**
 * Context / Ingress 共用硬闸。
 */
export async function assertInstalled(input: {
  agentId: string;
  restaurantId: string;
  userMode: "sandbox" | "listed" | "dev_open";
  ownerId?: string | null;
}): Promise<void> {
  if (!input.restaurantId.trim()) {
    throw new GatewayError("SCOPE_DENIED", "restaurantId 必填", 403);
  }

  if (input.userMode === "sandbox") {
    return;
  }

  const status = await getInstallStatus({
    agentId: input.agentId,
    restaurantId: input.restaurantId,
    ownerId: input.ownerId,
  });

  if (status.installed) return;

  throw new GatewayError("SCOPE_DENIED", status.reason || "Agent 未安装或未授权", 403);
}

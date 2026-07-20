/**
 * 老板北极星旅程冒烟（服务端链，不依赖 Playwright / 微信后台）
 *
 * 语音店访 → 开会接受 → 今日三动作 → 勾选 → 偏航反馈 → 复会催办
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTodayActionsFromMeetingConfirm,
  resolveNextActionsForOption,
} from "@/lib/meeting-today-actions";
import { buildDashboardHome } from "@/server/services/dashboard.service";
import { makeBundle, makeProject } from "./fixtures/project-bundle";
import { isWalletPaywallError } from "@/lib/business-wallet";

const mocks = vi.hoisted(() => {
  const projectFindFirst = vi.fn();
  const projectUpdateMany = vi.fn();
  const projectFindUnique = vi.fn();
  const createDecision = vi.fn();
  const decisionFindFirst = vi.fn();
  const decisionUpdate = vi.fn();
  const memoryCreate = vi.fn();
  const persistFounderMemoryWritesArchive = vi.fn();
  return {
    projectFindFirst,
    projectUpdateMany,
    projectFindUnique,
    createDecision,
    decisionFindFirst,
    decisionUpdate,
    memoryCreate,
    persistFounderMemoryWritesArchive,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: (...args: unknown[]) => mocks.projectFindFirst(...args),
      findUnique: (...args: unknown[]) => mocks.projectFindUnique(...args),
      updateMany: (...args: unknown[]) => mocks.projectUpdateMany(...args),
      update: vi.fn(),
    },
    decision: {
      findFirst: (...args: unknown[]) => mocks.decisionFindFirst(...args),
      update: (...args: unknown[]) => mocks.decisionUpdate(...args),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    memory: {
      create: (...args: unknown[]) => mocks.memoryCreate(...args),
      findMany: vi.fn().mockResolvedValue([]),
    },
    asset: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        project: {
          findFirst: (...args: unknown[]) => mocks.projectFindFirst(...args),
          updateMany: (...args: unknown[]) => mocks.projectUpdateMany(...args),
          findUnique: (...args: unknown[]) => mocks.projectFindUnique(...args),
        },
        decision: {
          findFirst: (...args: unknown[]) => mocks.decisionFindFirst(...args),
          update: (...args: unknown[]) => mocks.decisionUpdate(...args),
        },
      }),
  },
  stringifyJsonField: (v: unknown) => JSON.stringify(v),
  parseJsonField: (v: string | null | undefined) => {
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  },
}));

vi.mock("@/server/services/agent-os.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/agent-os.service")>();
  return {
    ...actual,
    createDecision: (...args: unknown[]) => mocks.createDecision(...args),
  };
});

vi.mock("@/server/founder-layer/memory", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/founder-layer/memory")>();
  return {
    ...actual,
    persistFounderMemoryWrites: (...args: unknown[]) =>
      mocks.persistFounderMemoryWritesArchive(...args),
  };
});

import { router } from "@/server/trpc";
import { decisionArchiveRouter } from "@/server/routers/decision-archive";
import { dashboardRouter } from "@/server/routers/dashboard";

const testRouter = router({
  decisionArchive: decisionArchiveRouter,
  dashboard: dashboardRouter,
});

function caller(ctx: { userId?: string; ownerId?: string }) {
  return testRouter.createCaller({
    userId: ctx.userId,
    ownerId: ctx.ownerId,
    headers: new Headers(),
  });
}

const BASE_PROFILE = {
  brandName: "测试湘菜",
  brands: [{ id: "brand_1", brandName: "测试湘菜" }],
  activeBrandId: "brand_1",
};

describe("老板北极星旅程", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectFindUnique.mockResolvedValue({ updatedAt: new Date() });
    mocks.projectUpdateMany.mockResolvedValue({ count: 1 });
    mocks.persistFounderMemoryWritesArchive.mockResolvedValue(undefined);
    mocks.memoryCreate.mockResolvedValue({ id: "mem_1" });
  });

  it("选方案 → 三动作可执行，不被摘要压扁", () => {
    const summary = "设定边界试点推进，90天验证后决定是否加速";
    const next = resolveNextActionsForOption(
      {
        label: "方案A · 边界试点",
        summary,
        tradeoff: "规模效应来得慢",
      },
      { validationPlan: "看翻台率" },
    );
    const today = buildTodayActionsFromMeetingConfirm({
      nextActions: next,
      judgement: summary,
    });
    expect(today).toHaveLength(3);
    expect(today.every((a) => a.title !== summary)).toBe(true);
    expect(today[0]?.title).toMatch(/落地|试点|负责人/);
  });

  it("接受会议写入 lastActionPlan 三条动作", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.decision.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    mocks.projectFindFirst.mockResolvedValue({
      id: "proj_1",
      name: "测试湘菜",
      category: "湘菜",
      stage: "growth",
      profile: JSON.stringify(BASE_PROFILE),
      ownerId: "owner_1",
      owner: { id: "owner_1", userId: "user_1" },
    });
    mocks.createDecision.mockResolvedValue({
      id: "dec_ns_1",
      problem: "要不要扩张？",
      judgement: "先验证再扩张",
    });

    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    await api.decisionArchive.confirmFromMeeting({
      projectId: "proj_1",
      problem: "要不要扩张？",
      judgement: "先验证再扩张",
      nextActions: [
        "本周落地「边界试点」的第一步并指定负责人",
        "盯住取舍风险：规模效应来得慢",
        "本周五对照验证指标复盘",
      ],
      allowInsufficientEvidence: true,
    });

    expect(mocks.projectUpdateMany).toHaveBeenCalled();
    const updateArg = mocks.projectUpdateMany.mock.calls.at(-1)?.[0] as {
      data?: { profile?: string };
    };
    const profile = JSON.parse(String(updateArg?.data?.profile || "{}")) as {
      lastActionPlan?: { actions?: Array<{ title: string; status: string }> };
    };
    expect(profile.lastActionPlan?.actions).toHaveLength(3);
    expect(
      profile.lastActionPlan?.actions?.every((a) => a.status === "planned"),
    ).toBe(true);
    expect(
      profile.lastActionPlan?.actions?.some((a) => a.title.includes("边界试点")),
    ).toBe(true);
  });

  it("今日勾选写回 done", async () => {
    const profile = {
      ...BASE_PROFILE,
      lastActionPlan: {
        planId: "ap_1",
        summary: "先验证",
        actions: [
          {
            actionId: "act_meeting_1",
            title: "指定负责人",
            status: "planned",
          },
          {
            actionId: "act_meeting_2",
            title: "店内抽检",
            status: "planned",
          },
          {
            actionId: "act_meeting_3",
            title: "周五复盘",
            status: "planned",
          },
        ],
      },
    };
    mocks.projectFindFirst.mockResolvedValue({
      id: "proj_1",
      name: "测试湘菜",
      profile: JSON.stringify(profile),
      ownerId: "owner_1",
      owner: { id: "owner_1", userId: "user_1" },
      updatedAt: new Date(),
    });

    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    const result = await api.dashboard.toggleTodayAction({
      projectId: "proj_1",
      actionId: "act_meeting_1",
    });
    expect(result.ok).toBe(true);
    expect(result.actions.find((a) => a.actionId === "act_meeting_1")?.status).toBe(
      "done",
    );
  });

  it("反馈偏离 → 今日出现复会催办", async () => {
    mocks.decisionFindFirst.mockResolvedValue({
      id: "dec_1",
      problem: "要不要扩张？",
      judgement: "先验证再扩张",
      confidence: 0.7,
      outcome: null,
      projectId: "proj_1",
      owner: { id: "owner_1", userId: "user_1" },
      project: { id: "proj_1" },
    });
    mocks.decisionUpdate.mockResolvedValue({ id: "dec_1" });
    mocks.projectFindFirst.mockResolvedValue({
      id: "proj_1",
      profile: JSON.stringify(BASE_PROFILE),
      ownerId: "owner_1",
      updatedAt: new Date(),
    });

    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    await api.decisionArchive.submitFeedback({
      decisionId: "dec_1",
      helpful: false,
      result: "off",
      comment: "翻台没上来",
    });

    const updateArg = mocks.projectUpdateMany.mock.calls.at(-1)?.[0] as {
      data?: { profile?: string };
    };
    const profile = JSON.parse(String(updateArg?.data?.profile || "{}")) as {
      suggestedNextMeeting?: { topic?: string; reason?: string };
    };
    expect(profile.suggestedNextMeeting?.topic).toContain("复盘");
    expect(profile.suggestedNextMeeting?.reason).toContain("偏离");

    const home = buildDashboardHome(
      makeBundle({
        project: makeProject({
          profile: {
            positioning: "轻快湘菜",
            suggestedNextMeeting: profile.suggestedNextMeeting,
          },
        }),
      }),
    );
    expect(home.pendingRedeision?.topic).toContain("复盘");
    expect(home.pendingRedeision?.href).toMatch(/confirm=1/);
    expect(home.pendingRedeision?.href).toMatch(/spend=growth/);
  });

  it("点不足错误应触发充值门闸文案识别", () => {
    expect(isWalletPaywallError("当前经营点不足，请先充值")).toBe(true);
    expect(isWalletPaywallError("PAYMENT_REQUIRED")).toBe(true);
    expect(isWalletPaywallError("引擎未就绪")).toBe(false);
  });
});

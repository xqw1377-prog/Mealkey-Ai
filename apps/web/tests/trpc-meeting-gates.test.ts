/**
 * createCaller 集成测：会议启动 / 会议确认决策的关键门禁
 * 重依赖用 mock，验证鉴权、证据门禁、扣费失败与成功写回路径。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const projectFindFirst = vi.fn();
  const projectUpdateMany = vi.fn();
  const projectFindUnique = vi.fn();
  const decisionCreate = vi.fn();
  const decisionFindFirst = vi.fn();
  const memoryCreate = vi.fn();
  const runFounderLoop = vi.fn();
  const persistFounderMemoryWrites = vi.fn();
  const loadFounderMemorySnapshot = vi.fn();
  const recallForDecision = vi.fn();
  const chargeBusinessPoints = vi.fn();
  const refundBusinessPoints = vi.fn();
  const completeValueArchive = vi.fn();
  const resolveSpendKind = vi.fn((args: { spendKind?: string }) => args.spendKind || "council");
  const createDecision = vi.fn();
  const persistFounderMemoryWritesArchive = vi.fn();
  const evaluateEngineMeetingGate = vi.fn();

  return {
    projectFindFirst,
    projectUpdateMany,
    projectFindUnique,
    decisionCreate,
    decisionFindFirst,
    memoryCreate,
    runFounderLoop,
    persistFounderMemoryWrites,
    loadFounderMemorySnapshot,
    recallForDecision,
    chargeBusinessPoints,
    refundBusinessPoints,
    completeValueArchive,
    resolveSpendKind,
    createDecision,
    persistFounderMemoryWritesArchive,
    evaluateEngineMeetingGate,
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
      create: (...args: unknown[]) => mocks.decisionCreate(...args),
      findFirst: (...args: unknown[]) => mocks.decisionFindFirst(...args),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    // ensure findMany always exists even if reassigned elsewhere
    memory: {
      create: (...args: unknown[]) => mocks.memoryCreate(...args),
      findMany: vi.fn().mockResolvedValue([]),
    },
    industryInsight: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    asset: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        project: {
          findFirst: (...args: unknown[]) => mocks.projectFindFirst(...args),
          updateMany: (...args: unknown[]) => mocks.projectUpdateMany(...args),
          findUnique: (...args: unknown[]) => mocks.projectFindUnique(...args),
        },
        decision: {
          findFirst: (...args: unknown[]) => mocks.decisionFindFirst(...args),
          update: vi.fn(),
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

vi.mock("@/server/founder-layer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/founder-layer")>();
  return {
    ...actual,
    runFounderLoop: (...args: unknown[]) => mocks.runFounderLoop(...args),
    persistFounderMemoryWrites: (...args: unknown[]) =>
      mocks.persistFounderMemoryWrites(...args),
    loadFounderMemorySnapshot: (...args: unknown[]) =>
      mocks.loadFounderMemorySnapshot(...args),
    recallForDecision: (...args: unknown[]) => mocks.recallForDecision(...args),
  };
});

vi.mock("@/server/services/business-points.service", () => ({
  chargeBusinessPoints: mocks.chargeBusinessPoints,
  refundBusinessPoints: mocks.refundBusinessPoints,
  completeValueArchive: mocks.completeValueArchive,
  resolveSpendKind: mocks.resolveSpendKind,
}));

vi.mock("@/server/services/engine-meeting-gate", () => ({
  evaluateEngineMeetingGate: (...args: unknown[]) =>
    mocks.evaluateEngineMeetingGate(...args),
  countDegradedOpinions: () => 0,
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

import { TRPCError } from "@trpc/server";
import { router } from "@/server/trpc";
import { founderRouter } from "@/server/routers/founder";
import { decisionArchiveRouter } from "@/server/routers/decision-archive";

const testRouter = router({
  founder: founderRouter,
  decisionArchive: decisionArchiveRouter,
});

function caller(ctx: { userId?: string; ownerId?: string }) {
  return testRouter.createCaller({
    userId: ctx.userId,
    ownerId: ctx.ownerId,
    headers: new Headers(),
  });
}

const PROJECT = {
  id: "proj_1",
  name: "测试湘菜",
  category: "湘菜",
  stage: "growth",
  profile: JSON.stringify({
    brandName: "测试湘菜",
    brands: [{ id: "brand_1", brandName: "测试湘菜" }],
    activeBrandId: "brand_1",
  }),
  ownerId: "owner_1",
  owner: { id: "owner_1" },
};

function makeDecision(agent: string, judgement: string) {
  return {
    decisionId: `d_${agent}`,
    sourceAgent: agent,
    judgement,
    confidence: 0.72,
    evidence: [
      {
        evidenceId: `E_${agent}`,
        content: "一手店访证据",
        label: "店访",
        source: "店访",
      },
    ],
    evidenceSufficient: true,
    nextSteps: ["本周验证"],
    risks: ["现金压力"],
    reasoning: "基于现有证据",
    assumptions: [],
    evidenceGap: [],
    validation: "30 天复盘",
    stance: "conditional" as const,
    metadata: { producedAt: new Date().toISOString() },
  };
}

function minimalRuntime() {
  return {
    mission: {
      missionId: "m1",
      mission: "是否扩张",
      question: "要不要扩张？",
      objective: "控制风险下增长",
      missionType: "expansion_review",
      requiredAgents: ["M-PNT", "M-MKT", "M-BIZ", "M-ED"],
    },
    decisions: [
      makeDecision("M-PNT", "先验证定位"),
      makeDecision("M-MKT", "市场窗口一般"),
      makeDecision("M-BIZ", "单店模型未稳"),
      makeDecision("M-ED", "股权先别急"),
    ],
    meeting: {
      conflicts: [],
      recommendation: "先单店验证",
      rounds: [],
      debateSession: {
        scenarioTests: [],
        challenges: [],
        conflicts: [],
      },
    },
    finalDecision: {
      chosen: "先验证再扩张",
      problem: "要不要扩张？",
      reason: ["现金约束"],
      validationPlan: ["30 天单店验证", "复盘后再谈扩张"],
    },
    memoryWrites: [],
    evidencePack: { nodes: [], relations: [] },
    validationTask: null,
    actionPlan: null,
    growthDelta: null,
    decisionPack: {
      packId: "pack1",
      chosen: "先验证再扩张",
      strategyDecision: "单店验证",
      summary: "先验证",
      evidenceStatus: "sufficient",
      risks: [],
      createdAt: new Date().toISOString(),
    },
  };
}

describe("createCaller · founder.startMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectFindFirst.mockResolvedValue(PROJECT);
    mocks.loadFounderMemorySnapshot.mockResolvedValue({
      preferences: [],
      patterns: [],
      decisions: [],
      insights: [],
      facts: [],
      priorBlock: "",
    });
    mocks.recallForDecision.mockResolvedValue({
      priorBlock: "",
      decisions: [],
      lessons: [],
      preferences: [],
      forbiddenReminders: [],
      topic: "扩张决策",
    });
    mocks.evaluateEngineMeetingGate.mockResolvedValue({
      ok: true,
      allowDegraded: true,
      requiredEngineIds: [],
      down: [],
      engines: [],
      note: null,
    });
    mocks.runFounderLoop.mockResolvedValue(minimalRuntime());
    mocks.persistFounderMemoryWrites.mockResolvedValue(undefined);
    mocks.completeValueArchive.mockResolvedValue(undefined);
    mocks.projectUpdateMany.mockResolvedValue({ count: 1 });
    mocks.projectFindUnique.mockResolvedValue({
      updatedAt: new Date(),
    });
  });

  it("未登录拒绝", async () => {
    const api = caller({});
    await expect(
      api.founder.startMeeting({
        projectId: "proj_1",
        question: "要不要扩张？",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("经营点不足返回 PAYMENT_REQUIRED", async () => {
    mocks.chargeBusinessPoints.mockRejectedValue(new Error("当前经营点不足，请前往 /billing 充值经营点"));
    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    try {
      await api.founder.startMeeting({
        projectId: "proj_1",
        question: "要不要扩张？",
        spendKind: "council",
      });
      expect.fail("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("PAYMENT_REQUIRED");
    }
  });

  it("扣费成功后返回 runtime 与 billing", async () => {
    mocks.chargeBusinessPoints.mockResolvedValue({
      points: 300,
      balanceAfter: 700,
      spendKind: "council",
    });
    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    const result = await api.founder.startMeeting({
      projectId: "proj_1",
      question: "要不要扩张？",
      topic: "扩张决策",
      spendKind: "council",
    });
    expect(result.runtime.finalDecision.chosen).toContain("验证");
    expect(result.billing).toEqual({
      spent: 300,
      balanceAfter: 700,
      spendKind: "council",
    });
    expect(mocks.runFounderLoop).toHaveBeenCalled();
    expect(mocks.chargeBusinessPoints).toHaveBeenCalled();
  });
});

describe("createCaller · decisionArchive.confirmFromMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectFindFirst.mockResolvedValue(PROJECT);
    mocks.projectUpdateMany.mockResolvedValue({ count: 1 });
    mocks.projectFindUnique.mockResolvedValue({ updatedAt: new Date() });
    mocks.decisionFindFirst.mockResolvedValue(null);
    mocks.createDecision.mockResolvedValue({
      id: "dec_cmtestid01",
      problem: "要不要扩张？",
      judgement: "先验证",
    });
    mocks.persistFounderMemoryWritesArchive.mockResolvedValue(undefined);
  });

  it("未登录拒绝", async () => {
    const api = caller({});
    await expect(
      api.decisionArchive.confirmFromMeeting({
        projectId: "proj_1",
        problem: "要不要扩张？",
        judgement: "先验证",
        allowInsufficientEvidence: true,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("证据不足且未放行时 BAD_REQUEST", async () => {
    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    await expect(
      api.decisionArchive.confirmFromMeeting({
        projectId: "proj_1",
        problem: "要不要扩张？",
        judgement: "先验证",
        evidenceSufficient: false,
        allowInsufficientEvidence: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createDecision).not.toHaveBeenCalled();
  });

  it("允许假设推进时写入决策并回写 profile", async () => {
    // findMany 已被 prisma mock 默认返回 []；显式再钉一次
    const { prisma } = await import("@/lib/prisma");
    (prisma.decision.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const api = caller({ userId: "user_1", ownerId: "owner_1" });
    const result = await api.decisionArchive.confirmFromMeeting({
      projectId: "proj_1",
      problem: "要不要扩张？",
      judgement: "先验证再扩张",
      confidence: 0.7,
      allowInsufficientEvidence: true,
      focusChoice: "验证优先",
    });
    expect(result).toMatchObject({
      decisionId: "dec_cmtestid01",
    });
    expect(mocks.createDecision).toHaveBeenCalled();
    expect(mocks.projectUpdateMany).toHaveBeenCalled();
  });
});

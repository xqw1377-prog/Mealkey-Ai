import { describe, expect, it } from "vitest";
import {
  mapToMkDecisionStatus,
  mapShorthandToMkStatus,
  mkStatusFromOutcome,
} from "@/server/founder-layer/capability/decision/status-map";
import {
  assertPrismaDecisionId,
  mergeMkStatusIntoOutcome,
  projectMkDecision,
  tryPrismaDecisionId,
} from "@/server/founder-layer/capability/decision/registry";

describe("mapToMkDecisionStatus", () => {
  it("映射主状态机同名", () => {
    expect(mapToMkDecisionStatus("APPROVED")).toBe("APPROVED");
    expect(mapToMkDecisionStatus("COUNCIL_REVIEW")).toBe("COUNCIL_REVIEW");
    expect(mapToMkDecisionStatus("LEARNED")).toBe("LEARNED");
  });

  it("映射 decision-v2 与 Final 旧枚举", () => {
    expect(mapToMkDecisionStatus("DEBATING")).toBe("ANALYSIS");
    expect(mapToMkDecisionStatus("READY_FOR_APPROVAL")).toBe("ANALYSIS");
    expect(mapToMkDecisionStatus("proposed")).toBe("ANALYSIS");
    expect(mapToMkDecisionStatus("accepted")).toBe("APPROVED");
    expect(mapToMkDecisionStatus("verified")).toBe("LEARNED");
    expect(mapToMkDecisionStatus("FAILED")).toBe("LEARNED");
  });

  it("映射 outcome.status 实践值", () => {
    expect(mapToMkDecisionStatus("hypothesis")).toBe("APPROVED");
    expect(mapToMkDecisionStatus("validating")).toBe("VALIDATING");
    expect(mapToMkDecisionStatus("executing")).toBe("EXECUTING");
    expect(mapToMkDecisionStatus("superseded")).toBe("ARCHIVED");
  });

  it("映射 UI 简写", () => {
    expect(mapShorthandToMkStatus("draft")).toBe("DRAFT");
    expect(mapShorthandToMkStatus("reviewing")).toBe("ANALYSIS");
    expect(mapShorthandToMkStatus("closed")).toBe("ARCHIVED");
    expect(mapToMkDecisionStatus("reviewing")).toBe("ANALYSIS");
  });

  it("未知值回退 fallback", () => {
    expect(mapToMkDecisionStatus("???", "DRAFT")).toBe("DRAFT");
    expect(mapToMkDecisionStatus(null, "APPROVED")).toBe("APPROVED");
  });
});

describe("mkStatusFromOutcome / merge", () => {
  it("优先读 mkStatus", () => {
    expect(
      mkStatusFromOutcome({ mkStatus: "LEARNED", status: "executing" }),
    ).toBe("LEARNED");
  });

  it("merge 写入 mkStatus 与 review", () => {
    const json = mergeMkStatusIntoOutcome(
      { status: "validating", foo: 1 },
      "APPROVED",
    );
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.mkStatus).toBe("APPROVED");
    expect(parsed.foo).toBe(1);
    expect(parsed.status).toBe("validating");
    expect(
      (parsed.review as { nextReviewAt?: string }).nextReviewAt,
    ).toBeTruthy();
  });
});

describe("assertPrismaDecisionId", () => {
  it("接受正常 id", () => {
    expect(assertPrismaDecisionId("clxyz0123456789")).toBe("clxyz0123456789");
  });

  it("拒绝 packId / 合约临时 id / buildId 短码", () => {
    expect(() => assertPrismaDecisionId("dp-abc")).toThrow(/禁止/);
    expect(() => assertPrismaDecisionId("D-12345")).toThrow(/禁止/);
    expect(() => assertPrismaDecisionId("pack_x")).toThrow(/禁止/);
    expect(() => assertPrismaDecisionId("dec_a1b2c3d4")).toThrow(/禁止/);
  });
});

describe("tryPrismaDecisionId / LEARNED merge", () => {
  it("tryPrismaDecisionId 过滤非法 id", () => {
    expect(tryPrismaDecisionId("clmkdecision01testid")).toBe(
      "clmkdecision01testid",
    );
    expect(tryPrismaDecisionId("dp-xxx")).toBeNull();
    expect(tryPrismaDecisionId("dec_abcd1234")).toBeNull();
  });

  it("merge 可写入 LEARNED", () => {
    const json = mergeMkStatusIntoOutcome(
      { status: "validating", mkStatus: "VALIDATING" },
      "LEARNED",
      { impact: "confirmed", lesson: "假设成立" },
    );
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.mkStatus).toBe("LEARNED");
    expect(parsed.lesson).toBe("假设成立");
  });
});

describe("projectMkDecision", () => {
  it("从 Prisma 行投影", () => {
    const mk = projectMkDecision({
      id: "dec_cuid_example01",
      ownerId: "own_1",
      projectId: "proj_1",
      problem: "要不要开第二家店",
      observation: "客流稳定",
      diagnosis: "模型可复制",
      judgement: "先开一家验证店",
      strategy: "社区店模型",
      action: "30天验证",
      confidence: 0.8,
      evidence: JSON.stringify([
        { source: "market", content: "搜索增长", relevance: 0.9, type: "market" },
      ]),
      outcome: JSON.stringify({
        mkStatus: "APPROVED",
        status: "validating",
        hypothesis: "年轻客群愿意支付25元",
        validationTask: { id: "vt_1" },
      }),
      learning: null,
      agentId: "m-biz",
      type: "meeting",
      createdAt: new Date("2026-07-17T00:00:00.000Z"),
      updatedAt: new Date("2026-07-17T00:00:00.000Z"),
    });
    expect(mk.id).toBe("dec_cuid_example01");
    expect(mk.status).toBe("APPROVED");
    expect(mk.conclusion).toContain("验证店");
    expect(mk.evidence[0]?.type).toBe("market");
    expect(mk.links.validationTaskIds).toContain("vt_1");
    expect(mk.source.type).toBe("founder");
  });
});

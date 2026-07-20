/**
 * 外呼降级 — m-biz 不健康时不得标 engineLive
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/m-biz-client", () => ({
  checkMBizHealth: vi.fn(async () => false),
  mbizScan: vi.fn(),
  mbizDegradedResponse: vi.fn((message: string) => ({
    session_id: "deg",
    status: "degraded",
    current_layer: "L1",
    reply: `降级：${message}`,
    pending_questions: [],
    fact_nodes: [],
    dimension_scores: {},
    rule_judgments: [],
    suggestions: [],
    verification_tasks: [],
    progress: {},
  })),
  normalizeBizIndustry: (v?: string) => v || "餐饮",
  normalizeBizStage: (v?: string) => v || "筹备期",
}));

vi.mock("@/server/services/m-mkt.service", () => ({
  previewMMktSnapshot: vi.fn(),
}));

vi.mock("@/server/services/m-ed.service", () => ({
  previewMEdSnapshot: vi.fn(),
}));

import { loadBizConsultingBundle } from "@/server/services/agent-consulting-engines";

describe("loadBizConsultingBundle degradation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks heuristic + degradationNote when health check fails", async () => {
    const result = await loadBizConsultingBundle(
      { stage: "成长期", pain: "毛利被活动线吞噬" },
      { projectId: "p1", name: "测试店", city: "成都", category: "餐饮" },
    );
    expect(result.engineLive).toBe(false);
    expect(result.research.collectionMode).toBe("heuristic");
    expect(result.degradationNote || result.research.degradationNote).toMatch(
      /降级/,
    );
  });
});

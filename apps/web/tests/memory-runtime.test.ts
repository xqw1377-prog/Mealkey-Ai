import { describe, expect, it } from "vitest";
import type { FounderMemoryWrite } from "@/server/founder-layer/contracts/memory";
import {
  resolveMemoryItemLogicalType,
  resolveMemoryLayer,
  resolveMemoryValueLevel,
  stampMemoryLayer,
  stampMemoryLayers,
} from "@/server/founder-layer/contracts/memory-runtime";
import { buildLearningMemoryWrite } from "@/server/founder-layer/memory/engine";
import { buildForbiddenReminders } from "@/server/founder-layer/memory/reminders";
import { attachMemoryLinks } from "@/server/founder-layer/memory/links";

describe("resolveMemoryLayer", () => {
  it("公司事实 → COMPANY", () => {
    expect(
      resolveMemoryLayer({
        type: "fact",
        payload: { kind: "company_facts" },
      }),
    ).toBe("COMPANY");
  });

  it("决策 / 会议 / 学习 → PROJECT", () => {
    expect(resolveMemoryLayer({ type: "decision" })).toBe("PROJECT");
    expect(resolveMemoryLayer({ type: "meeting" })).toBe("PROJECT");
    expect(resolveMemoryLayer({ type: "learning" })).toBe("PROJECT");
  });

  it("偏好 → FOUNDER", () => {
    expect(resolveMemoryLayer({ type: "preference" })).toBe("FOUNDER");
  });

  it("行业规律 kind → INDUSTRY", () => {
    expect(
      resolveMemoryLayer({
        type: "learning",
        payload: { kind: "industry_rule" },
      }),
    ).toBe("INDUSTRY");
  });

  it("显式 memoryLayer 覆盖", () => {
    expect(
      resolveMemoryLayer({
        type: "learning",
        memoryLayer: "FOUNDER",
      }),
    ).toBe("FOUNDER");
  });
});

describe("resolveMemoryValueLevel", () => {
  it("事实 / 偏好 = Level 1；决策 / 学习默认 = Level 2", () => {
    expect(resolveMemoryValueLevel({ type: "fact" })).toBe(1);
    expect(resolveMemoryValueLevel({ type: "preference" })).toBe(1);
    expect(resolveMemoryValueLevel({ type: "decision" })).toBe(2);
    expect(resolveMemoryValueLevel({ type: "learning" })).toBe(2);
  });

  it("显式 Level 3 可写入", () => {
    expect(
      resolveMemoryValueLevel({
        type: "learning",
        valueLevel: 3,
      }),
    ).toBe(3);
  });
});

describe("stampMemoryLayer", () => {
  it("盖章后 payload.memoryLayer 与顶层一致", () => {
    const write: FounderMemoryWrite = {
      writeId: "mw_test",
      projectId: "proj_1",
      type: "decision",
      summary: "测试决策",
      payload: { chosen: "年轻化湘菜" },
      source: "decision_engine",
      createdAt: new Date().toISOString(),
    };
    const stamped = stampMemoryLayer(write);
    expect(stamped.memoryLayer).toBe("PROJECT");
    expect(stamped.payload.memoryLayer).toBe("PROJECT");
    expect(stamped.valueLevel).toBe(2);
    expect(stamped.payload.valueLevel).toBe(2);
  });

  it("approve/learned 路径：learning write 带 PROJECT layer", () => {
    const learned = buildLearningMemoryWrite({
      projectId: "proj_1",
      decisionId: "clxyz0123456789abcdef",
      summary: "验证证伪：客群不匹配",
      impact: "invalidated",
    });
    expect(learned.memoryLayer).toBe("PROJECT");
    expect(learned.payload.memoryLayer).toBe("PROJECT");
    expect(learned.type).toBe("learning");
  });

  it("stampMemoryLayers 批量盖章", () => {
    const out = stampMemoryLayers([
      {
        writeId: "a",
        projectId: "p",
        type: "preference",
        summary: "偏好",
        payload: { label: "节奏", value: "快" },
        source: "user_feedback",
        createdAt: new Date().toISOString(),
      },
      {
        writeId: "b",
        projectId: "p",
        type: "fact",
        summary: "企业",
        payload: { kind: "company_facts" },
        source: "company_context",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(out[0].memoryLayer).toBe("FOUNDER");
    expect(out[1].memoryLayer).toBe("COMPANY");
  });
});

describe("resolveMemoryItemLogicalType", () => {
  it("decision → DECISION；learning → LESSON", () => {
    expect(resolveMemoryItemLogicalType("decision", "PROJECT")).toBe(
      "DECISION",
    );
    expect(resolveMemoryItemLogicalType("learning", "PROJECT")).toBe("LESSON");
    expect(resolveMemoryItemLogicalType("fact", "COMPANY")).toBe("COMPANY");
  });
});

describe("Memory M3 reminders / M4 links", () => {
  it("失败 pattern 生成禁区提醒", () => {
    const reminders = buildForbiddenReminders(
      {
        facts: [],
        decisions: [],
        preferences: [],
        patterns: [
          {
            patternId: "p1",
            kind: "failure",
            summary: "不要进高租金购物中心——失败两次",
            createdAt: new Date().toISOString(),
          },
        ],
        priorBlock: "",
      },
      "要不要进商场",
    );
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0]).toMatch(/高租金|禁区|失败/);
  });

  it("attachMemoryLinks 写入 payload.links", () => {
    const write = attachMemoryLinks(
      {
        writeId: "mw1",
        projectId: "p",
        type: "learning",
        summary: "失败教训",
        payload: {},
        source: "validation_os",
        createdAt: new Date().toISOString(),
      },
      [{ fromMemory: "fail_1", toMemory: "rule_1", relation: "caused" }],
    );
    expect(Array.isArray(write.payload.links)).toBe(true);
    expect((write.payload.links as unknown[]).length).toBe(1);
    expect(write.payload.memoryLayer).toBe("PROJECT");
  });
});

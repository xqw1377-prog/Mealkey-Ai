import { describe, expect, it } from "vitest";
import {
  buildMicroSlotsForWeakBasics,
  evaluateDialogueBasicsReady,
  parseDialogueUtterance,
} from "@mealkey/agents/consulting-os";

describe("parseDialogueUtterance / basicsReady", () => {
  it("标签口述：品牌叫 / 品类是 / 主战场 → 抽出三字段", () => {
    const parsed = parseDialogueUtterance({
      agent: "m-pnt",
      turnId: "who",
      utterance: "品牌叫味本源，品类是鲜椒烤鱼，主战场在成都高新",
    });

    expect(parsed.values.brandName).toMatch(/味本源/);
    expect(parsed.values.category).toMatch(/鲜椒烤鱼/);
    expect(parsed.values.region).toMatch(/成都高新/);
    expect(parsed.unresolved).toEqual([]);
  });

  it("色卡「已记」但 basics 弱 → 未 ready，并产出微追问", () => {
    const weakBasics = {
      brandName: "好吃",
      category: "餐饮",
      region: "那边",
    };
    const gate = evaluateDialogueBasicsReady("m-pnt", weakBasics);
    expect(gate.ready).toBe(false);
    expect(gate.weakKeys.length).toBeGreaterThan(0);

    const slots = buildMicroSlotsForWeakBasics("m-pnt", weakBasics);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.keys.includes("brandName"))).toBe(true);
  });

  it("齐全有用 basics → ready，无微追问", () => {
    const basics = {
      brandName: "味本源",
      category: "鲜椒烤鱼",
      region: "成都高新",
      storeScale: "直营 2 家",
      annualRevenue: "单店月均 40 万",
      avgTicket: "人均 90",
      currentPositioning: "适合聚会的鲜椒烤鱼",
      competitors: "探鱼、炉鱼",
      advantages: "鲜椒配方难抄",
      slogan: "暂无",
      businessGoal: "先把心智说清楚",
      mainPain: "好吃但客人记不住牌子",
    };
    const gate = evaluateDialogueBasicsReady("m-pnt", basics);
    expect(gate.ready).toBe(true);
    expect(buildMicroSlotsForWeakBasics("m-pnt", basics)).toEqual([]);
  });
});

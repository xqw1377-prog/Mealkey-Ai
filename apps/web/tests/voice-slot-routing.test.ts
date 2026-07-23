import { describe, expect, it } from "vitest";
import {
  latestVoiceUtterance,
  matchChoiceFromVoice,
  routeVoiceToSlots,
} from "@/server/founder-layer/goal-compiler/voice-slot-routing";

describe("voice-slot-routing", () => {
  it("取出最新一句转写", () => {
    expect(latestVoiceUtterance("旧内容\n开在杭州")).toBe("开在杭州");
  });

  it("语音匹配选择题", () => {
    const opts = [
      { label: "单店盈利优先", value: "single_profit" },
      { label: "为连锁打样", value: "chain_pilot" },
    ];
    expect(matchChoiceFromVoice("我想单店盈利优先", opts)).toBe("single_profit");
    expect(matchChoiceFromVoice("为连锁打样", opts)).toBe("chain_pilot");
  });

  it("路由：选项 → choice", () => {
    const choiceBySlot = new Map([
      [
        "focus",
        [
          { label: "单店盈利优先", value: "single_profit" },
          { label: "为连锁打样", value: "chain_pilot" },
        ],
      ],
    ]);
    const r = routeVoiceToSlots({
      utterance: "单店盈利优先",
      questions: [
        { slot: "focus", prompt: "单店还是扩张？" },
        { slot: "city", prompt: "城市？" },
      ],
      choiceBySlot,
      slotDrafts: {},
    });
    expect(r).toEqual({
      kind: "choice",
      slot: "focus",
      value: "single_profit",
    });
  });

  it("路由：填空槽并判断是否齐", () => {
    const choiceBySlot = new Map();
    const r1 = routeVoiceToSlots({
      utterance: "杭州",
      questions: [
        { slot: "city", prompt: "城市？" },
        { slot: "budget", prompt: "预算？" },
      ],
      choiceBySlot,
      slotDrafts: {},
    });
    expect(r1.kind).toBe("fill_slot");
    if (r1.kind === "fill_slot") {
      expect(r1.slot).toBe("city");
      expect(r1.allTextFilled).toBe(false);
    }

    const r2 = routeVoiceToSlots({
      utterance: "大概八十万",
      questions: [
        { slot: "city", prompt: "城市？" },
        { slot: "budget", prompt: "预算？" },
      ],
      choiceBySlot,
      slotDrafts: { city: "杭州" },
    });
    expect(r2.kind).toBe("fill_slot");
    if (r2.kind === "fill_slot") {
      expect(r2.slot).toBe("budget");
      expect(r2.allTextFilled).toBe(true);
    }
  });

  it("路由：preferSlot 优先填色卡当前题", () => {
    const r = routeVoiceToSlots({
      utterance: "八十万左右",
      questions: [
        { slot: "city", prompt: "城市？" },
        { slot: "budget", prompt: "预算？" },
      ],
      choiceBySlot: new Map(),
      slotDrafts: {},
      preferSlot: "budget",
    });
    expect(r.kind).toBe("fill_slot");
    if (r.kind === "fill_slot") {
      expect(r.slot).toBe("budget");
      expect(r.allTextFilled).toBe(false);
    }
  });
});

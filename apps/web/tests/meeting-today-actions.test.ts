import { describe, expect, it } from "vitest";
import {
  buildTodayActionsFromMeetingConfirm,
  resolveNextActionsForOption,
  toggleTodayActionStatus,
} from "@/lib/meeting-today-actions";

describe("meeting-today-actions", () => {
  it("选方案时不把 summary 压成唯一动作", () => {
    const actions = resolveNextActionsForOption(
      {
        id: "A",
        label: "方案A · 边界试点",
        summary: "设定边界试点推进，90天验证后决定是否加速",
        tradeoff: "规模效应来得慢",
      },
      { validationPlan: "90天看翻台率" },
    );
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions.every((a) => a !== "设定边界试点推进，90天验证后决定是否加速")).toBe(
      true,
    );
    expect(actions[0]).toContain("边界试点");
    expect(actions.some((a) => a.includes("规模效应"))).toBe(true);
  });

  it("保留已有多条 nextActions，剔除与 summary 相同的伪动作", () => {
    const summary = "先冻结定位";
    const actions = resolveNextActionsForOption(
      { label: "方案A · 锐化定位", summary, tradeoff: "短期销量承压" },
      {
        nextActions: [summary, "墙卡上墙培训店员", "本周神秘客抽检一次"],
        validationPlan: "认知验证",
      },
    );
    expect(actions).toEqual(["墙卡上墙培训店员", "本周神秘客抽检一次"]);
  });

  it("写入今日三动作恰好 3 条，并剔除判断句冒充", () => {
    const plan = buildTodayActionsFromMeetingConfirm({
      judgement: "先验证再扩张",
      nextActions: ["先验证再扩张", "店长盯晚市翻台", "周五复盘"],
      action: "先验证再扩张",
    });
    expect(plan).toHaveLength(3);
    expect(plan.every((a) => a.status === "planned")).toBe(true);
    expect(plan.some((a) => a.title === "先验证再扩张")).toBe(false);
    expect(plan[0]?.title).toContain("翻台");
  });

  it("toggle 在 planned 与 done 间切换", () => {
    expect(toggleTodayActionStatus("planned")).toBe("done");
    expect(toggleTodayActionStatus("done")).toBe("planned");
  });
});

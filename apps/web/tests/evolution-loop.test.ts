import { describe, expect, it } from "vitest";
import {
  appendEvolutionEvent,
  emptyEvolutionLoop,
  readEvolutionLoop,
  recordCompileEvolution,
  recordSkillEvolution,
  resolveDispatchLane,
  writeEvolutionLoopIntoProfile,
} from "@/server/founder-layer/evolution-loop";
import { resolveDrillFromUtterance } from "@/server/founder-layer/skill-engine";
import { DEFAULT_MEMORY_PERMISSIONS } from "@/server/founder-layer/contracts/intelligence-profile";

describe("Learning & Evolution Loop V1", () => {
  it("薄调度：陪练 → skill", () => {
    const d = resolveDispatchLane({ utterance: "练习一下店长营业额诊断" });
    expect(d.lane).toBe("skill");
  });

  it("薄调度：战略语义 → council", () => {
    const d = resolveDispatchLane({ utterance: "要不要开第二家店，股权怎么分" });
    expect(d.lane).toBe("council");
  });

  it("薄调度：默认经营问题 → business_capability", () => {
    const d = resolveDispatchLane({ utterance: "最近客单掉了，怎么调菜单" });
    expect(d.lane).toBe("business_capability");
    expect(d.scenarioKey).toBe("menu_optimize");
  });

  it("薄调度：复盘 → reflect", () => {
    const d = resolveDispatchLane({ utterance: "上次建议复盘一下有没有好转" });
    expect(d.lane).toBe("reflect");
  });

  it("店长话术解析到店长营业额剧本", () => {
    const drill = resolveDrillFromUtterance("练习一下店长营业额诊断");
    expect(drill.id).toBe("manager.revenue_diagnosis_v1");
    expect(drill.role).toBe("manager");
  });

  it("陪练评价写入 Evolution Event", () => {
    const profile = {
      memoryPermissions: { ...DEFAULT_MEMORY_PERMISSIONS },
    };
    const next = recordSkillEvolution(profile, {
      role: "manager",
      drillId: "manager.revenue_diagnosis_v1",
      skillKey: "ops.revenue_diagnosis",
      score: 78,
      lesson: "先拆客流客单再定排班动作",
    });
    const loop = readEvolutionLoop(next);
    expect(loop.aggregate.skillDrillCount).toBe(1);
    expect(loop.events[0]?.dispatchLane).toBe("skill");
    expect(loop.aggregate.recentLessons[0]).toMatch(/客流/);
  });

  it("编译写入 Evolution Event", () => {
    const profile = {
      memoryPermissions: { ...DEFAULT_MEMORY_PERMISSIONS },
    };
    const next = recordCompileEvolution(profile, {
      utterance: "生意不好，帮我看看",
      goalTitle: "经营问题框定",
      assetCount: 1,
    });
    const loop = readEvolutionLoop(next);
    expect(loop.aggregate.compileCount).toBe(1);
    expect(loop.events[0]?.source).toBe("goal_compile");
  });

  it("permission 关闭时不写入", () => {
    const profile = {
      memoryPermissions: {
        saveExperience: false,
        useForPersonalGrowth: false,
        contributeToIndustryModel: false,
      },
    };
    const next = recordSkillEvolution(profile, {
      role: "owner",
      drillId: "owner.revenue_diagnosis_v1",
      score: 90,
      lesson: "不应写入",
    });
    expect(readEvolutionLoop(next).events).toHaveLength(0);
  });

  it("事件环截断", () => {
    let store = emptyEvolutionLoop();
    for (let i = 0; i < 85; i++) {
      store = appendEvolutionEvent(store, {
        eventId: `e${i}`,
        at: new Date().toISOString(),
        source: "goal_compile",
        rolePerspective: "owner",
        scenarioKey: "general_operating",
        dispatchLane: "business_capability",
        outcomeHint: "unknown",
        permissionOk: true,
      });
    }
    expect(store.events.length).toBeLessThanOrEqual(80);
    const profile = writeEvolutionLoopIntoProfile({}, store);
    expect(readEvolutionLoop(profile).aggregate.totalEvents).toBe(80);
  });
});

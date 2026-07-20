/**
 * 咨询「下一步」单一路径
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  createBrandProject,
  resolveConsultingNextStep,
  writePositioningContract,
  type PositioningContract,
  type PositioningStatement,
} from "../../../packages/agents/src/m-pnt/consulting";

const statement: PositioningStatement = {
  forAudience: "家庭",
  whoNeed: "干净可预期",
  ourBrandIs: "家庭湘菜",
  thatValue: "干净可预期",
  because: "供应链",
  unlike: "传统馆",
};

function baseContract(
  status: PositioningContract["status"],
  rehearsal?: "passed" | "failed",
): PositioningContract {
  return {
    contractId: "c1",
    version: 1,
    status,
    statement,
    strategicChoice: "不跟宴请硬碰，先打家庭场景。",
    supportingEvidence: [],
    rejectedAlternatives: [],
    prerequisites: {
      categoryDone: true,
      consumerDone: true,
      competitiveDone: true,
    },
    rehearsal: rehearsal
      ? {
          status: rehearsal,
          founderRetell: "x".repeat(50),
          checklist: {
            canSayInOneBreath: true,
            staffCanRepeat: true,
            productProvesBecause: true,
            unlikeIsClear: true,
          },
          matchedFields: [
            "forAudience",
            "whoNeed",
            "ourBrandIs",
            "thatValue",
          ],
          missingFields: [],
          score: 80,
          feedback: "ok",
          testedAt: new Date().toISOString(),
        }
      : undefined,
  };
}

describe("resolveConsultingNextStep", () => {
  it("discovery asks for two picks", () => {
    const p = createBrandProject("p1");
    const step = resolveConsultingNextStep(p);
    expect(step.actionId).toBe("discovery.complete");
  });

  it("validation: express then confirm", () => {
    let p = createBrandProject("p2");
    p = {
      ...p,
      stage: BrandProjectStage.POSITION_VALIDATION,
    };
    p = writePositioningContract(p, baseContract("proposed"));
    // 当前 engine 对 POSITION_VALIDATION 返回 express（一键模式）
    expect(resolveConsultingNextStep(p).actionId).toBe("validation.express");

    p = writePositioningContract(p, baseContract("proposed", "passed"));
    expect(resolveConsultingNextStep(p).actionId).toBe("validation.express");
    expect(resolveConsultingNextStep(p).ctaLabel).toContain("对齐话术");
  });

  it("final: confirm system before sign", () => {
    let p = createBrandProject("p3");
    p = {
      ...p,
      stage: BrandProjectStage.FINAL_STRATEGY,
      assets: {
        ...p.assets,
        positioningContract: baseContract("validated", "passed"),
        brandSystem: {
          artifactId: "bs1",
          status: "draft",
          version: 1,
          valueProposition: "干净可预期",
          communicationLine: "给家庭的干净可预期",
          forbiddenPhrases: ["高品质"],
          productMappings: [
            { productOrLine: "招牌", provesBecause: "供应链" },
          ],
        },
      },
    };
    const step = resolveConsultingNextStep(p);
    expect(step.actionId).toBe("final.confirmSystem");
    expect(step.stepLabel).toContain("1/3");
  });
});

import type { MKContext } from "@mealkey/agent-sdk";
import type { MatrixInputPackage, PositionCandidate } from "./types";
import { asList } from "../capabilities/_shared";

/**
 * 从 MKContext + 前序步骤构建三理论共享 Input Package。
 * 事实字段只读，理论 Agent 不得改写。
 */
export function buildMatrixInputPackage(
  context: MKContext,
  opts: {
    previousSummary?: string;
    candidates?: PositionCandidate[];
  } = {},
): MatrixInputPackage {
  const category = String(context.project.category || "餐饮").trim() || "餐饮";
  const city = context.project.city || "目标城市";
  const strengths = asList(context.owner.strengths as string[] | string);
  const weaknesses = asList(context.owner.weaknesses as string[] | string);
  const strengthHint = strengths[0] || "可被感知的独特供给";

  const candidates: PositionCandidate[] =
    opts.candidates && opts.candidates.length > 0
      ? opts.candidates
      : [
          {
            id: "A",
            name: `${city}${category}·场景钉死型`,
            oneLiner: `成为「${city}某个高频场景里，第一个被想起的${category}」`,
            type: "稳健型",
            focus: "场景第一",
          },
          {
            id: "B",
            name: `${category}·对立区隔型`,
            oneLiner: `不做大而全，只打一个锋利对立点（相对主流玩家）`,
            type: "进攻型",
            focus: "竞争区隔",
          },
          {
            id: "C",
            name: `${category}·优势放大型`,
            oneLiner: `把经营者优势「${strengthHint}」做成不可替代的心智资产`,
            type: "备选/资源匹配",
            focus: "资源可交付",
          },
        ];

  return {
    project: {
      name: context.project.name,
      category: context.project.category ?? undefined,
      city: context.project.city ?? undefined,
      district: context.project.district ?? undefined,
      stage: context.project.stage,
      budget: context.project.budget,
    },
    owner: {
      experience: context.owner.experience,
      strengths,
      weaknesses,
    },
    previousSummary: opts.previousSummary,
    candidates,
    constraints: [
      "不得改写 Input Package 事实字段",
      "只输出本视角 Theory View",
      "禁止输出 decision_recommend（primary/secondary）",
      "风险仅用 R1–R4",
    ],
  };
}

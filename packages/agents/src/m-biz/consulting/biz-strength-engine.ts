/**
 * M-BIZ 商业模式成熟度评分引擎
 *
 * 对标 M-PNT brand-strength-engine.ts。
 * 评估商业模式就绪度：
 * - 单位经济清晰度
 * - 利润结构健康度
 * - 复制可行性
 * - 财务数据完整性
 */

import type { AgentConsultingProject } from "../../consulting-os/types";
import type { BizEvidenceLedger } from "./biz-evidence-ledger";
import { bizEvidenceCoverage, bizFactStrengthBoost, isVerifiedBizFact } from "./biz-evidence-ledger";

export interface BizStrengthScore {
  overall: number; grade: "A" | "B" | "C" | "D";
  dimensions: {
    unitEconomics: number; profitHealth: number; replicationReadiness: number; dataIntegrity: number;
  };
  gaps: string[]; readyForCouncil: boolean;
}

function computeUnitEconomics(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const research = project.assets.research;
  const gaps: string[] = [];
  let score = 10;
  if (research?.sections?.some((s) => /单位经济|UE|毛利/.test(s.title))) score += 25; else gaps.push("缺少单位经济分析");
  if (research?.sections?.some((s) => /营收|收入|客单/.test(s.title))) score += 20; else gaps.push("缺少收入/客单价数据");
  if (research?.sections?.some((s) => /成本|食材|人工/.test(s.title))) score += 20; else gaps.push("缺少成本结构分析");
  if (research?.headline) score += 15; else gaps.push("缺少调研结论");
  return { score: Math.min(100, score), gaps };
}

function computeProfitHealth(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const contract = project.assets.modeContract;
  const advisors = project.assets.advisors;
  const gaps: string[] = [];
  let score = 10;
  if (contract?.northStar) { score += 25; } else { gaps.push("未定义 90 天主航道"); }
  if (contract?.tradeoffAccepted) { score += 20; } else { gaps.push("未明确取舍"); }
  if (contract?.killCriteria?.length) { score += 20; } else { gaps.push("缺少杀出线"); }
  if (contract?.whatWeWontDo?.length) { score += 15; } else { gaps.push("未列出不做事项"); }
  if (advisors?.strategies?.some((s) => s.modeScheme?.scorecard?.length)) score += 10;
  else gaps.push("缺少方案评分卡");
  return { score: Math.min(100, score), gaps };
}

function computeReplicationReadiness(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const roadmap = project.assets.executionRoadmap;
  const gaps: string[] = [];
  let score = 10;
  if (roadmap?.milestones?.length) { score += 25; } else { gaps.push("缺少执行路径"); }
  if (roadmap?.modePack?.oneLiner) { score += 20; } else { gaps.push("缺少模式作战卡"); }
  if (roadmap?.modePack?.killLine) { score += 20; } else { gaps.push("作战卡缺少杀出线"); }
  if (roadmap?.milestones?.some((m) => m.actions?.length)) score += 15; else gaps.push("执行节点缺少具体动作");
  if (roadmap?.status === "accepted") score += 10; else gaps.push("执行路径未确认");
  return { score: Math.min(100, score), gaps };
}

function computeDataIntegrity(project: AgentConsultingProject, ledger?: BizEvidenceLedger): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  if (!ledger?.facts?.length) return { score: 0, gaps: ["商业模式证据账本为空"] };
  const verified = ledger.facts.filter(isVerifiedBizFact);
  if (verified.length === 0) gaps.push("无已核实证据");
  const coverage = bizEvidenceCoverage(ledger);
  if (!coverage.ok) gaps.push(...coverage.missing);
  const boost = bizFactStrengthBoost(verified);
  return { score: Math.min(100, verified.length * 10 + boost), gaps };
}

export function computeBizStrength(
  project: AgentConsultingProject, ledger?: BizEvidenceLedger,
): BizStrengthScore {
  const ue = computeUnitEconomics(project);
  const profit = computeProfitHealth(project);
  const repl = computeReplicationReadiness(project);
  const data = computeDataIntegrity(project, ledger);
  const overall = Math.round(ue.score * 0.30 + profit.score * 0.30 + repl.score * 0.25 + data.score * 0.15);
  const grade: BizStrengthScore["grade"] = overall >= 80 ? "A" : overall >= 60 ? "B" : overall >= 40 ? "C" : "D";
  return {
    overall, grade,
    dimensions: { unitEconomics: ue.score, profitHealth: profit.score, replicationReadiness: repl.score, dataIntegrity: data.score },
    gaps: [...ue.gaps, ...profit.gaps, ...repl.gaps, ...data.gaps].slice(0, 8),
    readyForCouncil: overall >= 55 && ue.score >= 40,
  };
}

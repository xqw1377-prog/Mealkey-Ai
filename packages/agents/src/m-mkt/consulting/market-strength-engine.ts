/**
 * M-MKT 市场情报完整度评分引擎
 *
 * 对标 M-PNT brand-strength-engine.ts。
 * 评估市场进入决策的就绪度：
 * - 市场扫描完整度
 * - 竞争情报深度
 * - 用户证据密度
 * - 进入方案成熟度
 */

import type { AgentConsultingProject } from "../../consulting-os/types";
import type { MarketEvidenceLedger } from "./market-evidence-ledger";
import { marketEvidenceCoverage, marketFactStrengthBoost, isVerifiedMarketFact } from "./market-evidence-ledger";

export interface MarketStrengthScore {
  overall: number;         // 0-100
  grade: "A" | "B" | "C" | "D";
  dimensions: {
    marketScan: number;          // 市场扫描完整度
    competitorDepth: number;     // 竞争情报深度
    userEvidence: number;        // 用户证据密度
    entryMaturity: number;       // 进入方案成熟度
  };
  gaps: string[];
  readyForCouncil: boolean;
}

function computeMarketScan(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const research = project.assets.research;
  const gaps: string[] = [];
  let score = 10;
  if (research?.headline) { score += 20; } else { gaps.push("缺少市场扫描结论"); }
  if (research?.sections?.length) { score += 20; } else { gaps.push("缺少市场扫描章节"); }
  if (research?.sections?.some((s) => /规模|增长|趋势/.test(s.title))) score += 15;
  else gaps.push("缺少市场规模/增长分析");
  if (research?.scope?.city) score += 15; else gaps.push("未明确目标城市");
  if (research?.scope?.category) score += 10; else gaps.push("未明确品类");
  if (research?.collectionMode !== "heuristic") score += 10;
  else gaps.push("调研为启发式模式");
  return { score: Math.min(100, score), gaps };
}

function computeCompetitorDepth(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const research = project.assets.research;
  const gaps: string[] = [];
  let score = 0;
  const briefs = research?.competitorBriefs || [];
  if (briefs.length > 0) { score += 30; } else { gaps.push("缺少竞品扫描"); }
  if (briefs.length >= 3) score += 20; else gaps.push("竞品覆盖不足 3 家");
  if (briefs.some((b) => b.play.length > 10)) score += 25; else gaps.push("竞品打法描述不够具体");
  if (briefs.some((b) => b.threat.length > 5)) score += 25; else gaps.push("缺少竞品威胁评估");
  return { score: Math.min(100, score), gaps };
}

function computeUserEvidence(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const advisors = project.assets.advisors;
  const gaps: string[] = [];
  let score = 10;
  const strategies = advisors?.strategies || [];
  if (strategies.some((s) => s.entryScheme?.sceneCut)) score += 25;
  else gaps.push("缺少场景切口定义");
  if (strategies.some((s) => s.entryScheme?.menuPilot?.length)) score += 25;
  else gaps.push("缺少菜单/产品试点方案");
  if (strategies.some((s) => s.differentiation)) score += 20;
  else gaps.push("缺少差异化主张");
  if (project.assets.warRoom?.consensusOneLiner) score += 20;
  else gaps.push("战略会议室未收敛");
  return { score: Math.min(100, score), gaps };
}

function computeEntryMaturity(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const contract = project.assets.entryContract;
  const gaps: string[] = [];
  let score = 10;
  if (contract?.entryMode) { score += 20; } else { gaps.push("未明确进入方式"); }
  if (contract?.killCriteria?.length) { score += 20; } else { gaps.push("缺少杀出线"); }
  if (contract?.mondayMoves?.length) { score += 15; } else { gaps.push("缺少本周动作"); }
  if (contract?.whatWeWontDo?.length) { score += 15; } else { gaps.push("未列出不做事项"); }
  if (contract?.status === "frozen") { score += 20; } else { gaps.push("进入合同尚未冻结"); }
  return { score: Math.min(100, score), gaps };
}

export function computeMarketStrength(
  project: AgentConsultingProject,
  ledger?: MarketEvidenceLedger,
): MarketStrengthScore {
  const scan = computeMarketScan(project);
  const comp = computeCompetitorDepth(project);
  const user = computeUserEvidence(project);
  const entry = computeEntryMaturity(project);
  const evidence = ledger?.facts?.length
    ? { score: Math.min(100, ledger.facts.filter(isVerifiedMarketFact).length * 10 + marketFactStrengthBoost(ledger.facts)), gaps: [] as string[] }
    : { score: 0, gaps: ["市场证据账本为空"] };

  const overall = Math.round(
    scan.score * 0.25 + comp.score * 0.25 + user.score * 0.25 + entry.score * 0.15 + evidence.score * 0.10,
  );

  const grade: MarketStrengthScore["grade"] = overall >= 80 ? "A" : overall >= 60 ? "B" : overall >= 40 ? "C" : "D";

  return {
    overall, grade,
    dimensions: {
      marketScan: scan.score,
      competitorDepth: comp.score,
      userEvidence: user.score,
      entryMaturity: entry.score,
    },
    gaps: [...scan.gaps, ...comp.gaps, ...user.gaps, ...entry.gaps, ...evidence.gaps].slice(0, 8),
    readyForCouncil: overall >= 55 && entry.score >= 40,
  };
}

export function formatMarketStrengthSummary(score: MarketStrengthScore): string {
  return [
    `市场强度: ${score.overall}/100 (${score.grade})`,
    `扫描: ${score.dimensions.marketScan} | 竞争: ${score.dimensions.competitorDepth} | 用户: ${score.dimensions.userEvidence} | 进入: ${score.dimensions.entryMaturity}`,
    score.readyForCouncil ? "🟢 可进入常委会" : "🟡 建议先补缺口",
    ...score.gaps.slice(0, 3).map((g) => `  ⚠️ ${g}`),
  ].join("\n");
}

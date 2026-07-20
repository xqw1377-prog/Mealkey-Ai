/**
 * M-ED 股权治理强度评估引擎
 *
 * 对标 M-PNT brand-strength-engine.ts。
 * 评估股权治理的就绪度：控制权清晰度、合规完备性、团队结构健康度。
 */

import type { AgentConsultingProject } from "../../consulting-os/types";
import type { EquityEvidenceLedger, EquityPrimaryFact } from "./equity-evidence-ledger";
import { equityEvidenceCoverage, equityFactStrengthBoost, isVerifiedEquityFact } from "./equity-evidence-ledger";

export interface EquityStrengthScore {
  overall: number;         // 0-100
  grade: "A" | "B" | "C" | "D";
  dimensions: {
    controlClarity: number;       // 控制权清晰度 0-100
    complianceReadiness: number;  // 合规就绪度 0-100
    teamHealth: number;           // 团队结构健康度 0-100
    evidenceStrength: number;     // 证据强度 0-100
  };
  gaps: string[];
  readyForCouncil: boolean;
}

function computeControlClarity(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const contract = project.assets.governanceContract;
  const gaps: string[] = [];
  let score = 0;

  if (contract?.lockFirst) { score += 30; } else { gaps.push("未锁定优先处理事项（lockFirst）"); }
  if (contract?.controlFloor) { score += 25; } else { gaps.push("未明确控制权底线"); }
  if (contract?.mustSign) { score += 20; } else { gaps.push("未列出必签文件清单"); }
  if (contract?.killCriteria?.length) { score += 15; } else { gaps.push("缺少杀出线条件"); }
  if (contract?.status === "frozen") { score += 10; } else { gaps.push("合同尚未冻结"); }

  return { score: Math.min(100, score), gaps };
}

function computeComplianceReadiness(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const research = project.assets.research;
  const contract = project.assets.governanceContract;
  const gaps: string[] = [];
  let score = 20; // base

  if (research?.sections?.some((s) => /合规|法律|监管/.test(s.title))) { score += 20; } else { gaps.push("缺少合规/法律扫描"); }
  if (contract?.whatWeWontDo?.length) { score += 20; } else { gaps.push("未列出不做事项（whatWeWontDo）"); }
  if (contract?.rejectedAlternatives?.length) { score += 15; } else { gaps.push("未记录被否决方案"); }
  if (contract?.tradeoffAccepted) { score += 15; } else { gaps.push("未明确取舍"); }
  if (research?.risks?.length) { score += 10; } else { gaps.push("未识别风险项"); }

  return { score: Math.min(100, score), gaps };
}

function computeTeamHealth(project: AgentConsultingProject): { score: number; gaps: string[] } {
  const advisors = project.assets.advisors;
  const gaps: string[] = [];
  let score = 15;

  if (advisors?.strategies?.length) { score += 25; } else { gaps.push("缺少四方治理方案"); }
  if (advisors?.conflictSummary) { score += 20; } else { gaps.push("未记录方案冲突摘要"); }
  if (project.assets.warRoom?.turns?.length) { score += 20; } else { gaps.push("未召开治理会议"); }
  if (project.assets.warRoom?.status === "agreed") { score += 20; } else { gaps.push("治理会议未达成共识"); }

  return { score: Math.min(100, score), gaps };
}

function computeEvidenceStrength(ledger?: EquityEvidenceLedger): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  if (!ledger?.facts?.length) {
    return { score: 0, gaps: ["股权证据账本为空"] };
  }

  const verified = ledger.facts.filter(isVerifiedEquityFact);
  if (verified.length === 0) {
    gaps.push("无已核实的一手股权事实");
  }

  const coverage = equityEvidenceCoverage(ledger);
  if (!coverage.ok) {
    gaps.push(...coverage.missing);
  }

  const boost = equityFactStrengthBoost(verified);
  const score = Math.min(100, verified.length * 10 + boost);

  return { score, gaps };
}

export function computeEquityStrength(
  project: AgentConsultingProject,
  ledger?: EquityEvidenceLedger,
): EquityStrengthScore {
  const control = computeControlClarity(project);
  const compliance = computeComplianceReadiness(project);
  const team = computeTeamHealth(project);
  const evidence = computeEvidenceStrength(ledger);

  const overall = Math.round(
    control.score * 0.30 +
    compliance.score * 0.25 +
    team.score * 0.25 +
    evidence.score * 0.20,
  );

  const grade: EquityStrengthScore["grade"] =
    overall >= 80 ? "A" : overall >= 60 ? "B" : overall >= 40 ? "C" : "D";

  const allGaps = [
    ...control.gaps,
    ...compliance.gaps,
    ...team.gaps,
    ...evidence.gaps,
  ];

  return {
    overall,
    grade,
    dimensions: {
      controlClarity: control.score,
      complianceReadiness: compliance.score,
      teamHealth: team.score,
      evidenceStrength: evidence.score,
    },
    gaps: allGaps.slice(0, 8),
    readyForCouncil: overall >= 55 && control.score >= 40,
  };
}

export function formatEquityStrengthSummary(score: EquityStrengthScore): string {
  const tag = score.readyForCouncil ? "🟢 可进入常委会" : "🟡 建议先补缺口";
  return [
    `股权强度: ${score.overall}/100 (${score.grade})`,
    `控制权: ${score.dimensions.controlClarity} | 合规: ${score.dimensions.complianceReadiness} | 团队: ${score.dimensions.teamHealth} | 证据: ${score.dimensions.evidenceStrength}`,
    tag,
    ...score.gaps.slice(0, 3).map((g) => `  ⚠️ ${g}`),
  ].join("\n");
}

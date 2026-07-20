/**
 * 席位咨询 L5 交付门禁 — 反假完成
 * M-MKT / M-BIZ / M-ED 共用；对齐 M-PNT「可签字才算完成」标准。
 */
import {
  evaluateSeatPrimaryFactsReady,
  harvestSeatPrimaryFacts,
} from "./seat-evidence";
import type {
  AgentConsultingProject,
  DecisionArtifact,
  ResearchPack,
} from "./types";

export type SeatSignOffCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export type SeatSignOffReadiness = {
  ok: boolean;
  checks: SeatSignOffCheck[];
  blockers: string[];
};

/** 调研是否具备可确认的证据厚度（禁止纯 heuristic 冒充完成） */
export function evaluateResearchEvidenceStrength(research?: ResearchPack | null): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!research) {
    return { ok: false, missing: ["调研包缺失"] };
  }
  if (research.status !== "confirmed" && research.status !== "ready") {
    missing.push("调研未就绪");
  }
  const mode = research.collectionMode || "heuristic";
  const sources = research.sources?.filter((s) => s.trim().length > 8) || [];
  const sections = research.sections?.filter((s) => s.body?.trim().length > 20) || [];

  if (mode === "heuristic") {
    missing.push("调研仍为纯启发式（须联网/引擎或 hybrid 来源）");
  }
  if ((research.degradationNote || "").trim()) {
    missing.push("存在引擎降级说明，不能当正式交付");
  }
  if (sources.length < 2 && sections.length < 4) {
    missing.push("可追溯来源<2 且有效章节<4");
  }
  if (!(research.headline || "").trim()) {
    missing.push("缺少调研结论标题");
  }
  return { ok: missing.length === 0, missing };
}

/**
 * 策略确认 / 签字前：禁止启发式或降级交付冒充完成。
 */
export function assertAgentConsultingNotDegraded(
  project: AgentConsultingProject,
  actionLabel = "确认策略",
): void {
  const research = project.assets.research;
  const mode = research?.collectionMode || "heuristic";
  const note = (research?.degradationNote || "").trim();
  if (mode === "heuristic" || note) {
    throw new Error(
      `不能${actionLabel}：调研仍为降级/启发式${note ? `（${note}）` : ""}。请先让外呼引擎 LIVE 并完成可追溯联网采集。`,
    );
  }
  assertSeatResearchReady(research, actionLabel.replace(/^确认/, "") || "策略");
}

export function assertSeatResearchReady(
  research: ResearchPack | undefined,
  label = "策略",
): void {
  const { ok, missing } = evaluateResearchEvidenceStrength(research);
  if (!ok) {
    throw new Error(
      `证据未齐，不能确认${label}。待补：${missing.slice(0, 6).join("；")}`,
    );
  }
  if (research?.status !== "confirmed") {
    throw new Error(`调研尚未确认，不能确认${label}`);
  }
}

export function assertSeatDecisionReady(decision: DecisionArtifact): void {
  const missing: string[] = [];
  if (!decision.recommendation?.trim()) missing.push("建议一句话");
  if (!decision.tradeoffAccepted?.trim()) missing.push("取舍");
  if ((decision.killCriteria?.length || 0) < 2) missing.push("否决条件≥2");
  if ((decision.mondayMoves?.length || 0) < 3) missing.push("本周动作≥3");
  if ((decision.evidenceUsed?.length || 0) < 2) missing.push("证据链≥2");
  // 禁止全是过短模板句
  const killWeak = decision.killCriteria.every((k) => k.length < 12);
  if (killWeak) missing.push("否决条件过空泛");
  if (missing.length) {
    throw new Error(`决策包未齐，待补：${missing.join("；")}`);
  }
}

const REQUIRED_REPORT_MARKERS = ["建议", "取舍", "否决", "本周"] as const;

export function evaluateReportDeliveryReady(report: string): boolean {
  const md = report || "";
  // 中文报告信息密度高；门槛看实质标记，篇幅取 280 防空壳
  if (md.length < 280) return false;
  const hits = REQUIRED_REPORT_MARKERS.filter((m) => md.includes(m)).length;
  // 允许「杀出」代替「否决」、「周一」代替「本周」
  const alt =
    (md.includes("否决") || md.includes("杀出") ? 1 : 0) +
    (md.includes("本周") || md.includes("周一") ? 1 : 0) +
    (md.includes("建议") ? 1 : 0) +
    (md.includes("取舍") ? 1 : 0);
  return alt >= 4 || hits >= 3;
}

export function evaluateSeatSignOffReadiness(
  project: AgentConsultingProject,
  opts: {
    contractFrozen: boolean;
    packReady: boolean;
    contractLabel: string;
    packLabel: string;
  },
): SeatSignOffReadiness {
  const decision = project.assets.decisionArtifact;
  const research = project.assets.research;
  const report = project.assets.strategyReportMarkdown || "";
  // 签字门禁只用真实 status，禁止把未确认调研「假装 confirmed」
  const researchConfirmed = research?.status === "confirmed";
  const researchStrength = evaluateResearchEvidenceStrength(research);
  const facts =
    project.assets.primaryFacts && project.assets.primaryFacts.length > 0
      ? project.assets.primaryFacts
      : harvestSeatPrimaryFacts(research);
  const factsReady = evaluateSeatPrimaryFactsReady(facts);
  const conflictSummary = project.assets.advisors?.conflictSummary || "";
  const advisorsConflictOk =
    conflictSummary.includes("不能同时为真") ||
    conflictSummary.includes("互斥");

  const checks: SeatSignOffCheck[] = [
    {
      id: "research.confirmed",
      label: "调研已确认",
      ok: Boolean(researchConfirmed),
    },
    {
      id: "research.evidence",
      label: "调研具备可追溯来源（非纯启发式）",
      ok: researchConfirmed && researchStrength.ok,
    },
    {
      id: "primary.facts",
      label: "一手事实账本≥2条且可追溯",
      ok: researchConfirmed && factsReady.ok,
    },
    {
      id: "warRoom.agreed",
      label: "会议室已拍板",
      ok: project.assets.warRoom?.status === "agreed",
    },
    {
      id: "advisors.tradeoff",
      label: "顾问策互斥（不能同时为真）",
      ok:
        !project.assets.advisors ||
        advisorsConflictOk ||
        (project.assets.advisors.strategies?.length || 0) < 2,
    },
    {
      id: "contract.frozen",
      label: opts.contractLabel,
      ok: opts.contractFrozen,
    },
    {
      id: "decision.complete",
      label: "决策包含建议/取舍/否决/本周动作≥3与证据链",
      ok: Boolean(
        decision?.recommendation?.trim() &&
          decision?.tradeoffAccepted?.trim() &&
          (decision?.killCriteria?.length || 0) >= 2 &&
          (decision?.mondayMoves?.length || 0) >= 3 &&
          (decision?.evidenceUsed?.length || 0) >= 2,
      ),
    },
    {
      id: "pack.ready",
      label: opts.packLabel,
      ok: opts.packReady,
    },
    {
      id: "report.ready",
      label: "策略报告含建议/取舍/否决/本周且篇幅充足",
      ok: evaluateReportDeliveryReady(report),
    },
    {
      id: "strategy.confirmed",
      label: "策略已确认",
      ok: Boolean(project.assets.strategyConfirmedAt),
    },
  ];

  const blockers = checks.filter((c) => !c.ok).map((c) => c.label);
  return { ok: blockers.length === 0, checks, blockers };
}

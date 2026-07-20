/**
 * 共享六步咨询 → Founder OS ExpertReport
 * M-MKT / M-BIZ / M-ED 共用 AgentConsultingProject，按 agentId 映射引擎。
 */

import type { ExpertEngineId, ExpertReport, ExpertReportSection } from "../founder-os/types";
import type {
  AgentConsultingProject,
  AdvisorStrategyCard,
  ConsultingAgentKind,
} from "./types";

const ENGINE_MAP: Record<ConsultingAgentKind, ExpertEngineId> = {
  "m-mkt": "M-MKT",
  "m-biz": "M-BIZ",
  "m-ed": "M-ED",
};

const LABELS: Record<
  ConsultingAgentKind,
  {
    engineName: string;
    sectionScan: string;
    sectionChoice: string;
    sectionProof: string;
    sectionExec: string;
    defaultHeadline: string;
  }
> = {
  "m-mkt": {
    engineName: "市场进入",
    sectionScan: "市场扫描",
    sectionChoice: "进入方式",
    sectionProof: "验证与杀出线",
    sectionExec: "本周动作",
    defaultHeadline: "M-MKT 市场进入专业意见（进行中）",
  },
  "m-biz": {
    engineName: "商业模式",
    sectionScan: "模式体检",
    sectionChoice: "主航道",
    sectionProof: "单位经济与证明",
    sectionExec: "运营动作",
    defaultHeadline: "M-BIZ 商业模式专业意见（进行中）",
  },
  "m-ed": {
    engineName: "股权治理",
    sectionScan: "股权扫描",
    sectionChoice: "控制权与协议",
    sectionProof: "治理底线",
    sectionExec: "签署与动作",
    defaultHeadline: "M-ED 股权治理专业意见（进行中）",
  },
};

function clip(text: string, max = 280): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function pickWinning(strategies?: AdvisorStrategyCard[]): AdvisorStrategyCard | undefined {
  if (!strategies?.length) return undefined;
  return strategies[0];
}

function choiceContent(
  agentId: ConsultingAgentKind,
  win?: AdvisorStrategyCard,
): string {
  if (!win) return "顾问方案未就绪";
  if (agentId === "m-mkt" && win.entryScheme) {
    return [
      win.entryScheme.title,
      `进入：${win.entryScheme.entryMode}`,
      `场景：${win.entryScheme.sceneCut}`,
      win.oneLiner,
    ]
      .filter(Boolean)
      .join("；");
  }
  if (agentId === "m-biz" && win.modeScheme) {
    return [
      win.modeScheme.title,
      `北极星：${win.modeScheme.northStar}`,
      win.oneLiner,
      win.battlefield,
    ]
      .filter(Boolean)
      .join("；");
  }
  if (agentId === "m-ed" && win.governScheme) {
    return [
      win.governScheme.title,
      `先锁：${win.governScheme.lockFirst}`,
      `必签：${(win.governScheme.mustSign || []).slice(0, 3).join("、")}`,
      win.oneLiner,
    ]
      .filter(Boolean)
      .join("；");
  }
  return [win.oneLiner, win.battlefield, win.differentiation, win.proof]
    .filter(Boolean)
    .join("；");
}

function proofContent(
  agentId: ConsultingAgentKind,
  win?: AdvisorStrategyCard,
  decision?: AgentConsultingProject["assets"]["decisionArtifact"],
): string {
  const kill =
    win?.entryScheme?.killLine ||
    win?.modeScheme?.killLine ||
    win?.governScheme?.killLine ||
    decision?.killCriteria?.[0];
  const week =
    win?.entryScheme?.weekProof ||
    win?.modeScheme?.weekProof ||
    win?.governScheme?.weekProof ||
    decision?.mondayMoves?.[0];
  const score =
    win?.entryScheme?.scorecard ||
    win?.modeScheme?.scorecard ||
    win?.governScheme?.scorecard;
  const scoreLine = score
    ?.slice(0, 3)
    .map((s) => `${s.label}${s.score}`)
    .join(" / ");
  return (
    [kill ? `杀出线：${kill}` : "", week ? `本周证明：${week}` : "", scoreLine, win?.proof]
      .filter(Boolean)
      .join("；") || `${LABELS[agentId].sectionProof}未完成`
  );
}

function execContent(project: AgentConsultingProject): string {
  const d = project.assets.decisionArtifact;
  const road = project.assets.executionRoadmap;
  const pack =
    road?.entryPack || road?.modePack || road?.governancePack;
  return (
    [
      ...(d?.mondayMoves || []).slice(0, 3),
      pack?.oneLiner,
      road?.positioningOneLiner,
      ...(d?.whatWeWontDo || []).slice(0, 1).map((x) => `不做：${x}`),
    ]
      .filter(Boolean)
      .join("；") || "执行路径未锁定"
  );
}

function inferStance(
  project: AgentConsultingProject,
): ExpertReport["stanceHint"] {
  const decision = project.assets.decisionArtifact;
  const war = project.assets.warRoom;
  const research = project.assets.research;
  if (project.assets.strategyConfirmedAt || war?.status === "agreed") {
    if ((decision?.killCriteria?.length || 0) >= 1) return "favorable";
    return "cautious";
  }
  if (decision || research?.status === "confirmed") return "cautious";
  if (research || project.assets.advisors) return "cautious";
  return "insufficient_data";
}

/** 是否有值得常委会消费的实质资产（空壳项目跳过） */
export function hasAgentConsultingSubstance(
  project: AgentConsultingProject,
): boolean {
  const a = project.assets;
  return Boolean(
    a.research?.headline ||
      a.advisors?.strategies?.length ||
      a.warRoom?.consensusOneLiner ||
      a.decisionArtifact?.recommendation ||
      a.strategyConfirmedAt ||
      Object.keys(project.intakeAnswers || {}).length >= 2,
  );
}

/**
 * AgentConsultingProject → ExpertReport
 */
export function toAgentConsultingExpertReport(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  const agentId = project.agentId;
  const labels = LABELS[agentId];
  const engineId = ENGINE_MAP[agentId];
  const research = project.assets.research;
  const advisors = project.assets.advisors;
  const war = project.assets.warRoom;
  const decision = project.assets.decisionArtifact;
  const win = pickWinning(advisors?.strategies);

  const caseId =
    opts?.caseId || project.consultingId || project.projectId || `${engineId}-CASE`;

  const scanBody =
    research?.sections
      ?.slice(0, 4)
      .map((s) => `${s.title}：${s.body}`)
      .join("；") ||
    research?.headline ||
    Object.entries(project.intakeAnswers || {})
      .slice(0, 4)
      .map(([k, v]) => `${k}=${v}`)
      .join("；") ||
    `${labels.sectionScan}未完成`;

  const sections: ExpertReportSection[] = [
    {
      id: "scan",
      title: labels.sectionScan,
      content: clip(scanBody),
    },
    {
      id: "choice",
      title: labels.sectionChoice,
      content: clip(choiceContent(agentId, win)),
    },
    {
      id: "proof",
      title: labels.sectionProof,
      content: clip(proofContent(agentId, win, decision)),
    },
    {
      id: "execution",
      title: labels.sectionExec,
      content: clip(execContent(project)),
    },
  ];

  const opportunities = [
    research?.sections?.find((s) => /缺口|机会|空白|机会窗/.test(s.title))?.body,
    win?.battlefield,
    win?.modeScheme?.northStar,
    war?.consensusOneLiner,
  ].filter((x): x is string => Boolean(x?.trim()));

  const risks = [
    ...(research?.risks || []).slice(0, 3),
    win?.risk,
    ...(decision?.killCriteria || []).slice(0, 2).map((k) => `杀出线：${k}`),
    advisors?.conflictSummary,
  ].filter((x): x is string => Boolean(x?.trim()));

  const conditions = [
    !research || research.status === "draft" ? `完成${labels.sectionScan}确认` : "",
    war?.status !== "agreed" && !project.assets.strategyConfirmedAt
      ? "完成战略会议室共识锁定"
      : "",
    !(decision?.killCriteria?.length)
      ? "明确杀出线 / 否决条件"
      : "",
  ].filter(Boolean) as string[];

  const unknowns = [
    project.intakeStatus !== "complete" ? "Intake 未完成" : "",
    !advisors?.strategies?.length ? "缺少顾问方案卡" : "",
    !decision ? "缺少决策级交付包" : "",
  ].filter(Boolean) as string[];

  const headline =
    war?.consensusOneLiner ||
    decision?.recommendation ||
    research?.headline ||
    win?.oneLiner ||
    labels.defaultHeadline;

  return {
    engineId,
    caseId,
    headline: clip(headline, 120),
    stanceHint: inferStance(project),
    sections,
    opportunities: opportunities.length ? opportunities : undefined,
    risks: risks.length ? risks : undefined,
    conditions: conditions.length ? conditions : undefined,
    unknowns: unknowns.length ? unknowns : undefined,
  };
}

export function toMMktExpertReport(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  return toAgentConsultingExpertReport(
    { ...project, agentId: "m-mkt" },
    opts,
  );
}

export function toMBizExpertReport(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  return toAgentConsultingExpertReport(
    { ...project, agentId: "m-biz" },
    opts,
  );
}

export function toMEdExpertReport(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  return toAgentConsultingExpertReport(
    { ...project, agentId: "m-ed" },
    opts,
  );
}

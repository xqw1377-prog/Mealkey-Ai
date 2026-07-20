/**
 * M-ED → Founder OS ExpertReport 深度适配器
 *
 * 把股权治理六步咨询资产压成常委可消费的专业意见。
 * 对标 M-PNT expert-report-adapter.ts 的领域深度。
 */

import type { ExpertReport, ExpertReportSection } from "../../founder-os/types";
import type { AgentConsultingProject } from "../../consulting-os/types";
import type { GovernanceContract } from "./types";

function clip(text: string, max = 280): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatGovernanceContract(c?: GovernanceContract | null): string {
  if (!c || c.status === "draft") return "股权治理合同未冻结";
  return [
    `先锁: ${c.lockFirst || "—"}`,
    `控制权底线: ${c.controlFloor || "—"}`,
    `必签: ${c.mustSign || "—"}`,
    `vesting: ${c.vestingNote || "—"}`,
    `杀出线: ${(c.killCriteria || []).slice(0, 2).join("、")}`,
  ].filter(Boolean).join(" · ");
}

function inferStance(project: AgentConsultingProject): ExpertReport["stanceHint"] {
  const contract = project.assets.governanceContract;
  const research = project.assets.research;
  if (contract?.status === "frozen") {
    if (contract.killCriteria.length >= 2) return "favorable";
    return "cautious";
  }
  if (research?.status === "confirmed") return "cautious";
  return "insufficient_data";
}

/**
 * 从 AgentConsultingProject (m-ed) 生成深度 ExpertReport
 */
export function toMEdExpertReportDeep(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  const research = project.assets.research;
  const advisors = project.assets.advisors;
  const war = project.assets.warRoom;
  const contract = project.assets.governanceContract;
  const roadmap = project.assets.executionRoadmap;

  const caseId = opts?.caseId || project.consultingId || project.projectId || "M-ED-CASE";

  const win = advisors?.strategies?.[0];
  const scheme = win?.governScheme;
  const pack = roadmap?.governancePack;

  const sections: ExpertReportSection[] = [
    {
      id: "equity_scan",
      title: "股权扫描",
      content: clip([
        research?.headline,
        ...(research?.sections || []).map((s) => `${s.title}: ${s.body}`),
      ].filter(Boolean).join("；") || "股权扫描未完成"),
    },
    {
      id: "control_structure",
      title: "控制权与治理结构",
      content: clip(
        scheme
          ? `${scheme.lockFirst} · ${(scheme.mustSign || []).slice(0, 3).join("、")}`
          : formatGovernanceContract(contract),
      ),
      evidenceIds: contract?.evidenceUsed?.length
        ? contract.evidenceUsed.slice(0, 6)
        : undefined,
    },
    {
      id: "risk_and_compliance",
      title: "风险与合规底线",
      content: clip(
        [
          scheme?.killLine ? `杀出线: ${scheme.killLine}` : "",
          ...(contract?.killCriteria || []).slice(0, 2),
          pack?.killLine,
          ...(contract?.whatWeWontDo || []).slice(0, 2).map((x) => `不做: ${x}`),
        ].filter(Boolean).join("；") || "合规底线性分析未完成",
      ),
    },
    {
      id: "execution_plan",
      title: "签署与执行",
      content: clip(
        [
          pack?.oneLiner,
          pack?.staffBrief || scheme?.scripts?.counselBrief,
          ...(roadmap?.milestones || []).slice(0, 2).map((m) => `${m.title}: ${m.actions.slice(0, 2).join("、")}`),
        ].filter(Boolean).join("；") || "执行路径未锁定",
      ),
    },
  ];

  const opportunities = [
    research?.sections?.find((s) => /机会|优化|空间/.test(s.title))?.body,
    win?.battlefield,
  ].filter((x): x is string => Boolean(x?.trim()));

  const risks = [
    ...(research?.risks || []).slice(0, 3),
    ...(contract?.rejectedAlternatives || []).slice(0, 2).map((a) => `否决: ${a.summary}（${a.reason}）`),
    contract?.status !== "frozen" ? "股权治理合同尚未冻结" : "",
  ].filter((x): x is string => Boolean(x?.trim()));

  const conditions = [
    contract?.status === "frozen" ? "" : "完成股权治理合同冻结",
    (scheme?.scorecard || []).some((s) => s.score < 4) ? "优先解决评分低于 4 的维度" : "",
  ].filter(Boolean);

  const unknowns = [
    !research ? "缺少股权扫描" : "",
    !advisors?.strategies?.length ? "缺少四方方案" : "",
    !roadmap ? "缺少执行路径" : "",
  ].filter(Boolean);

  const headline =
    war?.consensusOneLiner ||
    contract?.oneLiner ||
    scheme?.lockFirst ||
    research?.headline ||
    "M-ED 股权治理专业意见（进行中）";

  return {
    engineId: "M-ED",
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

/**
 * M-BIZ → Founder OS ExpertReport 深度适配器
 *
 * 把商业模式六步咨询资产压成常委可消费的专业意见。
 * 对标 M-PNT expert-report-adapter.ts 的领域深度。
 */

import type { ExpertReport, ExpertReportSection } from "../../founder-os/types";
import type { AgentConsultingProject, ResearchPack } from "../../consulting-os/types";
import type { ModeContract } from "./types";

function clip(text: string, max = 280): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatModeContract(c?: ModeContract | null): string {
  if (!c || c.status === "draft") return "商业模式合同未冻结";
  return [
    `90 天主航道: ${c.northStar || "—"}`,
    `取舍: ${c.tradeoffAccepted || "—"}`,
    `杀出线: ${(c.killCriteria || []).slice(0, 2).join("、")}`,
    c.priorityAxis ? `优先级轴: ${c.priorityAxis}` : "",
  ].filter(Boolean).join(" · ");
}

function inferStance(project: AgentConsultingProject): ExpertReport["stanceHint"] {
  const contract = project.assets.modeContract;
  const research = project.assets.research;
  if (contract?.status === "frozen") {
    if (contract.killCriteria.length >= 2) return "favorable";
    return "cautious";
  }
  if (research?.status === "confirmed") return "cautious";
  return "insufficient_data";
}

function extractFinancialMetrics(research?: ResearchPack): string {
  const financial = research?.sections?.find(
    (s) => /财务|单位经济|毛利|成本|利润|UE/.test(s.title),
  );
  if (financial) return financial.body;
  return "财务指标分析未完成";
}

/**
 * 从 AgentConsultingProject (m-biz) 生成深度 ExpertReport
 */
export function toMBizExpertReportDeep(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  const research = project.assets.research;
  const advisors = project.assets.advisors;
  const war = project.assets.warRoom;
  const contract = project.assets.modeContract;
  const roadmap = project.assets.executionRoadmap;

  const caseId = opts?.caseId || project.consultingId || project.projectId || "M-BIZ-CASE";

  const win = advisors?.strategies?.[0];
  const scheme = win?.modeScheme;
  const pack = roadmap?.modePack;

  const sections: ExpertReportSection[] = [
    {
      id: "business_scan",
      title: "模式体检",
      content: clip([
        research?.headline,
        ...(research?.sections || []).map((s) => `${s.title}: ${s.body}`),
      ].filter(Boolean).join("；") || "模式体检未完成"),
    },
    {
      id: "unit_economics",
      title: "单位经济",
      content: clip(extractFinancialMetrics(research)),
    },
    {
      id: "profit_model",
      title: "利润结构与主航道",
      content: clip(
        scheme
          ? `${scheme.northStar} · ${win?.battlefield || ""} · ${win?.differentiation || ""}`
          : formatModeContract(contract),
      ),
      evidenceIds: contract?.evidenceUsed?.length
        ? contract.evidenceUsed.slice(0, 6)
        : undefined,
    },
    {
      id: "replication_plan",
      title: "复制与执行",
      content: clip(
        [
          pack?.oneLiner,
          pack?.killLine || scheme?.killLine,
          ...(roadmap?.milestones || []).slice(0, 2).map((m) => `${m.title}: ${m.actions.slice(0, 2).join("、")}`),
        ].filter(Boolean).join("；") || "复制路径未锁定",
      ),
    },
  ];

  const opportunities = [
    research?.sections?.find((s) => /机会|增长|优势/.test(s.title))?.body,
    win?.battlefield,
    scheme?.northStar,
  ].filter((x): x is string => Boolean(x?.trim()));

  const risks = [
    ...(research?.risks || []).slice(0, 3),
    ...(contract?.rejectedAlternatives || []).slice(0, 2).map((a) => `否决: ${a.summary}（${a.reason}）`),
    contract?.status !== "frozen" ? "商业模式合同尚未冻结" : "",
  ].filter((x): x is string => Boolean(x?.trim()));

  const conditions = [
    contract?.status === "frozen" ? "" : "完成商业模式合同冻结",
    (scheme?.scorecard || []).some((s) => s.score < 4) ? "优先解决评分低于 4 的维度" : "",
  ].filter(Boolean);

  const unknowns = [
    !research ? "缺少模式体检" : "",
    !advisors?.strategies?.length ? "缺少四官方案" : "",
    !roadmap ? "缺少执行路径" : "",
  ].filter(Boolean);

  const headline =
    war?.consensusOneLiner ||
    contract?.oneLiner ||
    scheme?.northStar ||
    research?.headline ||
    "M-BIZ 商业模式专业意见（进行中）";

  return {
    engineId: "M-BIZ",
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

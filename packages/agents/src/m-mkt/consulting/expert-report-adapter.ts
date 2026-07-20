/**
 * M-MKT → Founder OS ExpertReport 深度适配器
 *
 * 把市场进入六步咨询资产压成常委可消费的专业意见。
 * 对标 M-PNT expert-report-adapter.ts 的领域深度。
 */

import type { ExpertReport, ExpertReportSection } from "../../founder-os/types";
import type { AgentConsultingProject, ResearchPack } from "../../consulting-os/types";
import type { EntryContract } from "./types";

function clip(text: string, max = 280): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatEntryContract(c?: EntryContract | null): string {
  if (!c || c.status === "draft") return "市场进入合同未冻结";
  return [
    `进入方式: ${c.entryMode || "—"}`,
    `场景切口: ${c.cityScene || "—"}`,
    `菜单试点: ${c.menuPilot || "—"}`,
    `杀出线: ${(c.killCriteria || []).slice(0, 2).join("、")}`,
    c.tradeoffAccepted ? `取舍: ${c.tradeoffAccepted}` : "",
  ].filter(Boolean).join(" · ");
}

function inferStance(project: AgentConsultingProject): ExpertReport["stanceHint"] {
  const contract = project.assets.entryContract;
  const research = project.assets.research;
  if (contract?.status === "frozen") {
    if (contract.killCriteria.length >= 2) return "favorable";
    return "cautious";
  }
  if (research?.status === "confirmed") return "cautious";
  return "insufficient_data";
}

function formatCompetitorInfo(research?: ResearchPack): string {
  const briefs = research?.competitorBriefs || [];
  if (!briefs.length) return "竞品扫描未完成";
  return briefs.slice(0, 3).map((c) =>
    `${c.name}: ${c.play}（威胁: ${c.threat}）`
  ).join("；");
}

/**
 * 从 AgentConsultingProject (m-mkt) 生成深度 ExpertReport
 */
export function toMMktExpertReportDeep(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): ExpertReport {
  const research = project.assets.research;
  const advisors = project.assets.advisors;
  const war = project.assets.warRoom;
  const contract = project.assets.entryContract;
  const scope = research?.scope;

  const caseId = opts?.caseId || project.consultingId || project.projectId || "M-MKT-CASE";

  // 优选方案
  const win = advisors?.strategies?.[0];
  const scheme = win?.entryScheme;

  const sections: ExpertReportSection[] = [
    {
      id: "market_scan",
      title: "市场扫描",
      content: clip([
        scope ? `${scope.city} · ${scope.category}` : "",
        research?.headline,
        ...(research?.sections || []).map((s) => `${s.title}: ${s.body}`),
      ].filter(Boolean).join("；") || "市场扫描未完成"),
      evidenceIds: (research as { evidenceIds?: string[] } | undefined)?.evidenceIds,
    },
    {
      id: "competition",
      title: "竞争格局",
      content: clip(formatCompetitorInfo(research)),
    },
    {
      id: "entry_choice",
      title: "进入方式",
      content: clip(
        scheme
          ? `${scheme.title} · ${scheme.entryMode} · 场景: ${scheme.sceneCut}`
          : formatEntryContract(contract),
      ),
      evidenceIds: contract?.evidenceUsed?.length
        ? contract.evidenceUsed.slice(0, 6)
        : undefined,
    },
    {
      id: "verification",
      title: "验证与杀出线",
      content: clip(
        [
          scheme?.killLine ? `杀出线: ${scheme.killLine}` : "",
          scheme?.weekProof ? `本周证明: ${scheme.weekProof}` : "",
          scheme?.scorecard?.slice(0, 3).map((s) => `${s.label}:${s.score}`).join(" / "),
          ...(contract?.killCriteria || []).slice(0, 2),
        ].filter(Boolean).join("；") || "验证条件未明确",
      ),
    },
  ];

  const opportunities = [
    research?.sections?.find((s) => /缺口|机会|空白/.test(s.title))?.body,
    win?.battlefield,
    scheme?.sceneCut,
  ].filter((x): x is string => Boolean(x?.trim()));

  const risks = [
    ...(research?.risks || []).slice(0, 3),
    ...(contract?.rejectedAlternatives || []).slice(0, 2).map((a) => `否决: ${a.summary}（${a.reason}）`),
    contract?.status !== "frozen" ? "市场进入合同尚未冻结" : "",
  ].filter((x): x is string => Boolean(x?.trim()));

  const conditions = [
    contract?.status === "frozen" ? "" : "完成进入方案合同冻结",
    scheme?.scorecard?.some((s) => s.score < 4) ? "优先解决评分低于 4 的维度" : "",
  ].filter(Boolean);

  const unknowns = [
    !research ? "缺少市场扫描" : "",
    !advisors?.strategies?.length ? "缺少顾问方案（多席位）" : "",
    research?.collectionMode === "heuristic" ? "调研为启发式模式，建议补充数据源" : "",
  ].filter(Boolean);

  const headline =
    war?.consensusOneLiner ||
    contract?.oneLiner ||
    scheme?.entryMode ||
    research?.headline ||
    "M-MKT 市场进入专业意见（进行中）";

  return {
    engineId: "M-MKT",
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

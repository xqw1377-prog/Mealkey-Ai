/**
 * 《品牌定位战略报告》正文生成
 */
import { REPORT_CHAPTERS } from "./positioning-contract-engine";
import { formatPositioningStatement } from "./positioning-contract-engine";
import {
  buildEvidenceAppendix,
  formatFactsForReportSection,
  listFactsForStage,
} from "./evidence-ledger-engine";
import type { BrandStrategyProject, ReportOutline } from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function citeStage(
  project: BrandStrategyProject,
  stage:
    | "DISCOVERY"
    | "BRAND_BRIEF"
    | "CATEGORY_ANALYSIS"
    | "CONSUMER_INSIGHT"
    | "COMPETITIVE_MAPPING"
    | "POSITIONING_DESIGN",
) {
  return formatFactsForReportSection(
    listFactsForStage(project.assets.evidenceLedger, stage),
  );
}

function chapter01(project: BrandStrategyProject): string {
  const b = project.assets.brandBrief;
  if (!b) return "（Brand Brief 未完成）";
  return [
    "## 01 Brand Brief",
    "",
    "### 业务上下文",
    b.businessContext || "—",
    "",
    "### 品类定义",
    b.categoryDefinition || "—",
    "",
    "### 目标用户",
    b.targetCustomer || "—",
    "",
    "### 用户需求",
    b.customerNeed || "—",
    "",
    "### 竞争集合",
    (b.competitiveSet || []).map((c) => `- ${c}`).join("\n") || "—",
    "",
    "### 品牌野心",
    b.brandAmbition || "—",
    "",
    "### 创始人信念 / 不可复制资产",
    b.founderBelief || "—",
  ].join("\n");
}

function chapter02(project: BrandStrategyProject): string {
  const c = project.assets.categoryDiagnosis;
  if (!c) return "（Category Diagnosis 未完成）";
  return [
    "## 02 Category Diagnosis",
    "",
    c.analysisNarrative || "",
    "",
    `**品类：** ${c.categoryName}`,
    `**生命周期：** ${c.lifecycle || "—"}`,
    `**推荐战场：** ${c.recommendedBattlefield || c.battlefield}`,
    `**机会：** ${c.opportunity}`,
    `**战略问题：** ${c.strategicQuestion || "—"}`,
    "",
    "### 否决战场",
    ...(c.rejectedBattlefields || []).map((x) => `- ${x}`),
    "",
    "### Category Decision",
    c.decision?.selectedOptionId
      ? `- 已选定：${c.battlefield}`
      : "- 尚未选定战场",
    c.decision?.decisionReason ? `- 理由：${c.decision.decisionReason}` : "",
    c.decision?.overrideRecommended
      ? `- 覆盖推荐：是；覆盖理由：${c.decision.overrideReason || "—"}`
      : "",
    ...(c.decision?.options || []).map((o) => {
      const score = o.scores
        ? `总分${o.scores.total}（机会${o.scores.opportunity}/可防御${o.scores.defensibility}/资源${o.scores.resourceFit}/证据${o.scores.evidenceStrength}）`
        : "未评分";
      return `- [${o.recommended ? "推荐" : "候选"}] ${o.label}：${o.rationale}（风险：${o.risk}；${score}）`;
    }),
    "",
    "### 风险",
    ...c.risks.map((x) => `- ${x}`),
    "",
    citeStage(project, "CATEGORY_ANALYSIS"),
  ].join("\n");
}

function chapter03(project: BrandStrategyProject): string {
  const c = project.assets.consumerInsight;
  if (!c) return "（Consumer Insight 未完成）";
  return [
    "## 03 Consumer Insight",
    "",
    c.insightNarrative || "",
    "",
    `**主人格：** ${c.primaryPersona || c.targetCustomer}`,
    `**功能任务：** ${c.functionalJob || "—"}`,
    `**情感任务：** ${c.emotionalJob || "—"}`,
    "",
    "### Jobs To Be Done",
    ...c.jobsToBeDone.map((x) => `- ${x}`),
    "",
    "### 场合",
    ...(c.occasions || []).map((x) => `- ${x}`),
    "",
    "### 障碍",
    ...c.barriers.map((x) => `- ${x}`),
    "",
    "### 未满足需求",
    ...c.unmetNeeds.map((x) => `- ${x}`),
    "",
    "### 转化触发",
    ...(c.switchTriggers || []).map((x) => `- ${x}`),
    "",
    citeStage(project, "CONSUMER_INSIGHT"),
  ].join("\n");
}

function chapter04(project: BrandStrategyProject): string {
  const m = project.assets.competitiveMap;
  if (!m) return "（Competitive Map 未完成）";
  return [
    "## 04 Competitive Map",
    "",
    m.mapNarrative || "",
    "",
    `**坐标轴：** ${m.axes?.x || "—"} × ${m.axes?.y || "—"}`,
    `**空位：** ${m.whitespace}`,
    `**进攻假设：** ${m.attackHypothesis || "—"}`,
    "",
    "### 竞品卡",
    ...m.competitors.map(
      (c) =>
        `- **${c.name}**｜心智：${c.mentalSlot}｜弱点：${c.weakness}${
          c.x != null && c.y != null ? `｜坐标：(${c.x},${c.y})` : ""
        }${c.attackAngle ? `｜进攻角：${c.attackAngle}` : ""}`,
    ),
    "",
    "### Positioning Map 坐标点",
    ...(m.plotPoints || []).map(
      (pt) => `- [${pt.kind}] ${pt.label} @ (${pt.x},${pt.y})${pt.note ? ` — ${pt.note}` : ""}`,
    ),
    "",
    "### 地图证据",
    ...(m.mapEvidence || []).map(
      (e) => `- [${e.strength}] ${e.sourceArtifact}：${e.claim}`,
    ),
    "",
    "### 禁入红区",
    ...(m.noGoZones || []).map((x) => `- ${x}`),
    "",
    citeStage(project, "COMPETITIVE_MAPPING"),
  ].join("\n");
}

function chapter05(project: BrandStrategyProject): string {
  const p = project.assets.positioningContract;
  if (!p) return "（定位策略未完成）";
  const primaryAccepted = (p.supportingEvidence || []).filter(
    (e) =>
      e.sourceArtifact.startsWith("PrimaryFact.") &&
      (!e.reviewStatus || e.reviewStatus === "accepted"),
  );
  return [
    "## 05 Positioning Strategy",
    "",
    "### 战略选择",
    p.strategicChoice || "—",
    "",
    "### 被否决的替代方案",
    ...p.rejectedAlternatives.map(
      (r) => `- ${r.statementSummary} — 否决理由：${r.rejectReason}`,
    ),
    "",
    "### 支撑证据（含一手事实）",
    ...p.supportingEvidence.map(
      (e) =>
        `- [${e.reviewStatus || "n/a"}·${e.strength}] ${e.sourceArtifact}：${e.claim}`,
    ),
    "",
    "### 已采纳的一手事实",
    primaryAccepted.length > 0
      ? primaryAccepted
          .map((e) => `- ${e.sourceArtifact}：${e.claim}`)
          .join("\n")
      : "> 尚未采纳一手事实进入合同。Propose 前请完成证据审阅。",
    "",
    citeStage(project, "POSITIONING_DESIGN"),
  ].join("\n");
}

function chapter06(project: BrandStrategyProject): string {
  const p = project.assets.positioningContract;
  if (!p) return "（Positioning Contract 未完成）";
  return [
    "## 06 Positioning Contract",
    "",
    `**状态：** ${p.status}`,
    p.frozenAt ? `**冻结时间：** ${p.frozenAt}` : "",
    "",
    "```",
    formatPositioningStatement(p.statement),
    "```",
    "",
    `**战略选择：** ${p.strategicChoice}`,
    "",
    "### 假设压力测试",
    ...(p.hypotheses || []).map((h) => {
      const score = h.scores
        ? `总分${h.scores.total}（空位${h.scores.whitespaceFit}/证据${h.scores.evidenceFit}/资源${h.scores.resourceFit}/品类${h.scores.categoryFit}）`
        : "未评分";
      return `- [${h.status}] ${h.summary} · ${score}${
        h.rejectReason ? ` — 否决：${h.rejectReason}` : ""
      }`;
    }),
    p.hypothesisOverride?.overrideRecommended
      ? `- 覆盖最高分：是；理由：${p.hypothesisOverride.overrideReason || "—"}`
      : "",
    "",
    "### 否决方案",
    ...p.rejectedAlternatives.map(
      (r) => `- ${r.statementSummary} — ${r.rejectReason}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

function chapter07(project: BrandStrategyProject): string {
  const sys = project.assets.brandSystem;
  const p = project.assets.positioningContract;
  const b = project.assets.brandBrief;
  const s = p?.statement;
  if (sys) {
    return [
      "## 07 Brand System（最小集）",
      "",
      `**状态：** ${sys.status} · v${sys.version}`,
      sys.confirmedAt ? `**确认时间：** ${sys.confirmedAt}` : "",
      "",
      "### 价值主张",
      sys.valueProposition,
      "",
      "### 传播主线",
      sys.communicationLine,
      "",
      "### 禁用语",
      ...sys.forbiddenPhrases.map((x) => `- ${x}`),
      "",
      "### 产品映射",
      ...sys.productMappings.map(
        (m) =>
          `- **${m.productOrLine}** → 证明：${m.provesBecause}${
            m.occasion ? `｜场合：${m.occasion}` : ""
          }`,
      ),
      "",
      "### 语气要点",
      ...(sys.toneNotes || []).map((x) => `- ${x}`),
      "",
      "### 体验红线",
      ...(sys.experienceNonNegotiables || []).map((x) => `- ${x}`),
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "## 07 Brand Architecture（最小集）",
    "",
    "### 价值主张",
    s?.thatValue || b?.brandAmbition || "—",
    "",
    "### 品牌类别语言",
    s?.ourBrandIs || "—",
    "",
    "### 传播主线（对外一句话）",
    s
      ? `为${s.forAudience}，在需要${s.whoNeed}时，选择${s.ourBrandIs}，因为${s.because}。`
      : "—",
    "",
    "### 禁用语",
    "- 空洞「高品质」「年轻人喜欢」而无场景与证据",
    "- 与禁入红区冲突的「品类第一」「正宗之王」类夸大",
    "",
    "### 产品映射原则",
    "主推产品必须直接证明 Because；菜单结构服务场景，不为差异而堆 SKU。",
    "",
    "> 提示：请在终稿阶段确认 Brand System 资产后重生成报告。",
  ].join("\n");
}

function chapter08(project: BrandStrategyProject): string {
  const m = project.assets.competitiveMap;
  const c = project.assets.consumerInsight;
  return [
    "## 08 Strategic Recommendations",
    "",
    "### 90 天验证重点",
    `1. 在核心场合（${(c?.occasions || ["主场合"]).slice(0, 2).join("、")}）兑现定位承诺`,
    "2. 收集可复述的用户原话，检验一句话定位是否「说得出口」",
    "3. 对照禁入红区，停止无效对照与价格消耗",
    "",
    "### 组织动作",
    "- 店长/主理人能用定位合同六段解释「我们是谁」",
    "- 新品评审必须回答：强化还是稀释 Because",
    "",
    "### 增长边界",
    m?.attackHypothesis || "先打透空位，再扩城扩品。",
    "",
    "### 下一步咨询联动（预留）",
    "- M-MKT：验证市场规模与进入窗口",
    "- M-BIZ：校验单位经济是否支撑定位承诺",
    "- M-ED：若扩张融资，股权结构是否匹配品牌资产沉淀",
    "",
    "### 证据纪律",
    "- 90 天内每条关键动作须能回指附录 A 中的 factId 或合同证据",
    "- 新主张未经一手事实支撑，不得进入传播主线",
  ].join("\n");
}

const BUILDERS: Record<string, (p: BrandStrategyProject) => string> = {
  "01": chapter01,
  "02": chapter02,
  "03": chapter03,
  "04": chapter04,
  "05": chapter05,
  "06": chapter06,
  "07": chapter07,
  "08": chapter08,
};

export function buildStrategyReport(project: BrandStrategyProject): ReportOutline {
  const chapters = REPORT_CHAPTERS.map((ch) => {
    const body = BUILDERS[ch.no]?.(project) || "";
    const boundArtifactId =
      ch.no === "01"
        ? project.assets.brandBrief?.briefId
        : ch.no === "02"
          ? project.assets.categoryDiagnosis?.artifactId
          : ch.no === "03"
            ? project.assets.consumerInsight?.artifactId
            : ch.no === "04"
              ? project.assets.competitiveMap?.artifactId
              : ch.no === "06"
                ? project.assets.positioningContract?.contractId
                : ch.no === "07"
                  ? project.assets.brandSystem?.artifactId
                  : undefined;
    return {
      no: ch.no,
      title: ch.title,
      boundArtifactId,
      body,
    };
  });

  const challenge = project.assets.journey?.challengeBrief;
  const truth =
    project.assets.journey?.humanTruth ||
    project.assets.consumerInsight?.humanTruth;
  const reality = project.assets.journey?.realityMap;
  const options = project.assets.journey?.advisorStrategies?.strategyOptions;

  const protocolFrontMatter = [
    "## 00 战略启动与现实图（Protocol）",
    "",
    challenge
      ? [
          "### Brand Challenge Brief",
          `- 项目：${challenge.projectLabel}`,
          `- 战略目标：${challenge.strategicGoal}`,
          `- 核心挑战：${challenge.coreChallenge}`,
        ].join("\n")
      : "> Challenge Brief 未生成（INTAKE 未编译）。",
    "",
    reality
      ? [
          "### Business Reality Map",
          `- 战备：${reality.fightReadiness} · ${reality.note}`,
          "**优势**",
          ...reality.strengths.map((s) => `- ${s}`),
          "**劣势**",
          ...reality.weaknesses.map((s) => `- ${s}`),
          "**机会**",
          ...reality.opportunities.map((s) => `- ${s}`),
          "**威胁**",
          ...reality.threats.map((s) => `- ${s}`),
        ].join("\n")
      : "> Reality Map 未生成。",
    "",
    truth
      ? [
          "### Human Truth",
          `- 行为：${truth.behavior}`,
          `- 隐藏矛盾：${truth.contradiction}`,
          `- 未满足需求：${truth.unmetNeed}`,
          `- 战略机会：${truth.strategicOpportunity}`,
        ].join("\n")
      : "> Human Truth 未生成。",
    "",
    options?.options?.length
      ? [
          "### Strategy Options（拍板前三选一）",
          ...options.options.map(
            (o) =>
              `- **${o.optionId} ${o.seatName}**：${o.claim}｜优势 ${o.advantage}｜风险 ${o.risk}｜牺牲 ${o.sacrifice}`,
          ),
          options.mutualExclusionNote,
        ].join("\n")
      : "> Strategy Options 未生成。",
  ].join("\n");

  const fullReportMarkdown = [
    "# 品牌定位战略报告",
    "",
    `项目 ID：${project.brandProjectId}`,
    `生成时间：${new Date().toISOString()}`,
    project.assets.reportOutline?.version
      ? `基于版本：v${project.assets.reportOutline.version}`
      : "",
    "",
    "> 本文档由 M-PNT 咨询项目状态机生成。定位结论以 Positioning Contract 为准；一手证据见各章引用与附录 A。",
    "",
    protocolFrontMatter,
    "",
    ...chapters.map((c) => c.body || ""),
    "",
    buildEvidenceAppendix(project.assets.evidenceLedger),
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n\n");

  const prev = project.assets.reportOutline;
  return {
    artifactId: prev?.artifactId || createId("report"),
    chapters,
    fullReportMarkdown,
    generatedAt: new Date().toISOString(),
    version: prev?.version || 1,
    signOffStatus: prev?.signOffStatus === "signed" ? "draft" : prev?.signOffStatus || "draft",
    signedAt: undefined,
    signedBy: undefined,
    signOffNote: undefined,
  };
}

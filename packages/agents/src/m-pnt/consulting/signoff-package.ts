/**
 * 签字交付包 — 就绪校验 + 单文件 Markdown 存档
 */
import { formatPositioningStatement } from "./positioning-contract-engine";
import {
  buildEvidenceAppendix,
  primaryEvidenceCoverage,
} from "./evidence-ledger-engine";
import { buildStrategyReport } from "./strategy-report";
import {
  evaluateBrandSystemConsistency,
} from "./brand-system-engine";
import {
  buildStaffDeliveryPack,
  resolvePrimaryStrategy,
} from "./execution-roadmap-engine";
import { ensureProofPlan } from "./strategy-meeting-engine";
import { ADVISOR_META } from "./journey-types";
import type { BrandStrategyProject } from "./types";

export type SignOffCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export type SignOffReadiness = {
  ok: boolean;
  checks: SignOffCheck[];
  blockers: string[];
};

/** 战略交付签字前就绪检查（与 signStrategyReport 门禁对齐） */
export function evaluateSignOffReadiness(
  project: BrandStrategyProject,
): SignOffReadiness {
  const contract = project.assets.positioningContract;
  const system = project.assets.brandSystem;
  const outline = project.assets.reportOutline;
  const coverage = primaryEvidenceCoverage(project.assets.evidenceLedger);
  const consistency =
    system && contract
      ? evaluateBrandSystemConsistency(project, system)
      : null;

  const challenge = project.assets.journey?.challengeBrief;
  const truth =
    project.assets.journey?.humanTruth ||
    project.assets.consumerInsight?.humanTruth;
  const reality = project.assets.journey?.realityMap;
  const options = project.assets.journey?.advisorStrategies?.strategyOptions;
  const reportMd = outline?.fullReportMarkdown || "";

  const checks: SignOffCheck[] = [
    {
      id: "challenge.brief",
      label: "Brand Challenge Brief 已生成",
      ok: Boolean(challenge?.coreChallenge?.trim()),
    },
    {
      id: "reality.map",
      label: "Business Reality Map 已生成",
      ok: Boolean(reality?.mapId),
    },
    {
      id: "human.truth",
      label: "Human Truth 四段齐全",
      ok: Boolean(
        truth?.behavior &&
          truth?.contradiction &&
          truth?.unmetNeed &&
          truth?.strategicOpportunity,
      ),
    },
    {
      id: "strategy.options",
      label: "Strategy Options A/B/C 已生成",
      ok: (options?.options?.length || 0) >= 2,
    },
    {
      id: "contract.frozen",
      label: "定位已锁定",
      ok: contract?.status === "frozen",
    },
    {
      id: "rehearsal.passed",
      label: "店员话术已对齐",
      ok: contract?.rehearsal?.status === "passed",
    },
    {
      id: "brandSystem.complete",
      label: "店里说法已确认",
      ok: system?.status === "complete",
    },
    {
      id: "brandSystem.consistent",
      label: "说法跟定位对齐",
      ok: Boolean(
        system?.status === "complete" &&
          (consistency?.ok ?? system.consistencyCheck?.ok),
      ),
    },
    {
      id: "evidence.coverage",
      label: "一手事实覆盖品类/洞察/竞争",
      ok: coverage.ok,
    },
    {
      id: "report.complete",
      label: "战略报告含 Protocol 前章与附录 A",
      ok: Boolean(
        reportMd &&
          (outline?.chapters?.length || 0) >= 8 &&
          reportMd.includes("附录 A") &&
          reportMd.includes("Brand Challenge Brief") &&
          reportMd.includes("Human Truth"),
      ),
    },
  ];

  const blockers = checks.filter((c) => !c.ok).map((c) => c.label);
  return { ok: blockers.length === 0, checks, blockers };
}

export function buildSignOffPackageMarkdown(
  project: BrandStrategyProject,
  opts?: { preview?: boolean },
): string {
  const contract = project.assets.positioningContract;
  const system = project.assets.brandSystem;
  const outline = project.assets.reportOutline;
  const report =
    outline?.fullReportMarkdown ||
    buildStrategyReport(project).fullReportMarkdown ||
    "";
  const rehearsal = contract?.rehearsal;
  const readiness = evaluateSignOffReadiness(project);
  const consistency =
    system && contract
      ? evaluateBrandSystemConsistency(project, system)
      : null;
  const category = project.assets.categoryDiagnosis;
  const isPreview = Boolean(opts?.preview) || outline?.signOffStatus !== "signed";
  const journey = project.assets.journey;
  const staffFromRoadmap = journey?.executionRoadmap?.staffDelivery?.markdown;
  const primary = resolvePrimaryStrategy(
    journey?.advisorStrategies,
    journey?.warRoom,
  );
  const staffMarkdown =
    staffFromRoadmap ||
    (primary
      ? buildStaffDeliveryPack({
          oneLiner:
            journey?.warRoom?.consensusOneLiner ||
            primary.oneLiner ||
            "已确认的品牌定位",
          proofPlan: ensureProofPlan(primary),
          doNotDo: primary.doNotDo,
          sacrifice: primary.sacrifice,
          forWhom: primary.forWhom,
          seatName: ADVISOR_META[primary.advisorId].name,
          masterScripts: primary.masterScheme?.scripts
            ? {
                greeting: primary.masterScheme.scripts.greeting,
                counter: primary.masterScheme.scripts.counter,
                storefront: primary.masterScheme.scripts.storefront,
                forbidden: primary.masterScheme.scripts.forbidden,
              }
            : undefined,
        }).markdown
      : "");

  return [
    `# 品牌定位战略 · 签字交付包${isPreview ? "（草稿预览）" : ""}`,
    "",
    isPreview
      ? "> ⚠️ 本文件为草稿预览，非正式签字存档。正式交付请先完成创始人签字后再导出。"
      : "> ✓ 本文件为签字后正式存档版本。",
    "",
    `**项目 ID：** ${project.brandProjectId}`,
    `**品牌绑定：** ${project.boundBrandId || "—"}`,
    `**打包时间：** ${new Date().toISOString()}`,
    `**报告版本：** v${outline?.version || 1}`,
    `**签字状态：** ${outline?.signOffStatus || "draft"}`,
    outline?.signedBy ? `**签字人：** ${outline.signedBy}` : "",
    outline?.signedAt ? `**签字时间：** ${outline.signedAt}` : "",
    outline?.signOffNote ? `**签字备注：** ${outline.signOffNote}` : "",
    "",
    "---",
    "",
    "## 0. 交付就绪清单",
    "",
    ...readiness.checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.label}`),
    "",
    readiness.ok
      ? "全部就绪。"
      : `未就绪项：${readiness.blockers.join("；")}`,
    "",
    "---",
    "",
    "## 1. Positioning Contract（冻结合同）",
    "",
    contract
      ? [
          `状态：${contract.status}`,
          contract.frozenAt ? `冻结时间：${contract.frozenAt}` : "",
          "",
          "```",
          formatPositioningStatement(contract.statement),
          "```",
          "",
          `战略选择：${contract.strategicChoice}`,
          "",
          "### 否决方案",
          ...contract.rejectedAlternatives.map(
            (r) => `- ${r.statementSummary} — ${r.rejectReason}`,
          ),
        ]
          .filter(Boolean)
          .join("\n")
      : "（无合同）",
    "",
    "## 2. 可复述测试记录",
    "",
    rehearsal
      ? [
          `结果：${rehearsal.status} · 得分 ${rehearsal.score}`,
          rehearsal.testedAt ? `测试时间：${rehearsal.testedAt}` : "",
          "",
          "### 创始人复述",
          rehearsal.founderRetell || "—",
          "",
          `反馈：${rehearsal.feedback}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "> 无复述测试记录",
    "",
    "## 3. Category Decision 摘要",
    "",
    category?.decision?.selectedOptionId
      ? [
          `选定战场：${category.battlefield || category.decision.options.find((o) => o.optionId === category.decision?.selectedOptionId)?.label || "—"}`,
          `决策理由：${category.decision.decisionReason || "—"}`,
          category.decision.overrideReason
            ? `覆盖推荐理由：${category.decision.overrideReason}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "> 无战场决策记录",
    "",
    "## 4. Brand System 最小集",
    "",
    system
      ? [
          `状态：${system.status} · v${system.version}`,
          consistency
            ? `合同一致性：${consistency.ok ? "通过" : "未通过"}（覆盖 ${consistency.coveredFields.join("/") || "—"}）`
            : "",
          "",
          `**价值主张：** ${system.valueProposition}`,
          "",
          `**传播主线：** ${system.communicationLine}`,
          "",
          "### 禁用语",
          ...system.forbiddenPhrases.map((x) => `- ${x}`),
          "",
          "### 产品映射",
          ...system.productMappings.map(
            (m) =>
              `- ${m.productOrLine} → ${m.provesBecause}${
                m.occasion ? `（${m.occasion}）` : ""
              }`,
          ),
          consistency && consistency.issues.length > 0
            ? [
                "",
                "### 一致性问题",
                ...consistency.issues.map(
                  (i) => `- [${i.severity}] ${i.message}`,
                ),
              ].join("\n")
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "（无 Brand System）",
    "",
    "## 5. 完整战略报告",
    "",
    report,
    "",
    "## 6. 一手证据附录（再列）",
    "",
    buildEvidenceAppendix(project.assets.evidenceLedger),
    "",
    "## 7. 店员交付包（可贴店）",
    "",
    staffMarkdown ||
      "> 尚无店员交付包。请先确认策略报告并生成执行路径，再导出正式包。",
    "",
    "---",
    "",
    "> 本交付包由 M-PNT 咨询项目生成。签字后作为当前战略版本存档。第 7 节可直接打印贴吧台。",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export function signOffPackageFilename(
  project: BrandStrategyProject,
  opts?: { preview?: boolean },
): string {
  const v = project.assets.reportOutline?.version || 1;
  const id = project.brandProjectId.slice(0, 12);
  const preview =
    Boolean(opts?.preview) ||
    project.assets.reportOutline?.signOffStatus !== "signed";
  return preview
    ? `品牌定位战略交付包草稿-${id}-v${v}.md`
    : `品牌定位战略交付包-${id}-v${v}.md`;
}

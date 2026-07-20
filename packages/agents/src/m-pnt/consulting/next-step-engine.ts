/**
 * 咨询「下一步」引擎 — 任何时候只推一件事
 * 原则：做完一步自动露出下一步，不让老板猜该点哪个按钮。
 */
import type { BrandStrategyProject } from "./types";
import { BrandProjectStage } from "./types";
import { evaluateSignOffReadiness } from "./signoff-package";
import { guidedFactCoverage } from "./guided-intake";

export type ConsultingActionId =
  | "discovery.complete"
  | "brief.answer"
  | "brief.compile"
  | "facts.guide"
  | "analysis.run"
  | "category.decide"
  | "insight.confirm"
  | "insight.evidence"
  | "map.evidence"
  | "analysis.confirm"
  | "position.save"
  | "position.hypothesis"
  | "position.evidence"
  | "position.strategic"
  | "position.propose"
  | "position.express"
  | "validation.rehearsal"
  | "validation.confirm"
  | "validation.express"
  | "final.confirmSystem"
  | "final.sign"
  | "final.staffPack"
  | "final.export"
  | "done";

export type ConsultingNextStep = {
  id: string;
  /** 进度感：当前阶段内第几步 */
  stepLabel: string;
  title: string;
  detail: string;
  actionId: ConsultingActionId;
  ctaLabel: string;
  /** 锚点，供页面滚动 */
  anchor?: string;
};

export type ConsultingNextStepContext = {
  /** 访谈 UI：是否可编译 */
  briefReadyToCompile?: boolean;
  /** 是否还有未答简报题 */
  briefHasOpenQuestion?: boolean;
  signedBy?: string;
  /** 签字后是否已引导过店员墙卡 */
  staffPackSeen?: boolean;
};

function factGaps(project: BrandStrategyProject) {
  return guidedFactCoverage(project.assets.evidenceLedger?.facts || []);
}

/**
 * 返回当前唯一推荐下一步。UI 应只高亮这一步的主按钮。
 */
export function resolveConsultingNextStep(
  project: BrandStrategyProject,
  ctx: ConsultingNextStepContext = {},
): ConsultingNextStep {
  const stage = project.stage;
  const a = project.assets;

  if (stage === BrandProjectStage.DISCOVERY) {
    return {
      id: "discovery",
      stepLabel: "第 1 步",
      title: "先点两问，摸清你现在最在意什么",
      detail: "选目标 + 选头疼事，点确认就开始聊品牌。",
      actionId: "discovery.complete",
      ctaLabel: "好，开始聊品牌",
      anchor: "step-main",
    };
  }

  if (stage === BrandProjectStage.BRAND_BRIEF) {
    if (ctx.briefReadyToCompile) {
      return {
        id: "brief_compile",
        stepLabel: "简报 · 收尾",
        title: "五问已齐，一键生成品牌简报",
        detail: "系统会自动补全其余推断字段，并种入分析用事实。",
        actionId: "brief.compile",
        ctaLabel: "生成简报，开始分析",
        anchor: "step-main",
      };
    }
    return {
      id: "brief_answer",
      stepLabel: "简报 · 五问",
      title: "只答这一题（全程共 5 题）",
      detail: "点选即可。不问作文题，不问黑话。",
      actionId: "brief.answer",
      ctaLabel: "去点选",
      anchor: "step-main",
    };
  }

  if (
    stage === BrandProjectStage.CATEGORY_ANALYSIS ||
    stage === BrandProjectStage.CONSUMER_INSIGHT ||
    stage === BrandProjectStage.COMPETITIVE_MAPPING
  ) {
    const coverage = factGaps(project);
    const needStage =
      stage === BrandProjectStage.CATEGORY_ANALYSIS
        ? "CATEGORY_ANALYSIS"
        : stage === BrandProjectStage.CONSUMER_INSIGHT
          ? "CONSUMER_INSIGHT"
          : "COMPETITIVE_MAPPING";
    const stageFacts = (a.evidenceLedger?.facts || []).filter(
      (f) => f.relatedStage === needStage,
    );
    if (stageFacts.length < 1 || !coverage.ok) {
      return {
        id: "facts",
        stepLabel: "分析 · 补事实",
        title: "还差一点点一手事实",
        detail: "五问简报通常已自动带入；若仍缺，点选补齐即可。",
        actionId: "facts.guide",
        ctaLabel: "去补事实",
        anchor: "step-facts",
      };
    }

    const draft =
      stage === BrandProjectStage.CATEGORY_ANALYSIS
        ? a.categoryDiagnosis
        : stage === BrandProjectStage.CONSUMER_INSIGHT
          ? a.consumerInsight
          : a.competitiveMap;

    if (!draft) {
      return {
        id: "analysis_run",
        stepLabel: "分析 · 生成",
        title: "系统出这一步方案",
        detail: "你不用填表；点一下即可生成。",
        actionId: "analysis.run",
        ctaLabel: "生成方案",
        anchor: "step-main",
      };
    }

    if (stage === BrandProjectStage.CATEGORY_ANALYSIS) {
      const d = a.categoryDiagnosis;
      if (!d?.decision?.selectedOptionId) {
        return {
          id: "cat_decide",
          stepLabel: "品类 · 拍板",
          title: "采用系统推荐战场",
          detail: "默认用推荐项；点黑条即选定并准备推进。",
          actionId: "category.decide",
          ctaLabel: "用推荐战场",
          anchor: "step-main",
        };
      }
    }

    if (stage === BrandProjectStage.CONSUMER_INSIGHT) {
      const c = a.consumerInsight;
      const ev = c?.insightEvidence || [];
      const accepted = ev.filter((e) => e.reviewStatus === "accepted").length;
      const pending = ev.filter(
        (e) => !e.reviewStatus || e.reviewStatus === "pending",
      ).length;
      const needConfirm =
        !c?.judgmentConfirmedAt ||
        (c.insightStatement?.trim().length || 0) < 40 ||
        accepted < 2 ||
        pending > 0;
      if (needConfirm) {
        return {
          id: "insight_confirm",
          stepLabel: "洞察 · 一键",
          title: "确认客人洞察（并采纳证据）",
          detail: "系统已写好草稿。一点即确认并采纳证据，不用凑字。",
          actionId: "insight.confirm",
          ctaLabel: "确认洞察",
          anchor: "step-main",
        };
      }
    }

    if (stage === BrandProjectStage.COMPETITIVE_MAPPING) {
      const m = a.competitiveMap;
      const ev = m?.mapEvidence || [];
      const accepted = ev.filter((e) => e.reviewStatus === "accepted").length;
      const pending = ev.filter(
        (e) => !e.reviewStatus || e.reviewStatus === "pending",
      ).length;
      if (accepted < 2 || pending > 0) {
        return {
          id: "map_ev",
          stepLabel: "竞争 · 证据",
          title: "一键采纳地图证据",
          detail: "点黑条即可全部采纳。",
          actionId: "map.evidence",
          ctaLabel: "一键采纳",
          anchor: "step-main",
        };
      }
    }

    return {
      id: "analysis_confirm",
      stepLabel: "分析 · 推进",
      title: "确认，进入下一步",
      detail: "门禁已齐，一点就走。",
      actionId: "analysis.confirm",
      ctaLabel: "进入下一步",
      anchor: "step-main",
    };
  }

  if (stage === BrandProjectStage.POSITIONING_DESIGN) {
    return {
      id: "pos_express",
      stepLabel: "定位 · 一键",
      title: "确认系统定位方案",
      detail: "自动生成主航道、采纳证据并提交。你只需点一下。",
      actionId: "position.express",
      ctaLabel: "确认定位，下一步",
      anchor: "step-main",
    };
  }

  if (stage === BrandProjectStage.POSITION_VALIDATION) {
    return {
      id: "val_express",
      stepLabel: "验证 · 一键",
      title: "对齐店员话术并进入交付",
      detail: "系统按定位自动组句、通过核对并锁定，无需六问手点。",
      actionId: "validation.express",
      ctaLabel: "对齐话术，进入交付",
      anchor: "step-main",
    };
  }

  if (stage === BrandProjectStage.FINAL_STRATEGY) {
    const contract = a.positioningContract;
    const system = a.brandSystem;
    const outline = a.reportOutline;
    const needLockOrConfirm =
      contract?.status !== "frozen" || system?.status !== "complete";

    if (needLockOrConfirm) {
      return {
        id: "final_system",
        stepLabel: "交付 · 1/3",
        title: "确认店里怎么说（并锁定定位）",
        detail: "点一下即可：系统会自动对齐定位并锁定，不用自己改字。",
        actionId: "final.confirmSystem",
        ctaLabel: "确认店里怎么说",
        anchor: "step-main",
      };
    }

    const readiness = evaluateSignOffReadiness(project);
    if (!readiness.ok) {
      // 仍缺证据/报告等：引导回事实或提示重新生成
      const first = readiness.blockers[0] || "清单未齐";
      if (/一手|证据|覆盖/.test(first)) {
        return {
          id: "final_facts",
          stepLabel: "交付 · 补事实",
          title: "还缺一手事实覆盖",
          detail: first + "。回事实区点选补齐后即可签字。",
          actionId: "facts.guide",
          ctaLabel: "去补事实",
          anchor: "step-facts",
        };
      }
      return {
        id: "final_block",
        stepLabel: "交付 · 补齐",
        title: first,
        detail: readiness.blockers.slice(1).join("；") || "按页面提示补这一步。",
        actionId: "final.confirmSystem",
        ctaLabel: "回到确认步骤",
        anchor: "step-main",
      };
    }

    if (outline?.signOffStatus !== "signed") {
      const hasSigner = Boolean(ctx.signedBy?.trim());
      return {
        id: "final_sign",
        stepLabel: "交付 · 2/3",
        title: hasSigner ? "签字确认战略报告" : "填写签字人姓名",
        detail: hasSigner
          ? "点签字即锁定本版报告。"
          : "写下你的名字，再点签字。",
        actionId: "final.sign",
        ctaLabel: hasSigner ? "签字确认战略报告" : "去填签字人",
        anchor: "step-sign",
      };
    }

    const hasStaff = Boolean(
      project.assets.journey?.executionRoadmap?.staffDelivery,
    );
    if (hasStaff && !ctx.staffPackSeen) {
      return {
        id: "final_staff",
        stepLabel: "交付 · 3/4",
        title: "复制/打印店员墙卡",
        detail: "一句话 + 迎客脚本可贴吧台；正式包第 7 节也含此页。",
        actionId: "final.staffPack",
        ctaLabel: "去复制店员墙卡",
        anchor: "step-execution",
      };
    }

    return {
      id: "final_export",
      stepLabel: hasStaff ? "交付 · 4/4" : "交付 · 3/3",
      title: "导出正式签字交付包",
      detail: "含店员交付包（可贴店）。可随时再下载。",
      actionId: "final.export",
      ctaLabel: "导出正式交付包",
      anchor: "step-sign",
    };
  }

  return {
    id: "done",
    stepLabel: "完成",
    title: "本阶段已完成",
    detail: "可以导出交付包或切换品牌重新立项。",
    actionId: "done",
    ctaLabel: "查看交付",
    anchor: "step-sign",
  };
}

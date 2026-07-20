/**
 * 六步价值路径解析 — 决定老板现在该看见哪一步
 */
import type { BrandStrategyProject } from "./types";
import { BrandProjectStage } from "./types";
import {
  MpntJourneyStep,
  MPNT_JOURNEY_LABEL,
  mapStageToJourneyStep,
  type MpntJourneyAssets,
} from "./journey-types";
import { evaluatePositioningIntakeChecklist } from "./positioning-intake-checklist";

export type JourneyNextAction =
  | "intake.continue"
  | "research.run"
  | "research.confirm"
  | "advisors.run"
  | "warroom.open"
  | "warroom.vote"
  | "strategy.confirmReport"
  | "execution.generate"
  | "execution.accept"
  | "staff.pack"
  | "done";

export type JourneyNextStep = {
  step: MpntJourneyStep;
  label: (typeof MPNT_JOURNEY_LABEL)[MpntJourneyStep];
  title: string;
  detail: string;
  actionId: JourneyNextAction;
  ctaLabel: string;
};

export function resolveJourneyAssets(
  project: BrandStrategyProject,
): MpntJourneyAssets {
  const raw = (project.assets as { journey?: MpntJourneyAssets }).journey;
  return raw || {};
}

/**
 * 六步「下一步」——优先看 journey 资产；否则从旧 stage 兜底。
 */
export function resolveMpntJourneyNextStep(
  project: BrandStrategyProject,
  journey: MpntJourneyAssets = resolveJourneyAssets(project),
): JourneyNextStep {
  const stage = project.stage;
  const briefDone = project.assets.brandBrief?.status === "complete";

  const intake = evaluatePositioningIntakeChecklist(project);

  // 步 1：固定档案 + 动态追问未齐，不得进入调研
  if (
    stage === BrandProjectStage.DISCOVERY ||
    stage === BrandProjectStage.BRAND_BRIEF ||
    !briefDone ||
    !intake.canRunMarketResearch
  ) {
    return {
      step: MpntJourneyStep.INTAKE,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.INTAKE],
      title: "先收齐定位所需信息",
      detail:
        "固定基础档案 + 动态追问必须齐；信息不清不能进市场调研。",
      actionId: "intake.continue",
      ctaLabel: "继续信息采集",
    };
  }

  // 步 2：必须先跑联网工具调研
  if (!journey.marketResearch || journey.marketResearch.status === "draft") {
    return {
      step: MpntJourneyStep.MARKET_RESEARCH,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.MARKET_RESEARCH],
      title: "联网采集：区域 / 竞对 / 用户门店",
      detail:
        "通过搜索抓取归集外部数据补全信息——本地推断不能当作调研完成。",
      actionId: "research.run",
      ctaLabel: "开始工具调研",
    };
  }
  if (journey.marketResearch.status !== "confirmed") {
    if (!intake.canConfirmMarketResearch) {
      return {
        step: MpntJourneyStep.MARKET_RESEARCH,
        label: MPNT_JOURNEY_LABEL[MpntJourneyStep.MARKET_RESEARCH],
        title: "调研信息不足，请重跑或补店访",
        detail: intake.summary,
        actionId: "research.run",
        ctaLabel: "重新联网采集",
      };
    }
    return {
      step: MpntJourneyStep.MARKET_RESEARCH,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.MARKET_RESEARCH],
      title: "确认调研，召开战略委员会",
      detail: journey.marketResearch.headline,
      actionId: "research.confirm",
      ctaLabel: "确认并请三位顾问开会",
    };
  }

  // 步 3（若调研已确认但顾问未出，极少见——服务层会串行补齐）
  if (!journey.advisorStrategies) {
    return {
      step: MpntJourneyStep.THREE_ADVISORS,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.THREE_ADVISORS],
      title: "心智官 / 空位官 / 冲突官 各出一策",
      detail: "三位顾问会打架，这是正常的——好定位来自冲突。",
      actionId: "advisors.run",
      ctaLabel: "看三位顾问方案",
    };
  }

  // 步 4
  if (!journey.warRoom || journey.warRoom.status === "open") {
    return {
      step: MpntJourneyStep.WAR_ROOM,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.WAR_ROOM],
      title: "进入四方会议室",
      detail: "三顾问已出策。开会挑战后，由你拍板。",
      actionId: "warroom.open",
      ctaLabel: "开会",
    };
  }
  if (journey.warRoom.status !== "agreed") {
    return {
      step: MpntJourneyStep.WAR_ROOM,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.WAR_ROOM],
      title: "请你表态：认哪一策？",
      detail: "选心智官 / 空位官 / 冲突官，或折中。没有你拍板不能锁定位。",
      actionId: "warroom.vote",
      ctaLabel: "我来拍板",
    };
  }

  // 步 5
  const locked = Boolean(journey.strategyConfirmedAt);
  if (!locked) {
    return {
      step: MpntJourneyStep.STRATEGY_LOCK,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.STRATEGY_LOCK],
      title: "确认定位策略报告",
      detail: journey.warRoom.consensusOneLiner || "把会议共识写成可签字报告，并生成 90 天路径。",
      actionId: "strategy.confirmReport",
      ctaLabel: "确认报告并生成执行路径",
    };
  }

  // 步 6
  if (!journey.executionRoadmap) {
    return {
      step: MpntJourneyStep.EXECUTION_PATH,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.EXECUTION_PATH],
      title: "生成 90 天执行路径",
      detail: "时间节点 + 谁干什么 + 怎样算完成。",
      actionId: "execution.generate",
      ctaLabel: "生成执行路径",
    };
  }
  if (journey.executionRoadmap.status !== "accepted") {
    return {
      step: MpntJourneyStep.EXECUTION_PATH,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.EXECUTION_PATH],
      title: "确认落地执行方案",
      detail: `共 ${journey.executionRoadmap.milestones.length} 个节点，按周推进。`,
      actionId: "execution.accept",
      ctaLabel: "确认执行路径，完成咨询",
    };
  }

  if (journey.executionRoadmap.staffDelivery) {
    return {
      step: MpntJourneyStep.EXECUTION_PATH,
      label: MPNT_JOURNEY_LABEL[MpntJourneyStep.EXECUTION_PATH],
      title: "复制/打印店员墙卡",
      detail: "一句话 + 迎客脚本 + 不做清单——贴吧台，抽检店员只会这一套。",
      actionId: "staff.pack",
      ctaLabel: "去复制店员墙卡",
    };
  }

  return {
    step: MpntJourneyStep.EXECUTION_PATH,
    label: MPNT_JOURNEY_LABEL[MpntJourneyStep.EXECUTION_PATH],
    title: "本轮定位咨询完成",
    detail: "策略已确认，执行路径已就绪。可随时回看会议与报告。",
    actionId: "done",
    ctaLabel: "完成",
  };
}

export function journeyStepFromProject(
  project: BrandStrategyProject,
  journey?: MpntJourneyAssets,
): MpntJourneyStep {
  return resolveMpntJourneyNextStep(project, journey).step;
}

export { mapStageToJourneyStep };

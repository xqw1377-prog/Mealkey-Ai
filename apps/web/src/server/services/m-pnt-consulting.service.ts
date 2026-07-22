﻿/**
 * M-PNT 品牌战略咨询项目 — 服务层
 * 持久化：project.profile.mPntBrandProject
 */
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { resolveActiveBrand } from "@/lib/brand-registry";
import { validateProfile } from "@/lib/profile-schema";
import { updateProjectProfile } from "@/server/services/project-profile";
import {
  BrandProjectStage,
  STAGE_CONTRACTS,
  advance,
  assertCanDesignPositioning,
  createBrandProject,
  writeDiscoveryNotes,
  writeBrandBasics,
  writeAdaptiveFollowups,
  writeBrandBrief,
  upsertBrandBasics,
  generateAdaptiveFollowups,
  answerAdaptiveFollowup,
  compileBrandBriefFromBasics,
  brandBasicsSummaryText,
  BRAND_BASICS_FIELDS,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  writeReportOutline,
  writeBrandSystem,
  writeEvidenceLedger,
  createBriefInterviewSession,
  answerBriefQuestion,
  tryAdvanceBriefLayer,
  compileBrandBrief,
  proposeContract,
  validateContract,
  freezeContract,
  buildStrategyReport,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  selectCategoryBattlefield,
  assertCategoryDecisionReady,
  assertMapAuditable,
  assertInsightAuditable,
  reviewInsightEvidenceItems,
  confirmInsightJudgment,
  draftContractWithHypotheses,
  selectPositioningHypothesis,
  buildBrandSystem,
  confirmBrandSystem,
  buildAlignedStoreCopy,
  markReportInReview,
  signStrategyReport,
  addPrimaryFact,
  removePrimaryFact,
  listFactsForStage,
  countFacts,
  seedPrimaryFactsFromBrief,
  evaluatePositionRehearsal,
  applyRehearsalToContract,
  assertRehearsalPassed,
  buildSignOffPackageMarkdown,
  signOffPackageFilename,
  evaluateSignOffReadiness,
  formatPositioningStatement,
  adjustPlotPoint,
  reviewMapEvidenceItems,
  ContractGateError,
  reviewEvidenceItems,
  composeRetellFromGuideAnswers,
  DEFAULT_REHEARSAL_CHECKLIST,
  BATTLEFIELD_REASON_PRESETS,
  STRATEGIC_CHOICE_PRESETS,
  writeJourneyAssets,
  buildMarketResearchPackAsync,
  confirmMarketResearchPack,
  assertCanRunMarketResearch,
  assertCanConfirmMarketResearch,
  resolveResearchCity,
  seedFactsFromMarketResearchPack,
  evaluatePositioningIntakeChecklist,
  evaluateResearchPillars,
  asToolAdapter,
  applyStoreVisitFill,
  applyWhitespaceSuggestion,
  countFilledStoreVisits,
  type StoreVisitAttachment,
  buildAdvisorStrategiesWithMatrix,
  openWarRoom,
  openWarRoomDebate,
  openWarRoomDebateAsync,
  applyUserVoteToWarRoom,
  buildExecutionRoadmap,
  acceptExecutionRoadmap,
  resolvePrimaryStrategy,
  resolveDecisionOption,
  ensureProofPlan,
  buildPositioningStrategyReportMarkdown,
  ensureWarRoomContractDraft,
  finalizeSixStepStrategyDeliverable,
  buildBrandChallengeBrief,
  buildBusinessRealityMap,
  buildHumanTruthFromInsight,
  attachStrategyOptions,
  type BrandStrategyProject,
  type BriefInterviewSession,
  type BrandBasicsValues,
  type PositioningStatement,
  type PositioningContract,
  type BrandSystem,
  type PrimaryFactRelatedStage,
  type PrimaryFactSourceType,
  type PositionRehearsalChecklist,
  type AdvisorId,
} from "@mealkey/agents/m-pnt/consulting";
import type { TheoryLLMAdapter } from "@mealkey/agents/m-pnt/matrix/types";
import { tryCreateSharedLlmAdapter } from "./llm-polish";
import { getWebSearch } from "@mealkey/knowledge-engine";

const log = createLogger("m-pnt-consulting");

const PROFILE_KEY = "mPntBrandProject";
const INTERVIEW_KEY = "mPntBriefInterview";

/** 三理论矩阵 LLM：有 Key 则 hybrid，无 Key 走启发式商规/维度 */
function tryCreateTheoryLlmAdapter(): TheoryLLMAdapter | undefined {
  if (process.env.HEURISTIC_ONLY === "true") return undefined;
  const llm = tryCreateSharedLlmAdapter();
  if (!llm) return undefined;
  return {
    async chat(params) {
      const res = await llm.chat({
        model: process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-4o-mini",
        temperature: params.temperature ?? 0.3,
        maxTokens: params.maxTokens ?? 2048,
        messages: params.messages as Array<{
          role: "system" | "user" | "assistant" | "tool";
          content: string;
        }>,
      });
      return { content: res.content };
    },
  };
}

/** 为当前分析阶段生成 draft（不推进） */
function applyAnalysisDraft(
  consulting: BrandStrategyProject,
  ctx: {
    brief: NonNullable<BrandStrategyProject["assets"]["brandBrief"]>;
    city: string;
    brandName: string;
  },
): BrandStrategyProject {
  const ledger = consulting.assets.evidenceLedger;
  const { brief, city, brandName } = ctx;
  if (consulting.stage === BrandProjectStage.CATEGORY_ANALYSIS) {
    return writeCategoryDiagnosis(
      consulting,
      buildCategoryDiagnosis({
        brief,
        city,
        brandName,
        primaryFacts: ledger?.facts?.length
          ? ledger.facts
          : listFactsForStage(ledger, "CATEGORY_ANALYSIS"),
      }),
    );
  }
  if (consulting.stage === BrandProjectStage.CONSUMER_INSIGHT) {
    return writeConsumerInsight(
      consulting,
      buildConsumerInsight({
        brief,
        city,
        primaryFacts: listFactsForStage(ledger, "CONSUMER_INSIGHT"),
      }),
    );
  }
  if (consulting.stage === BrandProjectStage.COMPETITIVE_MAPPING) {
    return writeCompetitiveMap(
      consulting,
      buildCompetitiveMap({
        brief,
        city,
        primaryFacts: listFactsForStage(ledger, "COMPETITIVE_MAPPING"),
      }),
    );
  }
  return consulting;
}

async function loadOwnerProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      name: true,
      category: true,
      stage: true,
      city: true,
      district: true,
      profile: true,
      ownerId: true,
    },
  });
  if (!project) throw new Error("项目不存在或无权限");
  return project;
}

/** 校验店访附件归属，仅允许 image/audio */
async function resolveStoreVisitAttachments(
  ownerId: string,
  projectId: string,
  assetIds?: string[],
): Promise<StoreVisitAttachment[]> {
  const ids = [...new Set((assetIds || []).filter(Boolean))].slice(0, 6);
  if (!ids.length) return [];

  const rows = await prisma.asset.findMany({
    where: {
      id: { in: ids },
      ownerId,
      OR: [{ projectId }, { projectId: null }],
    },
    select: {
      id: true,
      kind: true,
      publicUrl: true,
      fileName: true,
      title: true,
      transcript: true,
    },
  });
  if (rows.length !== ids.length) {
    throw new Error("部分附件不存在或无权限");
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: StoreVisitAttachment[] = [];
  for (const id of ids) {
    const row = byId.get(id)!;
    if (row.kind !== "image" && row.kind !== "audio") {
      throw new Error("店访附件仅支持照片或录音");
    }
    out.push({
      assetId: row.id,
      kind: row.kind as "image" | "audio",
      publicUrl: row.publicUrl || `/api/assets/${row.id}/file`,
      fileName: row.fileName,
      title: row.title || undefined,
      transcript: row.transcript?.trim() || undefined,
    });
  }
  return out;
}

function readProfile(raw: string | null) {
  return (validateProfile(raw) as Record<string, unknown>) || {};
}

export async function getOrCreateBrandConsultingProject(
  userId: string,
  projectId: string,
): Promise<{
  consulting: BrandStrategyProject;
  interview: BriefInterviewSession | null;
  stageLabel: string;
  stageContract: (typeof STAGE_CONTRACTS)[BrandProjectStage];
}> {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const brand = resolveActiveBrand(profile, project.name);
  let consulting = profile[PROFILE_KEY] as BrandStrategyProject | undefined;

  // 品牌已切换 / 未绑定 / 绑定不一致 → 一律重建，禁止把旧 journey 贴到新品牌
  const needsRebuild =
    !consulting?.brandProjectId ||
    !consulting.boundBrandId ||
    consulting.boundBrandId !== brand.id;

  if (needsRebuild) {
    consulting = createBrandProject(projectId, brand.id);
    consulting = writeDiscoveryNotes(consulting, {
      status: "draft",
      enterpriseStage: project.stage || undefined,
      category: brand.category || project.category || undefined,
      productSummary: brand.oneLiner || brand.mentalPosition || undefined,
      businessGoal: String(profile.yearlyGoal || profile.currentChallenge || "") || undefined,
      notes: [
        `品牌：${brand.brandName || project.name}`,
        brand.category ? `品类：${brand.category}` : null,
        project.city ? `城市：${project.city}` : null,
        brand.targetCustomers ? `客群：${brand.targetCustomers}` : null,
      ]
        .filter(Boolean)
        .join("；"),
    });
    await persist(project.id, profile, consulting, null);
  }

  if (!consulting) {
    consulting = createBrandProject(projectId, brand.id);
    await persist(project.id, profile, consulting, null);
  }

  const interview = (profile[INTERVIEW_KEY] as BriefInterviewSession | null) || null;

  // 终稿缺 Brand System / 报告正文时补生成
  if (consulting.stage === BrandProjectStage.FINAL_STRATEGY) {
    let dirty = false;
    if (
      consulting.assets.positioningContract &&
      !consulting.assets.brandSystem
    ) {
      consulting = writeBrandSystem(consulting, buildBrandSystem(consulting));
      dirty = true;
    }
    if (
      consulting.assets.positioningContract &&
      !consulting.assets.reportOutline?.fullReportMarkdown
    ) {
      const outline = buildStrategyReport(consulting);
      consulting = writeReportOutline(consulting, outline);
      dirty = true;
    }
    if (dirty) {
      await persist(project.id, profile, consulting, interview);
    }
  }

  // Brief 阶段但无访谈会话时自动创建
  if (
    consulting.stage === BrandProjectStage.BRAND_BRIEF &&
    !interview
  ) {
    const nextInterview = createBriefInterviewSession(consulting.brandProjectId);
    await persist(project.id, profile, consulting, nextInterview);
    return {
      consulting,
      interview: nextInterview,
      stageLabel: STAGE_CONTRACTS[consulting.stage].label,
      stageContract: STAGE_CONTRACTS[consulting.stage],
    };
  }

  const stage = consulting.stage;
  return {
    consulting,
    interview,
    stageLabel: STAGE_CONTRACTS[stage].label,
    stageContract: STAGE_CONTRACTS[stage],
  };
}

async function persist(
  projectId: string,
  _profile: Record<string, unknown>,
  consulting: BrandStrategyProject,
  interview: BriefInterviewSession | null,
  patch?:
    | Record<string, unknown>
    | ((latest: Record<string, unknown>) => Record<string, unknown>),
) {
  const { touchBrandConsultingActivity } = await import("@/lib/brand-registry");
  const writingBrandId = consulting.boundBrandId || null;

  await updateProjectProfile(projectId, (latest) => {
    const latestActiveId =
      typeof latest.activeBrandId === "string" ? latest.activeBrandId : null;

    // 卷宗品牌 ≠ 当前 activeBrand → 放弃写入（防换品牌后旧请求污染）
    if (latestActiveId && writingBrandId && latestActiveId !== writingBrandId) {
      return null;
    }

    const patchFields =
      typeof patch === "function" ? patch(latest) : patch || {};

    const next: Record<string, unknown> = {
      ...latest,
      ...patchFields,
      [PROFILE_KEY]: consulting,
      [INTERVIEW_KEY]: interview,
    };
    if (latestActiveId) {
      next["activeBrandId"] = latestActiveId;
    }

    return touchBrandConsultingActivity(
      next,
      writingBrandId || latestActiveId,
    );
  });
}

/** 保存基础档案草稿（可不完整） */
export async function saveBrandBasics(
  userId: string,
  projectId: string,
  values: BrandBasicsValues,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );

  if (consulting.stage !== BrandProjectStage.DISCOVERY) {
    throw new Error("当前不在基础档案采集阶段");
  }

  const basics = upsertBrandBasics(consulting.assets.brandBasics, values);
  consulting = writeBrandBasics(consulting, basics);
  await persist(project.id, profile, consulting, interview);
  return { consulting, interview, basics };
}

/**
 * 完成 Round A：基础档案 must 齐 → 生成自适应追问 → 进入 BRAND_BRIEF。
 * 旧 completeDiscovery(两问) 已废弃为薄包装，要求传入 basics。
 */
export async function completeDiscovery(
  userId: string,
  projectId: string,
  input?: {
    notes?: string;
    businessGoal?: string;
    basics?: BrandBasicsValues;
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );

  if (consulting.stage !== BrandProjectStage.DISCOVERY) {
    throw new Error("当前不在基础档案采集阶段");
  }

  const patch: BrandBasicsValues = {
    ...(input?.basics || {}),
  };
  if (input?.businessGoal?.trim()) {
    patch.businessGoal = input.businessGoal.trim();
  }
  if (input?.notes?.trim()) {
    patch.mainPain = patch.mainPain || input.notes.trim();
  }

  let basics = upsertBrandBasics(consulting.assets.brandBasics, patch);
  if (basics.missingMust.length > 0) {
    const labels = basics.missingMust
      .map(
        (k) => BRAND_BASICS_FIELDS.find((f) => f.key === k)?.label || k,
      )
      .join("、");
    throw new Error(`基础档案未齐，仍缺：${labels}`);
  }

  consulting = writeBrandBasics(consulting, basics);

  const summary = brandBasicsSummaryText(basics);
  consulting = writeDiscoveryNotes(consulting, {
    artifactId: consulting.assets.discoveryNotes?.artifactId,
    status: "complete",
    category: basics.values.category,
    productSummary: basics.values.currentPositioning,
    businessGoal: basics.values.businessGoal,
    notes: summary,
  });

  const followups = generateAdaptiveFollowups({
    brandProjectId: consulting.brandProjectId,
    basics,
  });
  consulting = writeAdaptiveFollowups(consulting, followups);
  consulting = advance(consulting, "brand_basics_complete");

  await persist(project.id, profile, consulting, interview);
  return { consulting, interview, basics, followups };
}

export async function answerBrief(
  userId: string,
  projectId: string,
  questionId: string,
  answer: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );

  if (consulting.stage !== BrandProjectStage.BRAND_BRIEF) {
    throw new Error("当前不在定位追问阶段");
  }

  // 优先走自适应追问
  const existingFu = consulting.assets.adaptiveFollowups;
  if (existingFu && existingFu.questions.some((q) => q.id === questionId)) {
    const followups = answerAdaptiveFollowup(existingFu, questionId, answer);
    consulting = writeAdaptiveFollowups(consulting, followups);
    await persist(project.id, profile, consulting, interview);
    return { consulting, interview, followups };
  }

  // 兼容旧五问路径
  if (!interview) {
    interview = createBriefInterviewSession(consulting.brandProjectId);
  }
  interview = answerBriefQuestion(interview, questionId, answer);
  interview = tryAdvanceBriefLayer(interview);

  await persist(project.id, profile, consulting, interview);
  return { consulting, interview };
}

export async function compileAndCompleteBrief(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );

  const basics = consulting.assets.brandBasics;
  const followups = consulting.assets.adaptiveFollowups;

  let brief;
  if (basics?.status === "complete" && followups) {
    brief = compileBrandBriefFromBasics({ basics, followups });
    if (brief.status !== "complete") {
      throw new Error(`品牌简报未完成，仍缺：${brief.gaps.join("、")}`);
    }
    consulting = writeAdaptiveFollowups(consulting, {
      ...followups,
      status: "compiled",
    });
  } else {
    if (!interview) throw new Error("尚无访谈记录，请先完成基础档案与定位追问");
    brief = compileBrandBrief(interview);
    if (brief.status !== "complete") {
      throw new Error(`品牌简报未完成，仍缺：${brief.gaps.join("、")}`);
    }
    interview = { ...interview, status: "compiled" };
  }

  consulting = writeBrandBrief(consulting, brief);
  // 简报信号 → 种入一手事实（仍标 needs_verification，不能单独过门禁）
  consulting = writeEvidenceLedger(
    consulting,
    seedPrimaryFactsFromBrief(consulting.assets.evidenceLedger, brief),
  );
  consulting = advance(consulting, "brand_brief_complete");

  // 不在此处伪造「已完成调研」：市场调研必须走联网工具采集
  // 可预生成分析草稿，但 journey.marketResearch 留空，等 runMarketResearchStep
  const brand = resolveActiveBrand(profile, project.name);
  const city = resolveResearchCity(consulting, project.city || undefined);
  consulting = applyAnalysisDraft(consulting, {
    brief,
    city,
    brandName: brand.brandName || project.name,
  });

  // Protocol P0/P1/P3：Challenge + Reality Map + Human Truth 挂入六步资产
  const challengeBrief = buildBrandChallengeBrief({
    basics: consulting.assets.brandBasics,
    brief,
    projectName: project.name,
    city,
  });
  const realityMap = buildBusinessRealityMap({
    basics: consulting.assets.brandBasics,
    brief,
  });
  const humanTruth = consulting.assets.consumerInsight
    ? buildHumanTruthFromInsight(consulting.assets.consumerInsight)
    : consulting.assets.journey?.humanTruth;
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    challengeBrief,
    realityMap,
    humanTruth,
  });

  await persist(project.id, profile, consulting, interview);
  return { consulting, interview, brief, challengeBrief };
}

/** 运行当前分析阶段：仅生成 draft 资产，不推进 */
export async function runCurrentAnalysisStage(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const brief = consulting.assets.brandBrief;
  if (!brief || brief.status !== "complete") {
    throw new Error("请先完成 Brand Brief");
  }

  const brand = resolveActiveBrand(profile, project.name);
  const city = project.city || "目标城市";
  const ledger = consulting.assets.evidenceLedger;

  if (consulting.stage === BrandProjectStage.CATEGORY_ANALYSIS) {
    consulting = writeCategoryDiagnosis(
      consulting,
      buildCategoryDiagnosis({
        brief,
        city,
        brandName: brand.brandName || project.name,
        primaryFacts: ledger?.facts?.length
          ? ledger.facts
          : listFactsForStage(ledger, "CATEGORY_ANALYSIS"),
      }),
    );
  } else if (consulting.stage === BrandProjectStage.CONSUMER_INSIGHT) {
    consulting = writeConsumerInsight(
      consulting,
      buildConsumerInsight({
        brief,
        city,
        primaryFacts: listFactsForStage(ledger, "CONSUMER_INSIGHT"),
      }),
    );
  } else if (consulting.stage === BrandProjectStage.COMPETITIVE_MAPPING) {
    consulting = writeCompetitiveMap(
      consulting,
      buildCompetitiveMap({
        brief,
        city,
        primaryFacts: listFactsForStage(ledger, "COMPETITIVE_MAPPING"),
      }),
    );
  } else {
    throw new Error(`当前阶段「${STAGE_CONTRACTS[consulting.stage].label}」不是可自动分析阶段`);
  }

  await persist(project.id, profile, consulting, interview);
  return { consulting, interview };
}

/** 录入一手事实 */
export async function addConsultingPrimaryFact(
  userId: string,
  projectId: string,
  input: {
    claim: string;
    sourceType: PrimaryFactSourceType;
    relatedStage: PrimaryFactRelatedStage;
    strength?: "strong" | "moderate" | "weak";
    capturedBy?: string;
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  const ledger = addPrimaryFact(consulting.assets.evidenceLedger, input);
  consulting = writeEvidenceLedger(consulting, ledger);
  await persist(project.id, profile, consulting, interview);
  return { consulting, ledger };
}

/** 删除一手事实 */
export async function removeConsultingPrimaryFact(
  userId: string,
  projectId: string,
  factId: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const current = consulting.assets.evidenceLedger;
  if (!current) throw new Error("尚无证据账本");
  const ledger = removePrimaryFact(current, factId);
  consulting = writeEvidenceLedger(consulting, ledger);
  await persist(project.id, profile, consulting, interview);
  return { consulting, ledger };
}

/** 确认当前分析资产并推进到下一阶段 */
export async function confirmCurrentAnalysisStage(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const ledger = consulting.assets.evidenceLedger;

  if (consulting.stage === BrandProjectStage.CATEGORY_ANALYSIS) {
    const asset = consulting.assets.categoryDiagnosis;
    if (!asset) throw new Error("请先运行品类分析，生成可审阅资产");
    try {
      assertCategoryDecisionReady(asset);
    } catch (error) {
      if (error instanceof ContractGateError) {
        throw new Error(
          `咨询门禁未通过：${error.message}（${error.missing.join("；")}）`,
        );
      }
      throw error;
    }
    if (countFacts(ledger, { stage: "CATEGORY_ANALYSIS" }) < 1) {
      throw new Error(
        "品类阶段至少补 1 条已核实事实（简报种子不算；建议：销售笔记 / 门店观察）后再确认",
      );
    }
    consulting = writeCategoryDiagnosis(consulting, {
      ...asset,
      status: "complete",
    });
    consulting = advance(consulting, "category_analysis_confirmed");
  } else if (consulting.stage === BrandProjectStage.CONSUMER_INSIGHT) {
    const asset = consulting.assets.consumerInsight;
    if (!asset) throw new Error("请先运行用户洞察，生成可审阅资产");
    if (countFacts(ledger, { stage: "CONSUMER_INSIGHT" }) < 1) {
      throw new Error(
        "洞察阶段至少补 1 条已核实事实（简报种子不算；建议：用户原话）后再确认",
      );
    }
    try {
      assertInsightAuditable(asset);
    } catch (error) {
      if (error instanceof ContractGateError) {
        throw new Error(
          `咨询门禁未通过：${error.message}（${error.missing.join("；")}）`,
        );
      }
      throw error;
    }
    consulting = writeConsumerInsight(consulting, {
      ...asset,
      status: "complete",
    });
    consulting = advance(consulting, "consumer_insight_confirmed");
  } else if (consulting.stage === BrandProjectStage.COMPETITIVE_MAPPING) {
    const asset = consulting.assets.competitiveMap;
    if (!asset) throw new Error("请先运行竞争地图，生成可审阅资产");
    if (countFacts(ledger, { stage: "COMPETITIVE_MAPPING" }) < 1) {
      throw new Error(
        "竞争阶段至少补 1 条已核实事实（简报种子不算；建议：竞品笔记）后再确认",
      );
    }
    try {
      assertMapAuditable(asset);
    } catch (error) {
      if (error instanceof ContractGateError) {
        throw new Error(
          `咨询门禁未通过：${error.message}（${error.missing.join("；")}）`,
        );
      }
      throw error;
    }
    consulting = writeCompetitiveMap(consulting, {
      ...asset,
      status: "complete",
    });
    consulting = advance(consulting, "competitive_mapping_confirmed");
  } else {
    throw new Error(`当前阶段「${STAGE_CONTRACTS[consulting.stage].label}」无需确认分析资产`);
  }

  if (consulting.stageStatus === "blocked") {
    const hints = consulting.blockedReasons
      .map((r: string) => {
        if (r.includes("evidenceLedger.stageFacts.CATEGORY")) {
          return "品类阶段缺事实";
        }
        if (r.includes("evidenceLedger.stageFacts.CONSUMER")) {
          return "洞察阶段缺事实";
        }
        if (r.includes("evidenceLedger.stageFacts.COMPETITIVE")) {
          return "竞争阶段缺事实";
        }
        if (r.includes("primaryCoverage")) {
          return "事实未覆盖用户/品类/竞争";
        }
        return r;
      })
      .join("；");
    throw new Error(`咨询门禁未通过：${hints}`);
  }

  await persist(project.id, profile, consulting, interview);
  return { consulting, interview };
}

/** 选定品类战场（Category Decision） */
export async function selectBattlefieldDecision(
  userId: string,
  projectId: string,
  optionId: string,
  decisionReason?: string,
  overrideReason?: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.CATEGORY_ANALYSIS) {
    throw new Error("仅品类分析阶段可做战场决策");
  }
  const asset = consulting.assets.categoryDiagnosis;
  if (!asset) throw new Error("请先运行品类分析");

  try {
    const next = selectCategoryBattlefield(asset, optionId, {
      decisionReason,
      overrideReason,
    });
    consulting = writeCategoryDiagnosis(consulting, next);
    await persist(project.id, profile, consulting, interview);
    return { consulting, decision: next.decision };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

/** 纠偏 Positioning Map 坐标点 */
export async function adjustCompetitivePlotPoint(
  userId: string,
  projectId: string,
  pointId: string,
  coords: { x: number; y: number; note?: string },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.COMPETITIVE_MAPPING) {
    throw new Error("仅竞争地图阶段可纠偏坐标");
  }
  const asset = consulting.assets.competitiveMap;
  if (!asset) throw new Error("请先运行竞争地图");

  try {
    const next = adjustPlotPoint(asset, pointId, coords);
    consulting = writeCompetitiveMap(consulting, next);
    await persist(project.id, profile, consulting, interview);
    return { consulting, competitiveMap: next };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

/** 审阅竞争地图证据 */
export async function reviewCompetitiveMapEvidence(
  userId: string,
  projectId: string,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.COMPETITIVE_MAPPING) {
    throw new Error("仅竞争地图阶段可审阅地图证据");
  }
  const asset = consulting.assets.competitiveMap;
  if (!asset) throw new Error("请先运行竞争地图");

  try {
    const next = reviewMapEvidenceItems(asset, reviews);
    consulting = writeCompetitiveMap(consulting, next);
    await persist(project.id, profile, consulting, interview);
    return { consulting, competitiveMap: next };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

/** 审阅用户洞察证据 */
export async function reviewConsumerInsightEvidence(
  userId: string,
  projectId: string,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.CONSUMER_INSIGHT) {
    throw new Error("仅用户洞察阶段可审阅洞察证据");
  }
  const asset = consulting.assets.consumerInsight;
  if (!asset) throw new Error("请先运行用户洞察");

  try {
    const next = reviewInsightEvidenceItems(asset, reviews);
    consulting = writeConsumerInsight(consulting, next);
    await persist(project.id, profile, consulting, interview);
    return { consulting, consumerInsight: next };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

/** 创始人编辑并确认洞察判断 */
export async function confirmConsumerInsightJudgment(
  userId: string,
  projectId: string,
  input: {
    insightStatement: string;
    primaryUnmetNeed?: string;
    emotionalJob?: string;
    functionalJob?: string;
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.CONSUMER_INSIGHT) {
    throw new Error("仅用户洞察阶段可确认洞察判断");
  }
  const asset = consulting.assets.consumerInsight;
  if (!asset) throw new Error("请先运行用户洞察");

  try {
    const next = confirmInsightJudgment(asset, input);
    consulting = writeConsumerInsight(consulting, next);
    await persist(project.id, profile, consulting, interview);
    return { consulting, consumerInsight: next };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

export async function savePositioningDraft(
  userId: string,
  projectId: string,
  statement: PositioningStatement,
  extras?: {
    strategicChoice?: string;
    rejectedAlternatives?: PositioningContract["rejectedAlternatives"];
    refreshEvidence?: boolean;
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  assertCanDesignPositioning(consulting);
  if (consulting.stage !== BrandProjectStage.POSITIONING_DESIGN) {
    // 允许在设计阶段草稿；若卡在竞争完成后未 advance，先尝试
    if (consulting.stage === BrandProjectStage.COMPETITIVE_MAPPING) {
      consulting = advance(consulting, "force_to_positioning");
    }
  }

  const existing = consulting.assets.positioningContract;
  let contract: PositioningContract;
  if (
    existing?.status === "draft" &&
    existing.supportingEvidence.length > 0 &&
    !extras?.refreshEvidence
  ) {
    contract = {
      ...existing,
      statement,
      strategicChoice:
        extras?.strategicChoice?.trim() || existing.strategicChoice,
      rejectedAlternatives: extras?.rejectedAlternatives?.length
        ? extras.rejectedAlternatives
        : existing.rejectedAlternatives,
    };
  } else {
    contract = draftContractWithHypotheses(consulting, statement);
    if (extras?.strategicChoice?.trim()) {
      contract = { ...contract, strategicChoice: extras.strategicChoice.trim() };
    }
    if (extras?.rejectedAlternatives?.length) {
      contract = {
        ...contract,
        rejectedAlternatives: extras.rejectedAlternatives,
      };
    }
  }
  consulting = writePositioningContract(consulting, contract);
  await persist(project.id, profile, consulting, interview);
  return {
    consulting,
    contract,
    statementText: formatPositioningStatement(statement),
  };
}

export async function proposePositioning(
  userId: string,
  projectId: string,
  statement: PositioningStatement,
  extras?: {
    strategicChoice?: string;
    rejectedAlternatives?: PositioningContract["rejectedAlternatives"];
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  const existing = consulting.assets.positioningContract;
  let contract: PositioningContract;
  if (existing && existing.status === "draft") {
    // 保留人工审阅过的证据，只更新陈述与战略选择
    contract = {
      ...existing,
      statement,
      strategicChoice:
        extras?.strategicChoice?.trim() ||
        existing.strategicChoice ||
        "基于竞争空位与用户未满足需求的战略选择",
      rejectedAlternatives: extras?.rejectedAlternatives?.length
        ? extras.rejectedAlternatives
        : existing.rejectedAlternatives,
    };
  } else {
    contract = draftContractWithHypotheses(consulting, statement);
    if (extras?.strategicChoice?.trim()) {
      contract = { ...contract, strategicChoice: extras.strategicChoice.trim() };
    }
    if (extras?.rejectedAlternatives?.length) {
      contract = {
        ...contract,
        rejectedAlternatives: extras.rejectedAlternatives,
      };
    }
  }
  contract = proposeContract(consulting, contract);
  consulting = writePositioningContract(consulting, contract);
  consulting = advance(consulting, "positioning_proposed");

  await persist(project.id, profile, consulting, interview);
  return { consulting, contract };
}

export async function reviewPositioningEvidence(
  userId: string,
  projectId: string,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const current = consulting.assets.positioningContract;
  if (!current) throw new Error("尚无定位合同草稿，请先保存合同草案");

  const contract = reviewEvidenceItems(current, reviews);
  consulting = writePositioningContract(consulting, contract);
  await persist(project.id, profile, consulting, interview);
  return { consulting, contract };
}

/** 选定定位假设（多假设压力测试） */
export async function selectHypothesisDecision(
  userId: string,
  projectId: string,
  hypothesisId: string,
  overrideReason?: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.POSITIONING_DESIGN) {
    throw new Error("仅定位设计阶段可选定假设");
  }
  let contract = consulting.assets.positioningContract;
  if (!contract || contract.status !== "draft") {
    throw new Error("请先保存合同草稿以生成定位假设");
  }
  if (!contract.hypotheses?.length) {
    contract = draftContractWithHypotheses(consulting, contract.statement);
  }
  try {
    contract = selectPositioningHypothesis(contract, hypothesisId, {
      overrideReason,
    });
    consulting = writePositioningContract(consulting, contract);
    await persist(project.id, profile, consulting, interview);
    return { consulting, contract };
  } catch (error) {
    if (error instanceof ContractGateError) {
      throw new Error(`${error.message}（${error.missing.join("；")}）`);
    }
    throw error;
  }
}

export async function submitPositionRehearsal(
  userId: string,
  projectId: string,
  input: {
    founderRetell: string;
    checklist: PositionRehearsalChecklist;
  },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.POSITION_VALIDATION) {
    throw new Error("仅定位验证阶段可做可复述测试");
  }
  const current = consulting.assets.positioningContract;
  if (!current) throw new Error("尚无定位合同");

  const rehearsal = evaluatePositionRehearsal({
    statement: current.statement,
    founderRetell: input.founderRetell,
    checklist: input.checklist,
  });
  const contract = applyRehearsalToContract(current, rehearsal);
  consulting = writePositioningContract(consulting, contract);
  await persist(project.id, profile, consulting, interview);
  return { consulting, contract, rehearsal };
}

export async function validatePositioning(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const current = consulting.assets.positioningContract;
  if (!current) throw new Error("尚无定位合同");

  assertRehearsalPassed(current);
  // 验证后直接冻结，避免老板进到交付页却卡在「合同未冻结」
  let contract = validateContract(current);
  contract = freezeContract(contract);
  consulting = writePositioningContract(consulting, contract);

  if (!consulting.assets.brandSystem) {
    consulting = writeBrandSystem(consulting, buildBrandSystem(consulting));
  }
  if (!consulting.assets.reportOutline) {
    const outline = buildStrategyReport(consulting);
    consulting = writeReportOutline(consulting, {
      ...outline,
      version: 1,
      signOffStatus: "draft",
    });
  }

  consulting = advance(consulting, "positioning_validated");
  if (consulting.stage !== BrandProjectStage.FINAL_STRATEGY) {
    consulting = {
      ...consulting,
      stage: BrandProjectStage.FINAL_STRATEGY,
      stageStatus: "active",
      blockedReasons: [],
      updatedAt: new Date().toISOString(),
    };
  }

  await persist(project.id, profile, consulting, interview);
  return { consulting, contract };
}

export async function freezePositioning(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const current = consulting.assets.positioningContract;
  if (!current) throw new Error("尚无定位合同");

  assertRehearsalPassed(current);
  const contract = freezeContract(current);
  consulting = writePositioningContract(consulting, contract);

  // 进入终稿：Brand System + 战略报告（待确认与签字）
  if (
    consulting.stage === BrandProjectStage.POSITION_VALIDATION ||
    consulting.stage === BrandProjectStage.FINAL_STRATEGY ||
    contract.status === "frozen"
  ) {
    const system = buildBrandSystem(consulting);
    consulting = writeBrandSystem(consulting, system);
    const outline = buildStrategyReport(consulting);
    consulting = writeReportOutline(consulting, {
      ...outline,
      version: 1,
      signOffStatus: "draft",
    });
    consulting = {
      ...consulting,
      stage: BrandProjectStage.FINAL_STRATEGY,
      stageStatus: "active",
      blockedReasons: [],
      updatedAt: new Date().toISOString(),
    };
  }

  // 同步一句话到 profile.mPnt 供其他模块读取（基于最新 profile 合并）
  const statementText = formatPositioningStatement(contract.statement);
  await persist(project.id, profile, consulting, interview, (latest) => ({
    mPnt: {
      ...(typeof latest.mPnt === "object" && latest.mPnt
        ? (latest.mPnt as Record<string, unknown>)
        : {}),
      oneLiner: `${contract.statement.ourBrandIs} · ${contract.statement.thatValue}`,
      positioningContract: contract,
      brandSystem: consulting.assets.brandSystem,
      statementText,
      source: "m-pnt-consulting",
      updatedAt: new Date().toISOString(),
    },
  }));
  return { consulting, contract, statementText };
}

/** 确认 Brand System 最小集 */
export async function confirmBrandSystemDeliverable(
  userId: string,
  projectId: string,
  patch?: Partial<
    Pick<
      BrandSystem,
      | "valueProposition"
      | "forbiddenPhrases"
      | "communicationLine"
      | "productMappings"
      | "toneNotes"
      | "experienceNonNegotiables"
    >
  >,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.FINAL_STRATEGY) {
    throw new Error("仅战略交付阶段可确认 Brand System");
  }

  // 交付页若合同仍未冻结（旧路径只点了「确认验证」），确认体系时一并锁定
  let contract = consulting.assets.positioningContract;
  if (contract && contract.status !== "frozen") {
    if (contract.rehearsal?.status === "passed") {
      if (contract.status === "proposed") {
        contract = validateContract(contract);
      }
      contract = freezeContract(contract);
      consulting = writePositioningContract(consulting, contract);
    } else if (!["validated", "frozen"].includes(contract.status)) {
      throw new Error("请先完成店员话术核对，再确认店里怎么说");
    }
  }

  let system = consulting.assets.brandSystem;
  if (!system) {
    system = buildBrandSystem(consulting);
  }
  const statement = consulting.assets.positioningContract?.statement;
  const aligned = statement ? buildAlignedStoreCopy(statement) : null;
  system = confirmBrandSystem(system, consulting, {
    ...patch,
    // 客户端文案可随意；确认引擎会在不一致时自动对齐
    valueProposition:
      patch?.valueProposition ||
      system.valueProposition ||
      aligned?.valueProposition,
    communicationLine:
      patch?.communicationLine ||
      system.communicationLine ||
      aligned?.communicationLine,
    productMappings:
      patch?.productMappings ||
      (statement
        ? (system.productMappings || []).map((m, i) =>
            i === 0
              ? { ...m, provesBecause: statement.because || m.provesBecause }
              : m,
          )
        : undefined),
  });
  consulting = writeBrandSystem(consulting, system);

  // 确认后重生成报告第 07 章
  const outline = buildStrategyReport(consulting);
  consulting = writeReportOutline(consulting, {
    ...outline,
    version: (consulting.assets.reportOutline?.version || 1) + 1,
    signOffStatus: "in_review",
  });

  await persist(project.id, profile, consulting, interview);
  return { consulting, brandSystem: system };
}

/** 创始人签字确认战略报告 */
export async function signFinalStrategyReport(
  userId: string,
  projectId: string,
  input: { signedBy: string; note?: string },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.FINAL_STRATEGY) {
    throw new Error("仅战略交付阶段可签字");
  }
  if (consulting.assets.brandSystem?.status !== "complete") {
    throw new Error("请先确认 Brand System，再签字交付");
  }
  const readiness = evaluateSignOffReadiness(consulting);
  if (!readiness.ok) {
    throw new Error(`签字前未就绪：${readiness.blockers.join("；")}`);
  }
  const outline = consulting.assets.reportOutline;
  if (!outline) throw new Error("尚无战略报告");

  const reviewed = markReportInReview(outline);
  const signed = signStrategyReport(reviewed, input, consulting);
  consulting = writeReportOutline(consulting, signed);
  consulting = {
    ...consulting,
    stageStatus: "complete",
    blockedReasons: [],
    updatedAt: new Date().toISOString(),
  };

  const nextProfile = {
    ...profile,
    mPnt: {
      ...(typeof profile.mPnt === "object" && profile.mPnt
        ? (profile.mPnt as Record<string, unknown>)
        : {}),
      reportSigned: true,
      reportVersion: signed.version,
      signedAt: signed.signedAt,
      brandSystem: consulting.assets.brandSystem,
      source: "m-pnt-consulting",
      updatedAt: new Date().toISOString(),
    },
  };

  await persist(project.id, nextProfile, consulting, interview);
  return { consulting, reportOutline: signed };
}

/** 导出签字交付包 Markdown（preview=true 时允许未签字预览草稿） */
export async function exportSignOffPackage(
  userId: string,
  projectId: string,
  opts?: { preview?: boolean },
) {
  await loadOwnerProject(userId, projectId);
  const { consulting } = await getOrCreateBrandConsultingProject(userId, projectId);
  if (consulting.stage !== BrandProjectStage.FINAL_STRATEGY) {
    throw new Error("仅战略交付阶段可导出签字包");
  }
  const preview = Boolean(opts?.preview);
  const signed = consulting.assets.reportOutline?.signOffStatus === "signed";
  if (!preview && !signed) {
    throw new Error("请先签字，再导出方案；或先预览草稿");
  }
  const markdown = buildSignOffPackageMarkdown(consulting, {
    preview: preview || !signed,
  });
  const filename = signOffPackageFilename(consulting, {
    preview: preview || !signed,
  });
  return {
    markdown,
    filename,
    version: consulting.assets.reportOutline?.version || 1,
    preview: preview || !signed,
    readiness: evaluateSignOffReadiness(consulting),
  };
}

export async function regenerateFinalReport(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);

  if (consulting.stage !== BrandProjectStage.FINAL_STRATEGY) {
    throw new Error("仅战略交付阶段可重生成报告");
  }
  if (consulting.assets.reportOutline?.signOffStatus === "signed") {
    throw new Error("报告已签字，禁止覆盖；如需修订请重置咨询项目");
  }
  if (!consulting.assets.brandSystem) {
    consulting = writeBrandSystem(consulting, buildBrandSystem(consulting));
  }
  const outline = buildStrategyReport(consulting);
  consulting = writeReportOutline(consulting, {
    ...outline,
    version: (consulting.assets.reportOutline?.version || 1) + 1,
    signOffStatus: consulting.assets.brandSystem?.status === "complete" ? "in_review" : "draft",
  });
  await persist(project.id, profile, consulting, interview);
  return { consulting, reportOutline: consulting.assets.reportOutline };
}

export async function resetBrandConsulting(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const brand = resolveActiveBrand(profile, project.name);
  const consulting = createBrandProject(projectId, brand.id);
  await persist(project.id, profile, consulting, null);
  return { consulting, interview: null };
}

// ——— 六步价值路径（老板主叙事）———

/** 步 2：生成/刷新市场调研包；尽量先补齐三分析草稿 */
export async function runMarketResearchStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const brief = consulting.assets.brandBrief;
  if (!brief || brief.status !== "complete") {
    throw new Error("请先完成信息采集（品牌简报）");
  }
  assertCanRunMarketResearch(consulting);

  const brand = resolveActiveBrand(profile, project.name);
  const city = resolveResearchCity(consulting, project.city || undefined);
  if (!city || city === "目标城市") {
    throw new Error(
      "区域信息不足：请在基础档案填写具体城市/商圈后再跑联网调研",
    );
  }
  const ctx = {
    brief,
    city,
    brandName: brand.brandName || project.name,
  };

  // 若还在分析阶段且缺草稿，尽量生成，让调研更厚
  if (
    consulting.stage === BrandProjectStage.CATEGORY_ANALYSIS &&
    !consulting.assets.categoryDiagnosis
  ) {
    consulting = writeCategoryDiagnosis(
      consulting,
      buildCategoryDiagnosis({
        brief,
        city,
        brandName: ctx.brandName,
        primaryFacts: consulting.assets.evidenceLedger?.facts || [],
      }),
    );
  }
  if (
    consulting.stage === BrandProjectStage.CONSUMER_INSIGHT &&
    !consulting.assets.consumerInsight
  ) {
    consulting = writeConsumerInsight(
      consulting,
      buildConsumerInsight({
        brief,
        city,
        primaryFacts: listFactsForStage(
          consulting.assets.evidenceLedger,
          "CONSUMER_INSIGHT",
        ),
      }),
    );
  }
  if (
    consulting.stage === BrandProjectStage.COMPETITIVE_MAPPING &&
    !consulting.assets.competitiveMap
  ) {
    consulting = writeCompetitiveMap(
      consulting,
      buildCompetitiveMap({
        brief,
        city,
        primaryFacts: listFactsForStage(
          consulting.assets.evidenceLedger,
          "COMPETITIVE_MAPPING",
        ),
      }),
    );
  }

  // 即便仍停在品类阶段，也尽量用已有/临时草稿合成调研
  let category = consulting.assets.categoryDiagnosis;
  let consumer = consulting.assets.consumerInsight;
  let map = consulting.assets.competitiveMap;
  if (!category) {
    category = buildCategoryDiagnosis({
      brief,
      city,
      brandName: ctx.brandName,
      primaryFacts: consulting.assets.evidenceLedger?.facts || [],
    });
  }
  if (!consumer) {
    consumer = buildConsumerInsight({
      brief,
      city,
      primaryFacts: listFactsForStage(
        consulting.assets.evidenceLedger,
        "CONSUMER_INSIGHT",
      ),
    });
  }
  if (!map) {
    map = buildCompetitiveMap({
      brief,
      city,
      primaryFacts: listFactsForStage(
        consulting.assets.evidenceLedger,
        "COMPETITIVE_MAPPING",
      ),
    });
  }

  const search = getWebSearch();
  // 查询已并行+精简；本机给足时间，超时后仍尽量落盘 draft 而不是空手报错
  const researchBudgetMs = 75_000;
  const researchStartedAt = Date.now();
  let searchCallsBlocked = false;
  const toolAdapter = asToolAdapter(async ({ query, limit, region }) => {
    if (Date.now() - researchStartedAt > researchBudgetMs) {
      searchCallsBlocked = true;
      return [];
    }
    const rows = await search.search({
      query,
      limit: limit ?? 3,
      region: region || city,
      language: "zh-cn",
    });
    return rows.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      source: r.source,
    }));
  });

  const pack = await buildMarketResearchPackAsync({
    brief,
    category,
    consumer,
    map,
    city,
    district:
      project.district ||
      consulting.assets.brandBasics?.values?.region ||
      undefined,
    brandName: ctx.brandName,
    projectStage: String(project.stage || consulting.stage || ""),
    searchAdapter: toolAdapter,
  });

  // 有可追溯来源 → 写入证据账本
  if ((pack.sources?.length || 0) > 0) {
    const ledger = seedFactsFromMarketResearchPack(
      consulting.assets.evidenceLedger,
      pack,
      addPrimaryFact,
    );
    consulting = writeEvidenceLedger(consulting, ledger);
  }

  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    marketResearch: pack,
  });
  await persist(project.id, profile, consulting, interview);

  if (pack.status !== "ready") {
    const pillarMiss =
      pack.pillarCoverage?.missing?.join("、") || "区域/竞对/用户门店";
    const providers = search.activeProviders.join("+") || "none";
    const last = search.getLastAttempt();
    const timeoutHint = searchCallsBlocked
      ? "部分查询因耗时预算中止；"
      : "";
    const hint =
      (pack.sources?.length || 0) === 0
        ? `${timeoutHint}当前搜索源 ${providers} 未返回结果${last?.hitProvider ? "" : "（全部落空）"}。请在本机 http://localhost:3004 重试，或配置 SEARXNG_URL / SERPAPI_KEY；`
        : `${timeoutHint}可补店访观察加强一手证据；`;
    throw new Error(
      `联网采集不足（模式 ${pack.collectionMode || "unknown"}，来源 ${(pack.sources || []).length} 条；三柱缺：${pillarMiss}）。${hint}本地推断不能当作调研完成。`,
    );
  }

  return { consulting, marketResearch: pack };
}

export async function confirmMarketResearchStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  let pack = consulting.assets.journey?.marketResearch;

  // 禁止用「自动跑一把本地推断」伪装确认
  if (!pack || pack.status === "draft") {
    const ran = await runMarketResearchStep(userId, projectId);
    consulting = ran.consulting;
    pack = ran.marketResearch;
  }

  assertCanConfirmMarketResearch(consulting);

  const confirmed = confirmMarketResearchPack(pack);
  const city = resolveResearchCity(consulting, project.city || undefined);
  let advisors = await buildAdvisorStrategiesWithMatrix(
    consulting,
    confirmed,
    city,
    { llm: tryCreateTheoryLlmAdapter() },
  );
  advisors = attachStrategyOptions(advisors);
  const debated = await openWarRoomDebateAsync(advisors, {
    llm: tryCreateTheoryLlmAdapter(),
  });
  const debatedSet = attachStrategyOptions(debated.set);
  const humanTruth = consulting.assets.consumerInsight
    ? buildHumanTruthFromInsight(consulting.assets.consumerInsight)
    : consulting.assets.journey?.humanTruth;
  const challengeBrief =
    consulting.assets.journey?.challengeBrief ||
    buildBrandChallengeBrief({
      basics: consulting.assets.brandBasics,
      brief: consulting.assets.brandBrief,
      projectName: project.name,
      city,
    });
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    marketResearch: confirmed,
    advisorStrategies: debatedSet,
    warRoom: debated.room,
    humanTruth,
    challengeBrief,
  });
  await persist(project.id, profile, consulting, interview);
  return {
    consulting,
    marketResearch: confirmed,
    advisorStrategies: debatedSet,
    warRoom: debated.room,
    intakeChecklist: evaluatePositioningIntakeChecklist(consulting),
  };
}

/**
 * 店访回填：更新竞对三联 + 店访计划；证据变硬后清下游顾问/会议，提示重跑
 */
export async function fillStoreVisitStep(
  userId: string,
  projectId: string,
  fill: {
    rivalName: string;
    observedMentalWord: string;
    evidenceSentence: string;
    threatToWhitespace?: string;
    checkedItems?: string[];
    note?: string;
    /** Asset ids（照片/录音），服务端校验归属后写入 */
    assetIds?: string[];
  },
  options?: { rerunAdvisors?: boolean },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );
  const pack = consulting.assets.journey?.marketResearch;
  if (!pack) throw new Error("请先生成市场调研");

  const attachments = await resolveStoreVisitAttachments(
    project.ownerId,
    projectId,
    fill.assetIds,
  );

  const updated = applyStoreVisitFill(pack, {
    rivalName: fill.rivalName,
    observedMentalWord: fill.observedMentalWord,
    evidenceSentence: fill.evidenceSentence,
    threatToWhitespace: fill.threatToWhitespace,
    checkedItems: fill.checkedItems,
    note: fill.note,
    attachments,
  });
  const filledCount = countFilledStoreVisits(updated);

  // 店访是真一手：写入账本（可补齐用户/竞对侧清单）
  consulting = writeEvidenceLedger(
    consulting,
    addPrimaryFact(consulting.assets.evidenceLedger, {
      claim: `【店访·${fill.rivalName}】心智「${fill.observedMentalWord}」：${fill.evidenceSentence}`.slice(
        0,
        240,
      ),
      sourceType: "store_observation",
      relatedStage: "COMPETITIVE_MAPPING",
      strength: "strong",
      tags: ["market_tool", "store_visit"],
      verificationStatus: "verified",
    }),
  );
  consulting = writeEvidenceLedger(
    consulting,
    addPrimaryFact(consulting.assets.evidenceLedger, {
      claim: `【店访·用户侧】对比${fill.rivalName}时观察到：${fill.evidenceSentence}`.slice(
        0,
        240,
      ),
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
      strength: "moderate",
      tags: ["market_tool", "store_visit"],
      verificationStatus: "verified",
    }),
  );

  // 店访补强后重算三柱；齐则可升 ready
  const pillars = evaluateResearchPillars({
    pack: updated,
    storeVisitFilled: filledCount,
  });
  let researchPack = {
    ...updated,
    pillarCoverage: {
      evaluatedAt: pillars.evaluatedAt,
      allOk: pillars.allOk,
      missing: pillars.missing,
      summary: pillars.summary,
      pillars: pillars.pillars.map((p) => ({
        id: p.id,
        label: p.label,
        ok: p.ok,
        hitCount: p.hitCount,
        requiredHits: p.requiredHits,
        detail: p.detail,
      })),
    },
  };
  if (
    researchPack.status !== "confirmed" &&
    (researchPack.collectionMode === "live_crawl" ||
      researchPack.collectionMode === "hybrid") &&
    (researchPack.sources?.length || 0) >= 3 &&
    pillars.allOk
  ) {
    researchPack = { ...researchPack, status: "ready" };
  }

  let journey = {
    ...consulting.assets.journey,
    marketResearch: researchPack,
    // 证据升级：旧顾问/会议作废，避免拍板看过期案卷
    advisorStrategies: undefined,
    warRoom: undefined,
    strategyReportMarkdown: undefined,
    strategyConfirmedAt: undefined,
    executionRoadmap: undefined,
  };

  consulting = writeJourneyAssets(consulting, journey);

  if (options?.rerunAdvisors) {
    assertCanConfirmMarketResearch(consulting);
    const research =
      researchPack.status === "confirmed"
        ? researchPack
        : confirmMarketResearchPack(researchPack);
    const advisors = await buildAdvisorStrategiesWithMatrix(
      consulting,
      research,
      resolveResearchCity(consulting, project.city || undefined),
      { llm: tryCreateTheoryLlmAdapter() },
    );
    const debated = await openWarRoomDebateAsync(advisors, {
      llm: tryCreateTheoryLlmAdapter(),
    });
    consulting = writeJourneyAssets(consulting, {
      ...consulting.assets.journey,
      marketResearch: research,
      advisorStrategies: debated.set,
      warRoom: debated.room,
    });
    await persist(project.id, profile, consulting, interview);
    return {
      consulting,
      marketResearch: research,
      advisorStrategies: debated.set,
      warRoom: debated.room,
      filledCount: countFilledStoreVisits(research),
      downstreamCleared: true,
      advisorsReran: true,
    };
  }

  await persist(project.id, profile, consulting, interview);
  return {
    consulting,
    marketResearch: researchPack,
    filledCount,
    downstreamCleared: true,
    advisorsReran: false,
  };
}

/**
 * 采纳店访空位修正建议：写回 whitespace，清下游顾问/会议
 */
export async function adoptWhitespaceSuggestionStep(
  userId: string,
  projectId: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(
    userId,
    projectId,
  );
  const pack = consulting.assets.journey?.marketResearch;
  if (!pack) throw new Error("请先生成市场调研");
  if (!pack.storeVisitInsight?.whitespaceSuggestion) {
    throw new Error("尚无空位修正建议，请先回填店访");
  }
  const suggestion = pack.storeVisitInsight.whitespaceSuggestion;
  if (suggestion.severity === "keep") {
    throw new Error("当前建议为维持空位，无需采纳");
  }

  const updated = applyWhitespaceSuggestion(pack, suggestion);
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    marketResearch: updated,
    advisorStrategies: undefined,
    warRoom: undefined,
    strategyReportMarkdown: undefined,
    strategyConfirmedAt: undefined,
    executionRoadmap: undefined,
  });
  await persist(project.id, profile, consulting, interview);
  return {
    consulting,
    marketResearch: updated,
    adoptedWhitespace: updated.whitespace,
    downstreamCleared: true,
  };
}

export async function runAdvisorStrategiesStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  let research = consulting.assets.journey?.marketResearch;
  if (!research || research.status === "draft") {
    const ran = await runMarketResearchStep(userId, projectId);
    consulting = ran.consulting;
    research = ran.marketResearch;
  }
  assertCanConfirmMarketResearch(consulting);
  if (research.status !== "confirmed") {
    research = confirmMarketResearchPack(research);
  }
  let set = await buildAdvisorStrategiesWithMatrix(
    consulting,
    research,
    resolveResearchCity(consulting, project.city || undefined),
    { llm: tryCreateTheoryLlmAdapter() },
  );
  set = attachStrategyOptions(set);
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    marketResearch: research,
    advisorStrategies: set,
  });
  await persist(project.id, profile, consulting, interview);
  return { consulting, advisorStrategies: set };
}

export async function openWarRoomStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  let set = consulting.assets.journey?.advisorStrategies;
  if (!set) {
    const ran = await runAdvisorStrategiesStep(userId, projectId);
    consulting = ran.consulting;
    set = ran.advisorStrategies;
  }
  const debated = await openWarRoomDebateAsync(set, {
    llm: tryCreateTheoryLlmAdapter(),
  });
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    advisorStrategies: attachStrategyOptions(debated.set),
    warRoom: debated.room,
  });
  await persist(project.id, profile, consulting, interview);
  return { consulting, warRoom: debated.room };
}

export async function voteWarRoomStep(
  userId: string,
  projectId: string,
  preference: AdvisorId | "blend",
  blendNote?: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  let room = consulting.assets.journey?.warRoom;
  const set = consulting.assets.journey?.advisorStrategies;
  if (!set) throw new Error("请先生成三位顾问方案");
  if (!room || room.status === "open") {
    const debated = await openWarRoomDebateAsync(set, {
      llm: tryCreateTheoryLlmAdapter(),
    });
    room = debated.room;
    consulting = writeJourneyAssets(consulting, {
      ...consulting.assets.journey,
      advisorStrategies: debated.set,
      warRoom: debated.room,
    });
  }
  const agreed = applyUserVoteToWarRoom(
    room,
    consulting.assets.journey?.advisorStrategies || set,
    preference,
    blendNote,
  );
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    warRoom: agreed,
  });

  // 共识必须写入定位合同草稿（不再吞错；失败时回退最小草稿）
  if (agreed.consensusStatement) {
    consulting = ensureWarRoomContractDraft(consulting, agreed);
  }

  await persist(project.id, profile, consulting, interview);
  return { consulting, warRoom: agreed };
}

export async function generateExecutionPathStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const war = consulting.assets.journey?.warRoom;
  const advisors = consulting.assets.journey?.advisorStrategies;
  const primary = resolvePrimaryStrategy(advisors, war);
  const decisionOption = resolveDecisionOption(war, primary);
  const line =
    war?.consensusOneLiner ||
    primary?.oneLiner ||
    consulting.assets.positioningContract?.statement?.thatValue ||
    "已确认品牌定位";
  const roadmap = buildExecutionRoadmap({
    positioningOneLiner: line,
    battlefield:
      primary?.battlefield || war?.consensusStatement?.ourBrandIs,
    forWhom: primary?.forWhom || war?.consensusStatement?.forAudience,
    proofPlan: primary ? ensureProofPlan(primary) : undefined,
    doNotDo: primary?.doNotDo,
    sacrifice: primary?.sacrifice,
    decisionOption,
    decisionCard: war?.decisionCard,
    primaryStrategy: primary,
  });
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    executionRoadmap: roadmap,
  });
  await persist(project.id, profile, consulting, interview);
  return { consulting, executionRoadmap: roadmap };
}

export async function acceptExecutionPathStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const current = consulting.assets.journey?.executionRoadmap;
  if (!current) throw new Error("请先生成执行路径");
  const accepted = acceptExecutionRoadmap(current);
  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    executionRoadmap: accepted,
  });
  await persist(project.id, profile, consulting, interview);
  return { consulting, executionRoadmap: accepted };
}

/** 步 5：确认会议共识 → 冻结合同 / Brand System / 签字就绪报告 / FINAL_STRATEGY */
export async function confirmStrategyReportStep(userId: string, projectId: string) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, interview } = await getOrCreateBrandConsultingProject(userId, projectId);
  const war = consulting.assets.journey?.warRoom;
  if (!war || war.status !== "agreed") {
    throw new Error("请先完成四方会议并拍板");
  }
  const advisors = consulting.assets.journey?.advisorStrategies;
  const primary = resolvePrimaryStrategy(advisors, war);
  const decisionOption = resolveDecisionOption(war, primary);
  const markdown = buildPositioningStrategyReportMarkdown({
    projectName: project.name,
    city: project.city || undefined,
    research: consulting.assets.journey?.marketResearch,
    advisors,
    warRoom: war,
  });
  const roadmap = buildExecutionRoadmap({
    positioningOneLiner: war.consensusOneLiner || primary?.oneLiner || "已确认品牌定位",
    battlefield: primary?.battlefield || war.consensusStatement?.ourBrandIs,
    forWhom: primary?.forWhom || war.consensusStatement?.forAudience,
    proofPlan: primary ? ensureProofPlan(primary) : undefined,
    doNotDo: primary?.doNotDo,
    sacrifice: primary?.sacrifice,
    decisionOption,
    decisionCard: war.decisionCard,
    primaryStrategy: primary,
  });

  const finalized = finalizeSixStepStrategyDeliverable(consulting, war);
  consulting = finalized.project;
  const contract = finalized.contract;

  consulting = writeJourneyAssets(consulting, {
    ...consulting.assets.journey,
    strategyReportMarkdown: markdown,
    strategyConfirmedAt: new Date().toISOString(),
    executionRoadmap: roadmap,
  });

  const statementText = formatPositioningStatement(contract.statement);
  const oneLiner = `${contract.statement.ourBrandIs} · ${contract.statement.thatValue}`;
  await persist(project.id, profile, consulting, interview, (latest) => ({
    mPnt: {
      ...(typeof latest.mPnt === "object" && latest.mPnt
        ? (latest.mPnt as Record<string, unknown>)
        : {}),
      oneLiner,
      positioningContract: contract,
      brandSystem: consulting.assets.brandSystem,
      statementText,
      strategyConfirmedAt: consulting.assets.journey?.strategyConfirmedAt,
      source: "m-pnt-six-step",
      updatedAt: new Date().toISOString(),
    },
  }));

  // Restaurant Brain：六步确认后的结构化品牌事实 → DNA
  try {
    const { syncBrandFactsToRestaurantBrain } = await import(
      "@/server/restaurant-brain/sync-brand-facts"
    );
    const stmt = contract.statement as {
      ourBrandIs?: string;
      forAudience?: string;
      thatValue?: string;
      category?: string;
    };
    await syncBrandFactsToRestaurantBrain(prisma, {
      projectId: project.id,
      ownerId: project.ownerId,
      source: "consulting",
      confidence: 0.7,
      brandName: project.name,
      category: typeof stmt.category === "string" ? stmt.category : project.category,
      positioning: oneLiner,
      targetCustomers:
        typeof stmt.forAudience === "string" ? stmt.forAudience : null,
      differentiation:
        typeof stmt.thatValue === "string" ? stmt.thatValue : null,
    });
  } catch (error) {
    log.warn("Restaurant Brain consulting DNA sync failed", { error: String(error) });
  }

  return {
    consulting,
    strategyReportMarkdown: markdown,
    executionRoadmap: roadmap,
    contract,
    reportOutline: consulting.assets.reportOutline,
    brandSystem: consulting.assets.brandSystem,
    signOffReady: evaluateSignOffReadiness(consulting),
  };
}

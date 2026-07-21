/**
 * 通用六步咨询项目服务 — M-MKT / M-BIZ / M-ED
 */
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { validateProfile } from "@/lib/profile-schema";
import { updateProjectProfile } from "@/server/services/project-profile";
import {
  answerIntake,
  acceptRoadmap,
  confirmResearchPack,
  createAgentConsultingProject,
  resolveSixStepNext,
  enrichResearchForDecision,
  enforceAdvisorTradeoffs,
  buildDecisionArtifact,
  buildDecisionGradeMarkdown,
  injectMondayMovesIntoRoadmap,
  upsertModuleBasics,
  generateModuleFollowups,
  compileModuleIntakeAnswers,
  evaluateAgentIntakeChecklist,
  answerAdaptiveFollowup,
  getModuleIntakeConfig,
  harvestSeatPrimaryFacts,
  normalizeSeatPrimaryFacts,
  assertAgentConsultingNotDegraded,
  enrichConsultingWithDomainDepth,
  assertDomainDepthForStrategy,
  mergeIdentityPriorsIntoAnswers,
  type AgentConsultingBlueprint,
  type AgentConsultingProject,
  type ConsultingAgentKind,
  type ResearchPack,
  type SeatPrimaryFact,
} from "@mealkey/agents/consulting-os";
import { getWebSearch } from "@mealkey/knowledge-engine";
import { mmktBlueprint } from "@mealkey/agents/m-mkt/consulting";
import { mbizBlueprint } from "@mealkey/agents/m-biz/consulting";
import { medBlueprint } from "@mealkey/agents/m-ed/consulting";
import { enrichFromEngines } from "@/server/services/agent-consulting-engines";
import {
  attachEntrySchemes,
  buildMmktExecutionRoadmap,
  buildOpportunityStrategyReport,
  thickenMarketScan,
  ensureWarRoomEntryContractDraft,
  finalizeSixStepEntryDeliverable,
  evaluateMmktSignOffReadiness,
  signMmktStrategyReport,
  buildMmktSignOffPackageMarkdown,
  mmktSignOffPackageFilename,
  type EntryDeliveryPack,
} from "@mealkey/agents/m-mkt/consulting";
import {
  attachModeSchemes,
  buildMbizExecutionRoadmap,
  buildModeStrategyReport,
  thickenBusinessScan,
  ensureWarRoomModeContractDraft,
  finalizeSixStepModeDeliverable,
  evaluateMbizSignOffReadiness,
  signMbizStrategyReport,
  buildMbizSignOffPackageMarkdown,
  mbizSignOffPackageFilename,
} from "@mealkey/agents/m-biz/consulting";
import {
  attachGovernanceSchemes,
  buildMedExecutionRoadmap,
  buildEquityStrategyReport,
  thickenEquityScan,
  ensureWarRoomGovernanceContractDraft,
  finalizeSixStepGovernanceDeliverable,
  evaluateMedSignOffReadiness,
  signMedStrategyReport,
  buildMedSignOffPackageMarkdown,
  medSignOffPackageFilename,
} from "@mealkey/agents/m-ed/consulting";

const log = createLogger("agent-consulting");

const PROFILE_KEYS: Record<ConsultingAgentKind, string> = {
  "m-mkt": "mMktConsultingProject",
  "m-biz": "mBizConsultingProject",
  "m-ed": "mEdConsultingProject",
};

const BLUEPRINTS: Record<ConsultingAgentKind, AgentConsultingBlueprint> = {
  "m-mkt": mmktBlueprint,
  "m-biz": mbizBlueprint,
  "m-ed": medBlueprint,
};

async function loadOwnerProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      category: true,
      stage: true,
      profile: true,
      ownerId: true,
    },
  });
  if (!project) throw new Error("项目不存在或无权限");
  return project;
}

function readProfile(raw: string | null) {
  return (validateProfile(raw) as Record<string, unknown>) || {};
}

async function persist(
  projectId: string,
  _profile: Record<string, unknown>,
  agentId: ConsultingAgentKind,
  consulting: AgentConsultingProject,
) {
  const key = PROFILE_KEYS[agentId];
  const { touchBrandConsultingActivity, resolveActiveBrand } = await import(
    "@/lib/brand-registry"
  );
  await updateProjectProfile(projectId, (latest) => {
    const next = { ...latest, [key]: consulting };
    const activeId = resolveActiveBrand(next).id;
    return touchBrandConsultingActivity(next, activeId);
  });
}

function engineCtx(project: {
  id: string;
  name: string;
  city: string | null;
  category?: string | null;
  stage?: string | null;
}) {
  return {
    projectId: project.id,
    name: project.name,
    city: project.city || undefined,
    category: project.category || undefined,
    stage: project.stage || undefined,
  };
}

/** 优先一枪引擎投影；失败回退 blueprint；统一过决策级硬化 */
async function buildResearchAndAdvisors(
  agentId: ConsultingAgentKind,
  blueprint: AgentConsultingBlueprint,
  answers: Record<string, string>,
  project: {
    id: string;
    name: string;
    city: string | null;
    category?: string | null;
    stage?: string | null;
  },
) {
  const enriched = await enrichFromEngines(
    agentId,
    answers,
    engineCtx(project),
  );
  let research = enriched?.research;
  let advisors = enriched?.advisors;
  const engineLive = Boolean(enriched?.engineLive);
  const degradeFallback =
    "专业引擎外呼失败或未配置，已降级为本地启发式扫描（不可当作引擎完成）";

  if (!research || !advisors) {
    research =
      research ||
      blueprint.buildResearch(answers, {
        city: project.city || undefined,
        name: project.name,
      });
    advisors = advisors || blueprint.buildAdvisors(answers, research);
    research = {
      ...research,
      collectionMode: "heuristic",
      degradationNote: research.degradationNote || degradeFallback,
    };
  } else if (!engineLive) {
    research = {
      ...research,
      collectionMode:
        research.collectionMode === "engine" ? "heuristic" : research.collectionMode || "heuristic",
      degradationNote:
        research.degradationNote ||
        enriched?.degradationNote ||
        degradeFallback,
    };
  }
  research = enrichResearchForDecision(research, answers, agentId);
  advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);

  // 真实采集模式：仅 engineLive 才标 engine；禁止假升
  const modeForThicken = engineLive
    ? "engine"
    : research.collectionMode === "hybrid"
      ? "hybrid"
      : "heuristic";

  // M-MKT：加厚扫描 + 三席进入方案包
  if (agentId === "m-mkt") {
    research = thickenMarketScan(research, answers, {
      city: project.city || undefined,
      name: project.name,
      collectionMode: modeForThicken,
    });
    if (research.degradationNote) {
      research = { ...research, degradationNote: research.degradationNote };
    } else if (!engineLive) {
      research = { ...research, degradationNote: degradeFallback };
    }
    advisors = attachEntrySchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  // M-BIZ：加厚体检 + 四官模式方案包
  if (agentId === "m-biz") {
    research = thickenBusinessScan(research, answers, {
      name: project.name,
      collectionMode: modeForThicken,
    });
    if (!engineLive && !research.degradationNote) {
      research = { ...research, degradationNote: degradeFallback };
    }
    advisors = attachModeSchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  // M-ED：加厚结构扫描 + 四方治理方案包
  if (agentId === "m-ed") {
    research = thickenEquityScan(research, answers, {
      name: project.name,
      collectionMode: modeForThicken,
    });
    if (!engineLive && !research.degradationNote) {
      research = { ...research, degradationNote: degradeFallback };
    }
    advisors = attachGovernanceSchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  // 加厚后若混入联网来源，可升 hybrid，但仍保留降级说明
  return { research, advisors };
}

async function enrichResearchWithWebSearch(
  research: ResearchPack,
  answers: Record<string, string>,
  city?: string,
): Promise<ResearchPack> {
  const place =
    city ||
    answers.city ||
    answers.region ||
    "";
  const category = answers.category || answers.stage || "";
  const rivals = (answers.rivals || "").split(/[,，、]/).filter(Boolean);
  const queries = [
    `${place} ${category} 市场 竞争 格局`,
    `${place} ${category} 客单价 消费 趋势`,
    rivals[0]
      ? `${place} ${rivals[0]} 口碑 定位`
      : `${place} ${category} 用户 评价`,
  ].filter((q) => q.trim().length > 4);

  try {
    const search = getWebSearch();
    const sources: string[] = [...(research.sources || [])];
    for (const query of queries.slice(0, 3)) {
      const rows = await search.search({
        query,
        limit: 2,
        region: place || undefined,
        language: "zh-cn",
      });
      for (const r of rows) {
        if (r.snippet || r.title) {
          sources.push(
            `${r.title || query} | ${(r.snippet || "").slice(0, 120)} | ${r.url || ""}`,
          );
        }
      }
    }
    const unique = Array.from(new Set(sources)).slice(0, 12);
    if (unique.length === 0) return research;
    return {
      ...research,
      sources: unique,
      collectionMode:
        research.collectionMode === "engine" ? "engine" : "hybrid",
      status: research.status === "confirmed" ? "confirmed" : "ready",
    };
  } catch {
    return research;
  }
}

export function getBlueprint(agentId: ConsultingAgentKind) {
  return BLUEPRINTS[agentId];
}

export async function getOrCreateAgentConsulting(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const key = PROFILE_KEYS[agentId];
  let consulting = profile[key] as AgentConsultingProject | undefined;
  if (!consulting || consulting.agentId !== agentId) {
    consulting = createAgentConsultingProject(agentId, projectId);
    await persist(project.id, profile, agentId, consulting);
  }
  const blueprint = BLUEPRINTS[agentId];
  const intakeConfig = getModuleIntakeConfig(agentId);
  const intakeChecklist = evaluateAgentIntakeChecklist({
    agentId,
    basics: consulting.assets.basics,
    followups: consulting.assets.adaptiveFollowups,
    research: consulting.assets.research,
  });
  const followups = consulting.assets.adaptiveFollowups;
  return {
    consulting,
    blueprint,
    nextStep: resolveSixStepNext(consulting, blueprint),
    projectName: project.name,
    city: project.city || undefined,
    basicsFields: intakeConfig.fields,
    basicsUi: consulting.assets.basics || {
      status: "draft" as const,
      values: {},
      missingMust: intakeConfig.fields
        .filter((f) => f.requirement === "must")
        .map((f) => f.key),
      missingShould: intakeConfig.fields
        .filter((f) => f.requirement === "should")
        .map((f) => f.key),
    },
    followupUi: followups
      ? {
          status: followups.status,
          questions: followups.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            whyNeeded: q.whyNeeded,
            priority: q.priority,
            answered: Boolean(followups.answers[q.id]?.trim()),
            answer: followups.answers[q.id] || "",
          })),
        }
      : null,
    intakeChecklist,
  };
}

/** Round A：保存/完成基础档案并生成动态追问 */
export async function saveAgentBasics(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  values: Record<string, string>,
  complete = false,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );

  const basics = upsertModuleBasics(
    agentId,
    consulting.assets.basics,
    values,
  );
  consulting = {
    ...consulting,
    assets: { ...consulting.assets, basics },
    updatedAt: new Date().toISOString(),
  };

  if (complete) {
    if (basics.status !== "complete") {
      const labels = basics.missingMust
        .map(
          (k) =>
            getModuleIntakeConfig(agentId).fields.find((f) => f.key === k)
              ?.label || k,
        )
        .join("、");
      throw new Error(`基础档案未齐，仍缺：${labels}`);
    }
    const followups = generateModuleFollowups(agentId, basics);
    consulting = {
      ...consulting,
      assets: { ...consulting.assets, basics, adaptiveFollowups: followups },
      intakeStatus: "in_progress",
      updatedAt: new Date().toISOString(),
    };
  }

  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    nextStep: resolveSixStepNext(consulting, blueprint),
    intakeChecklist: evaluateAgentIntakeChecklist({
      agentId,
      basics: consulting.assets.basics,
      followups: consulting.assets.adaptiveFollowups,
      research: consulting.assets.research,
    }),
  };
}

/** Round B：回答自适应追问；must 齐则编译 intakeAnswers */
export async function answerAgentFollowup(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  questionId: string,
  answer: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  const existing = consulting.assets.adaptiveFollowups;
  if (!existing) throw new Error("请先完成基础档案以生成动态追问");
  if (!consulting.assets.basics || consulting.assets.basics.status !== "complete") {
    throw new Error("基础档案未完成");
  }
  const basics = consulting.assets.basics;

  let followups = answerAdaptiveFollowup(existing, questionId, answer);
  consulting = {
    ...consulting,
    assets: { ...consulting.assets, adaptiveFollowups: followups },
    updatedAt: new Date().toISOString(),
  };

  if (followups.status === "ready_to_compile") {
    const intakeAnswers = compileModuleIntakeAnswers(
      agentId,
      basics,
      followups,
    );
    followups = { ...followups, status: "compiled" };
    consulting = {
      ...consulting,
      intakeAnswers,
      intakeStatus: "complete",
      assets: { ...consulting.assets, adaptiveFollowups: followups },
      updatedAt: new Date().toISOString(),
    };

    if (!consulting.assets.research) {
      let { research } = await buildResearchAndAdvisors(
        agentId,
        blueprint,
        intakeAnswers,
        project,
      );
      research = await enrichResearchWithWebSearch(
        research,
        intakeAnswers,
        project.city || undefined,
      );
      // 禁止假升 engine：无来源则保持 heuristic，确认门禁会挡住
      consulting = {
        ...consulting,
        assets: { ...consulting.assets, research },
      };
    }
  }

  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

/** @deprecated 旧四题路径；新路径请用 saveAgentBasics + answerAgentFollowup */
export async function answerAgentIntake(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  questionId: string,
  answer: string,
) {
  // 追问 id 走新路径
  if (questionId.startsWith("fq_")) {
    return answerAgentFollowup(
      userId,
      projectId,
      agentId,
      questionId,
      answer,
    );
  }

  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const { consulting: current, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );

  // 若已进入厚档案路径，禁止用旧四题伪装完成
  if (current.assets.basics || current.assets.adaptiveFollowups) {
    throw new Error("请使用基础档案与动态追问完成采集，旧四题路径已关闭");
  }

  let consulting = answerIntake(current, blueprint, questionId, answer);

  if (consulting.intakeStatus === "complete" && !consulting.assets.research) {
    // 旧路径完成也不再自动标 complete 进顾问——强制引导重走 basics
    consulting = {
      ...consulting,
      intakeStatus: "in_progress",
      updatedAt: new Date().toISOString(),
    };
    throw new Error(
      "请改用「基础档案 + 动态追问」采集：信息不足不能进入调研",
    );
  }

  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

export async function runAgentResearch(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const { consulting: current, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  const gate = evaluateAgentIntakeChecklist({
    agentId,
    basics: current.assets.basics,
    followups: current.assets.adaptiveFollowups,
    research: current.assets.research,
  });
  if (!gate.canRunResearch || current.intakeStatus !== "complete") {
    throw new Error(
      `信息采集未完成，不能开始调研。${gate.summary}`,
    );
  }

  // Business Identity / 项目档案先验注入（不覆盖用户已填）
  const bi =
    profile.businessIdentity && typeof profile.businessIdentity === "object"
      ? (profile.businessIdentity as Record<string, unknown>)
      : null;
  const intakeWithPriors = mergeIdentityPriorsIntoAnswers(current.intakeAnswers, {
    brandName:
      (typeof bi?.brandName === "string" && bi.brandName) || project.name,
    city: (typeof bi?.city === "string" && bi.city) || project.city,
    category:
      (typeof bi?.category === "string" && bi.category) || project.category,
    district:
      (typeof bi?.district === "string" && bi.district) || project.district,
    focusProblem:
      typeof bi?.biggestProblem === "string" ? bi.biggestProblem : null,
  });

  let { research } = await buildResearchAndAdvisors(
    agentId,
    blueprint,
    intakeWithPriors,
    project,
  );
  research = await enrichResearchWithWebSearch(
    research,
    intakeWithPriors,
    project.city || undefined,
  );
  // 禁止假升 engine：hybrid/engine 只能来自真实搜索或外呼引擎
  const consulting = {
    ...current,
    intakeAnswers: intakeWithPriors,
    assets: { ...current.assets, research },
    updatedAt: new Date().toISOString(),
  };
  await persist(project.id, profile, agentId, consulting);

  const after = evaluateAgentIntakeChecklist({
    agentId,
    basics: consulting.assets.basics,
    followups: consulting.assets.adaptiveFollowups,
    research,
  });
  if (!after.canConfirmResearch) {
    research = { ...research, status: "draft" };
    const downgraded = {
      ...consulting,
      assets: { ...consulting.assets, research },
    };
    await persist(project.id, profile, agentId, downgraded);
    throw new Error(
      `调研采集不足，不能当作完成。${after.summary}`,
    );
  }

  return {
    consulting,
    research,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

export async function confirmAgentResearch(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  let research = consulting.assets.research;
  let advisors = consulting.assets.advisors;

  if (!research || research.status === "draft") {
    const ran = await runAgentResearch(userId, projectId, agentId);
    consulting = ran.consulting;
    research = ran.research;
  }

  const gate = evaluateAgentIntakeChecklist({
    agentId,
    basics: consulting.assets.basics,
    followups: consulting.assets.adaptiveFollowups,
    research,
  });
  if (!gate.canConfirmResearch) {
    throw new Error(`信息收集清单未齐，不能确认调研。${gate.summary}`);
  }

  if (!advisors) {
    const built = await buildResearchAndAdvisors(
      agentId,
      blueprint,
      consulting.intakeAnswers,
      project,
    );
    advisors = built.advisors;
  }

  research = confirmResearchPack(research);
  if (!advisors) {
    advisors = enforceAdvisorTradeoffs(
      blueprint.buildAdvisors(consulting.intakeAnswers, research),
      blueprint.advisors,
    );
  } else {
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }
  research = enrichResearchForDecision(
    research,
    consulting.intakeAnswers,
    agentId,
  );

  if (agentId === "m-mkt") {
    research = thickenMarketScan(research, consulting.intakeAnswers, {
      city: project.city || undefined,
      name: project.name,
      collectionMode: research.collectionMode || "hybrid",
    });
    research = enrichResearchForDecision(
      research,
      consulting.intakeAnswers,
      agentId,
    );
    advisors = attachEntrySchemes(
      advisors,
      consulting.intakeAnswers,
      research,
    );
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  if (agentId === "m-biz") {
    research = thickenBusinessScan(research, consulting.intakeAnswers, {
      name: project.name,
      collectionMode: research.collectionMode || "hybrid",
    });
    research = enrichResearchForDecision(
      research,
      consulting.intakeAnswers,
      agentId,
    );
    advisors = attachModeSchemes(
      advisors,
      consulting.intakeAnswers,
      research,
    );
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  if (agentId === "m-ed") {
    research = thickenEquityScan(research, consulting.intakeAnswers, {
      name: project.name,
      collectionMode: research.collectionMode || "hybrid",
    });
    research = enrichResearchForDecision(
      research,
      consulting.intakeAnswers,
      agentId,
    );
    advisors = attachGovernanceSchemes(
      advisors,
      consulting.intakeAnswers,
      research,
    );
    advisors = enforceAdvisorTradeoffs(advisors, blueprint.advisors);
  }

  // 确认时若无人工账本，从调研来源收割一手事实
  const primaryFacts =
    consulting.assets.primaryFacts &&
    consulting.assets.primaryFacts.length >= 2
      ? consulting.assets.primaryFacts
      : harvestSeatPrimaryFacts(research);

  // 确认调研只落案卷，不自动开会——保留步 3 停留感
  const { warRoom: _clearedWarRoom, ...restAssets } = consulting.assets;
  consulting = {
    ...consulting,
    assets: {
      ...restAssets,
      research,
      advisors,
      primaryFacts,
    },
    updatedAt: new Date().toISOString(),
  };
  // 领域证据账本 + 强度评分（对齐 M-PNT EvidenceLedger）
  consulting = enrichConsultingWithDomainDepth(agentId, consulting);
  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

export async function upsertAgentPrimaryFacts(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  facts: Array<{
    factId?: string;
    claim: string;
    sourceRef: string;
    related?: SeatPrimaryFact["related"];
  }>,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  if (consulting.assets.signOffStatus === "signed") {
    throw new Error("报告已签字，不能再改事实");
  }
  const primaryFacts = normalizeSeatPrimaryFacts(facts);
  if (primaryFacts.length < 1) {
    throw new Error("请至少保留 1 条有效事实（主张≥8 字且带来源）");
  }
  const next: AgentConsultingProject = {
    ...consulting,
    assets: {
      ...consulting.assets,
      primaryFacts,
    },
    updatedAt: new Date().toISOString(),
  };
  await persist(project.id, profile, agentId, next);
  return {
    consulting: next,
    nextStep: resolveSixStepNext(next, blueprint),
  };
}

export async function openAgentWarRoom(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  let advisors = consulting.assets.advisors;
  if (!advisors) {
    const confirmed = await confirmAgentResearch(userId, projectId, agentId);
    consulting = confirmed.consulting;
    advisors = consulting.assets.advisors!;
  }
  const warRoom = blueprint.buildWarRoom(advisors);
  consulting = {
    ...consulting,
    assets: { ...consulting.assets, warRoom },
    updatedAt: new Date().toISOString(),
  };
  await persist(project.id, profile, agentId, consulting);
  return { consulting, nextStep: resolveSixStepNext(consulting, blueprint) };
}

export async function voteAgentWarRoom(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  preference: string,
  blendNote?: string,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  const advisors = consulting.assets.advisors;
  if (!advisors) throw new Error("请先生成顾问方案");
  let room = consulting.assets.warRoom;
  if (!room || room.status === "open") {
    room = blueprint.buildWarRoom(advisors);
  }
  const warRoom = blueprint.applyVote(room, advisors, preference, blendNote);
  const decisionArtifact = buildDecisionArtifact({
    agentId,
    answers: consulting.intakeAnswers,
    research: consulting.assets.research,
    advisors,
    warRoom,
    projectName: project.name,
  });
  consulting = {
    ...consulting,
    assets: {
      ...consulting.assets,
      warRoom,
      decisionArtifact,
    },
    updatedAt: new Date().toISOString(),
  };
  // 拍板后落入席位合同草稿（对齐 M-PNT 战争室合同必落盘）
  if (warRoom.status === "agreed") {
    if (agentId === "m-biz") {
      const draftRoadmap = buildMbizExecutionRoadmap({
        oneLiner: decisionArtifact.recommendation,
        answers: consulting.intakeAnswers,
        advisors,
        warRoom,
      });
      consulting = ensureWarRoomModeContractDraft(consulting, {
        decision: decisionArtifact,
        warRoom,
        modePack: draftRoadmap.modePack,
      });
    } else if (agentId === "m-mkt") {
      const draftRoadmap = buildMmktExecutionRoadmap({
        oneLiner: decisionArtifact.recommendation,
        answers: consulting.intakeAnswers,
        advisors,
        warRoom,
      });
      consulting = ensureWarRoomEntryContractDraft(consulting, {
        decision: decisionArtifact,
        warRoom,
        entryPack: draftRoadmap.entryPack,
      });
    } else if (agentId === "m-ed") {
      const draftRoadmap = buildMedExecutionRoadmap({
        oneLiner: decisionArtifact.recommendation,
        answers: consulting.intakeAnswers,
        advisors,
        warRoom,
      });
      consulting = ensureWarRoomGovernanceContractDraft(consulting, {
        decision: decisionArtifact,
        warRoom,
        governancePack: draftRoadmap.governancePack,
      });
    }
  }
  await persist(project.id, profile, agentId, consulting);
  return { consulting, nextStep: resolveSixStepNext(consulting, blueprint) };
}

export async function confirmAgentStrategy(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  assertAgentConsultingNotDegraded(consulting, "确认策略");
  // 刷新领域深度并硬门禁（证据不足不交付）
  consulting = enrichConsultingWithDomainDepth(agentId, consulting);
  assertDomainDepthForStrategy(agentId, consulting, "确认策略");
  const war = consulting.assets.warRoom;
  if (!war || war.status !== "agreed") {
    throw new Error("请先完成会议室拍板");
  }

  const decision = buildDecisionArtifact({
    agentId,
    answers: consulting.intakeAnswers,
    research: consulting.assets.research,
    advisors: consulting.assets.advisors,
    warRoom: war,
    projectName: project.name,
  });

  const advisorName = (id: string) =>
    blueprint.advisors.find((a) => a.id === id)?.name || id;

  let markdown: string;
  let roadmap;

  if (agentId === "m-mkt") {
    roadmap = buildMmktExecutionRoadmap({
      oneLiner: decision.recommendation,
      answers: consulting.intakeAnswers,
      advisors: consulting.assets.advisors,
      warRoom: war,
    });
    roadmap = injectMondayMovesIntoRoadmap(roadmap, decision);
    const entryPack = roadmap.entryPack as EntryDeliveryPack | undefined;
    markdown = buildOpportunityStrategyReport({
      projectName: project.name,
      city: project.city || undefined,
      answers: consulting.intakeAnswers,
      research: consulting.assets.research,
      advisors: consulting.assets.advisors,
      warRoom: war,
      decision,
      entryPack,
      advisorName,
    });
    const finalized = finalizeSixStepEntryDeliverable(consulting, {
      decision,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: markdown,
    });
    consulting = finalized.project;
    await persist(project.id, profile, agentId, consulting);

    // Restaurant Brain：市场咨询结构化事实写回（置信度跟领域强度）
    try {
      const { syncMarketFactsToRestaurantBrain } = await import(
        "@/server/restaurant-brain/sync-business-facts"
      );
      const answers = consulting.intakeAnswers || {};
      const strength = consulting.assets.domainStrength?.overall ?? 50;
      await syncMarketFactsToRestaurantBrain(prisma, {
        projectId: project.id,
        ownerId: project.ownerId,
        source: "consulting",
        confidence: Math.min(0.88, 0.55 + strength / 200),
        city:
          (typeof answers.city === "string" && answers.city) ||
          project.city ||
          null,
        category:
          (typeof answers.category === "string" && answers.category) ||
          project.category ||
          null,
        ticketBand:
          typeof answers.ticketBand === "string" ? answers.ticketBand : null,
        targetCustomer:
          typeof answers.targetCustomer === "string"
            ? answers.targetCustomer
            : typeof answers.scene === "string"
              ? answers.scene
              : null,
        brandRisk:
          typeof decision.killCriteria?.[0] === "string"
            ? decision.killCriteria[0]
            : null,
        sceneCut:
          typeof answers.scene === "string" ? answers.scene : null,
        entryMode:
          typeof finalized.contract?.entryMode === "string"
            ? finalized.contract.entryMode
            : typeof decision.recommendation === "string"
              ? decision.recommendation
              : null,
      });
    } catch (error) {
      log.warn("Restaurant Brain market facts sync failed", { error: String(error) });
    }

    return {
      consulting,
      strategyReportMarkdown: markdown,
      contract: finalized.contract,
      signOffReady: evaluateMmktSignOffReadiness(consulting),
      nextStep: resolveSixStepNext(consulting, blueprint),
    };
  } else if (agentId === "m-biz") {
    roadmap = buildMbizExecutionRoadmap({
      oneLiner: decision.recommendation,
      answers: consulting.intakeAnswers,
      advisors: consulting.assets.advisors,
      warRoom: war,
    });
    roadmap = injectMondayMovesIntoRoadmap(roadmap, decision);
    markdown = buildModeStrategyReport({
      projectName: project.name,
      answers: consulting.intakeAnswers,
      research: consulting.assets.research,
      advisors: consulting.assets.advisors,
      warRoom: war,
      decision,
      modePack: roadmap.modePack,
      advisorName,
    });
    const finalized = finalizeSixStepModeDeliverable(consulting, {
      decision,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: markdown,
    });
    consulting = finalized.project;
    await persist(project.id, profile, agentId, consulting);

    // Restaurant Brain：商业模式咨询 intake 数字 → BusinessProfile
    try {
      const { syncBusinessFactsToRestaurantBrain } = await import(
        "@/server/restaurant-brain/sync-business-facts"
      );
      const answers = consulting.intakeAnswers || {};
      const strength = consulting.assets.domainStrength?.overall ?? 50;
      await syncBusinessFactsToRestaurantBrain(prisma, {
        projectId: project.id,
        ownerId: project.ownerId,
        source: "consulting",
        confidence: Math.min(0.88, 0.55 + strength / 200),
        avgTicket:
          typeof answers.avgTicket === "string" ? answers.avgTicket : null,
        unitEconomics:
          typeof answers.unitEconomics === "string"
            ? answers.unitEconomics
            : null,
        storeCount:
          typeof answers.storeCount === "string" ? answers.storeCount : null,
        businessModel:
          typeof finalized.contract?.oneLiner === "string"
            ? finalized.contract.oneLiner
            : typeof decision.recommendation === "string"
              ? decision.recommendation
              : null,
        brandName:
          typeof answers.brandName === "string" ? answers.brandName : null,
      });
    } catch (error) {
      log.warn("Restaurant Brain business facts sync failed", { error: String(error) });
    }

    return {
      consulting,
      strategyReportMarkdown: markdown,
      contract: finalized.contract,
      signOffReady: evaluateMbizSignOffReadiness(consulting),
      nextStep: resolveSixStepNext(consulting, blueprint),
    };
  } else if (agentId === "m-ed") {
    roadmap = buildMedExecutionRoadmap({
      oneLiner: decision.recommendation,
      answers: consulting.intakeAnswers,
      advisors: consulting.assets.advisors,
      warRoom: war,
    });
    roadmap = injectMondayMovesIntoRoadmap(roadmap, decision);
    markdown = buildEquityStrategyReport({
      projectName: project.name,
      answers: consulting.intakeAnswers,
      research: consulting.assets.research,
      advisors: consulting.assets.advisors,
      warRoom: war,
      decision,
      governancePack: roadmap.governancePack,
      advisorName,
    });
    const finalized = finalizeSixStepGovernanceDeliverable(consulting, {
      decision,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: markdown,
    });
    consulting = finalized.project;
    await persist(project.id, profile, agentId, consulting);

    // Restaurant Brain：股权/组织事实写回（补齐 M-ED 缺口）
    try {
      const { syncEquityFactsToRestaurantBrain } = await import(
        "@/server/restaurant-brain/sync-business-facts"
      );
      const answers = consulting.intakeAnswers || {};
      const gov = finalized.contract;
      await syncEquityFactsToRestaurantBrain(prisma, {
        projectId: project.id,
        ownerId: project.ownerId,
        source: "consulting",
        confidence: Math.min(
          0.85,
          0.55 + (consulting.assets.domainStrength?.overall || 40) / 200,
        ),
        controlFloor:
          (typeof gov?.controlFloor === "string" && gov.controlFloor) ||
          (typeof answers.control === "string" ? answers.control : null),
        optionPool:
          typeof answers.pool === "string"
            ? answers.pool
            : typeof answers.optionPool === "string"
              ? answers.optionPool
              : null,
        mustSign: Array.isArray(gov?.mustSign)
          ? gov.mustSign.join("、")
          : (typeof gov?.mustSign === "string" && gov.mustSign) ||
            (typeof answers.mustSign === "string" ? answers.mustSign : null),
        lockFirst:
          typeof gov?.lockFirst === "string" ? gov.lockFirst : null,
        oneLiner:
          typeof gov?.oneLiner === "string"
            ? gov.oneLiner
            : typeof decision.recommendation === "string"
              ? decision.recommendation
              : null,
      });
    } catch (error) {
      log.warn("Restaurant Brain equity facts sync failed", { error: String(error) });
    }

    return {
      consulting,
      strategyReportMarkdown: markdown,
      contract: finalized.contract,
      signOffReady: evaluateMedSignOffReadiness(consulting),
      nextStep: resolveSixStepNext(consulting, blueprint),
    };
  } else {
    markdown = buildDecisionGradeMarkdown({
      reportTitle: blueprint.reportTitle,
      committeeName: blueprint.committeeName,
      projectName: project.name,
      city: project.city || undefined,
      decision,
      research: consulting.assets.research,
      advisors: consulting.assets.advisors,
      warRoom: consulting.assets.warRoom,
      advisorName,
    });
    roadmap = blueprint.buildRoadmap(
      decision.recommendation,
      consulting.intakeAnswers,
    );
    roadmap = injectMondayMovesIntoRoadmap(roadmap, decision);
  }

  consulting = {
    ...consulting,
    assets: {
      ...consulting.assets,
      decisionArtifact: decision,
      strategyReportMarkdown: markdown,
      strategyConfirmedAt: new Date().toISOString(),
      executionRoadmap: roadmap,
    },
    updatedAt: new Date().toISOString(),
  };
  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    strategyReportMarkdown: markdown,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

export async function acceptAgentExecution(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  const current = consulting.assets.executionRoadmap;
  if (!current) throw new Error("请先生成执行路径");
  const executionRoadmap = acceptRoadmap(current);
  consulting = {
    ...consulting,
    assets: { ...consulting.assets, executionRoadmap },
    updatedAt: new Date().toISOString(),
  };
  await persist(project.id, profile, agentId, consulting);
  return { consulting, nextStep: resolveSixStepNext(consulting, blueprint) };
}

export async function resetAgentConsulting(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  const consulting = createAgentConsultingProject(agentId, projectId);
  await persist(project.id, profile, agentId, consulting);
  const blueprint = BLUEPRINTS[agentId];
  return {
    consulting,
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

/** 创始人签字（M-BIZ / M-MKT / M-ED） */
export async function signAgentStrategyReport(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  input: { signedBy: string; note?: string },
) {
  const project = await loadOwnerProject(userId, projectId);
  const profile = readProfile(project.profile);
  let { consulting, blueprint } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  if (!consulting.assets.strategyConfirmedAt) {
    throw new Error("请先确认策略报告，再签字交付");
  }
  assertAgentConsultingNotDegraded(consulting, "签字交付");
  consulting =
    agentId === "m-mkt"
      ? signMmktStrategyReport(consulting, input)
      : agentId === "m-ed"
        ? signMedStrategyReport(consulting, input)
        : signMbizStrategyReport(consulting, input);
  await persist(project.id, profile, agentId, consulting);
  return {
    consulting,
    signOffReady:
      agentId === "m-mkt"
        ? evaluateMmktSignOffReadiness(consulting)
        : agentId === "m-ed"
          ? evaluateMedSignOffReadiness(consulting)
          : evaluateMbizSignOffReadiness(consulting),
    nextStep: resolveSixStepNext(consulting, blueprint),
  };
}

/** 导出签字交付包（preview=true 允许未签字预览） */
export async function exportAgentSignOffPackage(
  userId: string,
  projectId: string,
  agentId: ConsultingAgentKind,
  opts?: { preview?: boolean },
) {
  await loadOwnerProject(userId, projectId);
  const { consulting } = await getOrCreateAgentConsulting(
    userId,
    projectId,
    agentId,
  );
  if (!consulting.assets.strategyConfirmedAt) {
    throw new Error("请先确认策略报告，再导出交付包");
  }
  const preview = Boolean(opts?.preview);
  const signed = consulting.assets.signOffStatus === "signed";
  if (!preview && !signed) {
    throw new Error("请先签字，再导出方案；或先预览草稿");
  }
  const markdown =
    agentId === "m-mkt"
      ? buildMmktSignOffPackageMarkdown(consulting, {
          preview: preview || !signed,
        })
      : agentId === "m-ed"
        ? buildMedSignOffPackageMarkdown(consulting, {
            preview: preview || !signed,
          })
        : buildMbizSignOffPackageMarkdown(consulting, {
            preview: preview || !signed,
          });
  const filename =
    agentId === "m-mkt"
      ? mmktSignOffPackageFilename(consulting, {
          preview: preview || !signed,
        })
      : agentId === "m-ed"
        ? medSignOffPackageFilename(consulting, {
            preview: preview || !signed,
          })
        : mbizSignOffPackageFilename(consulting, {
            preview: preview || !signed,
          });
  return {
    markdown,
    filename,
    preview: preview || !signed,
    readiness:
      agentId === "m-mkt"
        ? evaluateMmktSignOffReadiness(consulting)
        : agentId === "m-ed"
          ? evaluateMedSignOffReadiness(consulting)
          : evaluateMbizSignOffReadiness(consulting),
  };
}

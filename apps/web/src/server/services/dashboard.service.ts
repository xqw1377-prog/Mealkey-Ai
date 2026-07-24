/**
 * Dashboard Service — 看板数据聚合与视图模型构建
 *
 * router 仅负责鉴权与入参；本文件负责 DB 读取与视图组装。
 */
import type { PrismaClient } from "@/generated/prisma";
import { parseJsonField } from "@/lib/prisma";
import { resolveActiveBrand } from "@/lib/brand-registry";
import {
  buildMeetingHref,
  detectDepartmentFromTopic,
  lifecycleLabel,
  type MeetingLifecycle,
} from "@/lib/meeting";
import { ActiveMeetingDraftSchema } from "@/lib/meeting-session";
import { parseActiveCouncilDraft } from "@/lib/council-session-draft";
import { getProject, listProjects, type ProjectResponse } from "./project.service";
import {
  isBlockingRisk,
  pickTopOpenRiskAlert,
  pickTopOpportunity,
} from "@/server/founder-layer/capability/runtime-priority";
import {
  buildFounderIntelligenceProfile,
  buildIntelligenceBriefSummary,
} from "@/server/founder-layer/intelligence";
import { readMobileAgentState } from "@/server/founder-layer/goal-compiler/persist";

// ─── Types ───

type AbilityItem = { label: string; value: number };

type OwnerBundle = {
  id: string | null;
  name: string | null;
  experience: string | null;
  overallScore: number | null;
  background: string;
  strengths: string;
  weaknesses: string;
  capabilities: Array<{ name: string; score: number }>;
};

type DecisionBundle = {
  id: string;
  type: string;
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  createdAt: Date;
};

type ReportBundle = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectInsightBundle = {
  project: ProjectResponse;
  currentGoal: string | null;
  owner: OwnerBundle;
  decisions: DecisionBundle[];
  latestReport: ReportBundle | null;
  reportContent: Record<string, unknown>;
  memories: Array<{ key: string; content: string; source: string; createdAt: Date }>;
};

type KnowledgeNodeView = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
};

// ─── Helpers ───

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function buildFounderMeetingLink(
  projectId: string,
  topic: string,
  options?: { autoStart?: boolean; autoSend?: boolean },
) {
  return buildMeetingHref(projectId, topic, detectDepartmentFromTopic(topic), {
    autoStart: options?.autoStart ?? true,
    autoSend: options?.autoSend,
  });
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function formatTodayLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" })
    .format(date)
    .replace("/", ".");
}

const ABILITY_LABELS = ["战略能力", "产品能力", "运营能力", "管理能力", "增长能力"] as const;

const CORE_MAP: Record<string, string> = {
  战略能力: "认知力",
  产品能力: "决策力",
  运营能力: "推动力",
  管理能力: "整合力",
  增长能力: "成长力",
};

const STAGE_FLOW = ["创业探索", "单店验证", "稳定盈利", "复制增长", "品牌建设", "生态经营"];

function stageIndex(stage: string | null | undefined, decisionCount: number): number {
  const map: Record<string, number> = {
    idea: 0,
    positioning: 1,
    location: 1,
    setup: 2,
    opening: 2,
    growth: 3,
  };
  if (stage && map[stage] !== undefined) return map[stage];
  if (decisionCount >= 8) return 3;
  if (decisionCount >= 3) return 2;
  if (decisionCount >= 1) return 1;
  return 0;
}

function buildStageTrack(index: number) {
  return STAGE_FLOW.map((label, i) => ({
    label,
    status: i < index ? "done" : i === index ? "current" : "upcoming",
  }));
}

function resolveAbilityMap(project: ProjectResponse, owner: OwnerBundle): AbilityItem[] {
  if (owner.capabilities.length > 0) {
    const byName = new Map(owner.capabilities.map((c) => [c.name, c.score]));
    return ABILITY_LABELS.map((label) => ({
      label,
      value: clamp(byName.get(label) ?? owner.overallScore ?? 55),
    }));
  }

  const bg = parseJsonField(owner.background) ?? {};
  const fromBg = ABILITY_LABELS.map((label) => {
    const key = label.replace("能力", "");
    const raw = bg[label] ?? bg[key] ?? bg[label.toLowerCase()];
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    return { label, value: Number.isFinite(n) ? clamp(n) : null as number | null };
  });

  if (fromBg.every((x) => x.value !== null)) {
    return fromBg.map((x) => ({ label: x.label, value: x.value as number }));
  }

  const base = clamp(project.healthScore ?? owner.overallScore ?? 58);
  return [
    { label: "战略能力", value: clamp(base - 4) },
    { label: "产品能力", value: clamp(base + 6) },
    { label: "运营能力", value: clamp(base) },
    { label: "管理能力", value: clamp(base - 8) },
    { label: "增长能力", value: clamp(base - 10) },
  ];
}

function sortAbilities(map: AbilityItem[]) {
  return [...map].sort((a, b) => b.value - a.value);
}

function focusFromWeakest(weakest: AbilityItem | undefined) {
  const label = weakest?.label ?? "增长能力";
  const value = weakest?.value ?? 50;
  return {
    focusCapability: label,
    focusCoreAbility: CORE_MAP[label] ?? "成长力",
    focusCapabilityTitle: `当前重点补强：${label}`,
    focusCapabilitySummary:
      value < 60
        ? `系统判断 ${label} 是当前短板，建议在决策室中优先校准相关判断与行动。`
        : `继续巩固 ${label}，把判断沉淀为可复用的经营动作。`,
  };
}

// ─── Data loaders ───

export async function getOwnerBundle(prisma: PrismaClient, userId: string): Promise<OwnerBundle> {
  const owner = await prisma.owner.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      experience: true,
      overallScore: true,
      background: true,
      strengths: true,
      weaknesses: true,
      capabilities: {
        orderBy: { score: "desc" },
        take: 8,
        select: { name: true, score: true },
      },
    },
  });

  return (
    owner ?? {
      id: null,
      name: null,
      experience: null,
      overallScore: null,
      background: "{}",
      strengths: "[]",
      weaknesses: "[]",
      capabilities: [],
    }
  );
}

export async function getProjectInsightBundle(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
): Promise<ProjectInsightBundle | null> {
  const [project, owner] = await Promise.all([
    getProject(prisma, projectId, userId),
    getOwnerBundle(prisma, userId),
  ]);
  if (!project || !owner.id) return null;

  const [decisions, latestReport, memories] = await Promise.all([
    prisma.decision.findMany({
      where: { ownerId: owner.id, projectId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        problem: true,
        observation: true,
        diagnosis: true,
        judgement: true,
        strategy: true,
        action: true,
        confidence: true,
        createdAt: true,
      },
    }),
    prisma.report.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.memory.findMany({
      where: { ownerId: owner.id, projectId },
      orderBy: { importance: "desc" },
      take: 12,
      select: { key: true, content: true, source: true, createdAt: true },
    }),
  ]);

  return {
    project,
    currentGoal: project.target ?? asString(project.profile?.goal) ?? null,
    owner,
    decisions,
    latestReport: latestReport
      ? {
          id: latestReport.id,
          type: latestReport.type,
          title: latestReport.title,
          summary: latestReport.summary,
          content: latestReport.content,
          status: latestReport.status,
          createdAt: latestReport.createdAt,
          updatedAt: latestReport.updatedAt,
        }
      : null,
    reportContent: parseJsonField(latestReport?.content) ?? {},
    memories,
  };
}

export async function getPreferredProjectBundle(
  prisma: PrismaClient,
  userId: string,
  projectId?: string,
) {
  const projects = await listProjects(prisma, userId);
  if (projects.length === 0) {
    return { bundle: null as ProjectInsightBundle | null, projects };
  }
  const current =
    (projectId ? projects.find((p) => p.id === projectId) : null) ?? projects[0];
  const bundle = await getProjectInsightBundle(prisma, userId, current.id);
  return { bundle, projects };
}

export async function getKnowledgeNodesForBundle(
  prisma: PrismaClient,
  bundle: ProjectInsightBundle,
): Promise<KnowledgeNodeView[]> {
  const stage = bundle.project.stage ?? "";
  const category = bundle.project.category ?? "";
  const nodes = await prisma.knowledgeNode.findMany({
    where: {
      status: "published",
      OR: [
        ...(category
          ? [{ title: { contains: category } }, { content: { contains: category } }]
          : []),
        ...(stage ? [{ content: { contains: stage } }] : []),
        { type: { in: ["rule", "principle", "case", "model"] } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      tags: true,
    },
  });

  return nodes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    tags: parseJsonStringArray(n.tags),
  }));
}

// ─── View builders ───

export function buildDashboardHome(bundle: ProjectInsightBundle) {
  const abilities = resolveAbilityMap(bundle.project, bundle.owner);
  const ranked = sortAbilities(abilities);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const focus = focusFromWeakest(weakest);
  const latest = bundle.decisions[0];
  const profile = bundle.project.profile ?? {};
  const projectHealth = clamp(bundle.project.healthScore ?? strongest?.value ?? 62);
  const confidence = clamp((bundle.project.confidence ?? latest?.confidence ?? 0.62) * (bundle.project.confidence && bundle.project.confidence <= 1 ? 100 : 1));
  const homeMode = bundle.decisions.length === 0 ? "forming" : "active";
  const isInitialBrief =
    homeMode === "forming" &&
    (asString(profile.onboardingSource) === "initial_diagnostic" ||
      asString(profile.onboardingSource) === "ai_interview_v1");
  const currentChallenge =
    asString(profile.currentProblemTitle) ??
    asString(profile.currentChallenge) ??
    bundle.currentGoal ??
    "当前最重要的经营问题";
  const yearlyGoal =
    bundle.currentGoal ??
    asString(profile.yearlyGoal) ??
    asString(profile.currentProblemImpact)?.replace(/^未来一年的关键目标是：/, "") ??
    "形成未来一年的关键经营目标";
  const firstStageSummary = `你当前处在 ${STAGE_FLOW[stageIndex(bundle.project.stage, bundle.decisions.length)] ?? "创业探索"} 的早期校准阶段，系统正在把首次经营诊断压缩成可以执行的第一轮判断。`;
  const firstRiskSummary = `当前最大风险不是信息不够，而是可能把“${currentChallenge}”的表面症状当成真正根因，导致后续动作持续偏航。`;
  const firstMeetingReason = `因为你接下来最需要的不是继续填资料，而是围绕“${yearlyGoal}”先锁定一个不能判断错的关键变量。`;
  const ownerName =
    bundle.owner.name && !/dev\s*user|开发/i.test(bundle.owner.name)
      ? bundle.owner.name
      : bundle.project.ownerName ?? "经营者";

  const timeline =
    bundle.decisions.length > 0
      ? bundle.decisions.slice(0, 4).map((d) => ({
          date: formatShortDate(d.createdAt),
          title: d.problem.slice(0, 28) || "经营判断",
          conclusion: d.judgement.slice(0, 80) || d.action.slice(0, 80) || "已形成判断",
        }))
      : [
          {
            date: formatShortDate(new Date()),
            title: "企业已建立",
            conclusion: "先开一场会，留下第一条判断。",
          },
        ];

  // Prefer positioning-change re-review queue; fallback to recent decisions without feedback feel
  const reviewQueue = Array.isArray(
    (profile as Record<string, unknown>).positioningReviewQueue,
  )
    ? ((profile as Record<string, unknown>).positioningReviewQueue as Array<
        Record<string, unknown>
      >)
    : [];
  const pendingPositioningReviews = reviewQueue.filter(
    (i) => i.status === "pending",
  );
  const pendingReviewItems =
    pendingPositioningReviews.length > 0
      ? pendingPositioningReviews.slice(0, 5).map((i) => {
          const decisionId = String(i.decisionId || "");
          const problem = String(i.problem || "经营判断");
          const judgement = String(i.judgement || "");
          const previousOneLiner = i.previousOneLiner
            ? String(i.previousOneLiner)
            : undefined;
          const newOneLiner = i.newOneLiner ? String(i.newOneLiner) : undefined;
          const reason = i.reason ? String(i.reason) : undefined;
          const reviewHrefBase = buildMeetingHref(
            bundle.project.id,
            [
              `【定位变更复审】请复审经营判断：${problem}`,
              judgement ? `原判断结论：${judgement}` : "",
              previousOneLiner || newOneLiner
                ? `品牌定位变化：${previousOneLiner ? `「${previousOneLiner}」` : "（无旧版）"} → ${newOneLiner ? `「${newOneLiner}」` : "（新版）"}`
                : "",
              reason ? `系统提示：${reason}` : "",
              "",
              "请输出：1) 是否仍成立 2) 调整后的判断 3) 下一步动作",
            ]
              .filter(Boolean)
              .join("\n"),
            "brand",
            { autoStart: true },
          );
          const reviewHref = `${reviewHrefBase}&intent=positioning_review${
            decisionId ? `&decisionId=${encodeURIComponent(decisionId)}` : ""
          }`;
          return {
            date: i.flaggedAt
              ? formatShortDate(new Date(String(i.flaggedAt)))
              : formatShortDate(new Date()),
            title: problem.slice(0, 36),
            conclusion: (reason || judgement).slice(0, 100),
            status: "定位复审",
            kind: "positioning" as const,
            decisionId,
            href: reviewHref,
            decisionsHref: `/projects/${bundle.project.id}/decisions#decision-${decisionId}`,
          };
        })
      : bundle.decisions.slice(0, 3).map((d) => ({
          date: formatShortDate(d.createdAt),
          title: d.problem.slice(0, 36),
          conclusion: d.action.slice(0, 80) || d.judgement.slice(0, 80),
          status: "待反馈",
          kind: "feedback" as const,
          decisionId: "",
          href: `/projects/${bundle.project.id}/decisions`,
          decisionsHref: `/projects/${bundle.project.id}/decisions`,
        }));

  const positioningReviewCount = pendingPositioningReviews.length;
  const positioningReviewAlert =
    positioningReviewCount > 0
      ? {
          title: `${positioningReviewCount} 条判断因定位变更待复审`,
          summary:
            "品牌定位已更新，部分选址/投资/营销等判断可能失效。优先在决策室复审，或到跟进页处理。",
          href: `/projects/${bundle.project.id}/decisions`,
          meetingHref: pendingReviewItems[0]?.href,
          count: positioningReviewCount,
        }
      : null;

  const lastMeetingRecommendationEarly =
    typeof (profile as Record<string, unknown>).lastMeetingRecommendation === "string"
      ? String((profile as Record<string, unknown>).lastMeetingRecommendation)
      : null;
  const lastDecisionPackRawEarly = (profile as Record<string, unknown>)
    .lastDecisionPack as
    | {
        chosen?: string;
        strategyDecision?: string;
        summary?: string;
        evidenceStatus?: string;
        topRisks?: string[];
      }
    | undefined;
  const decisionPackJudgement = lastDecisionPackRawEarly?.strategyDecision
    ? lastDecisionPackRawEarly.chosen &&
      lastDecisionPackRawEarly.chosen !== "带条件推进"
      ? `${lastDecisionPackRawEarly.chosen}：${lastDecisionPackRawEarly.strategyDecision}`
      : String(lastDecisionPackRawEarly.strategyDecision)
    : null;
  const decisionPackRisk =
    Array.isArray(lastDecisionPackRawEarly?.topRisks) &&
    lastDecisionPackRawEarly!.topRisks!.length > 0
      ? String(lastDecisionPackRawEarly!.topRisks![0])
      : lastDecisionPackRawEarly?.evidenceStatus === "insufficient"
        ? "委员会证据仍不足，放大动作前先补关键证据"
        : null;

  const observation =
    latest?.observation ||
    bundle.latestReport?.summary ||
    (isInitialBrief
      ? firstStageSummary
      : `${bundle.project.name} 当前处于「${bundle.project.stage ?? "idea"}」阶段，系统正在形成第一版经营判断。`);
  const diagnosis =
    decisionPackRisk ||
    latest?.diagnosis ||
    (isInitialBrief ? firstRiskSummary : `最大不确定来自定位与执行闭环是否清晰，健康度约 ${projectHealth}。`);
  const judgement =
    decisionPackJudgement ||
    lastMeetingRecommendationEarly ||
    latest?.judgement ||
    (isInitialBrief
      ? `今天先不要试图解决所有问题，而是先把“${currentChallenge}”重新定义成一个可以验证的经营判断。`
      : "今天优先把当前问题压成一个可验证的经营动作，而不是继续发散信息。");
  const recommendation =
    (lastDecisionPackRawEarly?.summary
      ? String(lastDecisionPackRawEarly.summary)
      : null) ||
    latest?.strategy ||
    latest?.action ||
    (isInitialBrief
      ? "第一次去拍板，先锁定关键变量，再形成第一条经营判断。"
      : "去拍板，补充事实并完成一次完整判断链。");

  const growthPlanRaw = profile.growthPlan as
    | {
        day30?: string;
        day60?: string;
        day90?: string;
        startedAt?: string;
        decisionSummary?: string;
        horizonDays?: number;
      }
    | undefined;
  const growthPlan =
    growthPlanRaw && growthPlanRaw.day30 && growthPlanRaw.startedAt
      ? {
          day30: String(growthPlanRaw.day30),
          day60: String(growthPlanRaw.day60 || ""),
          day90: String(growthPlanRaw.day90 || ""),
          startedAt: String(growthPlanRaw.startedAt),
          decisionSummary: String(growthPlanRaw.decisionSummary || latest?.judgement || ""),
          horizonDays: Number(growthPlanRaw.horizonDays || 90),
          daysRemaining: Math.max(
            0,
            Number(growthPlanRaw.horizonDays || 90) -
              Math.floor(
                (Date.now() - new Date(String(growthPlanRaw.startedAt)).getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
          ),
        }
      : null;

  const activeMeetingParsed = ActiveMeetingDraftSchema.safeParse(
    (profile as Record<string, unknown>).activeMeeting,
  );
  const pendingMeetingDraft =
    activeMeetingParsed.success &&
    activeMeetingParsed.data.status === "draft" &&
    activeMeetingParsed.data.topicConfirmed
      ? {
          topic: activeMeetingParsed.data.topic,
          lifecycle: activeMeetingParsed.data.lifecycle,
          lifecycleLabel: lifecycleLabel(
            activeMeetingParsed.data.lifecycle as MeetingLifecycle,
          ),
          deliberationRound: activeMeetingParsed.data.deliberationRound,
          updatedAt: activeMeetingParsed.data.updatedAt,
          href: `/projects/${bundle.project.id}/decision-room?topic=${encodeURIComponent(activeMeetingParsed.data.topic)}&intake=ready`,
        }
      : null;

  /** 七常委决策板已就绪、待创始人裁决 */
  const councilDraft = parseActiveCouncilDraft(
    (profile as Record<string, unknown>).activeCouncilDraft,
  );
  const pendingCouncilAdjudication = councilDraft
    ? {
        topic: councilDraft.topic,
        level: councilDraft.level || null,
        recommendedAction: councilDraft.recommendedAction || null,
        insightCount: councilDraft.insightCount ?? 0,
        supportCount: councilDraft.supportCount ?? 0,
        opposeCount: councilDraft.opposeCount ?? 0,
        observeCount: councilDraft.observeCount ?? 0,
        biggestDispute: councilDraft.biggestDispute || null,
        status: councilDraft.status,
        statusLabel:
          councilDraft.status === "awaiting_founder"
            ? "待你拍板"
            : "可去拍板",
        href: `/projects/${bundle.project.id}/decision-room?resume=1`,
      }
    : null;

  /** Mobile Agent 编译产出的待确认决策（非终局） */
  const mobileAgentState = readMobileAgentState(
    profile as Record<string, unknown>,
  );
  const mobilePending = mobileAgentState.pendingDecisions[0];
  const pendingMobileDecision = mobilePending
    ? {
        title: mobilePending.title,
        reason: mobilePending.reason,
        goalTitle: mobileAgentState.activeGoal?.title ?? null,
        href: `/projects/${bundle.project.id}/decision-room?topic=${encodeURIComponent(mobilePending.title)}`,
        agentHref: `/projects/${bundle.project.id}/agent`,
      }
    : null;

  const validationTasksRaw = Array.isArray((profile as Record<string, unknown>).validationTasks)
    ? ((profile as Record<string, unknown>).validationTasks as Array<Record<string, unknown>>)
    : [];
  const suggestedNextMeetingRaw = (profile as Record<string, unknown>)
    .suggestedNextMeeting as { topic?: string; reason?: string } | undefined;
  const suggestedNextMeeting =
    suggestedNextMeetingRaw?.topic && String(suggestedNextMeetingRaw.topic).trim()
      ? {
          topic: String(suggestedNextMeetingRaw.topic).trim(),
          reason: suggestedNextMeetingRaw.reason
            ? String(suggestedNextMeetingRaw.reason).trim()
            : "上次验证偏离，建议再去拍板校准",
        }
      : null;
  const activeValidationTaskRaw = validationTasksRaw.find((task) => {
    const status = String(task.status || "");
    const lifecycle = String(task.lifecycle || "");
    return (
      status === "in_progress" ||
      status === "at_risk" ||
      status === "planned" ||
      lifecycle === "REVIEW" ||
      lifecycle === "OBSERVING"
    );
  });
  const triggerFired = Array.isArray(activeValidationTaskRaw?.triggers)
    ? (activeValidationTaskRaw!.triggers as Array<{ fired?: boolean }>).some(
        (t) => t.fired,
      )
    : false;
  const activeValidationTask = activeValidationTaskRaw
    ? {
        id: String(activeValidationTaskRaw.id || ""),
        title: String(activeValidationTaskRaw.title || "验证任务"),
        objective: String(activeValidationTaskRaw.objective || ""),
        status: String(activeValidationTaskRaw.status || "in_progress"),
        lifecycle: String(activeValidationTaskRaw.lifecycle || ""),
        owner: String(activeValidationTaskRaw.owner || "老板"),
        horizonDays: Number(activeValidationTaskRaw.horizonDays || 90),
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (new Date(String(activeValidationTaskRaw.dueAt || Date.now())).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
        ),
        hypothesisStatement: String(
          (activeValidationTaskRaw.hypothesis as { statement?: string } | undefined)?.statement ||
            activeValidationTaskRaw.objective ||
            "",
        ),
        aiJudgement: activeValidationTaskRaw.aiJudgement
          ? String(activeValidationTaskRaw.aiJudgement)
          : null,
        passProbability:
          typeof activeValidationTaskRaw.passProbability === "number"
            ? activeValidationTaskRaw.passProbability
            : null,
        suggestRedeision:
          triggerFired ||
          String(activeValidationTaskRaw.status || "") === "at_risk" ||
          String(activeValidationTaskRaw.lifecycle || "") === "REVIEW" ||
          Boolean(suggestedNextMeeting),
        triggerReasons: Array.isArray(activeValidationTaskRaw.triggers)
          ? (activeValidationTaskRaw.triggers as Array<{ fired?: boolean; reason?: string }>)
              .filter((t) => t.fired && t.reason)
              .map((t) => String(t.reason))
              .slice(0, 3)
          : [],
        metrics: Array.isArray(activeValidationTaskRaw.metrics)
          ? (activeValidationTaskRaw.metrics as Array<Record<string, unknown>>)
              .slice(0, 4)
              .map((m) => ({
                label: String(m.label || m.name || ""),
                target: m.targetLabel
                  ? String(m.targetLabel)
                  : m.target !== undefined
                    ? String(m.target)
                    : undefined,
                actual: m.actualLabel
                  ? String(m.actualLabel)
                  : m.actual !== undefined
                    ? String(m.actual)
                    : undefined,
              }))
          : [],
        latestNote:
          Array.isArray(activeValidationTaskRaw.checkIns) &&
          (activeValidationTaskRaw.checkIns as Array<Record<string, unknown>>).length > 0
            ? String(
                (
                  activeValidationTaskRaw.checkIns as Array<Record<string, unknown>>
                ).at(-1)?.note || "",
              )
            : null,
        decisionId: String(activeValidationTaskRaw.decisionId || ""),
        href: `/projects/${bundle.project.id}/decisions`,
      }
    : null;

  /** 偏航催办：即使任务已 FAILED，仍可读 suggestedNextMeeting */
  const pendingRedeision = suggestedNextMeeting
    ? {
        topic: suggestedNextMeeting.topic,
        reason: suggestedNextMeeting.reason,
        href: buildMeetingHref(
          bundle.project.id,
          suggestedNextMeeting.topic,
          detectDepartmentFromTopic(suggestedNextMeeting.topic),
          { confirmSpend: true, spendKind: "growth" },
        ),
      }
    : activeValidationTask?.suggestRedeision
      ? {
          topic: `复盘：${activeValidationTask.hypothesisStatement || activeValidationTask.title}`,
          reason:
            activeValidationTask.triggerReasons[0] ||
            activeValidationTask.aiJudgement ||
            "验证偏航，建议再去拍板校准路径",
          href: buildMeetingHref(
            bundle.project.id,
            `复盘：${activeValidationTask.hypothesisStatement || activeValidationTask.title}`,
            "general",
            { confirmSpend: true, spendKind: "growth" },
          ),
        }
      : null;

  /** E4：DeviationReport 可读投影（供 Brief 展示，不改战略） */
  const lastDeviationRaw = (profile as Record<string, unknown>)
    .lastDeviationReport as Record<string, unknown> | undefined;
  const lastDeviation =
    lastDeviationRaw && typeof lastDeviationRaw === "object"
      ? {
          summary: String(lastDeviationRaw.summary || "").trim(),
          severity: String(lastDeviationRaw.severity || "medium"),
          kind: String(lastDeviationRaw.kind || ""),
          suggestedCouncilTopic: String(
            lastDeviationRaw.suggestedCouncilTopic || "",
          ).trim(),
          decisionId: String(lastDeviationRaw.decisionId || ""),
        }
      : null;
  const lastDeviationView =
    lastDeviation?.summary || lastDeviation?.suggestedCouncilTopic
      ? lastDeviation
      : null;

  /** R5：取最严重 openRisk；机会在阻断风险下对 Brief 隐藏 */
  const openRiskAlert = pickTopOpenRiskAlert(
    (profile as Record<string, unknown>).openRiskAlerts,
  );
  const riskBlocksOpportunity = isBlockingRisk(openRiskAlert);
  const openRiskView = openRiskAlert
    ? {
        id: String(openRiskAlert.id || ""),
        type: String(openRiskAlert.type || ""),
        level: String(openRiskAlert.level || "medium"),
        title: String(openRiskAlert.title || "").trim(),
        description: String(openRiskAlert.description || "").trim(),
        suggestedTopic: String(openRiskAlert.suggestedTopic || "").trim(),
        suggestExpert: openRiskAlert.suggestExpert
          ? String(openRiskAlert.suggestExpert)
          : null,
        suggestCouncil: Boolean(openRiskAlert.suggestCouncil),
      }
    : null;

  const openOpportunity = pickTopOpportunity(
    (profile as Record<string, unknown>).openOpportunities,
    { hideWhenRiskBlocks: true, blockingRisk: openRiskAlert },
  );
  const openOpportunityView = openOpportunity
    ? {
        id: String(openOpportunity.id || ""),
        title: String(openOpportunity.title || "").trim(),
        score:
          typeof openOpportunity.score === "number"
            ? openOpportunity.score
            : null,
        status: String(openOpportunity.status || "detected"),
        suggestedTopic: String(openOpportunity.suggestedTopic || "").trim(),
        suggestExpert: openOpportunity.suggestExpert
          ? String(openOpportunity.suggestExpert)
          : null,
      }
    : null;

  const lastDebateScenariosRaw = Array.isArray(
    (profile as Record<string, unknown>).lastDebateScenarios,
  )
    ? ((profile as Record<string, unknown>).lastDebateScenarios as Array<
        Record<string, unknown>
      >)
    : [];
  const lastDebateScenarios = lastDebateScenariosRaw.slice(0, 3).map((s) => ({
    scenario: String(s.scenario || ""),
    trigger: String(s.trigger || ""),
    impact: String(s.impact || ""),
    mitigation: String(s.mitigation || ""),
  }));
  const lastDebateConflicts = Array.isArray(
    (profile as Record<string, unknown>).lastDebateConflicts,
  )
    ? (
        (profile as Record<string, unknown>).lastDebateConflicts as Array<
          Record<string, unknown>
        >
      )
        .slice(0, 2)
        .map((c) => ({
          topic: String(c.topic || ""),
          severity: String(c.severity || ""),
          summary: String(c.summary || ""),
        }))
    : [];
  const lastMeetingRecommendation =
    typeof (profile as Record<string, unknown>).lastMeetingRecommendation === "string"
      ? String((profile as Record<string, unknown>).lastMeetingRecommendation)
      : null;

  const lastDecisionPackRaw = (profile as Record<string, unknown>).lastDecisionPack as
    | {
        packId?: string;
        chosen?: string;
        strategyDecision?: string;
        summary?: string;
        evidenceStatus?: string;
        capitalBrief?: string | null;
        topRisks?: string[];
        createdAt?: string;
      }
    | undefined;
  const lastDecisionPack = lastDecisionPackRaw?.strategyDecision
    ? {
        packId: String(lastDecisionPackRaw.packId || ""),
        chosen: String(lastDecisionPackRaw.chosen || ""),
        strategyDecision: String(lastDecisionPackRaw.strategyDecision),
        summary: String(lastDecisionPackRaw.summary || ""),
        evidenceStatus: String(lastDecisionPackRaw.evidenceStatus || ""),
        capitalBrief: lastDecisionPackRaw.capitalBrief
          ? String(lastDecisionPackRaw.capitalBrief)
          : null,
        topRisks: Array.isArray(lastDecisionPackRaw.topRisks)
          ? lastDecisionPackRaw.topRisks.map((r) => String(r)).slice(0, 3)
          : [],
        createdAt: lastDecisionPackRaw.createdAt
          ? String(lastDecisionPackRaw.createdAt)
          : null,
      }
    : null;

  const lastActionPlanRaw = (profile as Record<string, unknown>).lastActionPlan as
    | Record<string, unknown>
    | undefined;
  const lastActionPlan = lastActionPlanRaw
    ? {
        planId: String(lastActionPlanRaw.planId || ""),
        summary: String(lastActionPlanRaw.summary || ""),
        goals: Array.isArray(lastActionPlanRaw.goals)
          ? (lastActionPlanRaw.goals as Array<Record<string, unknown>>).slice(0, 3).map((g) => ({
              title: String(g.title || ""),
              horizonDays: typeof g.horizonDays === "number" ? g.horizonDays : undefined,
            }))
          : [],
        actions: Array.isArray(lastActionPlanRaw.actions)
          ? (lastActionPlanRaw.actions as Array<Record<string, unknown>>)
              .slice(0, 3)
              .map((a, i) => ({
                actionId: String(a.actionId || `act_${i + 1}`),
                title: String(a.title || ""),
                owner: a.owner ? String(a.owner) : undefined,
                status: String(a.status || "planned"),
                dueInDays:
                  typeof a.dueInDays === "number" ? a.dueInDays : undefined,
              }))
          : [],
        validationTaskId: lastActionPlanRaw.validationTaskId
          ? String(lastActionPlanRaw.validationTaskId)
          : undefined,
      }
    : null;

  const lastGrowthDeltaRaw = (profile as Record<string, unknown>).lastGrowthDelta as
    | Record<string, unknown>
    | undefined;
  const lastCapabilityScoresRaw = Array.isArray(
    (profile as Record<string, unknown>).lastCapabilityScores,
  )
    ? ((profile as Record<string, unknown>).lastCapabilityScores as Array<
        Record<string, unknown>
      >)
    : [];
  const capabilityScores = lastCapabilityScoresRaw
    .map((s) => ({
      id: String(s.id || ""),
      label: String(s.label || ""),
      score: typeof s.score === "number" ? s.score : Number(s.score) || 0,
      note: s.note ? String(s.note) : "",
      trend: String(s.trend || "flat"),
    }))
    .filter((s) => s.id);
  const weakestCapabilityScore = capabilityScores.length
    ? [...capabilityScores].sort((a, b) => a.score - b.score)[0]
    : null;
  const founderGrowth = lastGrowthDeltaRaw || weakestCapabilityScore
    ? {
        summary: lastGrowthDeltaRaw?.summary
          ? String(lastGrowthDeltaRaw.summary)
          : null,
        learningNext: Array.isArray(lastGrowthDeltaRaw?.learningNext)
          ? (lastGrowthDeltaRaw!.learningNext as unknown[])
              .map((x) => String(x || ""))
              .filter(Boolean)
              .slice(0, 3)
          : [],
        reflections: Array.isArray(lastGrowthDeltaRaw?.reflections)
          ? (lastGrowthDeltaRaw!.reflections as unknown[])
              .map((x) => String(x || ""))
              .filter(Boolean)
              .slice(0, 3)
          : [],
        weakest: weakestCapabilityScore
          ? {
              id: weakestCapabilityScore.id,
              label: weakestCapabilityScore.label,
              score: weakestCapabilityScore.score,
              note: weakestCapabilityScore.note,
            }
          : null,
        cognitiveGap: (() => {
          const raw = (profile as Record<string, unknown>).lastCognitiveGap as
            | Record<string, unknown>
            | null
            | undefined;
          if (!raw || typeof raw !== "object") return null;
          return {
            summary: String(raw.summary || ""),
            believedCause: String(raw.believedCause || ""),
            likelyRootCause: String(raw.likelyRootCause || ""),
            kind: String(raw.kind || "unknown"),
            suggestCommittee: raw.suggestCommittee
              ? String(raw.suggestCommittee)
              : null,
          };
        })(),
        decisionLesson: (() => {
          const raw = (profile as Record<string, unknown>)
            .lastDecisionPattern as Record<string, unknown> | undefined;
          if (!raw || typeof raw !== "object") return null;
          const lesson = String(raw.lesson || "").trim();
          return lesson || null;
        })(),
        growthPath: (() => {
          const raw = (profile as Record<string, unknown>).lastGrowthPath;
          if (!Array.isArray(raw)) return [] as string[];
          return raw
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              return String((item as Record<string, unknown>).title || "");
            })
            .filter(Boolean)
            .slice(0, 3);
        })(),
        decisionQuality: (() => {
          const raw = (profile as Record<string, unknown>)
            .lastDecisionQuality as Record<string, unknown> | undefined;
          if (!raw || typeof raw !== "object") return null;
          return {
            total:
              typeof raw.total === "number" ? raw.total : null,
            judgement:
              typeof raw.judgement === "number" ? raw.judgement : null,
            execution:
              typeof raw.execution === "number" ? raw.execution : null,
            result: typeof raw.result === "number" ? raw.result : null,
          };
        })(),
        growthTasks: (() => {
          const raw = (profile as Record<string, unknown>).growthTasks;
          if (!Array.isArray(raw)) return [] as Array<{ goal: string; topic: string }>;
          return raw
            .filter(
              (t) =>
                t &&
                typeof t === "object" &&
                (t as Record<string, unknown>).status !== "done",
            )
            .slice(0, 3)
            .map((t) => {
              const row = t as Record<string, unknown>;
              return {
                goal: String(row.goal || ""),
                topic: String(row.suggestedTopic || row.goal || ""),
              };
            })
            .filter((t) => t.goal);
        })(),
      }
    : null;

  const intelligenceProfile = buildFounderIntelligenceProfile({
    ownerId: bundle.owner.id || "unknown",
    projectId: bundle.project.id,
    profile: profile as Record<string, unknown>,
  });
  const intelligenceBrief = buildIntelligenceBriefSummary(intelligenceProfile);
  const founderIntelligence =
    intelligenceProfile.confidence > 0 ||
    intelligenceProfile.personality.traits.length > 0 ||
    intelligenceProfile.historicalLessons.length > 0
      ? {
          headline: intelligenceBrief.headline,
          styleLine: intelligenceBrief.styleLine,
          confidence: intelligenceProfile.confidence,
          riskPreference: intelligenceProfile.decisionStyle.riskPreference,
          aiStance: intelligenceProfile.decisionStyle.aiStance,
          followThrough: intelligenceProfile.executionAbility.followThrough,
          completionRate:
            intelligenceProfile.executionAbility.recentCompletionRate,
          lesson: intelligenceProfile.historicalLessons[0]?.summary || null,
          industryOptIn:
            intelligenceProfile.permissions.contributeToIndustryModel,
          href: `/profile`,
        }
      : null;

  const brandView = resolveActiveBrand(
    profile as Record<string, unknown>,
    bundle.project.name,
  );
  const brandsRaw = Array.isArray((profile as Record<string, unknown>).brands)
    ? ((profile as Record<string, unknown>).brands as Array<Record<string, unknown>>)
    : [];
  const brandPortfolio = {
    enterpriseName: bundle.project.name,
    brandCount: Math.max(1, brandsRaw.length || 1),
    activeBrandName: brandView.brandName,
    activeBrandId: brandView.id,
    brandNames: brandsRaw
      .map((b) => String(b.brandName || "").trim())
      .filter(Boolean)
      .slice(0, 6),
  };

  return {
    todayLabel: formatTodayLabel(),
    ownerName,
    confidence,
    projectHealth,
    projectStatus: STAGE_FLOW[stageIndex(bundle.project.stage, bundle.decisions.length)] ?? "创业探索",
    homeMode,
    todayStatus: homeMode === "forming" ? (isInitialBrief ? "第一次经营校准已生成" : "经营简报形成中") : "今日经营简报已就绪",
    brandPortfolio,
    ...focus,
    strategicSummary: recommendation,
    biggestRisk:
      openRiskView?.title ||
      lastDeviationView?.summary ||
      latest?.diagnosis ||
      (isInitialBrief ? firstRiskSummary : "定位与选择理由尚未完全收束"),
    currentProblemTitle: riskBlocksOpportunity
      ? openRiskView?.suggestedTopic ||
        openRiskView?.title ||
        latest?.problem ||
        currentChallenge ||
        "明确当前最重要的经营问题"
      : openOpportunityView?.suggestedTopic ||
        openOpportunityView?.title ||
        latest?.problem ||
        currentChallenge ||
        "明确当前最重要的经营问题",
    currentProblemImpact: diagnosis,
    currentProblemAction: latest?.action || recommendation,
    currentFocus: focus.focusCapability,
    recommendation,
    initialStageSummary: isInitialBrief ? firstStageSummary : null,
    initialRiskSummary: isInitialBrief ? firstRiskSummary : null,
    initialMeetingReason: isInitialBrief ? firstMeetingReason : null,
    initialYearlyGoal: isInitialBrief ? yearlyGoal : null,
    timelineTitle: homeMode === "forming" ? "判断正在形成" : "最近经营判断",
    decisionTimeline: timeline,
    pendingReviewItems,
    positioningReviewCount,
    positioningReviewAlert,
    pendingMeetingDraft,
    pendingCouncilAdjudication,
    pendingMobileDecision,
    activeValidationTask,
    pendingRedeision:
      riskBlocksOpportunity && openRiskView?.suggestedTopic
        ? {
            topic: openRiskView.suggestedTopic,
            reason: openRiskView.description || openRiskView.title,
            href: buildMeetingHref(
              bundle.project.id,
              openRiskView.suggestedTopic,
              detectDepartmentFromTopic(openRiskView.suggestedTopic),
              { confirmSpend: true, spendKind: "growth" },
            ),
          }
        : pendingRedeision,
    suggestedNextMeeting:
      riskBlocksOpportunity && openRiskView?.suggestedTopic
        ? {
            topic: openRiskView.suggestedTopic,
            reason: openRiskView.description || openRiskView.title,
          }
        : suggestedNextMeeting,
    lastDeviation: lastDeviationView,
    openRiskAlert: openRiskView,
    openOpportunity: openOpportunityView,
    riskBlocksOpportunity,
    lastDebateScenarios,
    lastDebateConflicts,
    lastMeetingRecommendation,
    lastActionPlan,
    lastDecisionPack,
    founderGrowth,
    founderIntelligence,
    abilityMap: abilities,
    strongestAbility: strongest?.label ?? "产品能力",
    strongestCoreAbility: CORE_MAP[strongest?.label ?? "产品能力"] ?? "决策力",
    weakestAbility: weakest?.label ?? "增长能力",
    dailyObservation: observation,
    dailyDiagnosis: diagnosis,
    dailyJudgement: judgement,
    dailyRecommendation: recommendation,
    dailyActionTitle: latest?.action?.slice(0, 24) || "完成一次经营判断",
    dailyActionGoal: recommendation,
    dailyActionImprovement: `+${Math.max(3, Math.round((100 - (weakest?.value ?? 50)) / 10))}%`,
    brainChanges: [
      { label: strongest?.label ?? "产品能力", trend: "up", reason: "近期判断更贴近产品与定位" },
      { label: weakest?.label ?? "增长能力", trend: "need", reason: "仍需更多市场验证与反馈" },
      { label: "判断闭环", trend: "up", reason: `已沉淀 ${bundle.decisions.length} 条决策` },
    ],
    actionHeadline: "今天最值得做的一件事",
    actionSummary: recommendation,
    actionValue: focus.focusCoreAbility,
    actionOutput: "一条可执行判断 + 下一步动作",
    actionDuration: "15-25 分钟",
    secondaryCta: {
      href: `/projects/${bundle.project.id}/decision-room`,
      label: "去拍板",
    },
    growthPlan,
    lastMeetingDecision: latest
      ? {
          id: latest.id,
          judgement: latest.judgement,
          problem: latest.problem,
        }
      : null,
  };
}

export function buildProjectOverview(bundle: ProjectInsightBundle) {
  const abilities = resolveAbilityMap(bundle.project, bundle.owner);
  const ranked = sortAbilities(abilities);
  const weakest = ranked[ranked.length - 1];
  const focus = focusFromWeakest(weakest);
  const latest = bundle.decisions[0];
  const idx = stageIndex(bundle.project.stage, bundle.decisions.length);
  const profile = bundle.project.profile ?? {};
  const hasStructuredProfile = Object.keys(profile).length > 0;
  const isInitialWorld =
    bundle.decisions.length === 0 && asString(profile.onboardingSource) === "initial_diagnostic";
  const currentChallenge =
    asString(profile.currentProblemTitle) ??
    asString(profile.currentChallenge) ??
    bundle.currentGoal ??
    "当前最重要的经营问题";
  const yearlyGoal =
    bundle.currentGoal ??
    asString(profile.yearlyGoal) ??
    asString(profile.currentProblemImpact)?.replace(/^未来一年的关键目标是：/, "") ??
    "形成未来一年的关键经营目标";
  const score = clamp(bundle.project.healthScore ?? ranked[0]?.value ?? 62);
  const confidence = clamp(
    (bundle.project.confidence ?? latest?.confidence ?? 0.6) *
      (bundle.project.confidence && bundle.project.confidence <= 1 ? 100 : 1),
  );

  const keyVariables = [
    {
      label: "产品稳定性",
      value: clamp(score + (/产品|菜单|出品|口味/.test(currentChallenge) ? 4 : 0) - 4),
      reason: isInitialWorld
        ? "首轮先确认产品与体验是否足够稳定，否则后续增长与复制判断都会失真。"
        : "产品体验是否稳定，决定经营模型能否被持续验证。",
    },
    {
      label: "用户复购",
      value: clamp(score + (/复购|用户|留存|回头客/.test(currentChallenge) ? 4 : 0) - 6),
      reason: isInitialWorld
        ? "现在要先判断用户是否真的愿意重复回来，而不只是一次性买单。"
        : "用户是否重复回来，决定增长是不是建立在真实价值上。",
    },
    {
      label: "团队复制",
      value: clamp(score + (/团队|店长|复制|执行|组织/.test(currentChallenge) ? 5 : 0) - 10),
      reason: isInitialWorld
        ? "如果经营仍然只能靠你本人撑住，后续扩张与稳定都会被卡住。"
        : "团队能否承接判断并稳定执行，决定模型能否离开经营者本人继续运转。",
    },
    {
      label: "现金流",
      value: clamp(score + (/现金流|成本|利润|预算/.test(currentChallenge) ? 4 : 0) - 8),
      reason: isInitialWorld
        ? "首轮就要确认资源与资金承压边界，避免策略判断脱离现实约束。"
        : "现金流承压能力决定你能否把判断安全推进到下一阶段。",
    },
    {
      label: "品牌认知",
      value: clamp(score + (/品牌|定位|认知|传播/.test(currentChallenge) ? 4 : 0) - 7),
      reason: isInitialWorld
        ? "用户是否真正理解你是谁、为什么选你，会直接影响后续复购与增长。"
        : "品牌认知决定你的差异化能否被用户长期记住。",
    },
  ];

  const riskMap = keyVariables.map((item) => {
    const riskValue = clamp(100 - item.value + 8);
    const level = riskValue >= 55 ? "high" : riskValue >= 38 ? "medium" : "low";
    const topicMap: Record<string, string> = {
      产品稳定性: "先确认产品是否已经稳定到可以继续放大",
      用户复购: "先判断复购问题到底来自产品、场景还是用户认知",
      团队复制: "先验证团队能否离开经营者本人稳定承接",
      现金流: "先厘清预算、利润与现金流承压边界",
      品牌认知: "先重判品牌定位与用户心智是否真的建立",
    };

    return {
      label: `${item.label}风险`,
      value: riskValue,
      level,
      reason: item.reason,
      meetingTopic: topicMap[item.label] ?? "去拍板继续校准这个风险",
    };
  });

  const tasks = [
    {
      id: "task-meeting",
      title: "去拍板完成一轮判断",
      description: latest?.action || "补充事实、形成判断、收束动作",
      completed: bundle.decisions.length > 0,
      priority: "high",
    },
    {
      id: "task-feedback",
      title: "给历史决策补充结果反馈",
      description: "让系统学习哪些判断有效",
      completed: false,
      priority: "medium",
    },
  ];

  return {
    score,
    confidence,
    hasStructuredProfile,
    isInitialWorld,
    ownerName: bundle.owner.name ?? bundle.project.ownerName,
    currentStageLabel: STAGE_FLOW[idx] ?? "创业探索",
    operatingStatus: score >= 75 ? "稳定推进" : score >= 60 ? "持续校准" : "需要重判",
    stageInsight:
      latest?.judgement ||
      (isInitialWorld
        ? `你当前处在 ${STAGE_FLOW[idx]} 的早期校准阶段，系统正在把“${currentChallenge}”与“${yearlyGoal}”连接成第一版经营现实模型。`
        : `项目「${bundle.project.name}」处于 ${STAGE_FLOW[idx]}，系统正在连接阶段目标与风险。`),
    positioning:
      asString(profile.positioning) ||
      asString((profile.mPnt as Record<string, unknown> | undefined)?.oneLiner) ||
      bundle.project.target ||
      latest?.strategy ||
      "定位仍在形成，建议在会议中明确差异化理由。",
    positioningDetail: (() => {
      const mPnt = profile.mPnt as Record<string, unknown> | undefined;
      if (!mPnt && !profile.positioning && !bundle.project.target) return null;
      const bp = (mPnt?.brandPositioning || {}) as Record<string, unknown>;
      return {
        oneLiner:
          asString(mPnt?.oneLiner) ||
          asString(profile.positioning) ||
          bundle.project.target ||
          "",
        mentalPosition: asString(bp.mentalPosition) || asString(profile.mentalPosition),
        targetCustomers:
          asString(bp.targetCustomers) || asString(profile.targetCustomers),
        priceRange: asString(bp.priceRange) || asString(profile.priceRange),
        differentiation:
          asString(bp.differentiation) || asString(profile.differentiation),
        brandTonality:
          asString(bp.brandTonality) || asString(profile.brandTonality),
        confidence: typeof mPnt?.confidence === "number" ? mPnt.confidence : null,
        updatedAt: asString(mPnt?.updatedAt),
        href: `/projects/${bundle.project.id}/positioning`,
      };
    })(),
    hasPositioning: Boolean(
      profile.mPnt ||
        profile.positioning ||
        bundle.project.target ||
        bundle.decisions.some((d) => d.type === "positioning"),
    ),
    biggestRisk:
      (isInitialWorld
        ? `如果现在没有先锁定“${currentChallenge}”背后的真正变量，后续所有动作都可能围绕错误问题展开。`
        : null) ??
      riskMap[0]?.reason ??
      "定位与选择理由尚未完全收束",
    initialChallenge: isInitialWorld ? currentChallenge : null,
    initialYearlyGoal: isInitialWorld ? yearlyGoal : null,
    initialMeetingReason: isInitialWorld ? `下一步需要去拍板，先围绕“${yearlyGoal}”锁定一个不能判断错的关键变量。` : null,
    ...focus,
    stageTrack: buildStageTrack(idx),
    keyVariables,
    riskMap,
    capabilityModules: abilities.map((a) => ({
      label: a.label,
      agent: CORE_MAP[a.label] ?? "成长力",
      status: a.value >= 70 ? "ready" : a.value >= 55 ? "forming" : "gap",
      reason: `${a.label}当前约 ${a.value} 分`,
    })),
    worldAssets: {
      decisions: bundle.decisions.length,
      memories: bundle.memories.length,
      reports: bundle.latestReport ? 1 : 0,
      cases: Math.max(1, Math.min(bundle.decisions.length, 6)),
      principles: Math.max(2, Math.min(bundle.memories.length + 2, 10)),
      accuracy: clamp(50 + bundle.decisions.length * 4),
    },
    nextPush: (() => {
      const hasPos = Boolean(
        profile.mPnt || profile.positioning || bundle.project.target,
      );
      if (isInitialWorld && !hasPos) {
        return {
          title: "先完成品牌定位",
          description: `把「${currentChallenge}」收成一句心智位置，再去拍板。`,
          href: `/projects/${bundle.project.id}/positioning`,
          meetingHref: buildFounderMeetingLink(
            bundle.project.id,
            `围绕“${currentChallenge}”先完成品牌定位，再去拍板。`,
          ),
          actions: ["品类判断", "客群收敛", "一句话定位"],
        };
      }
      if (!hasPos) {
        return {
          title: "补齐品牌定位",
          description: "定位未收束前，选址与投放都容易发散。",
          href: `/projects/${bundle.project.id}/positioning`,
          meetingHref: buildFounderMeetingLink(
            bundle.project.id,
            "先补齐品牌定位，再决定后续经营动作。",
          ),
          actions: ["启动 M-PNT", "明确心智位置", "写入跟进"],
        };
      }
      const meetingTopic = isInitialWorld
        ? `先把“${currentChallenge}”压成第一条经营判断。`
        : tasks[0].title;
      return {
        title: isInitialWorld ? "第一次去拍板" : tasks[0].title,
        description: isInitialWorld
          ? `先把“${currentChallenge}”压成第一条经营判断。`
          : tasks[0].description,
        href: `/projects/${bundle.project.id}/decision-room`,
        meetingHref: `/projects/${bundle.project.id}/decision-room?topic=${encodeURIComponent(meetingTopic)}`,
        actions: isInitialWorld
          ? ["重定义问题", "锁定关键变量", "形成第一条判断"]
          : tasks.map((t) => t.title),
      };
    })(),
    memoryItems: bundle.memories.slice(0, 6).map((m) => ({
      label: m.key,
      title: m.content.slice(0, 48),
      meta: m.source,
    })),
    tasks,
  };
}

export function buildScorecard(bundle: ProjectInsightBundle) {
  const overview = buildProjectOverview(bundle);
  const metricKeyMap: Record<string, string> = {
    产品稳定性: "product_stability",
    用户复购: "user_retention",
    团队复制: "team_replication",
    现金流: "cash_flow",
    品牌认知: "brand_awareness",
  };
  const metrics = overview.keyVariables.map((v) => ({
    key: metricKeyMap[v.label] ?? "world_variable",
    label: v.label,
    value: v.value,
    reason: v.reason,
  }));
  const score = overview.score;
  const scoreLabel =
    score >= 85 ? "状态优秀" : score >= 70 ? "状态良好" : score >= 55 ? "正在成形" : "需要重点校准";

  return {
    score,
    scoreLabel,
    strategicSummary:
      bundle.decisions[0]?.judgement ||
      overview.stageInsight ||
      "继续形成判断与反馈，体检分数会随闭环提升。",
    metrics: metrics.map((m) => ({
      ...m,
      stars: `${Math.max(1, Math.round(m.value / 20))}/5`,
      width: `${m.value}%`,
    })),
  };
}

export function buildReportSnapshot(bundle: ProjectInsightBundle) {
  const scorecard = buildScorecard(bundle);
  const latest = bundle.decisions[0];
  const report = bundle.latestReport;
  if (!report && !latest) {
    return {
      latestReport: null as null,
      reportTypeLabel: "暂无报告",
      score: scorecard.score,
      conclusion: "尚未形成正式决策跟进",
      positioning: bundle.project.target || "定位待明确",
      riskTitle: "信息不足",
      counterArgument: "缺少反方验证材料",
      validationAction: "去拍板形成第一次判断",
      metrics: scorecard.metrics,
    };
  }

  const content = bundle.reportContent;
  return {
    latestReport: report,
    reportTypeLabel: report?.type === "diagnosis" ? "诊断报告" : report?.type || "经营报告",
    score: scorecard.score,
    conclusion:
      asString(content.conclusion) ||
      report?.summary ||
      latest?.judgement ||
      "已形成阶段性结论",
    positioning:
      asString(content.positioning) ||
      asString((bundle.project.profile as Record<string, unknown> | null)?.positioning) ||
      asString(
        (
          (bundle.project.profile as Record<string, unknown> | null)?.mPnt as
            | Record<string, unknown>
            | undefined
        )?.oneLiner,
      ) ||
      bundle.project.target ||
      latest?.strategy ||
      "定位仍在校准",
    riskTitle: asString(content.risk) || latest?.diagnosis || "执行与定位风险",
    counterArgument:
      asString(content.counterArgument) ||
      "如果目标客群并不认可当前差异化，推进速度会被高估。",
    validationAction:
      asString(content.nextAction) ||
      latest?.action ||
      "用一周时间验证一个关键假设",
    metrics: scorecard.metrics.map((m) => ({
      ...m,
      stars: m.stars ?? `${Math.max(1, Math.round(m.value / 20))}/5`,
      width: m.width ?? `${m.value}%`,
    })),
  };
}

export function buildKnowledgeCenter(
  bundle: ProjectInsightBundle,
  nodes: KnowledgeNodeView[],
) {
  const primary = nodes[0];
  const latest = bundle.decisions[0];
  return {
    title: primary?.title || "先把判断闭环做扎实",
    primaryInsight:
      primary?.content?.slice(0, 160) ||
      latest?.judgement ||
      "认知只有带回决策里才有价值。",
    takeaway:
      latest?.action ||
      "今天把一条认知带回项目：先验证，再扩张。",
    source: primary ? `知识库 · ${primary.type}` : "系统规则",
    tags: primary?.tags?.length ? primary.tags : ["判断闭环", "经营校准"],
    related: nodes.slice(1, 4).map((n) => ({ id: n.id, title: n.title })),
    projectHint: `关联项目：${bundle.project.name}`,
  };
}

export function buildAdvisorWorkspace(
  bundle: ProjectInsightBundle,
  options?: {
    /** 已验证咨询一手事实（店访优先），由调用方从 profile 只读提取 */
    consultingFactLines?: string[];
    storeVisitFactCount?: number;
  },
) {
  const abilities = resolveAbilityMap(bundle.project, bundle.owner);
  const ranked = sortAbilities(abilities);
  const focus = focusFromWeakest(ranked[ranked.length - 1]);
  const latest = bundle.decisions[0];
  const profile = bundle.project.profile ?? {};
  const isInitialMeeting =
    bundle.decisions.length === 0 && asString(profile.onboardingSource) === "initial_diagnostic";
  const businessType =
    bundle.project.category ?? asString(profile.businessType) ?? "当前餐饮业务";
  const currentChallenge =
    asString(profile.currentProblemTitle) ??
    asString(profile.currentChallenge) ??
    bundle.currentGoal ??
    "当前最重要的经营问题";
  const yearlyGoal =
    bundle.currentGoal ??
    asString(profile.yearlyGoal) ??
    asString(profile.currentProblemImpact)?.replace(/^未来一年的关键目标是：/, "") ??
    "形成未来一年的关键经营目标";
  const kickoffSummary = isInitialMeeting
    ? `我已经读取你的经营诊断启动信息：你当前经营的是「${businessType}」，眼下最大的挑战是「${currentChallenge}」，未来一年的核心目标是「${yearlyGoal}」。这场会商的任务不是继续收集表面信息，而是把这三个输入压成第一轮经营判断。`
    : null;
  const kickoffQuestions = isInitialMeeting
    ? [
        `你说的“${currentChallenge}”，真正卡住的是产品、组织、现金流还是增长？`,
        `为了实现“${yearlyGoal}”，当前最不能判断错的那个变量是什么？`,
        "如果这次会议只允许形成一条判断，你最希望先解决哪一个经营取舍？",
      ]
    : [];

  const stageFlow = buildStageTrack(stageIndex(bundle.project.stage, bundle.decisions.length)).map(
    (s, i) => ({
      key: `stage-${i}`,
      label: s.label,
      title: s.label,
      summary: s.status === "current" ? "当前阶段" : s.status === "done" ? "已完成" : "未到达",
      status: s.status,
    }),
  );

  return {
    isInitialMeeting,
    kickoffSummary,
    kickoffQuestions,
    currentProblem:
      latest?.problem ||
      (isInitialMeeting ? `围绕“${currentChallenge}”形成第一轮经营判断` : null) ||
      bundle.currentGoal ||
      "当前最重要的经营问题是什么？",
    consultantSummary:
      latest?.judgement ||
      kickoffSummary ||
      `我已读取「${bundle.project.name}」的项目上下文，建议先澄清事实，再收束判断与动作。`,
    consultantJudgements: [
      latest?.observation || (isInitialMeeting ? `当前挑战：${currentChallenge}` : "先确认我们掌握了哪些事实"),
      latest?.diagnosis || (isInitialMeeting ? `年度目标：${yearlyGoal}` : "识别真正卡住推进的关键变量"),
      latest?.strategy || (isInitialMeeting ? "先锁定一个最值得验证的关键变量" : "给出可在一周内验证的策略"),
    ],
    quickTopics: isInitialMeeting
      ? [
          "先帮我重定义问题",
          "先判断最大风险",
          "先拆出关键变量",
          "先形成第一条判断",
        ]
      : [
          "重新校准定位",
          "评估投资风险",
          "拆解本周执行",
          "复盘上次决策",
        ],
    meetingDecision: latest?.judgement || (isInitialMeeting ? "待形成首轮经营判断" : "待会商收束"),
    decisionNextStep:
      latest?.action || (isInitialMeeting ? "先把真实问题、关键变量与第一步动作收束出来" : "形成一条可执行动作"),
    ...focus,
    strongestAbility: ranked[0]?.label ?? "产品能力",
    knownFacts: (() => {
      const profile =
        (bundle.project.profile as Record<string, unknown> | null) || {};
      const brand = resolveActiveBrand(profile, bundle.project.name);
      const stageLabel =
        typeof profile.stageLabel === "string" && profile.stageLabel
          ? profile.stageLabel
          : bundle.project.stage ?? "idea";
      const category =
        brand.category ||
        (typeof profile.category === "string" ? profile.category : null);
      const consultingLines = (options?.consultingFactLines || []).slice(0, 8);
      return [
        ...consultingLines,
        `品牌：${brand.brandName}`,
        `项目：${bundle.project.name}`,
        `阶段：${stageLabel}`,
        category ? `品类：${category}` : null,
        brand.mentalPosition ? `心智定位：${brand.mentalPosition}` : null,
        bundle.project.city ? `城市：${bundle.project.city}` : null,
        isInitialMeeting ? `经营挑战：${currentChallenge}` : null,
        isInitialMeeting ? `年度目标：${yearlyGoal}` : null,
        `历史决策：${bundle.decisions.length} 条`,
      ].filter(Boolean) as string[];
    })(),
    storeVisitFactCount: options?.storeVisitFactCount ?? 0,
    evidenceItems: (() => {
      const consultingLines = (options?.consultingFactLines || []).slice(0, 6);
      const base = isInitialMeeting
        ? [
            `诊断输入：当前经营类型为 ${businessType}`,
            `当前最大挑战：${currentChallenge}`,
            `未来一年目标：${yearlyGoal}`,
            ...(bundle.memories.slice(0, 2).map((m) => m.content.slice(0, 80)) || []),
          ]
        : [
            ...bundle.memories.slice(0, 4).map((m) => m.content.slice(0, 80)),
            ...(bundle.memories.length === 0
              ? ["项目基础信息已加载", "等待补充更多经营资料"]
              : []),
          ];
      return [...consultingLines, ...base].slice(0, 10);
    })(),
    challenge: isInitialMeeting
      ? "如果现在把表面症状当成根因，后续 Today 和 Meeting 都会围绕错误问题持续发力。"
      : "如果核心客群并不买单当前差异化，现有策略可能高估了转化效率。",
    actionPlan: isInitialMeeting
      ? [
          "先重新定义这次会议真正要解决的问题",
          "补充一个最关键的限制条件或证据",
          "收束出第一条可执行经营判断",
        ]
      : [
          latest?.action || "确认本周唯一关键动作",
          "补充一条可验证证据",
          "给上次决策补充结果反馈",
        ],
    stageFlow,
    actionPrompts: isInitialMeeting
      ? [
          { label: "重定义问题", prompt: `请重定义“${currentChallenge}”背后真正要解决的经营问题。` },
          { label: "锁定变量", prompt: `围绕“${yearlyGoal}”，请帮我锁定当前最关键的经营变量。` },
          { label: "形成首判", prompt: "请基于现有诊断信息，先形成第一轮经营判断和下一步动作。" },
        ]
      : [
          { label: "风险诊断", prompt: "帮我诊断当前最大风险" },
          { label: "预算取舍", prompt: "如果预算有限，该如何取舍？" },
          { label: "拆解动作", prompt: "把判断拆成这周三步动作" },
        ],
  };
}

export function buildProjectKnowledge(
  bundle: ProjectInsightBundle,
  nodes: KnowledgeNodeView[],
) {
  const primary = nodes[0];
  const latest = bundle.decisions[0];
  return {
    title: primary?.title || `${bundle.project.name} 的当前认知`,
    explanation:
      primary?.content?.slice(0, 200) ||
      latest?.judgement ||
      "把项目风险、规则与阶段目标连成可行动的认知。",
    source: primary ? `知识库 · ${primary.type}` : "项目决策",
    tags: primary?.tags?.length ? primary.tags : [bundle.project.category || "经营", "项目认知"],
    biggestRisk: latest?.diagnosis || "定位与执行闭环仍需验证",
    nextAction: latest?.action || "去拍板完成一轮判断",
    evidence: bundle.memories[0]?.content?.slice(0, 120) || latest?.observation || "暂无更多证据",
    related: nodes.slice(0, 4).map((n) => ({
      id: n.id,
      title: n.title,
      source: n.type,
    })),
  };
}

export function buildOwnerPortrait(
  bundle: ProjectInsightBundle | null,
  user: { name: string | null; preferences: Record<string, unknown> },
  stats: { projectCount: number; decisionCount: number; memoryCount: number },
) {
  const owner = bundle?.owner;
  const profile = bundle?.project.profile ?? {};
  const abilities = bundle
    ? resolveAbilityMap(bundle.project, bundle.owner)
    : ABILITY_LABELS.map((label) => ({ label, value: 55 }));
  const ranked = sortAbilities(abilities);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const idx = stageIndex(bundle?.project.stage, stats.decisionCount);
  const isInitialPortrait =
    Boolean(bundle) &&
    stats.decisionCount === 0 &&
    asString(profile.onboardingSource) === "initial_diagnostic";
  const currentChallenge =
    asString(profile.currentProblemTitle) ??
    asString(profile.currentChallenge) ??
    bundle?.currentGoal ??
    "当前最重要的经营问题";
  const yearlyGoal =
    bundle?.currentGoal ??
    asString(profile.yearlyGoal) ??
    asString(profile.currentProblemImpact)?.replace(/^未来一年的关键目标是：/, "") ??
    "形成未来一年的关键经营目标";

  const abilityInsights: Record<string, { strength: string; insight: string }> = {
    战略能力: {
      strength: "发现问题、理解趋势、识别关键变量",
      insight: "你更擅长看清方向，但需要把方向压成可执行判断。",
    },
    产品能力: {
      strength: "产品设计、菜单结构、价值定义",
      insight: "你对产品有判断，还要验证什么真正驱动复购。",
    },
    运营能力: {
      strength: "推进落地、稳定执行、保证现场运转",
      insight: "目标需要稳定传递到现场与团队。",
    },
    管理能力: {
      strength: "组织协同、团队承接、财务控制",
      insight: "限制增长的往往是组织能否承接判断。",
    },
    增长能力: {
      strength: "品牌表达、用户增长、复购设计",
      insight: "需要把产品价值转成用户心智与增长飞轮。",
    },
  };

  const weakLabel = weakest?.label ?? "增长能力";
  const meetingHref = bundle?.project.id
    ? buildFounderMeetingLink(
        bundle.project.id,
        isInitialPortrait ? currentChallenge : `${weakLabel}复盘会议`,
      )
    : "/dashboard";

  return {
    portraitName: owner?.name || user.name || "我的成长画像",
    isInitialPortrait,
    initialChallenge: isInitialPortrait ? currentChallenge : null,
    initialYearlyGoal: isInitialPortrait ? yearlyGoal : null,
    roleLabel: asString(user.preferences.role) || "餐饮经营者",
    industryLabel: bundle?.project.category || asString(user.preferences.industry) || "餐饮行业",
    brainState: isInitialPortrait ? "开始形成" : stats.decisionCount > 5 ? "持续进化" : "持续校准",
    stateJudgement:
      bundle?.decisions[0]?.judgement ||
      (isInitialPortrait
        ? `已根据首次诊断建好第一版坐标。眼下优先练「${currentChallenge}」相关的 ${weakLabel}。`
        : "正在根据你的判断与结果，找最该突破的短板。"),
    currentStage: STAGE_FLOW[idx] ?? "创业探索",
    stageSummary: STAGE_FLOW[idx] ?? "创业探索",
    abilityMap: abilities.map((item) => ({
      ...item,
      stars: `${Math.round(item.value / 20)}/5`,
      width: `${item.value}%`,
      strength: abilityInsights[item.label]?.strength ?? "持续学习、吸收反馈、形成结构",
      insight: abilityInsights[item.label]?.insight ?? "还在成形，多留下真实判断会更准。",
    })),
    strongestCapability: strongest?.label ?? "产品能力",
    weakestCapability: weakLabel,
    growthBottleneck: weakLabel,
    bottleneckReason: isInitialPortrait
      ? `还没留下第一条判断前，${weakLabel} 最不稳，决定你是继续发散还是开始闭环。`
      : `当前 ${weakLabel} 偏弱，卡住了判断到增长。`,
    growthPath: isInitialPortrait
      ? [
          { label: "重定义问题", action: `把「${currentChallenge}」压成一个能验证的问题` },
          { label: "锁定变量", action: `围绕「${yearlyGoal}」锁定最不能判错的关键变量` },
          { label: "形成首判", action: "第一次去拍板，收束出第一条判断和下一步" },
        ]
      : [
          { label: "形成判断", action: "每周至少开一次会，留下判断" },
          { label: "验证动作", action: "给关键决策补结果反馈" },
          { label: "沉淀能力", action: "把有效打法写进企业记忆" },
        ],
    decisionEvolution: {
      count: stats.decisionCount,
      latest: bundle?.decisions[0]?.problem ?? "尚无决策",
      trend: stats.decisionCount > 3 ? "up" : "forming",
      past: isInitialPortrait ? "真实判断样本还不够，目前只有首次诊断。" : "偏经验判断：先做事，再解释原因。",
      present:
        bundle?.decisions[0]?.judgement ||
        (isInitialPortrait ? "已把挑战、目标和做事方式压成第一版画像。" : "先认清问题，再形成判断和验证动作。"),
      summary: isInitialPortrait ? "每一次会议和反馈，都会把画像从假设变成证据。" : "正在从经验判断，升级为可验证的闭环。",
    },
    growthCoach: {
      focus: weakLabel,
      advice: isInitialPortrait ? "先别急着扩信息面，优先留下第一条判断。" : "少发散、多闭环：每次判断都带着可验证动作。",
      title: isInitialPortrait ? `开一场《${weakLabel}首轮校准》` : `开一场《${weakLabel}复盘》`,
      reason: isInitialPortrait ? `按首次诊断，${weakLabel} 最该先校准。` : `最近的判断里，${weakLabel} 最值得先补。`,
      expectedImprovement: weakLabel,
      actionHref: meetingHref,
      actionLabel: isInitialPortrait ? "开始第一次训练" : "开始训练",
    },
    currentProjectId: bundle?.project.id ?? null,
    currentProjectName: bundle?.project.name ?? null,
    ownerName: owner?.name || user.name,
    stats,
    stageTrack: buildStageTrack(idx),
    currentKnown:
      stats.projectCount === 0
        ? "还需要一个真实企业，才能建立第一版能力坐标。"
        : isInitialPortrait
          ? `已知你在做 ${bundle?.project.category || "餐饮业务"}，眼下挑战是“${currentChallenge}”，目标是“${yearlyGoal}”。`
          : `已根据你的企业与判断，开始摸清能力短板。`,
    nextAction: bundle?.decisions[0]?.action ?? (isInitialPortrait ? "第一次去拍板，留下第一条判断。" : "继续去拍板，留下新的判断。"),
    currentJudgement:
      bundle?.decisions[0]?.judgement ??
      bundle?.latestReport?.summary ??
      (isInitialPortrait ? `现在别再只搜集信息，先把「${currentChallenge}」压成第一条判断。` : "画像还在成形，多用几次会更懂你。"),
  };
}

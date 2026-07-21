/**
 * 六步咨询：把旧一枪引擎投影为 ResearchPack / AdvisorStrategySet
 * 失败时由调用方回退 blueprint 模板。
 */
import {
  createId,
  nowIso,
  type AdvisorStrategySet,
  type ConsultingAgentKind,
  type ResearchPack,
} from "@mealkey/agents/consulting-os";
import { buildBusinessSnapshotFromChat } from "@/lib/business";
import type { EquitySnapshot } from "@/lib/equity";
import type { MarketSnapshot } from "@/lib/market";
import { mbizDegradedResponse, checkMBizHealth, mbizScan, normalizeBizIndustry, normalizeBizStage } from "@/server/services/m-biz-client";
import { previewMEdSnapshot } from "@/server/services/m-ed.service";
import { previewMMktSnapshot } from "@/server/services/m-mkt.service";
import { buildConflictSummary } from "@mealkey/agents/consulting-os/meeting";
import type { BusinessSnapshot } from "@/lib/business";

export type EngineProjectCtx = {
  projectId: string;
  name: string;
  city?: string;
  category?: string;
  stage?: string;
};

function companyContext(ctx: EngineProjectCtx, goals: string[]) {
  return {
    companyId: ctx.projectId,
    basicInfo: {
      name: ctx.name || "餐饮项目",
      industry: ctx.category || "餐饮",
      city: ctx.city || "目标城市",
      stage: ctx.stage || "筹备期",
    },
    goals,
  };
}

function composeMessage(answers: Record<string, string>) {
  return Object.values(answers)
    .filter((v) => v?.trim())
    .join("；");
}

export function marketSnapshotToResearch(snap: MarketSnapshot): ResearchPack {
  const p = snap.pageOutput;
  const gaps = p.gaps || [];
  return {
    packId: createId("mrp"),
    status: "ready",
    headline: snap.oneLiner || p.opportunityCard?.opportunity || p.health?.rationale || "市场机会待确认",
    sections: [
      {
        title: "品类结构",
        body:
          [
            p.marketStructure?.trendSummary,
            p.marketStructure?.sceneSummary,
            p.marketStructure?.priceBandSummary,
          ]
            .filter(Boolean)
            .join("；") ||
          `${p.city || ""} · ${p.category || ""}：${snap.observation || "结构待补"}`,
      },
      {
        title: "竞争格局",
        body:
          [
            p.competition?.densitySummary,
            p.competition?.homogenization,
            p.competition?.biggestPressure
              ? `最大压力：${p.competition.biggestPressure}`
              : "",
          ]
            .filter(Boolean)
            .join("；") ||
          snap.diagnosis ||
          "竞争烈度与头部打法需对照本地供给。",
      },
      {
        title: "需求缺口",
        body:
          gaps
            .slice(0, 2)
            .map((g) => `${g.title}：${g.summary}`)
            .join("；") ||
          snap.observation ||
          "缺口待验证",
      },
      {
        title: "可进入切口",
        body:
          p.opportunityCard?.opportunity ||
          snap.strategy ||
          p.finalDecision?.judgement ||
          "优先小步试点验证",
      },
    ],
    risks: [
      ...(p.finalDecision?.risks || []).slice(0, 2),
      p.health?.biggestRisk,
      p.opportunityCard?.risk,
    ].filter((x): x is string => Boolean(x?.trim())),
    generatedAt: nowIso(),
  };
}

export function marketSnapshotToAdvisors(
  snap: MarketSnapshot,
  answers: Record<string, string>,
): AdvisorStrategySet {
  const strategies = snap.pageOutput.entryStrategies || [];
  const primary =
    strategies.find((s) => s.fit === "primary") || strategies[0];
  const secondary =
    strategies.find((s) => s.fit === "secondary") || strategies[1];
  const fd = snap.pageOutput.finalDecision;
  const constraint = answers.constraint || "资源有限";

  const cards = [
    {
      advisorId: "strategy",
      oneLiner: primary?.title || snap.strategy || "以场景切口进入，不做全品类硬刚",
      battlefield: primary?.summary || snap.pageOutput.opportunityCard?.opportunity || "市场空位",
      differentiation: (primary?.pros || []).slice(0, 2).join("；") || snap.observation,
      proof: snap.oneLiner || fd?.judgement || "机会卡已形成",
      doNotDo: strategies.find((s) => s.fit === "reject")?.title
        ? `不要走「${strategies.find((s) => s.fit === "reject")!.title}」`
        : "不要同时喊多场景、多客群",
      risk: (primary?.risks || fd?.risks || [])[0] || "切口过宽会被两头挤压",
      rationale: "市场战略专家：值不值得进，取决于能否占住清晰空位。",
    },
    {
      advisorId: "ops",
      oneLiner:
        secondary?.title ||
        `按门店可兑现能力设计试点（约束：${constraint}）`,
      battlefield: snap.pageOutput.opportunityCard?.suggestedArea || "门店运营可交付",
      differentiation:
        snap.pageOutput.opportunityCard?.suggestedPriceBand ||
        (secondary?.pros || []).slice(0, 1).join("") ||
        "试点必须人效可扛",
      proof: "主推品可培训、可复购",
      doNotDo: "不要设计依赖明星主厨才能跑的模型",
      risk: (secondary?.risks || [])[0] || "人效不达标则机会兑现不了",
      rationale: "餐饮经营专家：机会要落到店里每天能做的事。",
    },
    {
      advisorId: "invest",
      oneLiner: (fd?.actions || []).slice(0, 1)[0] || "90 天验证：复购与客单达标才放量",
      battlefield: "验证节奏",
      differentiation: (fd?.reasoning || []).slice(0, 1)[0] || "先证明单位经济，再谈扩张",
      proof: (fd?.actions || []).slice(0, 2).join("；") || "试点指标可统计",
      doNotDo: "不要未验证就多点铺开",
      risk: (fd?.risks || [])[0] || "验证窗口拖太久会烧钱",
      rationale: "投资增长专家：进入是投资决策，必须有杀出线。",
    },
  ];

  return {
    setId: createId("adv"),
    status: "ready",
    strategies: cards,
    conflictSummary: buildConflictSummary(
      cards,
      (id) =>
        ({ strategy: "市场战略", ops: "餐饮经营", invest: "投资增长" } as Record<
          string,
          string
        >)[id] || id,
    ),
    generatedAt: nowIso(),
  };
}

const ED_ROLE_TO_ID: Array<{ match: RegExp; id: string }> = [
  { match: /资本/, id: "capital" },
  { match: /创始/, id: "founder" },
  { match: /风险/, id: "risk" },
  { match: /治理/, id: "govern" },
];

export function equitySnapshotToResearch(snap: EquitySnapshot): ResearchPack {
  const p = snap.pageOutput;
  const health = p.health;
  return {
    packId: createId("mrp"),
    status: "ready",
    headline: snap.oneLiner || p.finalDecision?.judgement || "股权结构待确认",
    sections: [
      {
        title: "结构现状",
        body:
          p.profile?.founders?.length
            ? `创始团队 ${p.profile.founders.length} 人；期权池 ${p.profile.optionPool ?? "待定"}%。${snap.observation || ""}`
            : snap.observation ||
              `${p.stage || "当前阶段"}：股东与角色边界需书面化。`,
      },
      {
        title: "控制权",
        body: health
          ? `控制权评分 ${health.control}/100。${health.control >= 75 ? "主导权尚可稳住。" : "存在被稀释风险。"}`
          : snap.diagnosis || "控制权边界待锁",
      },
      {
        title: "激励空间",
        body:
          typeof health?.incentiveRoom === "number"
            ? `激励池空间约 ${health.incentiveRoom}。`
            : "期权/激励池是否预留，决定骨干能否留下。",
      },
      {
        title: "风险焦点",
        body: health?.biggestRisk || (p.finalDecision?.risks || [])[0] || snap.diagnosis || "角色与退出机制未同步",
      },
    ],
    risks: [
      ...(p.finalDecision?.risks || []).slice(0, 2),
      health?.biggestRisk,
    ].filter((x): x is string => Boolean(x?.trim())),
    generatedAt: nowIso(),
  };
}

export function equitySnapshotToAdvisors(snap: EquitySnapshot): AdvisorStrategySet {
  const committee = snap.pageOutput.committee || [];
  const primary =
    snap.pageOutput.scenarios?.find((s) => s.recommendation === "primary") ||
    snap.pageOutput.scenarios?.[0];
  const byId = new Map<string, { opinion: string; concern?: string }>();
  for (const c of committee) {
    const hit = ED_ROLE_TO_ID.find((r) => r.match.test(c.role));
    if (hit) byId.set(hit.id, { opinion: c.opinion, concern: c.concern });
  }

  const defaults: Array<{
    id: string;
    oneLiner: string;
    risk: string;
    rationale: string;
  }> = [
    {
      id: "capital",
      oneLiner: primary?.title || snap.strategy || "本轮融资换增长，不换控制权失控",
      risk: "估值与稀释不同步会伤下一轮",
      rationale: "资本顾问：融资要换什么，必须写清。",
    },
    {
      id: "founder",
      oneLiner: "锁住创始拍板权，再谈分股与激励",
      risk: "控制权松了，后面很难收回",
      rationale: "创始人视角：你还能不能拍板？",
    },
    {
      id: "risk",
      oneLiner: "角色、归属、退出、补偿必须同设计",
      risk: snap.pageOutput.health?.biggestRisk || "协议空洞会炸",
      rationale: "风险顾问：真正风险不只是比例。",
    },
    {
      id: "govern",
      oneLiner: "用 vesting 与治理事项让人留下来一起干",
      risk: "机制不清，骨干留不住",
      rationale: "治理顾问：人能不能留下来一起干？",
    },
  ];

  const cards = defaults.map((d) => {
    const fromCommittee = byId.get(d.id);
    return {
      advisorId: d.id,
      oneLiner: fromCommittee?.opinion || d.oneLiner,
      battlefield: primary?.summary || snap.pageOutput.topic || "股权结构",
      differentiation: primary?.title || snap.oneLiner,
      proof: (snap.pageOutput.finalDecision?.actions || []).slice(0, 1)[0] || "书面协议可执行",
      doNotDo: "不要口头分股、事后补协议",
      risk: fromCommittee?.concern || d.risk,
      rationale: d.rationale,
    };
  });

  return {
    setId: createId("adv"),
    status: "ready",
    strategies: cards,
    conflictSummary: buildConflictSummary(
      cards,
      (id) =>
        ({
          capital: "资本顾问",
          founder: "创始人视角",
          risk: "风险顾问",
          govern: "治理顾问",
        } as Record<string, string>)[id] || id,
    ),
    generatedAt: nowIso(),
  };
}

type MBizEngineRaw = {
  session_id: string;
  status: string;
  current_layer: string;
  reply: string;
  pending_questions?: string[];
  fact_nodes?: Array<Record<string, unknown>>;
  dimension_scores?: Record<string, { score: number; summary: string }>;
  rule_judgments?: Array<Record<string, unknown>>;
  suggestions?: Array<Record<string, unknown>>;
  verification_tasks?: Array<Record<string, unknown>>;
  progress: number;
};

/** 咨询专用启发式：用 intake 填厚，而不是「服务不可用」文案 */
export function consultingBizHeuristicRaw(
  answers: Record<string, string>,
  message: string,
): MBizEngineRaw {
  const stage = answers.stage || "验证期";
  const pain = answers.pain || "模式不稳";
  const priority = answers.priority || "先利润";
  const resource = answers.resource || "资源偏紧";
  return {
    session_id: `consult-biz-${Date.now()}`,
    status: "consulting_heuristic",
    current_layer: "L3",
    reply: `商业体检：${stage}阶段，主矛盾是「${pain}」。90 天建议主航道「${priority}」，资源约束「${resource}」。`,
    pending_questions: [
      "单店贡献毛利是否算清？",
      "主推品能否证明模式？",
      "关键流程能否交给新人？",
    ],
    fact_nodes: [
      {
        node_id: "c1",
        category: "stage",
        statement: `阶段：${stage}`,
        confidence: 0.8,
        source: "intake",
        needs_verification: false,
        verification_status: "verified",
        follow_up_questions: [],
      },
      {
        node_id: "c2",
        category: "pain",
        statement: `主矛盾：${pain}`,
        confidence: 0.85,
        source: "intake",
        needs_verification: true,
        verification_status: "unverified",
        follow_up_questions: [],
      },
    ],
    dimension_scores: {
      RS: { score: priority.includes("利润") ? 3.5 : 2.5, summary: "收入结构待验证" },
      CS: { score: 3, summary: "成本可控性取决于人效" },
      VP: { score: pain.includes("复制") ? 2 : 3, summary: "价值主张需产品证明" },
      KR: { score: resource.includes("人") ? 2 : 3, summary: "关键资源约束" },
    },
    rule_judgments: [
      {
        rule_id: "biz-priority",
        domain: "strategy",
        input_fact_ids: ["c1", "c2"],
        conclusion: `同时追利润/增长/品牌会失血；当前应单押「${priority}」。`,
        confidence: 0.8,
        severity: "warn",
      },
      {
        rule_id: "biz-pain",
        domain: "operations",
        input_fact_ids: ["c2"],
        conclusion: `主矛盾「${pain}」若 90 天无验证动作，模式不会自己变好。`,
        confidence: 0.75,
        severity: "high",
      },
    ],
    suggestions: [
      {
        suggestion_id: "s-strategy",
        priority: "high",
        dimension: "strategy",
        action: `冻结主航道：${priority}`,
        expected_impact: "团队注意力收敛",
        verification_action: "全员能说出唯一北极星",
      },
      {
        suggestion_id: "s-product",
        priority: "high",
        dimension: "product",
        action: "用 3 个主推品证明模式",
        expected_impact: "订单结构可读",
        verification_action: "主推品销售占比可统计",
      },
      {
        suggestion_id: "s-finance",
        priority: "high",
        dimension: "finance",
        action: "周报毛利与人效",
        expected_impact: "扩张有数字依据",
        verification_action: "连续 2 周数据可复盘",
      },
      {
        suggestion_id: "s-ops",
        priority: "medium",
        dimension: "ops",
        action: "关键流程一页作战卡",
        expected_impact: "可复制",
        verification_action: "新人 7 天上手主流程",
      },
    ],
    verification_tasks: [
      {
        task_id: "t1",
        source_suggestion_id: "s-finance",
        dimension: "finance",
        verification_action: "算清单店贡献毛利",
        estimated_period: "14天",
        status: "pending",
        reminder_schedule: [],
      },
    ],
    progress: 0.55,
  };
}

function mapMBizRawToSnapshot(
  message: string,
  raw: MBizEngineRaw,
): BusinessSnapshot {
  return buildBusinessSnapshotFromChat({
    message,
    response: {
      sessionId: raw.session_id,
      status: raw.status,
      currentLayer: raw.current_layer,
      reply: raw.reply,
      progress: raw.progress,
      pendingQuestions: raw.pending_questions || [],
      factNodes: (raw.fact_nodes || []).map((n) => ({
        nodeId: String(n.node_id || n.nodeId || ""),
        category: String(n.category || ""),
        statement: String(n.statement || ""),
        confidence: Number(n.confidence || 0.5),
        source: String(n.source || "m-biz"),
        needsVerification: Boolean(n.needs_verification ?? n.needsVerification),
        verificationStatus: String(
          n.verification_status || n.verificationStatus || "unverified",
        ),
        followUpQuestions: [],
      })),
      dimensionScores: raw.dimension_scores as Record<
        string,
        { score: number; summary: string }
      >,
      ruleJudgments: (raw.rule_judgments || []).map((j) => ({
        ruleId: String(j.rule_id || j.ruleId || ""),
        domain: String(j.domain || ""),
        inputFactIds: [],
        conclusion: String(j.conclusion || ""),
        confidence: Number(j.confidence || 0.5),
        severity: String(j.severity || "info"),
      })),
      suggestions: (raw.suggestions || []).map((s) => ({
        suggestionId: String(s.suggestion_id || s.suggestionId || ""),
        priority: String(s.priority || "medium"),
        dimension: String(s.dimension || ""),
        action: String(s.action || ""),
        expectedImpact:
          s.expected_impact || s.expectedImpact
            ? String(s.expected_impact || s.expectedImpact)
            : undefined,
        verificationAction:
          s.verification_action || s.verificationAction
            ? String(s.verification_action || s.verificationAction)
            : undefined,
      })),
      verificationTasks: (raw.verification_tasks || []).map((t) => ({
        taskId: String(t.task_id || t.taskId || ""),
        sourceSuggestionId: String(
          t.source_suggestion_id || t.sourceSuggestionId || "",
        ),
        dimension: String(t.dimension || ""),
        verificationAction: String(
          t.verification_action || t.verificationAction || "",
        ),
        estimatedPeriod:
          t.estimated_period || t.estimatedPeriod
            ? String(t.estimated_period || t.estimatedPeriod)
            : undefined,
        status: String(t.status || "pending"),
        reminderSchedule: [],
      })),
    },
    source: "m-biz",
  });
}

function shortHeadline(text: string, fallback: string) {
  const cleaned = text.replace(/[#>*`\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 72 ? `${cleaned.slice(0, 70)}…` : cleaned;
}

export function businessSnapshotToPack(
  snap: BusinessSnapshot,
  answers: Record<string, string>,
): { research: ResearchPack; advisors: AdvisorStrategySet } {
  const p = snap.pageOutput;
  const stage = answers.stage || "当前阶段";
  const pain = answers.pain || "模式痛点";
  const priority = answers.priority || "先利润";
  const judgments = p.ruleJudgments || [];
  const suggestions = p.suggestions || [];
  const scores = p.dimensionScores || {};
  const scoreLine = Object.entries(scores)
    .slice(0, 4)
    .map(([k, v]) => `${k} ${v.score}/5（${v.summary}）`)
    .join("；");

  const research: ResearchPack = {
    packId: createId("mrp"),
    status: "ready",
    headline: shortHeadline(
      snap.oneLiner,
      `商业体检：${stage}下，主矛盾是「${pain}」`,
    ),
    sections: [
      {
        title: "模式现状",
        body:
          (p.factNodes || [])
            .slice(0, 2)
            .map((n) => n.statement)
            .join("；") ||
          `处于${stage}。${snap.observation || ""}`,
      },
      {
        title: "九维/规则扫描",
        body:
          scoreLine ||
          judgments
            .slice(0, 2)
            .map((j) => j.conclusion)
            .join("；") ||
          snap.diagnosis ||
          "规则结论待补",
      },
      {
        title: "主矛盾",
        body: pain,
      },
      {
        title: "优先路径暗示",
        body: `老板倾向「${priority}」；资源约束：${answers.resource || "综合偏紧"}。验证任务：${
          (p.verificationTasks || [])[0]?.verificationAction ||
          suggestions[0]?.verificationAction ||
          "待定"
        }`,
      },
    ],
    risks: [
      ...judgments
        .filter((j) => /high|critical|warn/i.test(j.severity))
        .map((j) => j.conclusion)
        .slice(0, 2),
      "同时追利润、增长、品牌，会三线失血",
      "未验证就复制，会把单店偶然性放大成系统性风险",
    ],
    generatedAt: nowIso(),
  };

  const pick = (dim: RegExp, fallback: string) =>
    suggestions.find((s) => dim.test(`${s.dimension} ${s.action}`))?.action ||
    fallback;

  const cards = [
    {
      advisorId: "strategy",
      oneLiner: `未来 90 天主航道：${priority}`,
      battlefield: "战略优先级",
      differentiation: research.headline,
      proof: "每周只盯 1 个北极星指标",
      doNotDo: "不要三线并行当主航道",
      risk: "优先级不唯一，团队会内耗",
      rationale: "战略官：商业模式首先是取舍。",
    },
    {
      advisorId: "product",
      oneLiner: pick(/product|产品|供给|VP/, "用 3 个主推品证明模式，而不是靠满菜单"),
      battlefield: "产品结构",
      differentiation: "产品即模式证明",
      proof:
        suggestions.find((s) => /product|产品/i.test(s.dimension))
          ?.verificationAction || "主推品占销售可统计",
      doNotDo: "不要用引流款稀释利润模型",
      risk: "产品与定位不一致，模式讲不清",
      rationale: "产品官：客人用订单投票，不听故事。",
    },
    {
      advisorId: "finance",
      oneLiner: pick(
        /financ|财务|成本|毛利|RS|CS/,
        "先算清单店贡献毛利与人效，再谈扩张",
      ),
      battlefield: "单位经济",
      differentiation: scoreLine || "数字说话",
      proof:
        (p.verificationTasks || [])[0]?.verificationAction ||
        "周报：毛利、人效、复购",
      doNotDo: "不要用总营收掩盖单店质量",
      risk: "账算不清就会用感觉扩张",
      rationale: "财务官：通不过单位经济的模式不是模式。",
    },
    {
      advisorId: "ops",
      oneLiner: pick(/ops|运营|复制|KR/, "把关键流程写成可交接的一页作战卡"),
      battlefield: "可复制运营",
      differentiation: "人走事还能转",
      proof: "新人 7 天能上手主流程",
      doNotDo: "不要依赖老板盯班才能运转",
      risk: pain.includes("复制") ? "复制走样是当前主雷" : "不可复制就会卡在单店天花板",
      rationale: "运营官：复制靠流程，不靠情怀。",
    },
  ];

  return {
    research,
    advisors: {
      setId: createId("adv"),
      status: "ready",
      strategies: cards,
      conflictSummary: buildConflictSummary(
        cards,
        (id) =>
          ({
            strategy: "战略官",
            product: "产品官",
            finance: "财务官",
            ops: "运营官",
          } as Record<string, string>)[id] || id,
      ),
      generatedAt: nowIso(),
    },
  };
}

export function businessAnswersToResearch(
  answers: Record<string, string>,
  message: string,
): { research: ResearchPack; advisors: AdvisorStrategySet } {
  const raw = consultingBizHeuristicRaw(answers, message);
  const snap = mapMBizRawToSnapshot(message, raw);
  return businessSnapshotToPack(snap, answers);
}

export type EngineEnrichResult = {
  research: ResearchPack;
  advisors: AdvisorStrategySet;
  /** 真外呼/引擎命中（非启发式投影） */
  engineLive: boolean;
  degradationNote?: string;
};

function providerOf(snap: { structured?: Record<string, unknown> | null }) {
  const p = snap.structured?.provider;
  return typeof p === "string" ? p : "";
}

function withDegradation(
  pack: { research: ResearchPack; advisors: AdvisorStrategySet },
  note: string,
): EngineEnrichResult {
  return {
    research: {
      ...pack.research,
      collectionMode: "heuristic",
      degradationNote: note,
    },
    advisors: pack.advisors,
    engineLive: false,
    degradationNote: note,
  };
}

/** 优先真引擎 mbizScan；失败则咨询启发式（仍比通用 degraded 厚） */
export async function loadBizConsultingBundle(
  answers: Record<string, string>,
  ctx: EngineProjectCtx,
): Promise<EngineEnrichResult> {
  const message = composeMessage(answers) || "商业模式诊断";
  let raw: MBizEngineRaw | null = null;
  let engineLive = false;
  try {
    const healthy = await checkMBizHealth();
    if (healthy) {
      const scanned = await mbizScan({
        message,
        enterprise_name: ctx.name,
        industry: normalizeBizIndustry(ctx.category),
        stage: normalizeBizStage(ctx.stage),
      });
      raw = {
        session_id: scanned.session_id,
        status: scanned.status,
        current_layer: scanned.current_layer,
        reply: scanned.reply,
        pending_questions: scanned.pending_questions,
        fact_nodes: scanned.fact_nodes,
        dimension_scores: scanned.dimension_scores,
        rule_judgments: scanned.rule_judgments,
        suggestions: scanned.suggestions,
        verification_tasks: scanned.verification_tasks,
        progress: scanned.progress,
      };
      engineLive = true;
    }
  } catch {
    raw = null;
    engineLive = false;
  }
  if (!raw) {
    try {
      raw = consultingBizHeuristicRaw(answers, message);
    } catch {
      raw = mbizDegradedResponse(message);
    }
  }
  const pack = businessSnapshotToPack(mapMBizRawToSnapshot(message, raw), answers);
  if (!engineLive) {
    return withDegradation(
      pack,
      "M-BIZ 外呼不可用或未配置，已降级为本地启发式体检（不可当作引擎完成）",
    );
  }
  return {
    ...pack,
    research: { ...pack.research, collectionMode: "engine" },
    engineLive: true,
  };
}

export async function enrichFromEngines(
  agentId: ConsultingAgentKind,
  answers: Record<string, string>,
  ctx: EngineProjectCtx,
): Promise<EngineEnrichResult | null> {
  const message = composeMessage(answers);
  try {
    if (agentId === "m-mkt") {
      const snap = await previewMMktSnapshot({
        message: message || "市场进入判断",
        companyContext: companyContext(ctx, [
          answers.intent || "判断市场机会",
        ]),
      });
      const pack = {
        research: marketSnapshotToResearch(snap),
        advisors: marketSnapshotToAdvisors(snap, answers),
      };
      const provider = providerOf(snap);
      if (provider === "external") {
        return {
          ...pack,
          research: { ...pack.research, collectionMode: "engine" },
          engineLive: true,
        };
      }
      return withDegradation(
        pack,
        "M-MKT 引擎未命中真实外呼，已降级为启发式市场扫描（不可当作引擎完成）",
      );
    }
    if (agentId === "m-ed") {
      const snap = await previewMEdSnapshot({
        message: message || "股权结构决策",
        companyContext: companyContext(ctx, [
          answers.topic || "股权治理",
        ]),
      });
      const pack = {
        research: equitySnapshotToResearch(snap),
        advisors: equitySnapshotToAdvisors(snap),
      };
      const provider = providerOf(snap);
      if (provider === "external") {
        return {
          ...pack,
          research: { ...pack.research, collectionMode: "engine" },
          engineLive: true,
        };
      }
      return withDegradation(
        pack,
        "M-ED 引擎未命中真实外呼，已降级为启发式治理扫描（不可当作引擎完成）",
      );
    }
    if (agentId === "m-biz") {
      return loadBizConsultingBundle(answers, ctx);
    }
  } catch {
    return null;
  }
  return null;
}

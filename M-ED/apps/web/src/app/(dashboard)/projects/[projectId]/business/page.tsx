"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Loader2,
  Mic,
  Square,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  ChiefAdvisorPanel,
  CollapsibleBoardSection,
  DepartmentBoardShell,
  MKMetaPill,
  ModuleIntakeCard,
  WorkspaceArchivePanel,
  WorkspaceDecisionPanel,
  WorkspaceJourneyRail,
  WorkspaceMeetingPanel,
  type WorkspaceJourneyStep,
} from "@/components/operating";
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/operating/PageState";
import {
  buildBusinessSnapshotFromChat,
  type BizDimensionScore,
  type BizPageOutput,
  type BusinessSnapshot,
} from "@/lib/business";
import {
  getDepartmentBoard,
  getDepartmentExperts,
  getDepartmentMeetingHref,
  stripAgentProductNames,
} from "@/lib/department-board";
import { buildBusinessProtocolProjection } from "@/lib/runtime-projections/businessProtocol";
import { trpc } from "@/lib/trpc";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import { useProjectStore } from "@/stores/projectStore";

function buildBusinessIntakePrompt(values: {
  customer: string;
  offer: string;
  revenue: string;
  blocker: string;
}) {
  return [
    "请作为商业顾问团队，帮助我完成一次商业模式诊断。",
    `卖给谁：${values.customer || "待补充"}`,
    `卖什么：${values.offer || "待补充"}`,
    `怎么赚钱：${values.revenue || "待补充"}`,
    `当前最大困难：${values.blocker || "待补充"}`,
    "请先建立商业画像，再做体检、顾问评审和行动建议。",
  ].join("\n");
}

function layerLabel(layer: string) {
  const labels: Record<string, string> = {
    L1: "事实认知",
    L2: "规则认知",
    L3: "分析认知",
    L4: "策略认知",
    L5: "验证认知",
  };
  return labels[layer] || layer;
}

function averageScore(scores?: Record<string, BizDimensionScore>) {
  if (!scores || Object.keys(scores).length === 0) return 0;
  const values = Object.values(scores);
  return values.reduce((sum, item) => sum + item.score, 0) / values.length;
}

function buildBusinessJourney(input: {
  hasSnapshot: boolean;
  hasDiagnosis: boolean;
  hasCouncil: boolean;
  hasDecision: boolean;
  hasTasks: boolean;
  streaming: boolean;
}): WorkspaceJourneyStep[] {
  if (!input.hasSnapshot && !input.streaming) {
    return [
      { id: "foundation", label: "项目认识", note: "先理解你的生意。", status: "current" },
      { id: "diagnosis", label: "商业体检", note: "检查赚钱、增长、复制。", status: "upcoming" },
      { id: "council", label: "顾问委员会", note: "把分歧压成共识。", status: "upcoming" },
      { id: "decision", label: "商业选择", note: "形成你的商业决策。", status: "upcoming" },
      { id: "roadmap", label: "行动路线", note: "开始 90 天推进。", status: "upcoming" },
    ];
  }

  return [
    { id: "foundation", label: "项目认识", note: "商业画像已建立。", status: "completed" },
    {
      id: "diagnosis",
      label: "商业体检",
      note: input.hasDiagnosis ? "商业健康度已经形成。" : "正在压缩最大问题。",
      status: input.hasDiagnosis ? "completed" : "current",
    },
    {
      id: "council",
      label: "顾问委员会",
      note: input.hasCouncil ? "顾问分歧已被看见。" : "等待顾问意见形成。",
      status: input.hasCouncil ? "completed" : input.hasDiagnosis ? "current" : "upcoming",
    },
    {
      id: "decision",
      label: "商业选择",
      note: input.hasDecision ? "已形成一轮商业建议。" : "等待最终收口。",
      status: input.hasDecision ? "current" : input.hasCouncil ? "current" : "upcoming",
    },
    {
      id: "roadmap",
      label: "行动路线",
      note: input.hasTasks ? "验证任务已经写入。" : "等待验证与推进动作。",
      status: input.hasTasks ? "current" : input.hasDecision ? "upcoming" : "upcoming",
    },
  ];
}

function buildBusinessSnapshotCard(snapshot: BusinessSnapshot | null) {
  const text = snapshot?.problem || "";
  return {
    industry: text.includes("餐饮") ? "餐饮业务" : "当前业务",
    customer:
      text.includes("家庭") ? "家庭用户" : text.includes("白领") ? "城市白领" : "核心客群待补全",
    value:
      snapshot?.observation || "AI 正在把你的产品、用户和收入方式压成商业画像。",
    revenue:
      snapshot?.strategy || "先说清收入来源，再压成更明确的商业结构。",
    stage: snapshot ? `${Math.round((snapshot.confidence || 0) * 100)}% 认知建立` : "待启动",
  };
}

function buildBusinessVitals(scores?: Record<string, BizDimensionScore>) {
  const values = Object.entries(scores || {});
  const top = values.slice(0, 4);
  const fallback = [
    { label: "赚钱能力", score: 3.8, summary: "先建立稳定收入模型。" },
    { label: "增长能力", score: 3.2, summary: "确认获客方式是否成立。" },
    { label: "复制能力", score: 2.6, summary: "当前还需要验证标准化。" },
    { label: "风险水平", score: 3.0, summary: "先别放大没有验证的部分。" },
  ];

  return (top.length > 0
    ? top.map(([label, item]) => ({ label, score: item.score, summary: item.summary }))
    : fallback
  ).slice(0, 4);
}

function buildCouncilOpinions(snapshot: BusinessSnapshot | null) {
  const pageOutput = snapshot?.pageOutput;
  const firstSuggestion = pageOutput?.suggestions[0];
  const secondSuggestion = pageOutput?.suggestions[1];
  const firstRule = pageOutput?.ruleJudgments[0];
  const secondRule = pageOutput?.ruleJudgments[1];
  const firstTask = pageOutput?.verificationTasks[0];

  return [
    {
      title: "商业架构师 · 商业结构",
      body:
        firstSuggestion?.action ||
        snapshot?.strategy ||
        "先确认你的收入结构是否真能支撑接下来的增长。",
      toneNote: firstSuggestion?.expectedImpact || "重点看收入来源是否过于单一。",
    },
    {
      title: "增长顾问 · 增长节奏",
      body:
        secondSuggestion?.action ||
        "现在更需要判断增长是应该继续加速，还是先把底盘打稳。",
      toneNote: secondSuggestion?.verificationAction || "增长不是先冲规模，而是先找成立条件。",
    },
    {
      title: "财务顾问 · 现金与风险",
      body:
        firstRule?.conclusion || snapshot?.diagnosis || "先控制现金压力，再决定是否扩大投入。",
      toneNote: secondRule?.conclusion || "如果底层效率没跑通，扩张只会放大亏损。",
    },
    {
      title: "运营顾问 · 复制能力",
      body:
        firstTask?.verificationAction || snapshot?.action || "先验证 SOP 和交付是否可复制。",
      toneNote: "复制不是开第二家店，而是让第二家店不依赖创始人。",
    },
  ];
}

function buildChiefAdvisor(input: {
  snapshot: BusinessSnapshot | null;
  streaming: boolean;
  hasDiagnosis: boolean;
  hasCouncil: boolean;
}) {
  if (!input.snapshot && !input.streaming) {
    return {
      title: "AI 商业顾问已就位",
      summary: "我会先理解你的生意，再帮你判断哪里成立、哪里最危险、下一步先做什么。",
      learned: ["创业意图", "项目方向", "最小必要事实"],
      missing: ["收入结构", "客户价值", "最大困难"],
      nextStep: "先完成一次项目认识，建立商业画像。",
    };
  }

  if (input.streaming && !input.snapshot) {
    return {
      title: "商业认知建立中",
      summary: "我正在把你的用户、产品、收入和困难压成一条可判断的商业线索。",
      learned: ["项目背景", "客户方向", "收入方式"],
      missing: ["最大矛盾", "顾问共识", "行动路线"],
      nextStep: "等待商业体检形成，再进入顾问委员会。",
    };
  }

  return {
    title: "AI 商业顾问",
    summary: input.snapshot?.oneLiner || "当前已经形成一轮商业判断。",
    learned: [
      input.snapshot?.observation || "核心观察",
      input.snapshot?.diagnosis || "关键诊断",
      input.snapshot?.strategy || "初步策略",
    ],
    missing: input.hasCouncil ? ["你的优先级选择", "是否接受当前路径"] : ["顾问分歧", "验证条件"],
    nextStep: input.hasDiagnosis
      ? "继续看顾问分歧，再把商业建议压成行动路线。"
      : "先完成商业体检，再决定最该解决的第一性问题。",
  };
}

function inferFounderGoal(text: string) {
  if (/(加盟|连锁|复制|扩张|规模)/.test(text)) {
    return "把已成立的模型推进到可复制增长。";
  }
  if (/(利润|盈利|现金流|赚钱)/.test(text)) {
    return "先建立稳定盈利和健康现金流。";
  }
  if (/(品牌|定位|心智)/.test(text)) {
    return "先让品牌选择和商业结构重新对齐。";
  }
  return "先看清这门生意真正成立的条件。";
}

function inferRiskProfile(text: string) {
  if (/(暂缓|先别扩张|验证|稳住|风险)/.test(text)) {
    return {
      label: "稳健型",
      note: "先验证，再放大投入。",
    };
  }

  if (/(快速|融资|加盟|扩张|规模)/.test(text)) {
    return {
      label: "进取型",
      note: "优先抢窗口，再补底盘。",
    };
  }

  return {
    label: "平衡型",
    note: "在增长和风险之间持续找平衡。",
  };
}

function buildFounderContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: BusinessSnapshot | null;
  suggestions: BizPageOutput["suggestions"];
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.suggestions[0]?.action,
    input.verificationTasks[0]?.verificationAction,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "当前业务背景待补全",
    goal: inferFounderGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle:
      input.verificationTasks.length > 0 ? "先验证后放大" : "先诊断后做取舍",
  };
}

function buildBusinessContextView(input: {
  project: { category?: string | null; stage?: string | null };
  snapshot: BusinessSnapshot | null;
  pageOutput: BizPageOutput | null;
  businessCard: ReturnType<typeof buildBusinessSnapshotCard>;
}) {
  return [
    { label: "行业", value: input.project.category || input.businessCard.industry },
    { label: "阶段", value: input.project.stage || input.businessCard.stage },
    { label: "客户模型", value: input.businessCard.customer },
    { label: "收入模型", value: input.businessCard.revenue },
    { label: "当前矛盾", value: input.snapshot?.diagnosis || "待形成第一性问题" },
    {
      label: "协议层级",
      value: input.pageOutput ? layerLabel(input.pageOutput.currentLayer) : "待启动",
    },
  ];
}

function buildDecisionProtocolView(input: {
  snapshot: BusinessSnapshot | null;
  suggestions: BizPageOutput["suggestions"];
  ruleJudgments: BizPageOutput["ruleJudgments"];
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const reasoning = [
    input.snapshot?.diagnosis,
    input.ruleJudgments[0]?.conclusion,
    input.ruleJudgments[1]?.conclusion,
    input.suggestions[0]?.expectedImpact,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  const choice =
    input.snapshot?.strategy ||
    input.suggestions[0]?.action ||
    "先把商业建议压成一个可执行选择。";
  const validation =
    input.verificationTasks[0]?.verificationAction ||
    input.snapshot?.action ||
    "补充验证动作后再进入执行。";
  const caution = inferRiskProfile(
    [choice, validation, input.snapshot?.oneLiner].filter(Boolean).join(" "),
  ).label;

  return {
    problem:
      input.snapshot?.problem ||
      input.ruleJudgments[0]?.conclusion ||
      "当前问题仍在澄清中。",
    choice,
    reasoning,
    tradeoff:
      caution === "稳健型"
        ? "速度会慢一点，但能换来更高验证质量。"
        : caution === "进取型"
          ? "会更快抢窗口，但会把底层风险一起放大。"
          : "需要在增长欲望和经营纪律之间持续平衡。",
    validation,
  };
}

function buildMemoryView(input: {
  previous: BusinessSnapshot | null;
  history: BusinessSnapshot[];
  snapshot: BusinessSnapshot | null;
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const founderMemory = [
    inferRiskProfile(
      [input.snapshot?.strategy, input.snapshot?.action, input.snapshot?.oneLiner]
        .filter(Boolean)
        .join(" "),
    ).note,
    input.verificationTasks.length > 0 ? "当前偏好先验证关键动作。" : "当前偏好仍在校准中。",
  ];

  const businessMemory = [
    input.previous?.oneLiner,
    ...input.history.slice(0, 2).map((item) => item.oneLiner),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.strategy,
    input.verificationTasks[0]?.verificationAction,
    input.snapshot?.action,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    founderMemory,
    businessMemory,
    decisionMemory,
  };
}

function buildBusinessFactLedger(factNodes: BizPageOutput["factNodes"]) {
  return factNodes.slice(0, 6).map((item) => {
    const kind =
      !item.needsVerification && item.confidence >= 0.8
        ? "FACT"
        : item.confidence >= 0.55
          ? "ASSUMPTION"
          : "HYPOTHESIS";

    return {
      id: item.nodeId,
      kind,
      statement: item.statement,
      note: `${item.category} · ${Math.round(item.confidence * 100)}%`,
      status: item.verificationStatus,
      followUp: item.followUpQuestions[0],
    };
  });
}

export default function BusinessPage({
  params,
}: {
  params: { projectId: string };
}) {
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const { data: project, isLoading, error } = trpc.project.getById.useQuery({
    id: params.projectId,
  });
  const { data: bizContext } = trpc.agent.businessContext.useQuery({
    projectId: params.projectId,
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [liveSnapshot, setLiveSnapshot] = useState<BusinessSnapshot | null>(null);
  const [businessIntake, setBusinessIntake] = useState({
    customer: "",
    offer: "",
    revenue: "",
    blocker: "",
  });
  const speechInput = useSpeechToTextField();

  useEffect(() => {
    if (project) setCurrentProject(project);
  }, [project, setCurrentProject]);

  const bizChat = trpc.agent.bizChat.useMutation();
  const snapshot = liveSnapshot || bizContext?.current || null;
  const pageOutput: BizPageOutput | null = snapshot?.pageOutput || bizContext?.pageOutput || null;
  const history = (bizContext?.history as BusinessSnapshot[] | undefined) || [];
  const previous = (bizContext?.previous as BusinessSnapshot | null | undefined) || null;

  const scores = pageOutput?.dimensionScores;
  const avgScore = averageScore(scores);
  const healthScore = Math.round((avgScore || snapshot?.confidence || 0) * 20);
  const ruleJudgments = pageOutput?.ruleJudgments || [];
  const suggestions = pageOutput?.suggestions || [];
  const verificationTasks = pageOutput?.verificationTasks || [];
  const factNodes = pageOutput?.factNodes || [];
  const quickPrompts = [
    "请先帮我做一次完整商业体检",
    "最大的第一性问题是什么？",
    "先别扩张，先告诉我最该验证什么",
    "请把顾问分歧压成一个建议",
  ];

  const journeyPreview = buildBusinessJourney({
    hasSnapshot: Boolean(snapshot),
    hasDiagnosis: Boolean(scores && Object.keys(scores).length > 0),
    hasCouncil: ruleJudgments.length > 0 || suggestions.length > 0,
    hasDecision: Boolean(snapshot?.oneLiner),
    hasTasks: verificationTasks.length > 0,
    streaming: loading,
  });
  const progress = useMemo(() => {
    const completed = journeyPreview.filter((item) => item.status === "completed").length;
    return Math.round((completed / journeyPreview.length) * 100);
  }, [journeyPreview]);

  function updateBusinessIntake(key: keyof typeof businessIntake, value: string) {
    setBusinessIntake((prev) => ({ ...prev, [key]: value }));
  }

  function applyBusinessIntake() {
    setMessage(buildBusinessIntakePrompt(businessIntake));
  }

  async function handleChat() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setStreamText("");

    try {
      const response = await bizChat.mutateAsync({
        projectId: params.projectId,
        message: message.trim(),
        mode: "chat",
      });

      const nextSnapshot = buildBusinessSnapshotFromChat({
        message: message.trim(),
        response,
        updatedAt: new Date().toISOString(),
      });
      setLiveSnapshot(nextSnapshot);
      setStreamText(nextSnapshot.oneLiner);
    } catch {
      setStreamText("❌ 商业顾问暂时没有完成这一轮判断，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="商业顾问"
        title="AI 正在进入商业顾问项目"
        description="正在读取商业上下文和历史判断。"
      />
    );
  }

  if (error || !project) {
    return (
      <PageErrorState
        eyebrow="商业顾问"
        title="商业顾问工作台暂时不可用"
        description="项目上下文还没完整同步。"
        primaryAction={{ href: getDepartmentMeetingHref(params.projectId, "business"), label: "进入会议" }}
        secondaryAction={{ href: `/projects/${params.projectId}`, label: "回到世界" }}
      />
    );
  }

  if (!snapshot && !bizContext) {
    const board = getDepartmentBoard("business");
    const experts = getDepartmentExperts("business");
    const meetingHref = getDepartmentMeetingHref(project.id, "business");
    return (
      <div className="space-y-5 pb-2">
        <DepartmentBoardShell
          board={board}
          projectId={project.id}
          meetingHref={meetingHref}
          issue="当前商业模式判断"
          judgement={board.subtitle}
          experts={experts}
          siblingLinks={[
            { href: `/projects/${project.id}/positioning`, label: "品牌定位部" },
            { href: `/projects/${project.id}/market`, label: "市场研究部" },
            { href: `/projects/${project.id}/equity`, label: "组织设计部" },
          ]}
        />
        <PageEmptyState
          eyebrow="商业顾问"
          title="还没有商业诊断"
          description="先说清卖给谁、卖什么、怎么赚钱、现在卡在哪里。"
        />
      </div>
    );
  }

  const businessCard = buildBusinessSnapshotCard(snapshot);
  const vitals = buildBusinessVitals(scores);
  const council = buildCouncilOpinions(snapshot);
  const chiefAdvisor = buildChiefAdvisor({
    snapshot,
    streaming: loading,
    hasDiagnosis: Boolean(scores && Object.keys(scores).length > 0),
    hasCouncil: ruleJudgments.length > 0 || suggestions.length > 0,
  });
  const businessProtocolProjection = buildBusinessProtocolProjection({
    project: {
      name: project.name,
      category: project.category,
      stage: project.stage,
    },
    snapshot,
    previous,
    history,
    pageOutput,
    suggestions,
    ruleJudgments,
    verificationTasks,
    factNodes,
    businessCard,
  });
  const {
    founderContextView,
    businessContextView,
    decisionProtocolView,
    memoryView,
    factLedger,
  } = businessProtocolProjection;

  const journey = journeyPreview;
  const currentStepId = journey.find((step) => step.status === "current")?.id;
  const currentStepLabel = journey.find((step) => step.status === "current")?.label || "进行中";
  const hasDraft = message.trim().length > 0;
  const board = getDepartmentBoard("business");
  const experts = getDepartmentExperts("business");
  const issue = snapshot?.oneLiner || "当前商业模式判断";
  const meetingHref = getDepartmentMeetingHref(project.id, "business", issue);
  const judgement = streamText || snapshot?.oneLiner || snapshot?.diagnosis || board.subtitle;

  return (
    <div className="space-y-5 pb-2">
      <DepartmentBoardShell
        board={board}
        projectId={project.id}
        meetingHref={meetingHref}
        issue={issue}
        judgement={judgement}
        experts={experts}
        siblingLinks={[
          { href: `/projects/${project.id}/positioning`, label: "品牌定位部" },
          { href: `/projects/${project.id}/market`, label: "市场研究部" },
          { href: `/projects/${project.id}/equity`, label: "组织设计部" },
        ]}
      />

      <CollapsibleBoardSection
        eyebrow="工作台"
        title="商业诊断与旅程"
        summary={`当前：${currentStepLabel} · 推进 ${progress}% · 正式判断请用上方开会`}
        defaultOpen={!snapshot || currentStepId === "foundation"}
      >
      <div className="space-y-4">
      <div className="space-y-4">
        <WorkspaceJourneyRail
          eyebrow="商业旅程"
          title="商业旅程"
          progress={progress}
          summary="不是问一个商业问题，而是一步一步完成商业认知建立、顾问评审和决策收口。"
          steps={journey}
          palette={{
            border: "border-[rgba(53,93,74,0.10)]",
            title: "text-[#1F3C2F]",
            eyebrow: "text-[#5E6E66]",
            cardBg: "bg-white/68",
            progressBg: "bg-[rgba(255,255,255,0.72)]",
            progressTitle: "text-[#5E6E66]",
            progressValue: "text-[#1F3C2F]",
            progressText: "text-[#4F5A55]",
            completedTone: "border-[rgba(53,93,74,0.18)] bg-[rgba(53,93,74,0.10)] text-[#355D4A]",
            currentTone: "border-[rgba(196,168,130,0.28)] bg-[rgba(196,168,130,0.14)] text-[#8B6A42]",
            upcomingTone: "border-[rgba(24,24,23,0.06)] bg-white/88 text-[#9AA09A]",
            note: "text-[#66706A]",
          }}
        />

        <ChiefAdvisorPanel
          title={chiefAdvisor.title}
          summary={chiefAdvisor.summary}
          learned={chiefAdvisor.learned}
          missing={chiefAdvisor.missing}
          nextStep={chiefAdvisor.nextStep}
          palette={{
            border: "border-[rgba(53,93,74,0.12)]",
            containerBg: "bg-[#1F3C2F]",
            title: "text-white",
            eyebrow: "text-[#C8D4CE]",
            chipBg: "bg-[rgba(255,255,255,0.08)]",
            chipText: "text-[#F4F6F2]",
            body: "text-[#D6DDD8]",
            softBg: "bg-[rgba(255,255,255,0.06)]",
            nextBorder: "border-transparent",
            nextBg: "bg-[rgba(255,255,255,0.10)]",
            note: "text-[#E4ECE6]",
          }}
        />
      </div>

      <ModuleIntakeCard
        title="顾问启动访谈"
        description="先说清卖给谁、卖什么、怎么赚钱、现在卡在哪里。AI 会先建立共同理解，再进入判断。"
        fields={[
          {
            id: "customer",
            label: "客户是谁",
            placeholder: "例如：社区家庭用户、写字楼白领、夜宵年轻客群。",
            value: businessIntake.customer,
            onChange: (value) => updateBusinessIntake("customer", value),
          },
          {
            id: "offer",
            label: "卖什么",
            placeholder: "例如：社区正餐、现炒快餐、加盟模型、标准化门店服务。",
            value: businessIntake.offer,
            onChange: (value) => updateBusinessIntake("offer", value),
          },
          {
            id: "revenue",
            label: "怎么赚钱",
            placeholder: "例如：堂食客单、外卖规模、加盟费、供应链毛利。",
            value: businessIntake.revenue,
            onChange: (value) => updateBusinessIntake("revenue", value),
          },
          {
            id: "blocker",
            label: "最大困难",
            placeholder: "例如：单店盈利不稳、获客贵、组织跟不上、模型难复制。",
            value: businessIntake.blocker,
            onChange: (value) => updateBusinessIntake("blocker", value),
          },
        ]}
        recordingFieldId={speechInput.activeFieldId}
        speechSupported={speechInput.speechSupported}
        speechError={speechInput.speechError}
        onToggleVoiceField={(field) =>
          void speechInput.toggleFieldRecording(field.id, field.value, field.onChange)
        }
        onApply={applyBusinessIntake}
        applyLabel="写入商业诊断"
      />

      <div className="space-y-4">
        <section className="rounded-[24px] border border-[rgba(53,93,74,0.10)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">商业画像</p>
              <h2 className="mt-1 text-[22px] leading-[1.25] tracking-[-0.03em] text-[#1F3C2F]">你的商业画像</h2>
            </div>
            <Compass className="h-5 w-5 text-[#355D4A]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "行业", value: businessCard.industry },
              { label: "客户", value: businessCard.customer },
              { label: "核心价值", value: businessCard.value },
              { label: "收入结构", value: businessCard.revenue },
              { label: "当前阶段", value: businessCard.stage },
              { label: "判断层级", value: pageOutput ? layerLabel(pageOutput.currentLayer) : "待启动" },
            ].map((item) => (
              <div key={item.label} className="rounded-[18px] bg-[#F7F7F2] px-4 py-4">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">{item.label}</p>
                <p className="mt-2 text-[14px] leading-7 text-[#1F3C2F]">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[rgba(53,93,74,0.10)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">商业体检</p>
              <h2 className="mt-1 text-[22px] leading-[1.25] tracking-[-0.03em] text-[#1F3C2F]">商业体检</h2>
            </div>
            <BriefcaseBusiness className="h-5 w-5 text-[#355D4A]" />
          </div>
          <div className="mt-4 space-y-3">
            {vitals.map((item) => {
              const pct = (item.score / 5) * 100;
              return (
                <div key={item.label} className="rounded-[18px] bg-[#F7F7F2] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium text-[#1F3C2F]">{item.label}</p>
                    <span className="text-[13px] text-[#5E6E66]">{item.score.toFixed(1)}/5</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(24,24,23,0.06)]">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 4
                          ? "bg-[#355D4A]"
                          : item.score >= 3
                            ? "bg-[#C4A882]"
                            : "bg-[#B47C5C]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-[#5E6E66]">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      </div>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="创始人智能层"
        title="创业者认知协议"
        summary="把身份、商业、决策与记忆整理成可展开的工作台结构。"
        defaultOpen={false}
      >
        <div className="mb-4 flex justify-end">
          <div className="rounded-full bg-[rgba(53,93,74,0.10)] px-3 py-2 text-[12px] font-medium text-[#355D4A]">
            当前任务：{pageOutput ? layerLabel(pageOutput.currentLayer) : "等待启动"}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[20px] border border-[rgba(53,93,74,0.08)] bg-white p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">身份层</p>
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#1F3C2F]">创始人语境</h3>
            <div className="mt-4 space-y-3">
              {[
                { label: "身份", value: founderContextView.identity },
                { label: "业务背景", value: founderContextView.background },
                { label: "当前目标", value: founderContextView.goal },
                { label: "风险偏好", value: `${founderContextView.riskLabel} · ${founderContextView.riskNote}` },
                { label: "决策方式", value: founderContextView.decisionStyle },
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                  <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">{item.label}</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#1F3C2F]">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[rgba(53,93,74,0.08)] bg-white p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">商业层</p>
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#1F3C2F]">商业语境</h3>
            <div className="mt-4 space-y-3">
              {businessContextView.map((item) => (
                <div key={item.label} className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                  <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">{item.label}</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#1F3C2F]">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[rgba(53,93,74,0.08)] bg-white p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">决策层</p>
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#1F3C2F]">决策协议</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">问题</p>
                <p className="mt-2 text-[13px] leading-6 text-[#1F3C2F]">{decisionProtocolView.problem}</p>
              </div>
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">选择</p>
                <p className="mt-2 text-[13px] leading-6 text-[#1F3C2F]">{decisionProtocolView.choice}</p>
              </div>
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">推理</p>
                <div className="mt-2 space-y-2">
                  {decisionProtocolView.reasoning.length > 0 ? (
                    decisionProtocolView.reasoning.map((item) => (
                      <p key={item} className="text-[13px] leading-6 text-[#1F3C2F]">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-[13px] leading-6 text-[#5E6E66]">等待形成结构化判断。</p>
                  )}
                </div>
              </div>
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">取舍</p>
                <p className="mt-2 text-[13px] leading-6 text-[#1F3C2F]">{decisionProtocolView.tradeoff}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[rgba(53,93,74,0.08)] bg-white p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">记忆层</p>
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#1F3C2F]">记忆更新</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">创始人记忆</p>
                <div className="mt-2 space-y-2">
                  {memoryView.founderMemory.map((item) => (
                    <p key={item} className="text-[13px] leading-6 text-[#1F3C2F]">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">商业记忆</p>
                <div className="mt-2 space-y-2">
                  {memoryView.businessMemory.length > 0 ? (
                    memoryView.businessMemory.map((item) => (
                      <p key={item} className="text-[13px] leading-6 text-[#1F3C2F]">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-[13px] leading-6 text-[#5E6E66]">历史商业事实还在积累中。</p>
                  )}
                </div>
              </div>
              <div className="rounded-[16px] bg-[#F7F7F2] px-3 py-3">
                <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">决策记忆</p>
                <div className="mt-2 space-y-2">
                  {memoryView.decisionMemory.length > 0 ? (
                    memoryView.decisionMemory.map((item) => (
                      <p key={item} className="text-[13px] leading-6 text-[#1F3C2F]">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-[13px] leading-6 text-[#5E6E66]">等待当前建议进入正式决策记录。</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </CollapsibleBoardSection>

      <div className="space-y-4">
        <CollapsibleBoardSection
          eyebrow="账本"
          title="商业事实账本"
          summary="事实 / 假设 / 假说"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {factLedger.length > 0 ? (
              factLedger.map((item) => (
                <div key={item.id} className="rounded-[18px] bg-[#F7F7F2] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#355D4A]">
                      {item.kind === "FACT"
                        ? "事实"
                        : item.kind === "ASSUMPTION"
                          ? "假设"
                          : item.kind === "HYPOTHESIS"
                            ? "假说"
                            : item.kind}
                    </div>
                    <div className="text-[12px] text-[#5E6E66]">{item.note}</div>
                  </div>
                  <p className="mt-3 text-[14px] leading-7 text-[#1F3C2F]">{item.statement}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MKMetaPill label="状态" value={item.status || "待验证"} />
                    {item.followUp ? <MKMetaPill label="下一问" value={item.followUp} /> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] bg-[#F7F7F2] px-4 py-4 text-[14px] leading-7 text-[#5E6E66]">
                还没有结构化事实节点。先完成一次顾问访谈，系统会把商业事实、假设和待验证线索拆开保存。
              </div>
            )}
          </div>
        </CollapsibleBoardSection>

        <CollapsibleBoardSection
          eyebrow="顾问协议"
          title="决策协议流"
          summary="上下文 → 决策 → 验证 → 记忆"
          defaultOpen={false}
          tone="dark"
        >
          <div className="space-y-3">
            {[
              {
                title: "01 · 顾问上下文",
                body: `${founderContextView.identity} / ${businessContextView[2]?.value || "客户模型待补全"}`,
              },
              {
                title: "02 · 决策协议",
                body: decisionProtocolView.choice,
              },
              {
                title: "03 · 验证",
                body: decisionProtocolView.validation,
              },
              {
                title: "04 · 记忆更新",
                body: memoryView.decisionMemory[0] || "当前决策尚未写入长期记忆。",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] px-4 py-4"
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  {item.title}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-white/82">{item.body}</p>
              </div>
            ))}
          </div>
        </CollapsibleBoardSection>
      </div>

      <CollapsibleBoardSection
        eyebrow="结果"
        title="顾问会与商业建议"
        summary="委员会意见、决策摘要与成长地图；正式判断请用上方开会。"
        defaultOpen={false}
      >
      <WorkspaceMeetingPanel
        eyebrow="商业顾问团"
        title="商业顾问委员会"
        items={council}
        summary={
          snapshot?.diagnosis ||
          "当前最大的价值不是多给几个问题，而是先把真正的第一性问题找出来。"
        }
        conflict={
          ruleJudgments[0]?.conclusion ||
          suggestions[0]?.expectedImpact ||
          "当前正在平衡增长速度、现金压力和复制能力。"
        }
        conflictLabel="当前核心矛盾"
        palette={{
          border: "border-[rgba(53,93,74,0.10)]",
          background: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F7F2_100%)]",
          eyebrow: "text-[#5E6E66]",
          title: "text-[#1F3C2F]",
          itemBorder: "border-[rgba(53,93,74,0.10)]",
          itemBg: "bg-white",
          itemBody: "text-[#1F3C2F]",
          itemToneBg: "bg-[rgba(196,168,130,0.14)]",
          itemToneText: "text-[#8B6A42]",
          summaryBg: "bg-[#1F3C2F]",
          summaryText: "text-white",
          summaryLabel: "text-white/70",
          summaryNoteBg: "bg-white/10",
          summaryNoteText: "text-white/88",
        }}
      />

      <WorkspaceDecisionPanel
        eyebrow="商业决策"
        title={streamText || snapshot?.oneLiner || "先形成一轮商业建议"}
        badge={healthScore >= 70 ? "商业模型基本成立" : healthScore >= 50 ? "需要继续验证" : "先别放大风险"}
        summaryTitle="一句话判断"
        summaryBody={
          snapshot?.oneLiner ||
          "先完成一次商业诊断，再决定这门生意当前最该优先解决什么。"
        }
        leftCards={[
          {
            title: "优先动作",
            body: snapshot?.strategy || suggestions[0]?.action || "先把最大的脆弱点压成一个验证动作。",
          },
          {
            title: "不要急着做",
            body:
              verificationTasks[0]?.verificationAction ||
              snapshot?.action ||
              "不要在核心矛盾还没清楚时直接扩张。",
            tone: "warning",
          },
        ]}
        reasonsTitle="为什么这样判断"
        reasons={
          suggestions.slice(0, 3).map((item) => item.action) ||
          (ruleJudgments.slice(0, 3).map((item) => item.conclusion) as string[])
        }
        rightTitle="下一步"
        rightHeading="把商业判断带进后续经营动作"
        rightBody={stripAgentProductNames(
          "M-BIZ 回答的是“这门生意怎么赚钱、哪里最危险、先做什么”。下一步可以继续进入股权治理，或者带着当前判断回到定位与市场模块做联动。",
        )}
        rightAction={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}/equity`}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-[13px] font-medium text-[#1F3C2F] no-underline"
            >
              组织设计部
            </Link>
            <Link
              href={`/projects/${project.id}/positioning`}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-transparent px-5 py-2 text-[13px] font-medium text-white no-underline"
            >
              品牌定位部
            </Link>
          </div>
        }
        palette={{
          border: "border-[rgba(53,93,74,0.10)]",
          background: "bg-white",
          eyebrow: "text-[#5E6E66]",
          title: "text-[#1F3C2F]",
          badgeBg: "bg-[rgba(53,93,74,0.10)]",
          badgeText: "text-[#355D4A]",
          summaryBg: "bg-[linear-gradient(180deg,#F7F7F2_0%,#EEF4EF_100%)]",
          summaryEyebrow: "text-[#5E6E66]",
          summaryText: "text-[#1F3C2F]",
          cardBorder: "border-[rgba(53,93,74,0.10)]",
          cardBg: "bg-white",
          cardEyebrow: "text-[#5E6E66]",
          cardText: "text-[#1F3C2F]",
          warningText: "text-[#9A3412]",
          reasonItemBg: "bg-[#F7F7F2]",
          rightBg: "bg-[#1F3C2F]",
          rightEyebrow: "text-white/70",
          rightText: "text-white",
          rightBodyText: "text-white/82",
        }}
      />

      <CollapsibleBoardSection
        eyebrow="历史"
        title="决策档案与验证地图"
        summary={snapshot?.oneLiner || history[0]?.oneLiner || "仅保留最近判断摘要，详情可展开查看"}
        defaultOpen={false}
      >
      <div className="space-y-4">
        <WorkspaceArchivePanel
          eyebrow="决策档案"
          title="历史商业判断"
          emptyText="还没有历史商业诊断。"
          items={[
            ...(snapshot
              ? [
                  {
                    id: `current-${snapshot.sessionId || "latest"}`,
                    title: snapshot.oneLiner,
                    summary: snapshot.updatedAt || "当前版本",
                  },
                ]
              : []),
            ...(previous
              ? [
                  {
                    id: `previous-${previous.sessionId || "previous"}`,
                    title: previous.oneLiner,
                    summary: previous.updatedAt || "上一轮判断",
                  },
                ]
              : []),
            ...history.slice(0, 4).map((item, index) => ({
              id: `${item.sessionId || "history"}-${index}`,
              title: item.oneLiner,
              summary: item.updatedAt || item.problem || "历史版本",
            })),
          ]}
          palette={{
            border: "border-[rgba(53,93,74,0.10)]",
            background: "bg-white",
            eyebrow: "text-[#5E6E66]",
            title: "text-[#1F3C2F]",
            itemBg: "bg-[#F7F7F2]",
            itemTitle: "text-[#1F3C2F]",
            itemBody: "text-[#5E6E66]",
            emptyBg: "bg-[#F7F7F2]",
            emptyText: "text-[#5E6E66]",
          }}
        />

        <section className="rounded-[24px] border border-[rgba(53,93,74,0.10)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.08em] text-[#5E6E66]">成长地图</p>
              <h2 className="mt-1 text-[22px] leading-[1.25] tracking-[-0.03em] text-[#1F3C2F]">下一步先验证</h2>
            </div>
            <TrendingUp className="h-5 w-5 text-[#355D4A]" />
          </div>
          <div className="mt-4 space-y-3">
            {verificationTasks.length > 0 ? (
              verificationTasks.slice(0, 4).map((task) => (
                <div key={task.taskId} className="rounded-[18px] bg-[#F7F7F2] px-4 py-4">
                  <p className="text-[14px] font-medium leading-7 text-[#1F3C2F]">{task.verificationAction}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <MKMetaPill label="维度" value={task.dimension} />
                    <MKMetaPill label="周期" value={task.estimatedPeriod || "1 个月"} />
                    <MKMetaPill
                      label="状态"
                      value={
                        task.status === "unverified"
                          ? "待验证"
                          : task.status === "pass"
                            ? "已验证"
                            : task.status === "fail"
                              ? "未通过"
                              : "进行中"
                      }
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] bg-[#F7F7F2] px-4 py-4 text-[14px] leading-7 text-[#5E6E66]">
                还没有验证任务。先完成一次顾问诊断，AI 会把下一步的经营动作写进成长地图。
              </div>
            )}
          </div>
        </section>
      </div>
      </CollapsibleBoardSection>
      </CollapsibleBoardSection>

      <section className="rounded-[24px] border border-[rgba(53,93,74,0.10)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F7F2_100%)] p-4 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#f8f9f5] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[#f8f9f5] to-transparent" />
          <div className="mb-3 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 pb-1 pr-4">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setMessage(prompt)}
                className="inline-flex min-h-10 shrink-0 snap-start items-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124] transition active:scale-[0.98]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            disabled={loading}
            className="min-h-[96px] w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-[1.7] text-[#202124] outline-none placeholder:text-[#8a8f87] focus:ring-0 disabled:opacity-60"
            placeholder="用一句话说清：你的生意卖给谁、靠什么交付、怎么赚钱、现在卡在哪里。"
          />

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(24,24,23,0.08)] pt-3">
            <div className="flex min-w-0 items-center gap-2">
              {speechInput.speechSupported ? (
                <button
                  type="button"
                  onClick={() =>
                    void speechInput.toggleFieldRecording("business_message", message, setMessage)
                  }
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-[0.98] ${
                    speechInput.activeFieldId === "business_message"
                      ? "bg-[#1F3C2F] text-white"
                      : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
                  }`}
                  aria-label={speechInput.activeFieldId === "business_message" ? "停止语音输入" : "开始语音输入"}
                >
                  {speechInput.activeFieldId === "business_message" ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <p className="text-[12px] leading-5 text-[#6f747b]">
                {loading
                  ? "商业顾问正在建立判断..."
                  : speechInput.activeFieldId === "business_message"
                    ? "正在语音转文字..."
                    : hasDraft
                      ? "发送后会先建立商业画像，再进入体检和顾问会议。"
                      : "先输入，再开始这一轮商业诊断。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleChat()}
              disabled={loading || !hasDraft}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F3C2F] text-white transition active:scale-[0.98] disabled:opacity-50"
              aria-label={loading ? "正在诊断" : "开始诊断"}
              title={loading ? "正在诊断" : "开始诊断"}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {streamText ? (
          <div className="mt-4 rounded-[18px] border border-[rgba(53,93,74,0.10)] bg-white px-4 py-4">
            <div className="flex items-center gap-2 text-[12px] tracking-[0.08em] text-[#5E6E66]">
              <Brain className="h-4 w-4" />
              AI 商业顾问判断
            </div>
            <p className="mt-2 text-[15px] leading-[1.9] text-[#1F3C2F]">{streamText}</p>
          </div>
        ) : null}

        {factNodes.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <MKMetaPill label="事实节点" value={`${factNodes.length} 条`} />
            <MKMetaPill label="规则触发" value={`${ruleJudgments.length} 条`} />
            <MKMetaPill label="策略建议" value={`${suggestions.length} 条`} />
            <MKMetaPill label="验证动作" value={`${verificationTasks.length} 条`} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

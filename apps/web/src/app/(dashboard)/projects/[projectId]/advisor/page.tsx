"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, History, ThumbsUp, ThumbsDown, Target } from "lucide-react";
import { LightMarkdown, MeetingRoom, type MKAgentStage } from "@/components/operating";
import { EngineDegradationBanner } from "@/components/operating/EngineDegradationBanner";
import { CouncilProblemPicker } from "@/components/operating/CouncilProblemPicker";
import { AdvisorComposer } from "@/components/operating/advisor/AdvisorComposer";
import { FounderLoopPreviewPanel } from "@/components/operating/meeting/FounderLoopPreviewPanel";
import type { FounderLoopRuntime } from "@/components/operating/meeting/FounderLoopPreviewPanel";
import { MeetingDraftBanners } from "@/components/operating/meeting/MeetingDraftBanners";
import { MeetingHistoryPanel } from "@/components/operating/meeting/MeetingHistoryPanel";
import { MeetingHub } from "@/components/operating/meeting/MeetingHub";
import { PositioningReviewBanner } from "@/components/operating/meeting/PositioningReviewBanner";
import { MemoryRuntimePanel } from "@/components/operating/runtime";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import {
  SpendConfirmPanel,
  SpendReceiptNotice,
  SpendRefundNotice,
} from "@/components/operating/SpendConfirmPanel";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useBusinessWallet } from "@/hooks/useBusinessWallet";
import {
  spendOfferForDepartment,
  spendOfferForKind,
  type SpendKind,
} from "@/lib/business-wallet";
import { shouldGuideOpenInBrowserForWechatPay } from "@/lib/wechat-browser";
import { trpc } from "@/lib/trpc";

const MAX_VOICE_SECONDS = 60;
import { useProjectStore } from "@/stores/projectStore";
import type { StreamChunk } from "@mealkey/agent-sdk";
import type { PositioningSnapshot } from "@/lib/positioning";
import type { MarketSnapshot } from "@/lib/market";
import type { EquitySnapshot } from "@/lib/equity";
import {
  DEPARTMENT_MEETING_TITLE,
  detectDepartmentFromTopic,
  detectConflict,
  buildConsensusDraft,
  toDecisionCard,
  type MeetingLifecycle,
  type MeetingDepartment,
  type ExpertStatement,
  type MeetingConflict,
  type ConsensusDraft,
} from "@/lib/meeting";
import {
  getExpertsForDepartment,
  getFounderSeatsForAgents,
  getForceAgent,
  runDeliberationRound,
  type DeliberationRound,
  type DecisionOption,
  type ForceAgentCode,
} from "@/lib/meeting-deliberation";
import { statementFromAgentStream } from "@/lib/meeting-stream";
import { readSseJsonLines } from "@/lib/sse-line-reader";
import { saveAdvisorLocalAction } from "@/lib/advisor-local-actions";
import { resolveNextActionsForOption } from "@/lib/meeting-today-actions";
import type { ActiveMeetingDraft } from "@/lib/meeting-session";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
}

type AdvisorAsset = {
  id: string;
  title: string;
  kind: "audio" | "image" | "video" | "document";
  summary: string | null;
  transcript?: string | null;
  publicUrl: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type RuntimeMeta = {
  type: "meta";
  runtime: "runtime" | "chief" | "m-pnt" | "m-mkt" | "m-ed";
  provider: "deepseek" | "openai" | "none" | "heuristic";
  model: string;
  fallback: boolean;
  assetCount: number;
  conversationId: string;
  agentId?: string;
  agentName?: string;
};

type BrowserSpeechRecognitionResult = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export default function AdvisorPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <Suspense
      fallback={
        <PageLoadingState
          eyebrow="顾问咨询"
          title="正在打开…"
          description="读取议题与上下文。"
        />
      }
    >
      <PageErrorBoundary fallbackTitle="顾问咨询暂时无法打开">
        <AdvisorPageContent params={params} />
      </PageErrorBoundary>
    </Suspense>
  );
}

function AdvisorPageContent({
  params,
}: {
  params: { projectId: string };
}) {
  const searchParams = useSearchParams();
  const { wallet, reload: reloadWallet } = useBusinessWallet();
  const [spendConfirmOpen, setSpendConfirmOpen] = useState(false);
  const [spendConfirmOfferKind, setSpendConfirmOfferKind] = useState<SpendKind | null>(null);
  const [spendError, setSpendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState<
    string | undefined
  >();
  const confirmResolver = useRef<((ok: boolean) => void) | null>(null);

  function requestConfirm(opts: {
    title: string;
    description?: string;
  }): Promise<boolean> {
    setConfirmTitle(opts.title);
    setConfirmDescription(opts.description);
    setConfirmOpen(true);
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
    });
  }

  function settleConfirm(ok: boolean) {
    setConfirmOpen(false);
    const resolve = confirmResolver.current;
    confirmResolver.current = null;
    resolve?.(ok);
  }
  const [meetingEngineNote, setMeetingEngineNote] = useState<string | null>(
    null,
  );
  const [refundPoints, setRefundPoints] = useState<number | null>(null);
  const [spendReceipt, setSpendReceipt] = useState<{
    spent: number;
    balanceAfter: number;
  } | null>(null);
  const { data, isLoading, error } = trpc.dashboard.getAdvisorWorkspace.useQuery({ projectId: params.projectId });
  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId: params.projectId },
    { enabled: Boolean(params.projectId) },
  );
  const { data: assetCategories = [] } = trpc.asset.categories.useQuery();
  const { data: assetLibrary = [] } = trpc.asset.list.useQuery({
    projectId: params.projectId,
    limit: 12,
  });
  const { data: savedMeetingDraft } = trpc.meetingSession.get.useQuery(
    { projectId: params.projectId },
    { staleTime: 30_000 },
  );
  const { data: meetingHistory = [] } = trpc.meetingSession.listHistory.useQuery(
    { projectId: params.projectId, limit: 8 },
    { staleTime: 60_000 },
  );
  const saveMeetingSession = trpc.meetingSession.save.useMutation();
  const clearMeetingSession = trpc.meetingSession.clear.useMutation();
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const utils = trpc.useUtils();
  const deepLinkConsumedRef = useRef(false);
  const meetingDraftRestoredRef = useRef(false);
  const meetingSaveTimerRef = useRef<number | null>(null);
  const reviewDecisionId = searchParams?.get("decisionId") || null;
  const reviewIntent = searchParams?.get("intent") || null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [agentState, setAgentState] = useState<MKAgentStage>("idle");
  const [agentStateDescription, setAgentStateDescription] = useState("等待进入这场经营议题");
  const [agentReferences, setAgentReferences] = useState<string[]>([
    "项目记忆",
    "历史判断",
    "经营规则",
  ]);
  const [runtimeMeta, setRuntimeMeta] = useState<RuntimeMeta | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [liveMarketSnapshot, setLiveMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [liveEquitySnapshot, setLiveEquitySnapshot] = useState<EquitySnapshot | null>(null);
  const [livePositioningSnapshot, setLivePositioningSnapshot] = useState<PositioningSnapshot | null>(null);
  const [topicConfirmed, setTopicConfirmed] = useState(false);
  const [meetingLifecycle, setMeetingLifecycle] = useState<MeetingLifecycle>("PREPARE");
  const [focusChoice, setFocusChoice] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [acceptedDecisionId, setAcceptedDecisionId] = useState<string | null>(null);
  const [acceptedGrowthPlan, setAcceptedGrowthPlan] = useState<{
    day30: string;
    day60: string;
    day90: string;
    startedAt: string;
    decisionSummary: string;
    horizonDays: number;
  } | null>(null);
  const [acceptedValidationTask, setAcceptedValidationTask] = useState<{
    id: string;
    title: string;
    objective: string;
    owner: string;
    horizonDays: number;
    metrics: Array<{ id: string; label: string; target?: string | number }>;
    status?: string;
  } | null>(null);
  const [meetingTopic, setMeetingTopic] = useState<string | null>(null);
  const [deliberationRound, setDeliberationRound] = useState<DeliberationRound | 0>(0);
  const [liveStatements, setLiveStatements] = useState<ExpertStatement[]>([]);
  const [liveConflict, setLiveConflict] = useState<MeetingConflict | null>(null);
  const [liveConsensus, setLiveConsensus] = useState<ConsensusDraft | null>(null);
  const [liveOptions, setLiveOptions] = useState<DecisionOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [serverSynthesis, setServerSynthesis] = useState<{
    judgement: string;
    reasons: string[];
    validationPlan: string;
  } | null>(null);
  const [meetingRuntime, setMeetingRuntime] = useState<{
    meeting: {
      recommendation?: string;
      conflicts: Array<{
        conflictId: string;
        summary: string;
        sideA: string;
        sideB: string;
        dimension: string;
        agents: string[];
        drivingEvidenceIds?: string[];
      }>;
      rounds: Array<{
        round: number;
        title: string;
        items: Array<{
          agent: string;
          summary: string;
          stance?: string;
          challengeTo?: string;
          challengeEvidenceId?: string;
        }>;
      }>;
      conflictMatrix?: {
        rows: Array<{
          topic: string;
          cells: Record<string, string>;
          summary: string;
          drivingEvidenceIds?: string[];
        }>;
        primary?: {
          topic: string;
          sideA: { agents: string[]; claim: string };
          sideB: { agents: string[]; claim: string };
          drivingEvidenceIds?: string[];
          question?: string;
        } | null;
        tradeoffs?: Array<{ keep: string; giveUp: string; why: string }>;
      };
      debateSession?: {
        debateId: string;
        status: string;
        conflicts: Array<{
          conflictId: string;
          topic: string;
          severity: "low" | "medium" | "high";
          committees: string[];
          evidenceRefs: string[];
          summary: string;
        }>;
        challenges: Array<{
          challengeId: string;
          fromCommittee: string;
          fromAgent: string;
          targetCommittee: string;
          targetAgent: string;
          challengeType: "evidence" | "logic" | "assumption" | "risk";
          statement: string;
          evidenceRefs?: string[];
        }>;
        proposal?: {
          decision: string;
          whyNow: string;
          tradeoffs: string[];
          conditions: string[];
          risksAccepted: string[];
          validationPlan: string;
        };
        scenarioTests: Array<{
          scenarioId: string;
          scenario: string;
          trigger: string;
          impact: string;
          mitigation: string;
        }>;
      };
    };
    decisions: Array<{
      decisionId: string;
      sourceAgent: string;
      judgement: string;
      stance?: string;
      risks: string[];
      nextSteps: string[];
      evidence?: Array<{
        evidenceId?: string;
        label: string;
        content: string;
        source?: string;
      }>;
      reasoning?: string;
      validation?: string;
      evidenceSufficient?: boolean;
      evidenceGap?: string[];
      confidence?: number;
    }>;
    finalDecision: {
      chosen: string;
      problem: string;
      reason: string[];
      validationPlan: string[];
      evidenceStatus?: "sufficient" | "insufficient";
      contract?: Record<string, unknown>;
    };
  } | null>(null);
  const [extraFacts, setExtraFacts] = useState<string[]>([]);
  const [deliberating, setDeliberating] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftConflict, setDraftConflict] = useState<{
    draft: ActiveMeetingDraft;
    incomingTopic: string;
  } | null>(null);
  const [showMeetingHistory, setShowMeetingHistory] = useState(false);
  /** hub = 会议大厅；consulting = 四席咨询会议选题 */
  const [meetingLane, setMeetingLane] = useState<"hub" | "consulting">("hub");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topicConfirmedRef = useRef(false);
  const deliberationRoundRef = useRef<DeliberationRound | 0>(0);
  const autoStartTriggeredRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const lifecycleTimersRef = useRef<number[]>([]);
  const finalizedTranscriptRef = useRef("");
  const inputBeforeRecordingRef = useRef("");
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  /** 按住说话意图：松手后即使 getUserMedia 还在进行也要取消 */
  const holdActiveRef = useRef(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTip, setVoiceTip] = useState<string | null>(null);

  const clearLifecycleTimers = useCallback(() => {
    for (const id of lifecycleTimersRef.current) {
      window.clearTimeout(id);
    }
    lifecycleTimersRef.current = [];
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const stopMediaCapture = useCallback(() => {
    clearRecordingTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, [clearRecordingTimer]);

  // 卸载时清理录音 / 语音识别 / SSE / 定时器
  useEffect(() => {
    return () => {
      stopMediaCapture();
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      clearLifecycleTimers();
    };
  }, [stopMediaCapture, clearLifecycleTimers]);

  useEffect(() => {
    if (data?.currentProject) setCurrentProject(data.currentProject);
  }, [data?.currentProject, setCurrentProject]);

  useEffect(() => {
    if (shouldGuideOpenInBrowserForWechatPay()) {
      setVoiceTip(
        "微信里说话容易不稳。点右上角 ··· → 在浏览器打开，再按住说话更准。",
      );
    }
  }, []);

  /** 键盘弹出时用 visualViewport 高度，避免输入区被顶出可视区 */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      document.documentElement.style.setProperty(
        "--advisor-vvh",
        `${Math.round(vv.height)}px`,
      );
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--advisor-vvh");
    };
  }, []);

  useEffect(() => {
    topicConfirmedRef.current = topicConfirmed;
  }, [topicConfirmed]);

  useEffect(() => {
    deliberationRoundRef.current = deliberationRound;
  }, [deliberationRound]);

  useEffect(() => {
    // 流式输出节流滚动，避免每个 token 强制回流
    const delay = streamingText ? 120 : 0;
    const t = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: streamingText ? "auto" : "smooth",
        block: "end",
      });
    }, delay);
    return () => window.clearTimeout(t);
  }, [messages.length, streamingText ? Math.floor(streamingText.length / 80) : 0]);

  // 刷新恢复：从 profile.activeMeeting 还原会议桌
  const applySavedDraft = useCallback((draft: ActiveMeetingDraft) => {
    setMeetingTopic(draft.topic);
    setTopicConfirmed(draft.topicConfirmed);
    setMeetingLifecycle(draft.lifecycle);
    setDeliberationRound(draft.deliberationRound);
    setLiveStatements(draft.liveStatements);
    setLiveConflict(draft.liveConflict);
    setLiveConsensus(draft.liveConsensus);
    setLiveOptions(draft.liveOptions);
    setSelectedOptionId(draft.selectedOptionId);
    setFocusChoice(draft.focusChoice);
    setServerSynthesis(draft.serverSynthesis);
    setMeetingRuntime(draft.meetingRuntime);
    if (draft.conversationId) setConversationId(draft.conversationId);
    if (draft.selectedAssetIds?.length) setSelectedAssetIds(draft.selectedAssetIds);
    setShowDraftBanner(true);
    setDraftConflict(null);
    setAgentState("completed");
    setAgentStateDescription("已恢复上次未结束的会议");
  }, []);

  useEffect(() => {
    if (meetingDraftRestoredRef.current) return;
    if (savedMeetingDraft === undefined) return;
    meetingDraftRestoredRef.current = true;
    if (!savedMeetingDraft || !savedMeetingDraft.topicConfirmed) return;

    const incomingTopic = searchParams?.get("topic")?.trim() || "";
    if (incomingTopic && incomingTopic !== savedMeetingDraft.topic) {
      setDraftConflict({ draft: savedMeetingDraft, incomingTopic });
      return;
    }

    applySavedDraft(savedMeetingDraft);
  }, [savedMeetingDraft, searchParams, applySavedDraft]);

  // 进行中会议 debounce 落库
  useEffect(() => {
    if (!meetingDraftRestoredRef.current) return;
    if (draftConflict) return;
    if (!topicConfirmed || deliberating) return;
    if (!meetingTopic?.trim()) return;
    if (
      meetingLifecycle === "DECISION" ||
      meetingLifecycle === "VALIDATE" ||
      meetingLifecycle === "MEMORY_UPDATE" ||
      meetingLifecycle === "ABANDONED"
    ) {
      return;
    }

    const draft: ActiveMeetingDraft = {
      topic: meetingTopic,
      topicConfirmed,
      lifecycle: meetingLifecycle,
      deliberationRound: (deliberationRound || 0) as 0 | 1 | 2 | 3,
      liveStatements,
      liveConflict,
      liveConsensus,
      liveOptions,
      selectedOptionId,
      focusChoice,
      serverSynthesis,
      meetingRuntime,
      conversationId: conversationId ?? null,
      selectedAssetIds,
      updatedAt: new Date().toISOString(),
      status: "draft",
    };

    if (meetingSaveTimerRef.current) {
      window.clearTimeout(meetingSaveTimerRef.current);
    }
    meetingSaveTimerRef.current = window.setTimeout(() => {
      saveMeetingSession.mutate(
        { projectId: params.projectId, draft },
        {
          onSuccess: () => {
            void utils.dashboard.getHome.invalidate();
          },
        },
      );
    }, 900);

    return () => {
      if (meetingSaveTimerRef.current) {
        window.clearTimeout(meetingSaveTimerRef.current);
      }
    };
  }, [
    topicConfirmed,
    meetingLifecycle,
    deliberationRound,
    liveStatements,
    liveConflict,
    liveConsensus,
    liveOptions,
    selectedOptionId,
    focusChoice,
    serverSynthesis,
    meetingRuntime,
    conversationId,
    selectedAssetIds,
    meetingTopic,
    deliberating,
    draftConflict,
    params.projectId,
  ]);

  useEffect(() => {
    if (!topicConfirmed) return;
    // Founder 审议回合已接管生命周期时，勿被聊天消息自动推着跳阶段
    if (deliberationRoundRef.current > 0) return;
    const substantive = messages.filter(
      (m) => m.id !== "welcome" && m.id !== "loading" && m.id !== "streaming",
    );
    if (substantive.length === 0) return;
    setMeetingLifecycle((prev) => {
      if (prev === "OPEN" || prev === "DISCUSS") return "DEBATE";
      if (prev === "DEBATE") return "SYNTHESIS";
      if (prev === "SYNTHESIS") return "USER_CONFIRM";
      return prev;
    });
  }, [messages, topicConfirmed]);

  // 初始加载时的 AI 问候
  useEffect(() => {
    if (data?.currentProject && data.workspace && messages.length === 0) {
      setAgentState("completed");
      setAgentStateDescription(
        data.workspace.isInitialMeeting
          ? "我已经根据经营诊断完成了首场会议准备"
          : "我已经读取这个项目，并完成了第一轮会议准备",
      );
      setAgentReferences(["项目记忆", "历史判断", "经营规则"]);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: data.workspace.isInitialMeeting
            ? `首场会议准备已完成。\n\n当前议题：${data.workspace.currentProblem}\n\n会议背景：${data.workspace.kickoffSummary}\n\n我建议先围绕这三个问题推进：\n${(data.workspace.kickoffQuestions ?? []).map((item: string, index: number) => `${index + 1}. ${item}`).join("\n")}\n\n你可以直接选择一个问题开始，也可以先补充新的事实和约束。`
            : `会议准备已完成。\n\n当前议题：${data.workspace.currentProblem}\n\nAI 主持判断：${data.workspace.consultantSummary}\n\n你可以先补充事实、查看证据、挑战判断，或者直接把这次会议收束成经营决策。`,
        },
      ]);
    }
  }, [data?.currentProject, data?.workspace, messages.length]);

  useEffect(() => {
    if (!selectedCategoryId && assetCategories.length > 0) {
      const preferred =
        assetCategories.find((item) => item.slug === "market-research") ??
        assetCategories.find((item) => item.scope === "project") ??
        assetCategories[0];
      if (preferred) {
        setSelectedCategoryId(preferred.id);
      }
    }
  }, [assetCategories, selectedCategoryId]);

  const uploadAsset = useCallback(
    async (file: File, overrides?: { title?: string; categoryId?: string; transcriptHint?: string }) => {
      setUploading(true);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", params.projectId);
        if (conversationId) {
          formData.append("conversationId", conversationId);
        }
        if (overrides?.title) {
          formData.append("title", overrides.title);
        }
        if (overrides?.transcriptHint) {
          formData.append("transcriptHint", overrides.transcriptHint);
        }
        const categoryId = overrides?.categoryId ?? selectedCategoryId;
        if (categoryId) {
          formData.append("categoryId", categoryId);
        }

        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const msg = errBody?.error || `上传失败（HTTP ${response.status}）`;
          setUploadError(msg);
          return;
        }

        const payload = (await response.json()) as { asset?: AdvisorAsset; error?: string };
        if (!payload.asset) {
          setUploadError(payload.error || "上传后没有返回资料");
          return;
        }

        await utils.asset.list.invalidate({ projectId: params.projectId, limit: 12 });
        setSelectedAssetIds((prev) => (prev.includes(payload.asset!.id) ? prev : [...prev, payload.asset!.id]));
        setAgentReferences((prev) => (prev.includes("上传资料") ? prev : [...prev, "上传资料"].slice(-4)));
        const isVoice = Boolean(overrides?.title?.includes("语音"));
        const transcript = (payload.asset.transcript || "").trim();
        if (isVoice) {
          if (transcript) {
            setInput((prev) => {
              const base = inputBeforeRecordingRef.current || prev.trim();
              if (base.includes(transcript)) return prev;
              return [base, transcript].filter(Boolean).join("\n");
            });
            setUploadSuccess(
              `已听成字：${transcript.slice(0, 36)}${transcript.length > 36 ? "…" : ""}（可改再发）`,
            );
          } else {
            setUploadSuccess(null);
            setUploadError(
              overrides?.transcriptHint?.trim()
                ? "云端转写没成功，浏览器听写也不完整。请再按住说清楚，或直接打字。检查通义/DashScope Key。"
                : "录音保存了，但没转成文字。请再按住说清楚一点，或直接打字。",
            );
          }
        } else {
          setUploadSuccess("资料已上传并选入本次会议");
        }
        setTimeout(() => setUploadSuccess(null), 5000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败，请检查网络后重试";
        setUploadError(msg);
      } finally {
        setUploading(false);
      }
    },
    [conversationId, params.projectId, selectedCategoryId, utils.asset.list],
  );

  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      const list = Array.from(files ?? []);
      if (list.length === 0) return;
      for (const file of list) {
        await uploadAsset(file);
      }
    },
    [uploadAsset],
  );

  const handleStopRecording = useCallback(() => {
    holdActiveRef.current = false;
    if (!recording && !recorderRef.current) {
      // 按住太短：getUserMedia 还没回来，靠 holdActiveRef 取消
      return;
    }
    clearRecordingTimer();
    setRecordingSeconds(0);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        setRecording(false);
      }
    } catch {
      setRecording(false);
    }
  }, [clearRecordingTimer, recording]);

  const handleStartRecording = useCallback(async () => {
    if (recording || uploading || streaming) return;
    holdActiveRef.current = true;

    if (shouldGuideOpenInBrowserForWechatPay()) {
      setVoiceTip(
        "微信里说话容易不稳。点右上角 ··· → 在浏览器打开，再按住说话更准。",
      );
    }

    setUploadError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      holdActiveRef.current = false;
      setUploadError(
        shouldGuideOpenInBrowserForWechatPay()
          ? "打不开麦克风。请允许权限，或点 ··· 用系统浏览器打开后再说。"
          : "打不开麦克风。请允许麦克风权限后，再按住说话。",
      );
      return;
    }

    if (!holdActiveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    mediaStreamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorderChunksRef.current = [];
    recorderRef.current = recorder;
    finalizedTranscriptRef.current = "";
    inputBeforeRecordingRef.current = input.trim();
    setRecordingTranscript("");
    setRecordingSeconds(0);
    recordingStartedAtRef.current = Date.now();

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as Window & {
            SpeechRecognition?: BrowserSpeechRecognitionCtor;
            webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
          }).SpeechRecognition ??
          (window as Window & {
            SpeechRecognition?: BrowserSpeechRecognitionCtor;
            webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
          }).webkitSpeechRecognition)
        : undefined;

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim() ?? "";
          if (!transcript) continue;
          if (result.isFinal) {
            finalizedTranscriptRef.current = `${finalizedTranscriptRef.current} ${transcript}`.trim();
          } else {
            interim = `${interim} ${transcript}`.trim();
          }
        }
        const combinedTranscript = `${finalizedTranscriptRef.current} ${interim}`.trim();
        setRecordingTranscript(combinedTranscript);
        setInput(
          [inputBeforeRecordingRef.current, combinedTranscript]
            .filter(Boolean)
            .join("\n"),
        );
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          setUploadError("请允许麦克风权限后再按住说话。");
        }
        setRecordingTranscript(finalizedTranscriptRef.current);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recorderChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      clearRecordingTimer();
      setRecording(false);
      setRecordingSeconds(0);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      const audioBlob = new Blob(recorderChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const transcriptHint = finalizedTranscriptRef.current.trim();
      if (transcriptHint) {
        setInput(
          [inputBeforeRecordingRef.current, transcriptHint]
            .filter(Boolean)
            .join("\n"),
        );
      }
      setRecordingTranscript("");

      // 按太短 / 几乎无声音
      if (audioBlob.size < 800 && !transcriptHint) {
        setUploadError("没听清。请按住多说两句，再说完松手。");
        return;
      }

      const extension = (recorder.mimeType || "").includes("mp4") ? "m4a" : "webm";
      const audioFile = new File(
        [audioBlob],
        `advisor-voice-${Date.now()}.${extension}`,
        { type: recorder.mimeType || "audio/webm" },
      );
      await uploadAsset(audioFile, {
        title: "语音会议输入",
        transcriptHint: transcriptHint || undefined,
      });
    };

    recorder.start(250);
    setRecording(true);
    clearRecordingTimer();
    recordingTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - recordingStartedAtRef.current) / 1000,
      );
      setRecordingSeconds(elapsed);
      if (elapsed >= MAX_VOICE_SECONDS) {
        handleStopRecording();
      }
    }, 250);

    // 松手发生在 getUserMedia 之后、start 之前的竞态
    if (!holdActiveRef.current) {
      handleStopRecording();
    }
  }, [
    clearRecordingTimer,
    handleStopRecording,
    recording,
    streaming,
    uploadAsset,
    uploading,
  ]);

  const handleSend = useCallback(async (overrideText?: string) => {
    if (streaming) return;

    const trimmedInput = (typeof overrideText === "string" ? overrideText : input).trim();
    const hasAssets = selectedAssetIds.length > 0;
    if (!trimmedInput && !hasAssets) return;

    const userText = trimmedInput || "请基于我刚上传的资料进行一次经营判断。";
    const topicEditMatch = userText.match(/^请把议题修改为[：:]\s*([\s\S]+)$/);
    if (topicEditMatch?.[1]?.trim()) {
      setMeetingTopic(topicEditMatch[1].trim());
    }
    const isReview =
      reviewIntent === "positioning_review" || userText.includes("【定位变更复审】");
    const attachedAssets = (assetLibrary as AdvisorAsset[]).filter((asset) =>
      selectedAssetIds.includes(asset.id),
    );
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: hasAssets
        ? `${userText}\n\n已附资料：${attachedAssets.map((item) => item.title).join("、")}`
        : userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setAgentState("thinking");
    setAgentStateDescription(
      isReview
        ? "正在基于新定位复审关联经营判断"
        : "AI 正在理解你的问题，并重新装配当前项目上下文",
    );
    setAgentReferences(
      isReview
        ? ["定位变更", "项目记忆", "历史判断", "经营规则"]
        : hasAssets
          ? ["上传资料", "项目记忆", "历史判断", "经营规则"]
          : ["项目记忆", "历史判断", "经营规则"],
    );

    try {
      const topicForRoute =
        meetingTopic ||
        searchParams?.get("topic")?.trim() ||
        data?.workspace?.currentProblem ||
        userText;
      const deptParam = searchParams?.get("dept") as MeetingDepartment | null;
      const departmentForRoute =
        deptParam && DEPARTMENT_MEETING_TITLE[deptParam]
          ? deptParam
          : detectDepartmentFromTopic(topicForRoute);
      const forceAgent = getForceAgent(departmentForRoute);
      let resolvedForceAgent: ForceAgentCode = forceAgent;

      // 调用 Agent 流式 API（部门会议路由到对应 Agent）
      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;
      const streamTimeout = window.setTimeout(() => abort.abort(), 180_000);

      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          conversationId,
          message: userText,
          projectId: data?.currentProject?.id,
          assetIds: selectedAssetIds,
          forceAgent,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let accumulated = "";

      try {
        await readSseJsonLines(
          reader,
          async (payload) => {
            let data:
              | StreamChunk
              | RuntimeMeta
              | { type: "market_result"; data: MarketSnapshot }
              | { type: "equity_result"; data: EquitySnapshot; previous?: EquitySnapshot | null }
              | {
                  type: "positioning_result";
                  data: PositioningSnapshot;
                  previous?: PositioningSnapshot | null;
                };
            try {
              data = JSON.parse(payload) as typeof data;
            } catch {
              if (process.env.NODE_ENV !== "production") {
                console.warn("[advisor/stream] skip malformed JSON line");
              }
              return;
            }
              if (data.type === "meta") {
                setRuntimeMeta(data);
                setConversationId(data.conversationId);
                if (data.runtime === "m-mkt") resolvedForceAgent = "m-mkt";
                else if (data.runtime === "m-pnt") resolvedForceAgent = "m-pnt";
                else if (data.runtime === "m-ed") resolvedForceAgent = "m-ed";
                else if (data.runtime === "chief") resolvedForceAgent = "chief";
                setAgentStateDescription(
                  data.runtime === "m-pnt"
                    ? "品牌顾问正在结合定位与项目记忆推进本轮判断"
                    : data.runtime === "m-mkt"
                      ? "市场顾问正在评估进入概率与竞争格局"
                      : data.runtime === "m-ed"
                        ? "组织顾问正在评估控制权与承接能力"
                        : data.fallback
                          ? "系统正在根据已有资料继续形成经营判断"
                          : "商业顾问正在结合项目记忆推进本轮判断",
                );
                if (data.runtime === "m-pnt") {
                  setAgentReferences(["品牌定位", "项目记忆", "历史决策"]);
                }
                if (data.assetCount > 0) {
                  setAgentReferences((prev) => (prev.includes("上传资料") ? prev : ["上传资料", ...prev].slice(0, 4)));
                }
              }
              if (data.type === "text") {
                setAgentState("reasoning");
                setAgentStateDescription("AI 正在形成这轮会议判断");
                accumulated += data.content;
                setStreamingText(accumulated);
              }
              if (data.type === "error") {
                accumulated += `\n\n❌ ${data.message}`;
                setStreamingText(accumulated);
              }
              if (data.type === "tool_start") {
                setAgentState("researching");
                setAgentStateDescription(`正在参考：${data.toolName}`);
                setAgentReferences((prev) => {
                  const label = `工具 ${data.toolName}`;
                  return prev.includes(label) ? prev : [...prev, label].slice(-4);
                });
                accumulated += `\n\n🔍 正在分析: ${data.toolName}...`;
                setStreamingText(accumulated);
              }
              if (data.type === "market_result" && data.data) {
                setLiveMarketSnapshot(data.data);
              }
              if (data.type === "equity_result" && data.data) {
                setLiveEquitySnapshot(data.data);
              }
              if (data.type === "positioning_result" && data.data) {
                setLivePositioningSnapshot(data.data);
              }
          },
          { signal: abort.signal },
        );
      } finally {
        window.clearTimeout(streamTimeout);
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }

      // 完成流式输出
      if (accumulated) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: accumulated },
        ]);

        // 会议桌已开启时：把 stream 收成顾问发言（会议纪要，非纯聊天）
        if (topicConfirmedRef.current) {
          const round = Math.min(
            3,
            Math.max(1, deliberationRoundRef.current || 2),
          ) as 1 | 2 | 3;
          const statement = statementFromAgentStream({
            forceAgent: resolvedForceAgent,
            content: accumulated,
            round,
            topic: topicForRoute,
          });
          setLiveStatements((prev) => [...prev, statement]);
          setMeetingLifecycle("DEBATE");
          if (deliberationRoundRef.current < 2) {
            setDeliberationRound(2);
          }
          setAgentStateDescription("顾问补充判断已写入会议纪要");
        }
      }
      setAgentState("completed");
      if (!topicConfirmedRef.current) {
        setAgentStateDescription("本次会议判断已完成，可以继续追问或进入报告");
      }
      setSelectedAssetIds([]);

      // 刷新关键数据（收敛无效化，避免级联风暴）
      await Promise.all([
        utils.project.getById.invalidate({ id: params.projectId }),
        utils.dashboard.getAdvisorWorkspace.invalidate({ projectId: params.projectId }),
        utils.dashboard.getHome.invalidate(),
        utils.asset.list.invalidate({ projectId: params.projectId, limit: 12 }),
        utils.agent.latestPositioning.invalidate({ projectId: params.projectId }),
        utils.agent.latestMarket.invalidate({ projectId: params.projectId }),
        utils.agent.latestEquity.invalidate({ projectId: params.projectId }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setAgentState("completed");
        setAgentStateDescription("已取消本轮分析");
      } else {
      setAgentState("completed");
      setAgentStateDescription("这次分析被中断，你可以继续补充问题让我重新判断");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `出错了: ${error instanceof Error ? error.message : "未知错误"}`,
        },
      ]);
      }
    } finally {
      if (streamAbortRef.current?.signal.aborted === false) {
        /* keep controller until next send */
      }
      setStreaming(false);
      setStreamingText("");
    }
  }, [
    conversationId,
    input,
    streaming,
    data?.currentProject?.id,
    data?.workspace?.currentProblem,
    params.projectId,
    selectedAssetIds,
    assetLibrary,
    utils,
    reviewIntent,
    meetingTopic,
    searchParams,
  ]);

  // Deep-link from Decisions / Today / 部门看板：载入议题，部门入口可自动进入会议桌
  useEffect(() => {
    if (deepLinkConsumedRef.current) return;
    // 等草稿查询完成，避免与恢复逻辑抢写 topic
    if (savedMeetingDraft === undefined) return;

    const topic = searchParams?.get("topic");
    const dept = searchParams?.get("dept");
    if (!topic?.trim() && !dept) {
      deepLinkConsumedRef.current = true;
      return;
    }

    // 有未完成草稿且议题冲突时，交给冲突横幅处理
    if (
      savedMeetingDraft?.topicConfirmed &&
      topic?.trim() &&
      topic.trim() !== savedMeetingDraft.topic
    ) {
      deepLinkConsumedRef.current = true;
      return;
    }

    // 无冲突草稿已恢复时，不再用 deep link 覆盖
    if (savedMeetingDraft?.topicConfirmed && (!topic?.trim() || topic.trim() === savedMeetingDraft.topic)) {
      deepLinkConsumedRef.current = true;
      return;
    }

    deepLinkConsumedRef.current = true;

    if (topic?.trim()) {
      setMeetingTopic(topic.trim());
      setInput("");
    }

    setAgentState("completed");
    setAgentStateDescription(
      searchParams?.get("intent") === "positioning_review"
        ? "已载入定位变更复审议题"
        : dept
          ? "已从部门看板进入顾问咨询，请确认议题后开始独立判断"
          : "已从入口载入议题",
    );
    setAgentReferences(["部门上下文", "项目记忆", "历史判断"]);

    if (searchParams?.get("autoSend") === "1" && topic?.trim()) {
      const t = window.setTimeout(() => {
        void handleSend(topic);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [searchParams, handleSend, savedMeetingDraft]);

  const resolveReview = trpc.decisionArchive.resolveReview.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.reviewQueue.invalidate({ projectId: params.projectId });
      void utils.decisionArchive.stats.invalidate({ projectId: params.projectId });
      void utils.dashboard.getHome.invalidate();
    },
  });

  const confirmFromMeeting = trpc.decisionArchive.confirmFromMeeting.useMutation({
    onSuccess: (result) => {
      setAcceptedDecisionId(result.decisionId);
      setAcceptedGrowthPlan(result.growthPlan ?? null);
      setAcceptedValidationTask(
        result.validationTask
          ? {
              id: result.validationTask.id,
              title: result.validationTask.title,
              objective: result.validationTask.objective,
              owner: result.validationTask.owner,
              horizonDays: result.validationTask.horizonDays,
              metrics: (result.validationTask.metrics ?? []).map((m) => ({
                id: m.id,
                label: m.label,
                target: m.target,
              })),
              status: result.validationTask.status,
            }
          : null,
      );
      setMeetingLifecycle("DECISION");
      clearLifecycleTimers();
      lifecycleTimersRef.current.push(
        window.setTimeout(() => setMeetingLifecycle("VALIDATE"), 450),
        window.setTimeout(() => setMeetingLifecycle("MEMORY_UPDATE"), 1100),
      );
      clearMeetingSession.mutate({ projectId: params.projectId });
      void utils.decisionArchive.list.invalidate({ projectId: params.projectId });
      void utils.decisionArchive.stats.invalidate({ projectId: params.projectId });
      void utils.dashboard.getHome.invalidate();
      void utils.dashboard.getAdvisorWorkspace.invalidate({ projectId: params.projectId });
      void utils.meetingSession.get.invalidate({ projectId: params.projectId });
      void utils.validationOs.listActive.invalidate({ projectId: params.projectId });
    },
  });

  const startFounderMeeting = trpc.founder.startMeeting.useMutation();
  const advanceFounderRound = trpc.founder.advanceRound.useMutation();

  const deleteAsset = trpc.asset.delete.useMutation({
    onSuccess: () => {
      void utils.asset.list.invalidate({ projectId: params.projectId, limit: 12 });
    },
  });

  // 迷你反馈：在 AI 回复后直接提供一键反馈
  const [miniFeedbackState, setMiniFeedbackState] = useState<Record<string, "sent" | "error">>({});
  const handleMiniFeedback = useCallback(async (messageId: string, helpful: boolean) => {
    if (miniFeedbackState[messageId]) return;
    setMiniFeedbackState(prev => ({ ...prev, [messageId]: "sent" }));
    // 反馈已记录，UI 上显示提示
    setTimeout(() => {
      setMiniFeedbackState(prev => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }, 3000);
  }, [miniFeedbackState]);

  const activateFounderMeetingFromRuntime = useCallback(
    (input: {
      runtime: FounderLoopRuntime;
      synthesis?: {
        judgement: string;
        reasons: string[];
        validationPlan: string;
      };
    }) => {
      const seatMap = new Map(
        getFounderSeatsForAgents(input.runtime.decisions.map((decision) => decision.sourceAgent)).map((seat) => [
          seat.roleId.replace("founder.", ""),
          seat,
        ]),
      );

      const statements: ExpertStatement[] = input.runtime.decisions.map((decision) => {
        const seat = seatMap.get(decision.sourceAgent);
        const stance: ExpertStatement["stance"] =
          decision.stance === "support" ||
          decision.stance === "oppose" ||
          decision.stance === "conditional"
            ? decision.stance
            : "neutral";
        return {
          id: decision.decisionId,
          roleId: seat?.roleId ?? `founder.${decision.sourceAgent}`,
          displayName: seat?.displayName ?? decision.sourceAgent,
          round: 1,
          stance,
          claim: decision.judgement,
          reasons:
            decision.evidence.length > 0
              ? decision.evidence.map((item) => `${item.label}：${item.content}`).slice(0, 3)
              : decision.nextSteps.slice(0, 2),
          evidence: decision.evidence
            .filter((item) => item.evidenceId && item.content)
            .slice(0, 4)
            .map((item) => ({
              evidenceId: item.evidenceId!,
              statement: item.content,
              sourceLabel: item.source || item.label,
            })),
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          validation: decision.validation || decision.nextSteps[0],
          evidenceSufficient: decision.evidenceSufficient,
          evidenceGap: decision.evidenceGap,
        };
      });

      const firstConflict = input.runtime.meeting.conflicts[0];
      const synthesis = input.synthesis ?? {
        judgement:
          input.runtime.finalDecision.reason[0] ||
          input.runtime.meeting.recommendation ||
          `${input.runtime.finalDecision.chosen}：${input.runtime.finalDecision.problem}`,
        reasons: input.runtime.finalDecision.reason,
        validationPlan:
          input.runtime.finalDecision.validationPlan.join("；") ||
          "先完成关键验证，再决定是否放大动作。",
      };

      setMeetingTopic(input.runtime.mission.question);
      setTopicConfirmed(true);
      setMeetingLifecycle("DISCUSS");
      setDeliberationRound(1);
      setLiveStatements(statements);
      setLiveConflict(
        firstConflict
          ? {
              id: firstConflict.conflictId,
              issue: firstConflict.summary,
              positionA: firstConflict.sideA,
              positionB: firstConflict.sideB,
              conflictLabel: firstConflict.dimension,
            }
          : null,
      );
      setLiveConsensus(null);
      setLiveOptions([]);
      setSelectedOptionId(null);
      setFocusChoice(null);
      setAcceptedDecisionId(null);
      setAcceptedGrowthPlan(null);
      setAcceptedValidationTask(null);
      setServerSynthesis(synthesis);
      setMeetingRuntime({
        meeting: {
          recommendation: input.runtime.meeting.recommendation,
          conflicts: input.runtime.meeting.conflicts.map((c) => ({
            conflictId: c.conflictId,
            summary: c.summary,
            sideA: c.sideA,
            sideB: c.sideB,
            dimension: c.dimension,
            agents: [...c.agents],
            drivingEvidenceIds: c.drivingEvidenceIds,
          })),
          rounds: input.runtime.meeting.rounds.map((r) => ({
            round: r.round,
            title: r.title,
            items: r.items.map((item) => ({
              agent: item.agent,
              summary: item.summary,
              stance: item.stance,
              challengeTo: item.challengeTo,
              challengeEvidenceId: item.challengeEvidenceId,
            })),
          })),
          conflictMatrix: input.runtime.meeting.conflictMatrix
            ? {
                rows: input.runtime.meeting.conflictMatrix.rows.map((row) => ({
                  topic: row.topic,
                  cells: row.cells as Record<string, string>,
                  summary: row.summary,
                  drivingEvidenceIds: row.drivingEvidenceIds,
                })),
                primary: input.runtime.meeting.conflictMatrix.primary
                  ? {
                      topic: input.runtime.meeting.conflictMatrix.primary.topic,
                      sideA: {
                        agents: [
                          ...input.runtime.meeting.conflictMatrix.primary.sideA.agents,
                        ],
                        claim: input.runtime.meeting.conflictMatrix.primary.sideA.claim,
                      },
                      sideB: {
                        agents: [
                          ...input.runtime.meeting.conflictMatrix.primary.sideB.agents,
                        ],
                        claim: input.runtime.meeting.conflictMatrix.primary.sideB.claim,
                      },
                      drivingEvidenceIds:
                        input.runtime.meeting.conflictMatrix.primary.drivingEvidenceIds,
                      question: input.runtime.meeting.conflictMatrix.primary.question,
                    }
                  : null,
                tradeoffs: input.runtime.meeting.conflictMatrix.tradeoffs,
              }
            : undefined,
          debateSession: input.runtime.meeting.debateSession
            ? {
                debateId: input.runtime.meeting.debateSession.debateId,
                status: input.runtime.meeting.debateSession.status,
                conflicts: input.runtime.meeting.debateSession.conflicts.map((c) => ({
                  conflictId: c.conflictId,
                  topic: c.topic,
                  severity: c.severity,
                  committees: [...c.committees],
                  evidenceRefs: [...c.evidenceRefs],
                  summary: c.summary,
                })),
                challenges: input.runtime.meeting.debateSession.challenges.map((ch) => ({
                  challengeId: ch.challengeId,
                  fromCommittee: ch.fromCommittee,
                  fromAgent: ch.fromAgent,
                  targetCommittee: ch.targetCommittee,
                  targetAgent: ch.targetAgent,
                  challengeType: ch.challengeType,
                  statement: ch.statement,
                  evidenceRefs: ch.evidenceRefs,
                })),
                proposal: input.runtime.meeting.debateSession.proposal
                  ? {
                      decision: input.runtime.meeting.debateSession.proposal.decision,
                      whyNow: input.runtime.meeting.debateSession.proposal.whyNow,
                      tradeoffs: [...input.runtime.meeting.debateSession.proposal.tradeoffs],
                      conditions: [...input.runtime.meeting.debateSession.proposal.conditions],
                      risksAccepted: [
                        ...input.runtime.meeting.debateSession.proposal.risksAccepted,
                      ],
                      validationPlan:
                        input.runtime.meeting.debateSession.proposal.validationPlan,
                    }
                  : undefined,
                scenarioTests: input.runtime.meeting.debateSession.scenarioTests.map((sc) => ({
                  scenarioId: sc.scenarioId,
                  scenario: sc.scenario,
                  trigger: sc.trigger,
                  impact: sc.impact,
                  mitigation: sc.mitigation,
                })),
              }
            : undefined,
        },
        decisions: input.runtime.decisions.map((d) => ({
          decisionId: d.decisionId,
          sourceAgent: d.sourceAgent,
          judgement: d.judgement,
          stance: d.stance,
          risks: d.risks,
          nextSteps: d.nextSteps,
          evidence: d.evidence.map((item) => ({
            evidenceId: item.evidenceId,
            label: item.label,
            content: item.content,
            source: item.source,
          })),
          reasoning: d.reasoning,
          validation: d.validation,
          evidenceSufficient: d.evidenceSufficient,
          evidenceGap: d.evidenceGap,
          confidence: d.confidence,
        })),
        finalDecision: {
          chosen: input.runtime.finalDecision.chosen,
          problem: input.runtime.finalDecision.problem,
          reason: input.runtime.finalDecision.reason,
          validationPlan: input.runtime.finalDecision.validationPlan,
          evidenceStatus: input.runtime.finalDecision.evidenceStatus,
          contract: input.runtime.finalDecision.contract
            ? (input.runtime.finalDecision.contract as unknown as Record<string, unknown>)
            : undefined,
        },
      });
      setDeliberating(false);
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const launchFounderMeeting = useCallback(
    (inputTopic: string, spendCost?: number, spendKind?: SpendKind) => {
      setSpendConfirmOpen(false);
      setSpendError(null);
      setMeetingEngineNote(null);
      setSpendReceipt(null);
      setMeetingTopic(inputTopic);
      setTopicConfirmed(true);
      setMeetingLifecycle("PREPARE");
      setDeliberationRound(0);
      setLiveStatements([]);
      setLiveConflict(null);
      setLiveConsensus(null);
      setLiveOptions([]);
      setSelectedOptionId(null);
      setServerSynthesis(null);
      setMeetingRuntime(null);
      setDeliberating(true);

      const kind =
        spendKind ||
        spendConfirmOfferKind ||
        (searchParams?.get("spend") as SpendKind | null) ||
        "council";

      startFounderMeeting.mutate(
        {
          projectId: params.projectId,
          question: inputTopic,
          topic: inputTopic,
          assetIds: selectedAssetIds,
          spendKind: kind,
        },
        {
          onSuccess: (payload) => {
            activateFounderMeetingFromRuntime({
              runtime: payload.runtime,
              synthesis: payload.synthesis,
            });
            const gate = (
              payload as {
                engineGate?: {
                  note?: string | null;
                  degradedSeats?: number;
                  ok?: boolean;
                };
              }
            ).engineGate;
            if (gate?.note) {
              setMeetingEngineNote(gate.note);
            } else if (gate && gate.degradedSeats && gate.degradedSeats > 0) {
              setMeetingEngineNote(
                `本场有 ${gate.degradedSeats} 个席位降级，不能当作引擎已完成。`,
              );
            } else {
              setMeetingEngineNote(null);
            }
            if (payload.billing?.spent != null && payload.billing.balanceAfter != null) {
              setSpendReceipt({
                spent: payload.billing.spent,
                balanceAfter: payload.billing.balanceAfter,
              });
            }
            void reloadWallet();
          },
          onError: (err) => {
            setMeetingLifecycle("OPEN");
            setTopicConfirmed(false);
            setDeliberating(false);
            setSpendConfirmOpen(true);
            setMeetingEngineNote(null);
            const msg = err?.message || "启动失败";
            setSpendError(msg);
            if (
              typeof spendCost === "number" &&
              spendCost > 0 &&
              !msg.includes("经营点不足")
            ) {
              setRefundPoints(spendCost);
            }
            void reloadWallet();
          },
        },
      );
    },
    [
      activateFounderMeetingFromRuntime,
      params.projectId,
      reloadWallet,
      searchParams,
      selectedAssetIds,
      spendConfirmOfferKind,
      startFounderMeeting,
    ],
  );

  useEffect(() => {
    const topic = searchParams?.get("topic")?.trim();
    const wantsConfirm =
      searchParams?.get("confirm") === "1" || searchParams?.get("autoStart") === "1";
    if (!topic || !wantsConfirm) return;
    if (autoStartTriggeredRef.current) return;
    if (draftConflict) return;
    if (topicConfirmed && deliberationRound > 0) return;
    if (
      savedMeetingDraft?.topicConfirmed &&
      savedMeetingDraft.topic !== topic
    ) {
      return;
    }

    autoStartTriggeredRef.current = true;
    setMeetingTopic(topic);
    const spendParam = searchParams?.get("spend") as SpendKind | null;
    if (spendParam) setSpendConfirmOfferKind(spendParam);
    setSpendConfirmOpen(true);
  }, [
    searchParams,
    draftConflict,
    topicConfirmed,
    deliberationRound,
    savedMeetingDraft,
  ]);

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="顾问咨询"
        title="正在准备…"
        description="读取议题与证据。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="顾问咨询"
          title="顾问咨询暂时打不开"
          description="上下文还在同步，稍后再试。"
          primaryAction={{
            href: `/projects/${params.projectId}/agent`,
            label: "回对话",
          }}
          secondaryAction={{
            href: `/projects/${params.projectId}/decision-room`,
            label: "去拍板",
          }}
        />
      </div>
    );
  }

  if (!data?.currentProject || !data?.workspace) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="顾问咨询"
          title="还进不了这场咨询"
          description="先回对话，再从决策室或专业能力进入。"
          primaryAction={{
            href: `/projects/${params.projectId}/agent`,
            label: "回对话",
          }}
          secondaryAction={{ href: "/projects", label: "企业" }}
        />
      </div>
    );
  }

  const project = data.currentProject;
  const workspace = data.workspace;
  const consultantJudgements = workspace.consultantJudgements ?? [];
  const meetingDecision = workspace.meetingDecision;
  const decisionNextStep = workspace.decisionNextStep;
  const knownFacts = workspace.knownFacts ?? [];
  const brandFacts = brands?.activeBrand
    ? [
        `品牌：${brands.activeBrand.brandName}`,
        brands.activeBrand.category
          ? `品类：${brands.activeBrand.category}`
          : null,
        brands.activeBrand.mentalPosition
          ? `心智定位：${brands.activeBrand.mentalPosition}`
          : null,
      ].filter(Boolean) as string[]
    : [];
  /** 用当前品牌覆盖工作区里可能过期的「品类/品牌」事实行；店访一手事实始终置顶 */
  const syncedKnownFacts = (() => {
    const isVisit = (f: string) => f.includes("【店访") || f.startsWith("【一手");
    const visitFacts = knownFacts.filter(isVisit);
    const withoutVisit = knownFacts.filter((f) => !isVisit(f));
    if (!brandFacts.length) return [...visitFacts, ...withoutVisit];
    const stripped = withoutVisit.filter(
      (f) => !f.startsWith("品牌：") && !f.startsWith("品类：") && !f.startsWith("心智定位："),
    );
    const rest = stripped.filter(
      (f) => f.startsWith("项目：") || f.startsWith("阶段：") || f.startsWith("城市：") || f.startsWith("历史决策：") || f.startsWith("经营挑战：") || f.startsWith("年度目标："),
    );
    const other = stripped.filter((f) => !rest.includes(f));
    return [...visitFacts, ...brandFacts, ...rest, ...other];
  })();
  const challenge = workspace.challenge ?? consultantJudgements[0] ?? "这次判断仍需要更多反方验证。";
  const kickoffQuestions = workspace.kickoffQuestions ?? [];
  const finalizeDecisionPrompt =
    "请把这次会议正式收束成一条经营决策，包含最终判断、关键依据、主要风险、执行动作和复盘点。";
  const actionPrompts = workspace.actionPrompts ?? [];
  const primaryComposerPrompts = actionPrompts.slice(0, 3);

  const topic =
    meetingTopic ??
    (searchParams?.get("topic")?.trim() || workspace.currentProblem);
  const deptParam = searchParams?.get("dept") as MeetingDepartment | null;
  const department =
    deptParam && DEPARTMENT_MEETING_TITLE[deptParam]
      ? deptParam
      : detectDepartmentFromTopic(topic);
  const meetingTitle = DEPARTMENT_MEETING_TITLE[department];
  const experts = meetingRuntime
    ? getFounderSeatsForAgents(meetingRuntime.decisions.map((d) => d.sourceAgent))
    : getExpertsForDepartment(department);
  const mergedFacts = [...syncedKnownFacts, ...extraFacts];
  const unknownGaps = (
    kickoffQuestions.length > 0
      ? kickoffQuestions.slice(0, 4)
      : ["关键限制条件待补充", "验证指标待确认", "资源约束待对齐"]
  ).filter((gap) => !extraFacts.some((f) => f.includes(gap) || gap.includes(f)));

  const seedInput = {
    topic,
    department,
    judgements: consultantJudgements,
    meetingDecision,
    decisionNextStep,
    challenge,
    knownFacts: mergedFacts,
  };

  const statements =
    liveStatements.length > 0
      ? liveStatements
      : ([] as ExpertStatement[]);
  const conflict =
    liveConflict ||
    (deliberationRound >= 2 ? detectConflict(topic, statements, challenge) : null);
  const consensus =
    liveConsensus ||
    (deliberationRound >= 3
      ? buildConsensusDraft(seedInput)
      : null);
  const decisionCard =
    acceptedDecisionId || meetingLifecycle === "DECISION" || meetingLifecycle === "VALIDATE"
      ? toDecisionCard(topic, consensus || buildConsensusDraft(seedInput))
      : null;

  const handleConfirmTopic = () => {
    setSpendError(null);
    setSpendConfirmOpen(true);
  };

  const activeSpendOffer =
    (spendConfirmOfferKind ? spendOfferForKind(spendConfirmOfferKind) : null) ||
    spendOfferForDepartment(department);

  const handleAdvanceRound = () => {
    // Round1 已由 Founder Gateway 写入时，直接进入挑战回合
    if (deliberationRound === 0 && liveStatements.some((s) => s.round === 1)) {
      setDeliberationRound(1);
      setMeetingLifecycle("DISCUSS");
      return;
    }
    const nextRound = (Math.min(3, deliberationRound + 1) || 1) as DeliberationRound;
    setDeliberating(true);

    const applyResult = (result: {
      round: DeliberationRound;
      statements: ExpertStatement[];
      conflict: MeetingConflict | null;
      consensus: ConsensusDraft | null;
      options: DecisionOption[];
    }) => {
      setDeliberationRound(result.round);
      setLiveStatements(result.statements);
      if (result.conflict) setLiveConflict(result.conflict);
      if (result.consensus) setLiveConsensus(result.consensus);
      if (result.options.length) setLiveOptions(result.options);
      if (nextRound === 1) setMeetingLifecycle("DISCUSS");
      if (nextRound === 2) setMeetingLifecycle("DEBATE");
      if (nextRound === 3) {
        setMeetingLifecycle("SYNTHESIS");
        lifecycleTimersRef.current.push(
          window.setTimeout(() => setMeetingLifecycle("USER_CONFIRM"), 400),
        );
      }
      setDeliberating(false);
    };

    if (meetingRuntime && (nextRound === 2 || nextRound === 3)) {
      advanceFounderRound.mutate(
        {
          projectId: params.projectId,
          round: nextRound,
          topic,
          focusChoice,
          previous: liveStatements,
          runtime: meetingRuntime,
        },
        {
          onSuccess: (result) => applyResult(result),
          onError: () => {
            const fallback = runDeliberationRound({
              round: nextRound,
              department,
              topic,
              knownFacts: mergedFacts,
              focusChoice,
              previous: liveStatements,
              seed: seedInput,
            });
            applyResult(fallback);
          },
        },
      );
      return;
    }

    lifecycleTimersRef.current.push(
      window.setTimeout(() => {
      applyResult(
        runDeliberationRound({
          round: nextRound,
          department,
          topic,
          knownFacts: mergedFacts,
          focusChoice,
          previous: liveStatements,
          seed: seedInput,
        }),
      );
    }, 450),
    );
  };

  const handleEditTopic = () => {
    setShowTranscript(true);
    setInput(`请把议题修改为：${topic}`);
  };

  const handleChooseFocus = (value: string) => {
    setFocusChoice(value);
    // 若已在 Round2，选完关注方向后自动收口
    if (deliberationRound === 2) {
      setDeliberating(true);
      if (meetingRuntime) {
        advanceFounderRound.mutate(
          {
            projectId: params.projectId,
            round: 3,
            topic,
            focusChoice: value,
            previous: liveStatements,
            runtime: meetingRuntime,
          },
          {
            onSuccess: (result) => {
              setDeliberationRound(3);
              setLiveStatements(result.statements);
              if (result.conflict) setLiveConflict(result.conflict);
              if (result.consensus) setLiveConsensus(result.consensus);
              if (result.options.length) setLiveOptions(result.options);
              setMeetingLifecycle("USER_CONFIRM");
              setDeliberating(false);
            },
            onError: () => {
              const result = runDeliberationRound({
                round: 3,
                department,
                topic,
                knownFacts: mergedFacts,
                focusChoice: value,
                previous: liveStatements,
                seed: seedInput,
              });
              setDeliberationRound(3);
              setLiveStatements(result.statements);
              if (result.conflict) setLiveConflict(result.conflict);
              if (result.consensus) setLiveConsensus(result.consensus);
              if (result.options.length) setLiveOptions(result.options);
              setMeetingLifecycle("USER_CONFIRM");
              setDeliberating(false);
            },
          },
        );
        return;
      }
      lifecycleTimersRef.current.push(
        window.setTimeout(() => {
        const result = runDeliberationRound({
          round: 3,
          department,
          topic,
          knownFacts: mergedFacts,
          focusChoice: value,
          previous: liveStatements,
          seed: seedInput,
        });
        setDeliberationRound(3);
        setLiveStatements(result.statements);
        if (result.conflict) setLiveConflict(result.conflict);
        if (result.consensus) setLiveConsensus(result.consensus);
        if (result.options.length) setLiveOptions(result.options);
        setMeetingLifecycle("USER_CONFIRM");
        setDeliberating(false);
      }, 450),
      );
      return;
    }
    setMeetingLifecycle("SYNTHESIS");
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    const opt = liveOptions.find((o) => o.id === optionId);
    if (opt && liveConsensus) {
      setLiveConsensus({
        ...liveConsensus,
        summary: opt.summary,
        proposedDecision: opt.summary,
        nextActions: resolveNextActionsForOption(opt, {
          nextActions: liveConsensus.nextActions,
          validationPlan: liveConsensus.validationPlan,
        }),
      });
    }
  };

  const handleSupplementFact = (gap: string) => {
    setShowTranscript(true);
    setInput(`补充事实：关于「${gap}」，情况是：`);
    setExtraFacts((prev) => (prev.includes(`已开始补充：${gap}`) ? prev : [...prev, `已开始补充：${gap}`]));
  };

  const handleContinueDiscuss = () => {
    setMeetingLifecycle("DEBATE");
    setDeliberationRound(2);
    setShowTranscript(true);
    setInput("我想继续讨论刚才的分歧，请各方再给出一轮判断。");
  };

  const handleModify = () => {
    setShowTranscript(true);
    setInput("请根据我的意见修改当前共识方案：");
  };

  const handleAccept = () => {
    const draft = consensus || liveConsensus;
    if (!draft) return;
    void (async () => {
    const selected = liveOptions.find((o) => o.id === selectedOptionId);
    const parentEvidenceIds = [
      ...new Set(
        statements
          .flatMap((s) => s.evidence ?? [])
          .map((e) => e.evidenceId)
          .filter(Boolean),
      ),
    ].slice(0, 24);
    const evidenceOk =
      meetingRuntime?.finalDecision?.evidenceStatus === "sufficient" ||
      parentEvidenceIds.length >= 2;
    let allowInsufficientEvidence = false;
    if (!evidenceOk) {
      const ok = await requestConfirm({
        title: "证据不足，只能假设推进",
        description:
          "当前证据不足 2 条，不能当作正式拍板。确认后将以「假设推进」归档。",
      });
      if (!ok) return;
      allowInsufficientEvidence = true;
    }
    const nextActions = (
      draft.nextActions?.length
        ? draft.nextActions
        : [decisionNextStep || "按验证计划推进"]
    )
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 4);
    const payload = {
      projectId: params.projectId,
      problem: topic,
      judgement: selected?.summary || draft.proposedDecision,
      diagnosis: challenge,
      observation: `会议议题：${topic}`,
      strategy: draft.summary,
      action: nextActions[0] || "按验证计划推进",
      nextActions,
      validationPlan:
        draft.validationPlan ||
        serverSynthesis?.validationPlan ||
        "先完成关键验证，再决定是否放大动作。",
      supportClaims: statements
        .filter((s) => s.stance === "support" || s.stance === "conditional")
        .map((s) => s.claim),
      opposeClaims: statements.filter((s) => s.stance === "oppose").map((s) => s.claim),
      expertOpinions: (meetingRuntime?.decisions || [])
        .map((d) => {
          const expert =
            d.sourceAgent === "M-PNT" ||
            d.sourceAgent === "M-MKT" ||
            d.sourceAgent === "M-BIZ" ||
            d.sourceAgent === "M-ED"
              ? d.sourceAgent
              : null;
          if (!expert) return null;
          const position =
            d.stance === "support"
              ? ("support" as const)
              : d.stance === "oppose"
                ? ("oppose" as const)
                : ("neutral" as const);
          return {
            expert,
            position,
            reason: (d.judgement || "").slice(0, 400),
            confidence:
              typeof d.confidence === "number" ? d.confidence : 0.7,
          };
        })
        .filter(
          (
            x,
          ): x is {
            expert: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
            position: "support" | "oppose" | "neutral";
            reason: string;
            confidence: number;
          } => Boolean(x && x.reason),
        )
        .slice(0, 8),
      focusChoice: focusChoice ?? undefined,
      meetingTitle,
      parentEvidenceIds,
      evidenceSufficient: evidenceOk,
      allowInsufficientEvidence,
      decisionContract: meetingRuntime?.finalDecision.contract,
    };
      try {
        await confirmFromMeeting.mutateAsync(payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const match = msg.match(/supersedesDecisionId=([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          const ok = await requestConfirm({
            title: "以修订案覆盖旧判断？",
            description: `同题已有未归档旧判断（${match[1]}）。确认后将覆盖旧案并归档新判断。`,
          });
          if (!ok) return;
          await confirmFromMeeting.mutateAsync({
            ...payload,
            supersedesDecisionId: match[1],
          });
          return;
        }
        throw err;
      }
    })();
  };

  const allMessages = [
    ...messages,
    ...(streaming && streamingText
      ? [{ id: "streaming", role: "assistant" as const, content: streamingText }]
      : []),
    ...(streaming && !streamingText
      ? [{ id: "loading", role: "assistant" as const, content: "⏳ AI 正在思考..." }]
      : []),
  ];
  const meetingRecordSection = (
    <section className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white p-3 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">记录</p>
          <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
            会商记录
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/decisions`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-3 py-2 text-[13px] font-medium text-[#202124]"
          >
            <History className="h-4 w-4" />
            去跟进
          </Link>
          <button
            type="button"
            onClick={() => setShowMeetingHistory((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] font-medium text-[#202124]"
          >
            会商历史
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allMessages.length === 0 ? (
        <div className="mt-4 min-h-[40dvh] rounded-[12px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] px-4 py-8 text-center md:mt-5 md:min-h-[48vh] md:py-10">
          <p className="font-display text-[18px] font-semibold leading-7 text-[#202124]">
            会议还没有进入正式讨论
          </p>
          <p className="mt-2 text-[15px] leading-7 text-[#3a3d41]">先补充，再继续。</p>
        </div>
      ) : (
        <div
          className="mt-4 min-h-[40dvh] overscroll-contain space-y-2 md:min-h-[48vh] md:space-y-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="会商记录消息"
        >
          {allMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="w-full max-w-[92%] md:max-w-[90%]">
                <div
                  className={`rounded-[16px] px-4 py-3 text-[15px] leading-7 ${
                    msg.role === "user"
                      ? "border border-[rgba(24,24,23,0.08)] bg-[#181817] text-white"
                      : "border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] text-[#202124]"
                  }`}
                >
                  <p
                    className={`text-[11px] tracking-[0.08em] ${
                      msg.role === "user" ? "text-white/70" : "text-[#6f747b]"
                    }`}
                  >
                    {msg.role === "user" ? "你" : "AI"}
                  </p>
                  {msg.role === "assistant" ? (
                    <LightMarkdown
                      text={msg.content}
                      className="mt-2 space-y-2 text-[15px] leading-7 text-[#202124]"
                    />
                  ) : (
                    <div className="mt-2 whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                {msg.role === "assistant" && msg.id !== "welcome" && msg.id !== "loading" && msg.id !== "streaming" ? (
                  <div className="mt-1 space-y-1 px-2">
                    <div className="flex items-center gap-2">
                      {miniFeedbackState[msg.id] === "sent" ? (
                        <span className="text-[13px] text-[#66735E]">感谢反馈 ✓</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleMiniFeedback(msg.id, true)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-[12px] px-3 py-2 text-[13px] text-[#6f747b] transition active:scale-[0.98] hover:bg-[#F5F3EE] hover:text-[#66735E]"
                            title="这个分析有帮助"
                            aria-label="这个分析有帮助"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            有帮助
                          </button>
                          <button
                            onClick={() => handleMiniFeedback(msg.id, false)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-[12px] px-3 py-2 text-[13px] text-[#6f747b] transition active:scale-[0.98] hover:bg-[#F5F3EE] hover:text-[#B47C5C]"
                            title="这个分析不准确"
                            aria-label="这个分析不准确"
                          >
                            <ThumbsDown className="h-4 w-4" />
                            不准确
                          </button>
                          <button
                            onClick={() => {
                              const actionLines = msg.content.split('\n').filter(l => l.trim() && !l.startsWith('##') && !l.startsWith('---'));
                              const lastAction = actionLines[actionLines.length - 1] || msg.content.slice(0, 100);
                              saveAdvisorLocalAction(msg.id, lastAction);
                              setMiniFeedbackState(prev => ({ ...prev, [`action_${msg.id}`]: "sent" as "sent" | "error" }));
                              setTimeout(() => setMiniFeedbackState(prev => {
                                const next = { ...prev };
                                delete next[`action_${msg.id}`];
                                return next;
                              }), 4000);
                            }}
                            className="inline-flex min-h-11 items-center gap-1 rounded-[12px] px-3 py-2 text-[13px] text-[#66735E] transition active:scale-[0.98] hover:bg-[#EEF1EA] hover:text-[#202124]"
                            title="先记在本机（临时，不会同步到云端）"
                            aria-label="把这个建议先记在本机"
                          >
                            <Target className="h-4 w-4" />
                            我要做这个
                          </button>
                        </>
                      )}
                    </div>
                    {miniFeedbackState[`action_${msg.id}`] === "sent" ? (
                      <p className="text-[11px] text-[#66735E] flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        已记在本机（临时，换设备不同步）
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </section>
  );

  return (
    <div className="mx-auto flex h-[var(--advisor-vvh,100dvh)] max-h-[var(--advisor-vvh,100dvh)] max-w-4xl flex-col md:max-w-5xl">
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="确认继续"
        danger
        busy={confirmFromMeeting.isPending}
        onCancel={() => settleConfirm(false)}
        onConfirm={() => settleConfirm(true)}
      />
      <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.98)] px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:px-4">
        <Link
          href={`/projects/${params.projectId}/agent`}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-2.5 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
          aria-label="回对话"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>回对话</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#202124]">顾问咨询</p>
          <p className="truncate text-[11px] tracking-[0.08em] text-[#6f747b]">
            拍板请用决策室
          </p>
        </div>
        <Link
          href={`/projects/${params.projectId}/decision-room`}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-[12px] px-3 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
        >
          决策室
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-6">
        <div className="space-y-4 md:space-y-5">
          {refundPoints !== null ? (
            <SpendRefundNotice
              points={refundPoints}
              onClose={() => setRefundPoints(null)}
            />
          ) : null}

          {meetingEngineNote ? (
            <EngineDegradationBanner
              mode="heuristic"
              note={meetingEngineNote}
              blockConfirm
            />
          ) : null}

          {spendReceipt ? (
            <SpendReceiptNotice
              spent={spendReceipt.spent}
              balanceAfter={spendReceipt.balanceAfter}
              onClose={() => setSpendReceipt(null)}
            />
          ) : null}

          {spendConfirmOpen && !topicConfirmed ? (
            <SpendConfirmPanel
              offer={activeSpendOffer}
              balance={wallet.balance}
              loading={startFounderMeeting.isPending || deliberating}
              error={spendError}
              confirmLabel="开始分析"
              onCancel={() => {
                setSpendConfirmOpen(false);
                setSpendError(null);
              }}
              onConfirm={() => {
                const nextTopic =
                  meetingTopic ||
                  searchParams?.get("topic")?.trim() ||
                  topic;
                if (!nextTopic) return;
                launchFounderMeeting(nextTopic, activeSpendOffer.cost, activeSpendOffer.kind);
              }}
            />
          ) : null}

          {!topicConfirmed && !spendConfirmOpen && !searchParams?.get("topic")?.trim() ? (
            meetingLane === "hub" ? (
              <MeetingHub
                projectId={params.projectId}
                onChooseConsulting={() => setMeetingLane("consulting")}
              />
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setMeetingLane("hub")}
                  className="inline-flex min-h-11 items-center px-1 text-[13px] text-[#6f747b] touch-manipulation"
                >
                  ← 返回选题
                </button>
                <CouncilProblemPicker
                  projectId={params.projectId}
                  onSelect={({ topic: nextTopic, spendKind }) => {
                    setMeetingTopic(nextTopic);
                    setSpendConfirmOfferKind(spendKind);
                    setSpendError(null);
                    setSpendConfirmOpen(true);
                  }}
                />
              </div>
            )
          ) : null}

          {!(spendConfirmOpen && !topicConfirmed) ? (
          <>
          <MeetingDraftBanners
            draftConflict={draftConflict}
            showResumeBanner={showDraftBanner && topicConfirmed}
            resumeTopic={meetingTopic || ""}
            resumeLifecycle={meetingLifecycle}
            resumeRound={deliberationRound}
            clearing={clearMeetingSession.isPending}
            onContinueDraft={applySavedDraft}
            onReplaceWithIncoming={() => {
              if (!draftConflict) return;
              const incoming = draftConflict.incomingTopic;
              clearMeetingSession.mutate(
                { projectId: params.projectId },
                {
                  onSuccess: () => {
                    setDraftConflict(null);
                    setShowDraftBanner(false);
                    setMeetingTopic(incoming);
                    setTopicConfirmed(false);
                    setMeetingLifecycle("PREPARE");
                    setDeliberationRound(0);
                    setLiveStatements([]);
                    setLiveConflict(null);
                    setLiveConsensus(null);
                    setLiveOptions([]);
                    setMeetingRuntime(null);
                    void utils.meetingSession.get.invalidate({
                      projectId: params.projectId,
                    });
                    void utils.dashboard.getHome.invalidate();
                  },
                },
              );
            }}
            onDismissResume={() => setShowDraftBanner(false)}
            onAbandonResume={() => {
              clearMeetingSession.mutate(
                { projectId: params.projectId },
                {
                  onSuccess: () => {
                    setShowDraftBanner(false);
                    setTopicConfirmed(false);
                    setMeetingLifecycle("PREPARE");
                    setDeliberationRound(0);
                    setLiveStatements([]);
                    setLiveConflict(null);
                    setLiveConsensus(null);
                    setLiveOptions([]);
                    setMeetingRuntime(null);
                    setServerSynthesis(null);
                    void utils.meetingSession.get.invalidate({
                      projectId: params.projectId,
                    });
                    void utils.dashboard.getHome.invalidate();
                  },
                },
              );
            }}
          />

          {showMeetingHistory ? (
            <MeetingHistoryPanel
              projectId={project.id}
              items={meetingHistory}
              onClose={() => setShowMeetingHistory(false)}
            />
          ) : null}

          {reviewIntent === "positioning_review" && reviewDecisionId ? (
            <PositioningReviewBanner
              projectId={params.projectId}
              decisionId={reviewDecisionId}
              resolving={resolveReview.isPending}
              resolved={resolveReview.isSuccess}
              onMarkReviewed={() =>
                resolveReview.mutate({
                  projectId: params.projectId,
                  decisionId: reviewDecisionId,
                  status: "reviewed",
                })
              }
            />
          ) : null}

          <FounderLoopPreviewPanel
            projectId={params.projectId}
            topic={topic}
            onActivate={(runtime) =>
              activateFounderMeetingFromRuntime({ runtime })
            }
          />

          {topicConfirmed && topic ? (
            <div className="mb-4">
              <MemoryRuntimePanel
                projectId={params.projectId}
                topic={topic}
                compact
              />
            </div>
          ) : null}

          <MeetingRoom
            projectId={project.id}
            title={meetingTitle}
            topic={topic}
            lifecycle={meetingLifecycle}
            preparing={!topicConfirmed || meetingLifecycle === "PREPARE"}
            knownFacts={mergedFacts}
            storeVisitFactCount={
              typeof workspace.storeVisitFactCount === "number"
                ? workspace.storeVisitFactCount
                : mergedFacts.filter((f) => f.includes("【店访")).length
            }
            unknownGaps={unknownGaps}
            experts={experts}
            statements={statements}
            conflict={conflict}
            conflictMatrix={meetingRuntime?.meeting.conflictMatrix ?? null}
            debateSession={(() => {
              const ds = meetingRuntime?.meeting.debateSession;
              if (!ds) return null;
              const committeeLabel: Record<string, string> = {
                market: "市场",
                brand: "品牌",
                business: "商业",
                capital: "组织",
              };
              const typeLabel: Record<string, string> = {
                evidence: "证据挑战",
                logic: "逻辑挑战",
                assumption: "假设挑战",
                risk: "风险挑战",
              };
              return {
                conflicts: ds.conflicts.map((c) => ({
                  topic: c.topic,
                  severity: c.severity,
                  summary: c.summary,
                  committees: c.committees,
                })),
                challenges: ds.challenges.map((ch) => ({
                  challengeType: ch.challengeType,
                  challengeTypeLabel: typeLabel[ch.challengeType] || ch.challengeType,
                  fromCommitteeLabel: committeeLabel[ch.fromCommittee] || ch.fromCommittee,
                  targetCommitteeLabel: committeeLabel[ch.targetCommittee] || ch.targetCommittee,
                  statement: ch.statement,
                })),
                proposal: ds.proposal,
                scenarioTests: ds.scenarioTests.map((sc) => ({
                  scenario: sc.scenario,
                  trigger: sc.trigger,
                  impact: sc.impact,
                  mitigation: sc.mitigation,
                })),
              };
            })()}
            consensus={consensus}
            decisionCard={decisionCard}
            options={liveOptions}
            selectedOptionId={selectedOptionId}
            onSelectOption={handleSelectOption}
            topicConfirmed={topicConfirmed}
            focusChoice={focusChoice}
            deliberationRound={deliberationRound}
            deliberating={deliberating}
            onConfirmTopic={handleConfirmTopic}
            onEditTopic={handleEditTopic}
            onChooseFocus={handleChooseFocus}
            onAdvanceRound={handleAdvanceRound}
            onSupplementFact={handleSupplementFact}
            onAccept={handleAccept}
            onContinueDiscuss={handleContinueDiscuss}
            onModify={handleModify}
            accepting={confirmFromMeeting.isPending}
            acceptedDecisionId={acceptedDecisionId}
            growthPlan={acceptedGrowthPlan}
            validationTask={acceptedValidationTask}
            decisionContract={(() => {
              const raw = meetingRuntime?.finalDecision.contract as
                | {
                    decisionId?: string;
                    intent?: string;
                    decision?: string;
                    status?: string;
                    confidence?: number;
                    gate?: { reason?: string };
                    tensions?: Array<{
                      topic: string;
                      supporters: string[];
                      opponents: string[];
                      criticalEvidence: string[];
                    }>;
                    committeeViews?: Array<{
                      committee: string;
                      position: string;
                      reason: string;
                    }>;
                    validationPlan?: {
                      goal: string;
                      hypothesis: string;
                      metrics: string[];
                      period: string;
                      successCriteria: string;
                      killCriteria?: string;
                    };
                    claimRefs?: string[];
                    memo?: {
                      title: string;
                      decision: string;
                      whyNow: string;
                      tradeoffs: string[];
                      conditions: string[];
                      validation: string;
                      killCriteria: string;
                      stopLine: string;
                      evidenceIds: string[];
                    };
                  }
                | undefined;
              if (!raw?.decisionId || !raw.intent || !raw.decision || !raw.validationPlan) return null;
              const intentLabel: Record<string, string> = {
                ENTER_MARKET: "进入市场",
                POSITION_BRAND: "品牌定位",
                BUILD_MODEL: "商业模型",
                RAISE_CAPITAL: "融资",
                EXPAND: "扩张",
                OPTIMIZE: "优化",
                STOP: "停止",
              };
              const statusLabel: Record<string, string> = {
                DRAFT: "草稿",
                DEBATING: "四席讨论中",
                READY_FOR_APPROVAL: "待你确认",
                VALIDATION_REQUIRED: "证据不足，需先验证",
                APPROVED: "已批准",
                EXECUTING: "执行中",
                VALIDATED: "验证成功",
                FAILED: "失败",
                REVISED: "已修订",
              };
              const committeeLabel: Record<string, string> = {
                market: "市场",
                brand: "品牌",
                business: "商业",
                capital: "组织",
              };
              return {
                decisionId: raw.decisionId,
                intent: raw.intent,
                intentLabel: intentLabel[raw.intent] || raw.intent,
                decision: raw.decision,
                status: String(raw.status || "READY_FOR_APPROVAL"),
                statusLabel: statusLabel[String(raw.status)] || String(raw.status),
                confidence: Number(raw.confidence || 0.6),
                gateReason: raw.gate?.reason || "",
                tensions: raw.tensions || [],
                committeeViews: (raw.committeeViews || []).map((view) => ({
                  committee: view.committee,
                  committeeLabel: committeeLabel[view.committee] || view.committee,
                  position: view.position,
                  reason: view.reason,
                })),
                validationPlan: raw.validationPlan,
                claimRefs: raw.claimRefs || [],
                memo: raw.memo,
              };
            })()}
            showTranscript={showTranscript}
            onToggleTranscript={() => setShowTranscript((v) => !v)}
            transcriptSlot={meetingRecordSection}
          />
          </>
          ) : null}
        </div>
      </div>

      <AdvisorComposer
        projectId={project.id}
        input={input}
        onInputChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={() => void handleSend()}
        onStartRecording={() => void handleStartRecording()}
        onStopRecording={() => handleStopRecording()}
        onFileChange={(files) => void handleFileChange(files)}
        onDeleteAsset={(assetId) => deleteAsset.mutate({ assetId })}
        onShowHistory={() => setShowMeetingHistory(true)}
        selectedAssetIds={selectedAssetIds}
        onSelectedAssetIdsChange={setSelectedAssetIds}
        assetLibrary={assetLibrary as AdvisorAsset[]}
        assetCategories={assetCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectedCategoryIdChange={setSelectedCategoryId}
        primaryComposerPrompts={primaryComposerPrompts}
        finalizeDecisionPrompt={finalizeDecisionPrompt}
        uploading={uploading}
        uploadError={uploadError}
        uploadSuccess={uploadSuccess}
        onClearUploadError={() => setUploadError(null)}
        recording={recording}
        recordingSeconds={recordingSeconds}
        maxRecordingSeconds={MAX_VOICE_SECONDS}
        recordingTranscript={recordingTranscript}
        voiceTip={voiceTip}
        onDismissVoiceTip={() => setVoiceTip(null)}
        streaming={streaming}
        deletingAsset={deleteAsset.isPending}
      />
    </div>
  );
}

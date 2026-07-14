"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, LoaderCircle, Mic, Paperclip, Plus, Send, Square, Trash2, Video, FileText, ImageIcon, History, ThumbsUp, ThumbsDown, Target } from "lucide-react";
import { MeetingRoom, type MKAgentStage } from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";
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
  lifecycleLabel,
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
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-[14px] text-[#6f747b]">正在加载会议页...</div>}>
      <AdvisorPageContent params={params} />
    </Suspense>
  );
}

function AdvisorPageContent({
  params,
}: {
  params: { projectId: string };
}) {
  const searchParams = useSearchParams();
  const { data, isLoading, error } = trpc.dashboard.getAdvisorWorkspace.useQuery({ projectId: params.projectId });
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
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [showMobileComposerTools, setShowMobileComposerTools] = useState(false);
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
      }>;
      rounds: Array<{
        round: number;
        title: string;
        items: Array<{ agent: string; summary: string; stance?: string }>;
      }>;
    };
    decisions: Array<{
      decisionId: string;
      sourceAgent: string;
      judgement: string;
      stance?: string;
      risks: string[];
      nextSteps: string[];
    }>;
    finalDecision: {
      chosen: string;
      problem: string;
      reason: string[];
      validationPlan: string[];
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
  const [historyPreview, setHistoryPreview] = useState<{
    topic: string;
    summary: string;
    recommendation?: string;
    createdAt: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topicConfirmedRef = useRef(false);
  const deliberationRoundRef = useRef<DeliberationRound | 0>(0);
  const autoStartTriggeredRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalizedTranscriptRef = useRef("");
  const inputBeforeRecordingRef = useRef("");
  const [recordingTranscript, setRecordingTranscript] = useState("");

  useEffect(() => {
    if (data?.currentProject) setCurrentProject(data.currentProject);
  }, [data?.currentProject, setCurrentProject]);

  useEffect(() => {
    topicConfirmedRef.current = topicConfirmed;
  }, [topicConfirmed]);

  useEffect(() => {
    deliberationRoundRef.current = deliberationRound;
  }, [deliberationRound]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

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

  const selectedAssets = assetLibrary.filter((asset) => selectedAssetIds.includes(asset.id)) as AdvisorAsset[];

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
        setUploadSuccess(
          isVoice
            ? "语音已转写，并已选入本次会议资料（可在下方取消勾选）"
            : "资料已上传并选入本次会议",
        );
        setTimeout(() => setUploadSuccess(null), 4000);
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
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;

      try {
        for (const file of files) {
          await uploadAsset(file);
        }
      } finally {
        event.target.value = "";
      }
    },
    [uploadAsset],
  );

  const handleToggleRecording = useCallback(async () => {
    if (recording) {
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderChunksRef.current = [];
    recorderRef.current = recorder;
    finalizedTranscriptRef.current = "";
    inputBeforeRecordingRef.current = input.trim();
    setRecordingTranscript("");

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
        setInput([inputBeforeRecordingRef.current, combinedTranscript].filter(Boolean).join("\n"));
      };
      recognition.onerror = () => {
        setRecordingTranscript(finalizedTranscriptRef.current);
        setInput([inputBeforeRecordingRef.current, finalizedTranscriptRef.current].filter(Boolean).join("\n"));
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
      setRecording(false);
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const extension = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
      const audioFile = new File([audioBlob], `advisor-voice-${Date.now()}.${extension}`, {
        type: recorder.mimeType || "audio/webm",
      });
      const transcriptHint = finalizedTranscriptRef.current.trim();
      if (transcriptHint) {
        setInput([inputBeforeRecordingRef.current, transcriptHint].filter(Boolean).join("\n"));
      }
      setRecordingTranscript("");
      await uploadAsset(audioFile, {
        title: "语音会议输入",
        transcriptHint: transcriptHint || undefined,
      });
    };

    recorder.start();
    setRecording(true);
  }, [input, recording, uploadAsset]);

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
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: hasAssets
        ? `${userText}\n\n已附资料：${selectedAssets.map((item) => item.title).join("、")}`
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
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as
                | StreamChunk
                | RuntimeMeta
                | { type: "market_result"; data: MarketSnapshot }
                | { type: "equity_result"; data: EquitySnapshot; previous?: EquitySnapshot | null }
                | {
                    type: "positioning_result";
                    data: PositioningSnapshot;
                    previous?: PositioningSnapshot | null;
                  };
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

            } catch {
              // skip non-JSON lines
            }
          }
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

      // 刷新项目数据（Agent 可能更新了 score/risk 等）
      await Promise.all([
        utils.project.getById.invalidate({ id: params.projectId }),
        utils.project.list.invalidate(),
        utils.report.list.invalidate({ projectId: params.projectId }),
        utils.dashboard.getAdvisorWorkspace.invalidate({ projectId: params.projectId }),
        utils.dashboard.getProjectOverview.invalidate({ projectId: params.projectId }),
        utils.dashboard.getScorecard.invalidate({ projectId: params.projectId }),
        utils.dashboard.getReportSnapshot.invalidate({ projectId: params.projectId }),
        utils.dashboard.getProjectKnowledge.invalidate({ projectId: params.projectId }),
        utils.dashboard.getKnowledgeCenter.invalidate({ projectId: params.projectId }),
        utils.dashboard.getHome.invalidate(),
        utils.asset.list.invalidate({ projectId: params.projectId, limit: 12 }),
        utils.agent.latestPositioning.invalidate({ projectId: params.projectId }),
        utils.agent.positioningContext.invalidate({ projectId: params.projectId }),
        utils.agent.latestMarket.invalidate({ projectId: params.projectId }),
        utils.agent.marketContext.invalidate({ projectId: params.projectId }),
        utils.agent.latestEquity.invalidate({ projectId: params.projectId }),
        utils.agent.equityContext.invalidate({ projectId: params.projectId }),
      ]);
    } catch (error) {
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
    } finally {
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
    selectedAssets,
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
          ? "已从部门看板进入会议，请确认议题后开始独立判断"
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
      setMeetingLifecycle("DECISION");
      window.setTimeout(() => setMeetingLifecycle("VALIDATE"), 450);
      window.setTimeout(() => setMeetingLifecycle("MEMORY_UPDATE"), 1100);
      clearMeetingSession.mutate({ projectId: params.projectId });
      void utils.decisionArchive.list.invalidate({ projectId: params.projectId });
      void utils.decisionArchive.stats.invalidate({ projectId: params.projectId });
      void utils.dashboard.getHome.invalidate();
      void utils.dashboard.getAdvisorWorkspace.invalidate({ projectId: params.projectId });
      void utils.meetingSession.get.invalidate({ projectId: params.projectId });
    },
  });

  const startFounderMeeting = trpc.founder.startMeeting.useMutation();
  const runFounderLoop = trpc.founder.runLoop.useMutation();
  const advanceFounderRound = trpc.founder.advanceRound.useMutation();
  type FounderLoopRuntime = NonNullable<typeof runFounderLoop.data>;

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
          })),
          rounds: input.runtime.meeting.rounds.map((r) => ({
            round: r.round,
            title: r.title,
            items: r.items.map((item) => ({
              agent: item.agent,
              summary: item.summary,
              stance: item.stance,
            })),
          })),
        },
        decisions: input.runtime.decisions.map((d) => ({
          decisionId: d.decisionId,
          sourceAgent: d.sourceAgent,
          judgement: d.judgement,
          stance: d.stance,
          risks: d.risks,
          nextSteps: d.nextSteps,
        })),
        finalDecision: {
          chosen: input.runtime.finalDecision.chosen,
          problem: input.runtime.finalDecision.problem,
          reason: input.runtime.finalDecision.reason,
          validationPlan: input.runtime.finalDecision.validationPlan,
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
    (inputTopic: string) => {
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

      startFounderMeeting.mutate(
        {
          projectId: params.projectId,
          question: inputTopic,
          topic: inputTopic,
          assetIds: selectedAssetIds,
        },
        {
          onSuccess: (payload) => {
            activateFounderMeetingFromRuntime({
              runtime: payload.runtime,
              synthesis: payload.synthesis,
            });
          },
          onError: () => {
            setMeetingLifecycle("OPEN");
            setDeliberating(false);
          },
        },
      );
    },
    [
      activateFounderMeetingFromRuntime,
      params.projectId,
      selectedAssetIds,
      startFounderMeeting,
    ],
  );

  useEffect(() => {
    const topic = searchParams?.get("topic")?.trim();
    const dept = searchParams?.get("dept");
    if (!dept || searchParams?.get("autoStart") !== "1" || !topic) return;
    if (autoStartTriggeredRef.current) return;
    // 有冲突或已恢复进行中会议时，不自动开新会
    if (draftConflict) return;
    if (topicConfirmed && deliberationRound > 0) return;
    if (
      savedMeetingDraft?.topicConfirmed &&
      savedMeetingDraft.topic !== topic
    ) {
      return;
    }

    autoStartTriggeredRef.current = true;
    setAgentState("reasoning");
    setAgentStateDescription("正在自动发起 Founder 会议并邀请顾问席");
    setAgentReferences(["部门上下文", "项目记忆", "历史判断", "Founder Loop"]);

    const timer = window.setTimeout(() => {
      launchFounderMeeting(topic);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    launchFounderMeeting,
    searchParams,
    draftConflict,
    topicConfirmed,
    deliberationRound,
    savedMeetingDraft,
  ]);

  if (isLoading) {
    return <PageLoadingState eyebrow="咨询会议" title="AI 正在准备这场经营会议" description="正在读取上下文、证据和议题。" />;
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="咨询会议"
          title="这场会议暂时无法完整打开"
          description="会议上下文还在同步。先回经营世界或今日。"
          primaryAction={{ href: "/projects", label: "返回经营世界" }}
          secondaryAction={{ href: "/dashboard", label: "回到今日" }}
        />
      </div>
    );
  }

  if (!data?.currentProject || !data?.workspace) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="咨询会议"
          title="这场会议暂时无法打开"
          description="当前会议不可用。先回到经营世界重新进入。"
          primaryAction={{ href: "/projects", label: "返回经营世界" }}
          secondaryAction={{ href: "/dashboard", label: "回到今日" }}
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
  const mergedFacts = [...knownFacts, ...extraFacts];
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
    launchFounderMeeting(topic);
  };

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
        window.setTimeout(() => setMeetingLifecycle("USER_CONFIRM"), 400);
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
    }, 450);
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
      }, 400);
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
        nextActions: [opt.summary],
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
    const selected = liveOptions.find((o) => o.id === selectedOptionId);
    confirmFromMeeting.mutate({
      projectId: params.projectId,
      problem: topic,
      judgement: selected?.summary || draft.proposedDecision,
      diagnosis: challenge,
      observation: `会议议题：${topic}`,
      strategy: draft.summary,
      action: draft.nextActions[0] || decisionNextStep || "按验证计划推进",
      validationPlan:
        draft.validationPlan ||
        serverSynthesis?.validationPlan ||
        "先完成关键验证，再决定是否放大动作。",
      supportClaims: statements
        .filter((s) => s.stance === "support" || s.stance === "conditional")
        .map((s) => s.claim),
      opposeClaims: statements.filter((s) => s.stance === "oppose").map((s) => s.claim),
      focusChoice: focusChoice ?? undefined,
      meetingTitle,
    });
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
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-3 md:p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">记录</p>
          <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
            会议记录
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/decisions`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-3 py-2 text-[13px] font-medium text-[#202124]"
          >
            <History className="h-4 w-4" />
            决策档案
          </Link>
          <button
            type="button"
            onClick={() => setShowMeetingHistory((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] font-medium text-[#202124]"
          >
            会议历史
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allMessages.length === 0 ? (
        <div className="mt-4 min-h-[40dvh] rounded-[18px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] px-4 py-8 text-center md:mt-5 md:min-h-[48vh] md:py-10">
          <p className="text-[16px] leading-7 text-[#202124]">会议还没有进入正式讨论</p>
          <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">先补充，再继续。</p>
        </div>
      ) : (
        <div className="mt-4 min-h-[40dvh] overscroll-contain space-y-2 md:min-h-[48vh] md:space-y-3">
          {allMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="w-full max-w-[92%] md:max-w-[90%]">
                <div
                  className={`rounded-[18px] px-4 py-3 whitespace-pre-wrap text-[14px] leading-[1.72] ${
                    msg.role === "user"
                      ? "border border-[rgba(24,24,23,0.08)] bg-[#181817] text-white"
                      : "border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] text-[#202124]"
                  }`}
                >
                  <p
                    className={`text-[11px] tracking-[0.01em] ${
                      msg.role === "user" ? "text-white/70" : "text-[#6f747b]"
                    }`}
                  >
                    {msg.role === "user" ? "你" : "AI"}
                  </p>
                  <div className="mt-2">{msg.content}</div>
                </div>
                {msg.role === "assistant" && msg.id !== "welcome" && msg.id !== "loading" && msg.id !== "streaming" ? (
                  <div className="mt-1 space-y-1 px-2">
                    <div className="flex items-center gap-2">
                      {miniFeedbackState[msg.id] === "sent" ? (
                        <span className="text-[11px] text-green-600">感谢反馈 ✓</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleMiniFeedback(msg.id, true)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-2 text-[12px] text-[#6f747b] transition active:scale-[0.98] hover:bg-[#F5F3EE] hover:text-green-600"
                            title="这个分析有帮助"
                            aria-label="这个分析有帮助"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            有帮助
                          </button>
                          <button
                            onClick={() => handleMiniFeedback(msg.id, false)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-2 text-[12px] text-[#6f747b] transition active:scale-[0.98] hover:bg-[#F5F3EE] hover:text-red-500"
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
                              localStorage.setItem(`action_from_advisor_${msg.id}`, JSON.stringify({
                                action: lastAction,
                                createdAt: new Date().toISOString(),
                                source: 'advisor_commit',
                                ephemeral: true,
                              }));
                              setMiniFeedbackState(prev => ({ ...prev, [`action_${msg.id}`]: "sent" as "sent" | "error" }));
                              setTimeout(() => setMiniFeedbackState(prev => {
                                const next = { ...prev };
                                delete next[`action_${msg.id}`];
                                return next;
                              }), 4000);
                            }}
                            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-2 text-[12px] text-[#66735E] transition active:scale-[0.98] hover:bg-[#EEF1EA] hover:text-[#202124]"
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

  const founderLoopPreview = runFounderLoop.data;

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] max-w-4xl flex-col md:h-[calc(100dvh-5.5rem)] md:max-h-[calc(100dvh-5.5rem)] md:max-w-5xl">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-6">
        <div className="space-y-4 md:space-y-5">
          {draftConflict ? (
            <section className="rounded-[18px] border border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.08)] p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">发现未完成会议</p>
              <p className="mt-2 text-[15px] leading-7 text-[#202124]">
                上次议题：「{draftConflict.draft.topic}」仍在
                {lifecycleLabel(draftConflict.draft.lifecycle)}。
                当前入口议题是「{draftConflict.incomingTopic}」。
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">
                审议进度可恢复；聊天记录未保存。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applySavedDraft(draftConflict.draft)}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#181817] px-4 text-[13px] font-semibold text-white"
                >
                  继续上次会议
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearMeetingSession.mutate(
                      { projectId: params.projectId },
                      {
                        onSuccess: () => {
                          setDraftConflict(null);
                          setShowDraftBanner(false);
                          setMeetingTopic(draftConflict.incomingTopic);
                          setTopicConfirmed(false);
                          setMeetingLifecycle("PREPARE");
                          setDeliberationRound(0);
                          setLiveStatements([]);
                          setLiveConflict(null);
                          setLiveConsensus(null);
                          setLiveOptions([]);
                          setMeetingRuntime(null);
                          void utils.meetingSession.get.invalidate({ projectId: params.projectId });
                          void utils.dashboard.getHome.invalidate();
                        },
                      },
                    );
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124]"
                >
                  改用新议题
                </button>
              </div>
            </section>
          ) : null}

          {showDraftBanner && topicConfirmed && !draftConflict ? (
            <section className="rounded-[18px] border border-[rgba(102,115,94,0.28)] bg-[#EEF1EA] p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">继续未完成会议</p>
              <p className="mt-2 text-[15px] leading-7 text-[#202124]">
                {meetingTopic} · {lifecycleLabel(meetingLifecycle)}
                {deliberationRound > 0 ? ` · 第 ${deliberationRound} 轮` : ""}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
                审议进度已恢复；聊天记录未保存。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowDraftBanner(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#181817] px-4 text-[13px] font-semibold text-white"
                >
                  继续会议
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                          void utils.meetingSession.get.invalidate({ projectId: params.projectId });
                          void utils.dashboard.getHome.invalidate();
                        },
                      },
                    );
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124]"
                >
                  放弃并重新开始
                </button>
              </div>
            </section>
          ) : null}

          {showMeetingHistory ? (
            <section className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会议历史</p>
                  <h2 className="mt-1 text-[18px] font-semibold text-[#202124]">近期 Founder 会议</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMeetingHistory(false);
                    setHistoryPreview(null);
                  }}
                  className="text-[13px] text-[#6f747b]"
                >
                  收起
                </button>
              </div>
              {meetingHistory.length === 0 ? (
                <p className="mt-3 text-[14px] leading-6 text-[#6f747b]">
                  暂无已落库的会议摘要。完成一轮独立判断后会出现在这里。
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {meetingHistory.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPreview({
                            topic: item.topic,
                            summary: item.summary,
                            recommendation: item.recommendation,
                            createdAt: item.createdAt,
                          })
                        }
                        className="w-full rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] px-3 py-3 text-left transition hover:bg-[#F5F3EE]"
                      >
                        <p className="text-[14px] font-medium text-[#202124]">{item.topic}</p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#6f747b]">
                          {item.summary}
                        </p>
                        <p className="mt-1 text-[11px] text-[#9aa0a6]">
                          {new Date(item.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {historyPreview ? (
                <div className="mt-3 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#EEF1EA] p-3">
                  <p className="text-[13px] font-semibold text-[#202124]">{historyPreview.topic}</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">{historyPreview.summary}</p>
                  {historyPreview.recommendation ? (
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                      建议：{historyPreview.recommendation}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Link
                href={`/projects/${project.id}/decisions`}
                prefetch={false}
                className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#202124] no-underline"
              >
                打开决策档案
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : null}

          {reviewIntent === "positioning_review" && reviewDecisionId ? (
            <section className="rounded-[18px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] p-4">
              <p className="text-[12px] font-medium text-[#B47C5C]">定位变更复审模式</p>
              <p className="mt-2 text-[14px] leading-6 text-[#202124]">已预填复审议题。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={resolveReview.isPending}
                  onClick={() =>
                    resolveReview.mutate({
                      projectId: params.projectId,
                      decisionId: reviewDecisionId,
                      status: "reviewed",
                    })
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#181817] px-3 py-1.5 text-[12px] text-white disabled:opacity-50"
                >
                  {resolveReview.isSuccess ? "已标记复审 ✓" : "标记为已复审"}
                </button>
                <Link
                  href={`/projects/${params.projectId}/decisions#decision-${reviewDecisionId}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1.5 text-[12px] text-[#202124] no-underline"
                >
                  回到决策档案
                </Link>
              </div>
            </section>
          ) : null}

          <section className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Founder Layer</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                  协同闭环预览
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                  先预跑 Founder 协同闭环，再把结果一键接入会议桌。记忆写入会在服务端同步落库，不只停在前台预览。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={runFounderLoop.isPending}
                  onClick={() =>
                    runFounderLoop.mutate({
                      projectId: params.projectId,
                      message: topic,
                    })
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {runFounderLoop.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  运行 Founder Loop
                </button>
                {founderLoopPreview ? (
                  <button
                    type="button"
                    onClick={() =>
                      activateFounderMeetingFromRuntime({
                        runtime: founderLoopPreview,
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124]"
                  >
                    接入会议桌
                  </button>
                ) : null}
              </div>
            </div>

            {runFounderLoop.error ? (
              <div className="mt-4 rounded-[14px] bg-[rgba(180,124,92,0.10)] px-4 py-3 text-[13px] leading-6 text-[#B47C5C]">
                运行失败：{runFounderLoop.error.message}
              </div>
            ) : null}

            {founderLoopPreview ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Mission</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{founderLoopPreview.mission.mission}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">席位</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{founderLoopPreview.mission.requiredAgents.join(" / ")}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会议冲突</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{founderLoopPreview.meeting.conflicts.length} 个</p>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">记忆写入</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{founderLoopPreview.memoryWrites.length} 条</p>
                  </div>
                </div>

                <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Final Decision</p>
                  <p className="mt-2 text-[15px] font-medium leading-7 text-[#202124]">{founderLoopPreview.finalDecision.chosen}</p>
                  <div className="mt-2 space-y-2">
                    {founderLoopPreview.finalDecision.reason.map((item) => (
                      <p key={item} className="text-[13px] leading-6 text-[#5f655d]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">四席判断</p>
                    <div className="mt-3 space-y-3">
                      {founderLoopPreview.decisions.map((decision) => (
                        <div key={decision.decisionId} className="rounded-[14px] bg-[#F8F7F3] px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[13px] font-medium text-[#202124]">{decision.sourceAgent}</p>
                            <p className="text-[12px] text-[#66735E]">{Math.round(decision.confidence * 100)}%</p>
                          </div>
                          <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">{decision.judgement}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Memory Writes</p>
                    <div className="mt-3 space-y-3">
                      {founderLoopPreview.memoryWrites.map((item) => (
                        <div key={item.writeId} className="rounded-[14px] bg-[#F8F7F3] px-3 py-3">
                          <p className="text-[13px] font-medium text-[#202124]">
                            {item.type} / {item.source}
                          </p>
                          <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <MeetingRoom
            projectId={project.id}
            title={meetingTitle}
            topic={topic}
            lifecycle={meetingLifecycle}
            preparing={!topicConfirmed || meetingLifecycle === "PREPARE"}
            knownFacts={mergedFacts}
            unknownGaps={unknownGaps}
            experts={experts}
            statements={statements}
            conflict={conflict}
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
            showTranscript={showTranscript}
            onToggleTranscript={() => setShowTranscript((v) => !v)}
            transcriptSlot={meetingRecordSection}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-[rgba(24,24,23,0.08)] bg-[rgba(255,255,255,0.96)] px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-xl md:px-6 md:py-3">
        <div className="mb-2 md:hidden">
          <button
            type="button"
            onClick={() => setShowMobileComposerTools((value) => !value)}
            className="inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3.5 text-[12px] font-medium text-[#202124]"
          >
            <span>更多工具</span>
            {showMobileComposerTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={`mb-2 rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-2 md:mb-3 md:block md:p-3 ${
            showMobileComposerTools ? "block" : "hidden"
          }`}
        >
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <button
              type="button"
              onClick={() => {
                setInput(finalizeDecisionPrompt);
                setShowMobileComposerTools(false);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-3.5 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              形成经营决策
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href={`/projects/${project.id}/decisions`}
              prefetch={false}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-3.5 text-[13px] font-semibold text-[#202124]"
            >
               决策档案
              <History className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowMeetingHistory(true);
                setShowMobileComposerTools(false);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-3.5 text-[13px] font-semibold text-[#202124] md:hidden"
            >
              会议历史
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mb-2 hidden flex-wrap items-center gap-2 md:mb-3 md:flex">
          {primaryComposerPrompts.map((item: { label: string; prompt: string }) => (
            <button
              key={`composer-${item.label}`}
              type="button"
              onClick={() => setInput(item.prompt)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124]"
            >
              {item.label}
            </button>
          ))}
          {uploading || selectedAssetIds.length > 0 ? (
            <div className="rounded-full bg-[rgba(102,115,94,0.08)] px-3 py-1.5 text-[12px] text-[#66735E]">
              {uploading ? "资料处理中..." : `已选资料 ${selectedAssetIds.length} 份`}
            </div>
          ) : null}
        </div>

        {selectedAssets.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 md:mb-3">
            {selectedAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetIds((prev) => prev.filter((id) => id !== asset.id))}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#EEF1EA] px-3 py-1.5 text-[12px] text-[#202124]"
              >
                <span>{asset.title}</span>
                <span className="text-[#66735E]">移除</span>
              </button>
            ))}
          </div>
        ) : null}

        {showAssetLibrary ? (
          <div className="mb-3 rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">资料</p>
                <p className="text-[12px] leading-5 text-[#6f747b]">只选这次要用的证据。</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="min-h-10 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] text-[#202124] focus:outline-none"
                >
                  {assetCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || streaming}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124] disabled:opacity-50"
                >
                  <Paperclip className="h-4 w-4" />
                  {uploading ? "上传中..." : "上传"}
                </button>
              </div>
            </div>

            {uploading ? (
              <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[rgba(102,115,94,0.08)] px-4 py-3 text-[13px] text-[#66735E]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>资料处理中，语音/图片可能需要几秒...</span>
              </div>
            ) : uploadError ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-[14px] bg-[rgba(180,124,92,0.10)] px-4 py-3 text-[13px] text-[#B47C5C]">
                <span>{uploadError}</span>
                <button type="button" onClick={() => setUploadError(null)} className="shrink-0 text-[12px] underline">关闭</button>
              </div>
            ) : uploadSuccess ? (
              <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[rgba(102,115,94,0.12)] px-4 py-3 text-[13px] text-[#66735E]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2">
              {assetLibrary.slice(0, 4).map((asset) => (
                <div
                  key={asset.id}
                  className={`flex items-center gap-2 rounded-[14px] border px-3 py-2.5 transition ${
                    selectedAssetIds.includes(asset.id)
                      ? "border-[#66735E] bg-[rgba(102,115,94,0.08)]"
                      : "border-[rgba(24,24,23,0.08)] bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAssetIds((prev) =>
                        prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id],
                      )
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[13px] font-medium leading-6 text-[#202124]">{asset.title}</p>
                    <p className="truncate text-[12px] leading-5 text-[#6f747b]">
                      {asset.category?.name ?? "未分类"} · {asset.summary ?? "已导入资料"}
                    </p>
                  </button>
                  <div className="shrink-0 text-[#6f747b]">
                    {asset.kind === "audio" ? <Mic className="h-4 w-4" /> : null}
                    {asset.kind === "image" ? <ImageIcon className="h-4 w-4" /> : null}
                    {asset.kind === "video" ? <Video className="h-4 w-4" /> : null}
                    {asset.kind === "document" ? <FileText className="h-4 w-4" /> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteAssetId(asset.id)}
                    disabled={deleteAsset.isPending}
                    className="shrink-0 rounded-full p-1.5 text-[#8b877f] transition hover:bg-[rgba(180,124,92,0.10)] hover:text-[#B47C5C] disabled:opacity-50"
                    aria-label="删除资料"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {pendingDeleteAssetId ? (
                <div className="rounded-[14px] border border-[rgba(180,124,92,0.22)] bg-[rgba(180,124,92,0.08)] px-3 py-3">
                  <p className="text-[13px] text-[#8A4F31]">确认删除这份资料？删除后不可恢复。</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteAsset.mutate({ assetId: pendingDeleteAssetId });
                        setPendingDeleteAssetId(null);
                      }}
                      className="inline-flex min-h-9 items-center rounded-full bg-[#181817] px-3 text-[12px] font-medium text-white"
                    >
                      确认删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteAssetId(null)}
                      className="inline-flex min-h-9 items-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#202124]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
              {assetLibrary.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[rgba(24,24,23,0.10)] bg-white px-3 py-4 text-[12px] leading-5 text-[#6f747b]">
                  还没有资料，先上传再纳入本次判断。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="w-full rounded-[26px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2 py-2 shadow-[0_8px_18px_rgba(24,24,23,0.03)]">
          <p className="px-3 pt-1 text-[11px] leading-4 text-[#6f747b]">次要入口 · 补充观点</p>
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowAssetLibrary((value) => !value)}
              disabled={uploading || streaming}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#202124] disabled:opacity-50"
              aria-label={showAssetLibrary ? "收起资料面板" : "打开资料面板"}
            >
              {uploading ? <LoaderCircle className="h-5 w-5 animate-spin text-[#66735E]" /> : <Plus className="h-5 w-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="补充观点…"
                rows={2}
                className="block min-h-[52px] w-full resize-none rounded-[20px] border-0 bg-transparent px-2 py-2 text-[16px] text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-0 md:min-h-[60px] md:text-sm"
                disabled={streaming || uploading}
              />
            </div>
            <button
              type="button"
              onClick={recording ? handleToggleRecording : input.trim() || selectedAssetIds.length > 0 ? () => void handleSend() : handleToggleRecording}
              disabled={uploading || streaming}
              className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50 ${
                recording || input.trim() || selectedAssetIds.length > 0
                  ? "bg-[#8E8E8E] text-white"
                  : "text-[#202124]"
              }`}
              aria-label={
                recording
                  ? "停止语音输入"
                  : input.trim() || selectedAssetIds.length > 0
                    ? "发送判断"
                    : "开始语音输入"
              }
            >
              {recording ? (
                <Square className="h-4 w-4" />
              ) : input.trim() || selectedAssetIds.length > 0 ? (
                <Send className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

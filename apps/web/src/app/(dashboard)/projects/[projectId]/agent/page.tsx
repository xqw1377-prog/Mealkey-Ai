"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  FileText,
  Loader2,
  Menu,
  SquarePen,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import {
  AgentChatSidebar,
  type AgentHistoryItem,
} from "@/components/operating/AgentChatSidebar";
import { AgentEmptyThreeEasy } from "@/components/operating/AgentEmptyThreeEasy";
import {
  HoldToTalkBanner,
  HoldToTalkButton,
} from "@/components/operating/HoldToTalkButton";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import { greetingByHour } from "@/lib/time-greeting";
import type {
  BusinessAssetV1,
  MobileAgentStateV1,
} from "@/server/founder-layer/contracts/goal-compiler";
import {
  latestVoiceUtterance,
  routeVoiceToSlots,
} from "@/server/founder-layer/goal-compiler/voice-slot-routing";

type FileKind = "xlsx" | "csv" | "image" | "pdf" | "doc" | "other";

/** 客户端空态：updatedAt 必须稳定，避免 SSR/CSR hydration 不一致 */
const EMPTY_AGENT_STATE: MobileAgentStateV1 = {
  version: "v1",
  activeGoal: null,
  taskGraph: null,
  assets: [],
  turns: [],
  pendingQuestions: [],
  pendingDecisions: [],
  memoryHints: { focus: [] },
  seedMetrics: {
    events: [],
    compileCount: 0,
    assetCount: 0,
    returnCount: 0,
  },
  activeDrill: null,
  interactionHints: null,
  slotDrafts: {},
  updatedAt: "1970-01-01T00:00:00.000Z",
};

function guessFileKind(name: string): FileKind {
  const n = name.toLowerCase();
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "xlsx";
  if (n.endsWith(".csv")) return "csv";
  if (/\.(png|jpe?g|webp|gif)$/.test(n)) return "image";
  if (n.endsWith(".pdf")) return "pdf";
  if (/\.(docx?|txt)$/.test(n)) return "doc";
  return "other";
}

function clip(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function AgentPageInner({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  /** 语音只走底栏主麦；色卡当前题用 preferSlot 路由 */
  const voiceTargetRef = useRef<"composer">("composer");
  const slotVoiceContextRef = useRef<{
    pendingQuestions: Array<{ slot: string; prompt: string }>;
    choiceBySlot: Map<string, Array<{ label: string; value: string }>>;
    slotDrafts: Record<string, string>;
    goalBlocked: boolean;
    preferSlot: string | null;
  }>({
    pendingQuestions: [],
    choiceBySlot: new Map(),
    slotDrafts: {},
    goalBlocked: false,
    preferSlot: null,
  });
  const { data, isLoading, isError, error, refetch, isFetching } =
    trpc.mobileAgent.getState.useQuery(
      { projectId },
      {
        retry: 1,
        refetchOnWindowFocus: false,
        // 超时后停止转圈，避免顶栏永远「正在同步」吓退用户
        staleTime: 10_000,
      },
    );
  const [syncGaveUp, setSyncGaveUp] = useState(false);
  useEffect(() => {
    if (data || isError) {
      setSyncGaveUp(false);
      return;
    }
    const t = window.setTimeout(() => setSyncGaveUp(true), 6000);
    return () => window.clearTimeout(t);
  }, [data, isError, projectId]);
  const { data: scanData } = trpc.dashboard.getDailyScan.useQuery(
    { projectId },
    { staleTime: 60_000 },
  );
  const compileMut = trpc.mobileAgent.compile.useMutation({
    onSuccess: async () => {
      await utils.mobileAgent.getState.invalidate({ projectId });
      await utils.dashboard.getHome.invalidate();
      await utils.dashboard.getDailyScan.invalidate();
    },
  });
  const freshMut = trpc.mobileAgent.startFreshGoal.useMutation({
    onSuccess: async () => {
      await utils.mobileAgent.getState.invalidate({ projectId });
    },
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<{
    id: string;
    label: string;
    kind: FileKind;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [viewAsset, setViewAsset] = useState<BusinessAssetV1 | null>(null);
  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({});
  /** 色卡当前引导题（回答一律走底部对话框） */
  const [guideSlot, setGuideSlot] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("你好");
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceCompileRef = useRef<(text: string) => void>(() => {});
  const slotDraftsHydratedRef = useRef(false);

  const saveSlotDraftsMut = trpc.mobileAgent.saveSlotDrafts.useMutation();
  const deleteHistoryMut = trpc.mobileAgent.deleteHistory.useMutation({
    onSuccess: async (_data, vars) => {
      await utils.mobileAgent.getState.invalidate({ projectId });
      if (vars.kind === "asset") {
        setViewAsset((cur) => (cur?.assetId === vars.id ? null : cur));
      }
    },
  });
  const ackDecisionMut = trpc.mobileAgent.acknowledgePendingDecision.useMutation({
    onSuccess: async () => {
      await utils.mobileAgent.getState.invalidate({ projectId });
      await utils.dashboard.getHome.invalidate();
    },
  });

  useEffect(() => {
    setGreeting(greetingByHour());
  }, []);

  // 从后端恢复色卡中间草稿（刷新可续填）
  useEffect(() => {
    slotDraftsHydratedRef.current = false;
    setSlotDrafts({});
  }, [projectId]);

  useEffect(() => {
    if (!data?.state || slotDraftsHydratedRef.current) return;
    const server = data.state.slotDrafts || {};
    if (Object.keys(server).length > 0) {
      setSlotDrafts(server);
    }
    slotDraftsHydratedRef.current = true;
  }, [data?.state]);

  // Web（lg+）默认开侧栏；手机默认关（ChatGPT 双端）
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setSidebarOpen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const {
    speechSupported,
    recording,
    uploading: speechUploading,
    speechError,
    activeFieldId,
    recordingSeconds,
    maxVoiceSeconds,
    startFieldRecording,
    stopRecording,
  } = useSpeechToTextField({
    projectId,
    title: "MealKey经营语音",
    onFinalTranscript: (fullText) => {
      voiceCompileRef.current(fullText);
    },
  });

  // 禁止整页「加载中」挡门：无数据时用空态渲染对话壳，避免 SW/JS 挂死白屏
  const state = data?.state ?? EMPTY_AGENT_STATE;
  const known = data?.known;
  const goal = state?.activeGoal ?? null;
  const taskGraph = state?.taskGraph ?? null;
  const turns = state?.turns ?? [];
  const assets = state?.assets ?? [];
  const pendingQuestions = state?.pendingQuestions ?? [];
  const pendingDecisions = state?.pendingDecisions ?? [];
  const activeDrill = state?.activeDrill ?? null;
  const interactionHints = state?.interactionHints ?? null;
  const followUps = interactionHints?.followUps ?? [];
  const isEmpty = turns.length === 0 && !goal;

  // 待答槽变化时裁掉已答草稿；有改动则防抖落库
  useEffect(() => {
    if (!slotDraftsHydratedRef.current) return;
    const pending = new Set(pendingQuestions.map((q) => q.slot));
    setSlotDrafts((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!pending.has(k)) {
          changed = true;
          continue;
        }
        next[k] = v;
      }
      return changed ? next : prev;
    });
  }, [pendingQuestions]);

  useEffect(() => {
    if (!slotDraftsHydratedRef.current || !projectId) return;
    if (pendingQuestions.length === 0 && Object.keys(slotDrafts).length === 0) {
      return;
    }
    const t = window.setTimeout(() => {
      saveSlotDraftsMut.mutate({ projectId, drafts: slotDrafts });
    }, 900);
    return () => window.clearTimeout(t);
    // 仅随草稿内容落库；mutation 对象不必入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotDrafts, projectId, pendingQuestions.length]);
  const knownLine = [
    known?.brandName,
    known?.city,
    known?.category,
    known?.focus?.[0],
  ]
    .filter(Boolean)
    .join(" · ");
  const choiceBySlot = useMemo(() => {
    const map = new Map<
      string,
      Array<{ label: string; value: string }>
    >();
    for (const c of interactionHints?.choicePrompts ?? []) {
      map.set(c.slot, c.options);
    }
    return map;
  }, [interactionHints?.choicePrompts]);

  const radar = scanData?.dailyScan?.radar;
  const primary = radar?.primary || radar?.changes?.[0] || null;
  const aiSuggestion = primary
    ? clip(
        primary.suggestion ||
          primary.judgment ||
          primary.meaning ||
          primary.title ||
          "",
        56,
      )
    : null;
  const observeUtterance = primary
    ? clip(
        [
          primary.title,
          primary.judgment || primary.meaning || primary.reason,
          primary.suggestion ? `建议：${primary.suggestion}` : "",
        ]
          .filter(Boolean)
          .join("。"),
        400,
      )
    : "";

  const busy =
    compileMut.isPending ||
    uploading ||
    speechUploading ||
    freshMut.isPending ||
    deleteHistoryMut.isPending;
  const hasContent = Boolean(draft.trim() || pendingFile);

  const history = useMemo<AgentHistoryItem[]>(() => {
    const items: AgentHistoryItem[] = [];
    const latestTurnCat = [...turns]
      .reverse()
      .find((t) => t.categoryLabel || t.categorySlug);
    if (goal) {
      items.push({
        id: goal.goalId,
        title: goal.title,
        subtitle: goal.currentStage
          ? `进行中 · ${goal.currentStage}`
          : `进度 ${goal.progress}%`,
        active: true,
        kind: "current",
        categorySlug: latestTurnCat?.categorySlug,
        categoryLabel: latestTurnCat?.categoryLabel || "其他经营",
      });
    } else if (!isEmpty) {
      items.push({
        id: "current-thread",
        title: "当前对话",
        subtitle: `${turns.length} 条消息`,
        active: true,
        kind: "current",
        categorySlug: latestTurnCat?.categorySlug,
        categoryLabel: latestTurnCat?.categoryLabel || "其他经营",
      });
    }
    for (const a of assets.slice(0, 12)) {
      if (goal && a.goalId === goal.goalId) continue;
      items.push({
        id: a.assetId,
        title: a.title,
        subtitle: a.categoryLabel || a.type,
        kind: "asset",
        categorySlug: a.categorySlug,
        categoryLabel: a.categoryLabel || "其他经营",
      });
    }
    if (radar?.summaryLine) {
      items.push({
        id: "radar",
        title: "经营动态",
        subtitle: clip(radar.summaryLine, 36),
        kind: "radar",
        categorySlug: "store-operations",
        categoryLabel: "门店经营",
      });
    }
    return items;
  }, [assets, goal, isEmpty, radar?.summaryLine, turns]);

  const runCompile = useCallback(
    async (opts: {
      trigger: "utterance" | "file" | "continue" | "confirm_slot" | "observe";
      utterance?: string;
      slotPatches?: Record<string, string>;
      fileRefs?: Array<{ id: string; kind: FileKind; label: string }>;
      signalId?: string;
    }) => {
      const files =
        opts.fileRefs ??
        (pendingFile
          ? [
              {
                id: pendingFile.id,
                kind: pendingFile.kind,
                label: pendingFile.label,
              },
            ]
          : undefined);
      const res = await compileMut.mutateAsync({
        projectId,
        trigger: opts.trigger,
        utterance: opts.utterance,
        goalId: goal?.goalId,
        slotPatches: opts.slotPatches,
        fileRefs: files,
        signalId: opts.signalId,
      });
      setPendingFile(null);
      setDraft("");
      setSlotDrafts({});
      if (files?.length && res.meta?.fileReadable === false) {
        setFileHint("这份文件没读出文字，请补充说明或改传 CSV/xlsx");
      } else {
        setFileHint(null);
      }
      // P4：资产优先——有新资产时直接打开，而非只留在气泡里
      if (res.output.artifacts[0]) {
        setViewAsset(res.output.artifacts[0]!);
      }
    },
    [compileMut, goal?.goalId, pendingFile, projectId],
  );

  // 色卡跟随待答题：优先未答，否则第一题
  useEffect(() => {
    if (!pendingQuestions.length) {
      setGuideSlot(null);
      return;
    }
    const still = pendingQuestions.some((q) => q.slot === guideSlot);
    if (still) return;
    const firstEmpty = pendingQuestions.find((q) => {
      const opts = choiceBySlot.get(q.slot);
      if (opts?.length) return true; // 选择题未点选前仍在列表里
      return !(slotDrafts[q.slot] || "").trim();
    });
    setGuideSlot((firstEmpty || pendingQuestions[0])!.slot);
  }, [pendingQuestions, guideSlot, choiceBySlot, slotDrafts]);

  // 同步给语音回调用的最新槽位上下文（避免闭包过期）
  useEffect(() => {
    slotVoiceContextRef.current = {
      pendingQuestions,
      choiceBySlot,
      slotDrafts,
      goalBlocked: goal?.status === "blocked" && pendingQuestions.length > 0,
      preferSlot: guideSlot,
    };
  }, [pendingQuestions, choiceBySlot, slotDrafts, goal?.status, guideSlot]);

  const advanceGuideAfter = useCallback(
    (answeredSlot: string, nextDrafts: Record<string, string>) => {
      const rest = pendingQuestions.filter((q) => q.slot !== answeredSlot);
      const next = rest.find((q) => {
        if (choiceBySlot.get(q.slot)?.length) return true;
        return !(nextDrafts[q.slot] || "").trim();
      });
      if (next) setGuideSlot(next.slot);
    },
    [pendingQuestions, choiceBySlot],
  );

  const applyVoiceOrTextToSlots = useCallback(
    async (rawText: string) => {
      const ctx = slotVoiceContextRef.current;
      const utterance = latestVoiceUtterance(rawText);
      if (!utterance || compileMut.isPending) return false;

      if (!ctx.goalBlocked) {
        setDraft(utterance);
        await runCompile({ trigger: "utterance", utterance });
        return true;
      }

      const routed = routeVoiceToSlots({
        utterance,
        questions: ctx.pendingQuestions,
        choiceBySlot: ctx.choiceBySlot,
        slotDrafts: ctx.slotDrafts,
        preferSlot: ctx.preferSlot,
      });

      if (routed.kind === "choice") {
        setDraft("");
        advanceGuideAfter(routed.slot, ctx.slotDrafts);
        await runCompile({
          trigger: "confirm_slot",
          slotPatches: { [routed.slot]: routed.value },
          utterance: routed.value,
        });
        return true;
      }

      if (routed.kind === "fill_slot") {
        const nextDrafts = { ...ctx.slotDrafts, [routed.slot]: routed.value };
        setSlotDrafts((s) => ({ ...s, [routed.slot]: routed.value }));
        setDraft("");
        if (routed.allTextFilled) {
          const cleaned = Object.fromEntries(
            Object.entries(nextDrafts).filter(([, v]) => String(v).trim()),
          );
          await runCompile({
            trigger: "confirm_slot",
            slotPatches: cleaned,
            utterance,
          });
        } else {
          advanceGuideAfter(routed.slot, nextDrafts);
          window.requestAnimationFrame(() => composerRef.current?.focus());
        }
        return true;
      }

      // freeform：整段作为补充继续
      setDraft(utterance);
      const patches = Object.fromEntries(
        Object.entries(ctx.slotDrafts).filter(([, v]) => String(v).trim()),
      );
      await runCompile({
        trigger: Object.keys(patches).length ? "confirm_slot" : "utterance",
        utterance,
        slotPatches: Object.keys(patches).length ? patches : undefined,
      });
      return true;
    },
    [compileMut.isPending, runCompile, advanceGuideAfter],
  );

  voiceCompileRef.current = (fullText: string) => {
    void applyVoiceOrTextToSlots(fullText);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length, busy, pendingQuestions.length]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text && !pendingFile) return;
    try {
      if (pendingFile && !text) {
        await runCompile({ trigger: "file", utterance: undefined });
        return;
      }
      await applyVoiceOrTextToSlots(text);
    } catch {
      /* 错误由 compileMut.error 展示 */
    }
  };

  const onPickChoice = async (slot: string, value: string) => {
    advanceGuideAfter(slot, slotDrafts);
    await runCompile({
      trigger: "confirm_slot",
      slotPatches: { [slot]: value },
      utterance: value,
    });
  };

  /**
   * 首页只挂已实现专业 Agent 入口（与能力页同源）：
   * M-PNT 品牌定位 · M-MKT 市场机会 · M-BIZ 商业模式 · M-ED 股权 ·
   * 门店体检（经营感知/画像）· 去拍板
   */
  const scenarioStarts = [
    {
      kind: "href" as const,
      label: "品牌定位",
      href: `/projects/${projectId}/positioning`,
    },
    {
      kind: "href" as const,
      label: "市场机会",
      href: `/projects/${projectId}/market`,
    },
    {
      kind: "href" as const,
      label: "商业模式",
      href: `/projects/${projectId}/business`,
    },
    {
      kind: "href" as const,
      label: "股权诊断",
      href: `/projects/${projectId}/equity`,
    },
    {
      kind: "href" as const,
      label: "门店体检",
      href: `/projects/${projectId}/restaurant-intelligence`,
    },
    {
      kind: "href" as const,
      label: "决策拍板",
      href: `/projects/${projectId}/decision-room?intake=voice`,
    },
  ];

  const onUpload = async (file: File) => {
    setUploading(true);
    setFileHint(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("projectId", projectId);
      fd.set("title", file.name);
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => null)) as {
        asset?: { id?: string };
        id?: string;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(body?.error || "上传失败");
      const id = body?.asset?.id ?? body?.id;
      if (!id) throw new Error("上传成功但未返回文件 id");
      const fileRefItem = {
        id,
        label: file.name,
        kind: guessFileKind(file.name),
      };
      setPendingFile(fileRefItem);
      await runCompile({ trigger: "file", fileRefs: [fileRefItem] });
    } catch (e) {
      alert(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const onSubmitSlots = async () => {
    const patches: Record<string, string> = {};
    pendingQuestions.forEach((q, i) => {
      const v = slotDrafts[q.slot]?.trim() || slotDrafts[`q${i}`]?.trim();
      if (v) patches[q.slot] = v;
    });
    if (Object.keys(patches).length === 0) return;
    await runCompile({
      trigger: "confirm_slot",
      utterance: draft.trim() || undefined,
      slotPatches: patches,
    });
  };

  const focusComposer = (seed?: string) => {
    if (seed) setDraft(seed);
    window.requestAnimationFrame(() => {
      const el = composerRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  };

  const onNewChat = () => {
    void freshMut.mutateAsync({ projectId }).then(() => {
      focusComposer();
    });
  };

  const onSelectHistory = (item: AgentHistoryItem) => {
    if (item.kind === "current") {
      // 回到当前持续对话线程
      focusComposer();
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      return;
    }
    if (item.kind === "asset") {
      const a = assets.find((x) => x.assetId === item.id);
      if (a) setViewAsset(a);
      return;
    }
    if (item.kind === "radar") {
      window.location.href = "/dashboard?radar=1";
    }
  };

  const onDeleteHistory = async (item: AgentHistoryItem) => {
    if (item.kind === "radar") return;
    const kind = item.kind === "current" ? "current" : "asset";
    await deleteHistoryMut.mutateAsync({
      projectId,
      kind,
      id: item.id,
    });
  };

  if (isError && !data) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#F7F6F2] px-6 text-center">
        <p className="text-[15px] font-medium text-[#2F3A28]">对话暂时打不开</p>
        <p className="max-w-sm text-[13px] leading-5 text-[#6f747b]">
          {error?.message || "请检查登录状态后重试"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-11 items-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white"
          >
            重试
          </button>
          <a
            href="/fix-cache.html?from=agent-error"
            className="inline-flex min-h-11 items-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#2F3A28] no-underline"
          >
            清理缓存
          </a>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#2F3A28] no-underline"
          >
            重新登录
          </Link>
        </div>
      </div>
    );
  }

  const contextLine = [
    known?.brandName,
    known?.city,
    known?.focus?.length ? known.focus.slice(0, 2).join("、") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const headerTitle = goal?.title
    ? clip(goal.title, 22)
    : data?.projectName || "MealKey";

  return (
    <div
      data-mk-hydrated="1"
      className="relative flex h-[100dvh] w-full overflow-hidden bg-[#F7F6F2] lg:bg-white"
    >
      <AgentChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projectId={projectId}
        projectName={data?.projectName}
        ownerName={data?.ownerName}
        brandLine={contextLine}
        history={history}
        onNewChat={onNewChat}
        onSelectHistory={onSelectHistory}
        onDeleteHistory={onDeleteHistory}
        deleteDisabled={busy}
        newChatDisabled={busy}
      />

      {/* 主列：ChatGPT Web = 轻顶栏 + 居中消息列 + 底 Composer */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[#F7F6F2] lg:bg-white">
        {(isLoading || isFetching) && !data && !syncGaveUp ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(102,115,94,0.18)] bg-[#F1F3EC] px-3 py-2 text-[12px] text-[#5f6368]">
            <span>正在同步经营上下文…</span>
            <a href="/clear" className="font-medium underline underline-offset-2">
              打不开？清理缓存
            </a>
          </div>
        ) : null}
        {syncGaveUp && !data ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(180,124,92,0.28)] bg-[#FFF6F0] px-3 py-2 text-[12px] text-[#8A4F31]">
            <span>同步较慢，可先点下方场景试用</span>
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => {
                setSyncGaveUp(false);
                void refetch();
              }}
            >
              重试
            </button>
          </div>
        ) : null}
        <header className="flex shrink-0 items-center justify-between gap-1 border-b border-[rgba(24,24,23,0.06)] px-2 pb-1.5 pt-[max(0.4rem,env(safe-area-inset-top))] lg:px-4 lg:py-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] text-[#202124] hover:bg-black/[0.04]"
            aria-label={sidebarOpen ? "收起菜单" : "打开菜单"}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 text-center lg:text-left">
            <div className="mx-auto inline-flex max-w-full flex-col items-center lg:mx-0 lg:items-start">
              <span className="truncate font-display text-[15px] font-semibold tracking-[-0.03em] text-[#181817]">
                MealKey
                <span className="ml-1.5 hidden font-sans text-[13px] font-normal text-[#8a8680] sm:inline">
                  · {headerTitle === "MealKey" ? "餐饮经营 AI" : headerTitle}
                </span>
              </span>
              <p className="truncate text-[11px] text-[#8a8680] lg:hidden">
                {contextLine || "餐饮经营 AI"}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className="hidden h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#66735E] no-underline hover:bg-black/[0.04] sm:inline-flex"
          >
            经营动态
          </Link>
          <Link
            href={`/projects/${projectId}/decision-room`}
            prefetch={false}
            className="hidden h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#66735E] no-underline hover:bg-black/[0.04] sm:inline-flex"
          >
            去拍板
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={onNewChat}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] px-2 text-[#202124] hover:bg-black/[0.04] disabled:opacity-40"
            aria-label="新对话"
            title="新对话"
          >
            <SquarePen className="h-5 w-5" />
            <span className="hidden text-[13px] font-medium sm:inline">新对话</span>
          </button>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2 lg:px-6 lg:pt-6"
        >
          {compileMut.error ? (
            <p className="mb-3 rounded-2xl bg-[#fff8f6] px-3 py-2 text-[13px] text-[#8a3a2a]">
              {compileMut.error.message || "宿主需要大模型在线"}
            </p>
          ) : null}
          {fileHint ? (
            <p className="mb-3 rounded-2xl bg-[#fffbf2] px-3 py-2 text-[13px] text-[#7a5a2a]">
              {fileHint}
            </p>
          ) : null}

          {isEmpty ? (
            <AgentEmptyThreeEasy
              greeting={greeting}
              ownerName={data?.ownerName}
              knownLine={knownLine}
              primaryQuestion={
                radar?.summaryLine
                  ? clip(radar.summaryLine, 48)
                  : "今天最想先解决哪一件经营事？"
              }
              busy={busy}
              projectId={projectId}
              scenarioStarts={scenarioStarts}
              assets={assets}
              aiSuggestion={aiSuggestion}
              observeUtterance={observeUtterance}
              onStartTalk={() => {
                setFileHint("按住底部绿色麦克风说话；也可打字。");
                focusComposer();
                window.setTimeout(() => setFileHint(null), 4000);
              }}
              onUpload={() => fileRef.current?.click()}
              onDiagnose={() =>
                void runCompile({
                  trigger: "utterance",
                  utterance: "最近生意不好，帮我做一次门店体检",
                })
              }
              onViewAsset={() => {
                if (assets[0]) setViewAsset(assets[0]);
              }}
              onContinueAsset={() => {
                if (assets[0]) {
                  focusComposer(
                    `关于「${clip(assets[0].title, 24)}」，我想继续追问：`,
                  );
                }
              }}
              onObserve={() => {
                if (!observeUtterance) return;
                void runCompile({
                  trigger: "observe",
                  utterance: observeUtterance,
                  signalId: primary?.id,
                });
              }}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 pb-4 lg:pb-8">
              {(knownLine || interactionHints || goal) &&
              activeDrill?.status !== "awaiting_answer" ? (
                <div className="rounded-2xl border border-[rgba(24,24,23,0.06)] bg-white/90 px-3.5 py-2.5">
                  {knownLine ? (
                    <p className="text-[11px] leading-5 text-[#66735E]">
                      认识你 · {knownLine}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {interactionHints?.behaviorLabel ? (
                      <span className="text-[11px] font-medium text-[#4a5344]">
                        {interactionHints.behaviorLabel}
                      </span>
                    ) : null}
                    {goal ? (
                      <span className="min-w-0 truncate text-[12px] text-[#181817]">
                        目标 · {goal.title}
                        {goal.currentStage ? ` · ${goal.currentStage}` : ""}
                      </span>
                    ) : null}
                    {goal ? (
                      <span className="text-[11px] text-[#8a8680]">
                        {goal.progress}%
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {activeDrill?.status === "awaiting_answer" ? (
                <div className="rounded-xl border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.06)] px-3.5 py-2.5 text-[12px] leading-5 text-[#4a5344]">
                  能力陪练进行中 · {activeDrill.title}
                  <span className="text-[#8a8680]">
                    {" "}
                    · 请按情境回复；说「退出练习」可结束
                  </span>
                </div>
              ) : null}
              {goal ? (
                <div className="space-y-2 rounded-2xl bg-white/90 px-3 py-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runCompile({ trigger: "continue", utterance: "继续" })
                    }
                    className="flex w-full items-center gap-3 text-left disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#181817]">
                        {goal.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8a8680]">
                        {goal.currentStage
                          ? `继续推进 · ${goal.currentStage}`
                          : `进度 ${goal.progress}%`}
                      </p>
                    </div>
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-[rgba(24,24,23,0.08)]">
                      <div
                        className="h-full bg-[#181817]"
                        style={{
                          width: `${Math.min(100, Math.max(0, goal.progress))}%`,
                        }}
                      />
                    </div>
                  </button>
                  {taskGraph?.nodes?.length ? (
                    <div className="flex flex-wrap gap-1.5 border-t border-[rgba(24,24,23,0.06)] pt-2">
                      {taskGraph.nodes.map((n) => (
                        <span
                          key={n.id}
                          className={
                            n.status === "done"
                              ? "rounded-full bg-[rgba(102,115,94,0.12)] px-2 py-0.5 text-[10px] text-[#4a5344]"
                              : n.status === "active"
                                ? "rounded-full bg-[#181817] px-2 py-0.5 text-[10px] text-white"
                                : "rounded-full bg-[rgba(24,24,23,0.06)] px-2 py-0.5 text-[10px] text-[#8a8680]"
                          }
                        >
                          {n.title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {turns.map((t) => (
                <div
                  key={t.id}
                  className={
                    t.role === "user"
                      ? "ml-10 rounded-[22px] bg-[#181817] px-4 py-3 text-[15px] leading-6 text-white"
                      : "mr-2 whitespace-pre-wrap text-[15px] leading-7 text-[#202124]"
                  }
                >
                  {t.role === "assistant" && t.categoryLabel ? (
                    <p className="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-[#66735E]">
                      {t.categoryLabel}
                    </p>
                  ) : null}
                  {t.text}
                  {t.artifactIds?.length ? (
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-1 text-[13px] text-[#66735E] underline"
                      onClick={() => {
                        const a = assets.find((x) =>
                          t.artifactIds?.includes(x.assetId),
                        );
                        if (a) setViewAsset(a);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      查看结果
                      {assets.find((x) => t.artifactIds?.includes(x.assetId))
                        ?.categoryLabel
                        ? ` · ${
                            assets.find((x) =>
                              t.artifactIds?.includes(x.assetId),
                            )!.categoryLabel
                          }`
                        : ""}
                    </button>
                  ) : null}
                </div>
              ))}

              {pendingDecisions[0] ? (
                <div className="rounded-2xl border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
                  <p className="text-[13px] font-medium text-[#181817]">
                    {pendingDecisions[0].title}
                  </p>
                  <p className="mt-1 text-[12px] text-[#8a8680]">
                    {pendingDecisions[0].reason}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || ackDecisionMut.isPending}
                      onClick={() => {
                        const title = pendingDecisions[0]!.title;
                        void ackDecisionMut
                          .mutateAsync({
                            projectId,
                            title,
                            action: "open_decision_room",
                          })
                          .then((res) => {
                            if (res.ok && res.href)
                              window.location.href = res.href;
                          });
                      }}
                      className="rounded-full bg-[#181817] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                    >
                      去拍板
                    </button>
                    <button
                      type="button"
                      disabled={busy || ackDecisionMut.isPending}
                      onClick={() =>
                        void ackDecisionMut.mutateAsync({
                          projectId,
                          title: pendingDecisions[0]!.title,
                          action: "dismiss",
                        })
                      }
                      className="rounded-full px-3 py-2 text-[12px] text-[#66735E]"
                    >
                      稍后
                    </button>
                  </div>
                </div>
              ) : null}

              {pendingQuestions.length > 0 && goal?.status === "blocked" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <p className="text-[12px] font-medium text-[#4a5344]">
                      {interactionHints?.behaviorState === "diagnose"
                        ? "先定位问题，再谈方案"
                        : "补充后继续"}
                    </p>
                    <p className="text-[11px] tabular-nums text-[#8a8680]">
                      {Math.max(
                        1,
                        pendingQuestions.findIndex((q) => q.slot === guideSlot) +
                          1,
                      )}
                      /{pendingQuestions.length}
                    </p>
                  </div>
                  {/* 题号色点：当前题高亮，可点切换 */}
                  <div className="flex flex-wrap gap-1.5 px-0.5">
                    {pendingQuestions.map((q, i) => {
                      const active = q.slot === guideSlot;
                      const answered = Boolean(
                        (slotDrafts[q.slot] || "").trim(),
                      );
                      return (
                        <button
                          key={q.slot}
                          type="button"
                          onClick={() => {
                            setGuideSlot(q.slot);
                            focusComposer();
                          }}
                          className={`h-2.5 rounded-full transition-all ${
                            active
                              ? "w-7 bg-[#66735E]"
                              : answered
                                ? "w-2.5 bg-[rgba(102,115,94,0.45)]"
                                : "w-2.5 bg-[rgba(24,24,23,0.12)]"
                          }`}
                          aria-label={`第 ${i + 1} 题${active ? "（当前）" : ""}`}
                        />
                      );
                    })}
                  </div>
                  {pendingQuestions.map((q) => {
                    const active = q.slot === guideSlot;
                    if (!active) return null;
                    const opts = choiceBySlot.get(q.slot);
                    const draftAnswer = (slotDrafts[q.slot] || "").trim();
                    return (
                      <div
                        key={q.slot}
                        className="space-y-3 rounded-[20px] border border-[rgba(102,115,94,0.35)] bg-[linear-gradient(165deg,#E8EDE4_0%,#F7F6F2_50%,#FFFFFF_100%)] px-4 py-4 shadow-[0_12px_32px_rgba(102,115,94,0.14)]"
                      >
                        <p className="text-[11px] font-medium tracking-[0.1em] text-[#4a5344]">
                          当前要答 · 用底部说话或打字
                        </p>
                        <p className="text-[17px] font-semibold leading-6 tracking-[-0.02em] text-[#181817]">
                          {q.prompt}
                        </p>
                        {opts?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {opts.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void onPickChoice(q.slot, opt.value)
                                }
                                className="min-h-11 rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-3.5 py-2 text-[13px] font-medium text-[#181817] shadow-[0_2px_8px_rgba(24,24,23,0.04)] transition active:scale-[0.98] disabled:opacity-50"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {draftAnswer ? (
                              <p className="rounded-xl border border-[rgba(102,115,94,0.2)] bg-white/90 px-3 py-2 text-[13px] leading-5 text-[#3a3a38]">
                                已记：{draftAnswer}
                              </p>
                            ) : null}
                            <p className="text-[12px] leading-5 text-[#4a5344]">
                              按住底部黑色麦克风说完即可，不必在卡片里打字。
                            </p>
                          </div>
                        )}
                        {opts?.length ? (
                          <p className="text-[11px] text-[#8a8680]">
                            可点选项，也可对底部麦说选项原文
                          </p>
                        ) : pendingQuestions.some(
                            (x) =>
                              !choiceBySlot.has(x.slot) &&
                              (slotDrafts[x.slot] || "").trim(),
                          ) ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onSubmitSlots()}
                            className="min-h-11 w-full rounded-full bg-[#181817] text-[14px] font-medium text-white disabled:opacity-50"
                          >
                            已记几条，提交并继续
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {/* 其余题：折叠色卡条，点一下移过来 */}
                  {pendingQuestions.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {pendingQuestions.map((q, i) => {
                        if (q.slot === guideSlot) return null;
                        const answered = Boolean(
                          (slotDrafts[q.slot] || "").trim(),
                        );
                        return (
                          <button
                            key={q.slot}
                            type="button"
                            onClick={() => {
                              setGuideSlot(q.slot);
                              focusComposer();
                            }}
                            className="min-w-[7.5rem] shrink-0 rounded-2xl border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2.5 text-left"
                          >
                            <p className="text-[10px] text-[#9a968e]">
                              {answered ? "已记" : "待答"} · {i + 1}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#3a3a38]">
                              {q.prompt}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {assets.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium tracking-[0.04em] text-[#8a8680]">
                    经营资产（结果，不是聊天记录）
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewAsset(assets[0]!)}
                    className="w-full rounded-2xl border border-[rgba(24,24,23,0.08)] bg-white px-3.5 py-3 text-left"
                  >
                    <p className="text-[13px] font-medium text-[#181817]">
                      {assets[0]!.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#8a8680]">
                      {clip(
                        assets[0]!.body.replace(/[#>*`\-]/g, " ").trim(),
                        90,
                      )}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-[#66735E]">
                      打开完整资产 →
                    </p>
                  </button>
                  {assets.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {assets.slice(1, 6).map((a) => (
                        <button
                          key={a.assetId}
                          type="button"
                          onClick={() => setViewAsset(a)}
                          className="shrink-0 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1.5 text-[12px] text-[#202124]"
                        >
                          {a.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {followUps.length > 0 && !busy ? (
                <div className="flex flex-wrap gap-2">
                  {followUps.map((f) => (
                    <button
                      key={f.utterance}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runCompile({
                          trigger: "utterance",
                          utterance: f.utterance,
                        })
                      }
                      className="rounded-full border border-[rgba(102,115,94,0.35)] bg-[rgba(102,115,94,0.08)] px-3 py-1.5 text-[12px] font-medium text-[#4a5344] disabled:opacity-50"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {busy ? (
                <p className="text-[13px] text-[#8a8680]">
                  {interactionHints?.behaviorState === "diagnose"
                    ? "正在拆解经营变量…"
                    : "正在理解你的经营目标…"}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <footer className="shrink-0 bg-[#F7F6F2] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:bg-white lg:px-6 lg:pb-6 lg:pt-3">
          <div className="mx-auto max-w-3xl">
          {pendingFile ? (
            <div className="mb-2 flex items-center justify-between rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px]">
              <span className="truncate">{pendingFile.label}</span>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                aria-label="移除"
              >
                <X className="h-4 w-4 text-[#8a8680]" />
              </button>
            </div>
          ) : null}
          {goal?.status === "blocked" && guideSlot ? (
            <p className="mb-1.5 px-1 text-[12px] leading-5 text-[#4a5344]">
              底部回答色卡题：
              <span className="font-medium">
                {clip(
                  pendingQuestions.find((q) => q.slot === guideSlot)?.prompt ||
                    pendingQuestions[0]?.prompt ||
                    "",
                  28,
                )}
              </span>
            </p>
          ) : null}
          <HoldToTalkBanner
            recording={recording && activeFieldId === "mobile-agent"}
            seconds={recordingSeconds}
            maxSeconds={maxVoiceSeconds}
            tip={
              speechError ||
              (speechUploading
                ? "正在听成字…"
                : !speechSupported
                  ? "语音受限时可打字或点 + 上传；微信请用系统浏览器打开以启用麦克风"
                  : null)
            }
          />
          {!recording && speechSupported ? (
            <p className="mb-1 px-1 text-[11px] text-[#9a968e] lg:hidden">
              按住说话松手继续；也可点按或按空格切换录音
            </p>
          ) : null}

          <div className="flex items-end gap-1.5 rounded-[20px] border border-[rgba(24,24,23,0.12)] bg-white px-1.5 py-1.5 shadow-[0_8px_22px_rgba(24,24,23,0.06)] lg:rounded-[18px]">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onUpload(f);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex h-12 w-11 shrink-0 items-center justify-center rounded-full text-[#3a3a38] disabled:opacity-40"
              aria-label="上传文件"
            >
              <Plus className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder={
                recording
                  ? "正在听你说…"
                  : goal?.status === "blocked" && guideSlot
                    ? `回答：${clip(
                        pendingQuestions.find((q) => q.slot === guideSlot)
                          ?.prompt || "",
                        20,
                      )}`
                    : isEmpty
                      ? "按住说话，或输入经营问题…"
                      : "继续说，或打字追问…"
              }
              className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent py-3 text-[15px] leading-6 text-[#181817] outline-none placeholder:text-[#9a968e]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            {busy && !recording ? (
              <div className="flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#66735E]" />
              </div>
            ) : (
              <HoldToTalkButton
                recording={recording && activeFieldId === "mobile-agent"}
                disabled={busy && !recording}
                hasContent={hasContent}
                onSend={() => void onSend()}
                onPressStart={() => {
                  voiceTargetRef.current = "composer";
                  void startFieldRecording("mobile-agent", draft, setDraft);
                }}
                onPressEnd={() => stopRecording()}
              />
            )}
          </div>
          </div>
        </footer>
      </div>

      {viewAsset ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[24px] bg-white sm:rounded-[24px]">
            <div className="flex items-center justify-between border-b border-[rgba(24,24,23,0.06)] px-4 py-3">
              <div>
                <p className="text-[15px] font-semibold">{viewAsset.title}</p>
                <p className="text-[11px] text-[#8a8680]">{viewAsset.version}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewAsset(null)}
                aria-label="关闭"
              >
                <X className="h-5 w-5 text-[#8a8680]" />
              </button>
            </div>
            <pre className="overflow-y-auto whitespace-pre-wrap px-4 py-4 text-[13px] leading-6">
              {viewAsset.body}
            </pre>
            <div className="border-t border-[rgba(24,24,23,0.06)] p-3">
              <Link
                href={`/projects/${projectId}/decision-room`}
                prefetch={false}
                className="flex min-h-11 items-center justify-center rounded-full bg-[#181817] text-[14px] font-medium text-white no-underline"
              >
                去拍板确认
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MobileAgentPage() {
  const params = useParams();
  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";

  if (!projectId) {
    return <div className="p-6 text-[14px] text-[#6f747b]">缺少项目</div>;
  }

  return (
    <PageErrorBoundary>
      <AgentPageInner projectId={projectId} />
    </PageErrorBoundary>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import {
  VoiceDecisionComposer,
  deriveDecisionBriefFromSpeech,
} from "@/components/operating/VoiceDecisionComposer";
import { VoiceDecisionDialogue } from "@/components/operating/VoiceDecisionDialogue";
import { DecisionClosedActions } from "@/components/operating/DecisionLoopRail";
import { EngineDegradationBanner } from "@/components/operating/EngineDegradationBanner";
import { VoiceInputRow } from "@/components/operating/VoiceInputRow";
import {
  clearDecisionVoiceBrief,
  readDecisionVoiceBrief,
  type DecisionVoiceBrief,
} from "@/lib/decision-voice-brief";
import { buildDecisionBriefFromFocus } from "@/lib/decision-brief-from-scan";
import { trpc } from "@/lib/trpc";
import { formatTrpcMutationError } from "@/lib/trpc-mutation-error";
import {
  buildCouncilArchiveExtras,
  decisionRoomPhaseLabel,
  type CouncilMeetingSession,
  type CouncilRoleId,
  type EvidenceGapAction,
} from "@mealkey/agents/founder-os";

type Mode = "major" | "special";
type Step = "setup" | "round1" | "debate" | "board" | "closed";

const POSITION_LABEL: Record<string, string> = {
  support: "支持",
  oppose: "反对",
  conditional: "条件",
};

const DEBATE_PHASE_LINES = [
  "独立审阅议程与证据…",
  "对齐冲突与底线…",
  "汇总质询矩阵…",
];

function WorkProgressPanel({
  title,
  phaseLine,
  elapsedSec,
  seatCount,
}: {
  title: string;
  phaseLine: string;
  elapsedSec: number;
  /** 诚实席位数；不做假「表态中」轮转 */
  seatCount?: number;
}) {
  const pct = Math.min(92, Math.round((elapsedSec / 18) * 100));
  return (
    <div
      className="space-y-3 border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#202124]">
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
            {title}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#5f6368]">
            {phaseLine}
            {seatCount && seatCount > 0 ? ` · ${seatCount} 席` : ""}
          </p>
        </div>
        <p className="shrink-0 tabular-nums text-[12px] text-[#6f747b]">
          {elapsedSec}s
        </p>
      </div>
      <div className="h-1.5 overflow-hidden bg-[rgba(24,24,23,0.08)]">
        <div
          className="h-full bg-[#181817] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {elapsedSec >= 12 ? (
        <p className="text-[11px] leading-4 text-[#9aa0a6]">
          还在汇总，稍候即可。
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  projectId: string;
};

export function DecisionRoom({ projectId }: Props) {
  const searchParams = useSearchParams();
  const resumeRequested = searchParams.get("resume") === "1";
  const topicFromQuery = (searchParams.get("topic") || "").trim();
  const whyFromQuery = (searchParams.get("why") || "").trim();
  const intakeMode = (searchParams.get("intake") || "").trim(); // voice | ready | ''
  const meta = trpc.decisionCouncil.meta.useQuery();
  const resumeQuery = trpc.decisionCouncil.resumeActiveDraft.useQuery(
    { projectId },
    { enabled: resumeRequested },
  );
  const openMut = trpc.decisionCouncil.open.useMutation();
  const debateMut = trpc.decisionCouncil.advanceDebate.useMutation();
  const boardMut = trpc.decisionCouncil.advanceBoard.useMutation();
  const founderMut = trpc.decisionCouncil.founderDecide.useMutation();
  const supplementMut = trpc.decisionCouncil.supplementEvidence.useMutation();
  const dismissDraft = trpc.decisionCouncil.dismissActiveDraft.useMutation();
  const confirmArchive = trpc.decisionArchive.confirmFromMeeting.useMutation();

  const [mode, setMode] = useState<Mode>("major");
  const [presetId, setPresetId] = useState<string>("second_store");
  const [customTopic, setCustomTopic] = useState(topicFromQuery);
  const [roster, setRoster] = useState<CouncilRoleId[]>([
    "CSO",
    "BMO",
    "CFO",
    "CRO",
  ]);
  const [session, setSession] = useState<CouncilMeetingSession | null>(null);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [step, setStep] = useState<Step>("setup");
  const [error, setError] = useState<string | null>(null);
  const resumedRef = useRef(false);
  const [founderNote, setFounderNote] = useState("");
  const [archiveOk, setArchiveOk] = useState(false);
  const [executionStarted, setExecutionStarted] = useState<boolean | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [expertNote, setExpertNote] = useState<string | null>(null);
  const [opinionSource, setOpinionSource] = useState<string | null>(null);
  const [brandStrength, setBrandStrength] = useState<number | null>(null);
  const [whyNow, setWhyNow] = useState("");
  const [decisionQuestion, setDecisionQuestion] = useState("");
  const [constraints, setConstraints] = useState("");
  const [successLooksLike, setSuccessLooksLike] = useState("");
  const [allowStubReports, setAllowStubReports] = useState(false);
  const [allowGaps, setAllowGaps] = useState(false);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  /** 默认语音对话；一句话 / 进阶手填为辅 */
  const [setupPath, setSetupPath] = useState<"dialogue" | "oneshot">(
    intakeMode === "ready" ? "oneshot" : "dialogue",
  );
  const [readyBrief, setReadyBrief] = useState<DecisionVoiceBrief | null>(null);
  /** 判断页：正在补充的缺口 */
  const [supplementGap, setSupplementGap] = useState<EvidenceGapAction | null>(
    null,
  );
  const [supplementDraft, setSupplementDraft] = useState("");
  /** 长任务等待秒数（质询/决策板/开案） */
  const [workElapsedSec, setWorkElapsedSec] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState<string | undefined>();
  const [confirmDanger, setConfirmDanger] = useState(false);
  const confirmResolver = useRef<((ok: boolean) => void) | null>(null);

  const similarQuery = trpc.decisionCouncil.similarDecisions.useQuery(
    {
      projectId,
      topic: session?.agenda.topic || customTopic || "决策",
    },
    {
      enabled:
        Boolean(projectId) &&
        Boolean(session?.agenda.topic) &&
        (step === "board" || step === "closed"),
    },
  );

  const forceLevelForSetup = useMemo(() => {
    if (customTopic.trim()) return undefined;
    return (meta.data?.presets ?? []).find((p) => p.id === presetId)
      ?.forceLevel as "L1" | "L2" | "L3" | "L4" | undefined;
  }, [customTopic, meta.data?.presets, presetId]);

  const rosterCheck = trpc.decisionCouncil.validateRoster.useQuery(
    {
      roster,
      level: forceLevelForSetup,
    },
    { enabled: mode === "special" && roster.length > 0 },
  );
  const l4Check = trpc.decisionCouncil.checkL4Roster.useQuery(
    { roster },
    {
      enabled:
        mode === "special" &&
        forceLevelForSetup === "L4" &&
        roster.length > 0,
    },
  );

  const [historySeat, setHistorySeat] = useState<CouncilRoleId | null>(null);
  useEffect(() => {
    if (!topicFromQuery || resumeRequested) return;
    setCustomTopic((prev) => (prev.trim() ? prev : topicFromQuery));
  }, [topicFromQuery, resumeRequested]);

  useEffect(() => {
    if (resumeRequested || step !== "setup") return;
    const stored = readDecisionVoiceBrief(projectId);
    if (stored) {
      setReadyBrief(stored);
      setCustomTopic(stored.topic);
      setWhyNow(stored.whyNow);
      setDecisionQuestion(stored.decisionQuestion);
      setConstraints(stored.constraints);
      setSuccessLooksLike(stored.successLooksLike);
      if (intakeMode === "ready") setSetupPath("oneshot");
      return;
    }
    // 无 sessionStorage：用 URL topic + why 合成 Brief（入口契约兜底）
    if (intakeMode === "ready" && topicFromQuery) {
      const hydrated = buildDecisionBriefFromFocus({
        title: topicFromQuery,
        whyToday: whyFromQuery || "经营动态有变化，需要拍板下一步",
      });
      setReadyBrief(hydrated);
      setCustomTopic(hydrated.topic);
      setWhyNow(hydrated.whyNow);
      setDecisionQuestion(hydrated.decisionQuestion);
      setConstraints(hydrated.constraints);
      setSuccessLooksLike(hydrated.successLooksLike);
      setSetupPath("oneshot");
    }
  }, [
    intakeMode,
    projectId,
    resumeRequested,
    step,
    topicFromQuery,
    whyFromQuery,
  ]);

  function applyBriefAndOpen(brief: DecisionVoiceBrief) {
    setCustomTopic(brief.topic);
    setWhyNow(brief.whyNow);
    setDecisionQuestion(brief.decisionQuestion);
    setConstraints(brief.constraints);
    setSuccessLooksLike(brief.successLooksLike);
    setReadyBrief(brief);
    // 下一 tick 开案，确保 state 已写入 open 所用变量之外，直接用 brief 调 open
    void openWithBrief(brief);
  }

  async function openWithBrief(brief: DecisionVoiceBrief) {
    setArchiveOk(false);
    setError(null);
    try {
      const payload = await openMut.mutateAsync({
        projectId,
        topic: brief.topic,
        mode,
        whyNow: brief.whyNow,
        decisionQuestion: brief.decisionQuestion,
        constraints: brief.constraints,
        successLooksLike: brief.successLooksLike,
        spokenTurns: brief.spokenTurns,
        evidenceSummary: brief.evidenceSummary,
        allowStubReports,
        allowGaps,
        forceLevel,
        roster: mode === "special" ? roster : undefined,
      });
      clearDecisionVoiceBrief();
      applyPayload(payload);
      setStep("round1");
      setSupplementGap(null);
      setSupplementDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "开案失败");
    }
  }

  async function applyGapSupplement(gap: EvidenceGapAction, text: string) {
    const claim = text.trim();
    if (!claim || !session) return;
    setError(null);
    try {
      const payload = await supplementMut.mutateAsync({
        projectId,
        session,
        gapId: gap.id,
        claim,
      });
      applyPayload(payload);
      setSupplementGap(null);
      setSupplementDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "补证写入失败");
    }
  }
  useEffect(() => {
    if (!session?.roster?.length) return;
    if (historySeat && session.roster.includes(historySeat)) return;
    setHistorySeat(session.roster[0] ?? null);
  }, [session?.roster, historySeat]);

  const memberHistory = trpc.decisionCouncil.memberHistory.useQuery(
    { projectId, member: historySeat! },
    {
      enabled:
        Boolean(projectId) &&
        Boolean(historySeat) &&
        (step === "board" || step === "debate" || step === "closed"),
    },
  );

  function requestConfirm(opts: {
    title: string;
    description?: string;
    danger?: boolean;
  }): Promise<boolean> {
    setConfirmTitle(opts.title);
    setConfirmDescription(opts.description);
    setConfirmDanger(Boolean(opts.danger));
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

  const busy =
    openMut.isPending ||
    debateMut.isPending ||
    boardMut.isPending ||
    founderMut.isPending ||
    confirmArchive.isPending ||
    dismissDraft.isPending ||
    (resumeRequested && resumeQuery.isFetching && !session);

  const workPending =
    openMut.isPending || debateMut.isPending || boardMut.isPending;

  useEffect(() => {
    if (!workPending) {
      setWorkElapsedSec(0);
      return;
    }
    setWorkElapsedSec(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      setWorkElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 400);
    return () => window.clearInterval(id);
  }, [workPending, openMut.isPending, debateMut.isPending, boardMut.isPending]);

  const debatePhaseLine = useMemo(() => {
    const i = Math.min(
      DEBATE_PHASE_LINES.length - 1,
      Math.floor(workElapsedSec / 5),
    );
    return DEBATE_PHASE_LINES[i]!;
  }, [workElapsedSec]);

  useEffect(() => {
    if (!resumeRequested || resumedRef.current) return;
    if (resumeQuery.isError) {
      resumedRef.current = true;
      setError("未找到待裁决的决策，请重新开一笔");
      return;
    }
    const restored = resumeQuery.data?.session;
    if (!restored) {
      if (resumeQuery.isFetched && !resumeQuery.isFetching) {
        resumedRef.current = true;
        setError("未找到待裁决的决策，请重新开一笔");
      }
      return;
    }
    resumedRef.current = true;
    setSession(restored);
    setPhaseLabel(decisionRoomPhaseLabel(restored.phase));
    setCustomTopic(restored.agenda.topic);
    setRoster(restored.roster);
    if (restored.phase === "closed") {
      setStep("closed");
    } else if (restored.board) {
      setStep("board");
    } else {
      setStep("debate");
    }
    setError(null);
  }, [
    resumeRequested,
    resumeQuery.data,
    resumeQuery.isError,
    resumeQuery.isFetched,
    resumeQuery.isFetching,
  ]);

  const topic = useMemo(() => {
    const preset = meta.data?.presets.find((p) => p.id === presetId);
    return (customTopic.trim() || preset?.topic || "").trim();
  }, [customTopic, meta.data?.presets, presetId]);

  const forceLevel = useMemo(() => {
    return meta.data?.presets.find((p) => p.id === presetId)?.forceLevel;
  }, [meta.data?.presets, presetId]);

  function applyPayload(payload: {
    session: CouncilMeetingSession;
    phaseLabel: string;
    expertNote?: string | null;
    opinionSource?: string | null;
    brandStrength?: number | null;
  }) {
    setSession(payload.session);
    setPhaseLabel(payload.phaseLabel);
    setError(null);
    if (payload.expertNote != null) setExpertNote(payload.expertNote);
    if (payload.opinionSource != null) setOpinionSource(payload.opinionSource);
    if (payload.brandStrength != null) setBrandStrength(payload.brandStrength);
  }

  async function handleOpen() {
    if (!topic) {
      setError("先按住麦克风说清楚要决什么，或打几个字");
      return;
    }
    // 三易：口述议题可自动补齐 Brief；用户展开高级项时以手填为准
    const brief = deriveDecisionBriefFromSpeech({
      spoken: customTopic || topic,
      topic,
      whyNow,
      decisionQuestion,
      constraints,
      successLooksLike,
    });
    if (!whyNow.trim()) setWhyNow(brief.whyNow);
    if (!decisionQuestion.trim()) setDecisionQuestion(brief.decisionQuestion);
    if (!constraints.trim()) setConstraints(brief.constraints);
    if (!successLooksLike.trim()) setSuccessLooksLike(brief.successLooksLike);

    setArchiveOk(false);
    try {
      const payload = await openMut.mutateAsync({
        projectId,
        topic: brief.topic,
        mode,
        whyNow: brief.whyNow,
        decisionQuestion: brief.decisionQuestion,
        constraints: brief.constraints,
        successLooksLike: brief.successLooksLike,
        spokenTurns: [customTopic || topic, brief.whyNow, brief.constraints]
          .map((s) => s.trim())
          .filter(Boolean),
        allowStubReports,
        allowGaps,
        // major/special 均可带预设级别；专项会另传自选花名册
        forceLevel,
        roster: mode === "special" ? roster : undefined,
      });
      applyPayload(payload);
      setStep("round1");
      setSupplementGap(null);
      setSupplementDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "开案失败");
    }
  }

  async function handleDebate() {
    if (!session) return;
    setError(null);
    try {
      const payload = await debateMut.mutateAsync({ projectId, session });
      applyPayload(payload);
      setStep("debate");
    } catch (e) {
      setError(formatTrpcMutationError(e) || "质询推进失败，请再点一次");
    }
  }

  async function handleBoard() {
    if (!session) return;
    try {
      const payload = await boardMut.mutateAsync({ projectId, session });
      applyPayload(payload);
      setStep("board");
    } catch (e) {
      setError(e instanceof Error ? e.message : "形成决策板失败");
    }
  }

  async function handleFounder(
    choice: "接受委员会" | "修改方案" | "推翻委员会",
  ) {
    if (!session) return;
    try {
      // 先裁决但不清草稿：归档成功后再 dismiss，失败可续裁/重试
      const payload = await founderMut.mutateAsync({
        projectId,
        session,
        choice,
        note: founderNote || undefined,
        clearDraft: false,
      });
      applyPayload(payload);

      const board = payload.session.board;
      if (!board) {
        setStep("closed");
        return;
      }

      const support = board.supportBullets.slice(0, 6);
      const oppose = board.minorityReport.slice(0, 6);
      const confidence = Math.min(
        0.92,
        Math.max(
          0.45,
          0.55 +
            support.length * 0.04 -
            oppose.length * 0.03 +
            (payload.session.stanceMatrix?.support.length || 0) * 0.02 -
            (choice === "推翻委员会" ? 0.08 : 0),
        ),
      );

      try {
        const parentEvidenceIds = (
          payload.session.evidencePacket?.items ?? []
        )
          .map((item) => item.evidenceId)
          .filter(Boolean)
          .slice(0, 24);
        const evidenceOk = parentEvidenceIds.length >= 2;
        let allowInsufficientEvidence = choice !== "接受委员会";
        if (choice === "接受委员会" && !evidenceOk) {
          const ok = await requestConfirm({
            title: "证据不足，只能假设推进",
            description:
              "证据不足 2 条，不能当正式拍板。确认后按「假设推进」归档。",
            danger: true,
          });
          if (!ok) {
            throw new Error(
              "正式归档至少要 2 条证据。先补证据，再接受建议。",
            );
          }
          allowInsufficientEvidence = true;
        }

        const judgementByChoice =
          choice === "接受委员会"
            ? `决策建议：${board.recommendedAction}`
            : choice === "修改方案"
              ? `你修改后：${founderNote.trim() || board.recommendedAction}`
              : `你推翻建议：${founderNote.trim() || "坚持己见"}（原建议：${board.recommendedAction}）`;

        const nextActions = (
          choice === "接受委员会"
            ? [
                board.recommendedAction,
                ...board.conditions.slice(0, 2),
                board.validation[0]
                  ? `${board.validation[0].task}（指标：${board.validation[0].metric}）`
                  : "",
              ]
            : [
                founderNote.trim() ||
                  (choice === "修改方案" ? "按修改后方案推进" : "按你的决定推进"),
                ...board.conditions.slice(0, 1),
              ]
        )
          .map((a) => a.trim())
          .filter(Boolean)
          .slice(0, 4);

        const extras = buildCouncilArchiveExtras(payload.session);
        const draftDecisionId = payload.session.casePacket.caseId;
        const archivePayload = {
          projectId,
          problem: payload.session.agenda.topic,
          judgement: judgementByChoice,
          diagnosis: board.biggestDispute,
          strategy: extras.strategy || board.supportBullets.join("；"),
          action: nextActions[0] || board.recommendedAction,
          nextActions,
          observation: extras.observation,
          validationPlan: board.validation[0]
            ? `${board.validation[0].task} / ${board.validation[0].metric}`
            : undefined,
          supportClaims: support,
          opposeClaims: oppose,
          expertOpinions: extras.expertOpinions,
          meetingTitle: "拍板",
          confidence,
          parentEvidenceIds: extras.parentEvidenceIds.length
            ? extras.parentEvidenceIds
            : parentEvidenceIds,
          evidenceSufficient: evidenceOk,
          allowInsufficientEvidence,
          decisionContract: extras.decisionContract,
          draftDecisionId:
            draftDecisionId && !draftDecisionId.startsWith("DR-")
              ? draftDecisionId
              : undefined,
          councilTrace: {
            caseId: payload.session.casePacket.caseId,
            sessionId: payload.session.sessionId,
            insightCount: payload.session.insights?.length || 0,
            recommendedAction: board.recommendedAction,
            founderChoice: choice,
            decisionTrace: payload.session.decisionTrace || undefined,
          },
        };
        let archiveResult: {
          executionStarted?: boolean;
          executionError?: string | null;
        } | null = null;
        try {
          archiveResult = await confirmArchive.mutateAsync(archivePayload);
        } catch (archiveErr) {
          const msg =
            archiveErr instanceof Error ? archiveErr.message : String(archiveErr);
          const match = msg.match(/supersedesDecisionId=([a-zA-Z0-9_-]+)/);
          if (match?.[1]) {
            const ok = await requestConfirm({
              title: "以修订案覆盖旧判断？",
              description: `同题已有未归档旧判断（${match[1]}）。确认后将覆盖旧案并归档新判断。`,
              danger: true,
            });
            if (!ok) throw archiveErr;
            archiveResult = await confirmArchive.mutateAsync({
              ...archivePayload,
              supersedesDecisionId: match[1],
            });
          } else {
            throw archiveErr;
          }
        }

        try {
          await dismissDraft.mutateAsync({ projectId });
        } catch {
          // 归档已成功；清草稿失败不阻断关闭
        }
        setExecutionStarted(Boolean(archiveResult?.executionStarted));
        setExecutionError(archiveResult?.executionError || null);
        setArchiveOk(true);
        setStep("closed");
      } catch (archiveErr) {
        setStep("board");
        setError(
          archiveErr instanceof Error
            ? `裁决已形成，但写入行动失败：${archiveErr.message}。可重试，或从经营动态「待拍板」续裁。`
            : "裁决已形成，但写入行动失败，请重试",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "裁决失败");
    }
  }

  async function handleDismissDraft() {
    const ok = await requestConfirm({
      title: "放弃本次决策？",
      description: "清除经营动态「待裁决」提醒，不写入行动。",
      danger: true,
    });
    if (!ok) return;
    try {
      await dismissDraft.mutateAsync({ projectId });
      setSession(null);
      setStep("setup");
      setError(null);
      setArchiveOk(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "放弃失败");
    }
  }

  function toggleSeat(id: CouncilRoleId) {
    setRoster((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function reset() {
    if (session && step !== "setup") {
      const ok = await requestConfirm({
        title: "重新开案？",
        description: "当前进度会丢弃，需重新开场。",
        danger: true,
      });
      if (!ok) return;
    }
    setSession(null);
    setStep("setup");
    setPhaseLabel("");
    setError(null);
    setFounderNote("");
    setArchiveOk(false);
    setExpertNote(null);
    setOpinionSource(null);
    setBrandStrength(null);
  }

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      document.documentElement.style.setProperty(
        "--decision-room-vvh",
        `${Math.round(vv.height)}px`,
      );
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--decision-room-vvh");
    };
  }, []);

  return (
    <div className="mx-auto flex h-[var(--decision-room-vvh,100dvh)] max-h-[var(--decision-room-vvh,100dvh)] max-w-6xl flex-col md:max-w-7xl">
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="确认继续"
        danger={confirmDanger}
        busy={busy}
        onCancel={() => settleConfirm(false)}
        onConfirm={() => settleConfirm(true)}
      />
      <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.98)] px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:px-4">
        <Link
          href={`/projects/${projectId}/agent`}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-2.5 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
          aria-label="回对话"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>回对话</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#202124]">拍板</p>
          <p className="truncate text-[11px] tracking-[0.08em] text-[#6f747b]">
            {step === "setup" ? "说清一件事再拍板" : "拍板后可回对话、去跟进"}
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#6f747b] no-underline touch-manipulation"
          >
            去跟进
          </Link>
          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#6f747b] no-underline touch-manipulation"
          >
            经营动态
          </Link>
        </div>
        {session ? (
          <button
            type="button"
            onClick={() => void reset()}
            className="inline-flex min-h-11 items-center rounded-[12px] px-3 text-[13px] font-medium text-[#6f747b] touch-manipulation"
          >
            重新决策
          </button>
        ) : null}
      </div>
      {workPending ? (
        <div className="shrink-0 border-b border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-2.5 md:px-6">
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-[#202124]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {debateMut.isPending
              ? `质询进行中 · ${workElapsedSec}s`
              : boardMut.isPending
                ? `形成决策板 · ${workElapsedSec}s`
                : openMut.isPending
                  ? `开案中 · ${workElapsedSec}s`
                  : `处理中 · ${workElapsedSec}s`}
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-5">

      <header className="space-y-2 border-b border-[rgba(24,24,23,0.08)] pb-5">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
          {step === "board" || step === "closed"
            ? "拍板"
            : step === "round1" || step === "debate"
              ? "质询"
              : "语音开案"}
        </p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
          {step === "setup"
            ? "今天要拍什么板？"
            : step === "round1"
              ? "常委独立陈述"
              : step === "debate"
                ? "质询碰撞"
                : step === "board" || step === "closed"
                  ? "决策板 · 请拍板"
                  : "我问你说，采齐再拍"}
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-[#6f747b]">
          {step === "setup"
            ? "说清一件事，采齐再进常委判断。"
            : step === "round1"
              ? "先核对证据缺口，再进入质询碰撞。"
              : step === "debate"
                ? "看清立场与冲突，再形成决策板。"
                : step === "board"
                  ? "先看建议与争议，再拍板。"
                  : step === "closed"
                    ? "已拍板。可回对话、去跟进或经营动态。"
                    : "语音采集 → 常委判断 → 你来拍板 → 回对话跟进。"}
        </p>
        {/* 闭环轨道不进主路径首屏；降级必须置顶可见 */}
        {session &&
        (opinionSource === "heuristic" || opinionSource === "mixed") ? (
          <div className="mt-2">
            <EngineDegradationBanner
              mode={opinionSource === "heuristic" ? "heuristic" : "hybrid"}
              note={
                opinionSource === "heuristic"
                  ? "本轮常委意见为启发式强制降级，非正式深度审议；勿当作已签字结论。"
                  : "本轮意见含启发式降级席位，深度与非正式混杂；拍板前请核对证据与缺口。"
              }
              blockConfirm={step === "board"}
            />
          </div>
        ) : null}
        {session && (step === "board" || step === "closed") ? (
          <details className="mt-3 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2">
            <summary className="cursor-pointer text-[12px] font-medium text-[#66735E]">
              席位与证据细节
              {opinionSource && opinionSource !== "llm"
                ? " · 含降级"
                : ""}
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {phaseLabel ? (
                <span className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]">
                  {phaseLabel}
                </span>
              ) : null}
              <span className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]">
                {session.agenda.level}
              </span>
              {session.roster.slice(0, 4).map((seat) => (
                <span
                  key={seat}
                  className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]"
                >
                  {seat}
                </span>
              ))}
              {session.roster.length > 4 ? (
                <span className="border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]">
                  +{session.roster.length - 4}
                </span>
              ) : null}
              {brandStrength != null ? (
                <span className="border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]">
                  品牌力 {brandStrength}
                </span>
              ) : null}
              {opinionSource ? (
                <span
                  className={
                    opinionSource === "llm"
                      ? "border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 text-[11px] text-[#66735E]"
                      : "border border-[#C45C26]/40 bg-[#FFF6F0] px-2.5 py-1 text-[11px] text-[#8A4F31]"
                  }
                >
                  {opinionSource === "llm"
                    ? "深度意见"
                    : opinionSource === "mixed"
                      ? "部分降级·含启发式"
                      : "强制降级·非正式意见"}
                </span>
              ) : null}
            </div>
            {expertNote ? (
              <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                {expertNote}
              </p>
            ) : null}
            {session.evidencePacket?.gaps &&
            session.evidencePacket.gaps.length > 0 ? (
              <p className="mt-2 text-[12px] leading-5 text-[#8A4F31]">
                证据缺口：
                {session.evidencePacket.gaps.slice(0, 2).join("；")}
              </p>
            ) : null}
          </details>
        ) : session ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {phaseLabel ? (
                <span className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]">
                  {phaseLabel}
                </span>
              ) : null}
              <span className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]">
                {session.agenda.level}
              </span>
              {session.roster.slice(0, 4).map((seat) => (
                <span
                  key={seat}
                  className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]"
                >
                  {seat}
                </span>
              ))}
              {session.roster.length > 4 ? (
                <span className="border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]">
                  +{session.roster.length - 4}
                </span>
              ) : null}
              {brandStrength != null ? (
                <span className="border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]">
                  品牌力 {brandStrength}
                </span>
              ) : null}
              {opinionSource ? (
                <span
                  className={
                    opinionSource === "llm"
                      ? "border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#66735E]"
                      : "border border-[#C45C26]/40 bg-[#FFF6F0] px-2.5 py-1 text-[11px] text-[#8A4F31]"
                  }
                >
                  {opinionSource === "llm"
                    ? "深度意见"
                    : opinionSource === "mixed"
                      ? "部分降级·含启发式"
                      : "强制降级·非正式意见"}
                </span>
              ) : null}
            </div>
            {expertNote ? (
              <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                {expertNote}
              </p>
            ) : null}
            {session.evidencePacket?.gapActions &&
            session.evidencePacket.gapActions.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[12px] leading-5 text-[#8A4F31]">
                  开案提醒：口述已挂载；下列为仍缺的客观数据，点按钮即可补。
                </p>
                <div className="flex flex-wrap gap-2">
                  {session.evidencePacket.gapActions.slice(0, 3).map((gap) => (
                    <button
                      key={gap.id}
                      type="button"
                      onClick={() => {
                        setSupplementGap(gap);
                        setSupplementDraft("");
                      }}
                      className="inline-flex min-h-10 items-center gap-1 border border-[rgba(138,79,49,0.28)] bg-[rgba(138,79,49,0.06)] px-3 text-[12px] font-medium text-[#8A4F31] touch-manipulation"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      补充{gap.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("setup");
                      setSetupPath("dialogue");
                      setSupplementGap(null);
                    }}
                    className="inline-flex min-h-10 items-center border border-[rgba(24,24,23,0.1)] bg-white px-3 text-[12px] font-medium text-[#3c4043] touch-manipulation"
                  >
                    回采集再补一轮
                  </button>
                </div>
              </div>
            ) : session.evidencePacket?.gaps &&
              session.evidencePacket.gaps.length > 0 ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#8A4F31]">
                开案提醒：{session.evidencePacket.gaps.slice(0, 2).join("；")}
              </p>
            ) : null}
          </>
        ) : null}
      </header>

      {error ? (
        <p className="border border-[rgba(180,80,60,0.25)] bg-[rgba(180,80,60,0.06)] px-4 py-3 text-[13px] text-[#8a3b2a]">
          {error}
        </p>
      ) : null}

      {step === "setup" ? (
        <section className="space-y-5 border border-[rgba(24,24,23,0.08)] bg-white p-6">
          {readyBrief && intakeMode === "ready" ? (
            <div className="space-y-3 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4">
              <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
                分析已就绪 · 确认后开案
              </p>
              <p className="font-display text-[18px] font-semibold text-[#202124]">
                {readyBrief.topic}
              </p>
              <p className="text-[13px] leading-6 text-[#6f747b]">
                {[
                  readyBrief.whyNow ? `为何现在 · ${readyBrief.whyNow}` : null,
                  readyBrief.evidenceSummary?.length
                    ? `证据 ${readyBrief.evidenceSummary.length} 条`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "可直接开案；细节在下方展开。"}
              </p>
              <details className="text-[13px] leading-6 text-[#3a3d41]">
                <summary className="cursor-pointer font-medium text-[#66735E]">
                  查看 Brief 细节
                </summary>
                <ul className="mt-2 space-y-1.5">
                  <li>为何现在 · {readyBrief.whyNow}</li>
                  {readyBrief.evidenceSummary &&
                  readyBrief.evidenceSummary.length > 0 ? (
                    <li>
                      证据 ·{" "}
                      {readyBrief.evidenceSummary.slice(0, 3).join("；")}
                    </li>
                  ) : null}
                  {readyBrief.reviewQuestions &&
                  readyBrief.reviewQuestions.length > 0 ? (
                    <li>
                      复盘三问 · {readyBrief.reviewQuestions.join(" / ")}
                    </li>
                  ) : null}
                  <li>底线 · {readyBrief.constraints}</li>
                  <li>做成什么样 · {readyBrief.successLooksLike}</li>
                </ul>
              </details>
              <button
                type="button"
                disabled={busy}
                onClick={() => void openWithBrief(readyBrief)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    开始决策
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : null}

          {setupPath === "dialogue" &&
          !(readyBrief && intakeMode === "ready") ? (
            <VoiceDecisionDialogue
              projectId={projectId}
              seedTopic={topicFromQuery || customTopic || undefined}
              disabled={busy}
              completeLabel={busy ? "正在开案…" : "采齐了，开始决策"}
              onComplete={(brief) => applyBriefAndOpen(brief)}
            />
          ) : null}

          {setupPath === "oneshot" &&
          !(readyBrief && intakeMode === "ready") ? (
            <VoiceDecisionComposer
              projectId={projectId}
              value={customTopic}
              onChange={setCustomTopic}
              onSubmit={() => void handleOpen()}
              submitLabel={busy ? "正在开案…" : "说完了，开始决策"}
              placeholder="按住右边说：我在纠结要不要…因为…"
              cloudTitle="拍板·口述开案"
              fieldId="decision-room-topic"
              rows={4}
              disabled={busy}
            />
          ) : null}

          <details className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[#202124]">
              换种开案方式 · 常用题
            </summary>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setSetupPath((p) =>
                    p === "dialogue" ? "oneshot" : "dialogue",
                  )
                }
                className="text-[12px] font-medium text-[#66735E] underline-offset-4 touch-manipulation hover:underline"
              >
                {setupPath === "dialogue"
                  ? "改成一句话说完"
                  : "改回对话引导"}
              </button>
              {(meta.data?.presets ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(meta.data?.presets ?? []).slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPresetId(p.id);
                        setCustomTopic(p.topic);
                        setSetupPath("dialogue");
                        setReadyBrief(null);
                      }}
                      className={`inline-flex min-h-10 items-center rounded-full border px-3 text-[12px] ${
                        presetId === p.id && customTopic === p.topic
                          ? "border-[#181817] bg-[#181817] text-white"
                          : "border-[rgba(24,24,23,0.1)] bg-white text-[#3a3d41]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </details>

          <details
            className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3"
            open={showAdvancedSetup}
            onToggle={(e) =>
              setShowAdvancedSetup((e.target as HTMLDetailsElement).open)
            }
          >
            <summary className="cursor-pointer text-[13px] font-medium text-[#202124]">
              进阶（可选）· 补 Brief / 选席位
            </summary>
            <div className="mt-3 space-y-4">
              <p className="text-[12px] leading-5 text-[#6f747b]">
                不填也能开：系统会按你的口述自动补齐。写得越清，质询越准。
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["major", "重大决策（七席）"],
                    ["special", "专项（自选席）"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`min-h-11 px-4 text-[13px] font-medium ${
                      mode === id
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.1)] bg-white text-[#202124]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(
                [
                  ["whyNow", "为何现在？", whyNow, setWhyNow],
                  [
                    "decisionQuestion",
                    "本轮要拍板什么？",
                    decisionQuestion,
                    setDecisionQuestion,
                  ],
                  ["constraints", "不可突破的底线？", constraints, setConstraints],
                  [
                    "successLooksLike",
                    "怎样算做成了？",
                    successLooksLike,
                    setSuccessLooksLike,
                  ],
                ] as const
              ).map(([key, label, value, setter]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-[#202124]">
                    {label}
                  </span>
                  <input
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="min-h-11 border border-[rgba(24,24,23,0.1)] bg-white px-3 text-[14px] outline-none focus:border-[#181817]"
                  />
                </label>
              ))}
              {process.env.NODE_ENV !== "production" ? (
                <label className="flex items-start gap-2 text-[13px] text-[#3c4043]">
                  <input
                    type="checkbox"
                    checked={allowStubReports}
                    onChange={(e) => setAllowStubReports(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    仅开发演示：没有完整咨询报告时仍用草案开案（生产禁用；需
                    ALLOW_COUNCIL_STUB=1）
                  </span>
                </label>
              ) : null}
              <label className="flex items-start gap-2 text-[13px] text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={allowGaps}
                  onChange={(e) => setAllowGaps(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  带着证据缺口开案（缺口 ≥2 或证据过少时必须勾选，否则先补一手事实）
                </span>
              </label>

              {mode === "special" ? (
                <div>
                  <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">
                    邀请席位（至少 2 人；L4 须含 CFO / CRO / CSO）
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(meta.data?.seats ?? []).map((seat) => {
                      const on = roster.includes(seat.id as CouncilRoleId);
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => toggleSeat(seat.id as CouncilRoleId)}
                          className={`border px-3 py-3 text-left ${
                            on
                              ? "border-[#181817] bg-[#181817] text-white"
                              : "border-[rgba(24,24,23,0.08)] bg-white"
                          }`}
                        >
                          <p className="text-[14px] font-semibold">
                            {seat.id} · {seat.name}
                          </p>
                          <p
                            className={`mt-1 text-[12px] ${on ? "text-white/70" : "text-[#6f747b]"}`}
                          >
                            {seat.bias}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {rosterCheck.data && !rosterCheck.data.ok ? (
                    <ul className="mt-2 space-y-1 text-[12px] text-[#8a3b2a]">
                      {rosterCheck.data.errors.map((err) => (
                        <li key={err}>· {err}</li>
                      ))}
                    </ul>
                  ) : null}
                  {l4Check.data && !l4Check.data.ok ? (
                    <p className="mt-2 text-[12px] text-[#8a3b2a]">
                      {l4Check.data.message}
                    </p>
                  ) : forceLevelForSetup === "L4" && l4Check.data?.ok ? (
                    <p className="mt-2 text-[12px] text-[#66735E]">
                      {l4Check.data.message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[13px] leading-6 text-[#6f747b]">
                  默认七席质询：各自表态、互相挑战，再给你决策板。
                </p>
              )}
            </div>
          </details>

          {busy ? (
            <p className="inline-flex items-center gap-2 text-[13px] text-[#6f747b]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在开案…
            </p>
          ) : null}
        </section>
      ) : null}

      {session && step === "round1" ? (
        <section className="space-y-4 border border-[rgba(24,24,23,0.08)] bg-white p-6">
          <h2 className="font-display text-[22px] font-semibold text-[#202124]">
            {session.agenda.topic}
          </h2>
          {session.cdoNote ? (
            <p className="text-[13px] leading-6 text-[#6f747b]">
              {session.cdoNote}
            </p>
          ) : null}
          <p className="text-[13px] text-[#6f747b]">
            洞察{" "}
            {session.insights?.length
              ? `${session.insights.length} 条`
              : "暂无"}
            {" · "}
            席位 {session.roster.length}
            {session.evidencePacket?.gapActions?.length
              ? ` · 待补 ${session.evidencePacket.gapActions.length}`
              : session.evidencePacket?.gaps?.length
                ? ` · 缺口 ${session.evidencePacket.gaps.length}`
                : session.evidencePacket?.items?.length
                  ? ` · 证据 ${session.evidencePacket.items.length}`
                  : " · 尚无证据包"}
          </p>

          {(session.evidencePacket?.gapActions?.length || 0) > 0 ? (
            <div className="space-y-2 rounded-[14px] border border-[rgba(138,79,49,0.22)] bg-[#FFF6F0] px-3 py-3">
              <p className="text-[12px] font-medium text-[#8A4F31]">
                还缺客观数据（口述不算数）
              </p>
              <div className="flex flex-wrap gap-2">
                {session.evidencePacket!.gapActions!.slice(0, 3).map((gap) => (
                  <button
                    key={gap.id}
                    type="button"
                    onClick={() => {
                      setSupplementGap(gap);
                      setSupplementDraft("");
                    }}
                    className="inline-flex min-h-10 items-center gap-1 bg-[#181817] px-3 text-[12px] font-semibold text-white touch-manipulation"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    补充{gap.label}
                  </button>
                ))}
              </div>
              {supplementGap ? (
                <div className="space-y-2 border border-[rgba(24,24,23,0.1)] bg-white px-3 py-3">
                  <p className="text-[12px] font-medium text-[#202124]">
                    补充 · {supplementGap.label}
                  </p>
                  <p className="text-[12px] text-[#6f747b]">
                    {supplementGap.prompt}
                  </p>
                  <VoiceInputRow
                    projectId={projectId}
                    fieldId={`gap-${supplementGap.id}`}
                    value={supplementDraft}
                    onChange={setSupplementDraft}
                    placeholder={supplementGap.prompt}
                    voiceTitle={`拍板补证·${supplementGap.label}`}
                    multiline
                    rows={3}
                    showSubmit
                    disabled={supplementMut.isPending}
                    submitLabel={
                      supplementMut.isPending ? "写入中…" : "写入证据包"
                    }
                    onSubmit={() => {
                      if (!supplementDraft.trim() || supplementMut.isPending)
                        return;
                      void applyGapSupplement(supplementGap, supplementDraft);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSupplementGap(null);
                      setSupplementDraft("");
                    }}
                    className="inline-flex min-h-10 items-center px-3 text-[13px] text-[#6f747b]"
                  >
                    取消
                  </button>
                </div>
              ) : null}
            </div>
          ) : !session.evidencePacket?.items?.length ? (
            <div className="space-y-2">
              <p className="text-[12px] leading-5 text-[#8A4F31]">
                尚无证据包：本轮意见将以降级置信度运行，补一手事实后再正式拍板更稳。
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("setup");
                  setSetupPath("dialogue");
                }}
                className="inline-flex min-h-10 items-center gap-1 border border-[rgba(24,24,23,0.1)] px-3 text-[12px] font-medium text-[#202124]"
              >
                <Plus className="h-3.5 w-3.5" />
                回采集补充
              </button>
            </div>
          ) : null}

          {debateMut.isPending ? (
            <WorkProgressPanel
              title="质询进行中"
              phaseLine={debatePhaseLine}
              elapsedSec={workElapsedSec}
              seatCount={session.roster.length}
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDebate()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation disabled:opacity-60 sm:w-auto"
            >
              进入质询碰撞
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <details className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[#202124]">
              证据、洞察与席位
            </summary>
            <div className="mt-3 space-y-3">
              {session.evidencePacket?.items &&
              session.evidencePacket.items.length > 0 ? (
                <ul className="space-y-1.5">
                  {session.evidencePacket.items.slice(0, 6).map((item) => (
                    <li
                      key={item.evidenceId}
                      className="text-[13px] leading-5 text-[#3c4043]"
                    >
                      <span className="font-medium text-[#66735E]">
                        {item.sourceAgent === "founder"
                          ? "已补充"
                          : item.sourceAgent === "mobile-agent"
                            ? "口述"
                            : item.evidenceId}
                      </span>
                      <span className="text-[#6f747b]"> — {item.claim}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {session.insights && session.insights.length > 0 ? (
                <ul className="space-y-2">
                  {session.insights.slice(0, 6).map((insight) => (
                    <li
                      key={insight.id}
                      className="border border-[rgba(24,24,23,0.06)] bg-white px-3 py-2 text-[13px] leading-6 text-[#3c4043]"
                    >
                      <span className="font-semibold">
                        {insight.sourceAgent}
                      </span>
                      <span className="text-[#6f747b]">
                        {" "}
                        · {(insight.confidence * 100).toFixed(0)}%
                      </span>
                      <br />
                      {insight.finding}
                    </li>
                  ))}
                </ul>
              ) : session.expertReports.length > 0 ? (
                <ul className="space-y-2">
                  {session.expertReports.map((r) => (
                    <li
                      key={r.engineId}
                      className="border border-[rgba(24,24,23,0.06)] bg-white px-3 py-2 text-[13px] leading-6 text-[#3c4043]"
                    >
                      <span className="font-semibold">{r.engineId}</span>
                      <br />
                      {r.headline}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-[12px] text-[#6f747b]">
                席位已就绪（禁止互看）：{session.roster.join(" · ")}
              </p>
            </div>
          </details>
        </section>
      ) : null}

      {session && step === "debate" ? (
        <section className="space-y-4 border border-[rgba(24,24,23,0.08)] bg-white p-6">
          <h2 className="font-display text-[20px] font-semibold text-[#202124]">
            {session.agenda.topic}
          </h2>
          {session.stanceMatrix ? (
            <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-3 sm:text-center">
              <div className="flex items-baseline justify-between gap-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3 sm:block">
                <p className="text-[11px] text-[#6f747b]">支持</p>
                <p className="font-semibold sm:mt-1">
                  {session.stanceMatrix.support.join(" ") || "—"}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3 sm:block">
                <p className="text-[11px] text-[#6f747b]">条件</p>
                <p className="font-semibold sm:mt-1">
                  {session.stanceMatrix.conditional.join(" ") || "—"}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3 sm:block">
                <p className="text-[11px] text-[#6f747b]">反对</p>
                <p className="font-semibold sm:mt-1">
                  {session.stanceMatrix.oppose.join(" ") || "—"}
                </p>
              </div>
            </div>
          ) : null}

          {session.conflicts.length > 0 ? (
            <div>
              <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">
                主要冲突
              </p>
              <ul className="mt-2 space-y-2">
                {session.conflicts.slice(0, 3).map((c, i) => (
                  <li
                    key={`${c.agentA}-${c.agentB}-${i}`}
                    className="border border-[rgba(24,24,23,0.06)] px-3 py-2 text-[13px] leading-6 text-[#3c4043]"
                  >
                    <span className="font-semibold">
                      {c.agentA} vs {c.agentB}
                      {c.severity === "high"
                        ? " · 高冲突"
                        : c.severity === "medium"
                          ? " · 中冲突"
                          : c.severity
                            ? " · 低冲突"
                            : ""}
                    </span>
                    {" — "}
                    {c.topic}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[#202124]">
              各席意见明细 · {session.opinions.length}
            </summary>
            <div className="mt-3 space-y-2">
              {session.opinions.map((op) => (
                <article
                  key={op.member}
                  className="border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3"
                >
                  <p className="text-[14px] font-semibold text-[#202124]">
                    {op.member} · {POSITION_LABEL[op.position] || op.position}
                    {op.veto ? " · 红线" : ""}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[#3c4043]">
                    {op.judgment || op.summary}
                  </p>
                  {op.evidence_used && op.evidence_used.length > 0 ? (
                    <p className="mt-1 text-[12px] text-[#66735E]">
                      依据：{op.evidence_used.join("、")}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-[#8A4F31]">
                      未挂有效证据 ID（置信已降权）
                    </p>
                  )}
                  {op.challenge_to_others &&
                  op.challenge_to_others.length > 0 ? (
                    <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                      质询：{op.challenge_to_others[0]}
                    </p>
                  ) : null}
                  {op.top_risk ? (
                    <p className="mt-1 text-[12px] text-[#8a3b2a]">
                      风险：{op.top_risk}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </details>

          {boardMut.isPending ? (
            <WorkProgressPanel
              title="形成决策板"
              phaseLine={
                workElapsedSec < 4
                  ? "汇总支持 / 条件 / 反对…"
                  : "整理少数意见与红线…"
              }
              elapsedSec={workElapsedSec}
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleBoard()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation disabled:opacity-60 sm:w-auto"
            >
              形成决策板
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </section>
      ) : null}

      {session && (step === "board" || step === "closed") && session.board ? (
        <section className="space-y-4 border border-[rgba(24,24,23,0.08)] bg-white p-6">
          <h2 className="font-display text-[22px] font-semibold text-[#202124]">
            {session.board.title}
          </h2>
          <p className="text-[15px] font-semibold leading-7 text-[#202124]">
            建议行动：{session.board.recommendedAction}
          </p>
          <p className="text-[13px] leading-6 text-[#6f747b]">
            最大争议：{session.board.biggestDispute}
          </p>

          <details className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[#202124]">
              共识、风险与先例
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-[rgba(24,24,23,0.06)] bg-white p-4">
                  <p className="text-[12px] text-[#6f747b]">共识 / 支持要点</p>
                  <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#202124]">
                    {session.board.supportBullets.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                    {session.board.consensus.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-[rgba(24,24,23,0.06)] bg-white p-4">
                  <p className="text-[12px] text-[#6f747b]">
                    少数意见 / 条件 / 风险
                  </p>
                  <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#202124]">
                    {session.board.minorityReport.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                    {session.board.conditions.map((b) => (
                      <li key={`c-${b}`}>· 条件：{b}</li>
                    ))}
                    {session.board.risks.map((b) => (
                      <li key={`r-${b}`}>· 风险：{b}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {similarQuery.data && similarQuery.data.length > 0 ? (
                <div className="border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3">
                  <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
                    相似先例 · {similarQuery.data.length}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {similarQuery.data.slice(0, 3).map((d, i) => (
                      <li
                        key={`${d.topic}-${i}`}
                        className="text-[13px] leading-6 text-[#3c4043]"
                      >
                        · {d.topic}
                        {d.decision ? ` → ${d.decision}` : ""}
                        {d.result ? (
                          <span className="text-[#6f747b]"> · {d.result}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {session.roster.length > 0 ? (
                <div className="border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3">
                  <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
                    席位战绩
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {session.roster.map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setHistorySeat(seat)}
                        className={`inline-flex min-h-11 items-center justify-center px-3.5 text-[13px] touch-manipulation ${
                          historySeat === seat
                            ? "bg-[#181817] text-white"
                            : "border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] text-[#202124]"
                        }`}
                      >
                        {seat}
                      </button>
                    ))}
                  </div>
                  {memberHistory.data ? (
                    <p className="mt-2 text-[13px] leading-6 text-[#3c4043]">
                      参与 {memberHistory.data.totalDecisions} 次
                      {" · "}
                      支持 {memberHistory.data.supportRate}%
                      {" · "}
                      反对 {memberHistory.data.opposeRate}%
                      {memberHistory.data.recentJudgments[0]
                        ? ` · 近判：${memberHistory.data.recentJudgments[0]}`
                        : " · 尚无历史判断"}
                    </p>
                  ) : memberHistory.isFetching ? (
                    <p className="mt-2 text-[12px] text-[#6f747b]">加载战绩…</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>

          {step === "board" ? (
            <>
              <textarea
                id="founder-note"
                value={founderNote}
                onChange={(e) => setFounderNote(e.target.value)}
                placeholder="你的备注（修改/推翻时建议填写）"
                rows={2}
                aria-label="你的备注"
                className="w-full border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] px-3 py-2 text-[14px] outline-none focus:border-[#181817]"
              />
              <div className="fixed inset-x-0 bottom-0 z-[35] border-t border-[rgba(24,24,23,0.1)] bg-[rgba(250,249,246,0.98)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-10px_28px_rgba(20,20,19,0.08)] backdrop-blur-sm md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
                <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {session.board.founderChoices.map((choice) => {
                    const choiceLabel =
                      choice === "接受委员会"
                        ? "接受建议"
                        : choice === "推翻委员会"
                          ? "推翻建议"
                          : "修改方案";
                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleFounder(choice)}
                        className={`min-h-12 w-full px-4 text-[14px] font-semibold touch-manipulation active:scale-[0.98] sm:w-auto sm:min-h-11 sm:text-[13px] ${
                          choice === "接受委员会"
                            ? "bg-[#181817] text-white"
                            : "border border-[rgba(24,24,23,0.1)] bg-white text-[#202124]"
                        }`}
                      >
                        {choiceLabel}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDismissDraft()}
                    className="min-h-11 w-full border border-[rgba(180,124,92,0.35)] bg-white px-4 text-[13px] font-medium text-[#B47C5C] touch-manipulation sm:w-auto"
                  >
                    放弃本次
                  </button>
                </div>
              </div>
              <div className="h-44 md:hidden" aria-hidden />
            </>
          ) : (
            <div className="space-y-3">
              <DecisionClosedActions
                projectId={projectId}
                archiveOk={archiveOk}
                onRestart={() => void reset()}
              />
              {archiveOk ? (
                <p
                  className={`text-[12px] leading-5 ${
                    executionStarted ? "text-[#465240]" : "text-[#8A4F31]"
                  }`}
                >
                  {executionStarted
                    ? "已归档并挂上第 7 天复盘提醒。"
                    : `已归档，但自动创建行动未完成${
                        executionError ? `：${executionError}` : ""
                      }。请到「跟进」页手动开启。`}
                </p>
              ) : null}
              {session.decisionTrace ? (
                <details className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[#66735E]">
                    决策过程痕迹
                  </summary>
                  <p className="mt-2 text-[13px] leading-6 text-[#3c4043]">
                    洞察 × {session.decisionTrace.insights.length}
                    {" → "}
                    席位意见 × {session.decisionTrace.councilOpinions.length}
                    {session.decisionTrace.resolution
                      ? ` → ${session.decisionTrace.resolution.recommendedAction}`
                      : ""}
                    {" → "}
                    {session.decisionTrace.outcome?.status || "pending"}
                  </p>
                </details>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
      </div>
      </div>
    </div>
  );
}

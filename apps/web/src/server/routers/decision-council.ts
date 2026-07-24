/**
 * 决策室 tRPC — 七常委 Decision Council 产品链路
 * V2 扩展：自动持久化 Decision Memory + 常委战迹 + 验证回写 + 历史查询
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import {
  advanceDecisionRoomToBoard,
  advanceDecisionRoomToDebate,
  DECISION_ROOM_PRESETS,
  decisionRoomPhaseLabel,
  founderCloseDecisionRoom,
  listCouncilSeats,
  assertCouncilIngressViaMkInsight,
  mergeEvidencePacket,
  openDecisionRoom,
  validateSpecialRoster,
  type CouncilMeetingSession,
  type CouncilRoleId,
  type DecisionRoomMode,
  type IssueLevel,
} from "@mealkey/agents/founder-os";
import {
  generateCouncilOpinions,
  loadProjectExpertReports,
  type OpinionSource,
} from "../founder-layer/council/decision-room-runtime";
import { voiceIntakeToCouncilAssets } from "../founder-layer/council/voice-intake-mk-insight";
import { isCouncilStubAllowedByEnv } from "@/server/services/engine-meeting-gate";

/** 生产默认禁 stub；仅 ALLOW_COUNCIL_STUB=1 或非 production 可显式开启 */
function resolveAllowStubReports(requested?: boolean): boolean {
  if (!requested) return false;
  if (!isCouncilStubAllowedByEnv()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "生产环境禁止用占位报告开常委。请先完成席位咨询产出 MKInsight，演示可设 ALLOW_COUNCIL_STUB=1。",
    });
  }
  return true;
}
import {
  persistCouncilMemory,
  persistCouncilTrackRecord,
  opinionsToTrackEntries,
  writeBackValidationResult,
  loadCouncilMemberHistory,
  loadSimilarCouncilDecisions,
} from "../founder-layer/council/council-persistence";
import {
  clearActiveCouncilDraft,
  loadActiveCouncilDraft,
  saveActiveCouncilDraft,
} from "../founder-layer/council/council-draft";
import {
  buildCouncilDecisionSignals,
  formatIndustryPriorBlock,
  ingestSignalsAndEvolve,
  readCouncilWeightHints,
  recallIndustryInsights,
} from "../founder-layer/intelligence";
import { validateProfile } from "@/lib/profile-schema";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";

const log = createLogger("decision-council");

const roleSchema = z.enum([
  "CSO", "CMO", "CBO", "BMO", "CFO", "COO", "CRO",
]);

const levelSchema = z.enum(["L1", "L2", "L3", "L4"]);

const sessionSchema = z.custom<CouncilMeetingSession>((v) => {
  return Boolean(v && typeof v === "object" && "sessionId" in (v as object));
}, "无效的决策室会话");

async function assertProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
  }
  return project;
}

async function getOwnerId(userId: string): Promise<string> {
  const owner = await prisma.owner.findUnique({ where: { userId }, select: { id: true } });
  if (!owner) throw new TRPCError({ code: "FORBIDDEN", message: "经营者信息不存在" });
  return owner.id;
}

async function persistSessionIfClosed(
  session: CouncilMeetingSession,
  userId: string,
  projectId: string,
  opts?: { clearDraft?: boolean },
): Promise<void> {
  if (session.phase !== "closed") return;
  try {
    const ownerId = await getOwnerId(userId);
    await persistCouncilMemory(prisma, ownerId, projectId, session);
    const entries = opinionsToTrackEntries(
      session.casePacket.caseId,
      session.agenda.topic,
      session.opinions,
    );
    await persistCouncilTrackRecord(prisma, ownerId, projectId, entries);
    // 默认不清草稿：等前端归档成功后再 dismiss，避免「裁决成功、归档失败」丢续裁
    if (opts?.clearDraft) {
      await clearActiveCouncilDraft(prisma, { projectId, ownerId });
    }
  } catch {
    // 持久化失败不影响主流程
  }
}

async function persistAwaitingDraft(
  session: CouncilMeetingSession,
  userId: string,
  projectId: string,
): Promise<void> {
  if (session.phase === "closed" || !session.board) return;
  try {
    const ownerId = await getOwnerId(userId);
    await saveActiveCouncilDraft(prisma, {
      projectId,
      ownerId,
      session,
    });
  } catch {
    // 草稿失败不影响主流程
  }
}

function serializeSession(
  session: CouncilMeetingSession,
  extras?: {
    opinionSource?: OpinionSource;
    expertNote?: string;
    brandStrength?: number;
    loadedEngines?: string[];
  },
) {
  return {
    session,
    phaseLabel: decisionRoomPhaseLabel(session.phase),
    planSummary: [
      `${session.sessionId}`,
      `${session.issue.type} / ${session.agenda.level}`,
      `花名册：${session.roster.join("、")}`,
      session.board
        ? `建议：${session.board.recommendedAction}`
        : `阶段：${decisionRoomPhaseLabel(session.phase)}`,
    ].join(" · "),
    opinionSource: extras?.opinionSource,
    expertNote: extras?.expertNote,
    brandStrength: extras?.brandStrength,
    loadedEngines: extras?.loadedEngines,
  };
}

export const decisionCouncilRouter = router({
  // ─── 元数据 ───

  meta: protectedProcedure.query(() => ({
    presets: DECISION_ROOM_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      topic: p.topic,
      forceLevel: p.forceLevel,
    })),
    seats: listCouncilSeats(),
  })),

  validateRoster: protectedProcedure
    .input(
      z.object({
        roster: z.array(roleSchema).min(1).max(7),
        level: levelSchema.optional(),
      }),
    )
    .query(({ input }) =>
      validateSpecialRoster({
        roster: input.roster as CouncilRoleId[],
        level: input.level as IssueLevel | undefined,
      }),
    ),

  // ─── 会议生命周期 ───

  open: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().min(2).max(400),
        mode: z.enum(["major", "special"]),
        whyNow: z.string().min(4).max(400),
        decisionQuestion: z.string().min(4).max(400),
        constraints: z.string().min(4).max(400),
        successLooksLike: z.string().min(4).max(400),
        spokenTurns: z.array(z.string().max(2000)).max(12).optional(),
        evidenceSummary: z.array(z.string().max(400)).max(8).optional(),
        allowStubReports: z.boolean().optional(),
        allowGaps: z.boolean().optional(),
        forceLevel: levelSchema.optional(),
        roster: z.array(roleSchema).max(7).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const allowStubReports = resolveAllowStubReports(input.allowStubReports);

      // Case.id ≡ MKDecision.id：开会即预创建 DRAFT Decision
      const ownerId = await getOwnerId(ctx.userId!);
      const draft = await prisma.decision.create({
        data: {
          ownerId,
          projectId: input.projectId,
          type: "council_draft",
          problem: input.topic,
          observation: input.whyNow,
          diagnosis: "决策室开案（待裁决）",
          judgement: "待裁决",
          strategy: input.decisionQuestion,
          action: "待签字后生成行动",
          confidence: 0.4,
          evidence: "[]",
          outcome: JSON.stringify({
            mkStatus: "DRAFT",
            status: "draft",
            councilDraft: true,
            createdAt: new Date().toISOString(),
          }),
        },
        select: { id: true },
      });
      const caseId = draft.id;

      const loaded = await loadProjectExpertReports({
        userId: ctx.userId!,
        projectId: input.projectId,
        caseId,
      });
      // 语音 Brief → Adapter：无咨询资产时作真源；有咨询资产且有口述时合并（不二选一）
      const hasSpoken =
        (input.spokenTurns || []).some((t) => t.trim().length > 0) ||
        (input.evidenceSummary || []).some((t) => t.trim().length > 0);
      const voice = voiceIntakeToCouncilAssets({
        caseId,
        topic: input.topic,
        whyNow: input.whyNow,
        decisionQuestion: input.decisionQuestion,
        constraints: input.constraints,
        successLooksLike: input.successLooksLike,
        spokenTurns: input.spokenTurns,
        evidenceSummary: input.evidenceSummary,
      });
      let insights = loaded.insights;
      let evidencePacket = loaded.evidencePacket;
      let voiceNote = "";
      if (insights.length === 0) {
        insights = voice.insights;
        evidencePacket = voice.evidencePacket;
        voiceNote = voice.sourceNote;
      } else if (hasSpoken) {
        insights = [...insights, ...voice.insights];
        evidencePacket = mergeEvidencePacket({
          caseId,
          base: evidencePacket || {
            caseId,
            items: [],
            gaps: [],
            gapActions: [],
          },
          insights: voice.insights,
          gaps: voice.evidencePacket.gaps,
          gapActions: voice.gapActions,
        });
        voiceNote = `口述已并入 · ${voice.sourceNote}`;
      } else if (evidencePacket) {
        evidencePacket = mergeEvidencePacket({
          caseId,
          base: evidencePacket,
          insights,
        });
      }
      try {
        assertCouncilIngressViaMkInsight({
          insights,
          allowEmpty: allowStubReports,
          label: "决策室开案",
        });
        let session = openDecisionRoom({
          topic: input.topic,
          mode: input.mode as DecisionRoomMode,
          whyNow: input.whyNow,
          decisionQuestion: input.decisionQuestion,
          constraints: input.constraints,
          successLooksLike: input.successLooksLike,
          allowStubReports,
          allowGaps: Boolean(input.allowGaps),
          forceLevel: input.forceLevel as IssueLevel | undefined,
          roster: input.roster as CouncilRoleId[] | undefined,
          caseId,
          expertReports: loaded.reports,
          insights,
          evidencePacket,
        });
        if (voiceNote) {
          session = {
            ...session,
            cdoNote: `${session.cdoNote} | ${voiceNote}`,
          };
        }
        // 软门禁：证据缺口 / 领域强度未达标 → 写入 cdoNote，不硬拦开会
        const gaps = evidencePacket?.gaps || [];
        if (gaps.length) {
          session = {
            ...session,
            cdoNote: `${session.cdoNote} · 【证据/强度提醒】${gaps.slice(0, 3).join("；")}${
              input.allowGaps ? "（已确认带着缺口开案）" : ""
            }`,
          };
        }
        // Founder Model → 常委提醒权重；行业脱敏池 → 先验（建议增强，非终局）
        try {
          const project = await prisma.project.findFirst({
            where: { id: input.projectId, owner: { userId: ctx.userId! } },
            select: { profile: true, category: true },
          });
          if (project) {
            const profile = validateProfile(project.profile) as Record<
              string,
              unknown
            >;
            const hints = readCouncilWeightHints(profile);
            const addons: string[] = [];
            if (hints.note || hints.CFO || hints.CRO || hints.COO) {
              const weightLine = [
                hints.CFO ? `CFO×${hints.CFO}` : null,
                hints.CRO ? `CRO×${hints.CRO}` : null,
                hints.COO ? `COO×${hints.COO}` : null,
                hints.CSO ? `CSO×${hints.CSO}` : null,
              ]
                .filter(Boolean)
                .join(" ");
              addons.push(
                [
                  "【创始人经营镜像校准】",
                  hints.note,
                  weightLine ? `提醒权重 ${weightLine}` : null,
                ]
                  .filter(Boolean)
                  .join(" "),
              );
            }
            try {
              const industry = await recallIndustryInsights(prisma, {
                category: project.category,
                topic: input.topic,
                limit: 3,
              });
              const block = formatIndustryPriorBlock(industry);
              if (block) addons.push(block.replace(/\n/g, "；"));
            } catch {
              // 行业池失败不阻断
            }
            if (addons.length) {
              session = {
                ...session,
                cdoNote: `${session.cdoNote} · ${addons.join(" · ")}`,
              };
            }
          }
        } catch {
          // 校准失败不阻断开会
        }
        return serializeSession(session, {
          expertNote: voiceNote || loaded.sourceNote,
          brandStrength: loaded.brandStrength,
          loadedEngines: loaded.loadedEngines,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "无法召集决策室",
        });
      }
    }),

  /** Round1 前补一手证据：写入 session.evidencePacket，供后续质询/拍板使用 */
  supplementEvidence: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        session: sessionSchema,
        gapId: z.string().min(1).max(80),
        claim: z.string().min(2).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const session = input.session;
      const caseId = session.casePacket?.caseId || session.sessionId;
      const packet = session.evidencePacket ?? {
        caseId,
        items: [],
        gaps: [],
        gapActions: [],
      };
      const gap = (packet.gapActions || []).find((g) => g.id === input.gapId);
      const claim = input.claim.trim().slice(0, 400);
      const nextItem = {
        evidenceId: `founder-sup-${input.gapId}-${Date.now().toString(36)}`,
        sourceAgent: "founder",
        claim,
        strength: "medium" as const,
        category: "PRIMARY_FACT",
      };
      const nextActions = (packet.gapActions || []).filter(
        (g) => g.id !== input.gapId,
      );
      const nextGaps = (packet.gaps || []).filter((g) => {
        if (!gap) return true;
        return g !== gap.detail && !g.includes(gap.label);
      });
      const nextSession: CouncilMeetingSession = {
        ...session,
        evidencePacket: {
          ...packet,
          caseId: packet.caseId || caseId,
          items: [...(packet.items || []), nextItem].slice(0, 24),
          gaps: nextGaps,
          gapActions: nextActions,
          generatedAt: new Date().toISOString(),
        },
        cdoNote: `${session.cdoNote || ""} · 已补「${gap?.label || input.gapId}」`
          .replace(/^\s*·\s*/, "")
          .trim(),
      };
      // 有 board 后才落进行中草稿；Round1 前由客户端持有 session
      await persistAwaitingDraft(nextSession, ctx.userId!, input.projectId);
      return serializeSession(nextSession);
    }),

  advanceDebate: protectedProcedure
    .input(z.object({ projectId: z.string(), session: sessionSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const { opinions, source } = await generateCouncilOpinions({
        session: input.session,
      });
      return serializeSession(advanceDecisionRoomToDebate(input.session, opinions), {
        opinionSource: source,
      });
    }),

  advanceBoard: protectedProcedure
    .input(z.object({ projectId: z.string(), session: sessionSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const session = advanceDecisionRoomToBoard(input.session);
      await persistAwaitingDraft(session, ctx.userId!, input.projectId);
      persistSessionIfClosed(session, ctx.userId!, input.projectId);
      return serializeSession(session);
    }),

  founderDecide: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        session: sessionSchema,
        choice: z.enum(["接受委员会", "修改方案", "推翻委员会"]),
        note: z.string().max(500).optional(),
        /** 仅在归档已成功时由 FE 传 true；默认保留草稿供续裁/重试归档 */
        clearDraft: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const session = founderCloseDecisionRoom(input.session, {
        choice: input.choice,
        note: input.note,
      });
      await persistSessionIfClosed(session, ctx.userId!, input.projectId, {
        clearDraft: Boolean(input.clearDraft),
      });

      // User Intelligence：决策选择 / 推翻建议 → BehaviorSignal → 进化
      try {
        const ownerId = await getOwnerId(ctx.userId!);
        const signals = buildCouncilDecisionSignals({
          topic: session.agenda.topic,
          choice: input.choice,
          recommendedAction: session.board?.recommendedAction,
          note: input.note,
          caseId: session.casePacket.caseId,
          sessionId: session.sessionId,
        });
        await updateProjectProfile(
          input.projectId,
          (latest) => ingestSignalsAndEvolve(latest as Record<string, unknown>, signals),
          { ownerId },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        // 进化失败不阻断裁决主流程
        log.warn("intelligence ingest after founderDecide failed", { error: String(error) });
      }

      return serializeSession(session);
    }),

  /** 今日简报 / 决策室：读取待裁决草稿 */
  getActiveDraft: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const draft = await loadActiveCouncilDraft(prisma, {
        projectId: input.projectId,
        userId: ctx.userId!,
      });
      if (!draft) return { draft: null };
      return {
        draft: {
          status: draft.status,
          sessionId: draft.sessionId,
          caseId: draft.caseId,
          topic: draft.topic,
          level: draft.level,
          recommendedAction: draft.recommendedAction,
          insightCount: draft.insightCount,
          supportCount: draft.supportCount,
          opposeCount: draft.opposeCount,
          observeCount: draft.observeCount,
          biggestDispute: draft.biggestDispute,
          updatedAt: draft.updatedAt,
          href: `/projects/${input.projectId}/decision-room?resume=1`,
        },
      };
    }),

  /** 续裁：取回完整 session */
  resumeActiveDraft: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const draft = await loadActiveCouncilDraft(prisma, {
        projectId: input.projectId,
        userId: ctx.userId!,
      });
      if (!draft?.session) return { session: null };
      return { session: draft.session as CouncilMeetingSession };
    }),

  dismissActiveDraft: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const ownerId = await getOwnerId(ctx.userId!);
      await clearActiveCouncilDraft(prisma, {
        projectId: input.projectId,
        ownerId,
      });
      return { ok: true as const };
    }),

  runToBoard: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().min(2).max(400),
        mode: z.enum(["major", "special"]),
        whyNow: z.string().min(4).max(400),
        decisionQuestion: z.string().min(4).max(400),
        constraints: z.string().min(4).max(400),
        successLooksLike: z.string().min(4).max(400),
        spokenTurns: z.array(z.string().max(2000)).max(12).optional(),
        evidenceSummary: z.array(z.string().max(400)).max(8).optional(),
        allowStubReports: z.boolean().optional(),
        allowGaps: z.boolean().optional(),
        forceLevel: levelSchema.optional(),
        roster: z.array(roleSchema).max(7).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const allowStubReports = resolveAllowStubReports(input.allowStubReports);
      const ownerId = await getOwnerId(ctx.userId!);
      const draft = await prisma.decision.create({
        data: {
          ownerId,
          projectId: input.projectId,
          type: "council_draft",
          problem: input.topic,
          observation: input.whyNow,
          diagnosis: "决策室开案（待裁决）",
          judgement: "待裁决",
          strategy: input.decisionQuestion,
          action: "待签字后生成行动",
          confidence: 0.4,
          evidence: "[]",
          outcome: JSON.stringify({
            mkStatus: "DRAFT",
            status: "draft",
            councilDraft: true,
            createdAt: new Date().toISOString(),
          }),
        },
        select: { id: true },
      });
      const caseId = draft.id;
      const loaded = await loadProjectExpertReports({
        userId: ctx.userId!,
        projectId: input.projectId,
        caseId,
      });
      const hasSpoken =
        (input.spokenTurns || []).some((t) => t.trim().length > 0) ||
        (input.evidenceSummary || []).some((t) => t.trim().length > 0);
      const voice = voiceIntakeToCouncilAssets({
        caseId,
        topic: input.topic,
        whyNow: input.whyNow,
        decisionQuestion: input.decisionQuestion,
        constraints: input.constraints,
        successLooksLike: input.successLooksLike,
        spokenTurns: input.spokenTurns,
        evidenceSummary: input.evidenceSummary,
      });
      let insights = loaded.insights;
      let evidencePacket = loaded.evidencePacket;
      let voiceNote = "";
      if (insights.length === 0) {
        insights = voice.insights;
        evidencePacket = voice.evidencePacket;
        voiceNote = voice.sourceNote;
      } else if (hasSpoken) {
        insights = [...insights, ...voice.insights];
        evidencePacket = mergeEvidencePacket({
          caseId,
          base: evidencePacket || {
            caseId,
            items: [],
            gaps: [],
            gapActions: [],
          },
          insights: voice.insights,
          gaps: voice.evidencePacket.gaps,
          gapActions: voice.gapActions,
        });
        voiceNote = `口述已并入 · ${voice.sourceNote}`;
      } else if (evidencePacket) {
        evidencePacket = mergeEvidencePacket({
          caseId,
          base: evidencePacket,
          insights,
        });
      }
      try {
        assertCouncilIngressViaMkInsight({
          insights,
          allowEmpty: allowStubReports,
          label: "决策室快速路径",
        });
        let session = openDecisionRoom({
          topic: input.topic,
          mode: input.mode as DecisionRoomMode,
          whyNow: input.whyNow,
          decisionQuestion: input.decisionQuestion,
          constraints: input.constraints,
          successLooksLike: input.successLooksLike,
          allowStubReports,
          allowGaps: Boolean(input.allowGaps),
          forceLevel: input.forceLevel as IssueLevel | undefined,
          roster: input.roster as CouncilRoleId[] | undefined,
          caseId,
          expertReports: loaded.reports,
          insights,
          evidencePacket,
        });
        if (voiceNote) {
          session = {
            ...session,
            cdoNote: `${session.cdoNote} · ${voiceNote}`,
          };
        }
        const { opinions, source } = await generateCouncilOpinions({ session });
        session = advanceDecisionRoomToDebate(session, opinions);
        session = advanceDecisionRoomToBoard(session);
        await persistAwaitingDraft(session, ctx.userId!, input.projectId);
        persistSessionIfClosed(session, ctx.userId!, input.projectId);
        return serializeSession(session, {
          opinionSource: source,
          expertNote: voiceNote || loaded.sourceNote,
          brandStrength: loaded.brandStrength,
          loadedEngines: loaded.loadedEngines,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "决策室运行失败",
        });
      }
    }),

  // ─── 验证回写 ───

  writeBackResult: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        caseId: z.string(),
        whatHappened: z.string().min(2).max(1000),
        result: z.enum(["success", "failure", "mixed"]),
        whoWasRight: z.enum(["founder", "council", "mixed", "unknown"]),
        lesson: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const ownerId = await getOwnerId(ctx.userId!);
      await writeBackValidationResult(prisma, ownerId, input.caseId, {
        whatHappened: input.whatHappened,
        result: input.result,
        whoWasRight: input.whoWasRight,
        lesson: input.lesson,
      });
      return { ok: true };
    }),

  // ─── 历史查询 ───

  memberHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        member: roleSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const ownerId = await getOwnerId(ctx.userId!);
      return loadCouncilMemberHistory(prisma, ownerId, input.member as CouncilRoleId);
    }),

  similarDecisions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().min(2).max(400),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertProject(ctx.userId!, input.projectId);
      const ownerId = await getOwnerId(ctx.userId!);
      return loadSimilarCouncilDecisions(prisma, ownerId, input.topic);
    }),

  // ─── L4 花名册校验（显式 API） ───

  checkL4Roster: protectedProcedure
    .input(
      z.object({
        roster: z.array(roleSchema).min(1).max(7),
      }),
    )
    .query(({ input }) => {
      const required: CouncilRoleId[] = ["CFO", "CRO", "CSO"];
      const missing = required.filter((r) => !input.roster.includes(r));
      return {
        ok: missing.length === 0,
        required,
        missing,
        message: missing.length === 0
          ? "L4 花名册合规（包含 CFO、CRO、CSO）"
          : `L4 生死级议题必须包含：${missing.join("、")}`,
      };
    }),
});

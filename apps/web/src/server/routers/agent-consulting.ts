/**
 * M-MKT / M-BIZ / M-ED 六步咨询 tRPC（同构）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  acceptAgentExecution,
  answerAgentFollowup,
  answerAgentIntake,
  confirmAgentResearch,
  confirmAgentStrategy,
  exportAgentSignOffPackage,
  getOrCreateAgentConsulting,
  openAgentWarRoom,
  resetAgentConsulting,
  runAgentResearch,
  ingestAgentDialogueTurn,
  saveAgentBasics,
  signAgentStrategyReport,
  upsertAgentPrimaryFacts,
  voteAgentWarRoom,
} from "@/server/services/agent-consulting.service";
import type { ConsultingAgentKind } from "@mealkey/agents/consulting-os";

function wrapError(error: unknown): never {
  const message = error instanceof Error ? error.message : "咨询项目操作失败";
  if (
    message.includes("请先") ||
    message.includes("门禁") ||
    message.includes("未齐") ||
    message.includes("未完成") ||
    message.includes("信息采集") ||
    message.includes("信息收集") ||
    message.includes("证据未齐") ||
    message.includes("待补") ||
    message.includes("签字前未就绪") ||
    message.includes("不能确认")
  ) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message });
  }
  if (message.includes("不存在") || message.includes("无权限")) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function makeAgentConsultingRouter(agentId: ConsultingAgentKind) {
  return router({
    getProject: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          return await getOrCreateAgentConsulting(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    saveBasics: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          // 语音转写可长于打字；与 Agent utterance 同量级
          basics: z.record(z.string(), z.string().max(2000)),
          complete: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await saveAgentBasics(
            ctx.userId!,
            input.projectId,
            agentId,
            input.basics,
            Boolean(input.complete),
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    /** 口述拆解真源：一题一句 → 服务端解析入库 */
    ingestDialogueTurn: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          turnId: z.string().min(1).max(80),
          utterance: z.string().min(2).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await ingestAgentDialogueTurn(
            ctx.userId!,
            input.projectId,
            agentId,
            input.turnId,
            input.utterance,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    answerFollowup: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          questionId: z.string(),
          answer: z.string().min(1).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await answerAgentFollowup(
            ctx.userId!,
            input.projectId,
            agentId,
            input.questionId,
            input.answer,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    answerIntake: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          questionId: z.string(),
          answer: z.string().min(1).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await answerAgentIntake(
            ctx.userId!,
            input.projectId,
            agentId,
            input.questionId,
            input.answer,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    runResearch: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await runAgentResearch(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    confirmResearch: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await confirmAgentResearch(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    upsertPrimaryFacts: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          facts: z
            .array(
              z.object({
                factId: z.string().max(80).optional(),
                claim: z.string().min(8).max(160),
                sourceRef: z.string().min(4).max(240),
                related: z
                  .enum(["research", "war_room", "decision"])
                  .optional(),
              }),
            )
            .min(1)
            .max(12),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await upsertAgentPrimaryFacts(
            ctx.userId!,
            input.projectId,
            agentId,
            input.facts,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    openWarRoom: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await openAgentWarRoom(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    voteWarRoom: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          preference: z.string().min(1).max(40),
          blendNote: z.string().max(400).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await voteAgentWarRoom(
            ctx.userId!,
            input.projectId,
            agentId,
            input.preference,
            input.blendNote,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    confirmStrategy: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await confirmAgentStrategy(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    acceptExecution: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await acceptAgentExecution(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    reset: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await resetAgentConsulting(
            ctx.userId!,
            input.projectId,
            agentId,
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    signReport: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          signedBy: z.string().min(1).max(80),
          note: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await signAgentStrategyReport(
            ctx.userId!,
            input.projectId,
            agentId,
            { signedBy: input.signedBy, note: input.note },
          );
        } catch (error) {
          wrapError(error);
        }
      }),

    exportPackage: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          preview: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await exportAgentSignOffPackage(
            ctx.userId!,
            input.projectId,
            agentId,
            { preview: input.preview },
          );
        } catch (error) {
          wrapError(error);
        }
      }),
  });
}

export const mMktConsultingRouter = makeAgentConsultingRouter("m-mkt");
export const mBizConsultingRouter = makeAgentConsultingRouter("m-biz");
export const mEdConsultingRouter = makeAgentConsultingRouter("m-ed");

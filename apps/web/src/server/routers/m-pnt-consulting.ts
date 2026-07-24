/**
 * M-PNT 品牌战略咨询项目 tRPC
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  getOrCreateBrandConsultingProject,
  saveBrandBasics,
  ingestBrandDialogueTurn,
  completeDiscovery,
  answerBrief,
  compileAndCompleteBrief,
  runCurrentAnalysisStage,
  confirmCurrentAnalysisStage,
  selectBattlefieldDecision,
  selectHypothesisDecision,
  adjustCompetitivePlotPoint,
  reviewCompetitiveMapEvidence,
  reviewConsumerInsightEvidence,
  confirmConsumerInsightJudgment,
  savePositioningDraft,
  proposePositioning,
  reviewPositioningEvidence,
  validatePositioning,
  freezePositioning,
  confirmBrandSystemDeliverable,
  signFinalStrategyReport,
  addConsultingPrimaryFact,
  removeConsultingPrimaryFact,
  regenerateFinalReport,
  submitPositionRehearsal,
  exportSignOffPackage,
  resetBrandConsulting,
  runMarketResearchStep,
  confirmMarketResearchStep,
  fillStoreVisitStep,
  adoptWhitespaceSuggestionStep,
  runAdvisorStrategiesStep,
  openWarRoomStep,
  voteWarRoomStep,
  generateExecutionPathStep,
  acceptExecutionPathStep,
  confirmStrategyReportStep,
} from "@/server/services/m-pnt-consulting.service";
import {
  BRIEF_LAYER_ORDER,
  BRAND_BASICS_FIELDS,
  BrandProjectStage,
  getCurrentLayerQuestions,
  adaptiveFollowupProgress,
  evaluatePositioningIntakeChecklist,
  REPORT_CHAPTERS,
  POSITIONING_DESIGN_GATE_CHECKLIST,
  BRAND_PROJECT_STAGE_ORDER,
  STAGE_CONTRACTS,
  getConsultingCoverageChecklist,
  PRIMARY_FACT_SOURCE_LABELS,
} from "@mealkey/agents/m-pnt/consulting";

const statementSchema = z.object({
  forAudience: z.string().min(1).max(200),
  whoNeed: z.string().min(1).max(200),
  ourBrandIs: z.string().min(1).max(200),
  thatValue: z.string().min(1).max(200),
  because: z.string().min(1).max(300),
  unlike: z.string().min(1).max(200),
});

function wrapError(error: unknown): never {
  const message = error instanceof Error ? error.message : "咨询项目操作失败";
  if (
    message.includes("门禁") ||
    message.includes("未完成") ||
    message.includes("尚无") ||
    message.includes("基础档案未齐") ||
    message.includes("仍缺") ||
    message.includes("信息采集未完成") ||
    message.includes("信息收集清单未齐") ||
    message.includes("联网采集不足") ||
    message.includes("区域信息不足") ||
    message.includes("Human Truth") ||
    message.includes("超时") ||
    message.includes("localhost:3004")
  ) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message });
  }
  if (message.includes("不存在") || message.includes("无权限")) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const mPntConsultingRouter = router({
  meta: protectedProcedure.query(() => ({
    stages: BRAND_PROJECT_STAGE_ORDER.map((stage: BrandProjectStage) => STAGE_CONTRACTS[stage]),
    briefLayers: BRIEF_LAYER_ORDER,
    reportChapters: REPORT_CHAPTERS,
    positioningGateChecklist: POSITIONING_DESIGN_GATE_CHECKLIST,
    primaryFactSourceLabels: PRIMARY_FACT_SOURCE_LABELS,
  })),

  getProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const data = await getOrCreateBrandConsultingProject(
          ctx.userId!,
          input.projectId,
        );
        const stage = data.consulting.stage;
        const stageContract =
          STAGE_CONTRACTS[stage] ?? STAGE_CONTRACTS[BrandProjectStage.DISCOVERY];
        const layer = data.interview?.layer || "enterprise";
        let questions: Array<{
          id: string;
          prompt: string;
          answered: boolean;
          answer: string;
        }> = [];
        try {
          questions = getCurrentLayerQuestions(layer).map(
            (q: { id: string; prompt: string }) => ({
              id: q.id,
              prompt: q.prompt,
              answered: Boolean(data.interview?.answers[q.id]),
              answer: data.interview?.answers[q.id] || "",
            }),
          );
        } catch {
          questions = [];
        }
        let coverageChecklist: ReturnType<
          typeof getConsultingCoverageChecklist
        > | null = null;
        try {
          coverageChecklist = getConsultingCoverageChecklist({
            stage: data.consulting.stage,
            ledger: data.consulting.assets.evidenceLedger,
            categorySelected: Boolean(
              data.consulting.assets.categoryDiagnosis?.decision
                ?.selectedOptionId,
            ),
            brandSystemComplete:
              data.consulting.assets.brandSystem?.status === "complete",
            reportSigned:
              data.consulting.assets.reportOutline?.signOffStatus === "signed",
          });
        } catch {
          coverageChecklist = null;
        }
        const basics = data.consulting.assets.brandBasics;
        const followups = data.consulting.assets.adaptiveFollowups;
        const fuProgress = followups
          ? adaptiveFollowupProgress(followups)
          : null;
        let intakeChecklist: ReturnType<
          typeof evaluatePositioningIntakeChecklist
        > | null = null;
        try {
          intakeChecklist = evaluatePositioningIntakeChecklist(
            data.consulting,
          );
        } catch {
          intakeChecklist = null;
        }
        return {
          ...data,
          stageLabel: stageContract.label,
          stageContract,
          coverageChecklist,
          intakeChecklist,
          basicsFields: BRAND_BASICS_FIELDS,
          basicsUi: basics
            ? {
                status: basics.status,
                values: basics.values,
                missingMust: basics.missingMust,
                missingShould: basics.missingShould,
              }
            : {
                status: "draft" as const,
                values: {},
                missingMust: BRAND_BASICS_FIELDS.filter(
                  (f) => f.requirement === "must",
                ).map((f) => f.key),
                missingShould: BRAND_BASICS_FIELDS.filter(
                  (f) => f.requirement === "should",
                ).map((f) => f.key),
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
                progress: fuProgress,
              }
            : null,
          interviewUi: data.interview
            ? {
                layer: data.interview.layer,
                completeness: data.interview.completeness,
                status: data.interview.status,
                openQuestions: data.interview.openQuestions,
                questions,
                layerIndex: BRIEF_LAYER_ORDER.indexOf(data.interview.layer),
                layerTotal: BRIEF_LAYER_ORDER.length,
              }
            : null,
        };
      } catch (error) {
        wrapError(error);
      }
    }),

  saveBrandBasics: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        basics: z.record(z.string(), z.string().max(2000)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveBrandBasics(
          ctx.userId!,
          input.projectId,
          (input.basics || {}) as Record<string, string>,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

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
        return await ingestBrandDialogueTurn(
          ctx.userId!,
          input.projectId,
          input.turnId,
          input.utterance,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  completeDiscovery: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        notes: z.string().max(2000).optional(),
        businessGoal: z.string().max(500).optional(),
        basics: z.record(z.string(), z.string().max(2000)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeDiscovery(ctx.userId!, input.projectId, {
          notes: input.notes,
          businessGoal: input.businessGoal,
          basics: input.basics as Record<string, string> | undefined,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  answerBrief: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        questionId: z.string(),
        answer: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await answerBrief(
          ctx.userId!,
          input.projectId,
          input.questionId,
          input.answer,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  compileBrief: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await compileAndCompleteBrief(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  runAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await runCurrentAnalysisStage(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  confirmAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmCurrentAnalysisStage(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  selectBattlefield: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        optionId: z.string(),
        decisionReason: z.string().min(20).max(500),
        overrideReason: z.string().min(20).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await selectBattlefieldDecision(
          ctx.userId!,
          input.projectId,
          input.optionId,
          input.decisionReason,
          input.overrideReason,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  adjustPlotPoint: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        pointId: z.string(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        note: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await adjustCompetitivePlotPoint(ctx.userId!, input.projectId, input.pointId, {
          x: input.x,
          y: input.y,
          note: input.note,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  reviewMapEvidence: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        reviews: z
          .array(
            z.object({
              evidenceId: z.string(),
              reviewStatus: z.enum(["accepted", "rejected", "pending"]),
              rejectReason: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewCompetitiveMapEvidence(
          ctx.userId!,
          input.projectId,
          input.reviews,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  reviewInsightEvidence: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        reviews: z
          .array(
            z.object({
              evidenceId: z.string(),
              reviewStatus: z.enum(["accepted", "rejected", "pending"]),
              rejectReason: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewConsumerInsightEvidence(
          ctx.userId!,
          input.projectId,
          input.reviews,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  confirmInsightJudgment: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        insightStatement: z.string().min(40).max(800),
        primaryUnmetNeed: z.string().max(200).optional(),
        emotionalJob: z.string().max(200).optional(),
        functionalJob: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmConsumerInsightJudgment(ctx.userId!, input.projectId, {
          insightStatement: input.insightStatement,
          primaryUnmetNeed: input.primaryUnmetNeed,
          emotionalJob: input.emotionalJob,
          functionalJob: input.functionalJob,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  selectHypothesis: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        hypothesisId: z.string(),
        overrideReason: z.string().min(20).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await selectHypothesisDecision(
          ctx.userId!,
          input.projectId,
          input.hypothesisId,
          input.overrideReason,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  saveContractDraft: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        statement: statementSchema,
        strategicChoice: z.string().max(500).optional(),
        refreshEvidence: z.boolean().optional(),
        rejectedAlternatives: z
          .array(
            z.object({
              statementSummary: z.string(),
              rejectReason: z.string(),
            }),
          )
          .max(5)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await savePositioningDraft(ctx.userId!, input.projectId, input.statement, {
          strategicChoice: input.strategicChoice,
          rejectedAlternatives: input.rejectedAlternatives,
          refreshEvidence: input.refreshEvidence,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  reviewEvidence: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        reviews: z
          .array(
            z.object({
              evidenceId: z.string(),
              reviewStatus: z.enum(["accepted", "rejected", "pending"]),
              rejectReason: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewPositioningEvidence(
          ctx.userId!,
          input.projectId,
          input.reviews,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  proposeContract: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        statement: statementSchema,
        strategicChoice: z.string().max(500).optional(),
        rejectedAlternatives: z
          .array(
            z.object({
              statementSummary: z.string(),
              rejectReason: z.string(),
            }),
          )
          .max(5)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await proposePositioning(ctx.userId!, input.projectId, input.statement, {
          strategicChoice: input.strategicChoice,
          rejectedAlternatives: input.rejectedAlternatives,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  validateContract: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await validatePositioning(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  submitRehearsal: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        founderRetell: z.string().min(40).max(2000),
        checklist: z.object({
          canSayInOneBreath: z.boolean(),
          staffCanRepeat: z.boolean(),
          productProvesBecause: z.boolean(),
          unlikeIsClear: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitPositionRehearsal(ctx.userId!, input.projectId, {
          founderRetell: input.founderRetell,
          checklist: input.checklist,
        });
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
        return await exportSignOffPackage(ctx.userId!, input.projectId, {
          preview: input.preview,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  freezeContract: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await freezePositioning(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  confirmBrandSystem: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        valueProposition: z.string().max(500).optional(),
        communicationLine: z.string().max(800).optional(),
        forbiddenPhrases: z.array(z.string().max(200)).max(12).optional(),
        productMappings: z
          .array(
            z.object({
              productOrLine: z.string(),
              provesBecause: z.string(),
              occasion: z.string().optional(),
            }),
          )
          .max(10)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmBrandSystemDeliverable(ctx.userId!, input.projectId, {
          valueProposition: input.valueProposition,
          communicationLine: input.communicationLine,
          forbiddenPhrases: input.forbiddenPhrases,
          productMappings: input.productMappings,
        });
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
        return await signFinalStrategyReport(ctx.userId!, input.projectId, {
          signedBy: input.signedBy,
          note: input.note,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  addPrimaryFact: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        claim: z.string().min(8).max(1000),
        sourceType: z.enum([
          "founder_interview",
          "customer_quote",
          "store_observation",
          "sales_note",
          "competitor_note",
          "other",
        ]),
        relatedStage: z.enum([
          "DISCOVERY",
          "BRAND_BRIEF",
          "CATEGORY_ANALYSIS",
          "CONSUMER_INSIGHT",
          "COMPETITIVE_MAPPING",
          "POSITIONING_DESIGN",
        ]),
        strength: z.enum(["strong", "moderate", "weak"]).optional(),
        capturedBy: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addConsultingPrimaryFact(ctx.userId!, input.projectId, {
          claim: input.claim,
          sourceType: input.sourceType,
          relatedStage: input.relatedStage,
          strength: input.strength,
          capturedBy: input.capturedBy,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  removePrimaryFact: protectedProcedure
    .input(z.object({ projectId: z.string(), factId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeConsultingPrimaryFact(
          ctx.userId!,
          input.projectId,
          input.factId,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  regenerateReport: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await regenerateFinalReport(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  reset: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resetBrandConsulting(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  // ——— 六步价值路径 ———
  runMarketResearch: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await runMarketResearchStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  confirmMarketResearch: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmMarketResearchStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  fillStoreVisit: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        rivalName: z.string().min(1).max(80),
        observedMentalWord: z.string().min(2).max(40),
        evidenceSentence: z.string().min(6).max(280),
        threatToWhitespace: z.string().max(200).optional(),
        checkedItems: z.array(z.string().max(120)).max(12).optional(),
        note: z.string().max(200).optional(),
        assetIds: z.array(z.string().min(1).max(64)).max(6).optional(),
        rerunAdvisors: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { projectId, rerunAdvisors, ...fill } = input;
        return await fillStoreVisitStep(ctx.userId!, projectId, fill, {
          rerunAdvisors,
        });
      } catch (error) {
        wrapError(error);
      }
    }),

  adoptWhitespaceSuggestion: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await adoptWhitespaceSuggestionStep(
          ctx.userId!,
          input.projectId,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  runAdvisorStrategies: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await runAdvisorStrategiesStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  openWarRoom: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await openWarRoomStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  voteWarRoom: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        preference: z.enum(["ries", "trout", "ye", "blend"]),
        blendNote: z.string().max(400).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await voteWarRoomStep(
          ctx.userId!,
          input.projectId,
          input.preference,
          input.blendNote,
        );
      } catch (error) {
        wrapError(error);
      }
    }),

  generateExecutionPath: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateExecutionPathStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  acceptExecutionPath: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptExecutionPathStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),

  confirmStrategyReport: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmStrategyReportStep(ctx.userId!, input.projectId);
      } catch (error) {
        wrapError(error);
      }
    }),
});

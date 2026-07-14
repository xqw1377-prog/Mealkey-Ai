/**
 * 顾问会议进行中草稿 — 存 Project.profile.activeMeeting，刷新可恢复。
 */

import { z } from "zod";

export const ExpertStatementDraftSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  displayName: z.string(),
  round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stance: z.enum(["support", "oppose", "conditional", "neutral"]),
  claim: z.string().max(400),
  reasons: z.array(z.string().max(400)).max(6),
  challengeTo: z.string().max(80).optional(),
});

export const MeetingConflictDraftSchema = z.object({
  id: z.string(),
  issue: z.string(),
  positionA: z.string(),
  positionB: z.string(),
  conflictLabel: z.string(),
});

export const ConsensusDraftSchema = z.object({
  summary: z.string(),
  proposedDecision: z.string(),
  coreReasons: z.array(z.string()).max(8),
  nextActions: z.array(z.string()).max(8),
  validationPlan: z.string().optional(),
});

export const DecisionOptionDraftSchema = z.object({
  id: z.string(),
  label: z.string(),
  summary: z.string(),
  tradeoff: z.string(),
});

export const MeetingRuntimeDraftSchema = z.object({
  meeting: z.object({
    recommendation: z.string().optional(),
    conflicts: z
      .array(
        z.object({
          conflictId: z.string(),
          summary: z.string(),
          sideA: z.string(),
          sideB: z.string(),
          dimension: z.string(),
          agents: z.array(z.string()),
        }),
      )
      .max(8),
    rounds: z
      .array(
        z.object({
          round: z.number(),
          title: z.string(),
          items: z
            .array(
              z.object({
                agent: z.string(),
                summary: z.string(),
                stance: z.string().optional(),
              }),
            )
            .max(8),
        }),
      )
      .max(6),
  }),
  decisions: z
    .array(
      z.object({
        decisionId: z.string(),
        sourceAgent: z.string(),
        judgement: z.string(),
        stance: z.string().optional(),
        risks: z.array(z.string()).max(6),
        nextSteps: z.array(z.string()).max(6),
      }),
    )
    .max(8),
  finalDecision: z.object({
    chosen: z.string(),
    problem: z.string(),
    reason: z.array(z.string()).max(8),
    validationPlan: z.array(z.string()).max(8),
  }),
});

export const ActiveMeetingDraftSchema = z.object({
  meetingId: z.string().optional(),
  topic: z.string().min(1).max(500),
  topicConfirmed: z.boolean(),
  lifecycle: z.enum([
    "INIT",
    "PREPARE",
    "OPEN",
    "DISCUSS",
    "DEBATE",
    "SYNTHESIS",
    "USER_CONFIRM",
    "DECISION",
    "VALIDATE",
    "MEMORY_UPDATE",
    "ABANDONED",
  ]),
  deliberationRound: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  liveStatements: z.array(ExpertStatementDraftSchema).max(24),
  liveConflict: MeetingConflictDraftSchema.nullable(),
  liveConsensus: ConsensusDraftSchema.nullable(),
  liveOptions: z.array(DecisionOptionDraftSchema).max(6),
  selectedOptionId: z.string().nullable(),
  focusChoice: z.string().max(200).nullable(),
  serverSynthesis: z
    .object({
      judgement: z.string(),
      reasons: z.array(z.string()).max(8),
      validationPlan: z.string(),
    })
    .nullable(),
  meetingRuntime: MeetingRuntimeDraftSchema.nullable(),
  conversationId: z.string().nullable().optional(),
  selectedAssetIds: z.array(z.string()).max(12).optional(),
  updatedAt: z.string(),
  status: z.enum(["draft", "confirmed"]),
});

export type ActiveMeetingDraft = z.infer<typeof ActiveMeetingDraftSchema>;

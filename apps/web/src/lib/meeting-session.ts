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
  challengeEvidenceId: z.string().max(80).optional(),
  evidence: z
    .array(
      z.object({
        evidenceId: z.string(),
        statement: z.string().max(400),
        sourceLabel: z.string().max(80).optional(),
      }),
    )
    .max(6)
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().max(500).optional(),
  validation: z.string().max(300).optional(),
  evidenceSufficient: z.boolean().optional(),
  evidenceGap: z.array(z.string().max(300)).max(4).optional(),
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
          drivingEvidenceIds: z.array(z.string()).max(8).optional(),
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
                challengeTo: z.string().optional(),
                challengeEvidenceId: z.string().optional(),
              }),
            )
            .max(8),
        }),
      )
      .max(6),
    conflictMatrix: z
      .object({
        rows: z
          .array(
            z.object({
              topic: z.string(),
              cells: z.record(z.string()),
              summary: z.string(),
              drivingEvidenceIds: z.array(z.string()).max(8).optional(),
            }),
          )
          .max(6),
        primary: z
          .object({
            topic: z.string(),
            sideA: z.object({
              agents: z.array(z.string()),
              claim: z.string(),
            }),
            sideB: z.object({
              agents: z.array(z.string()),
              claim: z.string(),
            }),
            drivingEvidenceIds: z.array(z.string()).max(8).optional(),
            question: z.string().optional(),
          })
          .nullable()
          .optional(),
        tradeoffs: z
          .array(
            z.object({
              keep: z.string(),
              giveUp: z.string(),
              why: z.string(),
            }),
          )
          .max(4)
          .optional(),
      })
      .optional(),
    debateSession: z
      .object({
        debateId: z.string(),
        status: z.string(),
        conflicts: z
          .array(
            z.object({
              conflictId: z.string(),
              topic: z.string(),
              severity: z.enum(["low", "medium", "high"]),
              committees: z.array(z.string()).max(4),
              evidenceRefs: z.array(z.string()).max(8),
              summary: z.string(),
            }),
          )
          .max(8),
        challenges: z
          .array(
            z.object({
              challengeId: z.string(),
              fromCommittee: z.string(),
              fromAgent: z.string(),
              targetCommittee: z.string(),
              targetAgent: z.string(),
              challengeType: z.enum(["evidence", "logic", "assumption", "risk"]),
              statement: z.string(),
              evidenceRefs: z.array(z.string()).max(4).optional(),
            }),
          )
          .max(8),
        proposal: z
          .object({
            decision: z.string(),
            whyNow: z.string(),
            tradeoffs: z.array(z.string()).max(6),
            conditions: z.array(z.string()).max(6),
            risksAccepted: z.array(z.string()).max(6),
            validationPlan: z.string(),
          })
          .optional(),
        scenarioTests: z
          .array(
            z.object({
              scenarioId: z.string(),
              scenario: z.string(),
              trigger: z.string(),
              impact: z.string(),
              mitigation: z.string(),
            }),
          )
          .max(4),
      })
      .optional(),
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
        evidence: z
          .array(
            z.object({
              evidenceId: z.string().optional(),
              label: z.string(),
              content: z.string(),
              source: z.string().optional(),
            }),
          )
          .max(6)
          .optional(),
        reasoning: z.string().optional(),
        validation: z.string().optional(),
        evidenceSufficient: z.boolean().optional(),
        evidenceGap: z.array(z.string()).max(4).optional(),
        confidence: z.number().optional(),
      }),
    )
    .max(8),
  finalDecision: z.object({
    chosen: z.string(),
    problem: z.string(),
    reason: z.array(z.string()).max(8),
    validationPlan: z.array(z.string()).max(8),
    evidenceStatus: z.enum(["sufficient", "insufficient"]).optional(),
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

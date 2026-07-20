/**
 * Decision Runtime C — Opinion / Evidence 追加（写入 outcome / evidence JSON）
 */

import type { PrismaClient } from "@/generated/prisma";
import type {
  DecisionOpinion,
  DecisionOpinionExpert,
  MKEvidence,
  MKEvidenceType,
} from "../../contracts/mk-decision";
import { assertPrismaDecisionId } from "./registry";
import { emitDecisionRuntimeEvent } from "./events";

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export async function appendDecisionOpinion(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    expert: DecisionOpinionExpert;
    position: DecisionOpinion["position"];
    reason: string;
    confidence?: number;
    evidenceIds?: string[];
  },
): Promise<{ opinion: DecisionOpinion; opinions: DecisionOpinion[] }> {
  const decisionId = assertPrismaDecisionId(input.decisionId);
  const row = await prisma.decision.findFirst({
    where: { id: decisionId, projectId: input.projectId },
  });
  if (!row) throw new Error("决策不存在或不属于本项目");

  const outcome = asRecord(row.outcome);
  const opinions = Array.isArray(outcome.opinions)
    ? ([...outcome.opinions] as DecisionOpinion[])
    : [];
  const opinion: DecisionOpinion = {
    decisionId,
    expert: input.expert,
    position: input.position,
    reason: input.reason.slice(0, 400),
    confidence:
      typeof input.confidence === "number" ? input.confidence : 0.7,
    evidenceIds: input.evidenceIds || [],
  };
  opinions.push(opinion);
  outcome.opinions = opinions.slice(-20);

  await prisma.decision.update({
    where: { id: decisionId },
    data: { outcome: JSON.stringify(outcome) },
  });

  await emitDecisionRuntimeEvent(prisma, {
    decisionId,
    eventType: "ExpertOpinionSubmitted",
    sourceEventId: `ExpertOpinionSubmitted:${decisionId}:${opinion.expert}:${opinions.length}`,
    payload: { expert: opinion.expert, position: opinion.position },
  }).catch(() => undefined);

  return { opinion, opinions };
}

export async function appendDecisionEvidence(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    type: MKEvidenceType;
    source: string;
    content: string;
    confidence?: number;
  },
): Promise<{ evidence: MKEvidence; all: MKEvidence[] }> {
  const decisionId = assertPrismaDecisionId(input.decisionId);
  const row = await prisma.decision.findFirst({
    where: { id: decisionId, projectId: input.projectId },
  });
  if (!row) throw new Error("决策不存在或不属于本项目");

  const existing = parseEvidenceArray(row.evidence);
  const item: MKEvidence = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `ev_${crypto.randomUUID().slice(0, 8)}`
        : `ev_${Date.now().toString(36)}`,
    type: input.type,
    source: input.source,
    confidence:
      typeof input.confidence === "number" ? input.confidence : 0.7,
    content: input.content.slice(0, 400),
  };
  const all = [...existing, item].slice(-40);

  await prisma.decision.update({
    where: { id: decisionId },
    data: { evidence: JSON.stringify(all) },
  });

  await emitDecisionRuntimeEvent(prisma, {
    decisionId,
    eventType: "DecisionAnalyzed",
    sourceEventId: `EvidenceAppended:${decisionId}:${item.id}`,
    payload: { evidenceId: item.id, type: item.type },
  }).catch(() => undefined);

  return { evidence: item, all };
}

function parseEvidenceArray(raw: unknown): MKEvidence[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as MKEvidence[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? (raw as MKEvidence[]) : [];
}

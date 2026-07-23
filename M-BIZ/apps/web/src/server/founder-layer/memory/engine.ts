import type { PrismaClient } from "@/generated/prisma";
import { saveMemory } from "@/server/services/agent-os.service";
import type {
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemoryDomain,
  FounderMemoryWrite,
  FounderMission,
} from "../contracts";

function buildWriteId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `founder-memory-${Date.now()}`;
}

function domainFromMission(mission: FounderMission): FounderMemoryDomain {
  if (mission.missionType === "positioning_review") return "brand";
  if (mission.missionType === "market_entry") return "market";
  if (mission.missionType === "business_diagnosis") return "business";
  if (mission.missionType === "organization_review") return "organization";
  return "mixed";
}

export interface FounderMemoryEngineInput {
  projectId: string;
  mission: FounderMission;
  decisions: FounderDecision[];
  meeting: FounderMeeting;
  finalDecision: FounderFinalDecision;
}

/** 把会议与终局决策压成可写入记忆层的最小写集合 */
export function buildFounderMemoryWrites(
  input: FounderMemoryEngineInput,
): FounderMemoryWrite[] {
  const now = new Date().toISOString();
  const domain = domainFromMission(input.mission);
  const writes: FounderMemoryWrite[] = [];

  writes.push({
    writeId: buildWriteId(),
    projectId: input.projectId,
    missionId: input.mission.missionId,
    type: "meeting",
    domain,
    summary: input.meeting.recommendation || input.meeting.topic,
    payload: {
      meetingId: input.meeting.meetingId,
      topic: input.meeting.topic,
      conflicts: input.meeting.conflicts.map((item) => item.summary),
      recommendation: input.meeting.recommendation,
    },
    source: "meeting_engine",
    createdAt: now,
  });

  writes.push({
    writeId: buildWriteId(),
    projectId: input.projectId,
    missionId: input.mission.missionId,
    type: "decision",
    domain,
    summary: `${input.finalDecision.chosen}：${input.finalDecision.problem}`,
    payload: {
      finalDecisionId: input.finalDecision.finalDecisionId,
      chosen: input.finalDecision.chosen,
      reason: input.finalDecision.reason,
      validationPlan: input.finalDecision.validationPlan,
      status: input.finalDecision.status,
    },
    source: "decision_engine",
    createdAt: now,
  });

  for (const decision of input.decisions.slice(0, 4)) {
    writes.push({
      writeId: buildWriteId(),
      projectId: input.projectId,
      missionId: input.mission.missionId,
      type: "fact",
      domain,
      summary: `${decision.sourceAgent}：${decision.judgement}`.slice(0, 160),
      payload: {
        decisionId: decision.decisionId,
        sourceAgent: decision.sourceAgent,
        stance: decision.stance,
        risks: decision.risks,
        nextSteps: decision.nextSteps,
      },
      source: "agent_decision",
      createdAt: now,
    });
  }

  return writes;
}

function mapMemoryType(type: FounderMemoryWrite["type"]): string {
  if (type === "meeting") return "MEETING";
  if (type === "decision") return "DECISION";
  if (type === "preference") return "PREFERENCE";
  return "PROJECT";
}

function mapImportance(type: FounderMemoryWrite["type"]): number {
  if (type === "decision") return 90;
  if (type === "meeting") return 85;
  if (type === "preference") return 75;
  return 70;
}

/** 将 Founder Layer memoryWrites 持久化到 Memory 表 */
export async function persistFounderMemoryWrites(
  prisma: PrismaClient,
  ownerId: string,
  writes: FounderMemoryWrite[],
): Promise<number> {
  let saved = 0;
  for (const write of writes) {
    await saveMemory(prisma, ownerId, {
      key: `founder_${write.type}_${write.projectId}_${write.writeId}`,
      content: JSON.stringify({
        summary: write.summary,
        payload: write.payload,
        missionId: write.missionId,
        domain: write.domain,
        source: write.source,
        createdAt: write.createdAt,
      }),
      type: mapMemoryType(write.type),
      source: `founder-layer:${write.source}`,
      importance: mapImportance(write.type),
      projectId: write.projectId,
    });
    saved += 1;
  }
  return saved;
}

/**
 * 七常委待裁决草稿读写（project.profile.activeCouncilDraft）
 */

import type { PrismaClient } from "@/generated/prisma";
import {
  parseActiveCouncilDraft,
  type ActiveCouncilDraft,
} from "@/lib/council-session-draft";
import { validateProfile } from "@/lib/profile-schema";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import type { CouncilMeetingSession } from "../../../../../../packages/agents/src/founder-os";

function clip(text: string, max: number): string {
  const t = (text || "").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** 从 stanceMatrix / opinions 取真实支持·反对·条件票，禁止用 insightCount 估算 */
export function countCouncilStanceVotes(session: CouncilMeetingSession): {
  supportCount: number;
  opposeCount: number;
  observeCount: number;
} {
  if (session.stanceMatrix) {
    return {
      supportCount: session.stanceMatrix.support.length,
      opposeCount: session.stanceMatrix.oppose.length,
      observeCount: session.stanceMatrix.conditional.length,
    };
  }
  const opinions =
    session.opinions?.length > 0
      ? session.opinions
      : session.round1Opinions || [];
  let supportCount = 0;
  let opposeCount = 0;
  let observeCount = 0;
  for (const o of opinions) {
    if (o.position === "support") supportCount += 1;
    else if (o.position === "oppose") opposeCount += 1;
    else observeCount += 1;
  }
  return { supportCount, opposeCount, observeCount };
}

export function buildActiveCouncilDraft(
  session: CouncilMeetingSession,
): ActiveCouncilDraft | null {
  if (session.phase === "closed") return null;
  const boardReady =
    session.phase === "awaiting_founder" ||
    session.phase === "round3_resolution" ||
    Boolean(session.board);
  if (!boardReady) return null;

  const votes = countCouncilStanceVotes(session);

  return {
    status:
      session.phase === "awaiting_founder" ? "awaiting_founder" : "board_ready",
    sessionId: session.sessionId,
    caseId: session.casePacket.caseId,
    topic: clip(session.agenda.topic, 400),
    level: session.agenda.level,
    recommendedAction: session.board?.recommendedAction
      ? clip(session.board.recommendedAction, 80)
      : undefined,
    insightCount: session.insights?.length || 0,
    supportCount: votes.supportCount,
    opposeCount: votes.opposeCount,
    observeCount: votes.observeCount,
    biggestDispute: session.board?.biggestDispute
      ? clip(session.board.biggestDispute, 400)
      : undefined,
    session,
    updatedAt: new Date().toISOString(),
  };
}

export async function saveActiveCouncilDraft(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    session: CouncilMeetingSession;
  },
): Promise<void> {
  const draft = buildActiveCouncilDraft(input.session);
  if (!draft) return;
  try {
    await updateProjectProfile(
      input.projectId,
      (profile) => ({
        ...profile,
        activeCouncilDraft: draft,
      }),
      { ownerId: input.ownerId },
    );
  } catch (error) {
    const conflict = toProfileConflictTRPC(error);
    if (conflict) throw conflict;
    // 草稿失败不阻断主流程
    console.warn("saveActiveCouncilDraft failed", error);
  }
}

export async function clearActiveCouncilDraft(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string },
): Promise<void> {
  try {
    await updateProjectProfile(
      input.projectId,
      (profile) => {
        const { activeCouncilDraft: _drop, ...rest } = profile as Record<
          string,
          unknown
        > & { activeCouncilDraft?: unknown };
        return rest;
      },
      { ownerId: input.ownerId },
    );
  } catch (error) {
    console.warn("clearActiveCouncilDraft failed", error);
  }
}

export async function loadActiveCouncilDraft(
  prisma: PrismaClient,
  input: { projectId: string; userId: string },
): Promise<ActiveCouncilDraft | null> {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, owner: { userId: input.userId } },
    select: { profile: true },
  });
  if (!project) return null;
  const profile = validateProfile(project.profile) as Record<string, unknown>;
  return parseActiveCouncilDraft(profile.activeCouncilDraft);
}

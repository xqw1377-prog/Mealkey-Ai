/**
 * 三席咨询资产 → 今日世界变化 / Signal（E2 收口）
 * 从 project.profile 读取 mMkt/mBiz/mEdConsultingProject，不 invent 假数据。
 */

import { decisionReadyPath } from "@/lib/decision-entry";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";

const SEAT_KEYS = [
  {
    key: "mMktConsultingProject",
    agentId: "m-mkt",
    label: "市场",
    kind: "competition" as const,
  },
  {
    key: "mBizConsultingProject",
    agentId: "m-biz",
    label: "商业",
    kind: "alert" as const,
  },
  {
    key: "mEdConsultingProject",
    agentId: "m-ed",
    label: "组织",
    kind: "alert" as const,
  },
] as const;

type ConsultingLike = {
  consultingId?: string;
  assets?: {
    strategyConfirmedAt?: string;
    signOffStatus?: string;
    domainStrength?: {
      overall: number;
      readyForCouncil: boolean;
      gaps?: string[];
      summary?: string;
    };
    decisionArtifact?: { recommendation?: string };
    warRoom?: { consensusOneLiner?: string; status?: string };
    research?: { status?: string; headline?: string };
  };
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function readSeat(
  profile: Record<string, unknown> | null | undefined,
  key: string,
): ConsultingLike | null {
  const raw = profile?.[key];
  if (!raw || typeof raw !== "object") return null;
  return raw as ConsultingLike;
}

function withinDays(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

/**
 * 三席咨询 → 世界变化条（最多 4）
 */
export function worldChangesFromSeatConsulting(input: {
  profile: Record<string, unknown> | null | undefined;
  projectId: string;
}): WorldChangeV1[] {
  const out: WorldChangeV1[] = [];

  for (const seat of SEAT_KEYS) {
    const consulting = readSeat(input.profile, seat.key);
    if (!consulting?.assets) continue;
    const assets = consulting.assets;
    const strength = assets.domainStrength;
    const rec =
      assets.decisionArtifact?.recommendation ||
      assets.warRoom?.consensusOneLiner ||
      assets.research?.headline ||
      "";

    // 策略已确认但未签字 → 待拍板/待落签
    if (
      assets.strategyConfirmedAt &&
      assets.signOffStatus !== "signed" &&
      withinDays(assets.strategyConfirmedAt, 14)
    ) {
      const topic = clip(
        rec
          ? `是否按「${rec}」完成${seat.label}决策签字与落地？`
          : `${seat.label}策略已确认，是否进入签字与执行？`,
        64,
      );
      out.push({
        id: `wc_seat_${seat.agentId}_sign`,
        kind: seat.kind,
        title: `${seat.label}咨询：策略待签字落地`,
        detail: clip(
          strength?.summary ||
            rec ||
            `${seat.label}六步已确认策略，尚未正式签字。`,
          120,
        ),
        decisionTopic: topic,
        href: decisionReadyPath(input.projectId, topic),
      });
    }

    // 证据强度不足但调研已确认 → 提醒补证据
    if (
      strength &&
      !strength.readyForCouncil &&
      strength.overall < 55 &&
      assets.research?.status === "confirmed"
    ) {
      const gap = (strength.gaps || []).slice(0, 2).join("、") || "证据仍薄";
      const topic = clip(
        `是否先补齐${seat.label}关键证据（${gap}）再会商？`,
        64,
      );
      out.push({
        id: `wc_seat_${seat.agentId}_gap`,
        kind: "customer",
        title: `${seat.label}咨询：证据强度不足`,
        detail: clip(strength.summary || `领域强度 ${strength.overall}/100；${gap}`, 120),
        decisionTopic: topic,
        href: decisionReadyPath(input.projectId, topic),
      });
    }

    // 会议室已拍板 → 今日可跟进
    if (
      assets.warRoom?.status === "agreed" &&
      !assets.strategyConfirmedAt &&
      assets.warRoom.consensusOneLiner
    ) {
      const topic = clip(
        `会议室已拍板「${assets.warRoom.consensusOneLiner}」，是否确认${seat.label}策略？`,
        64,
      );
      out.push({
        id: `wc_seat_${seat.agentId}_war`,
        kind: "alert",
        title: `${seat.label}会议室已拍板，待确认策略`,
        detail: clip(assets.warRoom.consensusOneLiner, 120),
        decisionTopic: topic,
        href: decisionReadyPath(input.projectId, topic),
      });
    }
  }

  const seen = new Set<string>();
  return out
    .filter((c) => {
      if (seen.has(c.title)) return false;
      seen.add(c.title);
      return true;
    })
    .slice(0, 4);
}

/**
 * 三席咨询 → DecisionSignal（最多 3）
 */
export function signalsFromSeatConsulting(input: {
  profile: Record<string, unknown> | null | undefined;
  projectId: string;
  brandName?: string | null;
  city?: string | null;
}): DecisionSignalV1[] {
  const now = new Date().toISOString();
  const changes = worldChangesFromSeatConsulting({
    profile: input.profile,
    projectId: input.projectId,
  });
  return changes.slice(0, 3).map((c, idx) => {
    const id = `sig_seat_${c.id}_${idx}`;
    const isGap = /证据强度不足/.test(c.title);
    const isSign = /待签字|待确认策略/.test(c.title);
    const question = clip(
      c.decisionTopic || "是否根据最新咨询进展再去拍板？",
      80,
    );
    return {
      id,
      signalId: id,
      projectId: input.projectId,
      source: "SYSTEM" as const,
      type: isGap ? ("UNKNOWN" as const) : ("CHANGE" as const),
      title: clip(c.title, 48),
      description: clip(
        `${[input.city, input.brandName].filter(Boolean).join(" · ")}：${c.detail}`,
        160,
      ),
      importance: isSign ? 0.78 : isGap ? 0.62 : 0.7,
      urgency: isSign ? ("medium" as const) : ("low" as const),
      relatedScope: {
        brandName: input.brandName || undefined,
        city: input.city || undefined,
      },
      evidenceIds: [c.id],
      suggestedQuestion: question,
      observedAt: now,
      status: "open" as const,
    };
  });
}

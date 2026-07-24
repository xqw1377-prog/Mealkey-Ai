/**
 * RIP 日更差分 → DecisionSignal（R4）
 * 差分进 Inbox/Focus 仍走 Candidate 门禁，禁止直接刷 Decision 行。
 */

import type { DecisionHorizonV1 } from "@/server/founder-layer/contracts/business-identity";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";
import type {
  RestaurantEvidenceV1,
  RestaurantIntelligenceSnapshotV1,
} from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

export type RipDiffV1 = {
  schemaVersion: 1;
  fromSnapshotId: string | null;
  toSnapshotId: string;
  addedEvidenceIds: string[];
  removedEvidenceIds: string[];
  newWatchouts: string[];
  newPositiveKeywords: string[];
  alertLines: string[];
  summaryLine: string;
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function evidenceKey(e: RestaurantEvidenceV1) {
  return `${e.source}::${e.content}`;
}

export function diffRipSnapshots(
  previous: RestaurantIntelligenceSnapshotV1 | null | undefined,
  current: RestaurantIntelligenceSnapshotV1,
): RipDiffV1 {
  const prevKeys = new Set((previous?.evidence || []).map(evidenceKey));
  const currKeys = new Set(current.evidence.map(evidenceKey));

  const added = current.evidence.filter((e) => !prevKeys.has(evidenceKey(e)));
  const removed = (previous?.evidence || []).filter(
    (e) => !currKeys.has(evidenceKey(e)),
  );

  const prevWatch = new Set(previous?.customer.watchouts || []);
  const prevPos = new Set(previous?.customer.positiveKeywords || []);
  const newWatchouts = current.customer.watchouts.filter((w) => !prevWatch.has(w));
  const newPositiveKeywords = current.customer.positiveKeywords.filter(
    (k) => !prevPos.has(k),
  );

  const alertLines = current.alerts
    .map((a) => a.line)
    .filter((line) => !(previous?.alerts || []).some((p) => p.line === line))
    .slice(0, 3);

  const parts: string[] = [];
  if (added.length) parts.push(`新增 ${added.length} 条市场证据`);
  if (newWatchouts.length)
    parts.push(`需关注「${newWatchouts.slice(0, 2).join("、")}」`);
  if (newPositiveKeywords.length)
    parts.push(`正向多见「${newPositiveKeywords.slice(0, 2).join("、")}」`);
  if (!parts.length && alertLines.length) parts.push(alertLines[0]!);
  if (!parts.length) parts.push("画像无明显差分");

  return {
    schemaVersion: 1,
    fromSnapshotId: previous?.snapshotId ?? null,
    toSnapshotId: current.snapshotId,
    addedEvidenceIds: added.map((e) => e.id),
    removedEvidenceIds: removed.map((e) => e.id),
    newWatchouts,
    newPositiveKeywords,
    alertLines,
    summaryLine: parts.join("；"),
  };
}

/**
 * 将有意义的差分投影为 Signal（最多 2 条）。
 * 无实质变化 → 空数组（不制造噪声 Candidate）。
 */
export function signalsFromRipDiff(input: {
  projectId: string;
  brandName?: string | null;
  storeName?: string | null;
  city?: string | null;
  decisionHorizon?: DecisionHorizonV1 | null;
  diff: RipDiffV1;
  current: RestaurantIntelligenceSnapshotV1;
}): DecisionSignalV1[] {
  const { diff, current } = input;
  const meaningful =
    diff.addedEvidenceIds.length > 0 ||
    diff.newWatchouts.length > 0 ||
    diff.newPositiveKeywords.length > 0 ||
    diff.alertLines.length > 0;
  if (!meaningful) return [];
  if (current.customer.evidenceInsufficient && !diff.alertLines.length) {
    return [];
  }

  const now = new Date().toISOString();
  const brand = input.brandName || current.basic.brandName;
  const place = [input.city || current.basic.city, brand].filter(Boolean).join(" · ");
  const signals: DecisionSignalV1[] = [];

  if (diff.newWatchouts.length || diff.addedEvidenceIds.length) {
    const watch = diff.newWatchouts[0] || diff.alertLines[0] || "顾客信号变化";
    const id = `sig_rip_${diff.toSnapshotId.slice(-8)}_watch`;
    signals.push({
      id,
      signalId: id,
      projectId: input.projectId,
      source: "M_INTEL",
      type: "CHANGE",
      title: clip(`经营画像变化：${watch}`, 48),
      description: clip(
        `${place}：${diff.summaryLine}。需判断是否升格去拍板，而非直接下结论。`,
        160,
      ),
      importance: diff.newWatchouts.length ? 0.78 : 0.62,
      urgency: diff.newWatchouts.length ? "medium" : "low",
      relatedScope: {
        brandName: brand,
        storeName: input.storeName || undefined,
        city: input.city || current.basic.city || undefined,
        horizon: input.decisionHorizon || undefined,
      },
      evidenceIds: diff.addedEvidenceIds.slice(0, 4),
      suggestedQuestion: clip(
        diff.newWatchouts.length
          ? `是否优先处理顾客侧「${diff.newWatchouts[0]}」？`
          : "是否根据最新经营画像调整今日重点？",
        80,
      ),
      observedAt: now,
      status: "open",
    });
  }

  if (
    diff.newPositiveKeywords.length &&
    !diff.newWatchouts.length &&
    signals.length === 0
  ) {
    const id = `sig_rip_${diff.toSnapshotId.slice(-8)}_pos`;
    signals.push({
      id,
      signalId: id,
      projectId: input.projectId,
      source: "M_INTEL",
      type: "OPPORTUNITY",
      title: clip(`顾客正向：${diff.newPositiveKeywords[0]}`, 48),
      description: clip(
        `${place}：画像差分显示正向关键词上升（${diff.newPositiveKeywords.slice(0, 2).join("、")}）。可评估是否加大相关运营投入。`,
        160,
      ),
      importance: 0.55,
      urgency: "low",
      relatedScope: {
        brandName: brand,
        storeName: input.storeName || undefined,
        city: input.city || current.basic.city || undefined,
        horizon: input.decisionHorizon || undefined,
      },
      evidenceIds: diff.addedEvidenceIds.slice(0, 4),
      suggestedQuestion: clip(
        `是否围绕「${diff.newPositiveKeywords[0]}」加大投入？`,
        80,
      ),
      observedAt: now,
      status: "open",
    });
  }

  return signals.slice(0, 2);
}

/** 取当前与上一版已确认/历史 Snapshot 做差分 */
export function pickRipDiffPair(
  snapshots: RestaurantIntelligenceSnapshotV1[],
  currentSnapshotId: string | null,
): {
  previous: RestaurantIntelligenceSnapshotV1 | null;
  current: RestaurantIntelligenceSnapshotV1 | null;
} {
  if (!currentSnapshotId) return { previous: null, current: null };
  const current =
    snapshots.find((s) => s.snapshotId === currentSnapshotId) || null;
  if (!current) return { previous: null, current: null };
  const idx = snapshots.findIndex((s) => s.snapshotId === current.snapshotId);
  const previous =
    idx > 0
      ? snapshots[idx - 1] || null
      : snapshots.filter((s) => s.snapshotId !== current.snapshotId).at(-1) ||
        null;
  return { previous, current };
}

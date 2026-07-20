/**
 * Positioning Map 可审计层 — 坐标纠偏、地图证据审阅、确认门禁
 */
import type { CompetitiveMap, MapEvidence, MapPlotPoint } from "./types";
import { ContractGateError } from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function assertDraft(map: CompetitiveMap) {
  if (map.status === "complete") {
    throw new ContractGateError("竞争地图已确认完成，不可再改坐标或审阅证据", [
      "competitiveMap.status=draft",
    ]);
  }
}

/** 纠偏坐标点；空位点同步 whitespaceRegion；竞品点同步 competitors */
export function adjustPlotPoint(
  map: CompetitiveMap,
  pointId: string,
  coords: { x: number; y: number; note?: string },
): CompetitiveMap {
  assertDraft(map);
  const points = map.plotPoints || [];
  const target = points.find((p) => p.id === pointId);
  if (!target) {
    throw new ContractGateError("坐标点不存在", [`pointId=${pointId}`]);
  }

  const x = clamp(coords.x);
  const y = clamp(coords.y);
  const nextPoints: MapPlotPoint[] = points.map((p) =>
    p.id === pointId
      ? {
          ...p,
          x,
          y,
          note: coords.note?.trim() || p.note,
          adjusted: true,
          adjustedAt: new Date().toISOString(),
        }
      : p,
  );
  const adjusted = nextPoints.find((p) => p.id === pointId)!;

  let whitespaceRegion = map.whitespaceRegion;
  if (adjusted.kind === "whitespace") {
    whitespaceRegion = {
      ...(whitespaceRegion || { label: adjusted.label, halfW: 12, halfH: 10 }),
      x: adjusted.x,
      y: adjusted.y,
      label: whitespaceRegion?.label || adjusted.label,
    };
  }

  let competitors = map.competitors;
  if (adjusted.kind === "competitor") {
    competitors = map.competitors.map((c) =>
      c.name === adjusted.label ? { ...c, x: adjusted.x, y: adjusted.y } : c,
    );
  }

  if (adjusted.kind === "our_brand") {
    // 我方占位纠偏时，若贴近空位则保留；仅更新点本身
  }

  return {
    ...map,
    plotPoints: nextPoints,
    whitespaceRegion,
    competitors,
  };
}

/** 审阅地图证据 */
export function reviewMapEvidenceItems(
  map: CompetitiveMap,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
): CompetitiveMap {
  assertDraft(map);
  const list = map.mapEvidence || [];
  if (list.length === 0) {
    throw new ContractGateError("尚无地图证据可审阅", ["mapEvidence.length=0"]);
  }
  const byId = new Map(reviews.map((r) => [r.evidenceId, r]));
  const next: MapEvidence[] = list.map((e) => {
    const r = byId.get(e.evidenceId);
    if (!r) return e;
    return {
      ...e,
      reviewStatus: r.reviewStatus,
      rejectReason:
        r.reviewStatus === "rejected"
          ? (r.rejectReason || "创始人驳回：不足以支撑空位判断").trim()
          : undefined,
    };
  });
  return { ...map, mapEvidence: next };
}

export function mapEvidenceStats(map: CompetitiveMap) {
  const list = map.mapEvidence || [];
  const accepted = list.filter((e) => e.reviewStatus === "accepted").length;
  const pending = list.filter(
    (e) => !e.reviewStatus || e.reviewStatus === "pending",
  ).length;
  const rejected = list.filter((e) => e.reviewStatus === "rejected").length;
  return { accepted, pending, rejected, total: list.length };
}

/** 确认推进前：地图必须可审计 */
export function assertMapAuditable(map: CompetitiveMap): void {
  const missing: string[] = [];
  if (!map.whitespace?.trim()) missing.push("competitiveMap.whitespace");
  if (!map.whitespaceRegion) missing.push("competitiveMap.whitespaceRegion");
  if ((map.plotPoints?.length ?? 0) < 3) {
    missing.push("competitiveMap.plotPoints.length>=3");
  }
  const kinds = new Set((map.plotPoints || []).map((p) => p.kind));
  if (!kinds.has("whitespace")) missing.push("competitiveMap.plotPoints.whitespace");
  if (!kinds.has("our_brand")) missing.push("competitiveMap.plotPoints.our_brand");

  const stats = mapEvidenceStats(map);
  if (stats.accepted < 2) missing.push("competitiveMap.mapEvidence.accepted>=2");
  if (stats.pending > 0) missing.push("competitiveMap.mapEvidence.pending=0");

  if (missing.length > 0) {
    throw new ContractGateError(
      "竞争地图未完成可审计确认：请纠偏/审阅地图证据后再推进",
      missing,
    );
  }
}

/** 测试/迁移辅助：将地图证据全部标为采纳 */
export function acceptAllMapEvidence(map: CompetitiveMap): CompetitiveMap {
  return {
    ...map,
    mapEvidence: (map.mapEvidence || []).map((e) => ({
      ...e,
      reviewStatus: "accepted" as const,
      rejectReason: undefined,
    })),
  };
}

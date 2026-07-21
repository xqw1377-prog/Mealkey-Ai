/**
 * 七常委开会前：把「今日世界变化 + Brain 已知/未知 + 领域强度」注入 EvidencePacket。
 * 对齐 E0/E1/M-*：证据与强度进决策，而非加席位。
 */
import type {
  EvidenceItem,
  EvidencePacket,
} from "../../../../../../packages/agents/src/founder-os";
import type { DomainStrengthSnapshot } from "../../../../../../packages/agents/src/consulting-os";
import { computeEvidenceWeight } from "@/server/founder-layer/capability/decision-center/evidence-weight";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function strengthGapLine(s: DomainStrengthSnapshot): string {
  return `${s.agentId} 强度 ${s.overall}/100（${s.grade}）${s.readyForCouncil ? "·可进常委" : "·须补缺口"}：${s.summary}`;
}

/** 从 DailyScan / profile 世界变化 → EvidenceItem */
export function worldChangesToEvidenceItems(
  changes: WorldChangeV1[],
  caseId: string,
  now = new Date(),
): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  for (const c of changes.slice(0, 12)) {
    if (!c?.id || !c.title) continue;
    const relevance =
      c.kind === "alert" ? 0.88 : c.kind === "customer" ? 0.82 : 0.72;
    const weight = computeEvidenceWeight({
      sourceTrustBand: "B",
      timestamp: now.toISOString(),
      relevance,
      confidence: relevance,
      now,
    });
    out.push({
      evidenceId: `WC-${caseId}-${c.id}`.slice(0, 64),
      sourceAgent: "WORLD",
      claim: [c.title, c.detail].filter(Boolean).join(" — ").slice(0, 280),
      strength:
        weight >= 0.45 ? "strong" : weight >= 0.25 ? "medium" : "weak",
      category: c.kind || "world_change",
      refs: c.decisionTopic ? [c.decisionTopic.slice(0, 80)] : undefined,
    });
  }
  return out;
}

export function collectWorldChangesFromProfile(
  profile: Record<string, unknown> | null | undefined,
): WorldChangeV1[] {
  const p = asRecord(profile);
  if (!p) return [];
  const fromRip = Array.isArray(p.worldChanges)
    ? (p.worldChanges as WorldChangeV1[])
    : [];
  const fromDaily = asRecord(p.dailyScan);
  const fromScan = Array.isArray(fromDaily?.worldChanges)
    ? (fromDaily!.worldChanges as WorldChangeV1[])
    : [];
  const byId = new Map<string, WorldChangeV1>();
  for (const item of [...fromRip, ...fromScan]) {
    if (item?.id) byId.set(String(item.id), item);
  }
  return [...byId.values()].slice(0, 16);
}

export function collectDomainStrengthsFromProfile(
  profile: Record<string, unknown> | null | undefined,
): DomainStrengthSnapshot[] {
  const p = asRecord(profile);
  if (!p) return [];
  const keys = [
    "mMktConsultingProject",
    "mBizConsultingProject",
    "mEdConsultingProject",
  ] as const;
  const out: DomainStrengthSnapshot[] = [];
  for (const key of keys) {
    const seat = asRecord(p[key]);
    const assets = asRecord(seat?.assets);
    const raw = asRecord(assets?.domainStrength);
    if (!raw) continue;
    if (typeof raw.overall !== "number") continue;
    out.push({
      overall: raw.overall,
      grade: (raw.grade as DomainStrengthSnapshot["grade"]) || "D",
      readyForCouncil: Boolean(raw.readyForCouncil),
      gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [],
      summary: String(raw.summary || ""),
      agentId: (raw.agentId as DomainStrengthSnapshot["agentId"]) ||
        (key === "mMktConsultingProject"
          ? "m-mkt"
          : key === "mBizConsultingProject"
            ? "m-biz"
            : "m-ed"),
    });
  }
  return out;
}

export function brainSliceToEvidenceItems(
  brain: {
    facts?: Array<{ id?: string; claim?: string; confidence?: number; category?: string }>;
    knownUnknowns?: Array<{ id?: string; question?: string }>;
  } | null | undefined,
  caseId: string,
  now = new Date(),
): { items: EvidenceItem[]; gaps: string[] } {
  const items: EvidenceItem[] = [];
  const gaps: string[] = [];
  for (const f of (brain?.facts || []).slice(0, 8)) {
    const claim = String(f.claim || "").trim();
    if (claim.length < 6) continue;
    const conf =
      typeof f.confidence === "number"
        ? Math.max(0.2, Math.min(1, f.confidence))
        : 0.55;
    const weight = computeEvidenceWeight({
      sourceTrustBand: "C",
      timestamp: now.toISOString(),
      relevance: 0.75,
      confidence: conf,
      now,
    });
    items.push({
      evidenceId: `BR-${caseId}-${String(f.id || items.length)}`.slice(0, 64),
      sourceAgent: "BRAIN",
      claim: claim.slice(0, 280),
      strength: weight >= 0.4 ? "strong" : weight >= 0.22 ? "medium" : "weak",
      category: String(f.category || "brain_fact"),
    });
  }
  for (const u of (brain?.knownUnknowns || []).slice(0, 6)) {
    const q = String(u.question || "").trim();
    if (q.length < 4) continue;
    gaps.push(`Brain未知：${q.slice(0, 120)}`);
  }
  return { items, gaps };
}

export function domainStrengthGaps(
  strengths: Array<DomainStrengthSnapshot | undefined | null>,
): string[] {
  const gaps: string[] = [];
  for (const s of strengths) {
    if (!s || s.readyForCouncil) continue;
    gaps.push(strengthGapLine(s));
  }
  return gaps.slice(0, 6);
}

/** 合并世界变化 + Brain + 已有证据包 */
export function enrichCouncilEvidencePacket(input: {
  caseId: string;
  base?: EvidencePacket | null;
  worldChanges?: WorldChangeV1[];
  brain?: {
    facts?: Array<{ id?: string; claim?: string; confidence?: number; category?: string }>;
    knownUnknowns?: Array<{ id?: string; question?: string }>;
  } | null;
  domainStrengths?: Array<DomainStrengthSnapshot | undefined | null>;
  now?: Date;
}): EvidencePacket {
  const now = input.now || new Date();
  const worldItems = worldChangesToEvidenceItems(
    input.worldChanges || [],
    input.caseId,
    now,
  );
  const brain = brainSliceToEvidenceItems(input.brain, input.caseId, now);
  const strengthGaps = domainStrengthGaps(input.domainStrengths || []);
  const byId = new Map<string, EvidenceItem>();
  for (const item of [
    ...(input.base?.items || []),
    ...worldItems,
    ...brain.items,
  ]) {
    byId.set(item.evidenceId, item);
  }
  return {
    caseId: input.caseId,
    generatedAt: now.toISOString(),
    items: [...byId.values()].slice(0, 32),
    gaps: [...(input.base?.gaps || []), ...brain.gaps, ...strengthGaps].slice(
      0,
      12,
    ),
  };
}

/** 按证据权重校准常委置信度（有 evidence_used 时） */
export function calibrateOpinionConfidenceByEvidenceWeight(input: {
  confidence: number;
  evidenceUsedIds?: string[];
  packet?: EvidencePacket | null;
}): number {
  const base = Math.max(0.15, Math.min(0.95, input.confidence));
  const ids = input.evidenceUsedIds || [];
  if (!ids.length || !input.packet?.items?.length) return base;
  const byId = new Map(input.packet.items.map((i) => [i.evidenceId, i]));
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) continue;
    const s =
      item.strength === "strong" ? 0.85 : item.strength === "medium" ? 0.65 : 0.4;
    sum += s;
    n += 1;
  }
  if (!n) return base;
  const avg = sum / n;
  return (
    Math.round(Math.min(0.95, Math.max(0.2, base * (0.55 + 0.45 * avg))) * 100) /
    100
  );
}

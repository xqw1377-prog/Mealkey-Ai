/**
 * 把 M-PNT 咨询账本里的已验证一手事实（尤其店访）带进顾问会 / Founder Loop。
 * 只读 profile，不 getOrCreate（避免开会前悄悄建卷）。
 */

export type ConsultingFactClaim = {
  claim: string;
  storeVisit: boolean;
  strength?: string;
};

type LooseFact = {
  claim?: unknown;
  verificationStatus?: unknown;
  tags?: unknown;
  strength?: unknown;
};

type LooseLedger = {
  facts?: LooseFact[];
};

const PROFILE_KEY = "mPntBrandProject";

function isVerifiedFact(f: LooseFact): boolean {
  if (f.verificationStatus !== "verified") return false;
  const tags = Array.isArray(f.tags)
    ? f.tags.map((t) => String(t))
    : [];
  if (tags.includes("seed_from_brief")) return false;
  if (tags.includes("needs_verification")) return false;
  const claim = typeof f.claim === "string" ? f.claim.trim() : "";
  return claim.length >= 4;
}

function isStoreVisit(f: LooseFact): boolean {
  const tags = Array.isArray(f.tags)
    ? f.tags.map((t) => String(t))
    : [];
  if (tags.includes("store_visit")) return true;
  const claim = typeof f.claim === "string" ? f.claim : "";
  return claim.includes("【店访");
}

/** 从项目 profile 只读提取可带进会议的一手事实 */
export function extractConsultingMeetingFacts(
  profile: Record<string, unknown> | null | undefined,
  options?: { limit?: number },
): {
  claims: ConsultingFactClaim[];
  storeVisitCount: number;
  lines: string[];
} {
  const limit = options?.limit ?? 12;
  const consulting = profile?.[PROFILE_KEY] as
    | { assets?: { evidenceLedger?: LooseLedger } }
    | undefined;
  const facts = consulting?.assets?.evidenceLedger?.facts || [];
  const verified = facts.filter(isVerifiedFact);

  const storeFirst = [
    ...verified.filter(isStoreVisit),
    ...verified.filter((f) => !isStoreVisit(f)),
  ].slice(0, limit);

  const claims: ConsultingFactClaim[] = storeFirst.map((f) => ({
    claim: String(f.claim).trim().slice(0, 240),
    storeVisit: isStoreVisit(f),
    strength: typeof f.strength === "string" ? f.strength : undefined,
  }));

  return {
    claims,
    storeVisitCount: claims.filter((c) => c.storeVisit).length,
    lines: claims.map((c) => c.claim),
  };
}

/** 写入 assetContextBlock 顶部，供引擎与证据绑定读取 */
export function buildConsultingEvidenceBlock(lines: string[]): string {
  if (!lines.length) return "";
  const body = lines
    .slice(0, 12)
    .map((line, i) => `${i + 1}. ${line}`)
    .join("\n");
  return `【一手咨询证据·已验证】\n${body}`;
}

export function mergeAssetContextWithConsultingFacts(
  existing: string | undefined,
  lines: string[],
): string | undefined {
  const block = buildConsultingEvidenceBlock(lines);
  if (!block) return existing?.trim() || undefined;
  if (!existing?.trim()) return block;
  // 店访/一手事实置顶，避免被资料截断挤掉
  return `${block}\n\n${existing.trim()}`;
}

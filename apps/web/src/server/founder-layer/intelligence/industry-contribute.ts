/**
 * U4 跨租户行业脱敏贡献管道
 * 仅在 contributeToIndustryModel=true 且证据达标时写入 IndustryInsight
 */

import type { PrismaClient } from "@/generated/prisma";
import { createLogger } from "@/lib/logger";
import type { MemoryPermissionState } from "../contracts/intelligence-profile";
import { assertIndustryContributionAllowed } from "./permissions";
import {
  collectDenyList,
  hashContributorId,
  industryFingerprint,
  normalizeIndustryCategory,
  redactIndustryText,
} from "./industry-sanitize";

const log = createLogger("industry-contribute");

export type IndustryContributionSourceKind =
  | "validation"
  | "override"
  | "decision_pattern";

export type IndustryContributionCandidate = {
  category: string;
  rule: string;
  outcome: "confirmed" | "partial" | "invalidated" | "unknown";
  confidence: number;
  evidenceLevel: "validated_outcome" | "founder_confirmed";
  sourceKind: IndustryContributionSourceKind;
  anonymized: {
    hypothesis?: string;
    lesson?: string;
    topicHint?: string;
  };
  fingerprint: string;
  contributorHash: string;
};

export type BuildIndustryContributionInput = {
  permissions: MemoryPermissionState;
  ownerId: string;
  category?: string | null;
  rule: string;
  outcome: "confirmed" | "partial" | "invalidated" | "unknown";
  sourceKind: IndustryContributionSourceKind;
  evidenceLevel?: "validated_outcome" | "founder_confirmed";
  hypothesis?: string;
  lesson?: string;
  topicHint?: string;
  denyList?: string[];
  projectName?: string | null;
  brandNames?: string[];
  ownerName?: string | null;
  city?: string | null;
  district?: string | null;
};

/**
 * 构建候选；不达标返回 null（不抛错，便于调用方 fire-and-forget）
 * 门槛：opt-in + 脱敏后 rule≥8 字 + 验证结果或 founder_confirmed
 */
export function buildIndustryContributionCandidate(
  input: BuildIndustryContributionInput,
): IndustryContributionCandidate | null {
  if (!input.permissions.contributeToIndustryModel) return null;

  const deny = collectDenyList({
    projectName: input.projectName,
    brandNames: input.brandNames,
    ownerName: input.ownerName,
    city: input.city,
    district: input.district,
  }).concat(input.denyList || []);

  const rule = redactIndustryText(input.rule, deny);
  if (rule.replace(/\[品牌\]|\[电话\]|\[邮箱\]|\[地址\]|\[联系方式\]|\[编号\]/g, "").trim()
    .length < 8) {
    return null;
  }

  const evidenceLevel = input.evidenceLevel || "validated_outcome";
  // Phase 1：优先 validated_outcome；founder_confirmed 仅 override 显式
  if (
    evidenceLevel === "validated_outcome" &&
    input.outcome === "unknown"
  ) {
    return null;
  }

  const category = normalizeIndustryCategory(input.category);
  const hypothesis = input.hypothesis
    ? redactIndustryText(input.hypothesis, deny)
    : undefined;
  const lesson = input.lesson
    ? redactIndustryText(input.lesson, deny)
    : undefined;
  const topicHint = input.topicHint
    ? redactIndustryText(input.topicHint, deny)
    : undefined;

  const confidenceBase =
    input.outcome === "confirmed"
      ? 0.72
      : input.outcome === "partial"
        ? 0.55
        : input.outcome === "invalidated"
          ? 0.68
          : 0.4;

  return {
    category,
    rule,
    outcome: input.outcome,
    confidence: confidenceBase,
    evidenceLevel,
    sourceKind: input.sourceKind,
    anonymized: {
      hypothesis: hypothesis || undefined,
      lesson: lesson || undefined,
      topicHint: topicHint || undefined,
    },
    fingerprint: industryFingerprint(category, rule),
    contributorHash: hashContributorId(input.ownerId),
  };
}

export async function persistIndustryContribution(
  prisma: PrismaClient,
  permissions: MemoryPermissionState,
  candidate: IndustryContributionCandidate,
): Promise<{ id: string; created: boolean; supportCount: number } | null> {
  assertIndustryContributionAllowed(permissions);

  const existing = await prisma.industryInsight.findUnique({
    where: { fingerprint: candidate.fingerprint },
  });

  if (existing) {
    const nextConfidence = Math.min(
      0.95,
      (existing.confidence * existing.supportCount + candidate.confidence) /
        (existing.supportCount + 1),
    );
    const updated = await prisma.industryInsight.update({
      where: { id: existing.id },
      data: {
        supportCount: existing.supportCount + 1,
        confidence: nextConfidence,
        // 不覆盖更强 outcome；invalidated / confirmed 可升格
        outcome: preferOutcome(existing.outcome, candidate.outcome),
        updatedAt: new Date(),
      },
    });
    return {
      id: updated.id,
      created: false,
      supportCount: updated.supportCount,
    };
  }

  const created = await prisma.industryInsight.create({
    data: {
      category: candidate.category,
      rule: candidate.rule,
      outcome: candidate.outcome,
      confidence: candidate.confidence,
      evidenceLevel: candidate.evidenceLevel,
      sourceKind: candidate.sourceKind,
      anonymizedJson: JSON.stringify(candidate.anonymized),
      contributorHash: candidate.contributorHash,
      fingerprint: candidate.fingerprint,
      supportCount: 1,
    },
  });
  return { id: created.id, created: true, supportCount: 1 };
}

function preferOutcome(prev: string, next: string): string {
  const rank: Record<string, number> = {
    invalidated: 3,
    confirmed: 3,
    partial: 2,
    unknown: 1,
  };
  return (rank[next] || 0) >= (rank[prev] || 0) ? next : prev;
}

/** 验证完成后尝试贡献（吞错，不阻断主流程） */
export async function tryContributeFromValidation(
  prisma: PrismaClient,
  input: {
    permissions: MemoryPermissionState;
    ownerId: string;
    category?: string | null;
    projectName?: string | null;
    brandNames?: string[];
    ownerName?: string | null;
    city?: string | null;
    district?: string | null;
    hypothesis: string;
    summary: string;
    learning?: string;
    impact: "confirmed" | "partial" | "invalidated";
  },
): Promise<{ id: string; supportCount: number } | null> {
  if (!input.permissions.contributeToIndustryModel) return null;

  const rule =
    (input.learning || "").trim() ||
    `${input.hypothesis} → ${input.summary}`.trim();

  const candidate = buildIndustryContributionCandidate({
    permissions: input.permissions,
    ownerId: input.ownerId,
    category: input.category,
    rule,
    outcome: input.impact,
    sourceKind: "validation",
    evidenceLevel: "validated_outcome",
    hypothesis: input.hypothesis,
    lesson: input.learning || input.summary,
    topicHint: input.hypothesis,
    projectName: input.projectName,
    brandNames: input.brandNames,
    ownerName: input.ownerName,
    city: input.city,
    district: input.district,
  });
  if (!candidate) return null;

  try {
    const saved = await persistIndustryContribution(
      prisma,
      input.permissions,
      candidate,
    );
    return saved
      ? { id: saved.id, supportCount: saved.supportCount }
      : null;
  } catch (error) {
    log.warn("tryContributeFromValidation failed", { error: String(error) });
    return null;
  }
}

export type IndustryInsightView = {
  id: string;
  category: string;
  rule: string;
  outcome: string;
  confidence: number;
  supportCount: number;
  sourceKind: string;
};

/** 开会/简报：按品类召回跨租户规律（无贡献者身份） */
export async function recallIndustryInsights(
  prisma: PrismaClient,
  input: {
    category?: string | null;
    topic?: string;
    limit?: number;
  },
): Promise<IndustryInsightView[]> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 12);
  const category = normalizeIndustryCategory(input.category);
  const topic = (input.topic || "").trim();

  const client = prisma as PrismaClient & {
    industryInsight?: {
      findMany: (args: unknown) => Promise<
        Array<{
          id: string;
          category: string;
          rule: string;
          outcome: string;
          confidence: number;
          supportCount: number;
          sourceKind: string;
        }>
      >;
    };
  };
  if (!client.industryInsight?.findMany) return [];

  const rows = await client.industryInsight.findMany({
    where: {
      OR: [
        { category },
        { category: "餐饮" },
        ...(topic
          ? [{ rule: { contains: topic.slice(0, 12) } }]
          : []),
      ],
    },
    orderBy: [{ supportCount: "desc" }, { confidence: "desc" }],
    take: limit * 2,
  });

  // 简单相关度：品类精确 > 餐饮通用；含 topic 词加分
  const scored = rows.map((r) => {
    let score = r.confidence * 10 + r.supportCount;
    if (r.category === category) score += 5;
    if (topic && r.rule.includes(topic.slice(0, 6))) score += 3;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ r }) => ({
    id: r.id,
    category: r.category,
    rule: r.rule,
    outcome: r.outcome,
    confidence: r.confidence,
    supportCount: r.supportCount,
    sourceKind: r.sourceKind,
  }));
}

export function formatIndustryPriorBlock(
  insights: IndustryInsightView[],
): string {
  if (!insights.length) return "";
  const lines = insights.map(
    (i, idx) =>
      `${idx + 1}. [${i.category}] ${i.rule}（置信 ${i.confidence.toFixed(2)} · 复现 ${i.supportCount}）`,
  );
  return `行业规律（脱敏池，非本企业隐私）：\n${lines.join("\n")}`;
}

export function extractBrandNamesFromProfile(
  profile: Record<string, unknown>,
): string[] {
  const brands = Array.isArray(profile.brands) ? profile.brands : [];
  const names: string[] = [];
  for (const b of brands) {
    if (b && typeof b === "object") {
      const n = String((b as { brandName?: unknown }).brandName || "").trim();
      if (n) names.push(n);
    }
  }
  const active = profile.activeBrandName;
  if (typeof active === "string" && active.trim()) names.push(active.trim());
  return [...new Set(names)];
}

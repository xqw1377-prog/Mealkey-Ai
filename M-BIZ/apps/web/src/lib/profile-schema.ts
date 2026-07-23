/**
 * Project.profile JSON 字段的运行时校验
 *
 * profile 是自由格式 JSON，存储了 mPnt / mEd / mMkt / mBiz 等子模块数据。
 * 本文件提供 Zod schema 用于关键读取路径的类型安全。
 */
import { z } from "zod";

// ─── 品牌定位 (M-PNT) ───

export const BrandPositioningSchema = z.object({
  brandName: z.string().optional(),
  category: z.string().optional(),
  mentalPosition: z.string().optional(),
  targetCustomers: z.string().optional(),
  priceRange: z.string().optional(),
  differentiation: z.string().optional(),
  brandTonality: z.string().optional(),
}).passthrough();

export const MPntSnapshotSchema = z.object({
  oneLiner: z.string().optional(),
  brandPositioning: BrandPositioningSchema.optional(),
  strategy: z.string().optional(),
  confidence: z.number().optional(),
  updatedAt: z.string().optional(),
  pageOutput: z.record(z.unknown()).optional(),
  page_output: z.record(z.unknown()).optional(),
  marketResearch: z.record(z.unknown()).optional(),
  candidates: z.array(z.unknown()).optional(),
  theoryViews: z.record(z.unknown()).optional(),
  crossFire: z.record(z.unknown()).optional(),
  synthesis: z.record(z.unknown()).optional(),
}).passthrough();

// ─── 股权 (M-ED) ───

export const MEdSnapshotSchema = z.object({
  oneLiner: z.string().optional(),
  stage: z.string().optional(),
  pageOutput: z.object({
    health: z.object({
      score: z.number(),
      biggestRisk: z.string().optional(),
      control: z.string().optional(),
      incentiveRoom: z.string().optional(),
    }).passthrough(),
  }).passthrough().optional(),
  page_output: z.record(z.unknown()).optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// ─── 市场 (M-MKT) ───

export const MMktSnapshotSchema = z.object({
  oneLiner: z.string().optional(),
  pageOutput: z.object({
    opportunityCard: z.object({
      opportunityId: z.string().optional(),
      handoffPayload: z.record(z.unknown()).optional(),
    }).passthrough().optional(),
    finalJudgement: z.string().optional(),
    biggestRisk: z.string().optional(),
    city: z.string().optional(),
    category: z.string().optional(),
    entryProbability: z.number().optional(),
  }).passthrough().optional(),
  page_output: z.record(z.unknown()).optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// ─── 商业模式 (M-BIZ) ───

export const MBizSnapshotSchema = z.object({
  sessionId: z.string().optional(),
  oneLiner: z.string().optional(),
  pageOutput: z.object({
    currentLayer: z.string().optional(),
    dimensionScores: z.record(z.unknown()).optional(),
  }).passthrough().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// ─── Project Profile 整体 ───

export const ProjectProfileSchema = z.object({
  // 基础字段
  positioning: z.string().optional(),
  mentalPosition: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string().optional(),
  targetCustomers: z.string().optional(),
  priceRange: z.string().optional(),
  differentiation: z.string().optional(),
  brandTonality: z.string().optional(),
  goal: z.string().optional(),
  yearlyGoal: z.string().optional(),
  currentProblemTitle: z.string().optional(),
  currentChallenge: z.string().optional(),
  currentProblemImpact: z.string().optional(),
  strategicSummary: z.string().optional(),
  suggestedAction: z.string().optional(),
  biggestRisk: z.string().optional(),
  onboardingSource: z.string().optional(),
  onboardingCompletedAt: z.string().optional(),
  firstBriefReady: z.boolean().optional(),
  nextSuggestedRoute: z.string().optional(),
  confidence: z.number().optional(),
  score: z.number().optional(),

  // 子模块快照
  mPnt: MPntSnapshotSchema.optional(),
  mPntPrevious: MPntSnapshotSchema.optional(),
  mPntHistory: z.array(MPntSnapshotSchema).optional(),
  mEd: MEdSnapshotSchema.optional(),
  mEdPrevious: MEdSnapshotSchema.optional(),
  mEdHistory: z.array(MEdSnapshotSchema).optional(),
  mMkt: MMktSnapshotSchema.optional(),
  mMktPrevious: MMktSnapshotSchema.optional(),
  mMktHistory: z.array(MMktSnapshotSchema).optional(),
  mBiz: MBizSnapshotSchema.optional(),
  mBizPrevious: MBizSnapshotSchema.optional(),
  mBizHistory: z.array(MBizSnapshotSchema).optional(),

  // 定位复审队列
  positioningReviewQueue: z.array(z.object({
    decisionId: z.string().optional(),
    problem: z.string().optional(),
    judgement: z.string().optional(),
    previousOneLiner: z.string().optional(),
    newOneLiner: z.string().optional(),
    reason: z.string().optional(),
    status: z.string().optional(),
    flaggedAt: z.string().optional(),
    resolvedAt: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;

/**
 * 安全解析并校验 profile JSON
 * 校验失败时返回空对象（不抛异常），记录警告
 */
export function validateProfile(raw: string | null | undefined): ProjectProfile {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return ProjectProfileSchema.parse(parsed);
  } catch {
    console.warn("[profile-schema] profile JSON 校验失败，使用空对象兜底");
    return {};
  }
}

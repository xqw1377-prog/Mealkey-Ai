/**
 * 从宿主只读上下文组装 DiagnosisRequest（Engine 不读 Prisma）
 */
import type {
  DiagnosisEvidenceItem,
  DiagnosisFact,
  DiagnosisFocus,
  DiagnosisHorizon,
  RestaurantHealthSnapshot,
  RestaurantDiagnosisContext,
  RestaurantDiagnosisRequest,
} from "./contracts";
import type { DiagnosisLearning } from "./knowledge";

export type BrainContextLike = {
  identity?: {
    name?: string;
    category?: string;
    city?: string | null;
    stage?: string;
    storeCount?: number;
  };
  profile?: {
    name?: string;
    category?: string;
    city?: string | null;
    stage?: string;
  };
};

export type RipEvidenceLike = {
  id?: string;
  source: string;
  content: string;
  sentiment?: "positive" | "neutral" | "negative";
  aspect?: string;
  keyword?: string;
  observedAt?: string;
};

export function contextFromBrainLike(
  brain: BrainContextLike | null | undefined,
  extras?: Partial<RestaurantDiagnosisContext>,
): RestaurantDiagnosisContext {
  const id = brain?.identity || brain?.profile;
  return {
    brandName: extras?.brandName || id?.name,
    storeName: extras?.storeName || id?.name,
    category: extras?.category || id?.category,
    city: extras?.city || id?.city || undefined,
    stage: extras?.stage || id?.stage,
    address: extras?.address,
    projectId: extras?.projectId,
  };
}

export function evidenceFromRipLike(
  items: RipEvidenceLike[] | null | undefined,
): DiagnosisEvidenceItem[] {
  if (!items?.length) return [];
  return items
    .filter((e) => (e.content || "").trim().length > 4)
    .filter((e) => e.source !== "经营身份")
    .slice(0, 24)
    .map((e, i) => ({
      id: e.id || `rip-ev-${i}`,
      source: e.source || "rip",
      claim: e.content.trim(),
      sentiment: e.sentiment,
      theme:
        e.aspect === "service" || e.keyword === "等待"
          ? "wait"
          : e.aspect === "product" || e.aspect === "taste"
            ? "product"
            : e.aspect === "environment"
              ? "environment"
              : undefined,
      observedAt: e.observedAt,
    }));
}

export function buildDiagnosisRequest(input: {
  restaurantContext: RestaurantDiagnosisContext;
  evidence?: DiagnosisEvidenceItem[];
  facts?: DiagnosisFact[];
  focus?: DiagnosisFocus;
  horizon?: DiagnosisHorizon;
  asOf?: string;
  previousSnapshot?: RestaurantHealthSnapshot;
  previousLearnings?: DiagnosisLearning[];
}): RestaurantDiagnosisRequest {
  return {
    restaurantContext: input.restaurantContext,
    evidence: input.evidence || [],
    facts: input.facts || [],
    focus: input.focus || "overall",
    horizon: input.horizon || "7d",
    asOf: input.asOf,
    previousSnapshot: input.previousSnapshot,
    previousLearnings: input.previousLearnings,
  };
}

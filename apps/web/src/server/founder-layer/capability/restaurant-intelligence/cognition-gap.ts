/**
 * 老板认知 vs 顾客认知（R3）
 * 对外禁止「决策人格 / 心理测评」话术。
 */

import type { BusinessIdentityV1 } from "@/server/founder-layer/contracts/business-identity";
import type {
  RestaurantEvidenceV1,
  RipCognitionGapV1,
  RipCustomerPerceptionV1,
} from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { summarizeCustomerPerceptionLine } from "./customer-perception";

/** 从 Identity 焦点轻量推断「自认优势」候选（可被老板改） */
export function inferFounderClaimFromIdentity(
  identity: BusinessIdentityV1,
): string | undefined {
  switch (identity.focus) {
    case "product":
      return "菜品品质";
    case "profit":
      return "成本与利润控制";
    case "growth":
      return "获客与增长";
    case "expansion":
      return "复制与扩张准备";
    case "org":
      return "团队与组织";
    default:
      return undefined;
  }
}

export function buildCognitionGap(input: {
  founderClaim?: string | null;
  customer: RipCustomerPerceptionV1;
  evidence: RestaurantEvidenceV1[];
}): RipCognitionGapV1 | null {
  const claim = input.founderClaim?.trim();
  if (!claim) return null;

  const customerPerception = summarizeCustomerPerceptionLine(input.customer);
  const gapLikely =
    !input.customer.evidenceInsufficient &&
    input.customer.positiveKeywords.length > 0 &&
    !input.customer.positiveKeywords.some((k) =>
      claim.includes(k) || k.includes(claim.slice(0, 2)),
    );

  return {
    founderClaim: claim.slice(0, 400),
    customerPerception,
    summaryLine: input.customer.evidenceInsufficient
      ? "老板自认优势已记录；顾客侧证据不足，差距待核实。"
      : gapLikely
        ? "老板自认与顾客高频信号可能不一致——确认后写入经营决策习惯种子。"
        : "老板自认与当前顾客信号大致同向；确认后沉淀为习惯种子。",
    evidenceIds: input.evidence.map((e) => e.id).slice(0, 4),
  };
}

/** 确认前附着优势，不改变 status */
export function attachFounderClaim(
  snapshot: {
    customer: RipCustomerPerceptionV1;
    evidence: RestaurantEvidenceV1[];
    cognitionGap?: RipCognitionGapV1 | null;
  },
  founderClaim?: string | null,
): RipCognitionGapV1 | null {
  const claim =
    founderClaim?.trim() || snapshot.cognitionGap?.founderClaim || "";
  if (!claim) return snapshot.cognitionGap ?? null;
  return buildCognitionGap({
    founderClaim: claim,
    customer: snapshot.customer,
    evidence: snapshot.evidence,
  });
}

/**
 * Challenge Layer — 将常委意见聚合成风险挑战摘要（非常委角色秀）
 */
import {
  CHALLENGE_DOMAIN_LABEL,
  type ChallengeDomainV1,
  type ChallengeItemV1,
  type ChallengeReportV1,
} from "@/server/founder-layer/contracts/challenge-report";
import type { ExpertOpinionSliceV1 } from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";
import { EXPANSION_CHALLENGE_OPINIONS } from "./challenge-seed";

const ROLE_DOMAIN: Record<string, ChallengeDomainV1> = {
  cfo: "finance",
  coo: "operations",
  cmo: "market",
  cso: "strategy",
  chro: "organization",
  cpo: "operations",
  clo: "other",
};

function severityFromStance(
  stance: ExpertOpinionSliceV1["stance"],
): ChallengeItemV1["severity"] {
  if (stance === "oppose") return "high";
  if (stance === "conditional") return "medium";
  return "low";
}

function domainOf(roleId: string, claim: string): ChallengeDomainV1 {
  const key = roleId.toLowerCase();
  if (ROLE_DOMAIN[key]) return ROLE_DOMAIN[key]!;
  if (/现金|利润|财务|成本/.test(claim)) return "finance";
  if (/店长|复制|运营|SOP/.test(claim)) return "operations";
  if (/客群|竞争|选址|市场/.test(claim)) return "market";
  if (/组织|人才|团队/.test(claim)) return "organization";
  if (/战略|增长|曲线/.test(claim)) return "strategy";
  return "other";
}

/**
 * 聚合专家意见 → ChallengeReport（默认只暴露挑战项，来源可展开）
 */
export function buildChallengeReport(input: {
  opinions?: ExpertOpinionSliceV1[];
  decisionId?: string;
  optionId?: string;
  optionName?: string;
  openGaps?: Array<{ question: string }>;
  unknowns?: string[];
}): ChallengeReportV1 {
  const opinions =
    input.opinions && input.opinions.length > 0
      ? input.opinions
      : EXPANSION_CHALLENGE_OPINIONS;

  // 只把 oppose / conditional / observe 视作「挑战」；纯 support 进 conditions
  const challenging = opinions.filter((o) => o.stance !== "support");
  const supporting = opinions.filter((o) => o.stance === "support");

  const byDomain = new Map<ChallengeDomainV1, ChallengeItemV1>();
  for (const op of challenging) {
    const domain = domainOf(op.roleId, op.claim);
    const existing = byDomain.get(domain);
    if (!existing) {
      byDomain.set(domain, {
        domain,
        label: CHALLENGE_DOMAIN_LABEL[domain],
        summary: op.claim,
        severity: severityFromStance(op.stance),
        sourceRoleIds: [op.roleId],
        sourceClaims: [op.claim],
      });
    } else {
      existing.sourceRoleIds.push(op.roleId);
      existing.sourceClaims.push(op.claim);
      if (
        severityFromStance(op.stance) === "high" ||
        (severityFromStance(op.stance) === "medium" &&
          existing.severity === "low")
      ) {
        existing.severity = severityFromStance(op.stance);
        existing.summary = op.claim;
      }
    }
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  const items = [...byDomain.values()].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  const missingEvidence = [
    ...(input.openGaps?.map((g) => g.question) || []),
    ...(input.unknowns || []),
  ]
    .map((item) => toUserFacingGapLabel(item))
    .slice(0, 4);

  const conditions = supporting.map((s) => s.claim).slice(0, 3);

  const n = items.length;
  const headline =
    n === 0
      ? "当前路径暂无强挑战，仍建议核对关键事实后裁决。"
      : `这个方案受到 ${n} 个挑战：判断前置，常委意见已折叠为风险点。`;

  return {
    schemaVersion: 1,
    decisionId: input.decisionId,
    optionId: input.optionId,
    optionName: input.optionName,
    challengeCount: n,
    items,
    missingEvidence,
    conditions,
    headline,
  };
}

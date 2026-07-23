export {
  CAUSAL_CHAINS_V1,
  renderCausalChainMarkdown,
  type CausalChainV1,
  type CausalNodeV1,
} from "./causal-chains";
export {
  RESTAURANT_RULES_V1,
  renderRulesMarkdown,
  type RestaurantRuleV1,
} from "./rules";
export {
  detectCausalIntent,
  isRevenueDeclineUtterance,
  type CausalIntentSignal,
} from "./detect";

import { CAUSAL_CHAINS_V1, renderCausalChainMarkdown } from "./causal-chains";
import { detectCausalIntent, type CausalIntentSignal } from "./detect";
import { RESTAURANT_RULES_V1, renderRulesMarkdown } from "./rules";

/** 按意图挑选主因果链（可多条） */
export function chainsForSignal(signal: CausalIntentSignal) {
  if (signal === "revenue_decline") {
    return [CAUSAL_CHAINS_V1.revenue_decompose!, CAUSAL_CHAINS_V1.profit_decompose!];
  }
  if (signal === "price_cut") {
    return [CAUSAL_CHAINS_V1.price_cut_shock!, CAUSAL_CHAINS_V1.revenue_decompose!];
  }
  if (signal === "sku_bloat") {
    return [CAUSAL_CHAINS_V1.sku_bloat!];
  }
  if (signal === "profit_general") {
    return [CAUSAL_CHAINS_V1.profit_decompose!, CAUSAL_CHAINS_V1.revenue_decompose!];
  }
  return [];
}

export function buildCausalSectionMarkdown(utterance: string): string {
  const signal = detectCausalIntent(utterance);
  const chains = chainsForSignal(signal);
  if (!chains.length) return "";
  const body = chains.map((c) => renderCausalChainMarkdown(c)).join("\n\n");
  const rules =
    signal === "sku_bloat"
      ? RESTAURANT_RULES_V1.filter((r) => r.id === "sku_kitchen_complexity")
      : signal === "profit_general" || signal === "revenue_decline"
        ? RESTAURANT_RULES_V1.filter((r) => r.domain === "labor")
        : [];
  const ruleBlock = renderRulesMarkdown(rules);
  return ["## 经营因果链（Restaurant Intelligence）", "", body, ruleBlock ? `\n${ruleBlock}` : ""]
    .filter(Boolean)
    .join("\n");
}

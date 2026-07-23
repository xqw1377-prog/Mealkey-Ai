/**
 * 意图侧信号：从 utterance 识别应强制走哪条因果链
 */

export type CausalIntentSignal =
  | "revenue_decline"
  | "price_cut"
  | "sku_bloat"
  | "profit_general"
  | null;

export function detectCausalIntent(utterance: string): CausalIntentSignal {
  const t = utterance.trim();
  if (!t) return null;

  if (/降价|打折|降低价格|便宜点卖/.test(t)) return "price_cut";
  if (/SKU|菜品太[多多]|菜单太长|品项[过多太多]/.test(t)) return "sku_bloat";
  // 「生意不好」属模糊抱怨，走问题域框定；勿并入营业额下降
  if (
    /营业额.*(?:下降|下滑|掉|跌|少|差|不行)|营收.*(?:下降|下滑|掉|跌)|流水.*(?:下降|少)|客[流少].*(?:下降|少)/.test(
      t,
    ) ||
    /(?:下降|下滑|掉了|跌了).*(?:营业额|营收|流水)/.test(t)
  ) {
    return "revenue_decline";
  }
  if (/利润|赚钱|毛利|亏|成本|人效|不赚钱/.test(t)) return "profit_general";
  return null;
}

export function isRevenueDeclineUtterance(utterance: string): boolean {
  return detectCausalIntent(utterance) === "revenue_decline";
}

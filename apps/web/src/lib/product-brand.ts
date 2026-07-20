/** 产品对外品牌（与工程包名 MealKey 区分：展示统一为 Mealkey） */
export const PRODUCT_BRAND = {
  nameZh: "餐启",
  nameEn: "Mealkey",
  positioning: "餐饮经营能力增长系统",
  heroLines: [
    "经营最大的差异，在认知。",
    "经营最大的成本，在决策。",
  ] as const,
  heroSupport:
    "Mealkey，让认知持续成长，让每次决策，都比昨天更正确。",
} as const;

/** 眉标 / 卡片角标：中英锁 */
export const PRODUCT_BRAND_TITLE = `${PRODUCT_BRAND.nameZh} · ${PRODUCT_BRAND.nameEn}`;
export const PRODUCT_BRAND_DESCRIPTION = `${PRODUCT_BRAND.positioning}。${PRODUCT_BRAND.heroSupport}`;
/** 短眉标：空间紧时只用中文 */
export const PRODUCT_BRAND_EYEBROW = PRODUCT_BRAND.nameZh;

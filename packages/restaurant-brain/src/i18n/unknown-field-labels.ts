import { DEFAULT_LOCALE, type MealkeyLocale, normalizeLocale } from "./locales";

/**
 * 内部稳定键（勿直接给用户看）。
 * UI / Agent 文案一律走 labelUnknownField。
 */
export const UNKNOWN_FIELD_KEYS = [
  "profile.category",
  "profile.stage",
  "brand.positioning",
  "brand.targetCustomer",
  "business.monthlyRevenue",
  "capability",
  "founder.decisionStyle",
] as const;

export type UnknownFieldKey = (typeof UNKNOWN_FIELD_KEYS)[number];

const LABELS: Record<MealkeyLocale, Record<UnknownFieldKey, string>> = {
  "zh-CN": {
    "profile.category": "品类",
    "profile.stage": "经营阶段",
    "brand.positioning": "品牌定位",
    "brand.targetCustomer": "目标客群",
    "business.monthlyRevenue": "月营收",
    capability: "组织与经营能力画像",
    "founder.decisionStyle": "老板决策风格",
  },
  "zh-TW": {
    "profile.category": "品類",
    "profile.stage": "經營階段",
    "brand.positioning": "品牌定位",
    "brand.targetCustomer": "目標客群",
    "business.monthlyRevenue": "月營收",
    capability: "組織與經營能力畫像",
    "founder.decisionStyle": "老闆決策風格",
  },
  en: {
    "profile.category": "Category",
    "profile.stage": "Business stage",
    "brand.positioning": "Brand positioning",
    "brand.targetCustomer": "Target customers",
    "business.monthlyRevenue": "Monthly revenue",
    capability: "Capability profile",
    "founder.decisionStyle": "Founder decision style",
  },
  ja: {
    "profile.category": "業態・カテゴリ",
    "profile.stage": "経営ステージ",
    "brand.positioning": "ブランドポジショニング",
    "brand.targetCustomer": "ターゲット顧客",
    "business.monthlyRevenue": "月次売上",
    capability: "組織・経営能力プロファイル",
    "founder.decisionStyle": "経営者の意思決定スタイル",
  },
};

function isUnknownFieldKey(value: string): value is UnknownFieldKey {
  return (UNKNOWN_FIELD_KEYS as readonly string[]).includes(value);
}

/** 字段键 → 用户可见文案；未知键尽量不露出英文点号路径 */
export function labelUnknownField(
  key: string,
  locale: MealkeyLocale | string = DEFAULT_LOCALE,
): string {
  const loc = normalizeLocale(locale);
  if (isUnknownFieldKey(key)) {
    return LABELS[loc][key] ?? LABELS[DEFAULT_LOCALE][key] ?? key;
  }
  // 已是自然语言（含中文问句）则原样返回
  if (/[\u4e00-\u9fff]/.test(key) || /\s/.test(key) || key.includes("？") || key.includes("?")) {
    return key;
  }
  // 兜底：点号路径拆成可读片段，避免直接甩内部键
  if (key.includes(".")) {
    return key
      .split(".")
      .map((part) => LABELS[loc][part as UnknownFieldKey] ?? part)
      .join(" · ");
  }
  return LABELS[loc][key as UnknownFieldKey] ?? key;
}

export function labelUnknownFields(
  keys: string[],
  locale: MealkeyLocale | string = DEFAULT_LOCALE,
): string[] {
  return keys.map((key) => labelUnknownField(key, locale));
}

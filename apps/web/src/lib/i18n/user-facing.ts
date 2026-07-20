import {
  DEFAULT_LOCALE,
  labelUnknownField,
  normalizeLocale,
  type MealkeyLocale,
} from "@mealkey/restaurant-brain";

/**
 * 产品默认语言。后续可从 cookie / Accept-Language / 用户设置读取。
 */
export function getProductLocale(): MealkeyLocale {
  return normalizeLocale(process.env.NEXT_PUBLIC_MEALKEY_LOCALE ?? DEFAULT_LOCALE);
}

/** 准备度 / 缺口列表：杜绝内部字段键直接露脸 */
export function toUserFacingGapLabel(
  value: string,
  locale: MealkeyLocale | string = getProductLocale(),
): string {
  return labelUnknownField(value, locale);
}

export function toUserFacingGapLabels(
  values: string[],
  locale: MealkeyLocale | string = getProductLocale(),
): string[] {
  return values.map((value) => toUserFacingGapLabel(value, locale));
}

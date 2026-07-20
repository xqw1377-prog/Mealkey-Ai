/** MealKey 主产品默认中文；后续可扩 en / zh-TW / ja 等主要语言 */
export type MealkeyLocale = "zh-CN" | "zh-TW" | "en" | "ja";

export const DEFAULT_LOCALE: MealkeyLocale = "zh-CN";

export function normalizeLocale(value?: string | null): MealkeyLocale {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "zh-tw" || raw === "zh_tw" || raw.startsWith("zh-hant")) return "zh-TW";
  if (raw === "en" || raw.startsWith("en-")) return "en";
  if (raw === "ja" || raw.startsWith("ja-")) return "ja";
  if (raw === "zh" || raw === "zh-cn" || raw === "zh_cn" || raw.startsWith("zh-hans")) {
    return "zh-CN";
  }
  return DEFAULT_LOCALE;
}

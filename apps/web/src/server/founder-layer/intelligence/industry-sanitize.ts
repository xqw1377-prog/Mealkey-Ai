/**
 * 行业贡献脱敏 — 禁止把品牌名/电话/地址等带进跨租户池
 */

import { createHash } from "crypto";

const SALT =
  process.env.INDUSTRY_CONTRIB_SALT ||
  process.env.NEXTAUTH_SECRET ||
  "mealkey-industry-v1";

export function hashContributorId(ownerId: string): string {
  return createHash("sha256")
    .update(`${ownerId}:${SALT}`)
    .digest("hex")
    .slice(0, 32);
}

export function normalizeIndustryCategory(raw: string | null | undefined): string {
  const t = (raw || "").trim();
  if (!t) return "餐饮";
  return t.length > 40 ? `${t.slice(0, 39)}…` : t;
}

export function collectDenyList(input: {
  projectName?: string | null;
  brandNames?: string[];
  ownerName?: string | null;
  city?: string | null;
  district?: string | null;
}): string[] {
  const names = [
    input.projectName,
    input.ownerName,
    input.city,
    input.district,
    ...(input.brandNames || []),
  ]
    .map((x) => (x || "").trim())
    .filter((x) => x.length >= 2);
  // 长词优先替换，避免短词误伤
  return [...new Set(names)].sort((a, b) => b.length - a.length);
}

/** 文本脱敏：电话 / 邮箱 / 自定义拒绝列表 */
export function redactIndustryText(
  text: string,
  denyList: string[] = [],
): string {
  let t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";

  t = t.replace(/1[3-9]\d{9}/g, "[电话]");
  // 标准邮箱
  t = t.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    "[邮箱]",
  );
  // 中文昵称紧贴邮箱（店长@foo.com）— 不可用过宽 [^\s@]+，会吞掉电话占位
  t = t.replace(
    /[\u4e00-\u9fa5]{1,12}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    "[邮箱]",
  );
  t = t.replace(
    /(微信|wx|WeChat)[:：\s]*[A-Za-z0-9_-]{4,}/gi,
    "[联系方式]",
  );
  t = t.replace(/\b\d{6,}\b/g, "[编号]");
  // 门牌 / 路号粗过滤
  t = t.replace(
    /([\u4e00-\u9fa5]{2,12}(路|街|巷|道|号院|广场))\d{0,4}号?/g,
    "[地址]",
  );

  for (const name of denyList) {
    if (!name || name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(escaped, "gi"), "[品牌]");
  }

  // 金额保留量级，去掉过细尾数感（可选软化）
  t = t.replace(/(\d{2,})(\d{3})元/g, "$1xxx元");

  return clip(t, 280);
}

export function industryFingerprint(category: string, rule: string): string {
  const norm = `${normalizeIndustryCategory(category)}|${rule
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 160)}`;
  return createHash("sha256").update(norm).digest("hex").slice(0, 40);
}

function clip(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

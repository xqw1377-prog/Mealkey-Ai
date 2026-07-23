/**
 * Web Agent 宿主 → MealKey 经营大脑桥接
 * 角色：本仓 web = 单 Agent（M-OPS）宿主，不是 Mini Shell，也不是经营大脑本体。
 * 见 docs/MEALKEY_WEB_AGENT_HOST_V1.md
 */

export function getOsBase(): string {
  const raw =
    (import.meta as { env?: { VITE_OS_WEB_URL?: string } }).env?.VITE_OS_WEB_URL ||
    "http://localhost:3000";
  return raw.replace(/\/?$/, "");
}

/** 经营大脑主入口（看板 / Today） */
export function brainUrl(opts?: { todayUrl?: string | null }): string {
  if (opts?.todayUrl) return opts.todayUrl;
  return `${getOsBase()}/dashboard`;
}

/** 下载仅为端分发，不得当地主 CTA */
export function appDownloadUrl(): string {
  return `${getOsBase()}/download`;
}

export const BRAIN_CTA = {
  title: "首份体检可在本页完成 · 长期跟踪进经营大脑",
  body:
    "规则体检不依赖下载 App。云档案、每日扫描、AI 顾问与决策室属于 MealKey 经营大脑——持续经营覆盖，不是「本份报告不完整」。",
  primaryLabel: "进入 MealKey 经营大脑",
  secondaryLabel: "端分发：App 下载页",
} as const;

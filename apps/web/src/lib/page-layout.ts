/**
 * 仪表盘内容区统一宽度（壳层已有 max-w，内页避免再各自发散）
 * console：决策室 / 能力 / 管理等桌面操作台；Agent 对话仍用 narrow
 */
export const PAGE_CONTENT_WIDTH = {
  narrow: "max-w-xl",
  default: "max-w-2xl",
  wide: "max-w-3xl",
  full: "max-w-4xl md:max-w-5xl",
  console: "max-w-6xl md:max-w-7xl",
} as const;

export type PageContentWidth = keyof typeof PAGE_CONTENT_WIDTH;

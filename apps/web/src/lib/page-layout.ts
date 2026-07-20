/**
 * 仪表盘内容区统一宽度（壳层已有 max-w，内页避免再各自发散）
 */
export const PAGE_CONTENT_WIDTH = {
  narrow: "max-w-xl",
  default: "max-w-2xl",
  wide: "max-w-3xl",
  full: "max-w-4xl md:max-w-5xl",
} as const;

export type PageContentWidth = keyof typeof PAGE_CONTENT_WIDTH;

/** 与四大战略机构 atelier 卷宗对齐的视觉 token */

export type AtelierProps = {
  /** 启用战略机构纸面语言 */
  atelier?: boolean;
};

export const AT = {
  ink: "#141413",
  olive: "#5f6b4e",
  copper: "#a56b4d",
  muted: "#6f747b",
  faint: "#6f747b",
  line: "rgba(20,20,19,0.1)",
  field: "var(--mpnt-field)",
  paper: "var(--mpnt-paper)",
} as const;

export function panelChrome(atelier?: boolean) {
  if (atelier) {
    return {
      section: "space-y-0",
      eyebrow:
        "text-[11px] font-medium tracking-[0.14em] text-[#5f6b4e]",
      title:
        "mt-2 font-serif-cn text-[22px] font-semibold text-[#141413] md:text-[24px]",
      blurb: "mt-1.5 text-[14px] leading-6 text-[#6f747b]",
      meta: "text-[12px] text-[#6f747b]",
      item:
        "border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-3",
      hotItem:
        "border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3",
      warnBox:
        "border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3 text-[#a56b4d]",
      primaryBtn:
        "inline-flex min-h-11 items-center justify-center gap-1 bg-[#141413] px-4 text-[13px] font-semibold text-white disabled:opacity-50",
      secondaryBtn:
        "inline-flex min-h-11 items-center justify-center border border-[rgba(20,20,19,0.14)] bg-white px-4 text-[13px] font-medium text-[#141413] disabled:opacity-50",
      ghostBtn:
        "inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#6f747b] disabled:opacity-50",
      input:
        "mt-1 w-full border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-3 py-2.5 text-[14px] text-[#141413] outline-none focus:border-[#141413]",
      feedback: "text-[12px] text-[#5f6b4e]",
      emptyTitle: "font-serif-cn text-[20px] text-[#141413]",
    };
  }
  return {
    section: "border-y border-[rgba(24,24,23,0.08)] py-5",
    eyebrow: "text-[12px] tracking-[0.08em] text-[#66735E]",
    title: "mt-1 text-[15px] font-medium text-[#202124]",
    blurb: "mt-1 text-[14px] leading-6 text-[#6f747b]",
    meta: "text-[12px] text-[#6f747b]",
    item: "border-l-2 border-[rgba(24,24,23,0.12)] pl-3.5",
    hotItem: "border-l-2 border-[#B47C5C] pl-3.5",
    warnBox:
      "border-l-2 border-[#B47C5C] pl-3 text-[#B47C5C]",
    primaryBtn:
      "inline-flex items-center gap-1 bg-[#181817] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50",
    secondaryBtn:
      "inline-flex items-center border border-[rgba(24,24,23,0.14)] bg-white px-3 py-2 text-[12px] font-medium text-[#202124] disabled:opacity-50",
    ghostBtn:
      "inline-flex items-center px-2 py-2 text-[12px] font-medium text-[#6f747b] disabled:opacity-50",
    input:
      "mt-1 w-full border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none",
    feedback: "text-[12px] text-[#66735E]",
    emptyTitle: "text-[15px] leading-7 text-[#202124]",
  };
}

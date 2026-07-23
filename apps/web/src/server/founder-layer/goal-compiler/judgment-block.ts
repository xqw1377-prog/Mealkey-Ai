/**
 * 交互宪法 P7：结构化判断输出（非建议墙）
 */

export function renderJudgmentBlock(args: {
  judgment: string;
  reasons: string[];
  path: string[];
  risks: string[];
  unknowns?: string[];
}): string {
  const lines = [
    "## 我的判断",
    args.judgment,
    "",
    "## 原因",
    ...args.reasons.map((r, i) => `${i + 1}. ${r}`),
    "",
    "## 建议路径",
    ...args.path.map((p, i) => `${i === 0 ? "第一步" : i === 1 ? "第二步" : `第${i + 1}步`}：${p}`),
    "",
    "## 风险",
    ...args.risks.map((r) => `- ${r}`),
  ];
  if (args.unknowns?.length) {
    lines.push("", "## 未知 / 需你确认", ...args.unknowns.map((u) => `- ${u}`));
  }
  lines.push(
    "",
    "> 以上为专业判断草稿，**不是**终局决策；关键选择请在决策室确认。",
  );
  return lines.join("\n");
}

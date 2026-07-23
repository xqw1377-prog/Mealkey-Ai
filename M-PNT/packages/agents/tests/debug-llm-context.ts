import { buildCategoryContext } from "../src/m-pnt/llm/llm-context";

const cases = [
  ["湘菜", "长沙"],
  ["火锅", "重庆"],
  ["云南菜", "北京"],
  ["茶饮", "上海"],
  ["螺蛳粉", "柳州"],
];

for (const [cat, city] of cases) {
  const ctx = buildCategoryContext(cat, city);
  const lineCount = ctx.split("\n").length;
  const hasLeaders = ctx.includes("心智领导者") || ctx.includes("leader");
  console.log(`${cat}@${city}: ${lineCount}行, ${hasLeaders ? "有领导数据" : "无领导数据"}`);
  // 打印前3行
  console.log("  " + ctx.split("\n").slice(0, 3).join("\n  "));
  console.log("");
}

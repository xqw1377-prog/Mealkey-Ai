const fs = require("fs");
const path = "packages/m-ops-diag/src/engines/expert-capabilities.ts";
let s = fs.readFileSync(path, "utf8");

if (s.includes("enrichDishSalesWithMenu(salesRaw")) {
  console.log("already patched");
  process.exit(0);
}

const pf = s.indexOf("export function runProductOfficer");
const c = s.indexOf("const capabilities = [", pf);
const a = s.indexOf("const abc = computeDishAbc(sales);", c);
if (pf < 0 || c < 0 || a < 0) throw new Error("missing anchors");

const n = s.includes("\r\n") ? "\r\n" : "\n";
const lines = [
  "const capabilities = [",
  '    "Pareto ABC（A≤80% / B≤95% / C 余下）",',
  '    "菜单成本 JOIN 菜销 → 流水×毛利四象限",',
  '    "菜饮结构与长尾稀释",',
  '    "对照外部产品负评",',
  '    "硬门槛拒签：销售行 < 8 或菜单缺失",',
  "  ];",
  '  const salesRaw = parseJsonFact<DishSalesRow[]>(input.facts, "dish_sales_json") || [];',
  '  const menu = parseJsonFact<MenuItemCost[]>(input.facts, "menu_json") || [];',
  '  const menuCount = Number(factClaim(input.facts, "menu_count") || menu.length || 0);',
  "",
  "  if (salesRaw.length < MIN_DISH_ROWS) {",
  "    return {",
  '      role: "product",',
  '      title: "产品官",',
  '      seat: "CPO 席",',
  '      level: "critical",',
  "      capabilities,",
  "      verdict: professionalVerdict({",
  '        title: "产品官",',
  '        level: "critical",',
  '        headline: "菜品销售结构不足，无法计算贡献与毛利矩阵",',
  "        evidence: `销售行 ${salesRaw.length}（阈值 ≥${MIN_DISH_ROWS}）`,",
  "      }),",
  "      analyses: [],",
  "      observations: [`菜品销售仅 ${salesRaw.length} 行`],",
  '      risks: ["无销售结构则菜单优化与招牌决策没有依据"],',
  '      counsel: ["导入菜品销售：日期、餐段、菜名、销量、销售额（最好含分类与成本）"],',
  "      confidence: professionalConfidence({ days: 0, dishCount: 0, refused: true }),",
  "      refused: true,",
  "      refuseReason: `销售行 ${salesRaw.length} < ${MIN_DISH_ROWS}`,",
  "      signals: [",
  "        {",
  '          id: "product_data_gap",',
  '          severity: "critical",',
  '          statement: "产品销售结构缺失",',
  "        },",
  "      ],",
  "    };",
  "  }",
  "",
  "  if (menuCount < 1) {",
  "    return {",
  '      role: "product",',
  '      title: "产品官",',
  '      seat: "CPO 席",',
  '      level: "critical",',
  "      capabilities,",
  "      verdict: professionalVerdict({",
  '        title: "产品官",',
  '        level: "critical",',
  '        headline: "菜单主数据缺失，无法对齐售价/成本做结构会审",',
  '        evidence: "menu_count = 0",',
  "      }),",
  "      analyses: [],",
  '      observations: ["未导入菜单主数据"],',
  '      risks: ["无菜单则无法校验定价、成本与招牌结构"],',
  '      counsel: ["导入菜单（菜名、售价，建议含成本与分类）"],',
  "      confidence: professionalConfidence({",
  "        days: 0,",
  "        dishCount: salesRaw.length,",
  "        refused: true,",
  "      }),",
  "      refused: true,",
  '      refuseReason: "菜单硬门槛缺失",',
  "      signals: [",
  "        {",
  '          id: "product_data_gap",',
  '          severity: "critical",',
  '          statement: "菜单主数据缺失，产品官拒签",',
  "        },",
  "      ],",
  "    };",
  "  }",
  "",
  "  const enriched = enrichDishSalesWithMenu(salesRaw, menu);",
  "  const sales = enriched.rows;",
  "  const abc = computeDishAbc(sales);",
].join(n);

s = s.slice(0, c) + lines + s.slice(a + "const abc = computeDishAbc(sales);".length);
fs.writeFileSync(path, s);
console.log("patched ok");

/**
 * M-PNT 内置知识种子
 *
 * @deprecated 使用 knowledge/_loader.ts 的 loadSeeds() 替代（V2 统一加载器）。
 * 保留仅用于 V0 兼容回落。
 *
 * 迁移目标：
 *   mPntKnowledgeSeeds → KnowledgeLoader.loadSeeds()
 */

export interface MPntKnowledgeSeed {
  id: string;
  type: "FACT" | "RULE" | "CASE" | "MODEL" | "EXPERIENCE";
  title: string;
  category: string;
  content: Record<string, unknown>;
  scenario: string[];
  confidence: number;
  source: string;
  tags: string[];
}

export const mPntKnowledgeSeeds: MPntKnowledgeSeed[] = [
  {
    id: "CAT-BENCH-001",
    type: "FACT",
    title: "湘菜品类基准",
    category: "品类知识",
    content: {
      question: "湘菜的市场基准是什么？",
      answer:
        "湘菜全国门店体量大体集中在湖南、广东、浙江等餐饮活跃区。客单价常见 60-120 元，食材成本率约 32-38%，翻台约 2.0-3.5。口味记忆强，标准化中等。",
      conditions: [{ field: "category", operator: "=", value: "湘菜" }],
    },
    scenario: ["品类分析", "价格定位"],
    confidence: 0.85,
    source: "industry_benchmark_bundle",
    tags: ["湘菜", "品类基准", "经营指标"],
  },
  {
    id: "PRICE-RULE-001",
    type: "RULE",
    title: "中餐价格带判断",
    category: "价格定位",
    content: {
      question: "如何判断中餐品类的合适价格带？",
      conditions: [
        {
          field: "category",
          operator: "in",
          value: ["湘菜", "川菜", "粤菜", "家常菜"],
        },
        {
          field: "city_tier",
          operator: "in",
          value: ["一线", "新一线"],
        },
      ],
      judgement: "一线/新一线中餐客单价基准常见 60-120 元",
      recommendation: "默认中端 80-100 元区间覆盖最大客群，上探需品牌力",
      risk: "高于 120 元需证明心智与体验溢价，否则翻台与复购承压",
    },
    scenario: ["价格定位", "投资评估"],
    confidence: 0.85,
    source: "industry_benchmark",
    tags: ["价格带", "中餐", "规则"],
  },
  {
    id: "COMP-SAT-001",
    type: "MODEL",
    title: "品类饱和度粗判",
    category: "竞争分析",
    content: {
      question: "如何粗判区域品类饱和度？",
      rules: [
        { max: 5, label: "蓝海" },
        { max: 10, label: "适度竞争" },
        { max: 20, label: "饱和竞争" },
        { max: Infinity, label: "红海" },
      ],
      unit: "stores_per_10k_population",
    },
    scenario: ["竞争分析", "品类分析"],
    confidence: 0.75,
    source: "positioning_framework",
    tags: ["饱和度", "竞争"],
  },
  {
    id: "POS-EXP-001",
    type: "EXPERIENCE",
    title: "客群过宽是第一陷阱",
    category: "定位经验",
    content: {
      principle: "目标客群不能是所有人",
      judgement: "说不清谁会反复想起你，定位尚未成立",
      action: "用场景句收窄：什么人、在什么场合、因为什么选你",
    },
    scenario: ["客群画像", "差异化策略"],
    confidence: 0.9,
    source: "m-pnt_theory_rules",
    tags: ["心智客户", "陷阱"],
  },
  {
    id: "MATRIX-RULE-001",
    type: "RULE",
    title: "三理论禁止平均整合",
    category: "三理论矩阵",
    content: {
      rule: "Cross-Fire 后必须取舍，不得平均三票",
      decision_layer: "decision_recommend = primary|secondary|backup|reject",
      hard: ["R4 不得 primary", "最终权在 Synthesis"],
    },
    scenario: ["差异化策略", "定位决策"],
    confidence: 0.95,
    source: "m-pnt_agent_matrix_v1",
    tags: ["Ries", "Trout", "Ye", "Synthesis"],
  },
];

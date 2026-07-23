/**
 * 部门看板展示用语 — 把协议层英文标签压成用户可读中文
 */

const LABEL_MAP: Record<string, string> = {
  "Founder Context": "创始人语境",
  "Brand Context": "品牌语境",
  "Market Layer": "市场层",
  "Governance Layer": "治理层",
  "Decision Layer": "决策层",
  "Memory Layer": "记忆层",
  "Agent Context": "顾问上下文",
  MKDecision: "决策协议",
  Tradeoff: "取舍",
  Validation: "验证",
  "Memory Update": "记忆更新",
  Problem: "问题",
  Choice: "选择",
  Reasoning: "理由",
  "Founder Memory": "创始人记忆",
  "Brand Memory": "品牌记忆",
  "Market Memory": "市场记忆",
  "Decision Memory": "决策记忆",
  "Business Snapshot": "商业画像",
  "Business Health": "商业体检",
  "Business Fact Ledger": "商业事实账本",
  "Market Signal Ledger": "市场信号账本",
  "Opportunity Overview": "市场机会判断",
  "Market Foundation": "市场底板",
  "Market Snapshot": "市场快照",
  "Governance Snapshot": "治理快照",
  "Structure Portrait": "结构画像",
  "Equity Governance Ledger": "治理事实账本",
  "Scenario Workshop": "方案模拟",
  Runtime: "运行信息",
  "Founder Fit": "创始人匹配",
  "Growth Map": "成长地图",
  "AI Chief Advisor": "AI 商业顾问",
  "Brand Brief": "品牌简报",
  "Market Insight": "市场洞察",
  "Theory Proposal": "理论提案",
  "Position Contract": "定位契约",
  "Brand Mission": "品牌使命",
  "Brand Strategy": "品牌战略",
  "Governance Mission": "治理任务",
  "Market Context": "市场语境",
  "Decision Protocol": "决策协议",
  "AI Governance Meeting": "治理战略会议",
  "Brand Command Center": "机会判断台",
  "AI Strategy Meeting": "战略会议",
  "Founder Interview Room": "创始人访谈室",
  FOUNDATION: "底板",
  INSIGHT: "洞察",
  PROPOSAL: "提案",
  CONTRACT: "契约",
  FACT: "事实",
  ASSUMPTION: "假设",
  HYPOTHESIS: "假说",
  "cap table": "股权结构",
  "Context → MKDecision → Validation → Memory.": "上下文 → 决策 → 验证 → 记忆",
  "Context → Decision → Validation → Memory.": "上下文 → 决策 → 验证 → 记忆",
};

export function boardLabel(raw: string): string {
  if (LABEL_MAP[raw]) return LABEL_MAP[raw];
  return raw
    .replace(/^01 · Agent Context$/g, "01 · 顾问上下文")
    .replace(/^02 · MKDecision$/g, "02 · 决策协议")
    .replace(/^03 · Tradeoff$/g, "03 · 取舍")
    .replace(/^03 · Validation$/g, "03 · 验证")
    .replace(/^04 · Memory Update$/g, "04 · 记忆更新")
    .replace(/\bFACT\b/g, "事实")
    .replace(/\bASSUMPTION\b/g, "假设")
    .replace(/\bHYPOTHESIS\b/g, "假说");
}

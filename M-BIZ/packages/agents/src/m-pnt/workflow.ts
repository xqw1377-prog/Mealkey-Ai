import type { Workflow } from "@mealkey/agent-sdk";
import {
  CROSS_FIRE_PROMPT,
  RIES_VIEW_PROMPT,
  SYNTHESIS_PROMPT,
  TROUT_VIEW_PROMPT,
  YE_VIEW_PROMPT,
} from "./prompts/matrix";

/**
 * M-PNT 定位工作流（母体 7 步 + 内嵌三理论矩阵）
 *
 * 映射：
 * 1-4  ≈ Situation / Insight 素材
 * 5    ≈ Position 多方案 + Ries/Trout/Ye 并行
 * 6    ≈ Strategy 表达（品牌调性）
 * 7    ≈ Cross-Fire → Synthesis → Quality → MKDecision / M-Solution
 */
export const mPntWorkflow: Workflow = {
  name: "餐饮定位分析流程",
  description:
    "系统化餐饮品牌定位决策：品牌名→品类→客群→价格→竞争→差异化(三理论)→调性→最终决策",

  steps: [
    {
      id: "category_analysis",
      name: "品类分析",
      type: "analysis",
      capabilities: ["category_analysis"],
      knowledge: ["positioning_facts", "positioning_rules", "positioning_cases"],
      prompt: `你正在为一家餐饮项目进行品类分析。

项目信息：
- 品牌名: {{project.name}}
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}
- 预算: {{project.budget}}

经营者画像：
- 经验: {{owner.experience}}
- 优势: {{owner.strengths}}
- 盲区: {{owner.weaknesses}}

分析维度：
1. 该品类在目标城市的市场容量和增长趋势
2. 品类生命周期阶段（导入期/成长期/成熟期/衰退期）
3. 品类竞争饱和度
4. 该品类与创业者资源的匹配度
5. 品类的标准化程度和复制难度

请给出品类评估结论。为后续六维诊断与心智占位服务，不要输出营销教材。`,
      next: "customer_portrait",
    },
    {
      id: "customer_portrait",
      name: "客群画像",
      type: "analysis",
      capabilities: ["customer_portrait"],
      knowledge: ["positioning_facts", "positioning_rules", "positioning_cases"],
      prompt: `基于品类分析结果，定义目标心智客户（不是宽泛人口统计）：

品类分析结果：
{{previousResults}}

项目信息：
- 品牌名: {{project.name}}
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}

分析维度：
1. 核心心智客户（谁买单、谁传播、谁反复想起）
2. 消费场景（真、频、可记）
3. 消费能力与客单价接受范围
4. 消费决策因素
5. 客群规模方向（避免假大空）

请给出清晰的目标客群定义；过宽必须收窄。`,
      next: "price_positioning",
    },
    {
      id: "price_positioning",
      name: "价格带定位",
      type: "analysis",
      capabilities: ["price_positioning"],
      knowledge: ["positioning_facts", "positioning_rules", "positioning_models"],
      prompt: `基于品类分析与客群画像，确定价格带定位：

客群画像：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 预算: {{project.budget}}

分析维度：
1. 品类价格带分布
2. 目标客群付费意愿
3. 成本结构倒推（食材 30-35%、人力 20-25%、租金 10-15%）
4. 竞争定价对标
5. 建议价格带与盈利模型

价格必须与差异化承诺一致。`,
      next: "competitor_analysis",
    },
    {
      id: "competitor_analysis",
      name: "竞争分析",
      type: "analysis",
      capabilities: ["competitor_analysis"],
      knowledge: ["positioning_rules", "positioning_cases"],
      prompt: `基于定位方向素材，进行竞争分析：

价格定位和客群分析：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}

分析维度：
1. 直接竞争对手
2. 间接/场景替代
3. 各竞品心智锚点与优劣势
4. 竞争壁垒
5. 差异化空位（第一联想归谁、我们抢什么）

终点是空位，不是名单。`,
      next: "differentiation",
    },
    {
      id: "differentiation",
      name: "差异化策略（含三理论矩阵）",
      type: "analysis",
      capabilities: ["differentiation"],
      knowledge: ["positioning_cases", "positioning_experiences", "positioning_rules"],
      prompt: `基于竞争分析，生成 3–5 个候选定位方向，并启动三理论矩阵。

竞争与前序分析：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 创业者优势: {{owner.strengths}}

## 多方案约束
- ≥1 稳健型、≥1 进攻型、≥1 备选
- 不可文案换词假差异
- 每方案可一句话讲清

## 三理论并行（必须分别输出 Theory View）
${RIES_VIEW_PROMPT}

${TROUT_VIEW_PROMPT}

${YE_VIEW_PROMPT}

## 差异化维度
1. 产品 2. 体验 3. 品牌 4. 运营 5. 可执行性（资源匹配）

请给出候选方向 + 三份理论视角（含 theory_recommend）。`,
      next: "brand_tonality",
    },
    {
      id: "brand_tonality",
      name: "品牌调性",
      type: "analysis",
      capabilities: ["brand_tonality"],
      knowledge: ["positioning_facts", "positioning_cases", "positioning_experiences"],
      prompt: `基于差异化主方向（若尚未最终选定，按当前领先候选），定义品牌调性：

差异化与三理论结果：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 目标客群: 见客群分析

分析维度：
1. 品牌核心价值主张
2. 品牌人格和调性
3. 视觉风格建议
4. 品牌故事线
5. 传播策略（可转述优先）

调性必须服务定位，禁止空洞形容词。`,
      next: "final_positioning",
    },
    {
      id: "final_positioning",
      name: "定位决策",
      type: "decision",
      knowledge: ["positioning_rules", "positioning_models", "positioning_experiences"],
      prompt: `基于以上所有分析，完成 Cross-Fire → Synthesis → Quality → 最终决策。

分析结果汇总：
{{previousResults}}

${CROSS_FIRE_PROMPT}

${SYNTHESIS_PROMPT}

## Quality 底线
- 用户一眼看懂推荐结论
- 有推荐理由与不选理由
- 有主要风险与验证动作
- R4 不得 primary

## 输出 JSON（同时服务母体 MKDecision 映射）
{
  "type": "positioning",
  "focus": "overall",
  "summary": "一句话定位结论",
  "confidence": 85,
  "decision_recommend": "primary|secondary|backup|reject",
  "brandPositioning": {
    "brandName": "品牌名（若未命名请明确写待定）",
    "category": "品类定位",
    "targetCustomers": "目标心智客户",
    "priceRange": "价格带",
    "differentiation": "差异化核心",
    "brandTonality": "品牌调性",
    "mentalPosition": "心智位置一句话"
  },
  "candidates": [
    { "id": "A", "name": "", "decision_recommend": "primary|secondary|backup|reject", "reason": "" }
  ],
  "theory_vote_summary": {
    "ries": { "preferred": "", "theory_recommend": "" },
    "trout": { "preferred": "", "theory_recommend": "" },
    "ye_maozhong": { "preferred": "", "theory_recommend": "" }
  },
  "why_choose_this": "",
  "why_not_others": "",
  "keyFindings": [
    { "dimension": "品类", "conclusion": "...", "confidence": 85 },
    { "dimension": "客群", "conclusion": "...", "confidence": 80 },
    { "dimension": "价格", "conclusion": "...", "confidence": 75 },
    { "dimension": "竞争", "conclusion": "...", "confidence": 70 },
    { "dimension": "差异化", "conclusion": "...", "confidence": 65 }
  ],
  "risks": [
    { "risk": "风险描述", "level": "high|medium|low", "code": "R1|R2|R3|R4", "mitigation": "缓解措施" }
  ],
  "validation": {
    "day30": [],
    "day90": [],
    "killCriteria": []
  },
  "mSolution": {
    "situation": "",
    "insight": "",
    "position": "",
    "strategy": "",
    "action": "",
    "validation": "",
    "decision": ""
  },
  "nextSteps": [
    { "step": "第一步", "priority": "high", "timeline": "1-2周" }
  ]
}

注意：该 JSON 将被映射为 MKDecision 返回 ChiefAgent。`,
      output: "final",
    },
  ],
};

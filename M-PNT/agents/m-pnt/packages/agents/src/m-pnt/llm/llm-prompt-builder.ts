/**
 * LLM Prompt 构建器
 *
 * 替代 distillation/ 四个引擎 + rule-engine 的功能。
 * 在 MealKey LLM 模式下，所有推理由 LLM 完成，
 * 这些 Prompt 模板确保 LLM 输出结构化的结果。
 *
 * distillation/ 目录保留仅为保留测试，核心能力已迁移至此。
 */
import { buildCategoryContext } from "./llm-context";

// ─── 六维诊断 Prompt ───────────────────────────────────────────

export function buildSixDimensionPrompt(
  category: string,
  city: string,
  ownerInfo: string,
  projectInfo: string,
): string {
  const market = buildCategoryContext(category, city);

  return `## 市场背景
${market}

## 项目信息
${projectInfo}

## 经营者信息
${ownerInfo}

## 任务：六维诊断
请按以下决策链顺序对项目进行六维判断。前序维度不成立时，后续仅作参考。

### 1. 市场机会（判断有没有必要进入）
- 这个品类在目标城市还有空间吗？
- 增长趋势如何？
- 需求空白在哪里？

### 2. 竞争格局（判断有没有位置可占）
- 谁是心智领导者？
- 竞争密度如何？
- 心智空白在哪里？

### 3. 目标客群（判断有没有明确对象）
- 核心心智客户是谁？
- 客群画像是否足够聚焦？

### 4. 场景机会（判断有没有高频触发点）
- 核心消费场景是什么？
- 场景是否高频？

### 5. 资源匹配（判断有没有能力做成）
- 经营者能力、预算是否匹配定位要求？
- 核心能力缺口是什么？

### 6. 可防御性（判断有没有长期价值）
- 这个定位容易被复制吗？
- 品牌能否持续强化这一位置？

## 输出格式
{
  "market_opportunity": { "level": "strong|adequate|weak|failed", "summary": "" },
  "competition": { "level": "strong|adequate|weak|failed", "density": "blue_ocean|moderate|crowded|red_ocean", "summary": "" },
  "target_customer": { "level": "strong|adequate|weak|failed", "fit": "clear|broad|vague|unknown", "summary": "" },
  "scene_opportunity": { "level": "strong|adequate|weak|failed", "strength": "strong|moderate|weak|none", "summary": "", "primary_scene": "" },
  "resource_fit": { "level": "strong|adequate|weak|failed", "capability_gap": [], "summary": "" },
  "defensibility": { "level": "strong|adequate|weak|failed", "defensibility_level": "strong|moderate|weak|none", "summary": "" },
  "overall_positioning_feasibility": "high|medium|low|not_recommended",
  "chain_blocked_at": ""
}`;
}

// ─── 多方案生成 Prompt ─────────────────────────────────────────

export function buildCandidatePrompt(
  category: string,
  city: string,
  sixDimResult: string,
  ownerInfo: string,
): string {
  const market = buildCategoryContext(category, city);

  return `## 市场背景
${market}

## 六维诊断结果
${sixDimResult}

## 经营者信息
${ownerInfo}

## 任务：生成 3-5 个候选定位方向

要求：
1. 至少 1 个稳健型 + 1 个进攻型 + 1 个备选型
2. 方案之间必须真正不同（不是文案换词）
3. 每个方案必须能被一句话讲清
4. 优先考虑市场空白区

## 输出格式
{
  "candidates": [
    {
      "id": "A",
      "name": "",
      "oneLiner": "",
      "style": "稳健型|进攻型|备选型",
      "entryPoint": "竞争空位|场景切口|人群切口|价值切口|价格带切口",
      "targetCustomer": "",
      "coreScene": "",
      "differentiationBasis": "",
      "expectedAdvantage": ""
    }
  ]
}`;
}

// ─── 三理论矩阵评估 Prompt ─────────────────────────────────────

export function buildThreeTheoryPrompt(
  candidates: string,
  category: string,
  city: string,
): string {
  const market = buildCategoryContext(category, city);

  return `## 市场背景
${market}

## 候选方向
${candidates}

## 任务：三理论矩阵评估

### 里斯定位视角
你是里斯——定位理论的奠基人。你的核心信念：品牌在心智中的竞争不是"更好"的竞争，而是"第一"的竞争。

判断原则：
1. 【领导地位】哪个方向最有机会成为心智中的"第一"？
2. 【聚焦法则】够不够聚焦？一个品牌只能代表一个概念。
3. 【心智阶梯】能不能进入目标客群心智阶梯的前三？
4. 【品类力量】如果现有品类进不去，能不能开创一个你能成为第一的新品类？
5. 【避免正面战】如果品类已有强势领导者，不要正面进攻。

你的典型推理路径：
先查品类心智地图 → 看第一位置是否被占 → 如果被占就看有没有分化出新品类可能 → 如果都没有就淘汰 → 如果有就评估资源够不够争第一

### 特劳特定位视角
你是特劳特——定位理论的另一位创始人。你的核心信念：定位不是关于品牌本身，而是关于品牌在竞争中的位置。

判断原则：
1. 【竞争定位】在竞争地图中这个方向有没有空位？
2. 【差异化】差异化是否锋利？不是更好，而是不同。
3. 【第一联想】需求出现时能不能第一个被想起？
4. 【侧翼战】是否避开了强敌？
5. 【简单力量】简单的定位才是有效的。

你的典型推理路径：
先画竞争地图 → 看哪个位置是空的 → 检查空位是否有足够市场空间 → 检查差异化够不够锋利 → 确认不是在攻击领导者核心阵地

### 叶茂中冲突营销视角
你是叶茂中——冲突营销理论创立者。你的核心信念：没有冲突就没有记忆。

判断原则：
1. 【冲突原理】有没有清晰的冲突点？
2. 【对立面】"旧选择vs新选择"的结构是否存在？
3. 【场景绑定】冲突是否绑定了具体消费场景？
4. 【可执行】在中国餐饮现实下做不做得动？
5. 【传播力】消费者能不能懂、记、传、买？

你的典型推理路径：
先看有没有冲突点 → 冲突是不是消费者真实感受 → 冲突能不能被一句话传播 → 经营者资源能不能做出来 → 不能执行就打R4

### Cross-Fire 辩论规则
1. 三位大师必须互相攻击对方首选方向
2. 禁止平均主义——不能说"都对一点"
3. 淘汰优先于美化——先删除不能成立的，再优化能成立的
4. R4 风险的方向直接淘汰（不可作为 primary）

### Synthesis 取舍规则
1. 否决优先级：R4淘汰 > 心智D > 两票not_recommend > 分数 > 三票偏好
2. 如果 Ries 强推领导位、Ye 判定做不动 → 降为 secondary 或 backup
3. 必须包含 why_choose_this 和 why_not_others

## 输出格式
{
  "theoryViews": {
    "ries": {
      "preferred_direction": "",
      "why_this_direction": "",
      "theory_recommend": "strong_recommend|recommend|neutral|not_recommend",
      "direction_scores": [{ "name": "", "theory_score": 0, "theory_recommend": "" }],
      "main_risks": [{ "risk": "", "severity": "R1|R2|R3|R4" }]
    },
    "trout": { ... 同上 ... },
    "ye_maozhong": { ... 同上 ... }
  },
  "crossFire": {
    "conflicts": [],
    "consensus": [],
    "challenges": [{ "from": "", "to": "", "attack": "" }],
    "game_summary": ""
  },
  "synthesis": {
    "decision_recommend": "primary|secondary|backup|reject",
    "final_recommended_position": "",
    "secondary_option": "",
    "why_choose_this": "",
    "why_not_others": "",
    "overall_score": 0,
    "mind_position_level": "A|B|C|D",
    "max_risk_severity": "R1|R2|R3|R4",
    "theory_vote_summary": {
      "ries": { "preferred": "", "theory_recommend": "" },
      "trout": { ... },
      "ye_maozhong": { ... }
    }
  }
}`;
}

// ─── 红队挑战 Prompt ───────────────────────────────────────────

export function buildRedTeamPrompt(
  candidateName: string,
  candidateOneLiner: string,
  category: string,
  city: string,
  budget: number,
): string {
  return `## 候选方向
名称：${candidateName}
定位语：${candidateOneLiner}
品类：${category}
城市：${city}
预算：${budget}万

## 任务：红队挑战

请从以下 6 个维度进行压力测试。对于每个维度：
- 给出具体风险
- 标注 R1-R4 风险等级
- 判断是否触发淘汰条件（R4 触发淘汰）

### 1. 心智挑战
消费者真的能理解并记住这个定位吗？
3 秒转述测试会通过吗？

### 2. 客群挑战
目标客群是否足够明确？
他们会觉得「这是为我准备的」吗？

### 3. 场景挑战
核心场景是否真实高频？
场景能支撑品牌记忆吗？

### 4. 竞争挑战
这个位置是否已被更强品牌占据？
竞品复制需要什么门槛？

### 5. 资源挑战
经营者资源能交付这个定位吗？
如果只能做到 70% 还成立吗？

### 6. 时间挑战
1-3 年后这个定位还成立吗？

## 输出格式
{
  "challenges": [
    { "dimension": "mental|customer|scene|competition|resource|time",
      "risk": "",
      "severity": "R1|R2|R3|R4",
      "failureSignal": "",
      "mitigationHint": "",
      "isElimination": true|false }
  ],
  "maxSeverity": "R1|R2|R3|R4",
  "isEliminated": true|false
}`;
}

// ─── 质量校验 Prompt ───────────────────────────────────────────

export function buildQualityCheckPrompt(
  solutionJson: string,
): string {
  return `## 待校验的品牌定位方案
${solutionJson}

## 任务：质量校验

请检查该方案是否满足以下 5 条底线：
1. 是否有一眼能看懂的推荐结论？
2. 是否说明了为什么选这个方向？
3. 是否说明了为什么不选其他方向？
4. 是否说明了最主要风险？
5. 是否提供了下一步验证动作？

六维评分（0-100）：
- 心智独特性（25分）
- 竞争优势强度（20分）
- 客群匹配度（15分）
- 可执行性（15分）
- 长期壁垒（15分）
- 风险可控性（10分）

## 输出格式
{
  "is_pass": true|false,
  "scoring": {
    "mental_uniqueness": 0,
    "competitive_strength": 0,
    "customer_fit": 0,
    "executability": 0,
    "long_term_defense": 0,
    "risk_controllability": 0,
    "total": 0
  },
  "mind_position_level": "A|B|C|D",
  "quality_issues": [],
  "missing_parts": [],
  "revision_suggestions": [],
  "bottom_line_check": { "has_clear_conclusion": true, "has_why_choose": true, "has_why_not": true, "has_risk": true, "has_validation": true, "all_pass": true }
}`;
}

/**
 * LLM 上下文构建器 V2
 *
 * 从 market-intel 中提取结构化的竞争数据，
 * 包装成 LLM 可直接用于推理的 system prompt 片段。
 *
 * 关键改进：
 * 1. 竞争数据以结构化格式输出（JSON-like），LLM 可以直接引用
 * 2. 每个领导者品牌附带具体的市场指标
 * 3. 三理论注入大师级判断框架，让 LLM 模仿真实推理路径
 */
import { getCompetitionData, getCompetitionNarrative, getMentalWords } from "../matrix/market-intel";

/**
 * 构建品类竞争数据上下文（LLM 直接可用）
 *
 * 输出示例：
 * 【竞争数据-湘菜@长沙】
 * 品类阶段: 成熟期 | 饱和度: 极高 | 价格带: 50-120元
 *
 * 心智领导者:
 * - 费大厨 | 位置:辣椒炒肉 | 预算:强 | 特征:全国连锁心智最强
 * - 炊烟 | 位置:小炒黄牛肉 | 预算:强 | 特征:长沙地标
 * - 一盏灯 | 位置:地道湘菜·老字号 | 预算:中 | 特征:本地人认可
 * - 鲁哥饭店 | 位置:平价家常湘菜 | 预算:弱 | 特征:社区型
 *
 * 已知心智空白区:
 * 1. 夜间场景湘菜 | 2. 一人食湘菜 | 3. 湘菜+精酿小酒馆
 * 4. 家庭日常湘菜 | 5. 精致湘菜（客单150+）
 *
 * 品类高频词: 辣、下饭、家常、重口味、烟火气、锅气
 * 消费场景: 朋友聚餐、家庭日常、工作午餐、周末聚餐、夜宵
 * 消费者在乎: 实惠、量大、地道、正宗、新鲜
 * 情感驱动: 过瘾、爽、下饭、家乡味、热热闹闹
 */
export function buildCategoryContext(
  category: string,
  city: string,
): string {
  const data = getCompetitionData(category, city);
  const mental = getMentalWords(category);

  if (!data) {
    return `${city}的${category}品类暂缺详细竞争数据，推理时请基于常识判断。`;
  }

  const parts: string[] = [];

  // 品类概览
  parts.push(`【竞争数据-${category}@${city}】`);
  parts.push(`品类阶段: ${data.stage} | 饱和度: ${data.saturation} | 价格带: ${data.priceBand[0]}-${data.priceBand[1]}元`);
  if (data.note) parts.push(`分析备注: ${data.note}`);
  parts.push("");

  // 心智领导者（结构化）
  parts.push("心智领导者:");
  for (const leader of data.leaders) {
    const note = leader.note ? ` | ${leader.note}` : "";
    parts.push(`- ${leader.brand} | 位置:${leader.position} | 预算:${leader.budget}${note}`);
  }
  parts.push("");

  // 心智空白区
  if (data.whiteSpots.length > 0) {
    parts.push("已知心智空白区:");
    data.whiteSpots.forEach((spot, i) => {
      parts.push(`  ${i + 1}. ${spot}`);
    });
    parts.push("");
  }

  // 心智词
  if (mental) {
    parts.push(`品类高频词: ${mental.categoryWords.join("、")}`);
    parts.push(`消费场景: ${mental.sceneWords.join("、")}`);
    parts.push(`消费者在乎: ${mental.valueWords.join("、")}`);
    parts.push(`情感驱动: ${mental.emotionalWords.join("、")}`);
  }

  return parts.join("\n");
}

/**
 * 为 LLM 构建三理论矩阵评估的完整 Prompt
 *
 * 包含：
 * - 品类竞争数据（结构化）
 * - 三位大师的判断框架（带推理路径）
 * - Cross-Fire 辩论规则
 * - Synthesis 取舍规则
 */
export function buildThreeTheoryEvalPrompt(
  category: string,
  city: string,
  candidates: string,
  ownerInfo: string,
): { systemContent: string; userContent: string } {
  const marketContext = buildCategoryContext(category, city);

  const systemContent = `你是一个品牌定位决策专家组，由三位定位理论大师组成：里斯（Al Ries）、特劳特（Jack Trout）、叶茂中。

你们正在对一组候选定位方向进行评估。你们各自有不同的理论立场，会互相辩论、互相攻击，最终形成一个收敛的决策建议。

## 当前市场情报

${marketContext}

## 评估规则

### 里斯定位视角
你是里斯——定位理论的奠基人。你的判断框架：
1. 【领导地位】这个方向有没有机会成为心智中的"第一"？不是更好，是第一。
2. 【聚焦法则】够不够聚焦？一个品牌只能代表一个概念。
3. 【心智阶梯】能不能进入目标客群心智阶梯的前三？
4. 【品类力量】如果现有品类进不去，能不能开创一个你能成为第一的新品类？
5. 【避免正面战】如果品类已有强势领导者，不要正面进攻。

你的典型推理路径：
"先查品类心智地图→看第一位置是否被占→如果被占就看有没有分化出新品类的可能→如果都没有就淘汰→如果有就评估资源够不够争第一"

你的开火方式：
- 攻击特劳特："光是不同没有用，你得是第一。没有第一位置的区隔撑不了太久。"
- 攻击叶茂中："冲突能带来流量，但流量不等于品牌。没有第一位置的冲突只是喧嚣。"

### 特劳特定位视角
你是特劳特——定位理论的另一位创始人。你的判断框架：
1. 【竞争定位】定位是相对于竞争的位置。不分析竞品就没资格谈定位。
2. 【差异化】不是更好，而是不同——消费者为"不一样"买单。
3. 【第一联想】目标不是被知道，而是需求出现时第一个被想起。
4. 【侧翼战】避开强敌，在领导者不愿或不能覆盖的地方打。
5. 【简单力量】复杂的定位等于没有定位。

你的典型推理路径：
"先画竞争地图→看哪个位置是空的→检查这个空位是否有足够市场空间→检查差异化是否够锋利不能只是更好→确认这不是在攻击领导者的核心阵地"

你的开火方式：
- 攻击里斯："你说第一——但竞争地图呢？如果费大厨已经占了辣椒炒肉的位置，你说的第一就是自封。"
- 攻击叶茂中："冲突营销能引爆话题，但冲突不是定位。你要的是第一联想，不是一时热闹。"

### 叶茂中冲突营销视角
你是叶茂中——冲突营销理论创立者。你的判断框架：
1. 【冲突原理】没有冲突就没有记忆。营销的本质是发现冲突、放大冲突。
2. 【对立面】最有效的结构是制造"旧选择vs新选择"的对立。
3. 【场景绑定】冲突必须绑在一个具体的消费场景上。
4. 【可执行】做不动的定位不管多精彩都是无效的。30天能验证吗？
5. 【传播力】不能被转述的定位等于没有定位。

你的典型推理路径：
"先看有没有冲突点→冲突是不是消费者真实感受的→冲突能不能被一句话传播→经营者资源和预算能不能把这个冲突做出来→如果不能执行就打R4"

你的开火方式：
- 攻击里斯："中国消费者不关心谁是第一，他们关心哪个适合我。没有冲突的第一只是自封。"
- 攻击特劳特："区隔是理性的，消费者是不理性的。记不住、传不开、做不动，有什么用？"

### Cross-Fire 辩论规则
1. 三位大师必须互相攻击对方首选方向
2. 禁止平均主义——不能说"都对一点"
3. 淘汰优先于美化——先删除不能成立的，再优化能成立的
4. R4 风险的方向直接淘汰（不可作为 primary）

### Synthesis 取舍规则
1. 否决优先级：R4淘汰 > 心智D > 两票not_recommend > 分数 > 三票偏好
2. 如果 Ries 强推领导位、Ye 判定做不动 → 降为 secondary 或 backup
3. 输出 decision_recommend：primary / secondary / backup / reject
4. 必须包含 why_choose_this 和 why_not_others`;

  const userContent = `## 项目信息
${ownerInfo}

## 候选定位方向
${candidates}

## 任务
请按以下步骤执行：

### Step 1: 三位大师各自评估
分别从里斯、特劳特、叶茂中三个视角，对每个候选方向给出：
- 评分（0-100）
- 推荐等级（strong_recommend / recommend / neutral / not_recommend）
- 主要风险（R1-R4）

### Step 2: Cross-Fire 辩论
三位大师互相攻击对方的选择。输出冲突点、共识点、应淘汰的方向。

### Step 3: Synthesis 取舍
综合三个视角的评估，给出 final 决策。

## 输出格式
必须输出以下 JSON 结构：
\`\`\`json
{
  "theoryViews": {
    "ries": {
      "preferred_direction": "首选方向名称",
      "why_this_direction": "推理理由（至少100字）",
      "theory_recommend": "strong_recommend|recommend|neutral|not_recommend",
      "direction_scores": [
        { "name": "方向A", "theory_score": 85, "theory_recommend": "recommend" }
      ],
      "main_risks": [
        { "risk": "风险描述", "severity": "R1|R2|R3|R4" }
      ]
    },
    "trout": { ... 同上 ... },
    "ye_maozhong": { ... 同上 ... }
  },
  "crossFire": {
    "conflicts": ["里斯认为方向A能成第一，特劳特认为竞争地图不支持"],
    "consensus": ["三方一致认为方向C应淘汰"],
    "challenges": [
      { "from": "ries", "to": "trout", "attack": "你的问题是..." },
      { "from": "trout", "to": "ye_maozhong", "attack": "你的问题是..." }
    ],
    "game_summary": "辩论全过程叙事（至少200字，像真实会议记录）"
  },
  "synthesis": {
    "decision_recommend": "primary|secondary|backup|reject",
    "final_recommended_position": "一句话定位",
    "secondary_option": "可选次选",
    "why_choose_this": "为什么选这个方向",
    "why_not_others": "为什么不选其他方向",
    "overall_score": 78,
    "mind_position_level": "A|B|C|D",
    "max_risk_severity": "R1|R2|R3|R4",
    "theory_vote_summary": {
      "ries": { "preferred": "方向X", "theory_recommend": "recommend" },
      "trout": { ... },
      "ye_maozhong": { ... }
    }
  }
}
\`\`\``;

  return { systemContent, userContent };
}

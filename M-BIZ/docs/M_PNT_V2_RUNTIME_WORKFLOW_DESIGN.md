# M-PNT V2 Runtime 工作流设计

> 模块：M-PNT  
> 定位：AI 品牌战略咨询项目运行时  
> 核心原则：Agent 不是回答问题，而是推动咨询项目状态变化

## 一、核心改变

过去：

```text
用户输入
 ↓
Agent 调用 LLM
 ↓
返回答案
```

这是普通 AI 助手。

M-PNT V2：

```text
用户进入品牌咨询项目

↓

Runtime 创建咨询任务

↓

建立品牌认知档案

↓

执行阶段工作流

↓

调用不同专家 Agent

↓

产生中间判断

↓

邀请用户参与决策

↓

形成战略资产

↓

持续优化
```

核心：

**Agent 不是回答问题，而是推动项目状态变化。**

## 二、M-PNT Runtime 总体架构

```text
                 Founder
                    |
                    |
              Interaction Layer
                    |
                    ↓

              M-PNT Runtime

                    |
 ------------------------------------------------
 |             |             |                  |
访谈 Agent     分析 Agent     专家 Agent         决策 Agent
 |             |             |                  |
品牌档案       市场洞察       定位争论           战略确认

                    |
                    ↓

            Decision Artifact Layer

                    |
                    ↓

        Brand Strategy Memory
```

### 运行时职责

- 接住用户在咨询项目中的每一次输入
- 判断当前咨询处于哪个状态
- 识别还缺哪些关键信息
- 调度品牌诊断、市场洞察、专家讨论和决策确认
- 生成中间资产和最终战略资产
- 把创始人偏好沉淀进 Memory

## 三、核心状态机设计

M-PNT 不应该靠页面控制，而应该由状态驱动。

### BrandStrategyState

```typescript
enum BrandStrategyState {
  INIT,

  // 信息收集
  DISCOVERY,

  // 品牌理解完成
  PROFILE_READY,

  // 市场分析
  MARKET_ANALYSIS,

  // 问题诊断
  DIAGNOSIS_READY,

  // 专家讨论
  EXPERT_DEBATE,

  // 方案生成
  POSITION_OPTIONS,

  // 用户选择
  FOUNDER_DECISION,

  // 战略确认
  STRATEGY_CONFIRMED,

  // 落地规划
  EXECUTION_PLAN,

  // 持续优化
  OPTIMIZATION
}
```

用户看到的是：

> 正在进行品牌诊断

系统内部实际是：

`state = DIAGNOSIS_READY`

### 状态机原则

- 页面只是状态的视觉投影
- 任意阶段都可以回看上一阶段资产
- 用户反馈可以触发状态回退或重新生成
- 每个状态必须产出明确资产，而不是只产出文本

## 四、阶段 1：Discovery Agent

### 目标

不是收集资料，而是建立：

## Brand Identity Model

### 输入

用户回答：

```text
品牌：
最湘宴

品类：
湘菜

城市：
长沙

规模：
200 平

目标：
做高端湘菜品牌
```

### 输出

```json
{
  "brand_profile": {
    "category": "湘菜",
    "stage": "growth",
    "ambition": "premium"
  },
  "missing_information": [
    "核心消费者",
    "竞争品牌",
    "差异优势"
  ]
}
```

### 关键机制

Discovery Agent 不只是继续追问，而是识别：

- 已经理解了什么
- 还不了解什么
- 哪个缺失信息会影响下一步判断

### Runtime 规则

- 如果 `missing_information.length > 0`，继续留在 `DISCOVERY`
- 如果品牌基础信息完整，进入 `PROFILE_READY`

## 五、阶段 2：Brand Diagnosis Agent

### 输入

`BrandProfile`

### 输出

## Brand Diagnosis Artifact

```json
{
  "clarity_score": 72,
  "problems": [
    {
      "title": "定位模糊",
      "reason": "消费者无法区分你与其他湘菜品牌"
    }
  ],
  "opportunities": [
    {
      "title": "宴请场景机会"
    }
  ]
}
```

### 作用

- 生成第一次结构化诊断
- 给后续市场分析和专家讨论提供问题底板
- 作为后续优化对比的基线资产

### 资产要求

- 必须保存
- 必须可回看
- 必须允许用户反馈“很符合 / 部分符合 / 不符合”

## 六、阶段 3：Market Insight Agent

这里不重新做市场分析，而是调用 `M-MKT`。

### 链路

```text
M-PNT

需要市场认知

↓

调用 M-MKT

↓

获得 MarketSnapshot
```

### 输出

```json
{
  "market_position": "竞争激烈",
  "gap": [
    "年轻商务宴请"
  ],
  "risk": [
    "传统湘菜同质化"
  ]
}
```

### Runtime 规则

- M-PNT 不重复建市场模型
- 只消费 M-MKT 输出并转成定位上下文
- 如果市场信息不足，回到 `DISCOVERY` 补城市、区域、竞品信息

## 七、阶段 4：Expert Debate Engine

这是 Runtime 核心。

不是三个 Prompt，而是：

## 多角色推理系统

```text
             Positioning Council


       Ries
        |
        |
Trout --- Moderator --- Ye Maozhong
```

### 每个专家都拥有

1. 理论模型  
2. 判断规则  
3. 关注指标

### Ries Agent

Prompt 核心：

```text
你代表品类定位理论。

优先考虑：

是否创造新品类？
是否成为第一认知？
```

### Trout Agent

```text
你代表竞争定位理论。

优先考虑：

竞争空位？
消费者心智？
差异化？
```

### 叶茂中 Agent

```text
你代表情绪战略。

优先考虑：

消费动机？
文化符号？
情感连接？
```

## 八、专家讨论机制

不要停在：

- A 输出
- B 输出
- C 输出

而是进入三轮讨论。

### Round 1：独立判断

每位专家先给自己的观点。

### Round 2：互相挑战

例如：

Ries：

> 你们都在已有市场竞争，但真正机会是创造新品类。

Trout：

> 新品类成本太高，没有足够资源教育市场。

### Round 3：Moderator 总结

### 输出

```json
{
  "consensus": "聚焦湘菜宴请场景",
  "conflicts": [
    "新品类还是场景定位"
  ],
  "confidence": 0.84
}
```

### 关键要求

- 必须留下 `consensus`
- 必须留下 `conflicts`
- 必须留下 `confidence`
- 必须形成可回看的 `Debate Artifact`

## 九、阶段 5：Position Option Generator

不要生成一个定位，而是生成战略空间。

### 输入

- 品牌画像
- 市场机会
- 专家共识

### 输出

3 个方向：

```json
{
  "options": [
    {
      "name": "",
      "positioning": "",
      "advantage": "",
      "risk": "",
      "score": ""
    }
  ]
}
```

### 运行规则

- 必须至少输出 3 个方向
- 每个方向都要有优势、风险和推荐度
- 不允许只给一个“唯一正确答案”

## 十、阶段 6：Founder Decision Node

这是 MealKey 最核心差异。

AI 不替用户决定，而是进入：

## Decision Node

系统提问：

> 三个方向中，哪个更符合你的长期愿景？

### 用户输入

- 选择 `A/B/C`
- 说明原因

### 保存结构

```json
{
  "choice": "A",
  "reason": "希望成为高端宴请品牌"
}
```

### 这一步的价值

这是 AI 越来越懂用户的关键，因为它记录的不是“用户点了什么”，而是：

- 用户相信什么
- 用户偏好什么
- 用户愿意承担什么风险

## 十一、阶段 7：Strategy Synthesizer

综合：

```text
市场事实

+

专家观点

+

用户选择

+

企业资源
```

生成：

## Brand Strategy Artifact

```json
{
  "positioning": "",
  "target_customer": "",
  "category": "",
  "core_message": "",
  "not_do": "",
  "90_day_plan": ""
}
```

### 结果要求

最终资产必须包含：

- 品牌定位
- 核心用户
- 竞争位置
- 核心表达
- 不做什么
- 90 天计划

## 十二、Memory 体系

M-PNT 的成长不来自聊天记录，而来自：

## Founder Brand Memory

例如：

```json
{
  "founder_belief": "希望做长期品牌，而不是短期赚钱",
  "risk_preference": "愿意投入品牌建设",
  "brand_style": "偏高端、文化型"
}
```

### Memory 作用

未来：

- `M-BIZ` 调用时，知道这个老板不喜欢低价模型
- `M-ED` 调用时，知道这个老板重视长期控制权
- `M-MKT` 调用时，知道他更关注长期品牌空间而不是短期流量机会

### Memory 不是聊天记录

而是结构化认知资产：

- founder_belief
- risk_preference
- brand_style
- rejected_options
- strategic_preferences
- historical_decisions

## 十三、最终 M-PNT Runtime 闭环

```text
用户输入

↓

AI理解

↓

形成品牌认知

↓

发现未知

↓

主动追问

↓

调用专业能力

↓

专家协作

↓

用户参与选择

↓

形成战略资产

↓

持续学习
```

## 十四、最终判断

M-PNT V2 真正的护城河不是：

- 三个专家
- LLM 能力

而是：

**把一次品牌咨询过程数字化。**

传统咨询：

```text
人 → 顾问 → 报告
```

MealKey：

```text
人 → AI 咨询团队 → 决策资产 → 持续成长
```

## 十五、下一步

下一步进入：

## 《M-PNT V2 数据资产与 Memory 设计》

因为这会决定：

> 为什么用 MealKey 三个月以后，它会越来越懂一个餐饮老板，而不是每次重新聊天。

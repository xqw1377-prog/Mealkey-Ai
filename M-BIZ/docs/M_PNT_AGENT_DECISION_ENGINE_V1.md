# M-PNT Agent Decision Engine V1

# 品牌定位决策引擎设计

这一层是 M-PNT 从“高级 AI 咨询体验”进入“真正决策系统”的关键。

前面三层：

```text
Knowledge Asset
知识资产

↓

Runtime Workflow
流程编排

↓

Workshop UI
用户体验
```

解决的是：

> 如何模拟一次品牌战略会议。

但是还缺最后一个核心：

> AI 如何像战略顾问一样做判断？

也就是：

**Decision Engine。**

---

# 一、M-PNT Decision Engine 定位

## 不负责生成答案

LLM 最擅长：

- 生成观点
- 总结信息
- 表达方案

但战略决策需要：

- 权衡
- 排序
- 判断风险
- 选择方向

所以 Decision Engine 负责：

> 把多个专家观点转化为可解释的品牌战略决策。

---

# 二、整体架构

```text
用户输入

↓

Brand Understanding Model
品牌理解模型

↓

Market Reality Model
市场现实模型

↓

Expert Reasoning Engine
三专家判断

↓

Conflict Resolution Engine
观点冲突处理

↓

Positioning Scoring Engine
定位评分

↓

Decision Engine
最终决策

↓

Execution Path
落地路径
```

---

# 三、第一层：Brand Understanding Model

## 目的

先判断：

“这个创业者到底想做什么。”

不是直接定位。

---

输入：

```text
品牌名称

品类

城市

经营规模

资源能力

创业目标

竞争对象
```

---

输出：

```typescript
BrandProfile {
  brandType:
    | "new_brand"
    | "upgrade"
    | "regional_expansion"

  founderProfile: {
    experience
    resources
    ambition
  }

  businessConstraint: {
    budget
    team
    operationCapability
  }
}
```

---

例如：

用户：

> 我有一家20年湘菜店，想升级品牌。

系统判断：

```text
不是创业型品牌。

属于：

传统餐饮品牌升级。
```

因此策略不同。

---

# 四、第二层：Market Reality Model

连接 M-MKT。

因为定位不能脱离市场。

输入：

```text
城市

品类

区域

竞争品牌
```

输出：

```typescript
MarketReality {
  categoryStage:
    | "growth"
    | "mature"
    | "decline"

  competitionLevel:
    | "low"
    | "medium"
    | "high"

  whiteSpace: []

  risk: []
}
```

---

例如：

湘菜：

系统判断：

```text
品类成熟。

全国品牌弱。

区域机会存在。

但必须避免同质化。
```

---

# 五、第三层：专家推理层

这里保留三个专家。

但是升级。

不是：

三个 Prompt。

而是：

三个 Reasoning Agent。

---

# 1. Ries Agent

核心问题：

> 有没有新的认知位置？

输出：

```typescript
RiesAnalysis {
  categoryOpportunity
  mentalPosition
  firstConcept
  score
  reasoning
}
```

---

# 2. Trout Agent

核心问题：

> 你凭什么区别于别人？

输出：

```typescript
TroutAnalysis {
  competitiveEnemy
  difference
  positioningBattle
  score
}
```

---

# 3. 叶茂中 Agent

核心问题：

> 消费者为什么选择你？

输出：

```typescript
ConsumerAnalysis {
  consumerNeed
  emotionalTrigger
  scenario
  score
}
```

---

# 六、第四层：观点冲突引擎

这是非常重要的。

真实咨询会议一定有冲突。

例如：

Ries：

```text
创造新品类
```

Trout：

```text
不要创造，竞争已有品类
```

叶茂中：

```text
消费者没有这个认知
```

不能简单平均。

---

建立：

## Conflict Matrix

例如：

| 问题 | Ries | Trout | 叶茂中 |
| --- | --- | --- | --- |
| 新品类 | 高 | 低 | 中 |
| 竞争优势 | 中 | 高 | 中 |
| 消费者接受 | 中 | 中 | 高 |

---

AI 主持输出：

```text
当前最大战略矛盾：

品牌应该教育市场，
还是借助已有认知。

建议：

优先借助已有湘菜认知，
通过家庭宴请场景建立差异。
```

---

# 七、第五层：定位评分引擎

这是核心。

每个定位方案都要评分。

## 六维定位评分模型

```text
Positioning Score =
```

---

## 1. 心智占位力

Mind Share

问题：

消费者是否容易记住。

---

## 2. 差异强度

Difference

问题：

是否容易被替代。

---

## 3. 市场机会度

Market Opportunity

连接 M-MKT。

---

## 4. 创业匹配度

Founder Fit

连接用户能力。

---

## 5. 执行可行度

Execution

连接 M-BIZ。

---

## 6. 长期扩展性

Expansion

---

公式：

```text
Final Score =

M ×0.2

+

D ×0.25

+

O ×0.2

+

F ×0.15

+

E ×0.15

+

X ×0.05
```

---

# 八、多方案生成

M-PNT 不应该只给一个答案。

战略选择需要：

3 个路径。

---

输出：

```typescript
PositioningOptions[] {
  name
  position
  target
  reason
  score
  risk
  executionPath
}
```

---

例如：

## 方案 A

```text
家庭宴请湘菜专家

Score 86

优势：

场景明确

风险：

区域限制
```

---

## 方案 B

```text
年轻湘菜生活方式品牌

Score 79

优势：

传播性强

风险：

竞争激烈
```

---

## 方案 C

```text
长沙味道代表

Score 74

优势：

文化资产

风险：

扩张困难
```

---

# 九、第六层：最终 Decision Agent

最后不是：

AI 决定。

而是：

AI 辅助创始人决策。

---

输出：

```typescript
PositioningDecision {
  recommended: optionA
  why: []
  avoid: []
  nextActions: []
}
```

---

例如：

```text
综合判断：

推荐方案 A。

原因：

1.
符合湘菜成熟阶段

2.
避开现有竞争

3.
符合你的运营经验

不建议：

年轻潮牌路线。

原因：

与资源能力不匹配。
```

---

# 十、Decision Trace（非常重要）

MealKey 最大差异化在这里。

每次判断都要留下：

为什么。

结构：

```typescript
DecisionTrace {
  input
  expertViews
  conflicts
  scores
  finalDecision
  confidence
}
```

---

未来用户问：

“为什么这样定位？”

AI 可以回答：

> 因为三个专家分别从心智、竞争、消费者三个角度判断，最终你的资源条件更匹配方案 A。

---

# 十一、与其他 Agent 连接

M-PNT 不结束。

它输出：

```text
PositioningDecision
```

进入：

---

M-BIZ：

验证：

```text
这个定位赚钱吗？
```

---

M-ED：

验证：

```text
团队是否支持？
```

---

Launch：

验证：

```text
怎么开第一家店？
```

---

# 十二、M-PNT 完整闭环

现在形成：

```text
用户认知采集

↓

品牌理解

↓

市场分析

↓

专家会议

↓

战略冲突

↓

方案评分

↓

创始人选择

↓

定位蓝图

↓

执行路径

↓

结果反馈

↓

模型成长
```

---

# 十三、最终判断

这一版 M-PNT 已经不是：

“品牌定位 Agent”。

而是：

> 一个模拟顶级品牌咨询公司的 AI 战略工作台。

它的价值来自：

不是回答问题。

而是：

**带用户完成一次高质量战略决策。**

---

下一步应该进入：

# 《M-PNT Data Contract & Runtime Implementation V1》

把设计冻结成工程规范：

1. Agent Manifest
2. Workflow State Machine
3. 输入输出 Schema
4. Decision 数据结构
5. Knowledge Retrieval 接口
6. Runtime 调度协议
7. 与 MealKey 主系统接入规范

这一份完成后，M-PNT 才可以真正开始开发。

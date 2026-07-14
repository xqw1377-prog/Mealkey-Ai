# M-PNT Agent Runtime Workflow V1

## 一、核心目标

这一版不是设计一个“定位 Agent”。

而是设计：

> 一个能够模拟真实品牌战略咨询公司的 AI 工作流系统。

核心思想：

**AI 不替用户做决定，而是组织用户完成一次高质量品牌决策。**

---

# 1. M-PNT Runtime 总体架构

整体运行链：

```text
用户输入
    ↓
Brand Context Builder
    ↓
Founder Understanding Engine
    ↓
Market Intelligence Engine
    ↓
Expert Agent Council
    ↓
Debate Engine
    ↓
Decision Engine
    ↓
Positioning Strategy Generator
    ↓
Execution Path Simulator
    ↓
Memory & Growth Engine
```

---

# 2. Runtime 核心对象设计

M-PNT 不应该围绕 Chat Message。

应该围绕：

## Brand Decision Object

品牌决策对象。

---

核心数据：

```typescript
BrandProject {
  id
  brandName
  category
  city
  stage

  founderProfile
  marketContext
  positioningOptions
  expertOpinions
  debateRecords
  finalDecision
  executionPath
  memory
}
```

---

# 3. 工作流状态机

M-PNT 使用状态驱动。

不是聊天驱动。

## Positioning Workflow State

```text
INIT
  ↓
CONTEXT_COLLECTION
  ↓
FOUNDER_PROFILE
  ↓
MARKET_ANALYSIS
  ↓
EXPERT_ANALYSIS
  ↓
EXPERT_DEBATE
  ↓
FOUNDER_DECISION
  ↓
POSITIONING_CONFIRM
  ↓
EXECUTION_SIMULATION
  ↓
COMPLETED
```

---

每个状态：

都有：

- 输入
- 处理 Agent
- 输出
- 下一状态

---

# 4. Stage 1：Context Collection

## Agent：

Brand Intake Agent

职责：

收集最小必要信息。

不是一次问完。

采用：

## Adaptive Interview

动态追问。

例如：

用户：

> 做湘菜。

AI 不会马上分析。

继续：

```text
你的目标是什么？

A 单店盈利
B 做区域品牌
C 全国连锁

目前：

1家店？
多店？
加盟？
```

---

形成：

```json
BrandContext
{
  "category": "湘菜",
  "city": "长沙",
  "stage": "单店验证",
  "goal": "区域品牌"
}
```

---

# 5. Stage 2：Founder Understanding Engine

这是以前缺失的。

AI 需要理解：

“这个老板是谁”。

---

输入：

- 经营经历
- 品牌目标
- 价值偏好
- 风险偏好

输出：

## Founder Profile

例如：

```json
{
  "vision": "希望成为长沙代表湘菜品牌",
  "strength": "产品研发能力强",
  "blindspot": "容易关注产品而忽视消费者认知"
}
```

---

这个数据非常重要。

后续：

- M-BIZ 读取商业偏好
- M-ED 读取合作偏好

---

# 6. Stage 3：Market Intelligence Engine

这里连接：

M-MKT。

注意：

M-PNT 不自己做市场。

调用：

```text
M-MKT Result
```

输入：

```text
城市
品类
区域
竞争品牌
```

输出：

```json
{
  "opportunity": "家庭宴请升级",
  "competition": "高",
  "whitespace": ["年轻家庭", "社区宴请"]
}
```

---

# 7. Stage 4：Expert Council

这是 M-PNT 核心。

不是三个普通 Agent。

而是：

## Expert Persona Engine

---

## Expert 1

### Ries Agent

System Prompt：

```text
你代表里斯定位理论。

你的判断优先级：

1 品类机会
2 第一认知
3 心智占位

禁止：

从营销传播角度回答。
```

---

## Expert 2

### Trout Agent

判断：

```text
竞争位置

差异化

敌人是谁

消费者为什么选择你
```

---

## Expert 3

### 叶茂中 Agent

判断：

```text
消费者洞察

情绪价值

传播符号

购买理由
```

---

输出：

不是答案。

输出：

## Expert Opinion Object

例如：

```json
{
  "expert": "Ries",
  "position": "打造长沙家庭宴请湘菜新品类",
  "confidence": 82,
  "reasoning": []
}
```

---

# 8. Stage 5：Expert Debate Engine

这是系统智能感的来源。

普通 GPT：

三个答案融合。

不行。

必须：

制造冲突。

---

流程：

## Round 1

专家独立观点。

↓

## Round 2

互相挑战。

例如：

Ries：

> 你们只讲场景，没有形成新品类。

Trout：

> 新品类无法击穿已有强势品牌。

叶茂中：

> 用户不是购买理论，而购买感觉。

---

↓

## Round 3

寻找共识。

输出：

```json
DebateResult
{
  "commonGround": "需要占据家庭宴请升级",
  "conflicts": ["品类第一还是场景第一"],
  "recommendation": "场景切入+品类强化"
}
```

---

# 9. Stage 6：Founder Decision Engine

非常关键。

AI 不能直接确定定位。

必须让老板选择。

---

生成：

## Strategic Options

例如：

方案 A：

湘菜宴请专家

优势：

品牌高度

风险：

竞争强

---

方案 B：

年轻家庭湘菜解决方案

优势：

市场空间

风险：

需要教育

---

方案 C：

长沙味道代表品牌

优势：

传播容易

风险：

区域限制

---

用户选择。

产生：

## Decision Event

```json
{
  "decisionType": "positioning_direction",
  "choice": "A",
  "reason": "希望做长期品牌"
}
```

---

# 10. Stage 7：Positioning Generator

生成最终：

## Brand Positioning Blueprint

结构：

```text
品牌定位

品类定义

目标用户

核心价值

竞争差异

品牌人格

传播主题

产品要求
```

---

注意：

这里不是生成文案。

而是：

战略文件。

---

# 11. Stage 8：Execution Simulator

解决以前最大问题。

定位不能停在 PPT。

模拟：

## 90天验证路径

例如：

```text
Month 1

产品调整

验证：

用户是否接受

Month 2

营销测试

验证：

认知是否形成

Month 3

经营指标

验证：

复购提升
```

---

输出：

## Positioning Execution Map

---

# 12. Memory Engine

M-PNT 最大价值：

不是一次回答。

而是形成：

## Brand Intelligence Memory

保存：

```json
BrandMemory
{
  "brandDNA": {},
  "founderPreference": {},
  "positioningHistory": [],
  "rejectedOptions": [],
  "marketInsights": [],
  "decisions": []
}
```

---

未来：

老板第二次进入：

AI 知道：

- 他以前为什么选择这个方向
- 哪些方案被否决
- 哪些风险还存在

---

# 13. M-PNT Runtime 与 MealKey OS 的关系

最终：

MealKey 不是：

Agent 集合。

而是：

## Founder Cognitive Operating System

M-PNT：

负责品牌认知。

M-MKT：

负责市场认知。

M-BIZ：

负责商业认知。

M-ED：

负责组织认知。

共同形成：

```text
Founder Profile
  ↓
Market Understanding
  ↓
Brand Decision
  ↓
Business Model
  ↓
Organization Design
  ↓
Execution
```

---

# 14. 下一步

现在 M-PNT Runtime 已经明确。

下一步最关键：

## 《M-PNT Frontend Workshop UI V1》

因为这个产品的核心不是后端能力，而是：

**用户是否感觉自己正在参加一次顶级品牌咨询会议。**

需要设计：

1. 首页进入体验
2. 品牌访谈页面
3. 市场战场地图
4. 三专家会议室
5. 决策选择页
6. 定位蓝图页
7. 90天执行路线页

这一层做好，M-PNT 才会从“AI 聊天”真正变成“AI 品牌战略工作室”。

# 《Founder Layer 最小实现设计 V1》

> 子标题：不改四个 Agent，只增加“智能协同层”
>
> 核心判断：Founder Layer 不是第五个 Agent，也不是新的业务引擎。它是调度、记忆、会议、决策管理系统，用来把已有四个专业 Agent 组织成真正的企业顾问团队。

## 一、收敛目标

这一层先只解决一个问题：

> 不重新造一个 AI，而是让已有四个专业 Agent 组成一个真正的企业顾问团队。

所以 Founder Layer 不是：

- 新的品牌专家
- 新的市场专家
- 新的商业专家
- 新的组织专家

Founder Layer 是：

## 调度 + 记忆 + 会议 + 决策管理系统

它不替代四个专业 Agent。

它负责：

- 知道当前企业是谁
- 判断当前问题该找谁
- 把多个专家组织进同一场会议
- 把会议结论沉淀成可追踪决策
- 把结果写入长期记忆

---

## 二、整体架构冻结

最终架构冻结如下：

```text
                 Founder OS
              用户交互层
                    |
                    |
          Founder Intelligence Layer
                    |
     ---------------------------------
     |               |               |
 Mission          Meeting          Memory
 Router           Engine           Engine
     |               |               |
     ---------------------------------
                    |
              Agent Adapter
                    |
 ------------------------------------------------
 |              |              |                |
M-PNT          M-MKT          M-BIZ            M-ED
品牌专家       市场专家       商业专家         组织专家
```

这里要明确三件事：

### 1. Founder OS

负责用户交互与产品体验。

用户看到的是：

- 一个统一入口
- 一场会议
- 一个决策系统
- 一段持续成长轨迹

### 2. Founder Layer

负责协同编排。

它不做专业判断，只做：

- Context
- Mission
- Adapter
- Meeting
- Decision
- Memory

### 3. 四个专业 Agent

继续独立：

- `M-PNT`
- `M-MKT`
- `M-BIZ`
- `M-ED`

它们保留各自后端、规则、Prompt、数据结构和专业能力演进路径。

---

## 三、Founder Layer 只做 6 个核心能力

V1 不做大。

V1 只做下面六件事：

1. `Company Context`
2. `Mission Router`
3. `Agent Adapter`
4. `Meeting Engine`
5. `Decision Engine`
6. `Memory Engine`

这六项足够把“四个独立专家”组织成“一个顾问团队”。

---

## 四、能力 1：Company Context

这是所有 Agent 共享的统一入口。

当前最大的问题之一是：

> 每个 Agent 都重新问用户一遍基础信息。

例如：

- `M-PNT` 问品牌是什么
- `M-BIZ` 问商业模式是什么
- `M-MKT` 问城市在哪里

用户会感觉自己在重复劳动。

Founder Layer 首先要解决的就是：

## 企业上下文统一

---

## 1. Company Context Schema

```typescript
interface CompanyContext {
  companyId: string
  basicInfo: {
    name: string
    industry: string
    city: string
    stage: string
  }
  business?: {
    model?: string
    revenue?: string
    scale?: string
  }
  brand?: {
    name?: string
    positioning?: string
    users?: string
  }
  goals: string[]
}
```

---

## 2. 它的作用

调用 `M-PNT` 时自动带入：

- 品牌信息
- 用户画像
- 当前定位

调用 `M-BIZ` 时自动带入：

- 商业模式
- 收入状态
- 当前规模

调用 `M-MKT` 时自动带入：

- 城市
- 行业
- 阶段

也就是说：

> Company Context 负责消灭重复提问。

---

## 五、能力 2：Mission Router

这是 Founder Layer 的第一个智能入口。

用户不会说：

> 我要调用 M-BIZ。

用户会说：

> 我想开 100 家店。

Mission Router 的作用不是让 AI 自由发挥。

而是：

> 用规则优先、LLM 辅助的方式，把自然语言问题识别成咨询任务。

---

## 1. Mission Router 输出

```typescript
interface FounderMission {
  missionId: string
  mission: string
  agents: Array<"M-PNT" | "M-MKT" | "M-BIZ" | "M-ED">
  objective?: string
  meetingType?: string
  confidence?: number
}
```

示例：

```json
{
  "mission": "连锁扩张可行性评估",
  "agents": ["M-MKT", "M-BIZ", "M-ED"]
}
```

---

## 2. 路由原则

V1 阶段先用：

- 规则
- 关键词
- 场景映射
- LLM 校正

而不是让模型完全自由决策。

原因很简单：

Founder Layer 现在做的是：

> 稳定分发，不是高度开放推理。

---

## 六、能力 3：Agent Adapter

这是整个 Founder Layer 最关键的一层。

因为现在四个后端完全不同：

- `M-PNT`: TypeScript / `MKDecision`
- `M-BIZ`: FastAPI / `JudgeResponse`
- `M-MKT`: Pipeline Output
- `M-ED`: Handler Response

Founder Layer 不应该理解四套私有协议。

它只应该理解：

## 统一的会议输入协议

---

## 1. 统一协议

```typescript
interface FounderDecision {
  sourceAgent: string
  question: string
  judgement: string
  confidence: number
  evidence: string[]
  risks: string[]
  nextSteps: string[]
}
```

---

## 2. Adapter 的职责

- 调用原有 Agent 接口
- 接收原生结果
- 转成统一 `FounderDecision`

Founder Layer 不关心：

- 对方内部评分怎么算
- 对方内部 Prompt 怎么写
- 对方内部规则引擎长什么样

Founder Layer 只关心：

> 这个专家在这一轮会议里给出的判断是什么。

---

## 3. 一个转换示例

假设 `M-BIZ` 原生输出里表达的是：

```text
商业模式风险：高
原因：收入模型不足
建议：验证单店模型
```

经过 Adapter 转换后：

```typescript
const founderDecision = {
  sourceAgent: "M-BIZ",
  question: "当前商业模式是否支持扩张",
  judgement: "当前商业模式风险较高，不建议直接放大扩张。",
  confidence: 0.81,
  evidence: ["收入模型不足"],
  risks: ["扩张后现金流承压"],
  nextSteps: ["先验证单店模型"]
}
```

---

## 七、能力 4：Meeting Engine

Meeting Engine 是 Founder Layer 的价值中心。

它不是 Chat，不是多轮对话容器。

它是：

## 会议引擎

它的作用是把多个专业判断组织成一场有结构的决策会议。

---

## 1. Meeting 输入

输入是：

- 一个 `Mission`
- 一组 `FounderDecision`

例如：

```json
{
  "topic": "是否启动加盟扩张",
  "experts": ["M-MKT", "M-BIZ", "M-ED"],
  "rounds": 3
}
```

---

## 2. 会议流程

V1 阶段固定三轮：

### Round 1

专家独立判断。

### Round 2

观点冲突暴露。

### Round 3

形成综合建议。

也就是说，Meeting Engine 先不追求复杂仿真。

先把“独立观点 -> 冲突 -> 建议”这条链跑通。

---

## 3. Meeting Schema

```typescript
interface FounderMeeting {
  meetingId: string
  topic: string
  experts: string[]
  rounds: 3
  opinions: FounderDecision[]
  conflicts: MeetingConflict[]
  recommendation?: string
}

interface MeetingConflict {
  dimension: string
  summary: string
  agents: string[]
}
```

---

## 八、能力 5：Decision Engine

会议结束后，Founder Layer 不能只输出报告。

它必须形成：

## Decision

也就是 Founder 真正可以追踪、执行和复盘的决策对象。

---

## 1. Decision Schema

```typescript
interface Decision {
  problem: string
  options: Option[]
  chosen: string
  reason: string
  validationPlan: string
  status: string
}

interface Option {
  label: string
  summary?: string
}
```

---

## 2. 示例

```text
决策：
暂缓加盟

原因：
组织复制不足

验证：
90 天完成直营复制
```

Decision Engine 的关键不是“总结”。

而是：

> 把会议变成一个可追踪的选择。

---

## 九、能力 6：Memory Engine

Memory Engine 是 Founder Layer 的长期理解层。

V1 不做复杂知识图谱。

先做三类最有价值的 Memory。

---

## 1. 企业事实

```json
{
  "店数": 3,
  "城市": "长沙",
  "品类": "湘菜"
}
```

## 2. 决策历史

```json
{
  "2026-07": "暂缓加盟"
}
```

## 3. 用户偏好

```json
{
  "喜欢": "稳健增长"
}
```

---

## 2. Memory Engine 的意义

它先解决的不是“无限学习”。

而是：

- 不重复问用户
- 不忘记历史选择
- 不丢失 Founder 风格

这已经足够形成第一层长期壁垒。

---

## 十、和现有四个后端怎么连接

重点是：

## 不要侵入

Founder Layer 应采用：

## API Adapter

也就是通过调用现有接口拿结果，再做协议转换。

---

## 1. 连接方式示意

### M-PNT

可以是：

```text
POST /decision
```

或者继续复用已有接口，只要能返回当前 `MKDecision` 即可。

### M-BIZ

调用：

```text
POST /judge
```

### M-MKT

调用：

```text
analyze()
```

### M-ED

调用：

```text
POST /equity
```

Founder Layer 不要求它们统一实现方式。

它只要求：

> 每个 Agent 最终都能被 Adapter 翻译成统一 `FounderDecision`。

---

## 十一、开发顺序冻结

这里很重要。

不要先开发会议。

正确顺序是：

### Phase 1：统一协议层

目标：

四个 Agent 可以被统一调用。

开发内容：

```text
agent-adapter
decision-contract
```

周期：

短。

### Phase 2：企业 Context

目标：

AI 知道用户是谁、企业是什么。

开发内容：

```text
company-profile
memory-store
```

### Phase 3：Mission Router

目标：

AI 知道该调谁。

### Phase 4：Meeting Engine

目标：

产品从工具升级成团队。

### Phase 5：Decision Memory

目标：

形成长期壁垒。

---

## 十二、它解决当前什么产品问题

你之前的问题非常准确：

> 现在产品不像一个顾问系统，更像分类后的 AI 对话。

根因就是：

- 四个 Agent 各自回答
- 用户感觉自己在和四个 ChatGPT 说话

加入 Founder Layer 后，产品体验会变成：

用户说：

> 我要扩大。

系统说：

> 这是一个战略问题，我先召集三个顾问分析。

然后：

- `M-MKT` 判断市场机会
- `M-BIZ` 判断商业模型
- `M-ED` 判断组织能力

最后系统形成：

> 综合判断，不建议现在加盟，90 天后复评。

这时候用户感知就不是聊天。

而是：

## 决策支持

---

## 十三、当前应冻结的最终结构

最终结构如下：

```text
                    Founder OS

              企业 AI 操作系统

                    Founder Layer

      --------------------------------
      Context | Mission | Meeting | Memory

      --------------------------------
      M-PNT | M-MKT | M-BIZ | M-ED
```

这里要再次强调：

- `Founder OS` 是统一用户体验
- `Founder Layer` 是智能协同层
- `M-PNT / M-MKT / M-BIZ / M-ED` 是四个独立专家大脑

这三层分工清楚之后，产品方向才不会再次跑偏。

---

## 十四、最终结论

Founder Layer 的最小实现不是：

- 做一个更大的 Agent
- 合并四个后端
- 重写专业能力

Founder Layer 的最小实现是：

1. 建一个 `Company Context`
2. 做一个 `Mission Router`
3. 用 `Agent Adapter` 打通四个后端
4. 用 `Meeting Engine` 组织会议
5. 用 `Decision Engine` 沉淀决策
6. 用 `Memory Engine` 形成长期理解

这六步完成后，Founder OS 就会第一次从：

> 四个独立 AI 工具

升级为：

> 一个会组织专家、形成决策、记住企业历史的企业顾问团队。

---

## 十五、下一步

下一步应继续进入：

# 《Founder Layer Adapter & Meeting Contract Design V1》

重点冻结四件事：

1. 每个 Adapter 的输入输出
2. 统一 `FounderDecision` 协议
3. `FounderMeeting / MeetingConflict / Decision` 契约
4. 如何把会议结论写入 V1 的 Memory Store

这一步完成后，就可以开始 Founder Layer 的低侵入工程落地。

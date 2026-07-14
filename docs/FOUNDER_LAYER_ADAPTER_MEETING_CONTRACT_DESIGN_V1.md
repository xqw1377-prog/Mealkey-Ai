# 《Founder Layer Adapter & Meeting Contract Design V1》

> 子标题：让四个独立 Agent 在不改后端的前提下进入同一场咨询会议
>
> 核心判断：Founder Layer 的第一性原理不是统一代码，而是统一契约。只要 `Adapter / Decision / Meeting / Memory Write` 四层契约冻结，Founder Layer 就可以低侵入落地。

## 一、这份文档解决什么

前一份《Founder Layer 最小实现设计 V1》已经冻结了六个能力：

- `Company Context`
- `Mission Router`
- `Agent Adapter`
- `Meeting Engine`
- `Decision Engine`
- `Memory Engine`

这一份继续往下走一层，解决真正可以编码的接口问题：

1. 每个 Adapter 的输入输出是什么
2. 统一 `FounderDecision` 协议长什么样
3. 会议记录与冲突结构如何冻结
4. 会议结论如何写入 V1 `Memory Store`

也就是说，这份文档的目标不是继续讲产品方向。

它的目标是：

> 让 Founder Layer 进入工程可实现状态。

---

## 二、Founder Layer 的最小执行链

V1 的最小执行链冻结如下：

```text
Company Context
  ↓
Mission Router
  ↓
Adapter Hub
  ↓
FounderDecision[]
  ↓
Meeting Engine
  ↓
Decision Engine
  ↓
Memory Write
```

这里每一段都必须是显式契约，而不能靠隐式约定。

---

## 三、统一输入：Founder Layer Mission Request

Founder Layer 对外先接收统一任务输入。

```typescript
interface FounderMissionRequest {
  requestId: string
  projectId: string
  userId: string
  message: string
  companyContext: CompanyContext
  currentMemory?: FounderMemorySnapshot
  createdAt: string
}
```

辅助对象：

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

interface FounderMemorySnapshot {
  facts: MemoryFact[]
  decisions: MemoryDecisionSummary[]
  preferences: MemoryPreference[]
}
```

V1 的要求很简单：

- Founder Layer 不负责自己去拼上下文
- 外层必须先传入一个最小 `CompanyContext`
- Memory 只传摘要，不传全量历史

---

## 四、Mission Router 输出契约

Mission Router 的输出需要稳定到可测试。

```typescript
interface FounderMission {
  missionId: string
  requestId: string
  mission: string
  missionType:
    | "expansion_review"
    | "positioning_review"
    | "market_entry"
    | "business_diagnosis"
    | "organization_review"
    | "mixed_strategy"
  objective: string
  question: string
  requiredAgents: AgentName[]
  meetingType:
    | "strategy_meeting"
    | "positioning_council"
    | "expansion_meeting"
    | "entry_meeting"
    | "diagnosis_meeting"
  confidence: number
  createdAt: string
}

type AgentName = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED"
```

---

## 五、Adapter Hub 的总接口

Founder Layer 不直接面向四个 Agent 的私有接口。

Founder Layer 只依赖统一 Adapter 接口：

```typescript
interface FounderAgentAdapter {
  agent: AgentName
  supports(mission: FounderMission): boolean
  buildRequest(input: AdapterBuildInput): AdapterRequest
  invoke(request: AdapterRequest): Promise<AdapterRawResponse>
  normalize(response: AdapterRawResponse, context: AdapterNormalizeContext): FounderDecision
}
```

配套类型：

```typescript
interface AdapterBuildInput {
  mission: FounderMission
  companyContext: CompanyContext
  memory?: FounderMemorySnapshot
}

interface AdapterRequest {
  agent: AgentName
  endpoint: string
  payload: Record<string, unknown>
  timeoutMs?: number
}

interface AdapterRawResponse {
  agent: AgentName
  status: "success" | "failed" | "partial"
  raw: unknown
  latencyMs?: number
}

interface AdapterNormalizeContext {
  question: string
  mission: FounderMission
}
```

这个接口有三个关键作用：

1. 对外隐藏四个 Agent 的内部差异
2. 允许每个 Adapter 保留不同请求方式
3. 确保 Founder Layer 最终只消费 `FounderDecision`

---

## 六、每个 Adapter 的职责边界

### 1. `mpnt.adapter.ts`

职责：

- 调用现有 `M-PNT` 接口
- 读取 `MKDecision / positioning context / contract`
- 转换成品牌专家在本轮 Mission 下的判断

### 2. `mmkt.adapter.ts`

职责：

- 调用现有 `M-MKT` 输出
- 读取市场机会、竞争、用户趋势
- 转换成市场专家在本轮 Mission 下的判断

### 3. `mbiz.adapter.ts`

职责：

- 调用现有 `M-BIZ` 输出
- 读取 `JudgeResponse / pageOutput / suggestions`
- 转换成商业专家在本轮 Mission 下的判断

### 4. `med.adapter.ts`

职责：

- 调用现有 `M-ED` 输出
- 读取股权、组织、激励、治理判断
- 转换成组织专家在本轮 Mission 下的判断

每个 Adapter 都只做三件事：

1. 组装请求
2. 发起调用
3. 协议归一

不做：

- 专业推理
- 二次改写专业规则
- 会后综合判断

---

## 七、统一输出：FounderDecision Contract

这是一层最关键的统一协议。

所有 Agent 最终都必须被 Adapter 转换为：

```typescript
interface FounderDecision {
  decisionId: string
  sourceAgent: AgentName
  question: string
  judgement: string
  confidence: number
  evidence: DecisionEvidence[]
  risks: string[]
  nextSteps: string[]
  stance?: "support" | "oppose" | "conditional"
  metadata?: {
    missionId: string
    producedAt: string
    latencyMs?: number
  }
}

interface DecisionEvidence {
  label: string
  content: string
  confidence?: number
}
```

字段解释：

- `question`: 这个专家回答的具体问题
- `judgement`: 最终判断句
- `confidence`: 当前判断置信度
- `evidence`: 支撑证据
- `risks`: 风险提示
- `nextSteps`: 推荐下一步
- `stance`: 在会议里是支持、反对还是有条件支持

`stance` 很重要。

因为 Meeting Engine 后续要靠它做第一轮冲突识别。

---

## 八、四个 Adapter 的归一化示例

### 1. M-BIZ 归一化示例

原生语义：

```text
商业模式风险：高
原因：收入模型不足
建议：验证单店模型
```

归一化后：

```json
{
  "sourceAgent": "M-BIZ",
  "question": "当前商业模式是否支持加盟扩张",
  "judgement": "当前商业模式尚不足以支持直接加盟扩张。",
  "confidence": 0.81,
  "evidence": [
    {
      "label": "收入模型",
      "content": "单店收入模型仍不稳定"
    }
  ],
  "risks": ["扩张后现金流承压"],
  "nextSteps": ["先验证单店模型"],
  "stance": "oppose"
}
```

### 2. M-MKT 归一化示例

```json
{
  "sourceAgent": "M-MKT",
  "question": "当前市场空间是否支持扩张",
  "judgement": "目标城市仍有扩张空间，但竞争密度已经提升。",
  "confidence": 0.76,
  "evidence": [
    {
      "label": "市场空位",
      "content": "湘菜细分市场仍存在中高端空位"
    }
  ],
  "risks": ["竞争加剧会抬高获客成本"],
  "nextSteps": ["先验证第二城市复制"],
  "stance": "conditional"
}
```

---

## 九、Meeting Engine 输入输出契约

Meeting Engine 不直接面向原生响应。

它只接受：

- `FounderMission`
- `FounderDecision[]`

```typescript
interface FounderMeetingInput {
  mission: FounderMission
  decisions: FounderDecision[]
}
```

输出：

```typescript
interface FounderMeeting {
  meetingId: string
  missionId: string
  topic: string
  experts: AgentName[]
  rounds: MeetingRound[]
  conflicts: MeetingConflict[]
  recommendation?: string
  createdAt: string
}
```

---

## 十、Meeting Round 结构

V1 固定为三轮：

1. 独立判断
2. 冲突暴露
3. 综合建议

对应结构：

```typescript
interface MeetingRound {
  round: 1 | 2 | 3
  title: string
  items: MeetingRoundItem[]
}

interface MeetingRoundItem {
  agent: AgentName
  summary: string
  stance?: "support" | "oppose" | "conditional"
}
```

建议：

- Round 1 直接投影每个专家判断
- Round 2 只展示冲突点
- Round 3 给出主持人建议稿

这样 Meeting Engine 在 V1 就能先跑出“会议感”。

---

## 十一、MeetingConflict Contract

会议冲突是 Founder Layer 的价值关键之一，所以要单独冻结结构。

```typescript
interface MeetingConflict {
  conflictId: string
  missionId: string
  dimension: string
  summary: string
  agents: AgentName[]
  sideA: string
  sideB: string
  severity: "low" | "medium" | "high"
}
```

示例：

```json
{
  "dimension": "扩张节奏",
  "summary": "市场空间允许扩张，但商业模型与组织能力尚未准备好。",
  "agents": ["M-MKT", "M-BIZ", "M-ED"],
  "sideA": "市场角度支持加速进入",
  "sideB": "商业与组织角度建议暂缓",
  "severity": "high"
}
```

V1 阶段 `MeetingConflict` 可以通过简单规则生成：

- `stance` 互斥
- `confidence` 接近
- `judgement` 关键词冲突

先不做复杂多 Agent 辩论模型。

---

## 十二、Decision Engine 输出契约

Meeting Engine 结束后，由 Decision Engine 形成 Founder 可执行的统一决策对象。

```typescript
interface FounderFinalDecision {
  finalDecisionId: string
  missionId: string
  problem: string
  options: DecisionOption[]
  chosen: string
  reason: string[]
  validationPlan: string[]
  status: "proposed" | "accepted" | "executing" | "verified"
  createdAt: string
}

interface DecisionOption {
  label: string
  summary?: string
  supportedBy?: AgentName[]
}
```

这里要注意：

- `FounderDecision` 是专家意见
- `FounderFinalDecision` 是会议结论

这两者不能混用。

---

## 十三、Memory Write Contract

V1 的 Memory Engine 先不做图谱写入。

先定义统一的写入动作：

```typescript
interface FounderMemoryWrite {
  writeId: string
  projectId: string
  missionId?: string
  type: "fact" | "decision" | "preference" | "meeting"
  domain?: "brand" | "market" | "business" | "organization" | "mixed"
  summary: string
  payload: Record<string, unknown>
  source:
    | "company_context"
    | "agent_decision"
    | "meeting_engine"
    | "decision_engine"
    | "user_feedback"
  createdAt: string
}
```

---

## 十四、V1 Memory Write 规则

V1 只写四类内容：

### 1. 企业事实

来源：

- `CompanyContext`
- 用户补充信息

`type = "fact"`

### 2. 专家会议纪要

来源：

- `FounderMeeting`

`type = "meeting"`

### 3. 最终决策

来源：

- `FounderFinalDecision`

`type = "decision"`

### 4. 用户偏好

来源：

- 用户对建议的接受 / 拒绝
- 用户明确表达的风格偏好

`type = "preference"`

V1 不做：

- 自动学习权重更新
- 图谱边自动生成
- 复杂认知修正

先保证“写得进去、读得出来、下一次能用”。

---

## 十五、推荐的工程文件结构

```text
apps/web/src/server/founder-layer/

├── contracts/
│   ├── mission.ts
│   ├── decision.ts
│   ├── meeting.ts
│   └── memory.ts
├── adapters/
│   ├── base.adapter.ts
│   ├── mpnt.adapter.ts
│   ├── mmkt.adapter.ts
│   ├── mbiz.adapter.ts
│   └── med.adapter.ts
├── meeting/
│   └── engine.ts
├── decision/
│   └── engine.ts
└── memory/
    └── writer.ts
```

建议：

- `contracts/` 先落静态类型
- `adapters/` 先做 1 个样板再复制
- `meeting/decision/memory` 只依赖 `contracts/`

这样层次会很干净。

---

## 十六、Phase 1 实现顺序

第一阶段不要贪多。

按下面顺序做最稳：

### Step 1

先落 `contracts/mission.ts`、`decision.ts`、`meeting.ts`、`memory.ts`

### Step 2

先做一个 `mbiz.adapter.ts` 样板

原因：

- `M-BIZ` 的判断结构最适合作为 Founder Layer 样板
- 有现成 `JudgeResponse / pageOutput / suggestions`

### Step 3

再复制出 `mmkt.adapter.ts`、`mpnt.adapter.ts`、`med.adapter.ts`

### Step 4

再做 `meeting/engine.ts`

### Step 5

最后补 `decision/engine.ts` 与 `memory/writer.ts`

这条顺序会避免一开始就把复杂度推到最高。

---

## 十七、最终结论

Founder Layer 的第一阶段不是做“更强 AI”。

而是做：

## 可组合的专家会议协议层

只要下面四件事冻结：

1. `Adapter`
2. `FounderDecision`
3. `FounderMeeting`
4. `FounderMemoryWrite`

那么四个独立 Agent 就已经可以开始以“同一场会议”的方式工作。

这时 Founder OS 的统一就真正开始发生了。

不是统一后端。

而是统一协作方式。

---

## 十八、下一步

下一步就不该继续写抽象文档了。

最自然的工程动作是：

1. 创建 `apps/web/src/server/founder-layer/contracts/`
2. 先落四份 contract type 文件
3. 以 `M-BIZ` 为样板实现第一个 `adapter`
4. 再接一个最小 `meeting engine`

做到这里，Founder Layer V1 就会从“设计”进入“第一版运行骨架”。

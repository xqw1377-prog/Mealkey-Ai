# 《M-BIZ Agent Runtime V2 架构收敛》

## 一、这一步要解决什么

前面我们已经完成两件事：

- 定义了 `M-BIZ Frontend Experience V1`
- 定义了 `M-BIZ User Journey V1`

现在真正要收口的是：

> 如何把现有 `ECC / Rule Engine / Scoring / Benchmark / Verification`
> 收敛成一条用户可感知的商业咨询 Runtime。

这一步不是继续增加功能。

这一步是把 M-BIZ 从：

- 商业判断引擎
- 规则与评分系统
- 一次性分析器

升级成：

> 一个长期陪伴创始人完成商业判断、路径选择、执行验证与持续复盘的 AI 商业顾问团队。

---

## 二、M-BIZ Runtime V2 的最终定位

**M-BIZ = Business Advisory Runtime**

它不管理“调用哪个能力”。

它管理：

- 当前商业项目处于哪个咨询阶段
- 已经形成了哪些商业资产
- 哪些专家视角已经给出判断
- 用户做了什么取舍
- 哪些验证动作正在推进
- 哪些结果应该进入 Business Memory

所以 Runtime V2 的本质不再是：

```text
Input
↓
Engine
↓
Answer
```

而是：

```text
Business Mission
↓
Workflow State
↓
Asset Mutation
↓
Founder Decision
↓
Verification Feedback
↓
Business Memory
```

---

## 三、M-BIZ Runtime 的核心原则冻结

### 1. 不直接管理能力调用

Runtime 不应该暴露：

- 现在在跑 ECC
- 现在在跑 Rule Engine
- 现在在跑 Benchmark

这些属于后台判断层。

Runtime 只管理用户可感知的业务状态：

- 我们现在在认识你的生意
- 我们正在做商业体检
- 顾问团队正在形成分歧
- 你需要做一个商业取舍
- 我们接下来要验证什么

### 2. 输出必须是商业资产

M-BIZ 不输出一次性回答。

M-BIZ 输出：

- `BusinessSnapshot`
- `BusinessDiagnosis`
- `CouncilReport`
- `ScenarioSimulation`
- `BusinessDecision`
- `ExecutionPlan`
- `BusinessMemory`

### 3. 用户必须参与关键决策

AI 可以组织判断。

但不能替创始人完成商业选择。

所以 Runtime 中必须有：

- `Founder Priority Input`
- `Founder Decision Confirmation`
- `Verification Feedback`

### 4. 底层评分只能作为证据，不能成为前台主语

`Scoring`、`Benchmark`、`RuleJudgment` 都应该继续存在。

但它们的角色是：

> 作为商业体检、顾问冲突、路径推演的判断证据。

而不是直接变成一屏分数。

---

## 四、M-BIZ Runtime V2 总体结构

```text
                   Business Advisory Runtime
                             |
    ---------------------------------------------------------
    |               |               |             |          |
Discovery      Diagnosis        Council      Simulation   Decision
Engine         Engine           Engine       Engine       Engine
    |               |               |             |          |
  ECC          Rule Engine     Benchmark      Scenario    Verification
                Scoring         Expert View    Projection   Feedback
                             Conflict Build
                             |
                       Business Memory
```

说明：

- `ECC` 继续负责事实抽取与商业画像建立
- `Rule Engine + Scoring` 负责商业体检与结构诊断
- `Benchmark` 负责横向对比、风险挑战与顾问争议来源
- `Scenario Projection` 负责路径推演
- `Verification` 负责把执行反馈写回 Runtime

Runtime V2 的变化不是删掉这些能力。

而是给它们重新分配用户可感知的位置。

---

## 五、Business Mission：新的顶层运行对象

M-BIZ Runtime V2 的最小顶层对象不是一次聊天 Session。

而是：

## `BusinessMission`

```ts
type BusinessMissionStage =
  | "DISCOVERY"
  | "DIAGNOSIS"
  | "COUNCIL"
  | "SIMULATION"
  | "DECISION"
  | "FOLLOW_THROUGH";

type BusinessMission = {
  id: string;
  projectId: string;
  ownerId: string;

  stage: BusinessMissionStage;
  status: "active" | "blocked" | "completed";

  currentQuestion: string;
  primaryContradiction?: string;

  founderPriority?: {
    target: "profit" | "growth" | "risk_control" | "brand";
    note?: string;
  };

  assets: {
    snapshot?: BusinessSnapshotAsset;
    diagnosis?: BusinessDiagnosisAsset;
    council?: CouncilReportAsset;
    simulations?: ScenarioSimulationAsset[];
    decision?: BusinessDecisionAsset;
    execution?: BusinessExecutionPlanAsset;
  };

  memory: {
    operatingBias?: string[];
    recurringRisk?: string[];
    validatedPattern?: string[];
  };

  createdAt: string;
  updatedAt: string;
};
```

---

## 六、M-BIZ 的六类核心资产

### 1. BusinessSnapshotAsset

作用：

- 建立共同理解
- 确认业务阶段
- 形成“这门生意到底是什么”的统一描述

```ts
type BusinessSnapshotAsset = {
  businessType: string;
  customer: string;
  offer: string;
  revenueModel: string;
  stage: string;
  currentGoal: string;
  currentBlocker: string;
  confidence: number;
};
```

### 2. BusinessDiagnosisAsset

作用：

- 把底层评分翻译成“商业体检”
- 找到当前第一性问题

```ts
type BusinessDiagnosisAsset = {
  health: {
    value: number;
    growth: number;
    replication: number;
    resilience: number;
  };
  primaryContradiction: string;
  strengths: string[];
  weaknesses: string[];
  evidence: string[];
};
```

### 3. CouncilReportAsset

作用：

- 让不同顾问视角对同一个项目产生分歧
- 把分歧压成阶段性共识

```ts
type CouncilReportAsset = {
  experts: Array<{
    role: "architect" | "growth" | "finance" | "operations";
    judgment: string;
    focus: string;
    challenge: string;
  }>;
  conflicts: Array<{
    topic: string;
    sideA: string;
    sideB: string;
  }>;
  consensus: string;
  unresolvedRisks: string[];
};
```

### 4. ScenarioSimulationAsset

作用：

- 不给唯一答案
- 而是比较不同路径的收益、风险和成立条件

```ts
type ScenarioSimulationAsset = {
  path: "profit_first" | "growth_first" | "brand_first";
  thesis: string;
  upside: string[];
  risks: string[];
  conditions: string[];
  recommendationScore: number;
};
```

### 5. BusinessDecisionAsset

作用：

- 记录创始人最终选择
- 让商业判断变成决策资产而不是口头建议

```ts
type BusinessDecisionAsset = {
  selectedPath: string;
  reason: string;
  rejectedPaths: string[];
  constraints: string[];
  confidence: number;
  founderConfirmation: "accepted" | "adjusted" | "reopened";
};
```

### 6. BusinessExecutionPlanAsset

作用：

- 把决策转成未来 30 / 60 / 90 天的经营动作
- 并给 `Verification` 模块一个持续回注入口

```ts
type BusinessExecutionPlanAsset = {
  next30Days: string[];
  next60Days: string[];
  next90Days: string[];
  metrics: string[];
  verificationTasks: string[];
};
```

---

## 七、五阶段主链路收口

前台用户旅程可以继续显示为：

```text
项目认识
↓
商业体检
↓
顾问委员会
↓
路径模拟
↓
决策确认
↓
行动路线
```

但 Runtime 内核统一收口为五阶段主链路：

### 1. `DISCOVERY`

目标：

- 识别当前业务处于什么阶段
- 形成 `BusinessSnapshotAsset`

后台能力映射：

- `ECC`
- 基础事实抽取
- Session 初始化

对用户的可感知语言：

> 我先理解你的生意，不急着判断。

### 2. `DIAGNOSIS`

目标：

- 完成商业体检
- 找到 `primaryContradiction`

后台能力映射：

- `Rule Engine`
- `Scoring`
- 结构化规则判断

对用户的可感知语言：

> 你的问题不是信息不够，而是要先找出当前最该解决的第一性问题。

### 3. `COUNCIL`

目标：

- 把多专家判断组织成可见分歧
- 输出 `CouncilReportAsset`

后台能力映射：

- `Benchmark`
- 专家视角
- 风险挑战
- 共识压缩

对用户的可感知语言：

> 顾问团队已经形成不同判断，现在我们要把关键取舍压出来。

### 4. `SIMULATION`

目标：

- 形成不同发展路径
- 比较收益、风险、成立条件

后台能力映射：

- `Scenario Projection`
- 策略建议
- 验证路径预估

对用户的可感知语言：

> 不是只有一个答案，而是不同路径对应不同后果。

### 5. `DECISION`

目标：

- 让创始人做选择
- 生成 `BusinessDecisionAsset + BusinessExecutionPlanAsset`

后台能力映射：

- `Decision Synthesis`
- `Verification Task Generation`

对用户的可感知语言：

> 现在不是继续分析，而是形成你的经营选择。

---

## 八、为什么仍然保留 FOLLOW_THROUGH

虽然主链路收口为五阶段，

但 Runtime 内部仍然保留：

## `FOLLOW_THROUGH`

因为没有执行反馈，M-BIZ 只是一次性咨询。

`FOLLOW_THROUGH` 的作用：

- 接收 `bizVerify`
- 更新任务状态
- 记录执行结果
- 识别是否需要重新进入 `DIAGNOSIS` / `COUNCIL`
- 更新 `BusinessMemory`

所以五阶段是主咨询链。

`FOLLOW_THROUGH` 是长期陪跑闭环。

---

## 九、四位顾问 Agent 的最终分工

M-BIZ 不应该继续暴露“能力模块”。

应该暴露“顾问团队”。

### 1. Business Architect

关注：

- 业务结构是否成立
- 收入模型是否清晰
- 核心价值是否稳定

### 2. Growth Advisor

关注：

- 当前阶段的增长节奏
- 获客模型是否可持续
- 是否应该扩张

### 3. Finance Advisor

关注：

- 现金压力
- 利润质量
- 融资与扩张时机

### 4. Operations Advisor

关注：

- 交付稳定性
- SOP 和组织能力
- 模型是否可复制

四位顾问都不直接对外暴露底层规则。

他们消费：

- `RuleJudgment`
- `DimensionScores`
- `Benchmark`
- `VerificationHistory`

然后转译成用户可感知的顾问意见。

---

## 十、现有能力如何映射到 Runtime V2

### ECC

当前角色：

- 事实抽取与认知链扫描

V2 角色：

- `DISCOVERY` 阶段的事实理解器
- 负责生成 `BusinessSnapshotAsset`

### Rule Engine

当前角色：

- 规则触发
- 风险判断

V2 角色：

- `DIAGNOSIS` 阶段的体检证据层
- 支撑“第一性问题”提炼

### Scoring

当前角色：

- 九维评分 / 各维度健康度

V2 角色：

- 诊断证据，不是前台主叙事
- 用于形成 `BusinessDiagnosisAsset.health`

### Benchmark

当前角色：

- 对比判断
- 横向挑战

V2 角色：

- `COUNCIL` 阶段的冲突来源
- 用于支撑“为什么增长顾问和运营顾问意见不同”

### Verification

当前角色：

- 验证任务回注

V2 角色：

- `DECISION -> FOLLOW_THROUGH` 的闭环连接器
- 决定哪些建议真正成立
- 决定是否把经验升级为 `BusinessMemory`

---

## 十一、当前接口与 Runtime V2 的对齐关系

基于现有工程，M-BIZ 已经有：

- `bizMeta`
- `businessContext`
- `bizChat`
- `bizVerify`
- `BizPageOutput`
- `BusinessSnapshot`

这些接口不需要推翻。

Runtime V2 要做的是重新解释它们。

### 1. `bizMeta`

当前返回：

- agent 名称
- 能力描述
- `L1-L5` 步骤

V2 建议：

- 对外仍可保留 `L1-L5`
- 但前台展示翻译为：
  - 项目认识
  - 商业体检
  - 顾问委员会
  - 路径模拟
  - 决策确认

### 2. `businessContext`

当前作用：

- 返回 `current / previous / history / pageOutput`

V2 作用：

- 作为 `BusinessMission` 当前投影读取口
- 前台继续读取它，不必立刻换 API

### 3. `bizChat`

当前作用：

- 驱动主对话和分析

V2 作用：

- 统一作为 Runtime 的阶段推进入口
- 由 Runtime 判断当前消息应该推进：
  - `DISCOVERY`
  - `DIAGNOSIS`
  - `COUNCIL`
  - `SIMULATION`
  - `DECISION`

### 4. `bizVerify`

当前作用：

- 回写验证结果

V2 作用：

- 成为 `FOLLOW_THROUGH` 的标准回注入口
- 决定 Memory 是否更新
- 决定是否重开新一轮诊断

---

## 十二、BizPageOutput 在 V2 中的重新定位

当前：

`BizPageOutput` 更像一个底层分析结果包。

V2 中它应被理解为：

## Runtime Projection Layer

```ts
type BizRuntimeProjection = {
  missionId: string;
  stage: BusinessMissionStage;
  currentLayer: string;
  summary: string;

  snapshot?: BusinessSnapshotAsset;
  diagnosis?: BusinessDiagnosisAsset;
  council?: CouncilReportAsset;
  simulations?: ScenarioSimulationAsset[];
  decision?: BusinessDecisionAsset;
  execution?: BusinessExecutionPlanAsset;

  raw: BizPageOutput;
};
```

也就是说：

- 现有 `BizPageOutput` 可以继续作为底层输出
- 前台工作台消费的是“投影后的咨询状态”
- 这样就不用让页面直接理解所有底层规则字段

---

## 十三、Business Event：Runtime 的事件层

Runtime V2 不能只靠页面状态。

必须补：

## `BusinessEvent`

```ts
type BusinessEvent =
  | "MISSION_STARTED"
  | "SNAPSHOT_CREATED"
  | "DIAGNOSIS_COMPLETED"
  | "PRIMARY_CONTRADICTION_IDENTIFIED"
  | "COUNCIL_CONVENED"
  | "CONSENSUS_REACHED"
  | "SIMULATION_GENERATED"
  | "FOUNDER_PRIORITY_RECORDED"
  | "DECISION_CONFIRMED"
  | "EXECUTION_PLAN_PUBLISHED"
  | "VERIFICATION_FEEDBACK_RECEIVED"
  | "MEMORY_UPDATED"
  | "MISSION_REOPENED";
```

这些事件的意义：

- 让 Runtime 的推进可追踪
- 让 `Decision / Memory / Cognitive Trace` 有挂点
- 让后续平台监控能看到商业咨询进展，而不只是 API 调用次数

---

## 十四、Business Memory：长期陪跑的沉淀结构

M-BIZ 的真正价值不是这次判断。

而是下次更懂这个创始人的经营方式。

所以需要：

## `BusinessMemory`

```ts
type BusinessMemory = {
  founderStyle: {
    priorityBias: Array<"profit" | "growth" | "risk_control" | "brand">;
    decisionPace: "fast" | "balanced" | "deliberate";
    expansionPreference: "conservative" | "balanced" | "aggressive";
  };

  validatedPatterns: string[];
  repeatedMistakes: string[];
  rejectedStrategies: string[];
  verifiedTruths: string[];

  nextAttention: string[];
};
```

写入来源：

- `Founder Priority Input`
- `BusinessDecisionAsset`
- `bizVerify`
- 历史 `verificationTasks`

这会让 M-BIZ 真正变成：

> 越用越懂创始人的商业顾问系统。

---

## 十五、目录结构建议

为了让 Runtime 与页面和数据契约彻底解耦，建议 M-BIZ 逐步收口到以下结构：

```text
src/server/services/business-runtime/

  index.ts
  mission.service.ts
  projection.service.ts
  memory.service.ts

  assets/
    snapshot.asset.ts
    diagnosis.asset.ts
    council.asset.ts
    simulation.asset.ts
    decision.asset.ts
    execution.asset.ts

  engines/
    discovery.engine.ts
    diagnosis.engine.ts
    council.engine.ts
    simulation.engine.ts
    decision.engine.ts
    follow-through.engine.ts

  events/
    business-events.ts
```

这不是要求立刻重构全部代码。

而是为下一阶段工程演进给出明确方向。

---

## 十六、V2 的最小工程收口策略

下一阶段不应该大拆当前 M-BIZ。

而应该按下面顺序渐进收口：

### P0：先做 Runtime 投影层

目标：

- 不改前台主要页面结构
- 不改 `bizChat / bizVerify` 入口
- 先把 `BizPageOutput -> BizRuntimeProjection` 建立起来

### P1：补 BusinessMission 与 BusinessEvent

目标：

- 能记录当前 mission 在哪个阶段
- 能追踪一次商业咨询是如何推进的

### P2：补 Founder Priority / Decision Confirmation

目标：

- 让用户真正参与商业取舍
- 把“接受 / 调整 / 重开”写成标准事件

### P3：补 BusinessMemory

目标：

- 让验证结果能沉淀为长期经营记忆
- 支撑未来跨模块联动

---

## 十七、和其它三个咨询模块的统一关系

四个模块最终都应该遵循同一套架构：

```text
Knowledge
↓
Reasoning Engine
↓
Decision Protocol
↓
Workspace
↓
Memory
```

M-BIZ 对应为：

```text
Business Knowledge
↓
ECC / Rule / Benchmark / Simulation
↓
Business Mission + Business Event + Business Decision
↓
Business Advisory Workspace
↓
Business Memory
```

所以 M-BIZ Runtime V2 的价值不只是让自己更顺。

它还会成为 MealKey 四大咨询中心的统一运行时模板之一。

---

## 十八、最终结论

M-BIZ V2 不再把自己定义为：

- 商业评分器
- 商业规则引擎
- 商业分析聊天机器人

M-BIZ V2 最终定义为：

> 一个以 Business Mission 为核心、以商业资产为输出、以创始人参与为决策节点、以验证反馈为长期闭环的 AI 商业顾问 Runtime。

这意味着：

- `ECC / Rule Engine / Scoring / Benchmark / Verification` 全部保留
- 但它们退回后台
- 前台只暴露商业咨询过程
- Runtime 只管理状态、资产、事件、记忆

---

## 十九、下一步

下一步不该继续泛化讨论。

应该直接进入：

# 《M-BIZ Runtime Data Contract V1》

重点解决四件事：

1. `BusinessMission` 的正式数据结构
2. `BusinessAsset` 的统一 schema
3. `BusinessEvent` 的状态变化契约
4. `businessContext / bizChat / bizVerify` 如何映射到新的 Runtime Projection

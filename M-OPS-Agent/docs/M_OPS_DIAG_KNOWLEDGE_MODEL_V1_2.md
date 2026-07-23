# M-OPS-Agent V1.2 · 诊断知识模型与数据结构设计

> **版本：** V1.2  
> **状态：** Draft Freeze  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **定位：** Restaurant Diagnosis Knowledge Model  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_DATA_INTELLIGENCE_V1_1.md` · `M_OPS_DIAG_REASONING_ENGINE_V1_1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1_1_DETAIL.md`

---

## 0. 一句话

> V1.1 解决“怎么诊断”；V1.2 解决“诊断产生的数据如何沉淀，让系统越来越懂一家餐厅”。

这是 M-OPS 从工具升级成平台能力的关键一层。

---

## 1. 核心设计原则（冻结）

### 1.1 不存答案，存认知过程

普通系统：

```text
问题
  ↓
答案
```

M-OPS：

```text
事实
  ↓
观察
  ↓
模式
  ↓
假设
  ↓
验证
  ↓
结果
  ↓
学习
```

原因：

- 餐饮经营不是一次性知识问答
- 诊断是持续判断与修正过程
- 同一家店在不同阶段会重复出现相似问题，但原因可能不同

### 1.2 Evidence 是第一公民

任何诊断必须回答：

```text
你为什么这么判断？
```

因此所有高层对象都必须能追溯回 `Evidence`。

### 1.3 不直接存终局结论

不能把“建议提高服务质量”当长期资产。

应存：

- 触发它的证据
- 它属于什么模式
- 当时的假设是什么
- 最终行动带来了什么结果

### 1.4 诊断知识必须可复用

这套模型不能只服务 `M-OPS`。

未来要允许：

- 招聘诊断 Agent
- 菜单优化 Agent
- 选址 Agent
- 供应链 Agent

共同复用这套 `Evidence -> Diagnosis -> Learning` 协议。

---

## 2. 总体知识图谱

```text
Restaurant Diagnosis Knowledge Graph

Business Identity
      ↓
Restaurant Context
      ↓
Evidence
      ↓
Observation
      ↓
Pattern
      ↓
Diagnosis Case
      ↓
Signal
      ↓
Decision
      ↓
Outcome
      ↓
Learning
```

### 2.1 目标

把一次诊断从“运行结果”升级成“可积累的经营认知资产”。

### 2.2 边界

V1.2 关注：

- 对象模型
- 生命周期
- 关系结构
- 对外协议

V1.2 不负责：

- 具体数据库选型
- UI 页面细节
- 执行系统设计

---

## 3. RestaurantContext

`RestaurantContext` 是所有诊断对象的主体环境。

来源：

- Business Identity
- Restaurant Brain

```typescript
type RestaurantContext = {
  restaurantId: string;
  brand?: string;
  category?: string;
  city?: string;
  location?: string;
  priceRange?: string;
  storeStage?: string;
  businessModel?: string;
  operatingModel?: string;
};
```

### 3.1 作用

- 给 `Evidence` 提供主体锚点
- 给 `Pattern` 提供语境
- 给 `Hypothesis` 提供现实边界
- 给 `Signal` 提供门店归属

### 3.2 示例

```text
等里长沙
品类：炭火湘菜
城市：长沙
客单：80
阶段：单店增长期
```

---

## 4. Evidence Model

这是整个知识模型的核心。

### 4.1 基础结构

```typescript
type Evidence = {
  id: string;
  source: EvidenceSource;
  type: string;
  content: string;
  capturedAt: string;
  reliability: number;
  scope?: string;
  metadata?: Record<string, unknown>;
};
```

### 4.2 Source 类型（冻结）

```typescript
enum EvidenceSource {
  OWNER_INPUT,
  POS,
  REVIEW,
  DIANPING,
  XHS,
  DOUYIN,
  MAP,
  COMPETITOR,
  INDUSTRY_REPORT,
}
```

### 4.3 必备字段语义

- `source`：来源平台或来源类型
- `type`：证据类型，如评论、经营事实、竞品变化、地图观察
- `content`：原始事实或标准化描述
- `capturedAt`：采集时间
- `reliability`：可信度或来源可靠性
- `scope`：证据作用范围，如门店、商圈、用户群、时段
- `metadata`：原始链接、主题、情绪、关键词等附加结构

### 4.4 示例

```text
source: DIANPING
content: 等位40分钟，服务员少
capturedAt: 2026-07-18
reliability: 0.75
```

### 4.5 强规则

- 所有高层对象都必须通过 `evidenceIds` 或 `evidenceRefs` 关联回证据
- 没有 `capturedAt` 的证据默认降权
- 没有来源的内容不能进入强推理主链

---

## 5. Observation Model

`Observation` 是从证据到判断之间的第一层抽象。

Evidence 不能直接变成结论，必须先形成观察。

```typescript
type Observation = {
  id: string;
  evidenceIds: string[];
  statement: string;
  dimension: string;
  trend?: "up" | "down" | "flat";
  confidence: number;
};
```

### 5.1 作用

- 把离散证据汇总成清晰变化描述
- 保留“发生了什么”的层级，不越权解释原因

### 5.2 示例

```text
近30天：
等待相关评价增加60%
主要集中周末晚餐
```

### 5.3 规则

- `Observation` 必须来源于 >= 1 条 Evidence
- `Observation` 允许是中性描述
- `Observation` 不允许包含拍板式建议

---

## 6. Pattern Model

`Pattern` 是 M-OPS 的智能核心，它代表从多个事实中发现结构。

```typescript
type Pattern = {
  id: string;
  name: string;
  category: string;
  signals: string[];
  occurrence?: number;
  trend?: "up" | "down" | "flat";
  confidence: number;
};
```

### 6.1 示例

```text
Pattern:
周末峰值承载不足
```

关联信号：

```text
等待增加
服务差评
翻台下降
```

### 6.2 作用

- 把多个 Observation 变成经营结构
- 让相似问题可以跨时间复用
- 为 Hypothesis 提供结构基础

### 6.3 规则

- Pattern 必须引用 Observation 或 Evidence
- Pattern 可以被多个 Diagnosis Case 复用
- Pattern 是可沉淀资产，不是一次性文本摘要

---

## 7. Diagnosis Case

`DiagnosisCase` 是一次完整诊断的生命周期对象。

它类似 `Decision Case`，但不是决策对象。

```typescript
type DiagnosisCase = {
  id: string;
  restaurantId: string;
  trigger: string;
  status: DiagnosisCaseStatus;
  observations: string[];
  patterns: string[];
  hypothesis: string[];
  impactScore?: number;
  createdAt: string;
};
```

### 7.1 状态（冻结）

```text
DISCOVERED
  ↓
ANALYZING
  ↓
VALIDATED
  ↓
TRANSFERRED
  ↓
LEARNED
```

### 7.2 状态语义

- `DISCOVERED`：问题被发现，但尚未形成完整判断
- `ANALYZING`：Observation / Pattern / Hypothesis 生成中
- `VALIDATED`：假设已有足够支持，适合升格为经营问题
- `TRANSFERRED`：已转交至 MealKey 决策层
- `LEARNED`：后续结果已回流，形成学习资产

### 7.3 作用

- 承接一次问题的完整诊断过程
- 让 Signal 背后有案例容器
- 支持后续回看“当时为什么这么判断”

---

## 8. Hypothesis Model

AI 不能直接说原因，必须把“原因”管理成假设对象。

```typescript
type Hypothesis = {
  statement: string;
  probability: number;
  supportingEvidence: string[];
  contradictEvidence?: string[];
  validationPlan?: string[];
};
```

### 8.1 示例

问题：出菜慢

假设 A：

```text
厨房产能不足
概率：65%
支持：差评集中高峰
反证：工作日正常
验证：观察周末厨房动线
```

### 8.2 作用

- 把 AI 从“聊天”拉到“咨询”
- 允许多个原因竞争
- 把验证过程正式纳入知识模型

### 8.3 规则

- 假设必须可被验证
- 必须有支持证据
- 可存在反证据
- 证据不足时允许低概率备选假设

---

## 9. BusinessSignal Model

`BusinessSignal` 是连接 MealKey 的最终经营信号对象。

```typescript
type BusinessSignal = {
  id: string;
  title: string;
  category: string;
  severity: string;
  impactScore: number;
  evidenceRefs: string[];
  diagnosisCaseId: string;
  recommendedDecisionTopic?: string;
};
```

### 9.1 示例

```text
周末高峰等待时间正在影响复购
严重度：High
建议进入：服务流程优化决策
```

### 9.2 作用

- 进入今日驾驶舱
- 进入 Decision Room 入口
- 成为经营优先级排序对象

### 9.3 规则

- 每个 Signal 必须挂在 `DiagnosisCase` 之下
- 每个 Signal 必须可追溯到 `Evidence`
- 每个 Signal 必须能给出一个决策议题，而不是终局方案

---

## 10. Outcome 与 Learning

这是长期壁垒的来源。

一次诊断结束后，不只保存“说过什么”，还要保存：

```text
预测
  ↓
行动
  ↓
结果
  ↓
学习
```

### 10.1 DiagnosisLearning

```typescript
type DiagnosisLearning = {
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  lesson?: string;
};
```

### 10.2 示例

```text
预测：增加一名前厅人员
结果：等待下降35%
学习：该店高峰瓶颈主要来自前厅
```

### 10.3 价值

随着时间推移，系统会形成：

```text
这家店遇到类似问题
大概率是什么原因
什么动作通常有效
```

这就是长期经营知识图谱。

---

## 11. 外部信息采集模型

建立：

`Restaurant External Intelligence`

```text
外部世界
  ↓
大众点评 / 小红书 / 抖音 / 地图 / 竞品
  ↓
主体绑定
  ↓
Evidence
  ↓
Diagnosis
```

### 11.1 ExternalScanJob

```typescript
type ExternalScanJob = {
  restaurantId: string;
  sources: string[];
  frequency: "daily" | "weekly" | "monthly";
  lastRun?: string;
  newEvidenceCount?: number;
};
```

### 11.2 示例

```text
今日发现：
- 大众点评新增15条评价
- 小红书新增8篇内容
- 附近新增2家竞品
```

### 11.3 作用

- 为 Daily Scan 提供节律化采集入口
- 把“采集任务”本身也纳入系统可追踪对象

---

## 12. 首次价值展示对象

用户第一次进入，不应该看到“请输入信息”，而应进入：

```text
60秒建立餐厅经营画像
```

流程：

```text
用户输入：
店名
地址
品类
  ↓
系统采集：
大众点评
小红书
抖音
地图
  ↓
生成：
我的餐厅经营画像
```

### 12.1 首次对象

建议至少生成：

- `RestaurantContext`
- `Initial Evidence Set`
- `Observation[]`
- `Customer Perception Summary`
- `Competition Snapshot`

### 12.2 用户确认点

```text
这些信息正确吗？
[修改]
[确认建立经营档案]
```

用户感知应是：

> 这不是聊天机器人，它真的了解我的店。

---

## 13. 第三方 Agent 接入协议

由于 Agent 已经外接化，M-OPS 不能私有化这套知识模型。

统一：

```text
Agent Protocol

Input:
ContextPackage

Output:
IngressPackage
```

任何第三方 Agent 都可读取：

- Business Identity
- Evidence
- Brain Context

并输出：

- Signal
- Insight
- Work
- Gap

### 13.1 复用原则

- 第三方 Agent 可消费 `Evidence / Pattern / DiagnosisCase`
- 第三方 Agent 不得绕过证据链直接输出强结论
- 第三方 Agent 的输出也必须接入统一 Ingress 协议

---

## 14. M-OPS V1 能力边界（冻结）

### 做

- 收集经营信息
- 感知顾客变化
- 发现经营异常
- 形成诊断
- 输出 Signal
- 沉淀经营知识

### 不做

- 替老板决策
- 自动修改经营策略
- 生成完整商业方案
- 取代 Decision Intelligence

---

## 15. 在 MealKey 中的位置

```text
MealKey OS
    ↑
Decision Intelligence
    ↑
Business Signal
    ↑
M-OPS Diagnosis Agent
    ↑
External Intelligence + Brain + POS
```

到 V1.2 为止，M-OPS 已经形成：

- 一个独立 Agent
- 一套诊断知识模型
- 一套外部数据采集能力
- 一套连接经营大脑的协议

---

## 16. 下一步

V1.2 解决的是“知识模型与结构”。

下一刀建议进入：

`M-OPS-Agent V1.2 Diagnosis Persistence / Lifecycle Design`

重点可继续细化：

1. `Evidence` 的持久化与索引策略
2. `Pattern` 的复用与版本化
3. `DiagnosisCase` 的生命周期事件
4. `Signal` 与 `Decision` 的关联协议
5. `Learning` 如何反哺下一轮推理

---

## 17. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.2 Draft Freeze | 2026-07-21 | 冻结诊断知识图谱、核心对象模型、DiagnosisCase 生命周期、Learning 结构、第三方 Agent 复用边界 |

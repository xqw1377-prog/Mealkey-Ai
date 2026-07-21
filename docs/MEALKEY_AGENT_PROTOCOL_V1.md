# MealKey Agent Protocol V1（餐启 Agent 协议 · 冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **产品一句：** 定义「一个餐饮经营能力如何接入经营大脑」——不是 Agent 接数据库，而是 Agent 接协议。  
> **配套：** `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` · `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` · `FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `M_OPS_DIAG_AGENT_V1.md`  
> **代码落点（演进）：** `@mealkey/tool-agent-kit`（L3 运行面）· `@mealkey/agent-sdk`（协议类型扩展）· Host Bridge（`apps/web`）  
> **冲突裁决：** 生态接入规则以本文为准；L3 四件套/四 Ports 以 Tool Agent Framework 为准；战略边界以 Ecosystem Map / AUTHORITY 为准  

---

## 0. 为什么必须有协议（冻结）

三壁垒合一，MealKey 才具备「餐饮 AI 操作系统」基础：

| 壁垒 | 资产 |
|------|------|
| **数据壁垒** | Restaurant Brain |
| **认知壁垒** | Decision Intelligence |
| **生态壁垒** | **Agent Protocol（本文）** |

类比：

| 平台 | 接入物 |
|------|--------|
| iOS | App 接口 |
| 微信 | 小程序接口 |
| OpenAI | GPTs / Tools |
| **MealKey** | **餐饮经营能力 → 经营大脑** |

`m-ops-diag`（餐厅经营诊断）= **验证本协议的第一个垂直 Agent**。

---

## 1. 核心原则（冻结）

### 1.1 Agent 不接系统，Agent 接协议

```text
❌ 第三方 Agent → 调 Prisma / 读库 / 写 Brain 表
✅ 第三方 Agent → MealKey Agent Protocol → Runtime → Identity/Brain/Memory/Decision/Execution
```

错误路径导致：数据泄露 · 系统耦合 · 质量不可控 · 无法商业化。

### 1.2 铁律五条

1. **零直连数据面**：Agent 永不持有 DB 连接串；只消费 Host 下发的 `MKContext` 投影。  
2. **声明式能力**：未在 Manifest 声明的 capability / port / permission → Runtime 拒收。  
3. **合法出口唯一**：Signal · Insight · Work · Gap（对齐 Tool Agent Framework Ports）。  
4. **永不升格 L1**：第三方与内置 L3 同等，禁止注册第五顾问席 / 战略终局。  
5. **质量可审计**：无证据链 / 无置信度 / 私有 JSON 冒充 Insight → 不得上架或不得进宿主。  

### 1.3 与现有文档关系

```text
Agent Protocol V1（本文）     ← 生态/OS 接入契约（含第三方）
        ↓ 具体化
Tool Agent Framework V1       ← 内置 L3 工程四件套（当前主实现）
        ↓ 样板
m-ops-diag                    ← 第一个合规垂直 Agent
```

内置 Agent 必须满足本文；第三方 Agent **额外**满足生命周期、Sandbox、Marketplace、远程调用规范。

---

## 2. Agent Manifest 规范（冻结）

每个 Agent 必须提交可机读 Manifest（身份证）。

### 2.1 规范形状

```typescript
AgentManifestV1 {
  id: string                    // 全局唯一：m-<domain> 或 partner.<org>.<slug>
  name: string                  // 产品短名
  version: string               // semver
  category: AgentCategoryV1     // operation | product | competition | brand | growth | finance | site | other
  provider: "mealkey" | "partner" | "enterprise"
  runtimeMode: "inprocess" | "cloud_https" | "enterprise_local"
  stage: "idea" | "pilot" | "sandbox" | "live" | "deprecated"

  capabilities: string[]        // 例 ["diagnosis","insight"] — 能力标签，非出口
  ports: Array<"signal"|"insight"|"work"|"gap">

  input: string[]               // 声明消费的 Context 切片键
  output: string[]              // 声明产出类型键

  permissions: DataPermissionV1[]
  invokePolicy: {
    requiresDecisionAuth: boolean
    requiresBossConfirm: boolean
    billable: boolean
  }

  schemas: {
    inputRef: string            // 契约 ID
    outputRef: string
  }

  quality: {
    minEvidenceSteps: number    // 进首页 Signal 默认 ≥2
    allowsInferenceOnly: false  // V1 必须 false
  }

  marketplace?: {
    priceMonthlyFen?: number
    description?: string
  }
}
```

### 2.2 与代码对齐

| 协议字段 | 当前代码 |
|----------|----------|
| Manifest 核心 | `ToolAgentManifest`（`@mealkey/tool-agent-kit`） |
| 扩展：provider / runtimeMode / marketplace / DataPermission 细粒度 | **V1 冻结语义**；落点演进 `@mealkey/agent-sdk` + kit 扩展 |
| 样板 | `packages/m-ops-diag/src/manifest.ts`（`m-ops-diag`） |

示例（经营诊断 · 语义）：

```typescript
{
  id: "m-ops-diag",
  name: "餐启经营诊断",
  version: "1.0.0",
  category: "operation",
  provider: "mealkey",
  runtimeMode: "inprocess",
  capabilities: ["diagnosis", "insight"],
  ports: ["signal", "insight", "gap"],
  input: ["RestaurantIdentity", "RestaurantFacts", "ExternalEvidence"],
  output: ["BusinessSignal", "MKInsight", "Gap"],
  permissions: ["Restaurant.Basic", "Restaurant.Reviews", "Restaurant.Operation"],
  // …invokePolicy / schemas / quality
}
```

系统据此知道：**能干什么、不能干什么、能看见什么、能写出什么。**

---

## 3. 统一输入 · MKContext（冻结）

第三方 **不得** 自定义宿主数据格式。只接受 Host 组装的投影：

```typescript
MKContextV1 {
  user: { id: string; role: "boss" | "staff" | "system" }

  businessIdentity: {
    brand?: string
    stores?: Array<{ id?: string; name?: string; city?: string; district?: string }>
    region?: string
    category?: string
  }

  restaurantBrain: {
    facts: unknown[]            // 已授权切片，非全库 dump
    history?: unknown[]
    dna?: unknown               // Decision DNA 等投影
  }

  externalEvidence: {
    reviews?: unknown[]
    market?: unknown[]
    competitors?: unknown[]
  }

  decisionContext?: {
    currentQuestion?: string
    caseId?: string
  }

  /** Host 注入的调用元数据 */
  invoke: {
    purpose: "radar" | "council" | "execution" | "standalone"
    horizon?: "today" | "7d" | "30d"
    projectId?: string
  }
}
```

### 3.1 硬规则

1. Agent **只读** Context；写回仅经合法 Port → Host Bridge。  
2. Context 按 Permission **最小切片**下发；未授权字段不出现。  
3. 现有 `AgentContext`（`agent-sdk`）与各 Bridge 组装物，演进对齐 `MKContextV1`；V1 允许适配层改名，**语义不得绕过**。  
4. `m-ops-diag` 的 `RestaurantDiagnosisRequest` = MKContext 在诊断场景下的 **专用投影**（合法特化，仍由 Host 填充）。

---

## 4. 统一输出协议（冻结）

所有 Agent 输出必须可映射到下列标准物之一（可多选，须 Manifest 声明）。

### 4.1 BusinessSignal（→ 今日 / 雷达）

```typescript
BusinessSignalPortV1 {
  type: string                  // 对齐既有 Signal type 枚举
  title: string
  observation: string
  pattern?: string
  meaning?: string
  impact: string                // 影响描述；严重度另字段
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  confidence: number            // 0–1
  evidence: Array<{ source: string; fact: string }>
  evidenceChain?: Array<{ kind: "internal_fact"|"external_intel"|"inference"; claim: string }>
  watchHint?: string            // 关注建议；禁拍板句
}
```

对齐：`BUSINESS_SIGNAL_ENGINE_*` · `DiagnosisSignal` · Tool Port `signal`。

### 4.2 MKInsight（→ 决策室 / Council）

```typescript
MKInsightPortV1 {
  topic: string
  finding: string
  reasoning?: string
  evidence: Array<{ claim: string; source?: string }>
  impact?: string
  confidence: number
  recommendation?: string       // V1：仅「可讨论方向」；禁止战略终局 / 批准句
  unknowns?: string[]
}
```

对齐：VerticalInsight / `toVerticalMkInsights` · Tool Port `insight`。  
**禁止**私有 Report 直进七常委。

### 4.3 Work（→ Execution，须授权）

结构化执行物（菜单草案、SOP 清单等）；`requiresDecisionAuth` 常为 true。

### 4.4 Gap（→ 采集 / 诚实空态）

```typescript
GapPortV1 { field: string; reason: string; severity: "low"|"medium"|"high" }
```

无证据时必须能出 Gap，禁止装懂。

### 4.5 Report（可选 · 降级）

长报告 **不是** 一等公民。若 Manifest 声明 `report` capability：

- 仅作附件 / 导出  
- **不得**单独驱动今日主位或拍板  
- 进宿主前须同时带 Signal 或 Insight 或 Gap  

`m-ops-diag` V1：**不**以 Report 为合法主出口。

---

## 5. Permission 规范（冻结）

### 5.1 Data Permission 声明

Agent 必须声明最小读集。示例枚举（V1）：

| Permission | 含义 |
|------------|------|
| `Restaurant.Basic` | 品牌/门店/区位/品类 Identity |
| `Restaurant.Facts` | 经营事实最小集 |
| `Restaurant.Reviews` | 消费者评价证据 |
| `Restaurant.Operation` | 运营相关外感/事实切片 |
| `Restaurant.Market` | 竞争/商圈证据 |
| `Brain.DNA` | Decision DNA 投影（敏感，默认需审核） |
| `Finance.Summary` | 汇总经营财务（非银行明细） |

**默认拒绝（V1 第三方不可申请或极高门槛）：**

| 拒绝项 | 原因 |
|--------|------|
| `Founder.Personal` | 老板个人隐私 |
| `Finance.Bank` | 银行/支付明细 |
| `Org.HR.PII` | 员工隐私 |
| `Raw.Database` | 任何直连 |

### 5.2 与 ToolPermission 映射

细粒度 `Restaurant.*` → Host 映射到现有 `READ_BRAIN_SLICE` / `READ_RIP` / `READ_EVIDENCE` 等执行权。  
写出侧仅：`EMIT_SIGNAL` · `EMIT_INSIGHT` · `EMIT_WORK`；`WRITE_MEMORY` **仅 Host Bridge**。

---

## 6. Runtime 调用规范（冻结）

### 6.1 调用路径

```text
Host.invoke({
  agentId, purpose, projectId,
  auth?,                 // decisionId / executionGrantId
}) 
  → 鉴权（Permission + invokePolicy）
  → 组装 MKContext 切片
  → 按 runtimeMode 调度 Engine
  → 校验输出 Ports / Quality
  → 投影到 Radar / Insight Adapter / Execution / Gap UI
  → 审计日志 +（可选）计费
```

Engine **零 Prisma / 零直写 Brain**。

### 6.2 三种运行模式

| 模式 | 谁开发 | 形态 |
|------|--------|------|
| **inprocess** | MealKey 内置 | Package 进程内调用（当前 `m-ops-diag`） |
| **cloud_https** | 第三方云 | Runtime ↔ Partner Agent Server（HTTPS + 签名） |
| **enterprise_local** | 连锁企业 | Enterprise Agent Runtime + 私有数据；经协议回传 Ports |

V1 工程优先打穿 **inprocess**；cloud_https / enterprise_local 冻结接口语义，实现可后置。

### 6.3 远程调用最低要求（cloud_https）

1. mTLS 或 HMAC 请求签名  
2. Context 仅含已授权切片；响应仅 Ports JSON  
3. 超时 / 重试 / 熔断由 Host 控制  
4. Partner **不得**回调 MealKey 内部私有 API 读库  

---

## 7. Quality 评分规范（冻结）

上架与运行时双重门禁。

### 7.1 运行时拒收

| 检查 | 失败 |
|------|------|
| Port 未在 Manifest 声明 | 丢弃该字段 |
| Signal 无 evidence 且要上今日主位 | 拒收或降为 watch |
| 纯 inference 链 | 拒收（`allowsInferenceOnly=false`） |
| 含拍板句 / MKDecision | 拒收 |
| 数字无源 | 删数字或拒收 |
| confidence 缺失 | 默认 0.3 且不上主位 |

对齐：`EVIDENCE_CHAIN_PROTOCOL_V1` · 诊断模型闸门 G1–G8。

### 7.2 Quality Score（上架 / Sandbox）

```text
QualityScore =
  证据完整度 ×0.35
+ 锚点相关性（是否像「这家店」）×0.25
+ 可操作性（Signal 能否进今日/决策室）×0.20
+ 稳定性（同输入多次输出一致档）×0.10
+ 安全合规（无越权/无禁词战略）×0.10
```

阈值（V1 建议）：Sandbox 通过 ≥ 0.70；Live 上架 ≥ 0.80；抽检失败可降级 `pilot` / 下架。

---

## 8. 生命周期与 Marketplace（冻结）

### 8.1 接入四步

```text
1. 注册  → 提交 AgentManifestV1
2. 审核  → 输入/输出/权限/质量标准
3. Sandbox → 标准模拟餐厅（例：长沙湘菜馆 A · 合成评价与事实）跑批
4. 发布  → MealKey Agent Store · 用户安装启用
```

### 8.2 Agent Store（产品语义）

- 用户按门店/项目 **安装** Agent（启用 ports 消费）  
- 未安装不得静默调用第三方  
- 内置 `m-ops-diag` 可作为系统预装（仍走同一 Protocol）

### 8.3 商业模式（平台层 · 冻结方向）

| 收入 | 说明 |
|------|------|
| Agent 交易抽佣 | 例 ¥199/月第三方诊断，平台抽成比例商务定，协议预留 `marketplace.priceMonthlyFen` |
| 数据能力计费 | M-INTEL / Brain / Evidence 按调用 |
| 企业版 | 集团自建 Agent（enterprise_local）接入费 / 席位费 |

协议 **不**冻结具体价格数字；冻结 **计费钩子**（`invokePolicy.billable` + Host 计量）。

---

## 9. 对现有架构的影响（冻结）

### 9.1 已有（保持）

```text
tool-agent-kit · agent-sdk · MKInsight Adapter
Business Signal · Memory / Brain · Decision / Execution
```

### 9.2 协议层增量（演进清单，非一次做完）

```text
packages/agent-sdk/src/protocol/   # 或等价路径
  manifest.ts          # AgentManifestV1
  mk-context.ts        # MKContextV1
  permission.ts        # DataPermissionV1
  ports.ts             # Signal/Insight/Work/Gap 校验
  quality.ts           # QualityScore
  marketplace.ts       # 上架元数据（可后置）

packages/tool-agent-kit/
  # 扩展 Manifest 可选字段；保持四 Ports 不变

apps/web/.../tool-agents/invoke.ts
  # 鉴权 · Context 切片 · 审计 · 计费钩子
```

### 9.3 MVP 闸门

飞轮未验证前：**协议可冻结、类型可落、样板可加深**；  
批量第三方上架 / Store 商业化 **仍服从** `MEALKEY_CORE_PRODUCT_LOOP_V1` 停扩闸门。

---

## 10. 合规样板：m-ops-diag（冻结）

| 协议项 | m-ops-diag |
|--------|------------|
| id | `m-ops-diag` |
| provider | mealkey |
| runtimeMode | inprocess |
| ports | signal · insight · gap |
| input 投影 | `RestaurantDiagnosisRequest` |
| output | `DiagnosisSignal` / `DiagnosisInsight` / gaps |
| permissions | Basic · Reviews · Operation（经 Brain/RIP/Evidence） |
| 不做 | Report 主出口 · 拍板 · 假评分 · 直连 DB |

后续第三方诊断类 Agent 必须达到 **同等 Port 纪律**，方可进 Store。

---

## 11. 验收标准（冻结）

1. 任意 Agent 无法在无 Manifest 情况下被 Host 调用。  
2. 无 DB 凭证出现在 Agent 进程配置中。  
3. 非法 Port / 拍板句被 Runtime 拒收。  
4. 同 MKContext 切片下，样板 Agent 输出可进今日或决策室适配器。  
5. Permission 未声明的字段不出现在 Context。  

---

## 12. 下一步（冻结）

1. **工程：** 在 `agent-sdk` / `tool-agent-kit` 落下 `AgentManifestV1` · `MKContextV1` · Port 校验（先类型+单测）。  
2. **样板：** `m-ops-diag` 标明 Protocol Compliance。  
3. **并行产品刀：** 经营诊断 AI 推理架构（模型分工与稳定性）——协议解决「怎么接入」，推理架构解决「怎么判得稳」。  
4. Store / 远程 HTTPS：**语义已冻，实现后置**。  

---

## 13. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 Protocol Freeze | 2026-07-21 | Manifest · MKContext · Ports · Permission · Runtime 三模式 · Quality · Lifecycle/Store · 与 Tool Framework / m-ops-diag 对齐 |

# MealKey Agent 外接技术接口规则 V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **原则：** `MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md`  
> **平台：** `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md`（V1.1：四基建 · Runtime · Context Manager · Orchestra）  
> **协议：** `MEALKEY_AGENT_PROTOCOL_V1.md`  
> **一句话：** **MealKey 仓库不再新增任何 Agent；一切新能力仅以外接 Agent 经本接口接入。**  

---

## 0. 硬闸门（冻结）

| 规则 | 含义 |
|------|------|
| **禁增** | 禁止在 `mealkey-agent` / Core monorepo 新增 Agent 包、`tool-agents/<new>`、垂直 Engine、业务 Manifest |
| **外接唯一** | 新 Agent = 独立仓 + 独立部署 + 只调本接口 |
| **存量过渡** | 仅既有 `packages/m-ops-diag` 可维持至迁出；**不得**再加兄弟 Agent |
| **Core 只做 OS** | Identity · Brain · DIE · Council · M-EXEC · Gateway · 今日/决策室宿主 |
| **UI 规范外置** | Agent 的页面与视觉交互框架见 `MEALKEY_AGENT_UI_FRAMEWORK_V1.md`；**实现不在 MealKey 仓** |

违反 = 架构违规，不得合并。

---

## 1. 接入总览

```text
外接 Agent（独立产品）
        │
        │  HTTPS + 签名
        ▼
   Agent Gateway  ←── MealKey 唯一入口
        │
        ├── Context API      （读：租用 Brain 切片）
        ├── Ingress API      （写：Signal / Insight / Work / Gap / Learning）
        ├── Session / OAuth  （用户委托）
        └── Meter / Audit
```

**禁止：** Agent 持有 Prisma URL、直连 Brain 表、直写 Memory、私调内部 tRPC。

---

## 2. 认证与会话

### 2.1 Agent 身份

每个外接 Agent 由平台签发：

| 凭证 | 用途 |
|------|------|
| `agent_id` | 全局 ID（`partner.<org>.<slug>` 或官方 `m-*` 外置后同形） |
| `client_secret` 或 mTLS 证书 | 请求签名 |
| `manifest_version` | 钉版本调用 |

### 2.2 用户委托

用户在 Agent UI 登录或「用 MealKey 账号授权」后，Agent 持有：

```text
Authorization: Bearer <user_access_token>
X-Agent-Id: <agent_id>
X-Timestamp: <unix_ms>
X-Signature: <hmac_sha256 hex>
```

签名串（V1）：

```text
{method}\n{path}\n{timestamp}\n{sha256(body)}\n{agent_id}
```

密钥 = `client_secret`。时钟偏差允许 ±5 分钟。

### 2.3 安装门禁

未在能力市场 **安装/授权** 到该 `restaurantId`（或 project）的 Agent → Gateway **401/403**，不得静默读 Context。

---

## 3. Context API（只读）

### 3.1 拉取餐厅上下文

```http
GET /v1/gateway/context/restaurant/{restaurantId}?scope=basic,facts,review,operation,market
```

| scope | 内容 |
|-------|------|
| `basic` | 品牌/店名/城市/品类/区位 |
| `facts` | 经营事实最小集（区间级） |
| `review` | 消费者评价证据切片 |
| `operation` | 运营相关外感/事实 |
| `market` | 竞争/商圈证据 |
| `dna` | Decision DNA（高门槛，须 Manifest 声明） |

### 3.2 响应信封

```typescript
ContextPackageV1 {
  restaurantId: string
  asOf: string                 // ISO
  scopesGranted: string[]
  scopesDenied: string[]       // 明示拒绝，不靠猜
  identity?: { brand?, storeName?, city?, district?, category?, priceRange? }
  facts?: Array<{ kind: string; claim: string; asOf?: string }>
  evidence?: Array<{
    id: string
    source: string
    claim: string
    sentiment?: "positive"|"neutral"|"negative"
    theme?: string
    observedAt?: string
  }>
  decisionContext?: { currentQuestion?: string; caseId?: string }
}
```

### 3.3 规则

1. 未授权 scope → 不出现在 body，并列入 `scopesDenied`  
2. 分页/条数上限由 Gateway 强制（V1 建议 evidence ≤ 200）  
3. **禁止**返回银行明细、老板个人隐私、原始 DB row  

---

## 4. Ingress API（写出 · 唯一合法出口）

### 4.1 提交 Ports 批

```http
POST /v1/gateway/ingress
Content-Type: application/json
```

```typescript
IngressBatchV1 {
  agentId: string
  restaurantId: string
  invokeId: string              // 幂等键
  horizon?: "today" | "7d" | "30d"
  items: IngressItemV1[]
}

IngressItemV1 =
  | { port: "signal"; level: 1|2|3; payload: SignalIngressV1 }
  | { port: "insight"; level: 1|2|3|4; payload: InsightIngressV1 }
  | { port: "work"; level: 5; payload: WorkIngressV1 }
  | { port: "gap"; level: 1; payload: GapIngressV1 }
  | { port: "learning"; payload: LearningEventV1 }
```

### 4.2 SignalIngressV1

```typescript
{
  type: string                  // CUSTOMER|OPERATION|COMPETITION|BRAND|MARKET|…
  title: string                 // ≤12 字建议
  severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
  observation: string
  pattern?: string
  meaning?: string              // Diagnosis
  impact: string
  confidence: number            // 0–1
  evidence: Array<{ source: string; fact: string }>
  evidenceChain?: Array<{
    kind: "internal_fact"|"external_intel"|"inference"
    claim: string
  }>
  watchHint?: string            // 禁拍板句
}
```

### 4.3 InsightIngressV1

```typescript
{
  topic: string
  finding: string
  reasoning?: string
  impact?: string
  confidence: number
  evidence: Array<{ claim: string; source?: string }>
  unknowns?: string[]
  recommendation?: string       // 仅 L3；L4 用 decisionTopic
  decisionTopic?: string        // L4：进决策室议题，非已拍板
}
```

### 4.4 WorkIngressV1 / GapIngressV1 / LearningEventV1

```typescript
WorkIngressV1 {
  title: string
  summary: string
  artifacts?: Array<{ kind: string; label: string; payload: unknown }>
  requiresDecisionId?: string   // 无授权 → 拒收
}

GapIngressV1 {
  field: string
  reason: string
  severity: "low"|"medium"|"high"
}

LearningEventV1 {
  kind: string
  summary: string
  evidenceRefs?: string[]
  // 不直写 DNA；仅投递审核队列
}
```

### 4.5 Ingress 响应

```typescript
IngressAckV1 {
  ok: boolean
  invokeId: string
  accepted: Array<{ port: string; id: string; projectedTo?: "radar"|"room"|"exec"|"gap_ui"|"learning_queue" }>
  rejected: Array<{ index: number; code: string; message: string }>
}
```

### 4.6 自动拒收码（V1）

| code | 原因 |
|------|------|
| `LEVEL_EXCEEDED` | 超过 Manifest `maxInsightLevel`（默认 3） |
| `NO_EVIDENCE` | Signal 上主位但无证据链 |
| `INFERENCE_ONLY` | 纯推理链 |
| `FORBIDDEN_DECISION` | 含拍板/MKDecision |
| `SCOPE_DENIED` | 未安装或越权 |
| `WORK_NO_AUTH` | Work 无决策授权 |
| `SCHEMA_INVALID` | 字段不合规 |

---

## 5. Manifest 注册（外接上架）

```http
POST /v1/gateway/agents/register          # 伙伴控制台 / 审核流
PUT  /v1/gateway/agents/{agentId}/manifest
```

体 = Protocol `AgentManifestV1` + `DecisionSkillPackageV1`。  
未注册 / 非 `live` → 不得调 Context/Ingress（Sandbox 用独立 base URL）。

Sandbox：

```http
POST /v1/gateway/sandbox/invoke
```

使用平台模拟餐厅夹具，不计生产计量。

---

## 6. 错误与限流

| HTTP | 含义 |
|------|------|
| 401 | 签名/Token 无效 |
| 403 | 未安装或 scope 拒绝 |
| 409 | `invokeId` 冲突（已受理） |
| 422 | Schema / Quality 拒收（见 `rejected[]`） |
| 429 | 限流 |
| 503 | Core 降级；Agent 应重试退避 |

V1 建议：每 agent×restaurant 60 rpm；Burst 可配置。

---

## 7. SDK 最小表面（外接仓依赖）

外接 Agent **只依赖** 发布的 `@mealkey/agent-sdk`（或后续 `@mealkey/protocol-client`），方法语义：

```typescript
createAgentClient({ agentId, secret, baseUrl })
client.getRestaurantContext(restaurantId, scopes[])
client.submitIngress(batch)
client.submitLearning(event)
```

**不得**依赖 `@mealkey/restaurant-brain` 内部包、`apps/web` 私有模块、Prisma Client。

---

## 8. Core 侧投影（MealKey 内只做这些）

| Ingress | Core 行为 |
|---------|-----------|
| signal | → 今日雷达 / DailyScan（有证据才主位） |
| insight level≤3 | → 可展示摘要；不自动开会 |
| insight level=4 | → VerticalInsight → 决策室（须认证） |
| work level=5 | → M-EXEC 候选（须决策授权） |
| gap | → 采集/空态提示 |
| learning | → 审核队列 → 可选写入 DNA |

MealKey **不**实现 Agent 垂直算法，**不**实现 Agent 独立前端。

---

## 9. 存量 m-ops-diag 过渡

| 允许 | 禁止 |
|------|------|
| 修 bug / 对齐本接口形状 | 在 Core 新增第二个诊断/选址/招聘 Agent |
| 逐步改为调 Gateway 等价路径 | 继续加深为「Core 内永久业务中心」 |
| 迁出到 `mealkey-agents/restaurant-diagnosis-agent` | 把新页面当 MealKey 主站新业务线堆进去 |

迁出完成前：内部调用须能映射为 §3–§4 同等语义，以便一字不改切外接。

---

## 10. 验收清单（对接方）

- [ ] 无 DB 连接串  
- [ ] 仅 Context + Ingress  
- [ ] Manifest `maxInsightLevel≤3`（未认证）  
- [ ] 每条 Signal 含 evidence  
- [ ] 安装后才能读生产 Context  
- [ ] 幂等 `invokeId`  
- [ ] UI 实现于 Agent 自有仓（见 UI Framework）  

---

## 11. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 禁 Core 新增 Agent；Context/Ingress/认证/拒收码/SDK 边界/投影规则 |

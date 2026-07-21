# MealKey Agent · 第三方可读宪法索引 V1

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **门户投影页：** `developers.mealkey.cn/docs`（见 `MEALKEY_DEVELOPER_PORTAL_V1.md`）  
> **定位：** Protocol + External Interface 的 **开发者向目录 / 对照表 / 验收清单**。  
> **硬规则：** **禁止**在本文新增或改写任何 Schema 字段语义；冲突时以权威源为准。

---

## 0. 怎么用这份索引

| 你想… | 打开 |
|-------|------|
| 懂规则（什么算合规 Agent） | `MEALKEY_AGENT_PROTOCOL_V1.md` |
| 调接口（HTTP / 签名 / 拒收码） | `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` |
| 7 天做出第一个 | `MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md` |
| 抄样板 | `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md` · 仓 `M-OPS-Agent` |
| 上架与分成（产品） | `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md` · `MEALKEY_DEVELOPER_PORTAL_V1.md` |

```text
宪法（规则）     Protocol
跑道（HTTP）     External Interface
机场（产品）     Developer Portal
样板（Demo）     M-OPS Reference
```

---

## 1. 一页总览：必须掌握的六块

| # | 主题 | 权威源 | 第三方最小动作 |
|---|------|--------|----------------|
| A | **Manifest Schema** | Protocol §2 | 提交 `AgentManifestV1`，挂 `capabilityIds`，`maxInsightLevel≤3` |
| B | **ContextPackage** | External §3 · Protocol §4 | 只读 Gateway Context；消费 `scopesGranted` / `scopesDenied` |
| C | **Ingress Contract** | External §4 · Protocol §5–7 | 只写 Ports；Signal 必有证据 |
| D | **Scope / Permission** | External §2–3 · Protocol §8 | Manifest 声明可读范围；未安装 → 401/403 |
| E | **Sandbox** | External §5 · Host §12 | 用 fixture 自测；不计生产计量 |
| F | **Version** | Protocol §13 | Protocol major 破坏性；Agent 钉 `Manifest.version` |

---

## 2. Manifest Schema 索引

**权威全文：** Protocol §2 `AgentManifestV1` · 注册 HTTP：External §5

| 字段簇 | 要点 | 上架失败常见因 |
|--------|------|----------------|
| `id` / `version` / `provider` | `partner.<org>.<slug>` 或 `m-*`；semver | id 冲突、无版本 |
| `runtimeMode` | 新第三方默认 `cloud_https` | 企图 inprocess 进 Core |
| `stage` | idea→…→live | 未 Verified 调生产 Context |
| `capabilityIds` | 必须在 Capability Registry（Protocol §3） | 自造未登记能力 |
| `ports` | 仅 `signal` \| `insight` \| `work` \| `gap` | 私造 port |
| `maxInsightLevel` | 默认 ≤3；4/5 须认证 | 未认证发 L4/L5 |
| `permissions` | 对齐 Protocol §8 可读声明 | 申请默认拒绝域 |
| `skillPackageRef` + Skill Package | Protocol §7 | 只有 Prompt 无 Skill |
| `quality` | `allowsInferenceOnly: false` | 纯推理上主位 |
| `marketplace?` | 卖点/示意价；正式 Listing 另走商城 | 无 |

**对照样板：** M-OPS `m-ops-diag` · capabilities `ops.diagnosis.*`

---

## 3. ContextPackage 索引

**权威全文：** External §3 `ContextPackageV1` · 租用模型：Protocol §4

### 3.1 HTTP

```http
GET /v1/gateway/context/restaurant/{restaurantId}?scope=basic,facts,review,operation,market
```

（SDK：`getRestaurantContext(restaurantId, scopes[])` — External §7）

### 3.2 Scope 对照（线级 ↔ 权限叙事）

| Gateway `scope` | Protocol 可读声明（约） | 内容 |
|-----------------|------------------------|------|
| `basic` | Restaurant.Basic | 品牌/店名/城市/品类/区位 |
| `facts` | Restaurant.Facts | 经营事实最小集 |
| `review` | Restaurant.Reviews | 评价证据切片 |
| `operation` | Restaurant.Operation | 运营外感/事实 |
| `market` | Restaurant.Market | 竞争/商圈 |
| `dna` | Brain.DNA | 高门槛；须 Manifest 声明 |

**默认拒绝（不可申请当默认）：** Founder.Personal · Finance.Bank · Org.HR.PII · Raw.Database（Protocol §8.2）

### 3.3 信封要点（勿改字段）

- 必看：`scopesGranted` / `scopesDenied`（拒绝明示，不靠猜）  
- 可选块：`identity` · `facts` · `evidence` · `decisionContext`  
- 禁：银行明细、老板隐私、原始 DB row  

### 3.4 与 Protocol「MKContext」关系

Protocol §4 描述 Host 投影逻辑块（user / businessIdentity / restaurantBrain 切片…）。  
**线级 JSON 以 External `ContextPackageV1` 为 SSOT**；门户教学例必须标注正式类型名。

---

## 4. Ingress Contract 索引

**权威全文：** External §4 · 分级：Protocol §6 · Skill：Protocol §7 · 证据：Protocol §5

### 4.1 HTTP

```http
POST /v1/gateway/ingress
```

幂等键：`invokeId`（409 = 已受理）

### 4.2 Ports × Level（默认第三方）

| Port | 允许 level | 投影（External §8） | 默认第三方 |
|------|------------|---------------------|------------|
| `signal` | 1–3 | 今日雷达（有证据才主位） | ✅ |
| `insight` | 1–3（4 须认证） | ≤3 摘要；4→决策室议题 | ✅≤3 |
| `gap` | 1 | 采集/空态 | ✅ |
| `work` | 5 | M-EXEC 候选 | 🔒 须决策授权 |
| `learning` | — | 审核队列，不直写 DNA | ✅ 事件 |

### 4.3 拒收码速查（External §4.6）

| code | 何时 |
|------|------|
| `LEVEL_EXCEEDED` | 超过 `maxInsightLevel` |
| `NO_EVIDENCE` | Signal 主位无证据 |
| `INFERENCE_ONLY` | 纯推理链 |
| `FORBIDDEN_DECISION` | 拍板 / MKDecision 句 |
| `SCOPE_DENIED` | 未安装或越权 |
| `WORK_NO_AUTH` | Work 无授权 |
| `SCHEMA_INVALID` | 字段不合规 |

### 4.4 合格推理链（禁止 Chatbot）

```text
Context → Evidence → Hypothesis → Challenge → Assessment → Action/Learning
         （Decision Skill，不是「问题→LLM→答案」）
```

---

## 5. Scope / 安装门禁索引

| 规则 | 权威 | 后果 |
|------|------|------|
| 未安装到 restaurant/project | External §2.3 | 401/403，不得静默读 Context |
| 未授权 scope | External §3.3 | 不进 body + 进 `scopesDenied` |
| 签名无效 / Token 无效 | External §2 · §6 | 401 |
| Agent 密钥 | `client_secret` HMAC；Sandbox 另钥 | — |

签名串 V1（勿改）：

```text
{method}\n{path}\n{timestamp}\n{sha256(body)}\n{agent_id}
```

---

## 6. Sandbox 索引

| 项 | 权威 | 说明 |
|----|------|------|
| 注册 / Manifest | External §5 | `POST …/agents/register` · `PUT …/manifest` |
| 沙箱调用 | External §5 | `POST /v1/gateway/sandbox/invoke` |
| Fixture | Host 落点 External §12 | 例 `changsha-xiangcai-a`（Onboarding） |
| 计量 | External §5 | 不计生产计量 |
| 质量阈 | Protocol §9.3 | Sandbox 建议 ≥70 才提 Live |

**最小自测路径（与 7 日上手一致）：** Hello Context → Skill → Ingress → 看 `accepted` / `rejected`。

---

## 7. Version 机制索引

| 层 | 规则（Protocol §13） |
|----|----------------------|
| Protocol | 破坏性升 **major**；V1.x 可加字段 |
| Agent | `Manifest.version` semver；Host 可钉版本 |
| Capability | Live 的 `capabilityId` 不改语义；废弃标 `deprecated` |
| 缺省 | 新字段缺省 = 最严（如 maxLevel=3） |
| Store | 批量上架服从 MVP 停扩闸门 |

线级 API 路径前缀保持 `/v1/gateway/…`，直至 External major。

---

## 8. 生命周期对照（产品 ↔ 协议）

| Developer Portal / Marketplace | Protocol `stage`（约） | Lifecycle（Platform） |
|--------------------------------|------------------------|-------------------------|
| 开发中 | idea / pilot | Draft |
| 测试中 / Sandbox | sandbox | Registered → Verified 候选 |
| 审核中 | sandbox | Verified 流程中 |
| 已发布 | live | Published → Running |
| 下架 | deprecated | Deprecated |

详情：Portal §7 · Marketplace PRD · Protocol §10 · Platform Architecture Lifecycle。

---

## 9. HTTP / SDK 速查卡

| 动作 | 方法 | SDK |
|------|------|-----|
| 读 Context | `GET /v1/gateway/context/restaurant/{id}` | `getRestaurantContext` |
| 写 Ingress | `POST /v1/gateway/ingress` | `submitIngress` |
| Learning | （Ingress `learning` 项或 SDK `submitLearning`） | `submitLearning` |
| 注册 Agent | `POST /v1/gateway/agents/register` | 控制台 |
| 更新 Manifest | `PUT /v1/gateway/agents/{id}/manifest` | 控制台 |
| Sandbox | `POST /v1/gateway/sandbox/invoke` | sandbox helpers |

**禁止依赖：** `@mealkey/restaurant-brain` 内部包 · `apps/web` 私有模块 · Prisma Client（External §7）。

**Host 落点：** `apps/web` → `/api/v1/gateway/*`（External §12）；SDK `baseUrl` = `{origin}/api`，签名 path 仍为 `/v1/gateway/...`。

---

## 10. 第三方提审验收清单（合并版）

复制勾选；权威细节仍以 Protocol §15 · External §10 · Onboarding Day7 为准。

### 10.1 边界

- [ ] 无 DB / Prisma 连接串  
- [ ] 不依赖 Core 内部包  
- [ ] UI 在自有仓（UI Framework）  
- [ ] 实现为 `cloud_https`（或 enterprise_local），不进 Core monorepo  

### 10.2 Manifest / Skill

- [ ] 完整 `AgentManifestV1`  
- [ ] `capabilityIds` 均在 Registry  
- [ ] `DecisionSkillPackageV1` 齐备（非仅 Prompt）  
- [ ] `maxInsightLevel ≤ 3`（未认证）  
- [ ] `ports` ⊆ 合法集合  

### 10.3 Context / Scope

- [ ] 仅经 Gateway 读 Context  
- [ ] 正确处理 `scopesDenied`  
- [ ] 未安装门店不读生产 Context  
- [ ] 签名与时钟偏差符合 V1  

### 10.4 Ingress / 质量

- [ ] 每条主位 Signal 含 evidence / evidenceChain  
- [ ] 无拍板句 / 无伪造 MKDecision  
- [ ] 无证据走 Gap，不装懂  
- [ ] 幂等 `invokeId`  
- [ ] 能解释拒收码并自测触发至少一种（如 `NO_EVIDENCE`）  

### 10.5 Sandbox → 上架

- [ ] fixture 跑通 Context + Ingress  
- [ ] 提审包含 Manifest · 测试说明 · UI 五段手测/录屏  
- [ ] 定价/分成声明与 Marketplace 规则一致（若收费）  

---

## 11. 门户 Docs 路径映射（P0 投影用）

| `developers.mealkey.cn` | 投影本章 / 权威 |
|-------------------------|-----------------|
| `/docs/quick-start` | Onboarding 7 日 |
| `/docs/constitution` **或** `/docs/protocol` | **本文作目录** + Protocol 全文锚点 |
| `/docs/context-api` | 本文 §3 + External §3 |
| `/docs/ingress-api` | 本文 §4 + External §4 |
| `/docs/manifest` | 本文 §2 + Protocol §2–3 · §7 |
| `/docs/security` | 本文 §5 + External §2 · Protocol §8 · §11 |
| `/docs/sandbox` | 本文 §6 |
| `/docs/versioning` | 本文 §7 |
| `/examples/m-ops` | M-OPS Reference |

---

## 12. 明确非目标

- 不在本文增加新的 JSON 字段  
- 不把教学简化例升级为 SSOT  
- 不替代 OpenAPI 机器可读产物（可另由 External 生成；生成物须标注版本）  

---

## 13. 下一步

本文已冻 → **P0 静态门户已落地**（`/developers`）→ 下一刀 **P1 Console**。

---

## 14. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 首次冻结：六块索引 · Scope 对照 · 拒收码 · 提审清单 · 门户映射 |

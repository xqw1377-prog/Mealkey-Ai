# MealKey Developer Portal V1 · 信息架构 + 数据模型（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **产品：** `MEALKEY_DEVELOPER_PORTAL_V1.md`  
> **UI/UX：** `MEALKEY_DEVELOPER_PORTAL_UI_UX_V1.md`  
> **契约：** Protocol · External Interface · 宪法索引  
> **平台 Schema 参考：** `MEALKEY_AGENT_PLATFORM_PRISMA_SCHEMA_V1.md`（AgentDefinition / Listing）  
> **一句话：** 冻结开发者侧对象、路由 IA、生命周期状态机与 Marketplace/计费连接点——**外部 Agent 生态的工程底座**。  
> **硬闸门：** 开发者域表 **不得** 把垂直 Agent 业务事实写进 Core 老板路径；**不得** 让第三方持有 Prisma URL。Gateway 仍是唯一运行时入口。

---

## 0. 设计目标（冻结）

支撑路径：

```text
第一次访问 → 理解为何加入 → 10 分钟注册
  → 1 小时跑通 Sandbox → 7 天完成第一个 Agent → Marketplace
```

本文件回答：

1. Developer Account 怎么建  
2. Agent 注册对象怎么建  
3. 生命周期状态机怎么落库  
4. Marketplace Listing 怎么连接  
5. 第三方收费/分成怎么预留  

---

## 1. 信息架构（路由冻结）

生产域名：`developers.mealkey.cn`  
P0 过渡：`mealkey.cn/developers/*`（可同构反代）

```text
/
├── /                       Landing（首页）
├── /start                  7 天快速开始（≡ Quick Start）
├── /apply                  开发者入驻申请
├── /docs
│   ├── /docs               概览
│   ├── /docs/constitution
│   ├── /docs/protocol
│   ├── /docs/context-api
│   ├── /docs/ingress-api
│   ├── /docs/manifest
│   └── /docs/security
├── /sdk                    Developer Kit
├── /examples
│   └── /examples/m-ops     Official Reference
├── /sandbox                未登录→登录；已登录→当前 Agent Sandbox
├── /marketplace            开发者向规则 + My Listing 预览入口
└── /console
    ├── /console                      Dashboard
    ├── /console/agents/new           创建向导
    ├── /console/agents/[agentId]     概览
    ├── /console/agents/[agentId]/connect
    ├── /console/agents/[agentId]/sandbox
    ├── /console/agents/[agentId]/submit
    ├── /console/agents/[agentId]/listing
    ├── /console/usage
    └── /console/billing
```

| 区 | 登录 | 说明 |
|----|------|------|
| Landing / Docs / SDK / Examples | 否 | 公开 |
| Apply | 半 | 可先填表，提交需账号 |
| Console / Sandbox 运行 | 是 | DeveloperAccount |
| 平台审核 | 否（运营） | `/platform/admin`，读 ReviewTask |

**与 UI/UX 六页映射：** Landing=/ · Start=/start · Create=agents/new · Sandbox=…/sandbox · Submit=…/submit · Listing=…/listing。

---

## 2. 域边界（冻结）

```text
┌──────────── Developer Portal Domain ────────────┐
│ DeveloperAccount · AgentApplication             │
│ AgentDraftVersion · SandboxRun · ReviewTask     │
│ （Portal 写入；审核状态由运营推进）                │
└───────────────────────┬─────────────────────────┘
                        │ promote / publish
┌──────────── Platform Marketplace Domain ────────┐
│ AgentProduct / AgentDefinition（对齐）            │
│ AgentListing · RevenueShare · Install/Entitlement│
│ UsageRecord（运行计量，Gateway 写）               │
└───────────────────────┬─────────────────────────┘
                        │
┌──────────── Runtime（只读/写出契约）─────────────┐
│ Agent Gateway · Context · Ingress · Audit         │
└─────────────────────────────────────────────────┘
```

**原则：**

- Portal 域可先落在 **同一 Postgres/SQLite**，逻辑 schema 前缀 `Developer*` / `Partner*`，**禁止**与老板 Decision/Brain 表混写。  
- 长期可拆 `apps/developer-portal` 服务；**对象契约以本文为准**，不依赖拆仓才成立。  
- 现有 `AgentProduct` / `AgentListing` 为商城侧已有表：Published 时 **投影或关联**，不另起一套平行 listing 真相。

---

## 3. 核心对象（冻结）

### 3.1 DeveloperAccount（开发者主体）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | cuid | PK |
| userId | string | 绑定 MealKey User（登录身份） |
| type | enum | `individual` \| `company` \| `partner_org` |
| displayName | string | 团队名 |
| legalName | string? | 企业全称 |
| website | string? | |
| contactEmail | string | |
| status | enum | `applied` \| `active` \| `suspended` \| `rejected` |
| verifiedAt | datetime? | 入驻通过时间 |
| metadata | json? | 能力方向自述等 |
| createdAt / updatedAt | datetime | |

**规则：** 一个 User 默认一个 DeveloperAccount（V1）；企业多成员 P1+ 再加 `DeveloperMembership`。

### 3.2 AgentApplication（Agent 注册主对象）

≡ 开发者侧的「Repo」。对齐 Protocol `id` = `partner.<org>.<slug>`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | cuid | 内部 PK |
| developerAccountId | string | FK |
| agentId | string | **全局唯一** Protocol id |
| name | string | 展示名 |
| category | string | Registry 一级 |
| capabilityIds | json | string[] |
| runtimeMode | enum | 默认 `cloud_https` |
| endpointUrl | string? | Connect 后填写 |
| webhookUrl | string? | 可选/预留 |
| lifecycleStatus | enum | 见 §4 |
| currentVersionId | string? | FK AgentDraftVersion |
| listingId | string? | 发布后关联 `AgentListing.id` |
| agentProductId | string? | 发布后关联 `AgentProduct.id` |
| qualityScore | float? | 最近 Sandbox/审核分 |
| createdAt / updatedAt | datetime | |

**禁止：** `runtimeMode=inprocess` 写入第三方申请（仅官方历史例外）。

### 3.3 AgentDraftVersion（版本 + Manifest 快照）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | cuid | |
| applicationId | string | FK |
| version | string | semver |
| manifestJson | json | **完整 AgentManifestV1** |
| skillPackageJson | json | DecisionSkillPackageV1 |
| releaseChannel | enum | `draft` \| `sandbox` \| `review` \| `live` \| `yanked` |
| demoUrl | string? | |
| privacyNotes | string? | |
| pricingJson | json? | model / priceMonthlyFen / pricePerUseFen |
| createdAt | datetime | |

同一 `applicationId` + `version` 唯一。Live 版本变更走新 semver，不覆盖历史快照。

### 3.4 SandboxRun

| 字段 | 类型 | 说明 |
|------|------|------|
| id | cuid | |
| applicationId | string | |
| versionId | string | |
| fixtureId | string | 例 `changsha-xiangcai-a` |
| status | enum | `running` \| `passed` \| `failed` |
| checksJson | json | Context/Scope/Ingress/Evidence/Level 各项 ok+code |
| qualityReportJson | json? | |
| logText | string? | 或对象存储指针 |
| invokeId | string? | 关联 Ingress 幂等 |
| startedAt / finishedAt | datetime | |

### 3.5 ReviewTask（提审 · 运营队列）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | cuid | |
| applicationId | string | |
| versionId | string | |
| status | enum | `queued` \| `in_review` \| `changes_requested` \| `approved` \| `rejected` |
| checklistJson | json | Manifest/Security/Sandbox/Evidence/UI Demo |
| reviewerUserId | string? | 平台管理员 |
| decisionNote | string? | |
| submittedAt / resolvedAt | datetime | |

**UI：** 开发者见 Submit/Listing；运营在 `/platform/admin` Marketplace/审核工作台消费同一 `ReviewTask`。

### 3.6 与既有表的连接（冻结）

| Portal | 既有 / 平台 | 时机 |
|--------|-------------|------|
| AgentApplication.listingId | `AgentListing` | ReviewTask approved → publish |
| AgentApplication.agentProductId | `AgentProduct` | 同步 slug/name/manifest/pricing |
| RevenueShare | 已有 `RevenueShare` | Listing 创建时写入默认 70/30 |
| 安装 | `AgentEntitlement` 或安装关系表 | 老板 Store 安装（P2）；Gateway 鉴权读安装 |
| 计量 | `UsageRecord` / `AgentRun` | Gateway 写；Console Usage 只读聚合 |

**映射注意：** 现网 `AgentProduct.status`、`AgentListing.status` 字符串需在发布服务内映射为 §4 对外 lifecycle，避免门户再发明第三套枚举字面量。

---

## 4. 生命周期状态机（冻结）

### 4.1 `AgentApplication.lifecycleStatus`

```text
draft
  → connecting          （已填 endpoint / 密钥已签发）
  → sandboxing          （至少 1 次 SandboxRun）
  → submitted           （ReviewTask queued/in_review）
  → changes_requested   （审核打回）
  → verified            （审核通过，待上架资料确认）
  → published           （Listing 可见 + Gateway live）
  → suspended           （运营/违规）
  → deprecated          （下架，已装可只读策略另定）
```

### 4.2 与 Protocol `stage` / 产品文案

| lifecycleStatus | Protocol stage（约） | 开发者 UI 文案 |
|-----------------|----------------------|----------------|
| draft / connecting | idea / pilot | 开发中 |
| sandboxing | sandbox | Sandbox |
| submitted / changes_requested | sandbox | 审核中 |
| verified | sandbox→live | 已通过 |
| published | live | 已发布 |
| deprecated / suspended | deprecated | 下架/停用 |

### 4.3 合法迁移（V1）

| From | To | 门禁 |
|------|-----|------|
| draft | connecting | Manifest 最小字段齐 + agentId 占用成功 |
| connecting | sandboxing | endpointUrl + secret 已签发 |
| sandboxing | submitted | 最近 SandboxRun `passed` + 提审五槽齐 |
| submitted | changes_requested / verified | 仅运营 |
| changes_requested | sandboxing / submitted | 开发者改版后再提 |
| verified | published | Listing 定价/文案齐 + 写 AgentListing/Product |
| published | suspended / deprecated | 仅运营或开发者申请下架 |

Gateway：**仅 `published`（及官方 sandbox 特批）** 可打生产 Context；Sandbox 走 sandbox base / fixture。

---

## 5. 创建向导字段 ↔ 数据落点

UI 步进可表现为「Identity → Capability → Permission → Runtime → Review」或「Create → Connect → Test → Submit」；**落库统一为 Application + DraftVersion**。

| UI 步 | 写入 |
|-------|------|
| Identity | agentId, name, category |
| Capability | capabilityIds（**只从 Registry 选**，禁自由字符串上架） |
| Permission | manifest.permissions / maxInsightLevel |
| Runtime | runtimeMode, endpointUrl |
| Review / Submit | DraftVersion 快照 + ReviewTask |

密钥：`client_secret` **只在签发接口返回一次**；库内存哈希或密管引用，禁止明文进日志。

---

## 6. Marketplace / 分成预留（冻结）

### 6.1 Publish 事务（逻辑）

```text
ReviewTask.approved
  → upsert AgentProduct（manifest 快照）
  → upsert AgentListing（status=published/active 映射）
  → ensure RevenueShare（developer 70 / platform 30，可被合同覆盖）
  → AgentApplication.lifecycleStatus = published
  → 登记 Gateway Registry（agentId → secret 指纹 · manifest_version）
```

### 6.2 pricingJson（DraftVersion）

```json
{
  "model": "free" | "subscription" | "usage" | "hybrid",
  "priceMonthlyFen": 29900,
  "pricePerUseFen": null,
  "currency": "CNY"
}
```

正式价以 Listing 为准；Draft 为提审意向。

### 6.3 Console Revenue

V1 只读聚合：`RevenueShare` + 支付/发票域（若有）按 listingId；无支付则显示「结算未开通」。

---

## 7. API 面（Portal 后端 · 非 Gateway）

前缀建议：`/api/developers/v1/*`（需 Developer 会话）

| 方法 | 路径 | 作用 |
|------|------|------|
| POST | /apply | 创建/更新 DeveloperAccount |
| GET/POST | /agents | 列表 / 创建 Application |
| PATCH | /agents/:id | 更新 Connect 字段 |
| POST | /agents/:id/versions | 新 DraftVersion |
| POST | /agents/:id/sandbox-runs | 触发检测 |
| POST | /agents/:id/submit | 建 ReviewTask |
| GET | /agents/:id/listing-preview | Store 卡片预览 DTO |

**不在此面实现** Context/Ingress（仍走 `/api/v1/gateway/*`）。

运营：`/api/platform/admin/...` 扩展 review 列表与 decision。

---

## 8. 工程落地分期（数据视角）

| 阶段 | 数据 | 前端 |
|------|------|------|
| **P0** | 无强依赖写库；Apply 可先 mailto/表单落盘 | `/developers` 静态（已有） |
| **P0.1** | 可选 `DeveloperAccount` + Apply 落库 | UI/UX 首页升级 |
| **P1** | Application · DraftVersion · SandboxRun · ReviewTask 全开 | Console 六页 |
| **P2** | Publish → Listing/Product/Share；安装鉴权 | Store `/store` 闭环（已落地主路径） |

迁移建议：优先 **新表** `DeveloperAccount` / `PartnerAgentApplication` 等，发布时同步 `AgentProduct`+`AgentListing`；避免直接把 draft 脏数据写进公开 Listing。

---

## 9. 实现形态建议（非强制拆仓）

| 选项 | 何时 |
|------|------|
| A. 继续 `apps/web` `/developers` + `/api/developers` | P0–P1 默认 |
| B. `apps/developer-portal`（Next + MDX/Fumadocs） | 流量/文档规模上来后拆；**契约仍以本文为准** |

文档：MDX 投影冻结 md；OpenAPI 由 External Interface 生成，禁止手写第二套字段。

---

## 10. 验收清单

- [x] 路由 IA 与 UI/UX 六页一一对应  
- [x] 五对象字段可支撑 7 日路径与审核  
- [x] 状态机迁移表无歧义；Gateway live 仅 published  
- [x] Capability 仅 Registry；secret 不落明文日志  
- [x] Publish 连接到既有 Listing + RevenueShare 70/30 预留  
- [x] 老板 Brain/Decision 表不被 Portal 写入  

---

## 11. 下一步

P0–P2 工程已落地。运维加深：商户打款账本 · 域名反代。

---

## 12. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 首次冻结：路由 IA · 五对象 · 状态机 · Listing/分成连接 · Portal API |
| V1.0+ | 2026-07-21 | 验收勾选：与工程落地对齐 |

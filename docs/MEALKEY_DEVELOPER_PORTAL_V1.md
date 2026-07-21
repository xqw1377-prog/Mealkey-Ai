# MealKey Developer Portal V1（第三方 Agent 开发者生态平台 · 产品设计）

> **版本：** V1.1  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **门户域名：** `https://developers.mealkey.cn`（P0 路径 `/developers`）  
> **主站 / Store：** `https://mealkey.cn`（见 `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md`）  
> **UI/UX：** `MEALKEY_DEVELOPER_PORTAL_UI_UX_V1.md`  
> **IA / 数据模型：** `MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1.md`  
> **定位：** **MealKey Agent 开放平台的开发者操作系统 / 第一工作台**（不是文档站）。  
> **一句话：** 让第三方开发者在 **7 天内**完成：理解 → 注册 → 开发 → 测试 → 提交 → 上架。  
> **技术宪法（已冻，门户不得另立伪契约）：**  
> - `MEALKEY_AGENT_PROTOCOL_V1.md` — Manifest · Ports · Capability · 质量 · Memory  
> - `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` — Gateway · Context · Ingress · 签名 · Sandbox  
> - `MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1.md` — 第三方可读索引  
> - `MEALKEY_AGENT_SDK_V1.md` · `MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md`  
> - `MEALKEY_AGENT_UI_FRAMEWORK_V1.md` · `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`  
> **冲突裁决：** 门户 IA/流程以本文为准；构图与六页以 UI/UX 为准；HTTP/Schema 以 Protocol + External Interface 为准；老板侧 Store 以 Marketplace PRD 为准。

---

## 0. 战略判断（冻结）

当前层已是 **AI 餐饮经营生态的平台协议层**，不是「再做一个 Agent 接口」。

**下一步不扩协议，而产品化 Developer Portal**：打通开发者第一次接触路径。

别人卖 API；MealKey 卖：

> **餐饮经营能力接入协议**（Context · Decision Pipeline · Marketplace Distribution）。

---

## 0.1 为何先冻门户

开发者门户 = 生态「机场」。未冻跑道/安检/登机牌就画页，只会放大错误契约。

**协议层已齐（Protocol · External · 宪法索引）；本文件 + UI/UX 管产品与体验。**

---

## 1. 产品战略定位（冻结）

### 1.1 生态结构

```text
                 MealKey Operating System
                          |
                    Agent Gateway
                          |
        ---------------------------------
        |               |               |
    官方 Agent       第三方 Agent     企业私有 Agent
    M-OPS            营销 / 财务       连锁内部 Agent
    M-PNT 能力面     HR / 供应链
    …                选址 / 培训 …
```

终局叙事：

```text
餐饮领域 AI Agent Store
             MealKey OS
                 |
     -------------------------
     |          |            |
  经营诊断    营销增长     供应链 …
                 |
        经营主体数据 + 决策上下文 + 执行闭环
```

### 1.2 三类用户（冻结）

| 角色 | 例 | 目标 |
|------|-----|------|
| **Agent 开发者** | 餐饮 SaaS · AI 团队 · 咨询 · 数据公司 | 开发排班/采购/菜品/营销等能力 |
| **企业合作伙伴** | 点评 · 供应链 · ERP/POS | 提供数据或能力接入 |
| **平台管理员** | MealKey 运营 | 审核生态质量（工作台在 `/platform/admin`） |

### 1.3 文档分工

| 文档 | 管什么 |
|------|--------|
| **本文** | 产品定位 · 用户 · IA · Console 流程 · 分期 |
| **UI/UX V1** | 首页/Quick Start/创建/Sandbox/提交/上架 六页构图 |
| **Marketplace PRD** | 老板发现/安装/付费 |
| **Protocol / External / 索引** | 宪法与 HTTP |

---

## 2. 三个核心目标（冻结）

| Goal | 名称 | 解决 |
|------|------|------|
| **G1** | 知道「怎么接」 | 架构 · 数据从哪来 · Agent 怎么输出 · 有哪些限制 |
| **G2** | 能独立完成开发 | SDK · API · Schema · Sandbox · Test |
| **G3** | 优秀 Agent 可商业化 | 发布 · 审核 · 上架 · 收益 · 用户安装（安装面在 OS/Store） |

验收口径：第三方拿到 `developers.mealkey.cn` 链接后，**按 7 日上手可完成第一个合规 Agent**（对照 Onboarding + M-OPS）。

---

## 3. 信息架构（冻结）

```text
developers.mealkey.cn

├ Getting Started          → Quick Start
├ Documentation
│    ├ Agent Protocol
│    ├ Context API
│    ├ Ingress API
│    ├ Manifest
│    └ Security
├ Developer Kit              （原 SDK 下载）
│    ├ TypeScript SDK
│    ├ Python SDK（P1+）
│    ├ CLI / Manifest Generator / Sandbox Tool（P1+）
│    └ Example Agent（M-OPS）
├ Examples
│    ├ M-OPS Agent（Official Reference）
│    └ Marketing Agent（占位）
├ Sandbox                    → 登录后进 Console
├ Marketplace                → 上架/分成规则（非老板 Store）
└ Console                    → 生态核心
     ├ Dashboard
     ├ My Agents
     ├ Create / Connect / Test / Submit
     ├ Usage · Billing · Analytics
```

说明：

- 老板浏览/安装 → `mealkey.cn/store`；本门户 Marketplace = **开发者向规则**。  
- 管理员审核 → `/platform/admin`，不在 Console 造第二套。

---

## 4. 开发者首页（冻结）

构图细节见 `MEALKEY_DEVELOPER_PORTAL_UI_UX_V1` §2。

### 4.1 第一屏

| 槽位 | 文案 |
|------|------|
| 英标题 | Build AI Agents for Restaurant Intelligence |
| 中副标 | 为餐饮经营者创造可接入的 AI 经营能力 |
| CTA | `[开始开发 Agent]` `[浏览能力市场]` `[查看技术文档]` |

### 4.2 第二屏 · 为什么接入（讲生态，不讲 API）

```text
原来：用户 → 你的应用 → 孤岛
接入：餐饮老板 → MealKey OS → 你的 Agent → 经营场景
```

三价值：Business Context · Decision Pipeline · Distribution（一次开发进全国老板侧市场）。

### 4.3 第三屏捷径

Developer Kit · M-OPS Official Reference · 宪法索引。

---

## 4b. 文档体验（冻结）

每技术页固定三区（UI/UX §3.3）：

1. **你能做什么**（一句人话）  
2. **API / 契约**（投影权威）  
3. **实际案例**（优先 M-OPS：scope → ports）

---

## 4c. Developer Console（核心 · 冻结）

不是简单后台。Dashboard 示意：

```text
你好，{团队}
你的 Agent · 状态点（Sandbox/Live…）· 完成度（Create/Connect/Test/Submit 四步）
下一步勾选 · 次要：今日调用 / 成功率
```

### Agent 创建四步（类 GitHub New Repo）

| Step | 名 | 要点 |
|------|-----|------|
| 1 | Create | Name · ID · Category · Capability · Runtime=`cloud_https` → Manifest Template |
| 2 | Connect | Endpoint · Auth secret · Webhook（可预留） |
| 3 | Test | Context / Scope / Ingress / Evidence / Level → Quality Report |
| 4 | Submit | Manifest · Skill · Demo · Pricing · Privacy → 审核中 |

上架态连接：

```text
开发者：My Agents → Submit → Review → Published
老板：Store → 安装 → 授权
```

详构图：UI/UX §4–8。

---

## 5. Agent 开发规范（门户必教 · 冻结）

### 5.1 Agent ≠ Chatbot

**禁止：**

```text
用户输入 → LLM 直接回答
```

**允许：**

```text
Context（Gateway 租用）
  → Reasoning（Decision Skill）
  → Capability（Registry 挂载）
  → Insight / Signal / Gap（Ingress Ports）
  →（可选）经授权的 Work
```

拍板只在 MealKey Decision Layer；Agent **不得**输出「你应该关闭这家店」类终局决策句。

### 5.2 Manifest（门户展示用摘录）

完整 Schema 以 Protocol `AgentManifestV1` 为准。门户示例须使用正式字段名，避免平行方言：

```json
{
  "id": "partner.acme.restaurant-finance",
  "name": "餐饮财务分析 Agent",
  "version": "1.0.0",
  "provider": "partner",
  "runtimeMode": "cloud_https",
  "stage": "sandbox",
  "capabilityIds": ["finance.performance.analysis"],
  "ports": ["signal", "insight", "gap"],
  "maxInsightLevel": 3,
  "permissions": ["read:restaurant", "read:evidence"],
  "marketplace": {
    "priceMonthlyFen": 29900,
    "pitch": "用证据解释利润波动"
  }
}
```

（草稿中的 `scope` / `risk_level` / `pricing.model` 映射到 Protocol 的 `permissions` · `maxInsightLevel` · `marketplace` + Listing 定价，**不以草稿字段为 SSOT**。）

---

## 6. Context / Ingress（门户必教 · 冻结）

### 6.1 禁止直连

```text
❌ Prisma · Database · Internal tRPC · 私调 Brain 表
✅ Agent → Gateway → ContextPackage / IngressAck
```

### 6.2 Context（形状以 External Interface 为准）

门户可用简化教学例，但必须注明正式类型为 `ContextPackageV1`，含 `scopesGranted` / `scopesDenied`：

```json
{
  "restaurantId": "…",
  "asOf": "2026-07-21T00:00:00.000Z",
  "scopesGranted": ["basic", "facts", "review"],
  "scopesDenied": ["dna"],
  "identity": {
    "storeName": "XX湘菜",
    "city": "长沙",
    "category": "湘菜"
  },
  "facts": [{ "kind": "revenue_trend", "claim": "近30日营收下行" }],
  "evidence": [
    {
      "id": "e1",
      "source": "dianping",
      "claim": "服务慢",
      "sentiment": "negative"
    }
  ]
}
```

### 6.3 输出 Ports（Signal / Insight 示例）

Signal / Insight 字段以 External Interface Ingress 为准。门户强调：

| 允许 | 禁止 |
|------|------|
| Signal（有证据） | 无证据主位结论 |
| Insight（可含 unknowns） | 「你必须关店」类拍板 |
| Gap | 伪造事实 |
| Learning 事件 | 直写 Memory / DNA |

决策由 **Decision Intelligence** 在 OS 内完成。

---

## 7. 第三方申请与生命周期（冻结）

```text
Step 1  开发者注册（企业 · 联系人 · 官网 · 能力介绍）
   ↓
Step 2  创建 Agent（名称 · 品类 · 权限 · 输出 Ports）
   ↓
Step 3  Sandbox（Agent ID · client_secret · Test Context / fixture）
   ↓
Step 4  自动检测（Manifest · Scope · Security · Output / 拒收码）
   ↓
Step 5  人工审核
   ↓
Step 6  Marketplace 上架（Published）→ 老板在 mealkey.cn Store / OS 安装
```

状态机对齐 Platform Lifecycle：`Draft → Registered → Verified → Published → Running → …`。

Console 可见：开发中 · 测试中 · 审核中 · 已发布 · 下架。

---

## 8. 商业模式（门户规则页 · 冻结框架）

| 模式 | 说明 |
|------|------|
| 免费 | 品牌曝光 / 获客 |
| Pro 订阅 | 示意 ¥99 / ¥299 / ¥999 每月（不冻死数字） |
| Usage | 按次示意（如诊断 0.5 元/次） |
| Revenue Share | **开发者 70% / MealKey 30%**（合同可覆盖） |

详细 Listing / 抽佣对象模型见 Marketplace PRD + Billing 文档。本门户只教「怎么定价与分成」，不承担老板收银台。

---

## 9. M-OPS = Official Reference Agent（冻结）

不仅是第一个 Agent，而是 **Official Reference Agent**（类 OpenAI Sample / Stripe Sample App）。

样板仓建议目录心智：

```text
examples/m-ops-agent
├ README · architecture · manifest · skill · frontend · deployment
```

第三方照着复制。真源仓：`M-OPS-Agent` · 文档 `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1`。

---

## 10. Security（Docs 必备章 · 冻结）

```text
Agent → Gateway → Permission Layer → MealKey
```

| 允许读 | 允许写 | 禁止 |
|--------|--------|------|
| 已授权 Brain 切片 / Identity / Evidence | Signal · Insight · Gap · Learning 事件 | Decision 拍板 · Execution 直写 · Memory DNA · 未安装门店 Context |

未安装 → Gateway 401/403。

---

## 11. 工程分期（冻结）

### P0 — 静态门户

- [x] 骨架已挂 `/developers`  
- [x] **P0.1** 首页 Hero 左右 + Why 三卡；`/start`；Docs 三区；Developer Kit；`/apply` + `DeveloperAccount` 入库  

### P1 — Developer Console

- [x] Dashboard `/developers/console`  
- [x] 创建 Agent 向导（Identity→…→Review）  
- [x] Sandbox Run suite + 五项检查  
- [x] Submit ReviewTask  
- [x] Marketplace Preview  
- [x] 运营台审核 → Publish 写 Listing（P2）  

### P2 — Marketplace 闭环

- [x] 审核（admin Partner Review 队列）  
- [x] Published → AgentProduct / AgentListing / RevenueShare 70/30  
- [x] Store `/store` 橱窗 + 安装写 Entitlement  
- [x] Gateway 安装鉴权硬闸（partner.* 未 Entitlement → SCOPE_DENIED 403）  
- [x] 付费结算（经营点扣点安装；Console 分成只读「结算未开通」账本）  
- [x] Sandbox 真 fixture + HMAC 自检 + 密钥轮换  
- [x] Store 官方 M-OPS 样板 + OS「我的 Agent」  

### 终局形态

```text
MealKey OS = Operating System + Agent Platform + Restaurant Intelligence Marketplace
```

---

## 12. 页面与文档映射（冻结）

| 门户路径 | 权威源（禁止分叉） |
|----------|-------------------|
| UI 六页 | `MEALKEY_DEVELOPER_PORTAL_UI_UX_V1` |
| IA / 表 | `MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1` · Prisma `DeveloperAccount`… |
| /start · /docs/quick-start | Onboarding 7 日 |
| /docs/protocol · constitution | 宪法索引 + Protocol |
| /docs/context-api · ingress-api | 索引 + External Interface |
| /sdk（Developer Kit） | `MEALKEY_AGENT_SDK_V1` |
| /examples/m-ops | `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1` |
| /apply | `POST /api/developers/apply` |
| /marketplace/* | Marketplace PRD 商业章 |
| /console/* | 本文 §4c + UI/UX §4–8 |

---

## 13. 非目标（V1）

- 不在门户内嵌完整垂直 Agent 业务站  
- 不提供「下载 .exe 安装 Agent」  
- 不发明平行于 Gateway 的 `/agent/run` 正式契约  
- 不把老板 Store 首屏做进 developers 域名  
- **不再扩协议字段**（产品化优先）  

---

## 14. 下一步

1. **P0–P2 产品化主链路已全部收口**  
2. **运维加深（非阻塞）：** 微信/支付宝商户打款账本 · `developers.mealkey.cn` 反代 · 旧 Agent 批量轮换密钥  

---

## 15. 验收清单（产品）

- [x] 7 日路径在导航可指到（Start · Docs · Kit · Apply · Console）  
- [x] Docs 三区（Context / Ingress / Protocol）  
- [x] Console 创建 / Sandbox / Submit / Preview  
- [x] Publish 连接 AgentListing + RevenueShare  
- [x] Store 公开橱窗 + 安装授权  
- [x] Gateway 未安装伙伴 Agent → 403  
- [x] 付费安装扣经营点 + 分成只读页  
- [x] M-OPS = Official Reference 一等公民  

---

## 16. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 机场定位 · IA · 三 Goal · P0–P2 |
| V1.1 | 2026-07-21 | 开发者 OS · 三类用户 · Console · Docs 三区 · Kit · UI/UX · 停扩协议 |
| V1.1+ | 2026-07-21 | 挂钩 IA/数据模型冻结 |
| V1.1++ | 2026-07-21 | P0.1 工程落地 |
| V1.2 | 2026-07-21 | P1 Console：agents API · 创建向导 · Sandbox · Submit · Preview |
| V1.3 | 2026-07-21 | P2 全收口：审核·Store·硬闸·付费点·fixture·轮换·我的 Agent |

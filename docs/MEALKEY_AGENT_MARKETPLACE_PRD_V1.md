# MealKey Agent Marketplace（餐启 Agent 开放平台）PRD V1

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **官网域名：** `https://mealkey.cn`  
> **开发者门户（机场）：** `https://developers.mealkey.cn` — 产品真源 `MEALKEY_DEVELOPER_PORTAL_V1.md`  
> **配套（技术真相）：**  
> - `MEALKEY_AGENT_PROTOCOL_V1.md` — 能力标准化 / Manifest / Ports / 质量  
> - `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` — Gateway · Context · Ingress · 签名  
> - `MEALKEY_DEVELOPER_PORTAL_V1.md` — 开发者门户 IA · Docs · Sandbox · Console  
> - `MEALKEY_AGENT_SDK_V1.md` · `MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md`  
> - `MEALKEY_AGENT_UI_FRAMEWORK_V1.md` — Agent UI 规范（实现外置）  
> - `MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md` — 微信 Hub 获客 · 身份/燃料/裂变 · 三 Manifest  
> - `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md` — 第一个生态样板  
> **冲突裁决：** Store/安装/分成对外叙述以本文为准；开发者机场 IA 以 Developer Portal 为准；技术契约以 Protocol + External Interface 为准；**禁止**用「给 Agent 塞任意 JSON 就跑」覆盖 Gateway 模型。

---

## 0. 定位（冻结）

### 0.1 一句话

> 让餐饮行业的专业能力，以 Agent 形式被开发、连接、交易和持续进化。

### 0.2 产品升级

| 之前 | 之后 |
|------|------|
| AI 餐饮经营系统 | **餐饮行业 AI Agent 操作系统 + 能力生态平台** |
| 第一个外置 Agent 怎么接入 | **任何第三方如何基于 Protocol 开发 · 申请 · 发布 · 分发 · 商业化** |

类比心智（垂直于餐饮经营）：

- Apple App Store → 应用发现与安装  
- OpenAI GPT Store → 智能体分发  
- Salesforce AppExchange → 企业能力交易  

**M-OPS-Agent 不是终点，是生态 Hello World（官方样板）。**

### 0.3 三端产品（冻结）

```text
mealkey.cn                 MealKey OS（登录后）           platform admin
├ Agent Store（营销+橱窗）  ├ 我的 Agent（安装/授权）      ├ Listing 审核/上下架
└ Developer Center          ├ 今日 / 决策室               └ 第三方耗用 / 抽佣
```

| 端 | 域名 / 路径 | 用户 |
|----|-------------|------|
| **Agent Store + 官网** | `https://mealkey.cn` | 老板、访客、投资人 |
| **Developer Portal（机场）** | `https://developers.mealkey.cn` | 第三方 / 官方开发者 |
| **OS 内安装面** | 登录后能力市场 /「我的 Agent」 | 已开通门店的老板 |
| **运营审核** | `/platform/admin`（Marketplace） | MealKey 运营 |

---

## 1. 生态结构（冻结）

```text
                  MealKey OS
                      |
              Agent Gateway
                      |
        --------------------------------
        |              |               |
   官方 Agent      第三方 Agent     企业私有 Agent
        |              |               |
   M-OPS 诊断      营销 / 选址      连锁内部 Agent
   M-PNT 能力面    菜单 / 招聘      财务 / 培训
```

硬闸门（继承）：

1. MealKey 仓 **禁止新增** 垂直 Agent 实现  
2. 一切新能力 = 独立仓 + 独立部署 + 只调 Gateway  
3. 批量上架仍服从 MVP 核心飞轮停扩闸门（Store 可建，Live 供给可控）

---

## 2. 官网 / Agent Store 信息架构（冻结）

### 2.1 顶级导航（`mealkey.cn`）

| 入口 | 文案 | 去向 |
|------|------|------|
| 浏览 Agent | 浏览 Agent | `/store` |
| 开发 Agent | 开发 Agent | `/developers` |
| 发布 Agent | 发布 Agent | `/developers/console`（需登录开发者） |
| 登录 / 注册 | — | 现有 auth；登录后进 OS |

### 2.2 Hero（首页第一屏 · 冻结文案）

- **品牌：** MealKey / 餐启（视觉规范服从现有 marketing）  
- **标题：** 为餐饮行业打造的 AI Agent 开放生态  
- **副标题：** 开发、连接、部署专业经营智能体，让每一个餐饮能力都可以被调用。  
- **CTA：** `[浏览 Agent]` `[开发 Agent]` `[发布 Agent]`  

首屏预算：品牌 + 一句主张 + 短副标题 + CTA 组 + 一个主导视觉。不堆统计条、不堆卡片墙。

### 2.3 生态橱窗（第二屏）

类似 App Store「热门」：

- 卡片字段：名称 · 一句话 · 3 条能力要点 · 开发者（官方/第三方）· 评分占位 · 品类  
- V1 种子位：餐厅经营诊断（官方样板）· 选址助手（占位）· 招聘面试 Agent（占位）  
- 点击 → Agent 详情页（§3）

### 2.4 非目标（V1）

- 不做可执行安装包下载  
- 不做站内嵌垂直 Agent 整站  
- 不把 Developer Docs 塞进首页首屏  

---

## 3. Agent 详情页（冻结）

路径：`https://mealkey.cn/store/agents/{slug}`

| 区块 | 内容 |
|------|------|
| 身份 | Logo · 名称 · 开发者 · 类型/品类 · 版本 · 官方/Verified 徽章 |
| 能力 | 勾选列表（来自 Manifest capabilities 的可读文案） |
| 适用 | 单店老板 / 连锁 / 运营经理等 |
| 输入 | 所需 Context scope（店铺信息、评价、经营事实…） |
| 输出 | Signal / Insight / Gap 等 Ports（禁止写「直接替你拍板」） |
| CTA | `[安装到我的 MealKey]`（需登录）· `[API / 开发者文档]`（跳转 Developers）· 价格标签 |

未登录点「安装」→ 登录 → 回跳授权安装流（§9）。

---

## 4. Developer Center（冻结）

路径根：`https://mealkey.cn/developers`

### 4.1 开发者注册

类型：

- 个人开发者  
- 企业开发者  
- 合作机构  

提交：公司/主体信息 · 团队简介 · 联系方式 · 产品方向 · 结算意向（可后补）

审核通过 → 获得发布者身份 → 可创建 Agent。

### 4.2 文档中心 IA

```text
/developers/docs
├ Protocol          ← MEALKEY_AGENT_PROTOCOL_V1
├ Manifest          ← AgentManifestV1
├ API Reference     ← EXTERNAL_INTERFACE（OpenAPI 投影）
├ SDK               ← MEALKEY_AGENT_SDK_V1
├ Authentication    ← HMAC · OAuth · 安装门禁
├ Data Contract     ← Context / Evidence / Ingress
├ UI Framework      ← MEALKEY_AGENT_UI_FRAMEWORK_V1
├ Testing           ← Sandbox · Quality Check
├ Publishing        ← 提审包 · Lifecycle
└ Reference         ← M-OPS Hello World
```

文档 = 冻结契约的投影；禁止营销文案改写 API 语义。

### 4.3 开发者控制台

`/developers/console`

- 我的 Agent 列表与状态（§8）  
- 创建 Agent → 填 Manifest → 登记 endpoint / 版本  
- 沙箱密钥 · 自测结果 · 提审 · 上架资料（介绍/截图/Demo/价格）  
- 下载区：SDK · OpenAPI · Manifest 模板 · 样板仓说明  

---

## 5. Manifest（产品侧要求）

技术字段以 Protocol `AgentManifestV1` 为准。产品侧每个上架 Agent **必须**有可读身份证，至少覆盖：

```json
{
  "agent_id": "partner.acme.menu-optimizer",
  "name": "菜单优化助手",
  "version": "1.0.0",
  "category": "restaurant_operation",
  "type": "tool_agent",
  "developer": { "name": "…", "publisherId": "…" },
  "capabilities": ["…"],
  "context_required": ["restaurant.basic", "restaurant.review"],
  "output": ["signal", "insight", "gap"],
  "permission": ["read:restaurant", "read:evidence"],
  "maxInsightLevel": 3
}
```

官方样板 id 形如 `m-ops-diag` / `partner.mealkey.ops-diag`（以样板仓 Manifest 为准）。

---

## 6. API 模型（冻结 · 纠偏）

第三方 **不是** 实现「任意方 POST 一段 context 就返回报告」的裸接口作为唯一契约。

### 6.1 正确模型（唯一）

```text
老板在 OS 触发 / Runtime 调度
        │
        ▼
 Agent Gateway（mealkey.cn 侧）
        │  Context 租用（只读切片）
        │  权限裁剪 · 计量 · 审计
        ▼
 外置 Agent（开发者自有部署）
        │  Decision Skill
        ▼
 Ingress（Signal / Insight / Work / Gap / Learning）
        │
        ▼
 OS 投影（今日 / 决策室候选 / 学习队列）
```

权威线级 API：`MEALKEY_AGENT_EXTERNAL_INTERFACE_V1`

| 面 | 谁调谁 | 用途 |
|----|--------|------|
| Context API | Agent → Gateway | 读授权范围内的餐厅上下文 |
| Ingress API | Agent → Gateway | 写合法 Ports |
| Register / Manifest | 开发者控制台 → Gateway | 登记与版本 |
| Sandbox invoke | 平台 / 开发者 | 模拟餐厅夹具，不计生产计量 |

### 6.2 明确禁止的「伪标准」

```text
❌ POST /api/v1/agent/run   + 调用方自带任意 facts 冒充 Brain
❌ Agent 直连 Prisma / 内部 tRPC
❌ 输出里直接写 MKDecision / 拍板句
❌ 私有永久记忆库
```

对外文档若展示「Execute」示例，必须标明：**Context 来自 Gateway 租用，输出必须走 Ingress 信封**，不得诱导第三方自造平行 API 当正式契约。

---

## 7. 安全与权限（冻结）

```text
Agent → Gateway → Permission Layer → MealKey
```

| 允许 | 禁止 |
|------|------|
| READ：Brain 切片 / Identity / Evidence（按安装 scope） | 直读库、越权 scope |
| WRITE：Signal / Insight / Gap / Learning 事件 | Decision 拍板、Execution 直写、Memory DNA 直写 |
| Work Port | 无决策授权时的 Work |

未安装到该 `restaurantId`（或 project）→ Gateway **401/403**。

---

## 8. 申请 · 审核 · 上架（冻结）

### 8.1 主流程

```text
开发者注册
  → 创建 Agent（Draft）
  → 填写 Manifest + Skill 说明
  → 登记 HTTPS endpoint / 版本
  → Sandbox 自动测试
  → 安全审核（越权 / 伪造 / 密钥泄露）
  → 能力与质量审核（无证据 / 幻觉 / 违领域 / 直决）
  → Verified
  → 完善上架页（文案 · 截图 · Demo · 价格）
  → Published（进入 Store + OS 可安装）
```

对齐 Lifecycle：`Draft → Registered → Verified → Published → Running → Optimizing → Deprecated`。

### 8.2 控制台可见状态

| 状态 | 含义 |
|------|------|
| 开发中 | Draft |
| 测试中 | Sandbox / Registered |
| 审核中 | 已提审 |
| 已发布 | Published |
| 下架 | Deprecated / 运营下架 |

### 8.3 Agent Quality Check（V1）

| 维 | 检查 |
|----|------|
| 协议 | Manifest 合法 · Capability 在 Registry · endpoint 可达 |
| 安全 | 签名校验 · 无越权 Context · 无直连痕迹 |
| 输出 | 拒收码可触发（`NO_EVIDENCE` / `FORBIDDEN_DECISION` / `LEVEL_EXCEEDED`…） |
| 体验 | UI 五段旅程手测或录屏（见 UI Framework） |

人工复核工作台：平台 admin（可与学习复核同类「任务详情不丢」体验）。

---

## 9. 用户侧「安装」体验（冻结）

**不是下载软件。**

```text
发现 Agent（Store）
  → 查看能力
  → 登录 MealKey
  → 选择门店 / 项目
  → 授权 scope
  → 安装到我的 MealKey
  → 立即使用（跳转 Agent UI 或 OS 内入口）
```

安装后 OS 内：

```text
我的 Agent
├ 餐厅经营诊断
├ （已装第三方…）
```

卸载 / 停权 → Gateway 立即拒绝 Context。

---

## 10. 商业化体系（冻结框架 · 费率可商务调）

| 模式 | 说明 | 例 |
|------|------|-----|
| 免费 | 官方引流 / 获客 | M-OPS 基础档 |
| 订阅 | 按月/年 | 诊断 ¥199/月（示意） |
| Token / 计量 | 调用次数 · 深度 · 数据量 | 高级分析 |
| 分成 | 第三方收入拆分 | **开发者 70% / MealKey 30%**（V1 默认示意，合同可覆盖） |

计量与抽佣挂钩既有 Billing / UsageRecord / RevenueShare 模型（见 `MEALKEY_BILLING_USAGE_V1` · Prisma `AgentListing`）。

平台可另计：Brain / M-INTEL 高成本 scope 调用费。

---

## 11. M-OPS 在生态中的角色（指针）

详见 `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`。

同时是：

1. **用户产品** — Store 上的「餐厅经营诊断系统」  
2. **开发模板** — Tool Agent Reference Implementation  
3. **开发教材** — 7 日上手对照物  

---

## 12. 工程分期（冻结优先级）

| 阶段 | 交付 | 闸门 |
|------|------|------|
| **P0** | `mealkey.cn` Store IA + Hero；`/developers` 文档投影 + 下载链；详情页壳 | 不改 Gateway 契约 |
| **P1** | 开发者注册 + Console 状态机 + 提审对接 admin Marketplace | Lifecycle 可演示 |
| **P2** | OS「我的 Agent」安装/授权；Store CTA 深链 | 未安装必 403 |
| **P3** | OpenAPI 自动同步 · 沙箱密钥自助 · Quality Check 自动化 · Changelog | 批量 Live 仍受 MVP 停扩 |

---

## 13. 验收清单（V1 PRD）

- [x] 访客在 `mealkey.cn` 能理解「OS + Agent 生态」而非「又一个聊天机器人」  
- [x] 三 CTA 分到 Store / Developers / Console  
- [x] Agent 详情页字段齐全，且不承诺替老板拍板  
- [x] Developers 文档指向 Protocol + External Interface，无平行伪 API  
- [x] 安装 = 授权到门店，不是下载包  
- [x] 上架状态机与 Platform Admin Marketplace 一致  
- [x] M-OPS 在 Store 为官方样板位，并链到 Reference Implementation  

---

## 14. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 首次冻结：Store · Developer Center · 安装 · 商业化 · mealkey.cn |
| V1.0+ | 2026-07-21 | P2 工程验收勾选 |

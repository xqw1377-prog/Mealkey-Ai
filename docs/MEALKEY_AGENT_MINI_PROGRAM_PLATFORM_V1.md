# MealKey Agent Mini Program 平台架构设计 V1（冻结）

> **版本：** V1.1  
> **状态：正式冻结（Freeze）** — **获客入口与商业闭环；1 Shell + N Plugin**  
> **日期：** 2026-07-22  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：**  
> - `MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md` — **Shell 产品架构 · Plugin 运行规范（下位真源）**  
> - `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` — Gateway · Context · Ingress（运行时唯一面）  
> - `MEALKEY_AGENT_PROTOCOL_V1.md` — Manifest · Capability · Insight 等级  
> - `MEALKEY_AGENT_UI_FRAMEWORK_V1.md` — Agent Surface 五段旅程 / 视觉禁令  
> - `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md` — Store · 安装 · 分成  
> - `MEALKEY_TOKEN_ECONOMY_MODEL_V1.md` · `MEALKEY_BILLING_USAGE_V1.md` — 经营点 / Usage 账本  
> - `MOBILE_THREE_EASY_IA_V1.md` — 移动端三易、深度 ≤3  
> - `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md` — 首个挂载样板（餐厅经营体检）  
> **冲突裁决：** 拍板/Brain/DIE/Gateway 硬闸门以既有 L0 为准；Shell/Plugin 细节以 Shell&Plugin Runtime 为准；本文冻结 **微信生态总架构 + 身份/燃料/裂变 + 三层入口**。  
> **一句话：** **不是 100 个小程序，而是一个餐饮 AI 超级入口（Shell）下面挂 ~100 个可插拔 Agent；** 小程序解决入口，Agent 解决能力，Brain 解决长期资产。

---

## 0. 定位（冻结）

### 0.1 商业判断

餐饮老板不愿意下载陌生 App；微信是最高频工作入口；愿意扫码试工具；高价值用户必须沉淀到 MealKey 主系统。

因此外部 Agent 的最佳形态不是「独立下载 App」，而是：

```text
微信小程序 = 免费获客工具 + 单点价值体验入口
MealKey App / Web = 长期经营大脑
```

### 0.2 微信生态总架构（冻结 · V1.1）

```text
                  微信
                    │
          MealKey Agent 小程序（唯一官方入口 · Shell）
                    │
          Restaurant Brain（经 Gateway；长期资产）
                    │
        Agent Runtime Platform（~100 Plugins）
        --------------------------------
        M-OPS 诊断 · M-PNT 定位 · M-MKT 营销 · …
        第三方 Plugin …
        --------------------------------
              Gateway → MealKey Core
```

转化层（体验 → 账户）：

```text
Shell 内体验一次价值
  → 微信身份 → 手机绑定 → 餐厅档案绑定 Brain
  → MealKey Account
       ├ MealKey App/Web（经营大脑）
       └ Shell 继续轻量使用
```

### 0.3 三层入口（冻结）

| 层 | 形态 | 说明 |
|----|------|------|
| **L1 官方入口** | **1** 个 MealKey Mini Shell | 普通老板主入口；内挂 N 个 Agent 能力 |
| **L2 Agent 市场** | Marketplace /「我的能力」 | 安装能力 ≠ 下载小程序 |
| **L3 伙伴品牌小程序** | 第三方自有小程序 | 经 Gateway 接入 Brain（模式 2）；非官方主入口 |

### 0.4 与表面模型的关系

| 表面 | 职责 | 真源 |
|------|------|------|
| **Acquisition / Shell** | 微信超级入口：身份、燃料、发现、PluginHost | **本文** + Shell&Plugin Runtime |
| **Agent / Plugin Surface** | 垂直能力工作流（Shell 内页或受控 web-view） | `MEALKEY_AGENT_UI_FRAMEWORK_V1.md` |
| **OS Surface** | 今日 / 决策室 / Brain 深度 / 拍板 | Experience · Radar · DIE |

**禁止：** 把 Shell 做成第二个「决策室」或第二套 Brain 存储。  
**禁止（官方路径）：** 一 Agent 发一官方小程序（资产分裂、重复授权、Brain 碎片化）。  
**允许：** 模式 2 伙伴自有小程序经 Gateway 合作（见 §8）。

---

## 1. 为什么是小程序，不是独立 App（冻结）

| 路径 | 摩擦 |
|------|------|
| App：广告→下载→注册→登录→授权→体验 | 过高；餐饮老板非 C 端下载习惯 |
| 小程序：扫码→微信授权→立即体验→3 分钟报告→绑定 MealKey | 摩擦约少 80% |

V1 **不以独立 App 作为外部 Agent 主获客路径**。App/Web 是升级后的经营大脑宿主，不是首次触达主战场。

主 CTA 文案冻结为：

```text
进入 MealKey 经营大脑
```

**禁止**主 CTA 写「下载 MealKey App」（可在「我的 → 安装 App」次级入口提供，不得抢升级主位）。

---

## 2. MealKey Mini Shell = 唯一官方小程序（冻结）

### 2.1 1 个小程序 + N 个 Agent（不是 N 个小程序）

产品名（对外）：**餐启 / MealKey Agent**（上架名以微信审核为准；对内：**Mini Shell**）。

```text
微信里老板只看到一个入口
  → 打开后是「我的能力」列表
  → 经营体检 / 菜单优化 / 采购优化 / …
  → 全部共享同一餐厅档案与 Brain
```

IA / PluginHost / ShellContext 细节真源：`MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md`。

摘要 IA：

```text
Tab · 首页（发现）· 我的能力 · 我的
首页主推：免费 AI 餐厅体检
能力详情（L2）→ Plugin 运行/报告（L3）
```

### 2.2 Shell vs Plugin vs Gateway

| 层 | 谁拥有 | 做什么 |
|----|--------|--------|
| **Mini Shell** | MealKey | 登录、餐厅绑定、燃料、邀请、Catalog、PluginHost、升级经营大脑 |
| **Agent Plugin** | 官方/第三方 | Backend + UI 包 + Skill；五段旅程可裁剪 |
| **Gateway** | MealKey | Context · Ingress · install · Usage |
| **Restaurant Brain** | MealKey Core | 长期经营资产；全插件共享 |

Shell **不**跑垂直推理；Plugin **不**私建用户宇宙。

### 2.3 硬闸门

1. Shell / Plugin / 模式 2 小程序 **禁止**直连 Prisma / Brain 库  
2. 生产 Context / Ingress 须 Entitlement  
3. Shell 侧展示与 Ingress：`maxInsightLevel ≤ 3`；禁止拍板  
4. Live 插件数量服从 MVP 停扩

---

## 3. Agent 如何挂载（冻结）

第三方/官方上架包 = **三 Manifest 齐套**（可同仓分文件）：

```text
Agent Package
= AgentManifestV1          （Protocol 已冻结）
+ MiniProgramManifestV1    （本文新增）
+ BillingManifestV1        （本文新增；账本服从经营点）
```

### 3.1 `MiniProgramManifestV1`（契约草案 · 冻结语义）

```ts
type MiniProgramManifestV1 = {
  schemaVersion: "1.0"
  agentId: string                    // = AgentManifest.id
  hubSlot: {
    title: string                    // 中文产品名，禁裸技术 ID 当主标题
    subtitle?: string
    category: "ops" | "menu" | "review" | "site" | "other"
    coverAssetRef: string
    tags: string[]                   // ≤5
  }
  entry: {
    /** Hub 内页路径或受控 web-view 源 */
    path: string
    /** 首次体验预估分钟数（展示用） */
    firstValueMinutes: number        // 建议 3–5
  }
  surfaces: {
    /** 模式1：官方 Shell；模式2：伙伴自有小程序（须 Gateway 合规） */
    host: "mealkey_agent_hub" | "partner_miniprogram"
  }
  experience: {
    freePreviewRatio: number         // 0–1；默认 0.3（见 §5）
    handoffCta: "enter_mealkey_brain" // 固定枚举
    forbidDownloadAppAsPrimaryCta: true
  }
  identity: {
    allowGuestRun: boolean           // 默认 true：微信授权即可首次跑
    requirePhoneToPersist: true      // 保存报告/档案必须绑手机
  }
}
```

### 3.2 挂载生命周期

```text
Developer Portal 提交
  → Review（能力 + 小程序槽位 + 计费）
  → Hub Listing（可发现）
  → 用户打开 Slot
  → （可选）自动/引导安装 Entitlement
  → Context 租用 → Skill → Ingress
  → 升级引导 / 继续轻量使用
```

**安装 ≠ 下载包。** 小程序里的「可用」= Hub Listing +（生产）Entitlement，语义与 Store 一致。

### 3.3 官方首发样板

| 槽位 | Agent ID（Gateway） | 产品名 |
|------|---------------------|--------|
| 首发 | `restaurant-diagnosis` | **餐厅经营体检系统** |

对齐 Reference：`M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`。

---

## 4. 用户身份体系（冻结）

### 4.1 阶梯，不一步强注

| 步 | 动作 | 账户态 | 可做什么 |
|----|------|--------|----------|
| 1 | 微信授权（头像/昵称/openid/unionid） | `Guest` | 首次体验跑通（消耗赠送燃料） |
| 2 | 绑定手机号 | `Bound` | **保存**餐厅经营档案与报告 |
| 3 | 进入 MealKey 经营大脑（Web/App 会话） | `Member` | 日扫、决策室、Brain 沉淀、付费能力 |

心理话术（绑定手机）：

> 保存你的餐厅经营档案  

**不是**「注册账号」。

### 4.2 数据对象（逻辑模型 · 非强制当日 Prisma）

```text
User
  id
  wechatOpenId
  unionId?
  phone?
  status: guest | bound | member
  createdAt

RestaurantProfile（轻量；完整 Brain 在 OS）
  id
  userId
  restaurantName
  city
  category
  stage?
  /** 与 OS Restaurant 的关联；绑定时或升级时建立 */
  mealkeyRestaurantId?

InviteEdge / ReferralAttribution  — 见 §6
FuelLedger 投影 — 见 §5（底层 = 经营点账本）
```

### 4.3 与 MealKey Account 合一

- `unionId` / 手机号是跨端合并主键策略的输入；**禁止**小程序另建永久平行用户宇宙。  
- Guest 可先本地/短时会话跑一次；**持久化档案与跨端同步必须 Bound+。**  
- 升级到 OS 时：同一 User → 同一 RestaurantProfile 投影进 RIP / Brain 入口（确认门禁仍服从 RIP 冻结文）。

### 4.4 隐私与同意

- 微信授权范围最小化。  
- 行业贡献 / 跨租户学习默认关（服从 User Intelligence Memory Permission）。  
- 小程序不得偷偷用聊天当学习燃料。

---

## 5. 升级路径：Agent → MealKey 经营大脑（冻结）

### 5.1 第一次价值（样板叙事）

用户打开「餐启·餐厅经营体检系统」：

1. 最少字段：餐厅名称 / 城市 / 品类（对齐 Onboarding ≤60s）  
2. 生成 **我的餐厅健康报告**（证据优先；非假总分仪表盘）  
3. 「今日发现」给 Top 问题与可展开证据  

健康度展示规则（对齐 UI 框架禁令）：

- **允许：** 定性档位（如关注/稳定/优势）或 **可审计公式** 且明示口径  
- **禁止：** 无公式的「综合健康分 87」类假权威  
- 星级若使用，必须可追溯到规则，不得伪精算

### 5.2 解锁完整经营大脑

小程序默认只展示约 **30%** 深度（`freePreviewRatio` 默认 `0.3`）：

| 小程序可见（示意） | MealKey 经营大脑 |
|--------------------|------------------|
| 单次体检摘要 | 每日经营扫描 |
| 部分证据与缺口 | 菜品利润 / 客群 / 竞争变化（按安装能力） |
| ≤L3 关注建议 | AI 经营顾问链路 · 决策室拍板 |

主按钮：

```text
进入 MealKey 经营大脑
```

次按钮：继续用小程序轻量工具 / 查看燃料余额。

### 5.3 Handoff 契约

| 从 | 到 | 条件 |
|----|----|------|
| 小程序报告页 | OS `/dashboard` 或画像确认流 | Ingress 成功或至少已 Bound 档案 |
| 小程序「我的餐厅」 | OS 我的餐厅 / RIP | `mealkeyRestaurantId` 已关联 |

须避免空跳：无档案、无 Ingress 时先完成绑定或重跑最小体检。

---

## 6. 燃料（Token）体系（冻结）

### 6.1 命名对齐（重要）

| 层 | 名称 | 说明 |
|----|------|------|
| 用户可见（小程序可简称） | **燃料 / Token** | 获客层口语；展示整数余额与本次消耗 |
| 账本真名（全站统一） | **经营点** | `MEALKEY_TOKEN_ECONOMY_MODEL_V1.md` |
| 内部成本 | 模型 Token / UsageRecord | **禁止**对老板暴露 input/output token |

**铁律：** 小程序「Token」= 经营点钱包的同一余额投影，**不是**第二套积分宇宙，也不是模型 Token。

### 6.2 获客层默认赠送与消耗示意

| 动作 | 建议（V1 示意，上线前可调价表） |
|------|----------------------------------|
| 新用户首次进入 Hub | 赠送 **500** 燃料 |
| 经营体检（样板） | **100** |
| 差评分析 | **200** |
| 菜单分析 | **300** |
| 竞争分析 | **500** |
| 完整经营报告（深） | **1000**（通常引导进 OS） |

具体数字写入 `BillingManifestV1.priceTable`；扣减须打 `UsageRecord` + 经营点账本，禁止只改前端数字。

### 6.3 `BillingManifestV1`（语义冻结）

```ts
type BillingManifestV1 = {
  schemaVersion: "1.0"
  agentId: string
  currency: "ops_points"             // 经营点
  priceTable: Array<{
    skillOrActionId: string
    displayName: string
    costPoints: number
  }>
  grant?: {
    firstHubVisitPoints?: number     // 默认 500，由平台统一发，Agent 不可私发无限
  }
  /** 分成服从 Marketplace；获客层免费体验由平台补贴策略控制 */
  settlementRef: "marketplace_v1"
}
```

Agent **禁止**自建链下余额；**禁止**用「免费无限跑」绕过 Gateway 计量（Sandbox 除外）。

---

## 7. 裂变：MealKey 经营合伙人计划（冻结）

### 7.1 不是简单邀请奖励

产品名：**MealKey 经营合伙人计划**（一级为主；二级封顶）。适配餐饮老板圈层裂变。

```text
老板 A：「帮你免费测一次餐厅」
  → B 扫码进 Shell
  → B 完成「有效用户」
  → A 与 B 均获燃料（见下表）
```

### 7.2 有效用户（防羊毛）

同时满足才发**邀请双边奖**：

```text
Bound（微信 + 手机）
+ 创建餐厅档案
+ 完成第一次诊断（样板：餐厅经营体检可保存报告）
```

**禁止：** 仅扫码或仅授权微信就发奖。

### 7.3 奖励示意（V1.1）

| 动作 | 奖励 |
|------|------|
| 新用户首次进入 Shell（平台赠送） | **500** 燃料（可与有效用户奖去重规则工程钉死，禁双发刷量） |
| 一级：邀请人 A（B 成有效用户） | **500** 燃料 / 有效用户 |
| 一级：被邀请人 B（成有效用户） | **500** 燃料（若已领「首次进入」则只补差或记一笔有效奖，禁止无脑叠两笔 500×2 漏洞） |
| 二级 | **20** 燃料 / 人（封顶两级） |
| 超过两级 | **不做** |

奖励入经营点账本，须可审计、可风控熔断（异常邀请图、设备农场）。

### 7.4 归因

- 邀请码 / 场景二维码带 `inviterUserId`（或短码）。  
- 首次归因锁定；后绑手机合并时继承归因（详细合并规则工程阶段钉死，不得双发）。  

---

## 8. 第三方接入：两种模式（冻结 · V1.1）

### 8.1 模式 1（推荐）：Agent Plugin

第三方 **不**开发微信小程序。只开发：

```text
Agent Backend + Agent UI 组件/页面包 + Protocol + Billing
```

上线后出现在 Shell「我的能力 / 发现」——与官方插件同一列表心智。

运行规范真源：`MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md`。

### 8.2 模式 2：第三方独立小程序（伙伴）

允许（如「美团经营助手」自有品牌小程序）：

```text
第三方小程序 → MealKey Agent Gateway → Restaurant Brain
```

自有用户与品牌可保留；**必须** Gateway-only，并引导账号与 Brain 合并。  
**不得**自称官方 Shell，**不得**一能力拆成 MealKey 官方的多个小程序入口。

### 8.3 提交物

| 交付物 | 模式 1 | 模式 2 | 权威 |
|--------|--------|--------|------|
| `AgentManifestV1` + Skill | ✓ | ✓ | Protocol |
| `PluginUiBundle` | ✓ | 可选（自有 UI） | Shell&Plugin Runtime |
| `MiniProgramManifestV1` | `host=mealkey_agent_hub` | `host=partner_miniprogram` | **本文** |
| `BillingManifestV1` | ✓ | ✓ | **本文** + Token |
| Listing | ✓ | ✓ | Marketplace |
| 伙伴合规审计包 | — | ✓ | External + 本文 |

```text
Agent Package（模式 1）
= 后端能力 + Plugin UI + Token 计费 + Marketplace Listing
```

### 8.4 硬禁令

1. 把官方主入口拆成 N 个 MealKey 小程序（否决）  
2. Shell/Plugin 内拍板或伪造「经营大脑已批准」  
3. 私有永久记忆替代 Brain  
4. 直连库 / 伪造 Context  
5. 主 CTA 用「下载 App」抢「进入 MealKey 经营大脑」  
6. 自建积分不与经营点打通  
7. 未达有效用户定义的裂变刷量  

### 8.5 UI 组件约定

Plugin：`IdentityStrip` · `EvidenceWall` · `DiagnosisCard` · `GapList` · `HandoffBar` · `InstallGate`。  
Shell：`FuelBalance` · `InviteCard` · `UpgradeToBrainBanner` · `RestaurantProfileLite` · `PluginHost`。

---

## 9. 商业闭环（冻结终局图）

```text
流量（微信）
  → Agent Hub 小程序
  → 免费 / 赠送燃料体验
  → 微信身份（Guest）
  → 手机绑定 + 餐厅档案（Bound）
  → 燃料体系 + 经营合伙人裂变
  → MealKey Account（Member）
  → 经营大脑（日扫 / 决策 / 执行）
  → 付费 Agent / Marketplace
  → 第三方 Agent Package 生态
```

战略句（冻结）：

> **小程序（Shell）负责超级入口与获客；Agent（Plugin）负责创造第一次价值；Brain 负责长期资产；MealKey OS 负责经营大脑与拍板。**

---

## 10. 与 MVP 停扩闸门的关系

| 允许 | 禁止 |
|------|------|
| 冻结本文架构与契约语义 | 借「小程序生态」在 Core 新增垂直 Agent 引擎 |
| Mini Shell + 身份/燃料/裂变工程切片 | 同时 Live 上架大量第三方 Plugin（服从 90 天飞轮） |
| 首发 Plugin：餐厅经营体检 | 把 Shell 做成决策室/常委聊天 |
| Developer Portal：Plugin / 模式 2 提审项 | 改 Gateway 旁路或弱化 install 硬闸 |

工程建议顺序 → 见 Shell&Plugin Runtime §10（S0–S5）。

---

## 11. 验收清单（文档级）

1. 口述与文档均为 **1 Shell + N Plugin**，不是 100 个小程序  
2. 官方仅一个小程序 AppID；能力以 Plugin 挂载  
3. 三层：官方 Shell · Marketplace · 伙伴小程序（模式 2）  
4. 身份三阶：Guest → Bound → Member；档案进 Brain 共享  
5. 升级主 CTA =「进入 MealKey 经营大脑」  
6. Token 口语 = 经营点；无第二积分宇宙  
7. 裂变：有效用户三条件；一级示意双边 500；≤两级  
8. 模式 1 默认；模式 2 须 Gateway 合规  
9. ≤L3；无拍板；Gateway-only  

---

## 12. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-22 | 双层获客闭环 · Hub · 三 Manifest · 身份 · 燃料 · 合伙人 |
| V1.1 | 2026-07-22 | 澄清 1 Shell+N Plugin · 三层入口 · 模式 1/2 · Brain 中枢 · 裂变双边 500 · 下位 Shell&Plugin Runtime |

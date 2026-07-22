# MealKey Mini Program Shell · Agent 插件运行规范 V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-22  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **上位：** `MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md`（微信生态 / 三层 / 模式 1·2）  
> **配套：** External Interface · Protocol · Agent UI Framework · Marketplace · Restaurant Brain · Token/经营点  
> **一句话：** **1 个 Mini Shell + N 个可插拔 Agent 插件**；Shell 管入口与身份，Brain 管长期资产，Agent 管单点能力。  
> **冲突裁决：** Brain / Gateway / 拍板硬闸门不改；本文只钉 **Shell 产品架构** 与 **Plugin 运行规范**。

---

## 0. 关键区别（冻结）

**不是：**

```text
一个「小程序 Agent」下面挂 100 个独立小程序
```

**而是：**

```text
一个 MealKey Agent 小程序平台（Shell）
里面运行 ~100 个 Agent 能力（Plugin）
```

```text
                微信小程序（唯一官方入口）
              MealKey Agent Platform Shell
                       |
       ---------------------------------
       |              |                |
   M-OPS 诊断      M-PNT 定位       M-MKT 营销
       |              |                |
   餐厅体检       品牌定位        营销方案
       |              |                |
              （均为 Plugin，非独立小程序）
```

战略句：

> **不是 100 个小程序，而是一个餐饮 AI 超级入口，下面挂 100 个可插拔 Agent。**

对齐 OS 定位：小程序解决入口，Agent 解决能力，Brain 解决长期资产。

---

## 1. 微信生态三层（冻结）

| 层 | 是什么 | 谁用 |
|----|--------|------|
| **L1 官方入口** | MealKey Mini Shell：1 AppID，发现/安装/运行插件 | 普通餐饮老板 |
| **L2 Agent 市场** | Marketplace：能力橱窗与安装授权（Web/OS/Shell「我的能力」同源） | 老板选装能力 |
| **L3 伙伴品牌小程序** | 第三方自有小程序 + 自有品牌/用户，经 Gateway 读写 Brain | 美团类合作方、垂直 SaaS |

```text
                  微信
                    │
          MealKey Agent 小程序（Shell）
                    │
          Restaurant Brain（经 Gateway）
                    │
        Agent Runtime Platform（插件）
        --------------------
        M-OPS / M-PNT / M-MKT / …
        第三方 Plugin …
        --------------------
              Gateway
                    │
             MealKey Core
```

---

## 2. 为什么禁止「一 Agent 一小程序」（官方路径）

| 问题 | 后果 |
|------|------|
| 用户资产分裂 | A 小程序认识「湘味馆」，B 不知道，C 重新采集 |
| 流量价值浪费 | 每个小程序重复获客/登录/授权/分享/留存 |
| 没有经营大脑 | 拆成工具集，**Restaurant Brain** 无法成为共享长期资产 |

正确依赖：

```text
微信入口 → Mini Shell →（绑定）Restaurant Brain → Agent Plugins 共享同一档案
```

Shell **不**私建第二套 Brain 存储；只持会话与轻量档案投影，事实经 Gateway ↔ Core Brain。

---

## 3. Shell 产品架构（冻结）

### 3.1 职责边界

| Shell 做 | Shell 不做 |
|----------|------------|
| 微信登录 / Guest→Bound→Member | 垂直 Skill 推理 |
| 统一「我的餐厅」档案入口 | 拍板 / 决策室 / 七常委 |
| 发现能力 · 安装态 · 燃料余额 | Prisma / 直连 Brain 库 |
| 加载 Plugin 页面/组件 | 每个能力单独发版小程序 |
| 升级「进入经营大脑」 | 伪造已批准决策 |

### 3.2 信息架构（移动端优先 · 深度 ≤3）

```text
Tab 首页 · 发现
  L1 推荐能力卡（1 主推体检 + 列表）
  L2 能力详情（卖点 · 消耗 · 安装）
  L3 Plugin 运行 / 报告

Tab 我的能力
  L1 已安装列表
  L2 运行入口 / 最近报告

Tab 我的
  L1 餐厅名片 · 燃料 · 邀请 · 进入经营大脑
  L2 档案编辑 · 账单 · 设置
```

首屏预算：品牌 + 一句价值 + 1 个主能力 CTA（默认「免费 AI 餐厅体检」）+ 次级「更多能力」。禁仪表盘墙。

### 3.3 Shell 子系统

```text
┌─────────────────────────────────────────┐
│ Mini Shell                              │
│  AuthSession │ RestaurantBinder         │
│  FuelWalletView │ InviteGraph           │
│  CapabilityCatalog │ InstallState       │
│  PluginHost（路由·权限·生命周期）         │
│  HandoffToBrain                         │
└─────────────────────────────────────────┘
```

| 子系统 | 职责 |
|--------|------|
| **AuthSession** | openid/unionid；手机号绑定；会话 token |
| **RestaurantBinder** | 创建/选择当前餐厅；映射 `mealkeyRestaurantId` |
| **FuelWalletView** | 经营点投影；本次消耗预估 |
| **InviteGraph** | 经营合伙人归因与有效用户校验 |
| **CapabilityCatalog** | Listing 投影（官方+已审第三方 Plugin） |
| **InstallState** | Entitlement；未安装禁止生产 Gateway |
| **PluginHost** | 打开插件、注入 `ShellContext`、回收结果 |
| **HandoffToBrain** | 深链 OS；主 CTA 文案冻结 |

### 3.4 第一次价值（转化漏斗 · 冻结）

```text
扫码「免费 AI 餐厅体检」
  → 30–60s：城市 / 品类 / 店龄（最少字段）
  → 经营画像 + 风险/机会（≤L3，有证据）
  →「想持续跟踪？进入 MealKey 经营大脑」
```

目标三角：

1. **引导进入经营大脑**（App/Web；主 CTA 非「下载」话术抢位）  
2. **用户信息采集** → User → Restaurant → Brain  
3. **裂变** → 有效用户双边奖励（见平台文）

---

## 4. 两种第三方模式（冻结）

### 4.1 模式 1（推荐）：Agent Plugin

第三方 **不**开发微信小程序。只交付：

```text
Agent Backend
+ Agent UI 组件/页面包（Plugin UI）
+ Agent Protocol（Manifest · Skill · Ports）
+ BillingManifest
```

上线后用户在 Shell「我的能力」看到同一列表（经营诊断、菜单优化、采购优化…）。

### 4.2 模式 2：第三方独立小程序（伙伴）

允许自有品牌小程序（自有用户/获客），但 **必须**：

```text
第三方小程序 → MealKey Agent Gateway → Restaurant Brain
```

| 允许 | 禁止 |
|------|------|
| 自有 UI/品牌/运营 | 私有永久业务事实库替代 Brain |
| 经 Gateway Context/Ingress | 直连 Prisma / 伪造 Context |
| 引导用户合并到 MealKey Account（unionId/手机） | 宣称自己是 MealKey 官方 Shell |
| 调用已安装能力 | 绕过 Entitlement 读生产数据 |

类比：小程序 ≈ App；Agent ≈ 能力服务。模式 2 是生态合作伙伴，**不是**官方老板主入口的替代品。

### 4.3 模式选择闸门（提审）

| 申请 | 默认 |
|------|------|
| 能力进官方 Shell | **必须** 模式 1 Plugin |
| 另开独立 AppID | 模式 2；须伙伴合同 + Gateway 合规审计 |
| 一能力一官方小程序 | **否决** |

---

## 5. Agent Plugin 运行规范（冻结）

### 5.1 Plugin 定义

一个 Plugin = 可被 Shell `PluginHost` 加载的能力单元：

```text
Plugin
= agentId
+ AgentManifestV1
+ PluginUiBundle（页面路由表 + 组件）
+ Skill Runtime（外置 HTTPS）
+ BillingManifestV1
+ MiniProgramManifestV1（host=mealkey_agent_hub 或 partner_miniprogram）
```

### 5.2 `ShellContext`（注入插件 · 只读）

Shell 打开插件时注入（不得由插件篡改身份字段）：

```ts
type ShellContextV1 = {
  schemaVersion: "1.0"
  session: {
    userId: string
    status: "guest" | "bound" | "member"
    wechatOpenId: string
  }
  restaurant: {
    localProfileId: string
    mealkeyRestaurantId?: string
    name: string
    city?: string
    category?: string
  }
  entitlements: {
    agentId: string
    installed: boolean
    scopesGranted: string[]
  }
  fuel: {
    balancePoints: number
    estimatedCostPoints?: number
  }
  userAccessToken: string           // 短时；禁持久化到不安全存储
  invokeId: string
  locale: "zh-CN"
}
```

插件拉业务事实：只用 `userAccessToken` + Gateway `getRestaurantContext`，**禁止**信任插件本地伪造的餐厅 DNA。

### 5.3 Plugin 生命周期

```text
discover → install → open(ShellContext)
  → previewCost → confirmSpend?
  → runSkill（Agent Backend）
  → submitIngress
  → renderReport（≤ freePreviewRatio 可模糊）
  → handoff | continue
close → Shell 回收 token
```

| 钩子 | 谁实现 | 说明 |
|------|--------|------|
| `onOpen(ctx)` | Plugin UI | 读 ctx，拉 Context |
| `onRun()` | Plugin UI → Backend | 扣费闸门在 Shell/BFF |
| `onIngress(ack)` | Plugin UI | `ack.ok` 前不得宣称已同步今日 |
| `onHandoff()` | Shell | 统一深链经营大脑 |
| `onClose()` | Shell | 清短时凭证 |

### 5.4 UI 挂载方式（V1）

| 方式 | 用途 | 约束 |
|------|------|------|
| **Native Plugin Pages** | 官方/可信插件原生页 | 走 Shell 路由表注册 |
| **受控 web-view** | 复杂外置 UI | 域名白名单；仅收 `postMessage` 契约事件 |
| **组件片段** | 卡片/结果块嵌入报告 | 无独立路由权 |

V1 **不**开放任意第三方执行 `eval` / 动态下发可执行脚本。UI 包经审核静态发布。

### 5.5 `PluginUiEventV1`（Shell ↔ Plugin）

```ts
type PluginUiEventV1 =
  | { type: "fuel.quote"; costPoints: number }
  | { type: "fuel.spend_confirmed" }
  | { type: "run.progress"; message: string }      // 禁假百分比权威
  | { type: "run.completed"; invokeId: string }
  | { type: "ingress.submitted"; ok: boolean }
  | { type: "handoff.brain"; reason: "upgrade" | "continue_tracking" }
  | { type: "auth.bind_phone"; reason: "persist_profile" }
  | { type: "error"; code: string; message: string }
```

Shell 只处理白名单事件；未知事件丢弃并记审计。

### 5.6 安全与隔离

1. Plugin **零** Prisma；**零** Core 内网  
2. 生产调用必须 `installed === true`（继承 Gateway install 硬闸）  
3. `maxInsightLevel ≤ 3`（Shell 侧展示与 Ingress 双闸）  
4. 不得读取其他 `agentId` 的私有临时态  
5. 分享卡片必须带 Shell 路径 + 邀请归因，不得深链到未审外域钓鱼页  
6. Guest 可跑首次体验；**持久化报告/档案** 触发 `auth.bind_phone`

### 5.7 与四 Ports 的关系

Plugin 合法回写仍仅：`signal` | `insight` | `work` | `gap`（+ Learning 走既有通道）。  
禁止 Plugin 直出拍板合同或注册 `FounderAgentName`。

---

## 6. Brain 共享规则（冻结）

```text
所有 Plugin（及模式 2 伙伴小程序）
  → 同一 User / Restaurant
  → 同一 Restaurant Brain（经 Gateway）
```

| 写入 | 规则 |
|------|------|
| 轻量档案字段（店名/城市/品类） | Shell RestaurantBinder；进 Brain 服从 RIP 确认门禁 |
| 诊断 Signal / Insight | Ingress；证据强制 |
| Agent 私有草稿 | 仅 Agent 侧短时；不得冒充 Brain 事实 |

**核心资产是 Brain，不是某一个 Agent。**

---

## 7. 官方 Plugin 槽位示意（非立刻全开 Live）

| Plugin | 能力叙事 | Live 闸门 |
|--------|----------|-----------|
| M-OPS 餐厅体检 | 首发获客 · Reference | MVP 优先 |
| M-PNT 定位 | 品牌/定位能力面投影 | 服从停扩 |
| M-MKT 营销 | 营销方案能力 | 服从停扩 |
| 第三方供应链/财务/招聘等 | Marketplace 审核后挂 Shell | 飞轮后再放量 |

说明：四席战略判断仍在 Core/Council；此处「M-PNT/M-MKT」指 **可挂载的能力插件叙事/外置能力面**，不把小程序做成第五顾问席聊天室。

---

## 8. 开发者交付清单（Plugin）

| # | 交付物 | 备注 |
|---|--------|------|
| 1 | `AgentManifestV1` | Protocol |
| 2 | Skill Package + Sandbox 自测 | External |
| 3 | `PluginUiBundle` + 路由表 | 本文 §5 |
| 4 | `MiniProgramManifestV1` | `host=mealkey_agent_hub`（模式 1） |
| 5 | `BillingManifestV1` | 经营点价表 |
| 6 | Listing 资产 | Marketplace |
| 7 | （模式 2）伙伴小程序合规说明 | Gateway 审计包 |

---

## 9. 验收清单

1. 文档与产品口述均为 **1 Shell + N Plugin**，而非 N 小程序  
2. Shell 三 Tab IA 深度 ≤3；主 CTA 升级经营大脑  
3. Plugin 仅经 `ShellContext` + Gateway；无直库  
4. 模式 1 为第三方默认；模式 2 须伙伴闸门  
5. 多 Plugin 共享同一餐厅档案 / Brain 投影  
6. Ingress `ack.ok` 前无「已同步今日」  
7. UI 包静态审核；无动态任意脚本  
8. Live 数量服从 MVP 停扩  

---

## 10. 工程切片建议

| 切片 | 内容 | 状态（2026-07-22） |
|------|------|-------------------|
| S0 | 本文 + 平台文对齐；Developer Portal 提审项投影 | 文档已冻结 |
| S1 | Shell 骨架：Auth · Binder · 首页主推体检 | **已落地** `apps/mini-shell` + BFF `/api/v1/mini-shell/*` + `@mealkey/agent-sdk/mini-shell` |
| S2 | PluginHost + 首发 M-OPS Plugin 挂载 | **已落地** 原生页 `pages/plugins/restaurant-diagnosis`（完整引擎仍外置 M-OPS，Gateway 深接后置） |
| S3 | Fuel + Invite 有效用户 | 待办（现为本地燃料演示） |
| S4 | CapabilityCatalog 接 Marketplace Listing | 待办（现为 SDK 静态 catalog） |
| S5 | 模式 2 伙伴对接手册（后置） | 待办 |

---

## 11. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-22 | Shell 产品架构 · 三层生态 · Plugin 生命周期/ShellContext/事件 · 模式 1/2 · Brain 共享 · 验收 |
| V1.0a | 2026-07-22 | S1/S2 工程落地指针：`apps/mini-shell` · SDK `mini-shell` · BFF |

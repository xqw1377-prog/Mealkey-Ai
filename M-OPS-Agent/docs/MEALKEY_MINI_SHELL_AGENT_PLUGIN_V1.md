# MealKey Mini Program Shell · Agent 插件运行规范 V1

# Shell Product Architecture & Agent Plugin Runtime Freeze

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-22  
> **一句话：** **不是 100 个小程序，而是 1 个餐饮 AI 超级入口 + N 个可插拔 Agent。**  
> **配套：** `MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md`（获客/Token/裂变）· `M_OPS_DIAG_AGENT_V1.md`（首个挂载样板）  
> **冲突裁决：** Shell / 插件运行时以本文为准；商业闭环以 Platform 文为准；单 Agent 能力以各 Agent Freeze 为准。

---

## 0. 关键区别（必须先冻结）

### 0.1 错误理解（禁止）

```text
一个「小程序 Agent」下面挂 100 个独立小程序
→ 餐启诊断 / 餐启菜单 / 餐启选址 / … 挤满用户微信
```

### 0.2 正确结构（冻结）

```text
                微信小程序（唯一官方入口）
              MealKey Mini Shell
                       |
                 Restaurant Brain
                       |
       ---------------------------------
       |              |                |
   M-OPS 诊断      M-PNT 定位       M-MKT 营销
   餐厅体检        品牌定位         营销方案
       |              |                |
              （可插拔 · 可上架 · 可计费）
```

> **1 个小程序 + N 个 Agent 能力**  
> 小程序解决入口，Agent 解决能力，Brain 解决长期资产。

### 0.3 为什么不能 100 个小程序

| 问题 | 后果 |
|------|------|
| 用户资产分裂 | A 知「湘味馆」，B/C 重采；Restaurant Brain 形不成 |
| 流量价值浪费 | 每个小程序重复获客/登录/授权/分享/留存 |
| 没有经营大脑 | 每个 Agent 只是孤立工具，MealKey 核心资产流失 |

---

## 1. 微信生态三层（冻结）

```text
第一层 · MealKey 官方入口（主路径）
  MealKey Mini Shell（唯一官方小程序）
  → 面向普通老板 · 内置/上架 N 个 Agent

第二层 · Agent Marketplace（能力商店）
  财务 / 招聘 / 供应链 / 营销 …
  → 用户「安装能力」，仍在同一 Shell 内运行

第三层 · 第三方品牌小程序（合作伙伴，可选）
  美团经营助手 / 供应链公司自有小程序 …
  → 自有品牌与用户，经 MealKey Gateway 读写 Restaurant Brain
```

**关系类比：**

| 微信生态 | MealKey |
|----------|---------|
| 小程序 ≈ App 容器 | Mini Shell ≈ 官方超级入口 |
| 能力服务 | Agent Plugin ≈ 可插拔能力 |
| 开放平台调用 | Gateway ← 第三方独立小程序 |

---

## 2. 端到端架构（冻结）

```text
                  微信
                    |
          MealKey Agent 小程序
              (Mini Shell)
                    |
          Restaurant Brain
           （餐厅经营大脑）
                    |
        Agent Runtime Platform
        --------------------
        M-OPS / M-PNT / M-MKT
        M-HR / M-Supply / M-Finance
        + 第三方 Plugin Agents
        --------------------
              Gateway
                    |
             MealKey Core
```

| 层 | 职责 | 明确不做 |
|----|------|----------|
| **Mini Shell** | 唯一微信入口、导航、身份、Token、裂变、Agent 路由、轻量 Brain 读写 | 不承载业务公式；不自持 LLM Key；不做第 2 个官方小程序 |
| **Restaurant Brain** | 门店档案、证据、历史 Run、跨 Agent 共享上下文 | 不因 Agent 切换而分裂为多套店档 |
| **Agent Runtime** | 加载 Plugin、注入 Context、执行、回收结果/信号 | Agent 不得私建账号/计费/Brain |
| **Gateway / Core** | 协议、权限、计费结算、经营大脑深度能力 | 不要求每个 Agent 自建微信壳 |

---

## 3. Mini Shell 产品架构（冻结）

### 3.1 信息架构

```text
MealKey Mini Shell
├─ 首页
│   ├─ 当前餐厅（Brain 卡片）
│   ├─ 继续上次 / 最近报告
│   └─ 主推首价值 Agent（如免费餐厅体检）
├─ 能力（Marketplace 入口）
│   ├─ 已安装 / 官方推荐
│   ├─ M-OPS 餐厅体检
│   ├─ M-PNT 品牌定位
│   ├─ M-MKT 营销方案
│   └─ …（第三方上架）
├─ 大脑
│   ├─ 我的餐厅档案（共享）
│   ├─ 证据与历史 Run
│   └─ 进入 MealKey 经营大脑（App/Web）
└─ 我的
    ├─ 微信身份 / 手机绑定
    ├─ Token
    └─ 经营合伙人（裂变）
```

### 3.2 Shell 子系统（必须与 Agent 解耦）

| 子系统 | API 语义（逻辑） | Agent 可否自建 |
|--------|------------------|----------------|
| Auth | `getSession()` → openid/unionid/userId | ❌ |
| Brain | `getRestaurant()` / `patchRestaurant()` / `listEvidence()` | ❌ |
| Wallet | `getBalance()` / `charge(agentId, sku)` | ❌ |
| Router | `openAgent(agentId, params)` | ❌（仅声明路由） |
| Handoff | `publishRun(result)` → Brain + 可选经营大脑 | ❌ |
| Referral | 邀请码归因 | ❌ |
| HostLLM | `requestInterpretation(payload)`（可选） | ❌ 直连 Key |

### 3.3 工程目录目标态（本仓过渡）

```text
miniprogram/                    # → 演进为 Mini Shell
├── shell/                      # 身份 · Brain · Token · 路由 · 我的
├── runtime/                    # Plugin 加载 · Context 注入 · 计费闸
├── agents/
│   └── restaurant-diagnosis/   # 首个官方 Plugin（现 pages/* 迁入）
├── libs/                       # 引擎打包产物（按 Agent）
└── app.js                      # 仅 Shell 启动
```

**过渡裁决：** 当前 `miniprogram/` 整仓视为 **Shell + 单一内置 Agent** 的原型；抽 Shell 时禁止把 `m-ops-diag` 公式搬进 Shell。

---

## 4. 两种接入模式（冻结）

### 4.1 模式 1（推荐）：Agent Plugin

第三方 **不开发微信小程序**，只交付：

```text
Agent Backend（或纯 Package）
+ Agent UI 组件（Shell 内页面/区块）
+ Agent Protocol（Gateway 合规）
+ BillingManifest（Token 价目）
```

上架后，老板在同一 MealKey 里看到「采购优化」等能力，共享同一 Restaurant Brain。

### 4.2 模式 2（允许）：第三方独立小程序

例如「美团经营助手」自有小程序 + 自有品牌用户，经 **MealKey Agent Gateway** 接入：

```text
第三方小程序 → Gateway → Restaurant Brain / Agent Runtime
```

约束：

- 必须 OAuth / 租户授权读写 Brain  
- 不得伪造 MealKey 官方入口品牌  
- 计费与权限仍走 Gateway  
- **不能替代** 官方 Mini Shell 作为 MealKey 主获客入口  

### 4.3 模式选择

| 场景 | 模式 |
|------|------|
| 普通能力上架、要共享 Brain | **Plugin（推荐）** |
| 大品牌自有流量与品牌 | 独立小程序 + Gateway |
| MealKey 官方能力 | Plugin，内置于 Shell |

---

## 5. Agent Plugin 运行规范（冻结）

### 5.1 插件包结构

```text
AgentPluginPackage
├── AgentManifest          # 身份与能力边界
├── MiniUiManifest         # Shell 内路由与页面
├── BillingManifest        # Token / 欢迎金 / Demo
├── runtime
│   ├── localEngine?       # 可选：纯 TS 包（如 m-ops-diag）
│   └── remoteSkill?       # 可选：Gateway Skill
└── ports                  # signal / insight / gap / handoff
```

### 5.2 AgentManifest（最小字段）

```text
agentId            // 全局唯一，如 restaurant-diagnosis
family             // m-ops | m-pnt | m-mkt | …
displayName        // 餐厅经营体检系统
maxInsightLevel    // 与 Protocol 一致
inputs             // 所需 Brain 字段 / 上传物
outputs            // consultation / signals / …
refusePolicy       // 缺数拒签，不编故事
firstValueSlaSec   // 首价值 SLA，建议 ≤180
sharesBrain        // 必须 true（Plugin）
allowsStandaloneMp // 默认 false；仅模式 2 为 true
```

### 5.3 MiniUiManifest（最小字段）

```text
entryRoute         // /agents/{agentId}/home
pages[]            // Shell 注册的页面路径
components[]       // 可复用区块
requiredAuth       // none | guest | bound
contextKeys[]      // 启动时向 Shell 申请的 Brain 字段
deepLinks[]        // 扫码/分享进入参数
```

### 5.4 BillingManifest（最小字段）

```text
skus[]             // { sku, title, tokenCost }
welcomeEligible    // 是否吃欢迎 Token
blockFirstValue    // 必须 false：不得挡首价值出报告
demoAllowed        // 合成数据演示是否开放
```

### 5.5 Runtime 生命周期

```text
1. resolve(agentId)           Shell 从 Marketplace/本地注册表解析插件
2. authGate(requiredAuth)     不足则引导微信授权 / 绑手机（保存档案）
3. injectContext(contextKeys) 注入 Restaurant Brain 切片（只读为主）
4. charge(sku) | softGrant    计费闸；首价值不得硬失败
5. execute(local|remote)      引擎/Skill 运行
6. publishRun(result)         写 Brain：摘要、证据引用、handoff
7. emitPorts(signals…)        经 Gateway 进入经营大脑（若已绑定）
8. navigate(resultUi)         Shell 内结果页；CTA → 经营大脑
```

### 5.6 Context 注入契约（共享 Brain）

Plugin **只读优先**申请：

```text
restaurant_id, name, city, category, stage
recent_runs[], evidence_refs[], dna_summary?
```

写入必须经 Shell：

```text
patchRestaurant(partial)     // 字段级白名单
appendEvidence(cards[])
publishRun(archive)
```

**禁止：** Plugin 本地另建「第二套店档」且不回写 Brain。

### 5.7 安全与合规硬闸

| 闸 | 规则 |
|----|------|
| LLM | Agent / Plugin **永不**配置 API Key；解读只走 Host |
| 外采 | 禁止假爬虫；live 仅合规适配器 + 授权 |
| 身份 | 禁止自建登录态绕过 Shell |
| 计费 | 禁止私设积分；扣减只在 Shell/Gateway |
| 品牌 | Plugin UI 可有能力名，不得冒充「第二个 MealKey 小程序」 |
| 拒签 | 缺数拒签；禁止生成无证据长文冒充会审 |

---

## 6. Restaurant Brain 在 Shell 中的最小模型

```text
User ←(微信)─ Session
  └─ RestaurantProfile[]          // 老板可多店，当前店上下文
        ├─ facts / stage
        ├─ Evidence[]
        ├─ AgentRun[]             // 跨 Agent 历史
        └─ sharedSignals[]        // 供其他 Agent 消费的摘要
```

**冻结原则：**  
切换 Agent ≠ 切换档案。从「体检」进「营销」，默认同一家「湘味馆」。

---

## 7. 官方入口的三项目标如何落在 Shell

| 目标 | Shell 落点 |
|------|------------|
| **引导经营大脑** | 首价值（如 30 秒～3 分钟体检）后 CTA「进入 MealKey 经营大脑」，非「下载 App」主文案 |
| **用户信息采集** | 微信 openid/unionid → Guest；保存档案绑手机 → User↔Restaurant↔Brain |
| **裂变** | 同一 Shell 内合伙人计划；有效完诊再发 Token（细则见 Platform 文） |

首价值示例路径（M-OPS）：

```text
扫码「免费 AI 餐厅体检」
 → 城市 / 品类 / 店龄（可再导入账本）
 → 经营画像 + 风险/机会
 → 想持续跟踪？进入经营大脑
```

---

## 8. 新增 Agent 在哪开发？（冻结）

**不是**在本仓某个「总文件」里继续堆逻辑，也**不是**再开一个微信小程序。

### 8.1 推荐落点

```text
每个新 Agent = 独立 Agent 仓（或 monorepo 下独立 package）
  ├─ packages/<agent-engine>/     # 规则引擎 / Skill（类似 @mealkey/m-ops-diag）
  ├─ AgentManifest + BillingManifest + MiniUiManifest
  ├─（可选）桌面 Web atelier：web/ 单 Agent 宿主
  └─ 挂载到官方 Mini Shell：
        miniprogram/agents/<agentId>/   # 仅 UI 页 + manifest，不抄 Shell
```

| 你要做的 | 做 | 不做 |
|----------|----|------|
| 官方新能力（如 M-PNT） | **新仓或新 package** + Shell 下 `agents/<id>/` 挂载 | 塞进 `packages/m-ops-diag` |
| 第三方能力 | Plugin 包提交 Marketplace（模式 1） | 默认再申请一个微信小程序 |
| 大品牌自有入口 | 自有小程序 + Gateway（模式 2） | 冒充官方 MealKey Shell |
| Shell 本身（身份/Token/Brain） | 只在 **Mini Shell 仓**（现过渡于本仓 `miniprogram/shell|runtime`） | 每个 Agent 复制一套 |

### 8.2 本仓（M-OPS-Agent）的定位

本仓只是 **第一个样板 Agent**：`restaurant-diagnosis`。

- 引擎：`packages/m-ops-diag`  
- 小程序挂载：`miniprogram/agents/restaurant-diagnosis/`  
- Web 宿主：`web/`（单 Agent atelier，见 `MEALKEY_WEB_AGENT_HOST_V1.md`）  
- Shell 过渡：`miniprogram/shell|runtime`（将来可抽到独立「MealKey Mini Shell」仓）

**禁止：** 把品牌定位 / 营销 / 招聘公式继续写进本仓 `m-ops-diag`。  
**允许：** 在本仓 `miniprogram/agents/` 下加**占位**第二 Agent（如现有 `m-pnt-brand`）仅用于证明挂载；正式能力仍应独立成仓后再挂入。

### 8.3 最小交付清单（新 Agent）

1. `agentId`（Gateway 全局唯一）  
2. 引擎 Package（零 LLM Key）  
3. 三联 Manifest（Agent / MiniUi / Billing）  
4. Shell 内入口页（或远程 UI 组件）  
5. `sharesBrain: true` + `publishRun`  
6. 注册进 `runtime/registry`（或未来远程注册表）

### 8.4 本仓映射与演进

| 现状 | 目标 |
|------|------|
| `miniprogram/` 含 Shell 过渡 | Shell 可外抽；本仓只留 M-OPS Plugin |
| `handoff.js` 剪贴板交接 | `publishRun` → Brain |
| `mealkey-cta` → 经营大脑 | Shell「大脑」Tab 统一出口 |
| 无 Marketplace | Shell「能力」Tab + 远程注册表 |
| 无多 Agent Context | `runtime/injectContext` |

**样板 Agent：** `restaurant-diagnosis`（`@mealkey/m-ops-diag`）= 第一个 Plugin 合规样板：零 LLM Key、可拒签、可 handoff、可首价值。

---

## 9. 明确不做

- 官方再拆第 2、第 3 个「餐启××」小程序承载能力  
- Agent 自建微信登录 / Token / 店档  
- Plugin 阻断首价值报告  
- 用独立小程序模式规避 Brain 共享（模式 2 须走 Gateway 授权）  
- 把兄弟垂直公式堆进 `m-ops-diag` 或 Shell 核心  

---

## 10. 实施波次（Shell / Plugin）

| 波次 | 内容 | 验收 |
|------|------|------|
| **S0** | 术语与文档冻结；CTA 经营大脑 | 本文 + Platform 一致 |
| **S1** | 目录拆 `shell/` + `agents/restaurant-diagnosis/` | 单 Agent 行为不回归 |
| **S2** | `injectContext` + 当前餐厅全局态 | 进件一次，Agent 间复用店名 |
| **S3** | `runtime.charge` + 欢迎 Token 流水（可先本地模拟） | 首价值不被挡 |
| **S4** | 第二个官方占位 Agent（可先空壳页） | 证明「1 Shell · N Agent」 |
| **S5** | Plugin Manifest 校验器 + Marketplace 列表 | 第三方按清单可提交 |

---

## 11. 一句话

> **MealKey Mini Shell = 餐饮 AI 超级入口；Agent = 可插拔能力；Restaurant Brain = 长期资产。**  
> 微信里只留一个官方小程序；一百个能力，而不是一百个入口。

**落地状态（2026-07-22）：**  
- 本文 V1.0 **架构与插件规范冻结**  
- **本仓母体已全量可验收**：Shell Tab · Agent 路径 · wx.login 可接线 · Brain 同步队列 · Token/裂变 · Marketplace 样例 · backend `/wechat/session`·`/brain/sync`  
- **刻意不做：** 独立 `MealKey-Mini-Shell` 仓（见 Extract 文）；微信生产 code2session 需配 AppSecret  

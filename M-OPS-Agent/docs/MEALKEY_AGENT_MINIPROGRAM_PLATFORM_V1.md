# MealKey Agent Mini Program 平台架构设计 V1

# External Agent Acquisition & Commercial Loop Freeze

> **版本：** V1.0  
> **状态：正式冻结（Freeze）** — 获客入口 / 身份 / Token / 裂变 / Hub 挂载真源  
> **日期：** 2026-07-22  
> **归属：** MealKey Agent Ecosystem（平台层，非单 Agent 能力说明书）  
> **配套：** `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md`（Shell / 插件运行时）· `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_MINIPROGRAM_CAPABILITY_UPGRADE_V1.md` · `M_OPS_DIAG_UX_V1.md`  
> **冲突裁决：** 平台商业闭环以本文为准；**1 Shell · N Agent** 运行时以 Mini Shell 文为准；单 Agent 引擎能力仍以各 Agent Freeze 为准。二者冲突时见 §0.3。

---

## 0. 战略裁决（冻结）

### 0.1 一句话

> **不是 100 个小程序，而是 1 个 MealKey Mini Shell + N 个可插拔 Agent。**  
> 小程序 = 获客与首价值入口；Agent = 能力；Restaurant Brain = 长期资产；App/Web = 经营大脑深度场。  
> 外部 Agent 不再以「独立下载 App」或「每个 Agent 一个小程序」为默认路径。

### 0.1.1 关键区别（再冻结一次）

| 错误 | 正确 |
|------|------|
| 一个「小程序 Agent」下挂 100 个独立小程序 | **一个官方微信小程序（Mini Shell）里运行 100 个 Agent 能力** |
| 用户微信里一排「餐启诊断/菜单/选址…」 | 用户微信里 **只有一个 MealKey**，能力在「能力/Marketplace」里安装使用 |

### 0.2 为什么冻结这个方向

餐饮老板现实：

| 现实 | 产品含义 |
|------|----------|
| 不愿下载陌生 App | 禁止把「下载 App」做成体验前提 |
| 微信是最高频工作入口 | 小程序 = 默认获客与第一次价值场 |
| 愿意扫码试一下 | 3 分钟出可核验结果，再谈绑定 |
| 高价值用户要沉淀主系统 | Guest → 手机绑定 → MealKey Account → 经营大脑 |

独立 App 路径（广告→下载→注册→登录→授权→体验）摩擦过高；小程序路径少约 80% 步骤。

### 0.3 与既有「双壳 / 完整体检」的冲突裁决

既有冻结（`M_OPS_DIAG_AGENT_V1.md`）：小程序必须能独立完成完整经营体检，禁止付费墙挡住体检，禁止暗示「没 App 体检不完整」。

**本文不推翻该原则，而是升维商业闭环：**

| 维度 | 冻结裁决 |
|------|----------|
| **第一次价值体验** | 必须在小程序内完成、可感知、可核验（如完整规则体检 / 会审报告）。**不得**要求下载 App 才能出首份报告 |
| **「解锁经营大脑」文案** | 指的是**持续经营覆盖面**（每日扫描、利润深析、客群/竞争变化、AI 顾问、多店云档案），**不是**「你的首份体检只做了 30%」 |
| **禁止话术** | 「下载 App 才能看完整报告」「没 App 体检不完整」「先付费再诊断」 |
| **推荐话术** | 「首份体检已完成 · 进入 MealKey 经营大脑，开启每日扫描与长期档案」 |
| **Token** | 面向**重复调用 / AI 算力 / 多 Agent 工具**；欢迎 Token 覆盖首次体验；**不得**用 Token 阻断首份规则体检出报告 |
| **单仓现状** | 本仓 `miniprogram/` = **Mini Shell + 单一内置 Agent** 原型；目标见 `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md` |

---

## 1. 总体架构（冻结）

```text
                  微信
                    |
          MealKey Mini Shell（唯一官方小程序）
                    |
          Restaurant Brain
                    |
        Agent Runtime（N 个可插拔 Agent）
        M-OPS / M-PNT / M-MKT / …
                    |
              Gateway → MealKey Core / 经营大脑
```

微信生态三层（摘要；细则见 Mini Shell 文）：

1. **官方入口**：一个 Mini Shell，内跑 N 个 Agent  
2. **Marketplace**：安装能力，仍在同一 Shell  
3. **第三方品牌小程序（可选）**：经 Gateway 接 Brain，不替代官方入口  

**分层职责：**

| 层 | 职责 | 不做 |
|----|------|------|
| **Mini Shell** | 获客、授权、路由、Token、裂变、Brain 轻量读写 | 第 2 个官方小程序；自持 LLM Key |
| **Agent Plugin** | 确定性能力 / 规则引擎 / 证据与拒签 / Shell 内 UI | 自管账号；自建店档；绕过计费 |
| **Restaurant Brain** | 跨 Agent 共享的餐厅长期资产 | 随 Agent 分裂多套档案 |
| **经营大脑 App/Web** | 今日雷达、AI 解读、决策室、多店深度 | 替代 Shell 完成「第一次价值」 |

---

## 2. 小程序统一框架：Mini Shell（冻结）

### 2.1 一个小程序，不多个

**禁止：** 每个 Agent 单独申请一个官方小程序（资产分裂、流量浪费、Brain 形不成）。

**冻结：** 仅 **一个** MealKey **Mini Shell** 官方小程序（对外可称「MealKey」）。  
挂载 / Plugin 运行规范 → `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md`。

### 2.2 信息架构（摘要）

```text
Shell：首页 · 能力（Marketplace）· 大脑 · 我的（Token/邀请/绑定）
Agent：/agents/{agentId}/* 挂在 Shell 内，共享当前餐厅上下文
```

### 2.3 Agent 如何挂载（摘要）

推荐 **Agent Plugin**（后端 + UI 组件 + Protocol + Billing），不是独立小程序。  
允许大品牌自有小程序经 Gateway 接入（模式 2），详见 Mini Shell 文 §4。

本仓过渡态：`miniprogram/` = Shell + `restaurant-diagnosis` 原型；抽 Shell 后 Agent 迁入 `agents/restaurant-diagnosis/`。

---

## 3. 用户身份体系（冻结）

### 3.1 渐进绑定（关键）

| 步骤 | 触发 | 拿到什么 | 用户感知 |
|------|------|----------|----------|
| **S0 匿名试用** | 扫码进入 | 本机草稿（可丢失） | 立刻能填店、能出报告 |
| **S1 Guest** | 微信授权（头像/昵称/openid/unionid） | `Guest Account` | 「用微信继续」 |
| **S2 Bound** | 要**保存经营档案** / 跨端同步 | 手机号绑定 → MealKey Account | 「保存你的餐厅经营档案」——**不是**「注册」 |
| **S3 Brain** | 点「进入经营大脑」 | App/Web 会话打通 | 长期经营，而非再体验一次 |

**禁止：** 打开工具就强制手机号；用「注册 MealKey」恐吓式文案。

### 3.2 核心数据模型

```text
User
  id
  wechat_openid
  unionid
  phone                 // S2 后可空→非空
  token_balance
  created_at

RestaurantProfile
  id
  user_id
  restaurant_name
  city
  category
  stage                 // 试营业/成长期…
  source_agent_id       // 首次创建来源 Agent
  updated_at

DiagnosisArchive        // 或通用 AgentRunArchive
  id
  user_id
  restaurant_id
  agent_id
  summary_json          // 可交接给经营大脑的 handoff
  created_at

ReferralEdge
  inviter_user_id
  invitee_user_id
  status                // pending | qualified | rewarded
  qualified_at
```

### 3.3 与本仓交接包的关系

现有 `mealkey.m-ops-diag.handoff.v1`（小程序导出 JSON）升级为：

- **本机过渡：** 剪贴板 / 本地档案  
- **平台态：** S1/S2 后自动写入 `DiagnosisArchive`，经营大脑拉取，不再依赖「手动复制」

---

## 4. Agent → MealKey 升级路径（冻结）

### 4.1 首价值体验（以经营体检为例）

```text
扫码 →（可选微信授权）→ 店名/城市/品类 → 导入或浅检
  → ≤3 分钟生成「我的餐厅健康报告」
  → 今日发现（主因 / 证据计数 / 优势 / 竞争提示）
  → CTA：进入 MealKey 经营大脑
```

报告必须先交付**可核验价值**，再出现升级层。

### 4.2 升级层文案结构（冻结）

标题：**解锁完整经营大脑**（或「开启每日经营大脑」）

| 小程序已交付 | 经营大脑增强 |
|--------------|--------------|
| 本次完整规则体检 / 会审 | 每日经营扫描 |
| 本周动作卡 / 复检 Δ（本机或云） | 菜品利润深析、客群变化 |
| 交接证据包 | 竞争变化追踪 |
| Token 工具入口 | AI 经营顾问、决策室回流 |

主按钮文案冻结为：

```text
进入 MealKey 经营大脑
```

副按钮可保留「继续用小程序工具」。  
**废弃主推：**「下载 MealKey App」作为唯一 CTA（下载可作为经营大脑内的端分发，而非获客主按钮）。

### 4.3 「30%」表述规范

若使用进度隐喻，必须标注为：

> **经营大脑覆盖进度**（持续能力），不是「本份体检完成度」。

本份体检完成度始终是 100% 可交付（或明确拒签缺数，而非锁报告）。

---

## 5. Token 体系（冻结）

### 5.1 定位

```text
Token = AI / 计算资源燃料
≠ 社交积分玩具
```

规则引擎轻量跑通可 **0 或极低 Token**；Host LLM、重分析、外采合规调用走价目表。

### 5.2 发放

| 事件 | Token | 说明 |
|------|------:|------|
| 新用户欢迎（S1 后） | **500** | 覆盖首次体验（如一次诊断 + 一次轻分析） |
| 有效一级邀请 | **100** | 见 §6 有效用户定义 |
| 有效二级邀请 | **20** | 最多两级，禁止三级及以上 |
| 运营活动 | 另案 | 不得破坏有效邀请门槛 |

### 5.3 消耗价目（V1 建议表，可运营调参）

| 功能 | Token | 备注 |
|------|------:|------|
| 经营诊断（规则会审，含首次） | 100 | 欢迎金覆盖；**首次出报告不得因余额不足失败**（可记欠账或欢迎金预授） |
| 差评分析 | 200 | |
| 菜单分析 | 300 | |
| 竞争分析 | 500 | |
| 完整经营报告（大脑深度包） | 1000 | 偏经营大脑侧 |

**硬闸：**

1. 首份规则体检：余额不足时仍出具报告，并提示「已用欢迎额度 / 绑定后同步档案」  
2. Agent 不得私设第二套积分  
3. 扣减发生在 Hub，回执写入流水；失败可重试，禁止静默双扣  

### 5.4 与「全免」的关系

- **获客层全免：** 第一次完整价值体验对老板心理免费（欢迎 Token / 规则引擎）  
- **生态层计量：** 多工具、重复 AI、深度包用 Token  
- 禁止把 Token 做成「没钱就不给看首份体检结论」

---

## 6. 裂变：MealKey 经营合伙人计划（冻结）

### 6.1 不是简单邀请奖励

品牌名：**MealKey 经营合伙人计划**（对内 `referral.v1`）。

### 6.2 有效邀请（防羊毛）

奖励仅在 **qualified** 时发放。有效用户必须同时满足：

```text
注册/授权（至少 S1）
+ 创建餐厅档案（RestaurantProfile）
+ 完成第一次诊断（AgentRun 成功且非纯空跑 Demo 刷量）
```

仅注册、仅扫码、仅打开首页 → **不发奖**。

### 6.3 层级

- 一级：100 Token / 有效人  
- 二级：20 Token / 有效人  
- **禁止**超过两级  

### 6.4 产品落点

- 「我的 → 邀请」：专属码 / 链路带 `inviter_user_id`  
- 被邀请人完成有效诊断后异步结算  
- 明细可查：待生效 / 已发放 / 风控拒绝  

---

## 7. 商业闭环（冻结）

```text
流量（扫码/分享/合伙人）
  → Hub 小程序
  → 免费 Agent 首价值
  → 微信身份（Guest）
  → 餐厅经营档案（绑定手机）
  → Token 体系 + 邀请裂变
  → MealKey Account
  → 经营大脑（App/Web）
  → 付费 / 高 Token Agent
  → 生态 Marketplace
```

成功判据（平台级，4～8 周）：

| 指标 | 目标方向 |
|------|----------|
| 扫码→首份报告完成率 | 显著高于「下载 App 后首启」 |
| S1 授权率 | 高（无强制手机） |
| S2 绑定率（保存档案） | 完诊用户中可观占比 |
| 有效邀请 / 总邀请 | 过滤羊毛后仍为正增长 |
| 经营大脑激活（完诊后 7 日） | 高价值用户沉淀，而非全员逼下载 |

---

## 8. 第三方 Agent 接入规范（冻结方向）

完整插件运行时与三联 Manifest 以 `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md` §5 为准。

摘要：

```text
Agent Plugin Package
  = Backend / Package
  + Shell 内 UI（MiniUiManifest）
  + Agent Protocol
  + BillingManifest
  + Marketplace Listing
```

| 模式 | 说明 |
|------|------|
| **Plugin（推荐）** | 不开发微信小程序；上架后进官方 Shell |
| **独立小程序（允许）** | 自有品牌流量；经 Gateway 接 Brain |

审核要点：不得自持 LLM Key；不得假外采；不得绕过身份与计费；首价值不得强制下载 App；不得拆官方多小程序。

---

## 9. 与本仓工程映射（过渡）

| 平台概念 | 本仓现状 | 下一步 |
|----------|----------|--------|
| Mini Shell | `miniprogram/` 单 Agent 原型 | 见 Mini Shell 文 S1：`shell/` + `agents/*` |
| 首价值 Agent | `restaurant-diagnosis` 已可独立完诊 | 保持；升级 CTA 改「经营大脑」 |
| 交接包 | `utils/handoff.js` | S1/S2 后改为云档案写入 |
| 复检提醒 | 本机 + 订阅占位 | 绑账号后进 Hub 消息 |
| Token / 邀请 | 未实现 | 另开服务与表结构，不进引擎包 |
| 身份 | 未实现 | 微信云开发或 MealKey Auth 桥 |

**引擎包 `@mealkey/m-ops-diag` 继续零账号、零 Token、零 LLM Key。** 计量与身份只在 Hub / Host。

---

## 10. 明确不做（防范围失控）

- 每个 Agent 一个小程序  
- 打开即强制手机号 / 强制下载 App  
- 用「报告锁 30%」伪装升级（报告本身必须可交付）  
- 三级及以上裂变、注册即发奖  
- Agent 内配置大模型 Key  
- 伪造外采结果刷 Token / 刷邀请  
- 未完成首价值闭环就做积分商城游戏化  

---

## 11. 实施波次（建议）

| 波次 | 内容 | 验收 |
|------|------|------|
| **W0** | 文案与 CTA 改「进入经营大脑」；废除主推「下载 App」 | 报告页/增强页话术符合 §4 |
| **W1** | 微信授权 Guest + 保存档案绑手机（可先云开发） | S0→S1→S2 跑通 |
| **W2** | Token 账本 + 欢迎 500 + 诊断扣减流水 | 首次体验不被余额挡住 |
| **W3** | 经营合伙人（有效邀请） | 非完诊不发奖 |
| **W4** | Hub 多 Agent 挂载骨架 | 第二工具可上架入口 |
| **W5** | Developer 三联 Manifest | 第三方可按清单接入 |

---

## 12. 一句话

> **一个超级入口，N 个可插拔 Agent；小程序获客，Agent 创首价值，Brain 沉淀长期资产。**  
> Token 是燃料，合伙人是增长，经营大脑是归宿——不是一百个小程序，也不是再下一个陌生 App。

**落地状态（2026-07-22）：**  
- 本文 V1.0 **商业闭环冻结**；运行时细节见 `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md`  
- 本仓工程仍处「Shell + 单 Agent 原型 + 交接包」过渡态  
- **W0 已对齐**：主 CTA「进入 MealKey 经营大脑」  
- **S1–S5 + 账号/裂变/市场可接线层已落地**（本仓完成；独立 Shell 仓仍延后）  
- 配置 `app.js` → `authApiUrl` / `brainApiUrl` / `marketplaceUrl` 接本地 backend `:8787`  

# MealKey Agent UI / 视觉交互框架 V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）** — **规范输出；实现外置**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` · `MEALKEY_AGENT_PROTOCOL_V1.md` · `MOBILE_THREE_EASY_IA_V1.md` · `MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md`（获客 Hub） · 外置仓 `M-OPS-Agent` 诊断 UX（见 `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`）  
> **一句话：** MealKey 输出 Agent 的 **UI 与视觉级交互框架**；**页面实现不在 MealKey 仓内新增**，由各 Agent 独立产品落地。  

---

## 0. 分工（冻结）

| 谁 | 做什么 |
|----|--------|
| **MealKey Core** | OS 宿主面：今日驾驶舱 · 决策室 · 我的餐厅 · 能力市场入口；**不**新建垂直 Agent 业务页 |
| **本框架文档** | 信息架构 · 组件语义 · 信任瞬间 · 与 OS 回跳规则 · 视觉层级 |
| **外接 Agent 产品** | 自有域名前端（如 `diagnosis.*`）完整实现本框架 |

**禁止：** 在 `apps/web` 为新 Agent 开业务路由树、新垂直工作台。  
**允许：** Core 只增加 Gateway 投影所需的最小展示（Signal 卡、Insight 摘要进今日/决策室）。

---

## 1. 三表面模型（获客层 + 双表面）

```text
┌──────── Acquisition Surface（微信 Hub · 见 Mini Program V1）──┐
│  发现工具 · 首次体验 · 微信身份 · 燃料 · 升级经营大脑           │
└──────────────────────────┬───────────────────────────────────┘
                           │ Slot 打开 / 深链
┌──────────────── Agent Surface（外置 / Hub 内页）──────────────┐
│  能力转化 · First Moment · 专业工作流 · 报告 · 支付           │
│  例：经营体检旅程（外置 M-OPS-Agent UX 或 Hub Slot）           │
└──────────────────────────┬───────────────────────────────────┘
                           │ SSO / 深链 / Ingress
┌──────────────── OS Surface（MealKey）────────────────────────┐
│  今日：Signal 卡 · 决策室：议题 · 执行：任务                   │
│  禁止在 OS 内复制整套 Agent 工作流                            │
└──────────────────────────────────────────────────────────────┘
```

用户可从微信 Hub 或 OS「安装的能力」进入 Agent Surface；Agent 产出经 Ingress 回到 OS。  
获客与插件运行真源：`MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md` · `MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md`（**1 Shell + N Plugin**；官方禁止一 Agent 一小程序）。

---

## 2. Agent Surface 信息架构（通用）

任何垂直 Agent 前端建议不超过 **深度 3**（对齐三易）：

```text
L0 首页/能力承诺
L1 主工作流（认识→判断→结果）
L2 详情/证据/历史（可折叠）
```

### 2.1 标准五段旅程（可裁剪）

| 段 | 目的 | 禁区 |
|----|------|------|
| **Onboarding** | ≤60s 建立身份锚点 | 长问卷、ERP 全表 |
| **Working** | 展示「正在基于证据研究」过程感 | 假进度、假百分比 |
| **Portrait** | 一句话经营认知 + 证据墙 | 假评分总分 |
| **Diagnosis Card** | Top-1 风险/机会（L1–L3） | 拍板 CTA、战略终局 |
| **Handoff** | 「回 MealKey 今日 / 进决策室」 | 在 Agent 内签字批准 |

诊断类样板细节：以外置仓 `M-OPS-Agent/docs` 为准（本仓仅指针 `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`）。

---

## 3. 视觉层级（框架级 · 非换肤指南）

Agent UI 须让人感到「专业经营工具」，而非聊天机器人。

### 3.1 层级

| 层级 | 用途 |
|------|------|
| **Hero 认知句** | 一句话「我们如何理解你的店」（有证据） |
| **证据层** | 可点开的 claim / 来源 / 时间 |
| **诊断卡** | severity 色点 + 标题 + 为什么 + 影响 |
| **次级列表** | 非 Top 问题折叠 |
| **系统回跳** | 明确次级按钮，不抢主诊断 |

### 3.2 硬性视觉禁令（与 OS 一致）

- 禁止无证据的大数字仪表盘充权威  
- 禁止「综合健康分 87」类假总分（除非有可审计公式且用户知情）  
- 禁止诊断页主 CTA「批准执行」  
- 禁止用聊天气泡作为主信息架构  
- 避免默认 AI 紫渐变堆砌；品牌色由 Agent 自定，但信息层级服从本框架  

### 3.3 状态表达

| 状态 | 表现 |
|------|------|
| 有证据 LIVE | 实心信号、可展开证据 |
| 骨架/缺口 | 诚实 Gap，引导补采 |
| 推断 | 文案标注「推断」，样式弱于事实 |
| 日扫增量 | 「今日变化」而非重出长报告 |

---

## 4. 交互组件语义（须实现于 Agent 仓）

| 组件 | 语义 | 数据来源 |
|------|------|----------|
| **IdentityStrip** | 店名·区位·品类·客单锚点 | Context `basic` |
| **EvidenceWall** | 顾客原话/来源卡片 | Context `review` |
| **DiagnosisCard** | L2/L3 主卡 | 本地 Skill + 将 Ingress 的 mirror |
| **GapList** | 缺什么证据 | port gap |
| **HandoffBar** | 回 OS / 请求开决策室 | 深链 + 已 submitIngress |
| **InstallGate** | 未授权 MealKey 时引导授权 | OAuth |

Core **不**提供这些业务组件的实现包为「再做一个前端」；可仅共享设计 token 文档（可选，后置）。

---

## 5. 与 OS 的跳转契约

### 5.1 Agent → OS

| 动作 | 目标 |
|------|------|
| 查看今日信号 | `{os}/dashboard?focus=signal&id=` |
| 讨论议题 | `{os}/…/decision-room?topic=`（仅 L4 认证或用户主动） |
| 打开能力市场 | `{os}/marketplace` |

须在 Ingress **成功**后再引导，避免空跳。

### 5.2 OS → Agent

| 动作 | 目标 |
|------|------|
| 打开已安装能力 | `{agentOrigin}/launch?restaurantId=&token=` |
| 从 Signal 深链回看 | `{agentOrigin}/diagnosis/{invokeId}` |

Token 短时委托；Agent 不得持久化 MealKey refresh token 到不安全存储。

---

## 6. 文案分层（交互文案规则）

必须可区分：

```text
事实（Observation）
  → 推断/模式（Pattern）
    → 诊断（Diagnosis）
      → 关注建议（≤L3）
```

禁混写。拍板句仅 OS 决策室。

---

## 7. MealKey 仓内允许的 UI 工作

| 允许 | 禁止 |
|------|------|
| 今日 Signal 卡样式与投影 | 新建 `/diagnosis` 完整业务站 |
| 决策室 Insight 摘要条 | 在 apps/web 实现 Agent 五页旅程 |
| 能力市场安装页 | 为新 Agent 加导航一级入口当「内置功能」 |
| 本文档与诊断 UX 真源维护 | 把外置 Agent UI 抄回 Core |

---

## 8. 官方样板

**餐厅经营诊断**：实现与体验文档均在外置仓 `C:\Users\xqw13\M-OPS-Agent`；MealKey 接入见 `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`。

---

## 9. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 双表面 · 五段旅程 · 视觉禁令 · 组件语义 · OS 跳转 · Core 禁建 Agent UI |
| V1.0a | 2026-07-22 | 增补 Acquisition Surface（微信 Hub）；与 Mini Program 平台 V1 对齐 |

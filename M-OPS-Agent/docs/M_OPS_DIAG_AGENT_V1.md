# M_OPS_DIAG_AGENT V1 · 餐厅经营诊断系统

# Agent Architecture Freeze Document

> **版本：** V1.0  
> **状态：正式冻结（Freeze）** — 能力边界与工程真源（非开发说明书）  
> **日期：** 2026-07-21  
> **归属：** MealKey Agent Ecosystem（L3 Tool Agent）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `M_OPS_DIAG_UX_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `M_OPS_MINIPROGRAM_CAPABILITY_UPGRADE_V1.md` · `MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md` · `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md` · `MEALKEY_WEB_AGENT_HOST_V1.md` · `MEALKEY_AGENT_PROTOCOL_V1.md` · `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` · `MEALKEY_RESTAURANT_BRAIN_V1.md` · `TODAY_RADAR_EXPERIENCE_V1.md`  
> **协议合规样板：** 本 Agent = Protocol + Platform Architecture 第一个垂直验证件  
> **形态目标：** 独立产品（独立 UI/后端/业务库）；经 Agent Gateway；现 `packages/m-ops-diag` 为过渡包，禁止再把兄弟垂直能力堆进 Core  
> **代码真源：** `@mealkey/m-ops-diag` · `packages/m-ops-diag` · Host `apps/web/src/server/services/m-ops-diag-client.ts`  
> **冲突裁决：** 与本文冲突时，以本文 + `AUTHORITY.md` 为准

---

## 0. 战略定位（冻结）

### 一句话

> **餐启经营诊断系统**，是一个持续观察餐厅经营状态的 AI 能力 Agent，通过内部经营事实与外部消费者反馈，发现经营风险与增长机会，并为 MealKey 决策系统提供高质量信号。

### 它解决的问题

老板每天最想知道：

> 我的店现在发生了什么？  
> 顾客怎么看我？  
> 有没有问题正在发生？  
> 什么地方值得关注？

### 产品命名（冻结）

| 项 | 冻结值 |
|----|--------|
| **Agent ID（Gateway / Store）** | `restaurant-diagnosis` |
| **Package** | `@mealkey/m-ops-diag`（引擎实现包名，≠ Gateway ID） |
| **产品中文** | **餐厅经营体检系统**（母体：餐启 · Mealkey） |
| **产品英文** | Restaurant Health Check |
| **UI 禁显** | 主标题不得裸露 `M-OPS-DIAG` / `m-ops-diag` |

能力族（**m-ops-diag = L3 感知器，不是第五 L1 席**）：

```text
m-pnt       品牌定位      （L1）
m-mkt       市场洞察      （L1）
m-biz       商业分析      （L1）
m-ed        股权设计      （L1）
m-ops-diag  经营诊断      （L3）
```

### 运行时（冻结）

- **V1 引擎 = 纯 TS Package（进程内）**，经 Gateway Skill 接入 Host  
- Host 薄 Bridge：`m-ops-diag-client`  
- **本仓允许「本地开发旁路」**：`src/backend-server.ts` + Scheduler + `.mops-data` JSON 存储，默认绑定 `127.0.0.1`，**不是** Architecture Freeze 中的生产 HTTP 服务化  
- 生产独立服务须另开授权；旁路须配置 `M_OPS_BACKEND_TOKEN`，禁止公网裸奔  

### 双壳形态（冻结）

> **同一引擎，两套壳。** 内核永远是 `@mealkey/m-ops-diag`（确定性规则诊断）；禁止做成「每个 Agent 一个重 App」。

| 壳 | 路径 | 必须能做的事 | 明确不做 |
|----|------|--------------|----------|
| **微信 Mini Shell（官方唯一入口）** | `miniprogram/`（过渡：Shell + 本 Agent） | 作为可插拔能力完成进件→会审→回填；共享 Restaurant Brain | 再拆第二个官方小程序；配置/直连大模型 |
| **Mealkey 母体 / App（经营大脑）** | Web 壳 + Gateway + App | 更详尽档案、Context、今日同步、解读、决策回流 | Agent 侧自建 LLM 网关 |

**商业分层（冻结）：**

- **1 个 Mini Shell + N 个 Agent**（见 `MEALKEY_MINI_SHELL_AGENT_PLUGIN_V1.md`）；本 Agent 是首个 Plugin 样板，不是独立「诊断小程序产品线」  
- 小程序内 **必须能独立完成完整经营体检**；**第一次价值体验**禁止付费墙 / 禁止「下载 App 才能出报告」  
- Mealkey App / Web = **长期经营大脑**——首诊之后的沉淀层，不是完成体检的前提  
- 获客 / Token / 裂变见 `MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md`  
- 主 CTA：「进入 MealKey 经营大脑」  

**大模型原则（冻结）：**

- Agent 本体 **永不** 配置 API Key、不直连任何 LLM  
- 自然语言解读 / 追问 / 增强 **仅** 在与 Mealkey 母体联用时由 Host 提供  
- 独立壳引导话术：「首份体检已完成；进入 MealKey 经营大脑，开启每日扫描与长期档案」

### 出口优先级（冻结 · 不二选一）

| 优先级 | 出口 | 宿主 |
|--------|------|------|
| **P0** | BusinessSignal / worldChanges | Daily Cockpit / 今日雷达 |
| **P1** | VerticalInsight → MKInsight | Decision Room / Council |

---

## 1. Agent 角色边界（冻结）

### 它是

- ✅ 经营观察者  
- ✅ 问题发现者  
- ✅ 证据整理者  
- ✅ 风险预警器  
- ✅ 决策输入提供者  

### 它不是

- ❌ 决策者  
- ❌ 战略顾问  
- ❌ 执行管理者  
- ❌ 七常委成员  
- ❌ M-PNT 定位专家 / 第五 `FounderAgentName`  

### 系统边界

```text
M-OPS-DIAG          发现问题（感知）
       ↓
Decision Intelligence   判断问题
       ↓
Decision Room / 七常委   压力测试与拍板场
       ↓
M-EXEC              解决问题（执行）
```

感知语义（冻结）：

```text
看见问题 → 识别异常 → 提供证据 → 生成经营洞察（非终局决策）
```

---

## 2. Agent 标准接口（冻结）

服从 MealKey Tool Agent Contract（`@mealkey/tool-agent-kit`）与本文 Contract。

### Input · `RestaurantDiagnosisRequest`

工程字段（代码 SSOT：`packages/m-ops-diag/src/contracts.ts`；可演进为 `contracts/request.ts`）：

```typescript
{
  restaurantContext: {  // identity
    brandName?, storeName?, category?, city?, address?, stage?, projectId?
  },
  facts?: Array<{ kind, claim, sourceRef?, asOf? }>,
  evidence?: Array<{     // externalEvidence + 可核验证据
    id?, source, claim, sentiment?, theme?, observedAt?, url?
  }>,
  focus?: "overall" | "service" | "product" | "traffic" | "competition" | "cost",
  // 产品文案别名：all→overall · customer→service/product 混合 · operation→service
  horizon?: "today" | "7d" | "30d"
}
```

缺证据 → 只报 `gaps[]`，**禁止装懂**。

### Output（三层 + 双出口）

见 §5。禁止直出：`FounderDecisionContract` · `DecisionPack` · 老板拍板句 · ERP 工单终局。

---

## 3. Evidence Layer（核心 · 冻结）

本 Agent 最大价值：**不是生成答案，而是建立餐厅经营证据库**，再由此投影 Findings / Signals。

### 证据来源三层

| 层 | 来源 | 示例 | 权重 |
|----|------|------|------|
| **L1 老板提供** | Identity / 问卷 / 自述 | 营业额、客单、店龄、店型、当前问题 | ★★★★★ |
| **L2 经营系统** | 未来 POS / ERP / 会员 / 库存 | 实流水、翻台、复购 | ★★★★★（V1 不做实时接入） |
| **L3 消费者反馈** | 外采与公开检索 | 点评 / 小红书 / 抖音 / 地图 | ★★★★☆ |

### L3 消费者反馈（V1 重点）

| 渠道 | 获取（目标能力） |
|------|------------------|
| **大众点评** | 星级、评论量、好/差评关键词、图片、消费场景 |
| **小红书** | 打卡内容、用户标签、场景描述、情绪 |
| **抖音** | 热度、视频内容、评论 |
| **地图** | 周边竞争、门店密度、商圈变化 |

V1 实现诚实：有检索源则采；无源则空证据 + `gaps`，**禁止编造星级/百分比**。

---

## 4. Diagnosis Engine（六大模块 · 架构冻结）

> **推理细则真源：** `docs/M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md`  
> （Health Model · E→F→P→Diagnosis→S · Impact Score · 闸门）

V1 **架构上冻结六大引擎**；**MVP 打穿 Customer + Operation（等待/服务主题）**，其余骨架占位，禁止假 LIVE。

### 4.1 Customer Insight Engine

> 顾客为什么来？为什么不来？

输出示例：

```json
{
  "strength": "场景体验强",
  "risk": "服务效率限制复购",
  "confidence": 0.86
}
```

### 4.2 Product Engine

> 你的产品为什么赢？

招牌 / 引流 / 利润 / 记忆产品（有证据才写）。

### 4.3 Competition Engine

> 你在竞争中的位置？

竞争地图（价格×体验等）；无源禁空话。

### 4.4 Operation Engine

> 经营机器哪里卡住？（人/货/场/客/钱；含原 Service 主题）

### 4.5 Brand Position Engine

> 现在距离目标品牌差多少？（M-PNT=意图；本引擎=现实落差）

### 4.6 Growth Engine

> 下一步哪里有增长空间？（新客×转化×复购×客单；机会信号非战略终局）

---

## 5. Diagnosis Output（推理链 · 冻结）

| Level | 名称 | 含义 | 例 |
|-------|------|------|----|
| **E** | Evidence | 可核验事实 | 近90天服务慢相关评论 +35% |
| **L1** | Finding | 发现 | 服务体验相关负向提及上升 |
| **L2** | Pattern | 模式 | 高峰期承载不足 |
| **L2.5** | Diagnosis | 根因方向 | 瓶颈在运营能力，而非产品吸引力 |
| **L3** | Signal | 经营信号 | `severity: HIGH` · 关注高峰服务流程 |

Finding/Pattern/Diagnosis 对应 `DiagnosisFinding.observation/pattern/meaning`。  
Signal 对齐 `@mealkey/business-signal-engine` / Host `worldChanges`。  
决策室另经 `VerticalInsight`（P1）。

---

## 6. 与 Daily Cockpit 集成（最高价值入口 · 冻结）

```text
定时/打开今日
    ↓
M-OPS-DIAG 运行（有证据才充实）
    ↓
生成 Signals / worldChanges
    ↓
Daily Cockpit / 今日雷达
    ↓
老板打开 →「店今天有没有问题」
```

展示示意（产品叙事，非强制文案）：

```text
早上好，老板。
今天发现 3 个经营信号：

🔴 服务风险 — 近7天等待相关差评增加
🟡 产品机会 — 招牌菜被主动推荐增多
🟢 品牌资产 — 小红书自然传播增长
```

工程现状：RIP 证据 → `collectMOpsDiagWorldChangesForScan` → `toDailyScanV1` 雷达；无证据不注入。

---

## 7. 与 Decision Room 集成（冻结）

```text
Signal →（老板/系统）Decision Case → Decision Room
```

例题：是否需要优化服务流程？  
进入五层决策：发生什么 → 为什么 → 选项 → 常委挑战 → 怎么决定。  
**拍板只在决策室**；m-ops-diag 只提供 Insight/证据，不代签。

---

## 8. 数据进化（冻结原则）

每一次诊断的**可验证结论**，经正式 Memory / Brain API 沉淀（**禁止 Engine 直写 Prisma 事实表**）：

```text
Restaurant DNA
  顾客认知 · 产品优势 · 经营弱点 · 变化趋势 · 老板决策历史
```

目标轨迹：

> 第一次：AI 认识你的店。  
> 第 100 次：AI 比新顾问更了解你的店。

Host 可缓存 `lastMOpsDiag` 于 profile（展示用）；Brain 写回须走既有门禁。

---

## 9. Package 结构（目标冻结）

目标树（演进方向；现有扁平 `src/*.ts` 须逐步迁入，禁止平行第二套协议）：

```text
packages/m-ops-diag/
  src/
    contracts/
      request.ts
      result.ts
    evidence/
      analyzer.ts
    engines/
      customer.ts
      product.ts
      service.ts
      brand.ts
      competition.ts
      growth.ts
    signal/
      builder.ts
    adapter/
      brain.ts
      insight.ts
    index.ts
```

Host（MealKey）：

```text
apps/web/src/server/services/m-ops-diag-client.ts
apps/web/src/server/routers/m-ops-diag.ts
```

---

## 10. V1 MVP 范围（冻结）

### 不做

| 不做 | 原因 |
|------|------|
| ❌ POS 实时接入 | L2 系统层后置 |
| ❌ 自动经营评分排行榜 | 假精确 |
| ❌ 完整竞争地图 | 范围膨胀 |
| ❌ 自动战略方案 | 属 Decision Intelligence |
| ❌ 生产 HTTP 服务化 / 第五顾问席 | 架构冻结；本地 Backend 旁路除外（见 §0 运行时） |

### 只做 · 一个令人惊艳的能力

> **输入一家餐厅名字 + 地址 + 品类，让 AI 在几分钟内告诉老板：顾客眼中的你、最大问题、最大机会。**

竖切：消费者反馈经营诊断（Customer + Service 主题优先）。

---

## 11. 与 Tool Agent 框架

- 四件套：Manifest · Engine · Ports · Bridge  
- Ports：`signal` + `insight` + `gap`（V1 不做 `work`）  
- 上架闸门见 `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md`  

---

## 12. 工程落地状态（对照 · 非放宽冻结）

| 项 | 状态 |
|----|------|
| 包骨架 + mock → signals | ✅ |
| Brain/RIP 只读 Bridge + tRPC | ✅ |
| 可选 live 外采 | ⚠️ 本仓：`M_OPS_COLLECTOR_MODE` + `registerLiveCollector`；默认 synthetic fixture |
| 今日雷达注入（有证据） | ✅（经 Gateway Ingress） |
| 六大 engines/ 目录迁入 | ✅ `packages/m-ops-diag/src/engines/*` |
| 本地 Backend 旁路 | ✅ `127.0.0.1` + token；非生产 HTTP 服务化 |
| UX 首次体验打穿 | ⏳ 持续迭代 |

---

## 13. 下一步（产品顺序 · 冻结）

**已冻结：** UX · 采集 · **诊断模型 V1.1** `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1_1_DETAIL.md` · `M_OPS_DIAG_REASONING_ENGINE_V1_1.md` · `M_OPS_DIAG_KNOWLEDGE_MODEL_V1_2.md`  

**下一刀：** `M_OPS_DIAG_DATA_INTELLIGENCE_V1_1.md` · `M_OPS_DIAG_REASONING_ENGINE_V1_1.md` · `M_OPS_DIAG_KNOWLEDGE_MODEL_V1_2.md`  
先完成数据采集 / 外部情报 / 诊断推理 / 知识模型四条真源，再推进 AI 推理架构、生命周期管理与六大引擎竖切。

---

## 14. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-21 | 命名/运行时/双出口/Contract/MVP |
| V1.0 Architecture Freeze | 2026-07-21 | 升格为能力边界与工程真源：角色边界、证据三层、六大引擎、三层输出、Cockpit/Room、目标包结构、下一步 UX |
| V1.1 Product Upgrade Link | 2026-07-21 | 补充诊断模型详细设计与数据采集/外部情报真源的引用关系 |
| V1.1 Reasoning Link | 2026-07-21 | 补充诊断推理引擎真源引用，明确 RDIE 已进入冻结链路 |
| V1.2 Knowledge Link | 2026-07-21 | 补充诊断知识模型与数据结构真源引用，形成平台化认知资产链路 |
| V1.3 Local Backend Bypass | 2026-07-21 | 明示本仓 HTTP Backend 为本地开发旁路；engines ✅；采集分 synthetic/live |

# M_OPS_DIAG_AGENT V1 · 餐厅经营诊断系统

# Agent Architecture Freeze Document

> **版本：** V1.0  
> **状态：正式冻结（Freeze）** — 能力边界与工程真源（非开发说明书）  
> **日期：** 2026-07-21  
> **归属：** MealKey Agent Ecosystem（L3 Tool Agent）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `M_OPS_DIAG_UX_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` · `MEALKEY_RESTAURANT_BRAIN_V1.md` · `TODAY_RADAR_EXPERIENCE_V1.md`  
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
| **Agent ID** | `m-ops-diag` |
| **Package** | `@mealkey/m-ops-diag` |
| **产品中文** | 餐启 · 餐厅经营诊断系统（简称：**餐启经营诊断**） |
| **产品英文** | MealKey Restaurant Health Diagnosis |
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

- **V1 = 纯 TS Package（进程内）**，不 HTTP 服务化  
- Host 薄 Bridge：`m-ops-diag-client`  
- 未来独立服务须另开授权  

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

V1 **架构上冻结六大引擎**；**MVP 实现只打穿 Customer（+ Service 主题）**，其余可骨架占位，禁止假 LIVE。

### 4.1 Customer Insight Engine

> 顾客到底怎么看你的店？

输出示例：

```json
{
  "positiveMemory": ["环境好", "湘菜正宗"],
  "negativeMemory": ["等待时间长", "价格偏高"]
}
```

### 4.2 Product Engine

> 什么菜留下顾客，什么菜拖累经营？

招牌 / 爆品 / 差评菜 / 性价比。

### 4.3 Service Engine

> 服务有没有影响增长？

等位 / 上菜速度 / 态度 / 高峰压力。

### 4.4 Brand Perception Engine

> 顾客脑中有没有形成记忆？别人为什么选择你？

### 4.5 Competition Engine

> 你在市场里的位置？（同区域 / 同价格带 / 同品类）

### 4.6 Growth Opportunity Engine

> 下一步增长机会在哪里？

例：年轻消费者认可环境，但产品记忆弱 → 机会：打造年轻湘菜场景（**机会信号，不是战略终局**）。

---

## 5. Diagnosis Output（三层 · 冻结）

| Level | 名称 | 含义 | 例 |
|-------|------|------|----|
| **L1** | Finding | 发现 | 近30天差评中「等待」出现次数增加 42% |
| **L2** | Pattern | 模式 | 高峰时段服务能力不足正在影响体验 |
| **L3** | Signal | 经营信号（进 MealKey） | `severity: HIGH` · `title: 服务体验风险` |

Finding/Pattern 对应代码 `DiagnosisFinding.observation/pattern/meaning`。  
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
| ❌ HTTP 服务化 / 第五顾问席 | 架构冻结 |

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
| 可选 live 外采 | ✅（开关） |
| 今日雷达注入（有证据） | ✅ |
| 六大 engines/ 目录迁入 | ⏳ 按目标树演进 |
| UX 首次体验打穿 | ⏳ **下一刀** |

---

## 13. 下一步（产品顺序 · 冻结）

**已冻结：** UX `M_OPS_DIAG_UX_V1.md` · 采集 `M_OPS_DIAG_DATA_COLLECTION_V1.md`  

**下一刀：** 《餐厅经营诊断系统 V1 诊断模型设计》  
（六引擎推理 · Evidence→Finding→Pattern→Signal · 反泛建议）  

模型冻结后，再按 UX 五页 + 采集架构 + §9 目标树落地。

---

## 14. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-21 | 命名/运行时/双出口/Contract/MVP |
| V1.0 Architecture Freeze | 2026-07-21 | 升格为能力边界与工程真源：角色边界、证据三层、六大引擎、三层输出、Cockpit/Room、目标包结构、下一步 UX |

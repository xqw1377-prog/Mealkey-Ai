# M-OPS-DIAG · 餐启经营诊断系统 V1（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `MEALKEY_RESTAURANT_BRAIN_V1.md`  
> **代码真源：** `@mealkey/m-ops-diag` · `packages/m-ops-diag`  
> **冲突裁决：** 与本文冲突时，以本文 + `AUTHORITY.md` 为准

---

## 0. 一句话定位

> **m-ops-diag 不是咨询师，而是 MealKey 的「经营感知器」。**

| 负责 | 不负责 |
|------|--------|
| 看见问题 | 判断战略 |
| 识别异常 | 替老板决策 |
| 提供证据 | 执行落地（M-EXEC） |
| 生成经营洞察 | 升格第五顾问席 |

闭环语义：

```text
看见问题 → 识别异常 → 提供证据 → 生成经营洞察
```

这样才能与 Decision Intelligence、七常委、M-PNT/M-MKT/M-BIZ/M-ED 保持边界。

**战略价值：** 把 MealKey 从「老板主动问 AI」推向「AI 主动观察生意并提醒老板」——**每日打开理由**的第一入口。

---

## 1. 命名冻结

| 项 | 冻结值 |
|----|--------|
| **Agent ID** | `m-ops-diag` |
| **Package** | `@mealkey/m-ops-diag` |
| **产品中文名** | 餐启 · 餐厅经营诊断系统（用户可见简称：**餐启经营诊断**） |
| **产品英文名** | MealKey Restaurant Health Diagnosis |
| **Tool Kind** | `ops`（L3 Tool Agent，见框架） |
| **UI 禁显** | 不得对老板展示裸技术名 `M-OPS-DIAG` / `m-ops-diag` 作为主标题 |

能力族对齐（**注意：后四者为 L1 顾问席；m-ops-diag 为 L3 感知器，不是第五席**）：

```text
m-pnt       品牌定位      （L1）
m-mkt       市场洞察      （L1）
m-biz       商业分析      （L1）
m-ed        股权设计      （L1）
m-ops-diag  经营诊断      （L3 感知器）
```

**禁止：** 将 `m-ops-diag` 注册为 `FounderAgentName` / 底栏第五席 / Council Expert。

---

## 2. 运行时冻结

### V1：纯 TS Package（进程内）

```text
apps/web
   │
   m-ops-diag-client   （薄 Host Bridge，可后置）
   │
packages/m-ops-diag
   │
Diagnosis Engine
```

| 冻结 | 说明 |
|------|------|
| **V1 不服务化** | 不做独立 HTTP / FastAPI |
| **模式对齐** | 与 M-PNT 进程内一致 |
| **原因** | 数据与 Contract 仍在快迭代；调试成本最低 |

**未来（未授权不得提前做）：** TS Package → Service → HTTP API（大量独立调用 / 企业版 / SaaS 时再拆）。

---

## 3. 出口优先级冻结（不二选一）

两个合法出口都做，但有顺序：

| 优先级 | 出口 | 宿主 |
|--------|------|------|
| **P0 第一出口** | `BusinessSignal` | 今日经营驾驶舱 / 雷达 |
| **P1 第二出口** | `VerticalInsight` | 决策室（经 MKInsight Adapter） |

原因：老板每天打开不是「我要决策」，而是「店今天有没有问题」。诊断必须先服务**每日打开理由**。

```text
每日扫描 → m-ops-diag → 发现异常
         → BusinessSignal → 今日驾驶舱 → 老板看见
         →（可选）进入决策室 → VerticalInsight → Council
```

驾驶舱价值瞬间（产品示意，非强制文案）：

```text
餐启经营驾驶舱
今日发现：⚠ 服务体验风险
过去7天：等待时间差评 +32%
影响：可能影响复购
[进入诊断] [进入决策会议]
```

---

## 4. 完整架构冻结

```text
                 MealKey OS
                      │
              Restaurant Brain
               （认识这家店）
                      │
                 M-OPS-DIAG
               （观察这家店）
                 /        \
      BusinessSignal    VerticalInsight
           │                  │
    Daily Cockpit       Decision Room
           │                  │
        M-EXEC         Decision Intelligence
                      │
                   Learning
                      │
                Decision DNA
```

| 层 | 角色 |
|----|------|
| Brain | 认识这家店（只读上下文给诊断） |
| m-ops-diag | 观察这家店（感知器） |
| Signal / Cockpit | 每日提醒 |
| Insight / Decision Room | 需要拍板时再进 |
| M-EXEC | 决策后执行（本 Agent 不替代） |

---

## 5. V1 Contract 冻结

代码 SSOT：`packages/m-ops-diag/src/contracts.ts`

### 5.1 Input

```typescript
RestaurantDiagnosisRequest {
  restaurantContext   // 店名/品类/城市/阶段等只读摘要
  facts[]             // 经营事实
  evidence[]          // 证据片段（评论、外采等）
  focus?              // service|product|traffic|competition|cost|overall
  horizon?            // today|7d|30d
}
```

缺证据 → 只填 `gaps[]`，禁止装懂。

### 5.2 Output

**Findings（不是建议、不是战略）** — 三层叙事：

```text
发现：近30天差评集中增加
模式：80% 负面来自等待
含义：服务能力可能成为增长瓶颈
```

**Signals（第一出口）** → 今日：

```typescript
// 语义对齐 BusinessSignal；Host 映射为 BusinessSignalV1
severity / title / observation / meaning / impact / evidence[]
```

**Insights（第二出口）** → 决策室：

```typescript
domain / question / evidence / unknowns
→ VerticalInsightSource (agentId: "m-ops-diag", kind: "ops")
→ toVerticalMkInsights
```

**禁止输出：** `FounderDecisionContract` · `DecisionPack` · 老板拍板句 · ERP 工单终局。

---

## 6. V1 明确不做

| 不做 | 原因 |
|------|------|
| ❌ 自动经营评分排行榜 | 假精确 |
| ❌ AI 告诉老板应该怎么经营 | 越权（战略/决策） |
| ❌ 自动生成战略方案 | 属 Decision Intelligence |
| ❌ 完整 ERP | 偏离感知器定位 |
| ❌ HTTP 服务化 | V1 运行时冻结 |
| ❌ 注册第五顾问席 | 架构冻结 |

---

## 7. V1 MVP 范围：先打穿一条竖切

**不做**六大健康模型全集。

**只做：**「消费者反馈经营诊断」

数据源（Phase 递进）：

```text
大众点评 / 小红书 / 抖音（及可接入的评论证据）
```

分析焦点：

- 为什么喜欢你  
- 为什么讨厌你  
- 顾客真正记住什么  
- 最大体验问题  

老板可见价值（示意）：

```text
你的顾客眼中的餐厅：不是你认为的品牌。
他们认为：1. … 2. … 3. …
最大的机会：…
最大的风险：…
```

---

## 8. 开发顺序（冻结）

| Phase | 交付 | 状态 |
|-------|------|------|
| **0** | 本文冻结 | ✅ |
| **1** | `packages/m-ops-diag`：input → mock evidence → engine → signals | ✅ |
| **2** | 接 Restaurant Brain / RIP 只读；Host Bridge；tRPC `mOpsDiag` | ✅ |
| **3** | 外采：`useLive` → live-market-evidence（点评/小红书检索） | ✅（可选开关） |
| **4** | 接 Daily Cockpit：RIP 证据 → worldChanges → 今日雷达 | ✅（有证据才注入） |

---

## 9. 与 Tool Agent 框架的关系

- 服从 `MEALKEY_TOOL_AGENT_FRAMEWORK_V1`：四件套 · 四 Ports（本 Agent：`signal` + `insight` + `gap`；V1 不做 `work`）  
- Agent ID 使用产品族名 `m-ops-diag`（框架同时承认 `m-ops-*` / `l3.*`）  
- Host Bridge 放 `apps/web`（Phase 4），Engine **零 Prisma**  

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-21 | 命名/运行时/双出口优先级/Contract/MVP 竖切/非目标 |

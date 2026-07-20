# Founder OS Council Intelligence「4 + 1」V1

> **状态：冻结（语义澄清 + 工程 Sprint）**  
> **日期：2026-07-18**  
> **挂载：** `docs/FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md` Phase 1 的落地拆解  
> **权威入口：** `docs/AUTHORITY.md`

---

## 零、消歧义（冻结）

**「4 + 1」不是：**

- ❌ 4 个选择方向 + 1 个隐藏方向
- ❌ 4 个产品 Tab + 1 个彩蛋路径

**「4 + 1」是：**

| 符号 | 含义 |
| --- | --- |
| **4** | 四大专业能力 **全部接入** 七常委体系（Intelligence Providers） |
| **+1** | 做一次 **整体架构治理**，把接入后的系统稳定下来（Contract / Evidence / Trace / 边界） |

---

## 一、目标架构（冻结）

```text
             MealKey Agent System
                  │
            四大专业能力层
 ┌────────┬────────┬────────┬────────┐
 M-PNT   M-MKT   M-BIZ   M-ED
                  │
            MKInsight Layer
                  │
          七常委 Council
                  │
            MKDecision
                  │
          Execution Runtime
                  │
          Memory Learning
```

链路冻结：

```text
Agent Insight → Council Review → MKDecision → Execution → Memory
```

禁止：`Agent Report → 直接 Decision`（绕过 Council）。

---

## 二、4：四大能力 → Council

### ① M-PNT → Council（已有，需深化）

| 项 | 内容 |
| --- | --- |
| 状态 | ✅ 已接入（偏 ExpertReport 供信息） |
| 升级目标 | **Positioning Intelligence Provider** |
| 统一输出 | `MKInsight` |
| 内容 | 品牌定位判断 · 消费者心智 · 竞争空位 · 定位风险 · 证据链 |
| 主要影响常委 | CBO · CMO · CSO |

---

### ② M-MKT → Council（下一步）

| 项 | 内容 |
| --- | --- |
| 目标 | **Market Intelligence Provider** |
| 核心问题 | 市场有没有机会？ |
| 统一输出 | `MKInsight[]` |
| 内容域 | 市场趋势 · 用户洞察 · 竞争环境 · 增长风险 |
| 主要影响常委 | CMO · CSO · BMO · CBO |

---

### ③ M-BIZ → Council

| 项 | 内容 |
| --- | --- |
| 目标 | **Business Intelligence Provider** |
| 核心问题 | 这个商业模式是否成立？ |
| 统一输出 | `MKInsight[]` |
| 内容域 | 盈利模型 · 单店模型 · 扩张能力 · 商业风险 |
| 主要影响常委 | BMO · CFO · COO · CSO |

---

### ④ M-ED → Council

| 项 | 内容 |
| --- | --- |
| 目标 | **Organization Intelligence Provider** |
| 核心问题 | 人和利益结构是否支撑战略？ |
| 统一输出 | `MKInsight[]` |
| 内容域 | 股权结构 · 合伙机制 · 组织风险 |
| 主要影响常委 | CFO · COO · CRO · CSO |

---

## 三、+1：Architecture Governance（系统治理）

四大各自输出私有 Report 直接进 Council → **必定混乱**。必须做：

> **MKInsight Contract + Event + Data Governance**

### +1.1 统一输出协议

Agent **不得**以 `PositionReport` / `MarketReport` / `BusinessReport` 等私有形状直进 Council。

统一：

```typescript
interface MKInsight {
  id: string;
  sourceAgent: string;
  domain: string;
  finding: string;
  reasoning: string;
  evidence: Evidence[];
  confidence: number;
  impact: string;
}
```

（字段可在实现中加深，语义不得回退到「无证据的自由文本 Report」。）

### +1.2 统一 Evidence Layer

所有判断必须带证据（数据 / 案例 / 规则 / 历史经验）。禁止无证据的终局断言。

### +1.3 统一 Decision Trace

记录：

```text
Agent Insight → 常委判断 → 投票 → 最终决策 → 结果
```

### +1.4 防止系统膨胀

未来新增垂直 Agent（选址 / 菜单 / 营销 / 招聘等）**不得**直接进委员会：

```text
New Agent → MKInsight Adapter → Council Review
```

---

## 四、工程 Sprint 顺序（冻结）

> 对应 Council System Phase 1：Council Intelligence Integration  
> **当前最优开发顺序如下，不并行扩组织。**

| Sprint | 交付 | 完成定义 | 状态 |
| --- | --- | --- | --- |
| **S1** | M-MKT Council Adapter | Market Intelligence Provider → `MKInsight[]` 可被 Council 消费 | ✅ `toMMktMkInsights` |
| **S2** | M-BIZ Council Adapter | Business Intelligence Provider → `MKInsight[]` | ✅ `toMBizMkInsights` |
| **S3** | M-ED Council Adapter | Organization Intelligence Provider → `MKInsight[]` | ✅ `toMEdMkInsights` |
| **S4** | 统一 MKInsight Contract | 四 Agent 输出形状对齐；私有 Report 仅作内部，不进 Council | ✅ `founder-os/mk-insight.ts` |
| **S5** | 架构治理审计 | Evidence / Decision Trace / 新 Agent 接入闸门清单通过 | ✅ `FOUNDER_OS_COUNCIL_INTELLIGENCE_GOVERNANCE_AUDIT_V1.md` |

并行加深（不占独立 Sprint 序号，但不得阻塞 S1）：

- **M-PNT 深化**：ExpertReport → Positioning Intelligence Provider（同 `MKInsight`）

说明：S1–S3 允许先用 **薄 MKInsight 草案** 接 Adapter；S4 收口字段与校验；S5 做系统级审计。禁止在 S1–S5 期间再开第五核心 Agent 或第七 Runtime。

---

## 五、完成判据

「4 + 1」完成后，MealKey 才真正形成：

> **四大经营能力 + 七常委治理层 + 执行闭环**

这也是后续所有垂直 Agent 接入的基础。

---

## 变更

| 日期 | 说明 |
| --- | --- |
| 2026-07-18 | 澄清 4+1 语义；冻结 Sprint 1–5 |

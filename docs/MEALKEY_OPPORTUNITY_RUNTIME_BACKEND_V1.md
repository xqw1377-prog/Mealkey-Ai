# MealKey Opportunity Runtime 后端设计 V1（冻结）

> **状态：正式冻结（Freeze）— 六大 Runtime 收官模块**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `docs/MEALKEY_RUNTIME_LAYER_V1.md`  
> **对称篇：** `docs/MEALKEY_RISK_RUNTIME_BACKEND_V1.md`  
> **冲突裁决：** **不是**资讯聚合 / 点子生成器；**不是**专家席；发现「值得研究什么」，专家判断「是否值得做」；禁止战略终局与直调 L3

---

## 一、核心定位

> **Opportunity Runtime 是 MealKey 的经营机会发现引擎，通过分析市场变化、企业能力、行业趋势和竞争空位，帮助经营者发现新的增长机会。**

回答：

> **下一步企业应该往哪里走？**（研究议题，不是直接开干）

| 不是 | 是 |
|------|-----|
| 市场资讯工具 / 新闻聚合 | 基于**企业自身条件**的机会判断 |
| 创业点子生成器 | 信号 → 匹配 → 进席分析 → Decision |
| 替代 M-MKT/M-PNT | 发现「值得研究什么」 |

第二层已齐：Decision / Execution / Memory / Growth / Risk；本篇补齐 **Opportunity**。

---

## 二、为什么需要

| 极端 | 模式 | 问题 |
|------|------|------|
| 只救火 | 问题→解决→问题 | 永远被市场推着走 |
| 盲目追风 | 看到机会→马上投入→失败 | 无 Fit / 无验证 |

优秀企业：提前看见用户/品类/渠道/模型变化并布局。

```
市场变化 + 企业能力 + 竞争环境
    ↓
机会判断
    ↓
战略建议（进席）
    ↓
Decision Runtime
```

---

## 三、与四大 Agent 边界（铁律）

```
机会发现（Opportunity）
    ↓
调用专家分析
M-MKT 市场 · M-PNT 定位 · M-BIZ 模型 · M-ED 组织
    ↓
形成机会决策（经 Decision / 常委）
```

| 角色 | 职责 |
|------|------|
| **Opportunity Runtime** | 发现「值得研究什么」 |
| **四大 Expert** | 判断「是否值得做」 |
| **Decision Runtime** | 收口为 MKDecision |
| **Execution** | 验证与落地 |

**禁止：** Opportunity 直接批准战略、直接 `createExecution`、直接调 Tool Agent。

与 Risk 冲突（如扩张机会 vs 现金流断裂）→ **Risk 优先**。

---

## 四、Opportunity Entity

```typescript
type OpportunityType =
  | "market"
  | "category"
  | "channel"
  | "product"
  | "business_model";

type OpportunitySource =
  | "industry"
  | "memory"
  | "competitor"
  | "user"
  | "agent";

type OpportunityStatus =
  | "detected"
  | "analyzing"
  | "approved"
  | "rejected"
  | "exploring";

interface Opportunity {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  description: string;
  type: OpportunityType;
  source: OpportunitySource;
  score: number; // 0–100，见 §六
  confidence: number; // 0–1
  status: OpportunityStatus;
  suggestExpert?: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
  suggestedTopic?: string;
  linkedDecisionId?: string;
  createdAt: number; // 实现可用 ISO 字符串，契约层统一
}
```

产品对外可称 Opportunity / OpportunitySignal（同实体不同读法）。

---

## 五、机会五大来源（冻结）

| # | 来源 | 说明 | 典型关联席 |
|---|------|------|------------|
| 1 | **Market Signal** | 消费者/需求变化（如减油腻→健康湘菜） | M-MKT |
| 2 | **Category Gap** | 品类空位（火锅拥挤→年轻化湘菜快餐空白） | M-PNT |
| 3 | **Business Model Innovation** | 模型机会（小面积→150㎡社区店） | M-BIZ |
| 4 | **Capability Opportunity** | **是不是你的机会**（有预制菜窗口但无供应链→降分） | Growth + Memory |
| 5 | **Founder Growth Opportunity** | 老板能力组合窗口（品牌强财务弱→资本化连锁需补财务，非上课） | Growth |

---

## 六、Opportunity Scoring Model

```
Opportunity Score =
  Market Attractive
  × Company Fit
  × Execution Capability
  × Timing
（各 0–1，乘积 ×100 → 0–100）
```

| 维度 | 含义 |
|------|------|
| **Market Attractive** | 规模、增速、需求强度 |
| **Company Fit** | 资源、品牌、能力、与禁区冲突则大幅降分 |
| **Execution Capability** | 来自 Growth / Execution 纪律 |
| **Timing** | 政策/消费窗口是否打开 |

等级建议：`detected` 默认；score≥60 可标 `exploring` 候选进席。

---

## 七、Discovery Engine（三层）

| Layer | 名称 | 职责 |
|-------|------|------|
| **1 Signal Engine** | 发现信号 | Industry Memory、用户反馈、企业数据、Agent 分析 → Candidate |
| **2 Fit Engine** | 是不是你的 | 高端宴会增长 × 社区小店品牌 → Fit 低 |
| **3 Council Review** | 常委（可选） | 「这个机会值得投入吗？」→ 再进 Decision |

```
Signal → Fit →（可选常委）→ Decision Request → 四席 → Council → Decision Runtime
```

---

## 八、Opportunity → Decision 转换（核心闭环）

```
Opportunity
  → Opportunity Review
  → Decision Request
  → 四大 Agent 分析
  → Council（如需）
  → Decision Runtime（MKDecision）
```

示例：国潮餐饮窗口 → M-PNT 定位 + M-BIZ 模型 → 委员会是否进入 → 战略决策。

状态：`detected` → `analyzing` → `approved`（已转 Decision）/ `rejected` / `exploring`（小步验证中）。

---

## 九、Opportunity Memory（资产）

| 路径 | 沉淀 |
|------|------|
| 成功 | 发现→判断→投入→成功 → 强化同类识别 |
| **失败（更重要）** | 曾押注预制菜失败 → 未来类似机会**降权** |

写入 Memory Runtime（Project/Company）；Level 3 规律须复现。

---

## 十、数据库设计

| 表 | 列 |
|----|-----|
| **opportunities** | id, owner_id, project_id, title, description, type, score, confidence, status, created_at |
| **opportunity_signals** | id, opportunity_id, source, content, confidence |
| **opportunity_reviews** | id, opportunity_id, reviewer, opinion, vote |
| **opportunity_results** | id, opportunity_id, result, lesson |

### V1 落地

起步：`profile.openOpportunities[]`（或 `openOpportunitySignals[]`）；信号/评审可 JSON。有迁移窗口再拆表。

---

## 十一、MVP（P0）

### 必须

1. Opportunity Entity  
2. Signal Collector（规则/验证惊喜/Memory 成功模式，非全网爬虫）  
3. Opportunity Score（四因子）  
4. Opportunity → Decision Request（进席 CTA）  

### 暂时不做

- ❌ 自动爬取全网  
- ❌ 自动投资建议  
- ❌ 自动创业推荐  

### 工程切片

| 序 | 切片 | 验收 |
|----|------|------|
| O1 | `contracts/opportunity-runtime.ts` | 类型 + Score |
| O2 | Fit Engine 单测（禁区/能力不匹配降分） | 单测 |
| O3 | Signal→Candidate 规则投影 | 1–2 条规则 |
| O4 | `opportunityRuntime.listOpen` | tRPC |
| O5 | → Decision Request CTA | 不开会代扣 |
| O6 | opportunity_results → Memory 降权 | 失败复盘 |

---

## 十二、第二层 Runtime 完整冻结

```
Founder OS
    │
Runtime Layer
    ├── Decision Runtime      做什么
    ├── Execution Runtime     怎么做
    ├── Memory Runtime        记住什么
    ├── Growth Runtime        成长什么
    ├── Risk Runtime          防止什么
    └── Opportunity Runtime   发现什么
    │
Four Core Agents（判断权）
M-PNT · M-MKT · M-BIZ · M-ED
    │
Tool Agents（执行权）
```

**完整认知闭环：**

```
机会 → Opportunity → 判断 → Decision → Execution(M-EXEC)
    → 结果 → Memory → Growth
同时 Risk 持续监控
```

---

## 十三、下一阶段边界（不无限扩 Runtime）

第二层 Runtime **设计收官，停止再开第七个 Runtime**。

下一阶段进入生态地图已冻结的：

# Tool Agent Layer（经营工具型 Agent）

可扩展：选址、菜品研发、菜单优化、用户调研、招聘、培训、门店诊断、财务分析等。

**铁律（已冻于生态地图 / 权限模型）：**

> **工具 Agent 不创造战略，只执行和验证战略。**

稳定架构：

> **四大能力 → 六大 Runtime → 可扩展工具 Agent**

---

## 十四、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-18 | 初冻机会雷达 |
| V1-freeze-final | 2026-07-18 | 对齐终稿：五大来源、四因子 Score、三层引擎、→Decision、Memory、MVP；宣告六大 Runtime 收官与 Tool Layer 下一阶段 |

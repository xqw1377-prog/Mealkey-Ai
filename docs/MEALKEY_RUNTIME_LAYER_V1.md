# MealKey Runtime Layer V1 总体设计（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-17  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** 生态地图 V2 · 权限模型 V2 · Runtime 边界 V2 · `MEALKEY_DECISION_RUNTIME_BACKEND_V1.md`  
> **冲突裁决：** 实现可加深；**不得**把任一 Runtime 升格为第五 Expert / `FounderAgentName`

---

## 0. 核心原则

> **四大能力负责「判断」，Runtime 负责「经营闭环」，工具 Agent 负责「执行」。**

本层决定未来所有 Agent 怎么扩展：扩 L3 工具可以；扩 L1 顾问席不行；新系统能力进 Runtime，不进聊天席。

---

## 1. 产品定位

### 1.1 定义

Runtime Layer 是 MealKey Founder OS 的 **经营运行中枢**。

它负责将下列链路形成持续循环：

```
战略判断
    ↓
经营决策
    ↓
执行行动
    ↓
经营结果
    ↓
经验沉淀
    ↓
能力提升
```

### 1.2 为什么需要 Runtime

**传统咨询：**

```
咨询公司 → 战略报告 → 企业执行 → 结束
```

最大问题：咨询结束，价值停止。

**MealKey：**

```
AI 顾问 → 决策 → Runtime 持续跟踪 → 结果反馈 → AI 重新学习
```

价值不是一次咨询，而是：

> **长期陪伴企业经营成长。**

---

## 2. Runtime 六大模块冻结

| 代号 | 名称 | 一句话使命 |
|------|------|------------|
| **Runtime-01** | Decision Runtime | 管理企业所有关键决策的生命周期 |
| **Runtime-02** | Execution Runtime | 管理战略执行（不是普通任务管理） |
| **Runtime-03** | Memory Runtime | 长期认识企业（最大护城河之一） |
| **Runtime-04** | Growth Runtime | 从经营行为中提升老板能力 |
| **Runtime-05** | Risk Runtime | 企业风险雷达，提前发现问题 |
| **Runtime-06** | Opportunity Runtime | 增长机会发现，建议进席分析 |

---

### Runtime-01 · Decision Runtime（决策运营系统）

**核心使命：** 管理企业所有关键决策。

**输入：** M-PNT / M-MKT / M-BIZ / M-ED · 七常委委员会  
**产物：** `MKDecision`

| 能力 | 说明 |
|------|------|
| **Decision Registry** | 决策登记：`decisionId, title, reason, evidence, participants, confidence, risk, hypothesis…` |
| **Decision Timeline** | 企业决策历史（决定 → 调整 → 复盘） |
| **Decision Review** | 定期复盘：系统主动问「N 个月前这个战略假设，现在成立吗？」 |

后端设计专篇：`MEALKEY_DECISION_RUNTIME_BACKEND_V1.md`。  
Execution 后端专篇：`MEALKEY_EXECUTION_RUNTIME_BACKEND_V2.md`。

**诚实现状：** 会议/`DecisionPack`/Prisma `Decision` 已有；统一 MKDecision、状态机、Review、Event 总线按 Decision 后端 Phase 1 切片推进。Execution 三引擎代码骨架已有，按 Execution 后端 E1–E5 加深。

---

### Runtime-02 · Execution Runtime（执行运营系统）

**核心：** 不是管理任务，而是 **管理战略执行**。

**输入：** 已批准 Decision（如「打造年轻化湘菜品牌」）  
**输出：** Execution Plan（目标 · 行动 · 验证指标）

| 引擎 | 职责 | 状态/结果 |
|------|------|-----------|
| **Action Engine** | 行动管理 | Created → Running → Blocked → Completed |
| **Validation Engine** | 假设验证（有效吗，不是做完了吗） | 成功 / 失败 / 部分成立 |
| **Deviation Engine** | 计划 vs 实际；区分执行偏差 vs 战略错误 | 继续 / 建议复会 |

禁止：终局改战略；无决策授权调 L3；注册第五 Expert。

---

### Runtime-03 · Memory Runtime（企业记忆系统）

传统 AI：每次重新问。MealKey：长期认识企业。

**四层记忆：**

```
Founder Memory（老板）
    ↓
Company Memory（企业）
    ↓
Project Memory（品牌/项目）
    ↓
Industry Memory（行业）
```

示例：老板过去 3 次创业都败在现金流 → 未来商业方案自动提醒现金流风险（经 Risk/Decision 路由，不直接改战略）。

禁止：无来源「真理」冒充已验证；另起学习顾问席。

---

### Runtime-04 · Growth Runtime（创始人成长系统）

不是学习课程，而是从经营行为中成长。

**Founder Capability Model（八维）：**

战略 · 市场 · 品牌 · 商业 · 财务 · 组织 · 执行 · 学习

**数据来源：** 决策记录 · 执行结果 · 失败案例 · 委员会评价  

**输出：** Founder Growth Map（阶段 · 优势 · 短板 · 建议如「增加 M-BIZ 调用」）

禁止：`M-GROW` 席；上课式售卖；改写历史 MKDecision 正文。

---

### Runtime-05 · Risk Runtime（企业风险雷达）

提前发现问题。维度：战略 · 产品 · 财务 · 组织。

**输出：** Risk Alert（等级 · 原因 · 建议进入哪一席复核，如 M-BIZ）。

禁止：自行改战略；无证据恐吓；升格 Expert。

---

### Runtime-06 · Opportunity Runtime（增长机会发现）

与风险对称。来源：Industry Memory · 用户反馈 · 企业数据 · Agent 分析。  
五大来源 + 四因子 Score（Attractive × Fit × Execution × Timing）。

**输出：** Opportunity Candidate → Fit → Decision Request（发现「值得研究什么」）。

后端专篇：`MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md`（**V1-freeze-final · 六大收官**）。

禁止：资讯聚合 / 点子机；直接下「开新品类」终局；绕过 MKDecision 调 L3。  
与 Risk 冲突 → **Risk 优先**。

---

## 3. Runtime 之间关系（经营循环）

不是六个孤立模块：

```
                Decision Runtime
                       ↓
              Execution Runtime
                       ↓
                 Result Data
                       ↓
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
      Memory        Growth         Risk
      Runtime       Runtime        Runtime
         └─────────────┴─────────────┘
                       ↓
            Opportunity Runtime
                       ↓
             下一轮 Decision
```

Event 级流转见本文附录 A；权限副作用见权限模型 V2。

---

## 4. Runtime 与 Agent 权限关系（冻结）

| 权力 | 归属 | 可以 | 不可以 |
|------|------|------|--------|
| **判断权** | 四大 Agent（L1） | 判断定位/市场/模型/治理 | 直接改执行态、私自调 L3 改战略 |
| **流程权** | Runtime（L2） | 推动生命周期、拆行动、验证、提醒复盘 | 改变战略终局 |
| **执行权** | 工具 Agent（L3） | 产出选址/菜单/营销等执行物 | 战略判断（如「改成火锅」） |

```
判断权 → 四大 Agent
流程权 → Runtime
执行权 → 工具 Agent
```

与权限模型 V2（S0–S4 / 七常委召回）同时生效；冲突时以更严者为准。

---

## 5. 开发优先级（冻结）

| 阶段 | 模块 | 原因 |
|------|------|------|
| **Phase 1（马上）** | Decision · Execution · Memory | 数据入口 · 形成闭环 · 形成壁垒 |
| **Phase 2** | Growth · Risk | 见各自 BACKEND_V1；Risk 以六大风险域为准 |
| **Phase 3** | Opportunity | 见 `MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md`（终稿已冻） |
| **收官** | 六大 Runtime | **设计全部冻结，禁止再开第七 Runtime**；下一阶段 = Tool Agent Layer（生态地图 L3） |

> Growth 已有认知差距/Pattern 接线，**不回退**；Phase 2 是做深八维地图与决策质量，不是从零开始。  
> **禁止**六线并行或回头堆 Expert。

**诚实现状指针：** 见 `MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` §8；Decision 后端以 `MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` 为开工真源。

---

## 附录 A · 稳定 Event 名（摘要）

`MKDecisionProposed` → `MKDecisionApproved` → `ActionPlanCreated` → `ValidationStarted` → `Tool.ResultWritten` → `DeviationDetected?` → `ValidationCompleted` → `Memory.WriteAppended` → `Growth.CapabilityRefreshed` → `Risk.SignalRaised?` / `Opportunity.SignalRaised?` → `Council.RecallRequested?` → 下一轮 Decision。

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-17 | 初冻六大 Runtime + 对象/Event/三阶段 |
| V1-freeze-final | 2026-07-17 | 对齐终稿：定位叙事、Registry/Timeline/Review、三引擎、八维成长、判断权/流程权/执行权 |
| V1-opportunity-final | 2026-07-18 | Opportunity BACKEND_V1 收官；L2 设计冻结、禁止第七 Runtime；下一站 Tool Agent Layer |

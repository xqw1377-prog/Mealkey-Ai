# MealKey Agent / Runtime 边界图 V2（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-17  
> **触发：** M-EXEC 纠偏 —「每个能力都做成 Agent」会破坏操作系统形态  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **冲突裁决：** 与本文冲突时，以本文 + `AUTHORITY.md` 为准；旧文称「第五 Agent / Growth Agent 产品席」作废

---

## 0. 一句话原则（开工前必问）

> **这是专业判断席位，还是运行时能力，还是落地工具？**  
> - 专业判断 → 只能落在四大 Expert Engine（M-*），本版本不增第五席。  
> - 运行时 → 加深 Runtime / Capability，**禁止**再造 `M-XXX Agent` 产品席。  
> - 落地工具 → 可扩展 Tool Agent，**禁止**做战略终局（见 `MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md`）。

```
知识 → 判断 → 决策 → 行动 → 结果 → 反馈 → 能力
```

MealKey 壁垒不是「更多答案」，而是这条飞轮。

**三层生态总图（L1/L2/L3）与商业化：** 以 `docs/MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` 为准。  
**权限与七常委召回：** 以 `docs/MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` 为准。本文专管 Expert vs Runtime 闸门。

---

## 1. 总体模型（两层 + 治理）

```
                    Founder OS


              ┌─────────────────┐
              │  决策委员会/七常委  │  治理层（非专家层）
              └────────┬────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ 第一层：专业顾问席 │         │ 第二层：运行时     │
│ Expert Engines  │         │ Runtimes          │
└─────────────────┘         └─────────────────┘
  M-PNT 品牌定位               Decision Runtime
  M-MKT 市场分析               Execution Runtime（M-EXEC）
  M-BIZ 商业设计               Growth Runtime
  M-ED  股权治理               Memory Runtime
                               Risk Runtime
                               Opportunity Runtime
```

| 层 | 是什么 | 不是什么 |
|----|--------|----------|
| **专业顾问席** | 领域判断产品化（咨询能力） | 聊天机器人、工具箱条目 |
| **运行时** | 让判断变成结果、让结果变成能力 | 第五/第六专家顾问 |
| **治理（七常委）** | 多视角决策机构 | 第二套专家 Engine |

---

## 2. 第一层：四大专业顾问（冻结）

| 代号 | 类型 | 职责 | 对标代码 |
|------|------|------|----------|
| **M-PNT** | Expert Engine | 品牌定位判断 | `FounderAgentName` · consulting 六步 |
| **M-MKT** | Expert Engine | 市场机会判断 | 同上 |
| **M-BIZ** | Expert Engine | 商业模式判断 | 同上 |
| **M-ED** | Expert Engine | 股权治理判断 | 同上 |

**冻结：**

- 本版本 **不再增加** 第五个 `FounderAgentName` / `forceAgent` 专业席。  
- 前台可隐藏产品代号（`stripAgentProductNames`），但架构上仍是四席。  
- ❌ 禁止：`M-EXEC Agent`、`M-GROW Agent`、`M-LEARN Agent` 进顾问席。

---

## 3. 第二层：运行时（Runtime）— 不是顾问席

| 名称 | 中文 | 职责 | 代码真相源（当前） | 禁止 |
|------|------|------|-------------------|------|
| **Decision Runtime** | 决策运行时 | 议题→辩论→MKDecision | `capability/decision` · meeting · council | 不做第五领域专家 |
| **Execution Runtime（M-EXEC）** | 执行运行时 | 决策→ActionPlan→验证→偏航建议复会 | `capability/execution` · Validation OS · `executionRuntime` tRPC | 不做 ERP/门店/DevOps；不终局改战略 |
| **Memory Runtime** | 企业记忆 | 决策/证据/结果/偏差沉淀 | `founder-layer/memory` · Prisma Memory | 不另起独立「学习 Agent」产品 |
| **Growth Runtime** | 创始人成长引擎 | 结果→复盘→能力画像→成长路径 | `capability/growth` · `growthRuntime` tRPC | **不是** M-GROW；不「上课式」 |
| **Risk Runtime** | 风险雷达 | Alert → 建议召回席/Decision | 设计见 `MEALKEY_RISK_RUNTIME_BACKEND_V1.md` | 不自行改战略；无证据不 CRITICAL |
| **Opportunity Runtime** | 机会发现 | Candidate → Fit → Decision Request | 设计见 `MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md` | 发现议题，不做战略终局 |

### 3.1 与代码命名对齐（防二次偏移）

代码里已有 `CapabilityAgentId = cognition | decision | execution | growth`：

- 这是 **Capability / Runtime 层实现单元**，**不是** Expert Engine。  
- 产品与文档对外称呼：优先用 **Runtime / 引擎（成长引擎）**，避免再说「第五个成长 Agent」。  
- 类名 `GrowthAgent` / `ExecutionAgent` = 实现类名；**不得**映射为 `FounderAgentName`。

---

## 4. Growth Runtime 职责冻结（设计边界）

成长不是专业领域，而是飞轮出口。

| # | 职责 | 输入 | 输出 | 不做 |
|---|------|------|------|------|
| 1 | **认知差距检测** | 老板归因 vs 证据/验证结果 | 认知偏差说明 | 不替四席做定位/市场结论 |
| 2 | **决策质量分析** | Decision Memory + 结果 | Decision Pattern | 不改历史决策正文 |
| 3 | **能力画像** | 验证密度、记忆、短板 | 经营能力地图（非性格测试） | 不做心理测评产品 |
| 4 | **成长路径** | 阶段 + 失败模式 + 短板 | 下一阶段成长任务 / 建议开会议题 | 不强制扣点「上课」 |

与 M-EXEC 关系（单向飞轮）：

```
决策（四席+委员会）
    ↓
Execution Runtime（落地与验证）
    ↓
Result / Deviation
    ↓
Growth Runtime（复盘与能力升级）
    ↓
更高质量的下一次决策
```

---

## 5. 飞轮（壁垒）

```
四大专业能力（更好的判断）
        ↓
     更高质量决策
        ↓
   Execution Runtime
        ↓
     可验证经营结果
        ↓
    Growth Runtime
        ↓
   老板能力画像升级
        ↓
   下一次更好的判断
```

---

## 6. 边界表（最终冻结）

| 模块 | 类型 | 职责 | 可扩展方式 |
|------|------|------|------------|
| M-PNT | 专业顾问 | 品牌定位判断 | 加深六步/知识，不平行第五席 |
| M-MKT | 专业顾问 | 市场判断 | 同上 |
| M-BIZ | 专业顾问 | 商业模型判断 | 同上 |
| M-ED | 专业顾问 | 股权治理判断 | 同上 |
| Decision Runtime | Runtime | 组织决策与收口 | 加深辩论/合同，不新增 M-* |
| M-EXEC / Execution Runtime | Runtime | 让决策落地并验证 | 加深现有 execution + Validation OS |
| Growth Runtime | Runtime | 让老板从结果中成长 | 加深 `capability/growth`，禁止 M-GROW |
| Learning / Memory | Runtime | 企业记忆与回流 | 加深 Memory Engine |
| 七常委 | 治理 | 多视角决策 | 固定 7，不增常委 |
| Chief of Staff | 中枢 | 问题发现/议题/召集 | 不是第五 Expert |

---

## 7. 明确不做（扩展闸门）

后续任何提案，若命中下列任一项 → **驳回或改写为 Runtime 加深**：

1. 「再加一个 M-XXX Agent 进会议表决席」  
2. 「成长专家 / 执行专家 / 学习专家」与四席并列售卖  
3. 把 Runtime 做成独立 Python 外呼「第五引擎」并假标 `collectionMode: engine`  
4. 把 ERP / 培训课 / 性格测评包装成 Founder OS 主路径  

**允许：** 在四席内加深咨询厚度；在 Runtime 内加深闭环与可观测性。

---

## 8. 落地状态（诚实快照 · 2026-07-18）

| 模块 | 状态 |
|------|------|
| 四席 Expert | 产品主路径存在；厚度不一 |
| Decision Runtime | MKDecision / Event / APPROVED·LEARNED；会议确认种子 Opinion/Evidence；`appendOpinion/Evidence` API |
| Execution Runtime | createFromDecision / rebuild / Validation / Deviation→Risk；Brief 今日三动作 |
| Memory Runtime | M1–M4；开会 `recallForDecision` 先验；禁区提醒进 priorBlock |
| Growth Runtime | G1–G5；Brief 决策质量 + GrowthTask CTA |
| Risk Runtime | R1–R6；Brief「风险 Runtime」独立 CTA；Risk>Opportunity 产品可见 |
| Opportunity Runtime | O1–O6；Brief「机会 Runtime」进席 CTA；阻断时「机会已暂缓」 |

**禁止再开第七 Runtime。** 下一产品扩展层 = 生态地图 L3 Tool Agent（不创造战略）。

---

## 9. 变更流程

1. 新增「看起来像 Agent」的模块 → 先填本表类型列（Expert vs Runtime）。  
2. Expert 扩席 → **必须先改** `AUTHORITY.md` + 本文 + `FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md`，再写代码。  
3. Runtime 加深 → 改对应 `capability/*` 与文档小节，**不得**注册 `FounderAgentName`。

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V2-freeze | 2026-07-17 | M-EXEC 纠偏后冻结 Expert vs Runtime；Growth = Runtime 非 M-GROW |
| V2-growth | 2026-07-17 | Growth Runtime 产品化：认知差距 / Decision Pattern / path → Brief + tRPC |
| V2-ecosystem | 2026-07-17 | 三层生态：L1 四席 / L2 Runtime / L3 工具；总图见 ECOSYSTEM_MAP_V2 |
| V2-permission | 2026-07-17 | 权限模型 V2：副作用分级 + 七常委召回清单 |
| V2-runtime6 | 2026-07-18 | 六大 Runtime 表齐（Risk/Opportunity）；设计收官；下一站 Tool Layer |

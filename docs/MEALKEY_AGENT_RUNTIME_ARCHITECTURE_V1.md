# MealKey Agent Runtime Architecture V1.0（智能体运行时架构冻结）

> **状态：正式冻结（Freeze）— 把经营编程器变成可运行系统**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游：** Business Object Model · Goal Compiler · AI Agent Core（餐饮经营 AI）· Agent Persona  
> **边界服从：** `MEALKEY_AGENT_RUNTIME_BOUNDARY_V2`（四席 vs Runtime vs 治理）· 权限模型 V2 · Council System  
> **明确不做：** ChiefAgent=大脑/第二 Brain；绕过 Goal Compiler 直聊出终局；Council 当聊天室；第五顾问席；Runtime 再注册 M-* 席。

---

## 〇、一句话

> 用户输入一句话之后：**谁判断、调谁、何时进常委、何时落 Decision、何时写 Memory**——由本文冻结。

```text
Natural Language / File / Observe / Continue
        ↓
   Runtime Orchestrator（ChiefAgent = 入口与编排，不是大脑）
        ↓
   Goal Compiler（编译经营程序）
        ↓
   Agent Runtime（能力函数执行）
        ↓
   Decision Engine（候选 → 常委/决策室 → MKDecision）
        ↓
   Business Objects 更新（Asset / Action / Memory）
```

**ChiefAgent 是入口，不是大脑。** 大脑 = Business Objects + Brain/Memory + Compiler + DIE。

---

## 一、运行时角色（冻结）

| 角色 | 职责 | 不是 |
|------|------|------|
| **Orchestrator（ChiefAgent）** | 接输入、装上下文、唤起 Compiler、汇总对老板话术、选 nextAction | 私有事实库、终局拍板者 |
| **Goal Compiler** | Intent→Goal→Gap→Workflow→Route 计划 | UI Wizard |
| **Capability Agents** | 四席 + L3 + Workflow 引擎 = **函数** | 老板入口列表 |
| **Council** | 战略/高风险压力测试与治理 | 七人闲聊 |
| **Decision Runtime** | MKDecision 状态机 | 平行 Case 表 |
| **Memory / Brain** | 读先验、写允许的沉淀 | 聊天 transcript SSOT |
| **M-EXEC** | 批准后执行 | 顾问席 |

---

## 二、主循环（Turn Loop · 冻结）

每一「回合」（一句话 / 一次上传 / 一次继续 / 一次雷达推进）：

```text
T0  Ingress          规范化 CompileInput
T1  AuthZ            主体 / 项目权限
T2  Context Load     Owner + Context + Goals + Decision Memory + Behavior
T3  Mode Select      explore | compile | continue | decide | execute_feedback
T4  Compile          跑 Goal Compiler（可短路径）
T5  Execute Caps     按 RoutePlan 调能力（可并行/串行）
T6  Gate             Deliberation：是否进 Council / 决策室
T7  Materialize      写 Goal/Workflow/Task/Asset/Decision(DRAFT|Candidate)
T8  Memory Write     按写入门禁回写
T9  Respond          bossSummary + 唯一 nextAction
```

失败策略：能力降级明示；低置信走澄清；**禁止**静默假装成功。

---

## 三、Mode Select（Chief 如何判断）

```typescript
type RuntimeMode =
  | "explore"            // 目标未清：最小追问
  | "compile"            // 新意图 / 文件 → 完整或增量编译
  | "continue"           // 推进当前 Goal 下一 Task
  | "decide"             // 用户确认拍板 / 打开决策室回写
  | "execute_feedback"   // 执行结果 / 复盘进入
  | "clarify";           // 意图置信不足
```

| 信号 | Mode |
|------|------|
| 无 active Goal + 模糊意图 | `explore` → `compile`（Seed） |
| 新 utterance / 文件且意图清晰 | `compile` |
| 「继续」/ Goal Awareness CTA | `continue` |
| 确认候选决策 / 决策室回调 | `decide` |
| 执行完成率 / D+N 复盘 | `execute_feedback` |
| intent.confidence < 阈值 | `clarify`（≤1–3 问） |

**禁止：** 默认 `forceAgent` 让用户选席位当主路径（调试 API 除外）。

---

## 四、何时调用哪个 Agent（Routing 规则）

Routing 输入：`Goal.type` + `current Task.capabilityHints` + Gap 分桶 + Context。  
Routing 输出：`RoutePlanV1`（见 Goal Compiler）；**不对老板暴露 Agent 名列表**。

### 4.1 四席默认映射（V1 启发式 · 可演进）

| Gap / Task 语义 | 优先 provider |
|-----------------|---------------|
| 定位 / 品牌 / 品类 / 客群 | `m-pnt` |
| 市场 / 商圈 / 竞品 / 进入 | `m-mkt` |
| 模型 / 财务 / 投资 / 利润 / 人效 | `m-biz` |
| 股权 / 合伙 / 治理结构 | `m-ed` |
| 诊断信号 / 运营感知 | `l3`（如 ops-diag）→ 先 Signal/Insight |
| 多域方案拼装 | Orchestrator 并行调用后 **合成一个 Asset** |

### 4.2 编排策略

| 策略 | 何时 |
|------|------|
| **单调用** | Gap 单一、Task 明确 |
| **并行扇出** | 开店方案 V1 需定位+财务+菜单草稿 |
| **串行依赖** | 选址依赖已确认定位 Asset |
| **跳过** | Decision Memory 已覆盖且无变更意图 |

外呼失败 → `heuristic` + `degraded=true`；不得假标 engine。

### 4.3 与「能力调度中心」对齐

MealKey AI / Chief **调度**专业能力模块；四席/L3 是函数（非「副总编制」）；**Knowledge** 仅注入 Context，不单独当老板模块。

---

## 五、Council 何时介入（冻结）

服从权限模型 V2 召回清单 + Compiler Deliberation Gate。

| 条件 | 动作 |
|------|------|
| 战略变轨 / 高投资 / 品牌定位终局 / 股权结构等召回项 | **必须** Council Review 或决策室挑战路径 |
| Task.`decisionRequired=true` 且影响 irreversible | 生成 Decision Candidate → 决策室；可挂 Council |
| 纯分析草稿、低风险补槽 | **不**开常委；只写 Asset draft |
| Runtime / L3 想改战略结论 | **禁止**直写；升级 |

**Council 不是**每轮聊天都开的「七人讨论群」。  
老板感知：方案中的「需你确认的关键决策」+ 决策室，而非选常委开会游戏。

---

## 六、何时生成 Decision（冻结）

```text
能力产出争议点/不可逆选择
        ↓
Decision Candidate（可挂 DIE Case 草稿）
        ↓
老板进入决策室（唯一拍板场）
        ↓
（如需）Council Review
        ↓
MKDecision 状态推进（DRAFT→…→APPROVED→…）
        ↓
可派生 Action（M-EXEC）+ Decision Memory 写入
```

| 禁止 | 必须 |
|------|------|
| Compile/Chief 回合内直接 `APPROVED` | Candidate 可建，终局要签字路径 |
| 今日页主 CTA 直接拍板 | 拍板回写 Goal.progress / Asset.status |
| 无 why 的 Decision | `reason` + evidence 引用 |

Case.id ≡ MKDecision.id 不破。

---

## 七、何时写入 Memory（冻结）

| 时机 | 写什么 | 层/类 |
|------|--------|-------|
| Context 已确认的事实变更 | Fact | Company / Brain |
| 决策 APPROVED / 老板显式确认 | Decision Memory（含 why） | PROJECT + MKDecision 链接 |
| 重复偏好 / 四类 BehaviorSignal | Pattern | Founder / UI |
| 方案 Asset 物化 | 可选摘要链接 | PROJECT |
| 聊天每句 | **不写** SSOT | — |
| 行业规律 | **默认不写** | Industry 须 opt-in |

写入前：Orchestrator 调用 Memory Runtime 门禁；失败不阻断老板可见 Asset，但要记 trace。

---

## 八、端到端时序（示例）

### 8.1 「我想开一家长沙社区餐厅」

```text
Ingress utterance
  → Mode=compile
  → Context Load（可能 Identity 不足 → 先最小身份）
  → Compiler: Goal CREATE_STORE + Unknowns
  → 少调用或零调用能力（先确认参数）
  → Materialize Goal draft
  → Respond: 复述目标 + ≤3 槽位问题
  → Memory: 仅 Goal 侧车，不写假事实
```

### 8.2 参数齐后「生成方案」

```text
Mode=compile/continue
  → Workflow Store Launch 动态生成
  → Route: m-pnt + m-biz (+…) 并行
  → 合成 Asset「开店方案 V1」
  → Gate: 定位/投资等 → pending Decisions
  → Respond: 方案已生成 + 今日确认哪一个决策
  → Memory: Asset 引用；Decision 仍 Candidate
```

### 8.3 老板在决策室确认「40 SKU」

```text
Mode=decide
  → MKDecision APPROVED（why 入库）
  → Goal/Task 推进
  → Memory: Decision Memory
  → 可选 M-EXEC Action
  → 下次 Compile Context Load 必读此决策
```

---

## 九、与六大 Runtime / 雷达的咬合

| 事件 | Runtime 路径 |
|------|----------------|
| 雷达高优 Signal | observe → 建议 Compile 并入 Goal 或开子 Goal |
| Risk / Opportunity 命中 | 可作为 Gate 升级或 Proactive 来源 |
| Growth / Evolution | execute_feedback 回合写 Pattern / Learning |
| Decision Runtime | 唯一 Decision 状态机宿主 |

**禁止**再开第七 Runtime；本「Agent Runtime Architecture」= **编排规范**，不是新 Runtime 产品席。

---

## 十、可观测性（V1 最小）

每回合 `RuntimeTrace`：

- `mode`, `goalId`, `providersUsed`, `degraded`
- `councilInvoked`, `decisionCandidateIds`
- `memoryWrites[]`（layer/type）
- `nextAction`

用于评测「是否在编译目标」而非「是否聊得欢」。

---

## 十一、禁做清单

- ❌ ChiefAgent 私存经营事实绕过 Brain/BOM  
- ❌ 用户主路径 `forceAgent` 点名四席  
- ❌ 每轮强制七常委开会  
- ❌ 能力输出直接当 APPROVED Decision  
- ❌ 聊天全文进 Memory  
- ❌ 为编排新建平行「RuntimeDecision」表  

---

## 十二、工程落地顺序

| 顺序 | 事项 |
|------|------|
| R0 | 本文 + BOM + Compiler 对齐 AUTHORITY |
| R1 | `goal-compiler.ts` 契约 |
| R2 | Orchestrator 薄封装：Mode Select + 调 Compiler（可先 heuristic） |
| R3 | RoutePlan → 现有四席 client 扇出合成 Asset |
| R4 | Gate → Decision Candidate / 决策室已有路径 |
| R5 | Memory 写入门禁接线 + Trace |

---

## 十三、一句话收口

> **Orchestrator 接话 → Compiler 出程序 → Agents 当函数 → Council/决策室守终局 → Objects/Memory 沉淀。**  
> 这就是可运行的 MealKey 经营编程系统。

# MealKey Goal Compiler V1.0（目标编译器详细设计 · 冻结）

> **状态：正式冻结（Freeze）— 决定 MealKey 是否具备「经营 coding 能力」**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游：** `MEALKEY_AI_AGENT_CORE_ARCHITECTURE_V1` · `MEALKEY_AI_NATIVE_INTERACTION_ARCHITECTURE_V1` · Core Loop  
> **下游接线：** Workflow / Consulting-OS（内部）· 四席/L3（函数）· DIE/Council（审议）· M-EXEC · Memory  
> **对象骨架：** `docs/MEALKEY_BUSINESS_OBJECT_MODEL_V1.md`  
> **明确不做：** 新开第七 Runtime；Compile 直出终局 Decision；平行 Goal/Decision Prisma 大表；教老板写代码；固定 Wizard 冒充实动态 Workflow；**无大模型冒充宿主正式编译**。  
> **模型：** 宿主编译大脑始终在线（`llm-compile`）；启发式仅脚手架/单测；L3 工具 Agent 另论。

---

## 〇、定义

> **Goal Compiler** = 将经营者自然语言（及文件/观察派生意图）**编译**为结构化目标、任务图、能力调用与专业经营资产的引擎。

| 普通 AI Chat | MealKey |
|--------------|---------|
| 输入问题 → 输出答案 | **输入意图 → 编译成经营系统 → 推动目标实现** |
| 急着回答 | **先理解「你到底想完成什么」** |
| 管理数据（SaaS） | **编译目标（OS）** |

**编译器隐喻（冻结）：**

```text
程序员源码 → 词法/语法分析 → 编译 → 机器执行
老板自然语言 → 经营语义理解 → 目标模型 → 任务/能力 → 专业成果
```

老板说话 = **经营自然语言（NL）**；MealKey = **编译成经营程序**。  
这就是 Natural Language Programming；**不是**教老板写 Python。

**对象真源：** 编译产物挂 `MEALKEY_BUSINESS_OBJECT_MODEL_V1`。  
**运行编排：** `MEALKEY_AGENT_RUNTIME_ARCHITECTURE_V1`（何时 Route / Council / Decision / Memory）。

---

## 〇·二、五层编译结构（概念层 · 冻结）

工程管道见 §一（11 步）；老板/产品语义收敛为五层——**不得做成固定 Wizard 页面墙**。

| Layer | 名称 | 做什么 | 映射 §一 |
|-------|------|--------|----------|
| **L1** | Intent Parsing | 经营语义理解；不急着答 | ①–② |
| **L2** | Goal Modeling | 模糊目标 → 结构化 Goal（含 Unknown） | ③ |
| **L3** | Gap Analysis | Goal Gap Map：战略/产品/财务/运营缺口 | ③ 槽位 + ④ 前半 |
| **L4** | Workflow Generation | **动态**生成步骤（随投资额/连锁规模变化） | ④–⑤ |
| **L5** | Agent Orchestration | 调用能力函数；老板只见方案 V1 | ⑤–⑨ |

### L1 Intent Parsing 示例

> 「我想做一家年轻人喜欢的长沙小馆。」

```json
{
  "goalFamily": "brand_creation",
  "industry": "餐饮",
  "category": "湘菜",
  "audience": "年轻消费者",
  "latentNeed": "差异化定位"
}
```

### L2 Goal Modeling 示例

```json
{
  "goal": "开第一家店",
  "success": "6个月盈利",
  "constraints": { "city": "长沙", "area": "200㎡", "investment": "300万" },
  "unknown": ["位置", "客群", "菜单", "模型"]
}
```

**没有目标模型，就没有智能。**

### L3 Gap Analysis → Goal Gap Map

```text
目标: 开店成功
已有: ✅ 品类
缺口: ❌ 客群 · 商圈 · 投资模型 · 菜单结构
分桶: 战略缺口 / 产品缺口 / 财务缺口 / 运营缺口
```

### L4 Workflow Generation（动态，非固定 Wizard）

开店可生成：定位 → 模型 → 选址 → 菜单 → 供应链 → 团队 → 开业。  
「投资 50 万小店」与「100 家连锁」**流程不同**——按 Goal slots / successCriteria 生成，禁止写死唯一七步 UI。

### L5 Agent Orchestration

内部调用 Brand/Finance/Product…；用户只见：

```text
开店方案 V1：品牌定位 · 投资模型 · 菜单结构 · 盈利预测 · 风险分析
```

---

## 〇·三、协作四阶段（交互语义 · 冻结）

| 阶段 | 行为 |
|------|------|
| 探索 | 「先帮你明确目标。你希望解决什么？」 |
| 编译 | 复述目标 + 确认 ≤3 关键参数（Unknown） |
| 生成 | 「已生成第一版经营模型」+ Assets |
| 协作优化 | 「价格太高」→ 调客群/模型，升版本，不重开无知对话 |

---

## 一、编译总管道（工程层 · 冻结）

```text
Input（说 / 上传 / 观察 / 「继续」）
        ↓
① Context Load          装载四层记忆 + 进行中 Goal
        ↓
② Intent Extraction     意图识别（非任务工单）
        ↓
③ Goal Modeling         Goal Seed → Goal Object（unknown 显式）
        ↓
④ Task Decomposition    SubGoals + taskGraph + 依赖
        ↓
⑤ Capability Plan       需要哪些能力函数（非展示 Agent 列表）
        ↓
⑥ Agent Routing         调用 / 编排 / 降级
        ↓
⑦ Deliberation Gate     战略/高风险 → Council / 决策室候选
        ↓
⑧ Output Generation     结构化成果 + 老板可读摘要
        ↓
⑨ Asset Materialize     Decision Asset / Artifact 落库引用
        ↓
⑩ Memory Update         回写允许的记忆层 + Goal.progress
        ↓
⑪ Next Action           唯一主 CTA / 最小追问 / 进决策室
```

V1 实现可合并相邻步，**语义顺序不得颠倒**（尤其：先 Context/Goal，后 Routing；先 Gate，后假装终局）。

---

## 二、输入模型（CompileInput）

```typescript
type CompileTrigger =
  | "utterance"      // 一句话 / 语音转写
  | "file"           // 上传派生
  | "observe"        // 雷达 Signal / Goal Awareness
  | "continue"       // 老板说「继续」推进当前 Goal
  | "confirm_slot";  // 补齐 unknown 槽位

type CompileInputV1 = {
  restaurantRef: string;          // 经营主体；缺失则先 Identity 最小门禁
  trigger: CompileTrigger;
  utterance?: string;
  fileRefs?: Array<{
    id: string;
    kind: "xlsx" | "csv" | "image" | "pdf" | "doc" | "chat_export" | "other";
    label?: string;
  }>;
  signalId?: string;              // observe
  goalId?: string;                // continue / 挂靠已有 Goal
  slotPatches?: Record<string, string | number | boolean>;
  locale?: string;
};
```

**铁律：** 无 `restaurantRef`（且无 Identity）不得深度编译——只允许 Goal Seed + 身份/画像最小追问。

---

## 三、各阶段规格

### ① Context Load

装载包（Compile 前必读，失败则降级声明）：

| 块 | 来源 | 用途 |
|----|------|------|
| Owner Profile | Founder Memory / UI | 输出形态、风险语气 |
| Business Context | Brain / RIP / Identity | 禁止与已确认事实矛盾 |
| Decision Memory | MKDecision 摘要 | 禁止重问已决 |
| Behavior Memory | preference / BehaviorSignal | 详略、先战略后细节 |
| Active Goals | Goal Model | 合并 vs 新建 Goal |
| Open Unknowns | 当前 Goal.slots | 优先补槽而非新开题 |

### ② Intent Extraction

输出：

```typescript
type IntentExtractionV1 = {
  intentFamily:
    | "launch_store"
    | "improve_profit"
    | "diagnose_performance"
    | "expand_store"
    | "positioning"
    | "other_operating";
  confidence: number;             // 0–1
  rawSummary: string;             // 一句话复述老板意图
  derivedFromFile?: boolean;
  needsClarify: boolean;
};
```

**示例：**「生意不好」→ `diagnose_performance` / 或导向 `improve_profit`（若语境已是改善）。  
低置信 → `needsClarify=true`，进入最小追问，不瞎拆 taskGraph。

### ③ Goal Modeling

**种子原则：** 一句话 = Goal Seed ≠ 任务清单。

```typescript
type GoalSlotValue = string | number | boolean | "unknown";

type GoalObjectV1 = {
  goalId: string;
  intentRaw: string;
  goalType: IntentExtractionV1["intentFamily"];
  title: string;                  // 老板可读，如「提升门店经营表现」
  successCriteria?: string;       // 可量化优先
  slots: Record<string, GoalSlotValue>;
  status: "draft" | "active" | "blocked" | "completed" | "abandoned";
  progress: number;               // 0–100
  currentStage?: string;
  restaurantRef: string;
  parentGoalId?: string;
  createdAt: string;
  updatedAt: string;
};
```

**开店示例 slots：** `location`, `category`, `store_size`, `investment`, `price_band`…  
未知必须 `"unknown"`，禁止模型幻觉填数。

**合并规则：**

- 若 Active Goal 同 `goalType` 且未 completed → 默认挂靠，不平行新建  
- 老板显式新目标 → 新 Goal；旧 Goal 保持  

### ④ Task Decomposition

```typescript
type TaskNodeStatus = "pending" | "active" | "blocked" | "done" | "skipped";

type TaskNodeV1 = {
  id: string;
  title: string;                  // 老板可读
  purpose: string;
  dependsOn: string[];
  status: TaskNodeStatus;
  capabilityHints: string[];      // 内部能力键，不暴露给老板选
  decisionRequired: boolean;      // 是否可能进决策室
  artifactTypes: string[];        // 预期产出类型
};

type TaskGraphV1 = {
  goalId: string;
  nodes: TaskNodeV1[];
  entryNodeId: string;
};
```

**诊断类默认骨架（可裁剪）：**

```text
提升门店经营表现
  1 诊断问题
  2 找到关键变量
  3 制定改善方案
  4 验证效果
```

**利润类默认骨架：** 收入侧 / 成本侧 / 运营侧（见 Architecture 示例）→ 再挂验证。

### ⑤ Capability Plan + ⑥ Agent Routing

```typescript
type CapabilityCallV1 = {
  capabilityId: string;           // 如 finance.diagnose / menu.optimize（内部）
  provider: "m-pnt" | "m-mkt" | "m-biz" | "m-ed" | "l3" | "workflow" | "heuristic";
  inputRef: string;               // 上下文快照引用
  priority: number;
};

type RoutePlanV1 = {
  goalId: string;
  stageNodeId: string;
  calls: CapabilityCallV1[];
  parallel: boolean;
};
```

**老板可见：** 「正在生成利润提升方案 v1」  
**老板不可见：** 四个 Agent 人名列表 / 选人 UI  

降级：外呼失败 → heuristic + 明示；**不得**假标 engine。

### ⑦ Deliberation Gate

| 条件 | 动作 |
|------|------|
| `decisionRequired` 且战略/高风险 | 产出 Decision Candidate → 决策室；命中召回 → Council |
| 仅分析/草稿 | 可 Materialize Artifact，标记 `needsFounderSignOff=false` |
| 权限模型 V2 召回清单 | **禁止** Compile 直出终局 MKDecision |

### ⑧ Output Generation

```typescript
type CompileOutputV1 = {
  goal: GoalObjectV1;
  taskGraph: TaskGraphV1;
  bossSummary: string;            // 短、无术语墙
  artifacts: Array<{
    type: string;
    title: string;
    version: string;              // v1, v1.1…
    bodyRef: string;              // 结构化存储引用
  }>;
  pendingDecisions: Array<{
    title: string;
    reason: string;
    candidateId?: string;
  }>;
  questions: Array<{              // 最小追问，≤3
    slot: string;
    prompt: string;
  }>;
  nextAction: {
    kind: "ask_slot" | "continue_stage" | "open_decision_room" | "review_artifact";
    label: string;
  };
  trace: {
    intentConfidence: number;
    providersUsed: string[];
    degraded: boolean;
  };
};
```

### ⑨ Asset Materialize

每次有效编译至少落一样：Goal 更新 / Artifact / pending Decision。  
版本化：同 `type` 递增 `v1 → v1.1`；右侧 Workspace 资产树可读。

### ⑩ Memory Update

| 可写 | 条件 |
|------|------|
| Goal 进度 / stage | 总是（本编译事务） |
| Artifact 引用 | 总是 |
| Decision Memory | 仅签字后或显式确认的决策要点 |
| Behavior Memory | 仅四类燃料或显式偏好确认 |
| Industry | **默认禁止** |

### ⑪ Next Action

首页/秘书/Workspace 中间区只推 **一个** `nextAction`。  
多 Goal 时由 Goal Awareness 选今日优先，再 Compile `continue`。

---

## 四、端到端示例

### 例 A · 诊断

**输入：**「帮我看看这个店为什么生意不好。」

```text
Intent: diagnose_performance
Goal.title: 提升门店经营表现
taskGraph: 诊断 → 关键变量 → 改善方案 → 验证
Route: 经营分析能力 +（按需）菜单/人效…
Output: 问题假设列表 Artifact v1 + nextAction=补营业数据或进方案
```

### 例 B · 文件

**输入：** 上传《2025营业数据.xlsx》

```text
Intent: improve_profit (derivedFromFile)
Evidence: 午餐客流-20% / 招牌贡献下降 / 人效偏低
bossSummary: 发现三个问题…是否进入利润优化方案？
nextAction: confirm → Compile continue 生成利润提升计划
```

### 例 C · 继续

**输入：**「继续」（goalId=开店筹备）

```text
Context: 定位✅ 模型✅ 选址⏳
Advance: 激活选址节点或提示缺租金 slot
禁止: 重新从「你想开什么店」问起
```

---

## 五、错误与诚实（冻结）

| 情况 | 行为 |
|------|------|
| 意图置信低 | 1 个澄清问，不生成假 taskGraph |
| 与 Decision Memory 冲突 | 提示「与 2026-07 决策矛盾」，请确认变更 |
| 能力降级 | `trace.degraded=true` + 老板可见说明 |
| 缺关键槽位 | `status=blocked` + `questions[]` |
| 无主体 | 打断 Compile，走 Identity/RIP |

---

## 六、与 Workflow / 六步 / DIE 的边界

| 对象 | 关系 |
|------|------|
| Consulting-OS 六步 | **可选**作为某 `capabilityId` 的内部实现；禁止当老板主 IA |
| DIE Case | Gate 后 Promote；Case.id≡MKDecision.id |
| Council | Deliberation Gate 内；非聊天 |
| M-EXEC | 签字后的 Action Package；Compiler 可预生成草稿行动，执行权仍服从权限模型 |

---

## 七、工程落地顺序（契约先于 UI）

| 顺序 | 事项 | 建议落点 |
|------|------|----------|
| G0 | 本文冻结 + AUTHORITY | docs |
| G1 | `GoalObjectV1` / `CompileInput` / `CompileOutput` 契约 | `founder-layer/contracts/goal-compiler.ts` |
| G2 | Context Load 组装器（只读 Brain/Memory/Goal） | server 薄编排 |
| G3 | 竖切：`diagnose_performance` 或 `improve_profit` 一条管道 | 可 heuristic 先绿 |
| G4 | 文件→Evidence→Intent 最小路径 | 上传 + 三问题摘要 |
| G5 | Workspace/今日挂 `nextAction` + taskGraph 投影 | 表面，非视觉大改 |

**禁止**在 G1–G3 前做经营 IDE 视觉大改版。

---

## 八、验收判据（Compiler 具备 coding 能力）

1. 一句话能得到 **Goal + taskGraph + nextAction**，而非纯长文  
2. 二次「继续」不丢失阶段、不重问已确认决策  
3. 文件能触发 Intent 并给出结构化发现 + 是否开 Goal  
4. 战略节点出现 pendingDecision，而非静默终局  
5. 老板路径无「请选择 Agent」  
6. Memory 回读可演示（开二店引用首店决策要点）

---

## 九、一句话收口

> Goal Compiler：把 **意图** 编译成 **目标程序**（taskGraph），调用 **能力函数**，产出 **版本化经营资产**，并在门禁下进入 **决策与执行**——这就是 MealKey 的经营 coding。

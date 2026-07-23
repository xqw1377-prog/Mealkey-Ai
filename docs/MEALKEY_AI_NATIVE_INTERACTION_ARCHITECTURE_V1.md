# MealKey AI Native Interaction Architecture V1.0（表现层范式冻结）

> **状态：正式冻结（Freeze）— 产品范式升级，非 UX 微调**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **配套原则句：** 进目标，不进模块；Chat 是入口，状态与决策是本体。  
> **交互宪法（防 GPT 退化）：** `docs/MEALKEY_INTERACTION_CONSTITUTION_V1.md` — 冲突时宪法优先  

> **上游服从：** Core Product Loop · Decision Experience · DIE · Council · Restaurant Brain · User Intelligence · MVP 停扩闸门 · Interaction Principle  

> **生命周期闭环：** `docs/MEALKEY_AI_NATIVE_CORE_LOOP_V1.md`（首访→长期变懂）  
> **智能体四大核心：** `docs/MEALKEY_PERSISTENT_BUSINESS_AGENT_V1.md`  
> **Agent 核心架构 / Goal Compiler：** `docs/MEALKEY_AI_AGENT_CORE_ARCHITECTURE_V1.md` · `docs/MEALKEY_GOAL_COMPILER_V1.md`  
> **明确不做：** 不画几十页 UI；不新增第七 Runtime；不把 Agent 列表做成老板入口；不推翻 OperatingShell / Agent / Workflow / Memory / Knowledge / MKDecision / Council。

---

## 〇、产品身份（冻结）

| 过去（禁止再叙事） | 现在（冻结） |
|-------------------|--------------|
| 餐饮 AI 工具集合 | **长期经营智能体（Persistent Business Agent）** |
| AI 助手 / ChatGPT 壳 | 持续学习用户 · 理解意图 · 编译为专业经营系统 |
| 餐饮 SaaS 功能目录 | 主动式 **AI 经营协作界面**（Chat 只是意图通道之一） |
| 经营编程器（前序称呼） | **保留为 Compiler 能力隐喻**；产品身份升级为智能体 |

**系统定位（保留）：** AI 餐饮经营操作系统 / 餐饮经营能力增长系统。

**交互 / 智能体定义（冻结 · 2026-07-23 校准）：**

> **MealKey 是持续学习用户经营场景、理解经营目标、将专业餐饮知识转化为经营能力的 AI（增强老板，非 AI 副总）。**  
> 通过自然语言和文件输入编译专业方案与决策资产，并在持续协作中越来越懂用户。详见 `MEALKEY_AGENT_PERSONA_V1`。

**交互最高原则（冻结）：**

> **用户简单，产出专业**（复杂能力隐藏程度 = 竞争力）。  
> **进目标，不进模块；Chat 是入口，状态与决策是本体。**  
> **真资产 = 用户经营上下文**，不是页面。

**Intent 多态（冻结）：** 说 + 上传 + 观察（非填表主路径）。详见 Persistent Business Agent §2.3。

**核心公式（冻结）：**

```text
Human Intent          （人的目标）
        ↓
AI Understanding      （理解 · Identity/Brain/Memory）
        ↓
Goal Compilation      （编译 · Goal Compiler）
        ↓
Agent Execution       （能力调用 · 函数非聊天机器人）
        ↓
Decision Asset        （决策资产 · 非聊天记录）
        ↓
Business Evolution    （经营进化 · Memory/Growth/User Intelligence）
```

---

## 一、与现有系统架构对齐（冻结 · 不重开组织设计）

表现层三层 **不是** 新 Runtime，而是对既有能力的**老板侧投影**：

```text
                 用户
                  |
                  ↓
          Intent Layer          ← 意图捕获（一句话 / 语音 / 信号点击）
          意图输入层
                  ↓
          Goal Engine           ← 目标编译（理解 / 拆解 / 规划 / 调用）
          目标编译层
                  ↓
          Execution OS          ← 执行状态（进度 / 决策 / 成果资产）
          执行状态层
```

| 现有对象 | 新解释（表现层） | 不变铁律 |
|----------|------------------|----------|
| OperatingShell | AI 经营工作台 | 壳可改 IA，不可变拍板权 |
| Agent（四席 / L3） | **编译器内部函数** | 禁止升格为老板主入口 |
| Workflow / Consulting-OS | 执行程序（幕后） | 六步可作内部流程，禁止当主菜单 |
| Memory | 企业长期上下文 | **禁止用聊天流水代替资产** |
| Knowledge | 专业知识库 | 老板不学术语 |
| MKDecision | 决策结果第一公民 | Case.id ≡ MKDecision.id |
| Council | AI 内部审议机制 | 治理委员会，不是七人聊天 |
| DIE / Signal / Radar | 主动发现 → 进编译 / 进决策 | 雷达仍是日活发现面 |
| M-EXEC | 执行推进 | 不得做顾问席 |
| User Intelligence | 越决策越懂老板 | 四类燃料；非聊天学习 |

**关键冻结：** Agent 不再是用户入口，而是 AI 内部能力。

---

## 二、核心交互范式（冻结）

### 2.1 禁止（SaaS 时代）

```text
用户 → 寻找功能 → 选择 Agent → 填写表单 → 获得答案
```

### 2.2 采用（AI OS 时代）

```text
用户目标 → AI 理解 → AI 规划 → Agent 协作 → 专业产出 → 目标推进
```

### 2.3 Chat 重新定义

| Chat 不是 | Chat 是 |
|-----------|---------|
| 产品本体 | **Intent Capture Layer（意图捕获层）** |
| 资产真源 | 触发编译的瞬时输入 |
| 七常委工作方式 | 老板表达「想解决什么」的低成本通道 |

示例：

```text
老板：「我想做一个长沙社区餐厅。」
AI 识别：
  目标类型 = 创业开店
  缺失信息 = 面积 / 客群 / 投资预算…
  调用 = 开店规划 Compile Pipeline
```

**真正的产品核心 = Goal Runtime（目标运行时）**  
工程上加深既有 Decision Runtime + Workflow + Project/Goal 投影，**禁止**注册第七 Runtime 或 `M-GOAL` 顾问席。

---

## 三、四大底层模型（本文件正文 · UI 后置）

以下四个模型确定后，UI 自然生长。**下一阶段设计对象 = AI 行为，不是页面堆叠。**

### 3.1 Goal Model（用户目标模型）

**定义：** MealKey 的根；老板侧第一公民之一；可编译、可进度、可沉淀；不是菜单项，不是聊天线程。

**种子原则（冻结）：**

> **一句话 ≠ 一个任务。一句话 = 一个目标种子（Goal Seed）。**

自然语言进入后，先编译为结构化 Goal Object（未知字段显式 `unknown`，禁止装懂）：

```text
Goal Object（示例语义）
{
  goal_type:   开店
  industry:    餐饮
  location:    长沙
  category:    湘菜
  store_size:  unknown
  investment:  unknown
  target:      首店成功
}
```

| 字段（语义） | 说明 | 工程锚点（优先复用，禁平行大表） |
|--------------|------|----------------------------------|
| `goalId` | 目标 ID | Project / 经营目标投影；可与 Case 族关联 |
| `intentRaw` | 原始一句话 / 语音转写 | Intent Layer 捕获；可入 Memory 摘要，不替代资产 |
| `goalType` | 开店 / 扭亏 / 提利润 / 扩店 / 日常决策… | 枚举可演进；V1 先覆盖 MVP 单店场景 |
| `slots` | 结构化槽位（城市/品类/面积/预算…） | 含 `unknown`；驱动最小追问 |
| `title` | 老板可读目标名 | 如「长沙社区餐厅首店」 |
| `successCriteria` | 成功标准（可量化优先） | 如「30 天利润 +15%」 |
| `status` | `draft` / `active` / `blocked` / `completed` / `abandoned` | 状态机属 Goal Engine |
| `progress` | 0–100 或阶段完成比 | 首页进度条真源 |
| `currentStage` | 当前阶段名（老板可读） | 如「菜单模型设计」 |
| `taskGraph` | 拆解后的任务节点 | Compile 产出；节点可挂 Decision / Work |
| `pendingDecisions[]` | 待确认关键决策 | → Decision Inbox / 决策室 |
| `artifacts[]` | 专业成果引用 | Decision Asset（见 §3.4） |
| `restaurantRef` | 经营主体 | Identity / Brain |
| `updatedAt` | 最近推进时间 | 主动行为排序用 |

**目标生命周期（冻结）：**

```text
Intent Captured → Goal Seed → Goal Drafted → Compiled (taskGraph)
  → In Progress ↔ Blocked(缺信息/待拍板)
  → Completed | Abandoned
```

**禁令：**

- 禁止把「选 Agent」建成 Goal  
- 禁止 Goal = 聊天 Session  
- 禁止把一句话直接当成已填完的任务清单  
- 禁止无 `restaurantRef` / Identity 语境的空转编译（可先追问最小信息）

---

### 3.2 Goal Compiler / Compile Pipeline（目标编译器）

**定义：** MealKey 相对 ChatGPT 的核心差异——**回答问题 vs 编译目标**。  
把意图变成可执行目标结构 + 专业产出的流水线（经营编程器后台）。

**ChatGPT：** 给建议。  
**MealKey：** 生成可推进的计划（含收入/成本/运营等拆解）→ 进入 Workflow → 形成方案资产。

```text
① Capture     Intent Layer 捕获一句话 / 信号点击 / 雷达「推进」
② Understand  结合 Identity · Brain · Memory · 最近 Goal 理解语境
③ Frame       目标类型 + 成功标准 + 约束 / Unknowns
④ Plan        拆 taskGraph（阶段 · 依赖 · 所需能力）
⑤ Invoke      按需调用 Agent / Workflow（函数调用，非用户选人）
⑥ Deliberate  触及战略/高风险 → Council Review（不得绕过）
⑦ Decide      产出/推进 MKDecision（老板签字场仍在决策室）
⑧ Materialize 结构化成果写入 Decision Asset / Goal.artifacts
⑨ Advance     更新 progress · currentStage · 下一步建议
⑩ Learn       BehaviorSignal / Evolution（服从 User Intelligence 四类燃料）
```

**「经营编程」隐喻（老板不可见）：**

```text
目标 = 开店
参数: 城市=长沙, 面积=200㎡, 客单=50
调用: 定位能力 + 选址能力 + 财务模型 + 菜单能力
生成: 经营方案 v1 + 待拍板决策列表
```

**与 DIE 对齐（冻结）：**

- 雷达/Signal 发现的事项 → 可 Promote 为 Goal 节点或直接进 Case  
- Case / Option / Evidence 仍服从 DIE Data Contract  
- **禁止** Compile 直出终局 Decision 绕过 Council（权限模型 V2 召回清单仍生效）  
- **禁止** 平行再造一套 DecisionCase Prisma 大表

**V1 编译触发源（仅三种）：**

1. 老板一句话 / 语音（Intent）  
2. 今日雷达「今天推进」/ 待确认决策  
3. 系统 Proactive 规则命中（见 §3.3）

---

### 3.3 Proactive Rules · Goal Awareness（主动机制）

**定义：** 何时系统应主动出现，而不是等用户逛菜单。  
产品形态 = **主动式 AI 经营协作界面**，不是主动式 Chat 刷屏。

**Goal Awareness（冻结）：**

> 我们不做假监控企业。我们做 **目标进度感知**。

AI 知道用户正在推进什么 Goal、各 Stage 状态，从而主动建议下一步（例如：定位已确认 → 应进菜单模型，否则选址失真）。雷达 Signal 可并入 Goal；**禁止**假装已接入全量 ERP/摄像头式「监控」。

| ID | 触发条件 | 系统行为 | 老板感知 |
|----|----------|----------|----------|
| P1 | 有 `active` Goal 且存在 `pendingDecisions` | 首页置顶「N 个关键决策待确认」+ CTA 进决策室 | 今天有该拍的板 |
| P2 | Goal `blocked` 且 Unknowns 可追问 | 一次最小追问（非问卷墙） | AI 在补齐开店参数 |
| P3 | 雷达高优 Signal 与当前 Goal 相关 | 建议并入当前 Goal 或开子决策 | 店里出事了，系统已知 |
| P4 | Stage 完成但下一 Stage 未启动 | 推「下一步：…」单一 CTA（Goal Awareness） | 目标在自己推进 |
| P5 | D+N 复盘窗口（服从既有 Evolution） | 进入今日复盘槽，不进咨询闲聊 | 结果回来了 |
| P6 | 连续无推进超过阈值阈值 | 温和提醒当前 Goal；禁止营销式推送轰炸 | 还在帮你盯着 |
| P7 | 多 Goal 并存 | 建议今日优先推进哪一个（一件事） | 帮我排优先级 |

**主动行为禁令：**

- ❌ 无 Goal / 无 Signal 时用闲聊凑活跃  
- ❌ 同时推多个平行 Agent「找我聊聊」  
- ❌ 把 Proactive 做成通知垃圾场（首页仍服从「一件事」）  
- ❌ 伪造「已监控门店实时数据」  
- ❌ 未 opt-in 写行业模型（User Intelligence）

**与「消灭聊天框」的统一（冻结）：**

- 桌面生产力产品减少聊天噪声；MealKey 允许 Chat 作意图入口  
- **最终统一：不是聊天，而是人与智能系统共同完成目标**  
- 协作面必须三层融合（见 §4）

---

### 3.4 Decision Asset Model（成果资产模型）

**定义：** 编译与拍板后留下的结构化资产；**聊天记录不是资产。**

| 资产类型 | 老板可见 | 系统真源 |
|----------|----------|----------|
| Goal Snapshot | 目标名 / 进度 / 阶段 | Goal Model |
| Task Graph View | 定位 ✅ · 模型 ✅ · 选址 ⏳ · 菜单 ❌ | Goal.taskGraph |
| Decision Record | 议题 / 选项 / 裁决 / 条件 / 停止线 | MKDecision + DIE |
| Evidence Pack | 依据摘要（可读） | M-INTEL / Context |
| Action Package | 下一步谁做什么 | M-EXEC |
| Learning Note | 预测 vs 实际 · 习惯校准 | Evolution / Growth / User Intelligence |
| Artifact Doc | 方案 v1 / 菜单模型等结构化结果 | Goal.artifacts[]（可挂文件/卡片 DTO） |

**资产铁律：**

1. 每次有效编译至少留下：**Goal 更新** 或 **Decision** 或 **Artifact** 之一  
2. Session / Chat transcript **最多**作调试与摘要原料，不得当 SSOT  
3. 专业结果必须结构化（字段 / 卡片 / 可回放），禁止纯长文聊死  
4. 战略级资产变更须可追溯到 Council / 老板签字（权限模型 V2）

---

## 四、交互形态 · 首页（IA · 非视觉稿）

### 4.1 三层协作面（冻结 · 最终不是纯 Chat）

```text
┌────────────────┐
│ 对话            │  Intent：输入目标 / 「继续」
└────────────────┘
┌────────────────┐
│ 目标状态        │  Goal：当前阶段 / 进度 / 下一步
└────────────────┘
┌────────────────┐
│ 专业成果        │  Asset：方案 / 决策 / 报告
└────────────────┘
```

三者融合为 **AI 协作流**。用户看到的是「利润提升方案 v1」，不是「4 个 Agent 在讨论」。

### 4.2 首页信息架构

**禁止做成能力目录：** 开店 / 选址 / 菜单 / 营销 / 财务 …

**应呈现：**

```text
问候 + 进行中的 Goal 列表（名 / 进度）
今天建议优先推进：单一事项（Goal Awareness）
主 CTA：继续 / 进入决策室
次入口：一句话「你现在想解决什么？」
```

服从既有约束：

- 日活发现面仍可投影雷达信号（`TODAY_RADAR` / 三易）  
- 拍板唯一场仍在决策室（AUTHORITY 13s）  
- 首屏一件事原则；禁止恢复 Agent 商城式首页

---

## 五、Agent 关系（冻结）

| 以前 | 未来 |
|------|------|
| 「我要找菜单 Agent」 | 「我要提高利润 20%」→ 系统编排分析/菜单/成本/营销等能力 |
| Agent = 员工列表 | Agent = **编译器里的函数** |
| 用户学习术语与模块 | 术语藏在 AI 内；老板只见目标与成果 |

四席与 L3 Tool Agent 全部保留为 Intelligence / Capability Provider；**Marketplace / Store 面向开发者与安装态，不改写老板首页为商城。**

---

## 六、禁做 / 必须（表现层清单）

### 禁止

- ❌ Agent 商城式首页  
- ❌ 功能菜单作为主入口  
- ❌ 大量表单 Wizard 当主路径（内部流程可保留）  
- ❌ 让老板学习 SWOT / 坪效等术语才能前进  
- ❌ 用聊天记录代替 Goal / Decision / Artifact  
- ❌ Agent 直出终局 Decision 绕过 Council  
- ❌ 为 Goal 新开第七 Runtime / 新顾问席  
- ❌ 并行再堆 SaaS 式页面来「显得完整」

### 必须

- ✅ 一个目标入口（意图 → Goal）  
- ✅ AI 主动拆解与规划  
- ✅ 自动形成/更新项目化 Goal  
- ✅ 自动沉淀 Memory / Decision Asset  
- ✅ 专业结果结构化  
- ✅ 战略路径保留常委审议与老板签字

---

## 七、设计重心转移（冻结）

| 以前设计问句 | 现在设计问句 |
|--------------|--------------|
| 按钮在哪里？菜单怎么排？ | AI 何时主动出现？ |
| 这个能力放第几 Tab？ | AI 如何理解目标并拆任务？ |
| 表单字段全不全？ | 如何形成能力闭环与资产？ |
| 页面够不够多？ | 老板是否只需一句话 + 看进度 + 拍板？ |

**结论：** 停止传统 SaaS 式页面堆叠；不是完全不要设计，而是设计重点从「页面设计」转向「AI 行为设计」。

---

## 八、冲突裁决

1. 与 **能力中心网格 / Agent 列表主 IA** 冲突 → **以本文为准**（能力沉幕后）。  
2. 与 **Decision Experience / 雷达 / 三易** 冲突 → 保留「今日发现 + 一件事 + 决策室拍板」；本文把「今日」升级为 **Goal 进度 + 主动推进** 的协作面，二者合并而非对立。  
3. 与 **Consulting-OS 六步** 冲突 → 六步可为 Compile/Invoke 内部程序；**禁止**再作为老板主导航叙事。  
4. 与 **Council / 权限 / DIE 契约** 冲突 → **以后者为准**（本文不授予表现层终局权）。  
5. 与 **MVP 停扩** 冲突 → 先跑通单店日活飞轮；本文冻结范式，**不授权**借机新开 Agent 面。

---

## 九、工程落地顺序（文档后 · 仍不先画 UI）

| 顺序 | 事项 | 说明 |
|------|------|------|
| 0 | 本文 + AUTHORITY 挂载 | 范式冻结 |
| 1 | Goal Model 最小 DTO / 投影 | 复用 Project + Decision 关系；禁平行大表 |
| 2 | Intent → Compile 单路径竖切 | 一句话开店或「利润下降」→ taskGraph + 一页状态 |
| 3 | 首页改为 Goal 协作面 | 替换能力目录主角色 |
| 4 | Proactive P1/P2/P4 | 与雷达待办合并 |
| 5 | Asset 卡片化 | 决策室/今日只读成果，不读聊天 |

代码真源后续单独立项；**未完成 1–2 前禁止大规模视觉改版。**

---

## 十、一句话收口

> MealKey = **Intent → Goal → Compile → Decide → Execute → Learn** 的人机协作 OS。  
> 表现层最高原则：**进目标，不进模块；Chat 是入口，状态与决策是本体。**

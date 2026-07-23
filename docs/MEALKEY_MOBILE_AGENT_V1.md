# MealKey Mobile Agent V1.0（移动端优先 · 关系验证冻结）

> **状态：正式冻结（Freeze）— 工程顺序与移动端第一阶段目标**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游：** Agent Persona · Goal Compiler · BOM · Runtime · Core Loop · Core Product Loop（日活）  
> **明确不做：** 先做漂亮 Web 工作台；移动端五 Tab 功能墙；无关系验证前上 MealKey Studio；用界面代替「愿不愿意交给 MealKey」的验证。

---

## 〇、为什么先做移动端（冻结）

> 核心价值「越来越懂用户的餐饮经营 AI」首先要验证：  
> **用户是否愿意持续和这个 AI 交流，让 AI 理解自己的经营意图。**  
> 这件事发生在**移动端**。

| | 移动端 | Web（后置） |
|--|--------|-------------|
| 解决 | **第一性：为什么每天打开 / 是否建立关系** | 深度创造专业成果 |
| 前提 | 无（从关系开始） | **AI 已理解用户** |
| 风险若颠倒 | — | 变成「漂亮的 AI 文档工具」 |

**不是因为移动端更简单，而是因为关系与意图理解必须先成立。**

最大资产是长期餐饮经营经验；移动对话是最快转化为用户/场景/决策/Memory 数据的路径。

---

## 一、产品形态分工（冻结）

```text
移动端 = 餐饮经营伙伴（不是 App 功能壳）
  发现问题 · 表达目标 · 持续沟通

        ↓（关系与资产长出来以后）

Web = MealKey Studio（不是首页）
  深度加工 · 项目管理 · 专业生产 · 资产管理
```

类比：

- 手机：**我要做什么？**  
- 电脑：**把它做出来。**

---

## 二、Phase 总序（冻结）

```text
Phase 1  Mobile AI Agent
         建立用户关系 + 意图理解 + 专业输出

Phase 2  Web AI Workspace（MealKey Studio）
         复杂经营任务生产

Phase 3  数据连接
         经营状态感知（诚实边界，非假监控）

Phase 4  自动化执行
         AI 经营系统（服从权限 / M-EXEC / 停扩闸门）
```

**Phase 1 未验证「持续输入意愿」前，禁止把 Phase 2 视觉工作台当主线。**

---

## 三、Mobile 第一阶段唯一闭环（冻结）

只验证：

```text
用户表达经营问题
        ↓
AI 理解用户
        ↓
AI 主动追问
        ↓
形成专业认知
        ↓
输出一个有价值结果
        ↓
保存为用户资产（BOM）
```

### 示例（行为真源）

老板：

> 最近店里感觉越来越累，但是利润没提升。

MealKey **不马上长篇作答**，而是：

> 我先帮你判断。问题可能来自收入、成本、人效三个方向。请告诉我最近一个月营业额和人员情况。

老板上传营业表 → 分析 → 输出《利润优化诊断报告》→ 沉淀「该用户关注利润、人效」。

**这个过程 = 用户在训练 AI（在 Memory Permission 边界内）。**

---

## 四、移动端极简 IA（冻结 · 非视觉稿）

**禁止**主壳：今日 / 项目 / 顾问 / 我的 五 Tab 抢关系入口。

**首页信息架构（ChatGPT 式框架 · MealKey 语义）：**

```text
[菜单/雷达]   MealKey   [新目标]

        今天想解决什么？     ← 空态居中问候
        （建议胶囊可选）

[ + | 问问 MealKey | 麦/发送 ]  ← 底栏 Composer
底栏三 Tab：对话 / 决策 / 我的
```

有对话后：消息流占主区；目标/资产/追问收进流内，不恢复模块墙。

### 三个入口足够

| 入口 | 含义 | 对应 Intent |
|------|------|-------------|
| **说** | 自然语言 / 语音 | utterance |
| **给** | 文件 / 图片 / 数据 | file |
| **看** | 方案 / 报告 / 清单 / 决策 / 目标进度 | Asset + Goal |

服从 Persona：增强老板；不自称副总；不装实时管店。

与雷达/今日发现：可投影为「AI 建议」一条，**不得**恢复能力目录墙。Phase 1 主 CTA 是表达与推进目标，不是逛模块。

---

## 五、移动端先冻的三个能力（仅此）

| # | 能力 | 定义 | 工程锚点 |
|---|------|------|----------|
| 1 | **理解** | 知道用户是谁、在什么 Context | Owner + Business Context 回读 |
| 2 | **追问** | 主动补信息，不是被动问答 | Compiler Gap / Unknowns；≤ 关键问 |
| 3 | **产出** | 生成方案/表/报告/清单/决策候选，不是纯聊 | Asset + Goal；可进 Decision Candidate |

不做：完整 Studio、全量数据连接、自动化执行、Agent 商城。

---

## 六、Phase 1 成功判据（验证题）

比界面更重要：

1. **意愿：** 种子用户是否**反复**把经营问题丢进 MealKey（非一次性试用）  
2. **理解：** 第二次进入是否明显少问已知（Memory 生效）  
3. **价值：** 是否至少产出过 **1 份** 用户认可的 Asset（报告/方案/清单）  
4. **目标：** 是否出现可追踪 Goal（进度/下一步）而非只有聊天泡泡  
5. **训练：** 是否留下可回读的 Owner/Decision/Pattern 记忆（合规）  

未过判据 → 加深对话/编译/记忆，**不**开 Web Studio 主线。

---

## 七、与既有文档冲突裁决

| 冲突点 | 裁决 |
|--------|------|
| 五 Tab / 能力中心主 IA | Phase 1 **以本文极简壳为准** |
| Decision Experience / 雷达 | 可并入「AI 建议」与资产；拍板仍决策室 |
| Web Coding Workspace / 经营 IDE | **Phase 2**；文档保留，工程后置 |
| MVP 90 天单店日活 | 兼容：日活发生在 Mobile Agent 关系环 |
| Persona / Compiler / BOM / Runtime | 全部服从；Mobile 是其第一表面 |

---

## 八、工程切片（Mobile Phase 1）

| 顺序 | 事项 |
|------|------|
| M0 | 本文 + AUTHORITY 挂载 |
| M1 | 极简壳：说 / 给 / 看 + Goal 条（可先挂现有 project 路由瘦身） |
| M2 | Orchestrator + Goal Compiler 竖切（利润诊断或开店 Seed） |
| M3 | 文件上传 → 追问/分析 → 一份 Asset |
| M4 | Memory 回读（二次少问）+ Persona 话术 |
| M5 | 种子验证（成功判据）后再排 Phase 2 |

**禁止** M1–M4 并行开 Studio 视觉大改。

### 代码真源（2026-07-23 竖切已落地）

| 项 | 路径 |
|----|------|
| 契约 | `apps/web/src/server/founder-layer/contracts/goal-compiler.ts` |
| 引擎 | `apps/web/src/server/founder-layer/goal-compiler/` |
| tRPC | `apps/web/src/server/routers/mobile-agent.ts` → `mobileAgent.*` |
| 页面 | `/projects/[projectId]/agent`（沉浸全屏，藏五 Tab） |
| 测试 | `apps/web/tests/goal-compiler-mobile.test.ts` |
| 落点 | `Project.profile.mobileAgent`（侧车，禁平行 Decision 表） |

### 加深切片（续）

| 项 | 状态 |
|----|------|
| 语音（按住说话 / 云端 ASR） | 已接 `useSpeechToTextField` |
| 文件 extractedText → 信号 | `file-signals.ts` + compile 注入 |
| Memory 回读少问 | `known-context.ts`（Identity + 既往槽位） |
| 宿主 LLM 编译 | `llm-compile.ts` — **大模型始终在线**；无 Key 拒绝交付（`ALLOW_COMPILER_STUB=1` 仅开发桩） |
| 新目标 | `mobileAgent.startFreshGoal` |
| 底栏三入口 | 对话 / 决策 / 我的（禁五 Tab） |
| 手机默认首页 | `/dashboard` → `/projects/{id}/agent`（`?radar=1` 看经营动态） |
| Agent 壳 | 藏 ShellHeader，页内品牌头 + 底栏三 Tab |
| 上传即分析 | Agent `onUpload` → `compile(trigger:file)` |
| 说完即编译 | `useSpeechToTextField.onFinalTranscript` → utterance compile |
| 雷达 → AI 建议 | `observe` 触发 + Agent 首页单 CTA |
| 决策候选 | `pendingDecisions` 侧车 + Dashboard「对话里待确认」+ `acknowledgePendingDecision` |
| 能力加深 | 真单席 `seat-invoke`（m-biz/m-pnt/m-mkt）→ 失败再 LLM；`MOBILE_SEAT_INVOKE=0` 可关 |
| Memory 燃料 | 新目标 → `override_ai`；进决策室/稍后 → `decision_choice`（权限闸） |
| Intelligence 回读 | `known-context` 注入风格/lesson → 二次少问 |
| 种子验证 | `seedMetrics` 侧车：will_return / context_reused / asset_produced / goal_active / memory_signal |
| 「我的」 | 账户/习惯/AI 资产；**去能力目录墙** |
| 工具 Agent | 可独立无模型；**不等于**宿主可以不用模型 |

---

## 九、一句话收口

> 先做**真正懂餐饮用户的移动端 AI Agent**，验证「愿不愿意把经营问题交给 MealKey」。  
> Web Studio 等智能与资产长出来再做——工作台会自然长出，关系不会。

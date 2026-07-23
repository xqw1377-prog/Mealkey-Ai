# MealKey AI Agent Core Architecture V1.0（智能体核心架构冻结）

> **状态：正式冻结（Freeze）— 定义智能体如何长期存在、理解人、编译目标、产生专业结果**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **配套：** Persistent Business Agent · AI Native Interaction · Core Loop · **Goal Compiler V1** · **Business Object Model V1** · **Agent Persona V1**  
> **明确不做：** ChatGPT 套壳；「AI 副总」过度承诺；新开第七 Runtime / 第五顾问席；Memory=聊天流水；把产品身份注册为 `FounderAgentName`；**把「无大模型启发式」当成宿主主路径**。  
> **模型铁律：** 宿主（理解/编译/Persona/对话）**大模型始终在线**；独立工具 Agent 可不依赖大模型。见 `MEALKEY_LLM_HOST_VS_TOOL_AGENT_V1.md`。

---

## 〇、产品身份（2026-07-23 校准冻结）

> MealKey 不是「AI + 餐饮知识库」，而是 **懂餐饮 · 懂用户 · 把知识编译成可执行能力** 的专业 AI。  
> 核心不是替代老板，而是 **增强老板**。

**一句话（冻结）：**

> **MealKey 是一个持续学习用户经营场景，理解经营目标，并将专业餐饮知识转化为经营能力的 AI。**

**价值句（冻结）：**

> **让每一个餐饮经营者拥有一个越来越懂自己的专业餐饮 AI。**

| 废弃比喻 | 准确身份 |
|----------|----------|
| AI 经营副总 / AI COO（产品定位） | **餐饮经营 AI**（专业智能体） |
| 给老板一个 AI 员工 | 增强老板的专业能力 |
| 我管理你的企业 | 我帮你把想法变成专业结果（在证据边界内） |

**为何不用「副总」（冻结理由）：**

1. **过度承诺** — 副总暗示负责结果、主动管理；无实时企业数据时不能说「我管理你的企业」  
2. **限制扩展** — 用户可能是老板/店长/厨师长/创业者/投资人/顾问；需要的是餐饮专业智能体，不是一个编制岗位  
3. **权责错位** — 拍板与结果责任在人；AI 提供理解、编译、建议与记忆  

**关系模型（冻结）：**

```text
错误：老板 → AI副总 → 指令执行
正确：人 → MealKey AI → 专业能力增强
```

**交互主链（冻结）：**

```text
用户表达 → MealKey理解 → 专业知识编译 → 形成方案
  → 用户确认优化 → 沉淀为个人经营能力
```

**长期竞争（冻结）：**

> 不是谁有多少 Agent，而是谁拥有 **最懂餐饮经营场景的智能 + 最懂用户的长期记忆**。  
> 本质：把长期餐饮经营经验，变成每个用户随时可调用的能力（无限知识 → 可执行能力）。

**消歧义（铁律）：**

- 产品身份 = **餐饮经营 AI**；人格细则见 `MEALKEY_AGENT_PERSONA_V1`  
- 七常委里的 **COO 席** = 治理压力测试角色，**≠** 产品对外自称「AI 副总」  
- **≠** 第五 `FounderAgentName`；终局拍板在 **用户 + 决策室 / Council**  
- 「陪你经营」可作体验语感，**不得**写成岗位编制或结果责任制

---

## 一、Agent Identity（智能体身份）

### 1.1 三项核心能力（冻结）

| 能力 | 内涵 | 做什么 |
|------|------|--------|
| **懂餐饮** | 品类/菜单/成本/毛利/人效/坪效/供应链/门店模型/扩张… | 领域壁垒；非通用 Chat |
| **懂用户** | 品牌、阶段、目标、风格、经验水平 | 长期记忆校准输出 |
| **想法→专业结果** | Goal Compiler / 能力模块编排 | 自然语言 → 方案资产（coding） |

### 1.2 三项工作（编排层）

| 工作 | 知道什么 | 做什么 |
|------|----------|--------|
| **理解用户** | 身份 · 场景 · 目标 · 偏好 · 习惯 | 校准形态与提醒权重 |
| **跟踪目标** | 当前 Goal · 进度 · 下一步 · 缺口 | Goal Awareness（非「管理企业」） |
| **调度专业能力** | 何时调用菜品/菜单/选址/成本等**能力模块** | Routing · 合成方案 |

Agent = **专业能力模块**，不是「财务副总 / 产品副总」部门编制。

### 1.3 身份成立条件

无稳定身份与记忆回读 = ChatGPT 套壳。  
有身份但仍让用户「选部门 Agent」= 退回工具集合。

---

## 二、Memory System（长期记忆 · 智能体视图）

**护城河：** 越用越懂；真资产 = 经营上下文。  
**禁止：** Memory = 聊天记录。

智能体对外四层（**投影**既有系统，禁止平行记忆宇宙）：

### Layer 1 · Owner Profile（老板画像）

静态/慢变：经验、偏好、决策方式、风险偏好等。

```json
{
  "experience": "30年餐饮",
  "preference": "重视长期品牌",
  "decisionStyle": "数据+经验",
  "riskPreference": "稳健"
}
```

**真源：** Founder Memory · User Intelligence / Intelligence Profile · 经营决策习惯。

### Layer 2 · Business Context（企业上下文）

```text
品牌：等里长沙 · 定位：社区湘菜 · 面积：200㎡ · 客单：50-80 · 阶段：首店筹备
```

**真源：** Business Identity · RIP（确认后）· Restaurant Brain · Company Memory。

### Layer 3 · Decision Memory（决策记忆 · 最重要）

记录 **为什么这么决定**，不是「菜单已确定」一句状态。

```text
决策：减少 SKU 到 38 个
原因：提高厨房效率 / 降低损耗 / 符合社区模型
时间：2026-07
```

**真源：** MKDecision · DIE Learning · Brain Decision Memory · Memory Runtime（decision/lesson）。

### Layer 4 · Behavior Memory（行为记忆）

喜欢先看战略、不爱细节大表、重视长期模型 → **以后输出自动调整**。

**真源：** User Intelligence 四类 BehaviorSignal · preference 写入 · Growth（建议增强，不替终局）。

### 与 Memory Runtime 四层对照

| 智能体视图 | Memory Runtime / 其他 |
|------------|------------------------|
| Owner Profile | Founder Memory |
| Business Context | Company Memory + Brain + Identity/RIP |
| Decision Memory | PROJECT/决策类 Memory + MKDecision |
| Behavior Memory | Founder preference + UI BehaviorSignal |
| （行业） | Industry Memory — **默认关**，须 opt-in |

---

## 三、Goal Compiler（目标编译器 · 概要）

任何输入首先是 **目标种子**，不是任务工单。

示例：

> 「帮我看看这个店为什么生意不好。」

- 普通 AI：回答问题  
- MealKey：编译 Goal「提升门店经营表现」→ SubGoals（诊断→关键变量→方案→验证）→ Workflow

```text
自然语言 / 文件 / 观察
        ↓
Intent Extraction      意图识别
        ↓
Goal Modeling          目标结构化
        ↓
Task Decomposition     任务拆解
        ↓
Agent Routing          能力调用
        ↓
Output Generation      成果生成
        ↓
Memory Update          经验沉淀
```

**详细设计真源：** `docs/MEALKEY_GOAL_COMPILER_V1.md`（决定是否具备 coding 能力）。

---

## 四、AI Workspace（专业工作空间）

| 端 | 定位 | 主交互 |
|----|------|--------|
| 手机 | AI 经营秘书 · **表达** | 对话 / 语音 / 文件 / 快速确认 |
| Web | **经营 IDE**（Integrated Development Environment）· **创造** | 左 Goals 树 · 中 AI 编译区 · 右 Business Assets |

```text
MealKey Workspace（Web）
左侧：Goals 目标树（定位/模型/产品/供应链/开业…）
中间：AI 编译区（分析中… → 定位方案 V1）
右侧：Business Assets（报告/菜单模型/投资测算/决策版本）
```

程序员：需求 → 代码 → 运行 → 版本 → 迭代。  
经营者：目标 → 经营方案 → 执行 → 反馈 → 迭代。  
**禁止**教老板写代码；Workspace = 自然语言经营 IDE。

细则：`MEALKEY_PERSISTENT_BUSINESS_AGENT_V1` §2.4。

---

## 五、Proactive Intelligence（主动智能）

MealKey **不能只等问**。主动来源四类（冻结）：

| 来源 | 含义 | 示例 |
|------|------|------|
| **Goal Event** | 目标阶段变化 | 选址完成 → 启动下一阶段 |
| **Missing Information** | 缺槽位/缺证据 | 投资模型缺租金 |
| **Risk Detection** | 风险（可接 Risk Runtime） | 回本周期 >36 月 |
| **Opportunity** | 机会（可接 Opportunity Runtime） | 客群与竞品差异机会 |

与 Architecture Proactive Rules / Goal Awareness 合并执行；**禁止**假监控门店实时数据、禁止闲聊刷活跃。

---

## 六、完整体验循环（冻结）

```text
第一次：我要开店
  → AI：先了解目标（持续最小追问）
  → 建立经营模型
  → 生成方案
  → 推进执行（决策室签字当门禁）
  → 记录结果
  → 越来越懂老板
  → 成为长期经营大脑
```

生命周期阶段映射：`MEALKEY_AI_NATIVE_CORE_LOOP_V1`。

---

## 七、架构总图

```text
                    MealKey AI（餐饮经营 AI）
                              |
              +---------------+---------------+
              |               |               |
           餐饮知识        用户记忆         推理/编排
              |               |               |
              +---------------+---------------+
                              |
                       专业能力编译器
                       （Goal Compiler）
                              |
                    专业能力模块（非副总编制）
                              |
                       经营输出 / Assets
                              |
              Decision ←→ Council/DIE（质量与签字）
                              |
                         Memory 进化
```

---

## 八、禁做 / 必须

### 禁止

- ❌ 无身份的通用聊天壳  
- ❌ 对外主定位「AI 副总 / 我管理你的企业」  
- ❌ 用户主路径选「部门 Agent」  
- ❌ 聊天流水当 Memory  
- ❌ AI 窃取拍板权或承诺经营结果责任制  
- ❌ 为智能体视图新建平行 Prisma Memory 宇宙  

### 必须

- ✅ 稳定「增强老板的餐饮经营 AI」身份  
- ✅ 懂餐饮 + 懂用户 + 编译专业结果  
- ✅ 四层记忆可回读进 Compile  
- ✅ 输入先 Goal 化再拆任务  
- ✅ 双端 Workspace 分工、大脑同一  
- ✅ 主动行为在证据边界内（Goal Awareness，非假监控）  

---

## 九、下一层

> **Agent Persona** = 「它是谁」的行为规范；交互、记忆、主动规则由此展开。  
> 真源：`MEALKEY_AGENT_PERSONA_V1.md`。  
> Goal Compiler / BOM / Runtime 仍有效，身份隐喻以本文校准为准。

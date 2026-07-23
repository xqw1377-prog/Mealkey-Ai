# MealKey Product Architecture V2.0（产品架构 · 正式冻结）

> **状态：正式冻结（Freeze）— 餐饮经营 AI 操作系统形态；推翻「App→功能→Agent→知识库」堆法**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 产品架构  
> **上游：** Interaction Constitution · Behavior Engine · Intelligence Model / KG · Skill Engine · Goal Compiler · Mobile Agent · Core Product Loop（日活飞轮，不另起宇宙）  
> **下一章（已冻）：** `MEALKEY_GTM_MONETIZATION_V1.md`；再下一章：MVP 0.1  

> **明确不做：** 功能大厅首页；Agent 列表作老板入口；平行第六/七 Runtime；先 Web 后关系；P1 未验证前全岗位企业套件。

---

## 〇、产品本质（冻结）

**禁止再叙事：**

```text
App → 功能 → Agent → 知识库
```

**正确链路：**

```text
用户 → 自然表达 → MealKey Intelligence Layer → 专业能力生成 → 经营结果
```

**一句话：**

> MealKey 不是工具集合，而是把餐饮人的**目标、经验、知识和行动**连接起来的智能系统。

**战略定位（收敛）：**

| 项 | 冻结句 |
|----|--------|
| 产品 | **餐饮经营 AI**（操作系统形态） |
| 使命 | 让每一个餐饮人拥有一个**持续成长的专业 AI 能力** |
| 价值 | 不替代人；**提升人的经营能力** |

与交互宪法产品句一致：持续理解餐饮人 · 行业知识 → 可使用经营能力。

---

## 一、总体三层架构（冻结）

```text
                         MealKey AI
                              ↑
                 Intelligence Layer（智能层总称）
                              ↑
 ┌──────────────────────────────────────────┐
 │           Cognitive Core 认知核心          │
 │  Restaurant Model · Knowledge Graph       │
 │  Decision Engine · Memory Engine          │
 └──────────────────────────────────────────┘
                              ↑
 ┌──────────────────────────────────────────┐
 │         Capability Layer 能力层           │
 │  Business · Role · Skill · Scenario       │
 └──────────────────────────────────────────┘
                              ↑
 ┌──────────────────────────────────────────┐
 │        Interaction Layer 交互层           │
 │  Mobile · Web Workspace · Voice/File/Data │
 └──────────────────────────────────────────┘
```

| 层 | 回答 | 是核心吗 |
|----|------|----------|
| Interaction | 用户怎么用 | **否** — 入口 |
| Capability | 能生成什么专业结果 | 是（区别 GPT） |
| Cognitive | 如何理解世界、判断、记忆 | **是护城河** |

**Behavior Engine / Goal Compiler / Persona** 横切三层：Compiler 连交互→能力；Behavior 定姿态；Persona 定身份。不单列为第四产品货架。

---

## 二、Interaction Layer（交互层）

### 2.1 Mobile — AI 经营伙伴入口

**是：** 关系 + 意图 + 轻量产出。  
**不是：** 功能大厅 / Agent 列表 / 工具墙。

**首页心智（冻结）：**

```text
今天你的经营目标是什么？
[说出来]  [上传文件]  [继续上次项目]
```

| 方向 | 内容 |
|------|------|
| 输入 | 想法 · 问题 · 语音 · 图片 · 表格 |
| 理解 | 用户是谁 · 当前目标 · 当前阶段 |
| 输出 | 建议 · 待确认决策 · 专业资产 |

工程顺序：Mobile First（`MEALKEY_MOBILE_AGENT_V1`）；服从交互宪法与 Behavior 五态。

### 2.2 Web Workspace — AI 经营工作台

**是：** 经营生产环境（类 IDE）。  
**不是：** 放大的聊天窗。

```text
项目空间
左：目标树 | 中：AI 协作区 | 右：经营资产
```

示例（开店项目）：

```text
长沙首店 → 定位 / 产品 / 菜单 / 财务 / 开业 / 复盘
```

Phase：关系验证后再抬升 Studio 主线（既有冻结）。

### 2.3 多态输入（经营输入，非附件）

文件 = **经营输入**（菜单、营业表、成本表、图片、合同、排班…）。

```text
上传 Excel → AI 理解经营状态 → 分析 → 决策资产
```

Intent = 说 + 上传 + 观察（雷达信号）。Voice / Data 同属交互通道。

---

## 三、Capability Layer（能力层）

| 引擎 | 服务谁 | 解决什么 | 真源映射 |
|------|--------|----------|----------|
| **Business Engine** | 老板（P1） | 开店·盈利·扩张·品牌·产品·成本 | Goal Compiler · DIE · Signal · m-biz/m-pnt…（幕后） |
| **Role Engine** | 店长/员工（分阶段） | 岗位任务与标准 | Persona Context · Skill Map |
| **Skill Engine** | 成长 | 不会 → 专业 | `MEALKEY_SKILL_ENGINE_V1` |
| **Scenario Engine** | 场景路由 | 开店/诊断/培训何时调什么 | Intelligence L3 · Compiler Workflow |

P1 主表面：Business + Scenario（诊断/开店）；Skill 老板陪练已竖切；Role 全员后置。

---

## 四、Cognitive Core（认知核心 = 大脑）

| 构件 | 作用 | 真源映射 |
|------|------|----------|
| **Restaurant World Model** | 如何看餐饮世界 | Intelligence Model · Ontology |
| **Knowledge Graph** | 对象、关系、因果、规则 | `MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1` |
| **Decision Engine** | 如何判断 | DIE · Council · Behavior Judge/Challenge |
| **Memory Engine** | 如何越来越懂 | Brain · User Intelligence · Growth · Decision Memory |

四者组成 MealKey 大脑；通用大模型仅作推理发动机（既有 LLM Host 铁律）。

---

## 五、Agent 重新定位（重大调整 · 冻结）

| 过去（禁止） | 现在（冻结） |
|--------------|--------------|
| Agent 像员工（财务 Agent 菜单） | Agent = **专业能力执行单元** |
| 用户点名调用 | 用户不知、不选、不见编制 |

例：「提升利润」→ 内部可编排利润/产品/成本等能力单元 → 用户只见完整结果。

> **Agent 隐藏，能力显性。**（对齐交互宪法 P3 · Tool Agent / 四席 / L3 外置协议）

禁止：Marketplace / Agent 列表升格为老板主入口（MVP 停扩闸门仍有效）。

---

## 六、与 Core Product Loop 五层的关系

日活飞轮（Identity→Brain→Signal→Decision→Exec/Evolution）= **操作系统在「每天打开」上的投影**。  
本文三层 = **系统如何组织能力与入口**。二者互补，禁止再开第三条产品叙事。

```text
Interaction  → 承载「说/给/看」与目标入口
Capability   → 生成雷达解读、方案、陪练、任务
Cognitive    → Brain / Signal 语义 / DIE / Memory 真源
```

---

## 七、最终用户体验闭环

用户感觉应是「有一个懂餐饮的专业大脑」，不是「我在用 AI 工具」。

```text
想法 → 告诉 MealKey → 它理解我 → 懂餐饮规律
  → 分析 → 生成方案 → 陪执行 → 越来越懂我
```

验收心智：目标入口 · 诊断姿态 · 资产结果 · 长期记忆 —— 缺一则架构未落地。

---

## 八、工程与组织闸门

1. 新页面必须回答「服务哪一层哪条链路」，禁止功能墙。  
2. 新 Agent/L3 必须幕后能力化，经 Adapter，不得进主导航。  
3. Mobile 未验证关系前，不把 Web Studio 当主叙事。  
4. 文件解析失败要诚实，不装懂。  
5. 改架构叙事前先改本文 + AUTHORITY。

---

## 九、下一章入口

GTM 已冻结（`MEALKEY_GTM_MONETIZATION_V1.md`）。  

**下一章：`MealKey MVP 0.1`** — 第一性验证：老板是否愿把真问题交给 MealKey，且认为比 GPT 更有价值。

---

## 十、冻结句

> MealKey = 餐饮经营 AI 操作系统：交互是入口，能力是产出，认知是护城河。  
> Agent 是幕后执行单元，不是产品货架。  
> 文件是经营输入，聊天是过程，资产与状态是结果。

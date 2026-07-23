# MealKey Business Object Model V1.0（经营世界模型 · 数据与认知骨架冻结）

> **状态：正式冻结（Freeze）— 编译产物的存在形式；无此层 Goal Compiler 只是概念**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游：** Goal Compiler · Agent Core · Persistent Business Agent  
> **运行时：** `MEALKEY_AGENT_RUNTIME_ARCHITECTURE_V1.md`  
> **连接既有：** OwnerProfile · Identity/RIP/Brain · MKDecision · Workflow Engine · Knowledge · Memory Runtime · ChiefAgent  
> **明确不做：** 聊天记录当世界模型；页面当第一公民；平行 Prisma Decision/Goal 宇宙；BOM 绕过 Case.id≡MKDecision.id。

---

## 〇、工程问题与答案（冻结）

> MealKey 不是功能系统，而是**目标编译系统**。  
> AI 编译出来的东西，最终以什么形式存在？

**不是**聊天记录。  
**而是** **经营对象（Business Objects）** —— 构成 MealKey 的「经营世界模型」。

| 程序世界 | 经营世界 |
|----------|----------|
| 代码 → 对象 → 运行 → 状态 | 语言 → Goal → Workflow → 执行 → 经营状态 |

MealKey **不是**帮老板写代码，而是：

> **把经营过程转换成可执行对象。**

---

## 一、核心对象关系（冻结）

```text
                 Owner
                  |
             Business Context
                  |
                Goal
                  |
        -------------------
        |                 |
     Decision          Workflow
        |                 |
     Asset               Task
        |
     Memory
```

**人话链路：**

```text
老板是谁？ → 经营环境是什么？ → 想完成什么？
  → 需要做哪些决策？ → 执行什么流程？ → 产生什么成果？ → 沉淀什么经验？
```

**卫星对象（不进主链，但必须存在）：** Signal（观察入）· Action（决策出）· KnowledgeNode（能力注入，非老板入口）· Restaurant/Project（持久化锚点）。

---

## 二、核心七对象（冻结）

> 文档中或称「六对象+Memory」；计数以本表 **七对象** 为准。Task 是 Workflow 子对象，不单列第七以外的「核心」。

| # | 对象 | 回答 | 一句话 |
|---|------|------|--------|
| 1 | **Owner** | 谁经营 | 经营者认知对象（≠ 登录账号） |
| 2 | **Business Context** | 在什么环境 | 企业/门店经营语境 |
| 3 | **Goal** | 要达成什么 | 可追踪·可拆解·可验证的目标 |
| 4 | **Decision** | 做什么选择 | 含「为什么」的拍板资产 |
| 5 | **Workflow** | 怎么完成 | Goal 的执行程序（动态生成） |
| 6 | **Asset** | 产生什么成果 | 可再调用的专业经营资产 |
| 7 | **Memory** | 如何进化 | 经营知识，非聊天流水 |

---

## 三、对象定义

### 3.1 Owner（经营者对象）

所有智能的起点：同一方案给张三/李四答案不同。  
**不是** user 账号表本身；是 **经营认知主体**（老板画像）。

```json
{
  "id": "owner_…",
  "experience": "餐饮30年",
  "thinking_style": "战略优先",
  "risk_preference": "稳健",
  "focus": "品牌长期价值"
}
```

AI 要理解：**这个老板是谁。**  
**真源：** Founder Memory · Intelligence Profile · decision-habit / User Intelligence。  
账号/鉴权仍走既有 auth；Owner 是读模型投影。

### 3.2 Business Context（企业上下文）

解决：**在哪个环境经营。** 未来所有能力调用先读此上下文。

```json
{
  "brand": "等里长沙",
  "industry": "餐饮",
  "city": "长沙",
  "stage": "首店筹备",
  "size": "200㎡",
  "model": "社区餐厅"
}
```

**真源：** Business Identity · RIP（确认后）· Restaurant Brain · Company Memory。  
持久化锚点：`projectId` / Restaurant。

### 3.3 Goal（目标对象）— 系统核心

不是任务、不是问题，是**目标**。必须：可追踪 · 可拆解 · 可验证。

```json
{
  "type": "CREATE_STORE",
  "description": "打造长沙社区湘菜首店",
  "success_metric": "12个月盈利",
  "deadline": "2027-01",
  "status": "planning"
}
```

完整字段服从 Goal Compiler `GoalObjectV1`（slots / unknown / progress / taskGraphRef…）。

### 3.4 Decision（决策对象）— 最大资产

企业经营本质是不断决策。AI 记住的不是「答案」，而是 **为什么这么决定**。

```json
{
  "question": "首店菜单如何设计？",
  "choice": "40个SKU",
  "reason": "提高效率",
  "evidence": ["竞品分析", "模型计算"],
  "confidence": 0.85,
  "owner_confirmed": true
}
```

**真源唯一：** MKDecision；`id` ≡ Prisma `Decision.id` ≡ DIE `Case.id`。  
签字路径：决策室 / Council（权限模型 V2）。

### 3.5 Workflow（经营程序）

Goal 的**执行代码**（经营领域程序）；**动态生成**，非固定 Wizard。

```json
{
  "name": "Store Launch",
  "steps": ["定位", "选址", "产品", "供应链", "团队", "开业"]
}
```

**真源：** Goal Compiler `WorkflowInstanceV1` / `TaskGraphV1`；可调度 Consulting-OS 等内部引擎。

### 3.6 Task（执行任务 · Workflow 子对象）

```json
{
  "name": "完成商圈分析",
  "status": "doing",
  "owner": "AI",
  "deadline": "7天"
}
```

**Task 由 AI 生成，不是用户从菜单创建。** 老板可确认/改优先级，不回到「建任务」SaaS 心智。

### 3.7 Asset（经营资产）

传统 AI 输出文字；MealKey **生成可再调用的资产**。

示例：品牌定位报告 V1 · 菜单模型 V2 · 投资测算表 · 选址分析 · 招聘方案。

```typescript
// 语义见既有 BusinessAssetV1：type/title/version/bodyRef/status/goalId/decisionId
```

### 3.8 Memory（长期记忆）

保存经营知识，**不是**聊天。三类（智能体视图，映射 Runtime 层）：

| 类 | 含义 | 示例 | 映射 |
|----|------|------|------|
| **Fact Memory** | 事实 | 首店面积 200㎡ | Company / Brain |
| **Decision Memory** | 决策与原因 | 为什么选社区模型 | MKDecision → Memory |
| **Pattern Memory** | 模式/偏好 | 喜欢先验证再扩张 | Founder / BehaviorSignal |

Industry Memory 仍服从 opt-in 默认关。

---

## 四、与既有模块的统一归宿

| 既有模块 | 归宿对象 |
|----------|----------|
| OwnerProfile / Intelligence Profile | Owner |
| Identity · RIP · Restaurant Brain | Business Context |
| Goal Compiler 产出 | Goal · Workflow · Task · Asset |
| ChiefAgent | Runtime 入口/编排（见 Runtime Architecture）；读写 BOM |
| 四席 / L3 / Knowledge Engine | 能力函数 + KnowledgeNode 注入 → 写 Asset/建议 Decision |
| Council | Decision 质量门禁（非 BOM 新对象） |
| MKDecision / DIE | Decision |
| Workflow Engine / Consulting-OS | Workflow 内部执行器 |
| Memory Runtime | Memory |
| M-EXEC | Action（Decision 下游） |
| Business Signal | Signal → 可 Promote 为 Goal/Decision |

---

## 五、认知循环 vs ChatGPT

```text
ChatGPT:  问题 → 回答 → 结束

MealKey:  目标 → 理解 → 拆解 → 决策 → 执行
            → 资产 → 记忆 → 下一次更强
```

---

## 六、持久化反平行表（不变）

| 对象 | V1 策略 |
|------|---------|
| Owner / Context | 读模型；写回 Founder Memory / Brain / Identity |
| Goal / Workflow / Task | profile 侧车或轻表 **单落点**；JSON taskGraph 优先 |
| Decision | **仅**既有 Decision / MKDecision |
| Asset | 对象存储 + 元数据引用 |
| Memory | **仅** Memory Runtime |
| Signal / Action | 既有 Signal Engine / Execution |

---

## 七、验收判据

1. 任意协作可画出 Owner→Context→Goal→Decision/Workflow→Asset→Memory 实例  
2. 离开聊天记录仍能恢复经营状态  
3. Decision 必含 why，且被后续 Compile 读到  
4. 无第二套 Decision.id  
5. ChiefAgent / Council / 四席 都能说清读写哪些对象  

---

## 八、下一层

> **Agent Runtime Architecture** = 一句话进入后：谁判断、谁调用、Council 何时介入、Decision/Memory 何时写入。  
> 真源：`MEALKEY_AGENT_RUNTIME_ARCHITECTURE_V1.md`。

---

## 九、一句话收口

> 经营世界模型 = **Owner · Context · Goal · Decision · Workflow · Asset · Memory**。  
> 编译器写对象；Runtime 跑对象；页面只投影对象。

# MealKey Persistent Business Agent V1.0（长期经营智能体 · 四大核心冻结）

> **状态：正式冻结（Freeze）— 决定「是不是智能体」的一层，先于 UI**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游：** `MEALKEY_AI_NATIVE_INTERACTION_ARCHITECTURE_V1` · `MEALKEY_AI_NATIVE_CORE_LOOP_V1`  
> **核心架构 / 人格 / 编译器：** `MEALKEY_AI_AGENT_CORE_ARCHITECTURE_V1` · `MEALKEY_AGENT_PERSONA_V1` · `MEALKEY_GOAL_COMPILER_V1`  
> **能力真源（不重造）：** Memory Runtime · Restaurant Brain · User Intelligence · DIE · Council · M-EXEC  
> **明确不做：** 不做聊天机器人人格秀；不教老板写代码；不新开第七 Runtime；不把 Web Workspace 做成第二个 SaaS 菜单墙。

---

## 〇、产品定义校准（冻结）

**系统定位（保留）：** MealKey = AI 餐饮经营操作系统 / 餐饮经营能力增长系统。

**产品身份（2026-07-23 校准 · 与 Agent Core / Persona 一致）：**

> **MealKey 是持续学习用户经营场景、理解经营目标、将专业餐饮知识转化为经营能力的 AI。**  
> 价值句：让每一个餐饮经营者拥有一个越来越懂自己的专业餐饮 AI。  
> **增强老板，不替代老板。** 废弃产品定位「AI 经营副总」。

**交互 / 智能体定义（本层）：**

> Persistent Business Agent = 上述餐饮经营 AI 的长期协作形态：自然语言与文件输入 → 编译为专业方案与决策资产 → 记忆复利。

| 不是 | 是 |
|------|-----|
| AI 副总 / AI 员工 | **增强人的专业餐饮 AI** |
| 聊天机器人 | 长期存在、越来越懂用户 |
| 套了 AI 壳的 SaaS | 目标编译 + 经营对象沉淀 |
| 让用户学习 coding | **自然语言 → 专业结果** |
| 页面集合 | **用户经营上下文** 才是真资产 |

**核心原则（不变）：**

> **用户简单，产出专业。**  
> 竞争点不是功能多少，而是 **复杂能力隐藏程度**。

**核心公式（与 Architecture 一致）：**

```text
用户 → 意图 → 理解 → 规划 → 执行 → 记忆 → 更懂用户
```

传统 SaaS：`用户 → 功能 → 结果`（用完即走）。  
智能体：建立关系 → 持续协作 → 上下文复利。

---

## 一、最终表面架构（冻结）

```text
                 MealKey Agent
              （Persistent Business Agent）
                        |
          ------------------------------
          |                            |
       手机端                         Web端
       AI 经营秘书                    AI 工作室
       （低门槛表达）                  （深度创造）
          |                            |
   说 / 语音 / 图 / 文件 / 确认     Coding Workspace
          |                            |
          ------------+---------------
                      |
                 Goal Engine
                      |
          Agent Runtime + Workflow
                      |
            Decision Asset · Memory
```

两端共享同一智能体大脑；**禁止**做成两套互不认的产品。

---

## 二、四大核心（冻结 · 智能体成立条件）

缺任一核心，产品退回「AI 外壳 SaaS」。

### 2.1 Personality（智能体人格与行为）

**定义：** 老板感知到的「这是谁在帮我」——不是角色扮演剧本，而是 **稳定行为契约**。

| 维度 | 冻结 |
|------|------|
| 身份感 | 长期经营搭档 / 经营秘书；不自称「菜单 Agent」「财务 Agent」 |
| 语气 | 专业、克制、可行动；少术语，必要时术语内化不外抛 |
| 主动 | **管理目标进度**（Goal Awareness）；非闲聊刷存在感 |
| 诚实 | 未知标 unknown；证据不足不装懂；外采降级明示 |
| 边界 | 可建议、可编译、可催办；**终局拍板在老板 + 决策室/常委** |
| 记忆外显 | 三个月后「开第二家」必须能引用首店定位/模型/偏好/历史决策 |

**主动式引导示例（冻结话术型，非 UI 稿）：**

> 「上周你确定了新店定位，但选址模型还没完成。建议今天完成三个关键判断。」

**禁令：**

- ❌ 七常委人格化成群聊角色给老板选  
- ❌ 营销腔 / 讨好腔 / 无限表情包人格  
- ❌ 用 Personality 绕过 Council 或签字门禁  

**工程锚点：** Prompt/行为策略层 + Goal Awareness 规则；**不是**新顾问席。

---

### 2.2 Memory（经营上下文资产）

**定义：** MealKey 真正的资产 = **用户经营上下文**，不是页面、不是聊天记录。

三个月后老板说「准备开第二家店」，智能体必须已持有（在权限与确认门禁内）：

- 第一家店定位 / 客群 / 价格带  
- 投资模型与关键假设  
- 菜单结构要点  
- 老板偏好与历史否决  
- 已签字 MKDecision 与复盘结论  

| 层 | 存什么 | 真源（禁止平行库） |
|----|--------|-------------------|
| 事实 | 店/品牌/经营事实 | Restaurant Brain |
| 决策 | 拍板与条件/停止线 | MKDecision · DIE |
| 目标 | 进行中 Goal / 进度 | Goal Model |
| 偏好与成长 | 习惯、推翻、完成率 | User Intelligence · Growth |
| 经历知识 | 可复用经营知识 | Memory Runtime |

**铁律：**

1. 聊天 transcript ≠ Memory SSOT  
2. 已确认 Decision Asset **禁止**被后续 Agent 当无知重问  
3. 文件解析结果 → Evidence / Artifact / Brain 投影，须可追溯  
4. 服从 Memory Permission（行业贡献默认关）

---

### 2.3 Goal Compiler（目标编译器）

**定义：** 把自然语言（及文件派生意图）编译为专业经营系统的引擎。  
细则真源：Architecture §3.1–3.2；生命周期：Core Loop L1–L3。

**自然语言编程（冻结隐喻）：**

```text
过去（人写规则）          未来（老板说目标）
if 客流下降: 调菜单   →  「晚餐不好，想提升晚餐营业额」
                        → 诊断流程 + 分析模型 + 实验方案 + 执行计划
```

老板控制的是 **意图**；AI 生成的是 **可执行经营程序**（Workflow + Asset）。  
**禁止**教老板学习 coding 语法或内部函数名。

**输入（Intent 多态 · 冻结）：**

| 通道 | 说明 |
|------|------|
| 说 | 一句话 / 语音 |
| 上传 | Excel / 菜单 / 财表 / 图片 / 合同 / 制度 / 聊天导出等 |
| 观察 | 雷达 Signal / Goal Awareness（非假监控） |

**文件入口示例（行为）：**

```text
上传《营业数据.xlsx》
  → 解析为 Evidence + 问题摘要
  → 「午餐客流 -20% / 招牌贡献下降 / 人效偏低」
  → CTA：是否进入利润优化 Goal Compile？
```

填表不是主入口；**说 + 上传 + 观察** 才是。

---

### 2.4 Workspace（双端工作面）

**定义：** 智能体的身体——手机与 Web **分工不同、大脑同一**。

#### A. 手机端 · AI 经营秘书

| 项 | 冻结 |
|----|------|
| 目标 | 低门槛、随时表达 |
| 主交互 | 语音 · 短对话 · 图片 · 文件 · 快速确认 |
| 主价值 | 捕捉意图、推进今日一件事、确认决策要点 |
| 禁止 | 把 Web 深度面板塞进手机；能力目录首页 |

#### B. Web 端 · MealKey Studio（经营工作室 · **Phase 2 后置**）

| 项 | 冻结 |
|----|------|
| 目标 | 深度创造与版本化经营资产 |
| 工程顺序 | **服从 `MEALKEY_MOBILE_AGENT_V1`：Mobile 关系验证通过后再做 Studio 主线** |
| 隐喻 | 手机「我要做什么」→ 电脑「把它做出来」 |
| 结构（IA） | **左：** 项目 / Goal / Memory / 资产树 |
|  | **中：** AI 协作空间 |
|  | **右：** 成果文件（方案 · 模型 · 报告 · 决策 · 版本） |
| 禁止 | Phase 1 并行 Studio 视觉大改；无用户理解前提时做成「漂亮 AI 文档工具」 |

**命名澄清：** Studio / Coding Workspace = 自然语言驱动的经营生产台，**不是**教用户写代码的 IDE。

---

## 三、与能力层对象对齐（冻结）

| 四大核心 | 既有系统 | 说明 |
|----------|----------|------|
| Personality | Goal Awareness · Experience 话术 · 诚实降级 | 行为层，非新 Engine |
| Memory | Brain · Memory Runtime · UI · MKDecision | 加深投影，禁平行记忆库 |
| Goal Compiler | Architecture Compile Pipeline · Workflow · 四席/L3 | Agent = 函数 |
| Workspace | apps/web 壳 + 未来工作室面；手机壳/Mini Shell | 表面分化，契约统一 |

Council / 决策室 = 质量与签字机制，**嵌在 Compiler→Decide 路径内**，不是第三端首页。

---

## 四、智能体成立验收（产品判据）

同时满足才可宣称 Persistent Business Agent：

1. **关系性：** 二次进入无需重述已确认定位/关键约束  
2. **简单性：** 主路径无强制专业表单墙  
3. **多态输入：** 至少支持「说 + 上传」触发 Compile（观察可接雷达）  
4. **资产性：** 每次有效协作留下 Goal/Decision/Artifact 之一  
5. **主动性：** Goal Awareness 能指出「卡在哪、今天推哪一步」  
6. **双端一致：** 手机确认的决策在 Web 资产树可见，反之亦然  
7. **治理：** 战略终局仍经决策室/常委，智能体不窃权  

---

## 五、禁做清单

- ❌ 手机 = 缩小版 Web 模块墙  
- ❌ Web = 放大版聊天框无资产栏  
- ❌ 「学习 coding」教程心智  
- ❌ 文件上传后只做摘要聊天、不进 Goal/Evidence  
- ❌ Personality 娱乐化压过经营可信度  
- ❌ 为 Workspace 新开平行 Decision/Memory Prisma 宇宙  

---

## 六、下一工程刀（仍不先画视觉）

| 顺序 | 事项 |
|------|------|
| 1 | Goal Seed DTO + 文件→Intent/Evidence 最小契约 |
| 2 | Memory 回读清单：Compile 前必注入的上下文包 |
| 3 | Personality 行为策略短表（主动/诚实/边界）接 Goal Awareness |
| 4 | Workspace IA 线框级（左中右信息架构，非视觉稿） |
| 5 | 手机秘书竖切：语音/一句话 → Goal Seed |

---

## 七、一句话收口

> MealKey Agent = **Personality（怎么协作）+ Memory（记得什么）+ Goal Compiler（如何变专业）+ Workspace（在哪创造）**。  
> 四者齐全，才是长期经营智能体；缺一则是 AI 外壳 SaaS。

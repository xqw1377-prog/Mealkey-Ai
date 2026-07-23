# MealKey Restaurant Intelligence Model V1.0（餐饮经营智能模型 · 冻结）

> **状态：正式冻结（Freeze）— 行业认知层；交互 / Agent / Workflow / 岗位引擎均为呈现与调用**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 认知护城河  
> **上游消费方：** Goal Compiler · DIE · Persona · Role Intelligence（待冻）· Mobile / Studio  
> **配套：** BOM · Restaurant Brain · RIP · Knowledge Engine · User Intelligence · Host LLM 铁律  
> **明确不做：** 自训餐饮大模型替代 GPT/DeepSeek；把百科文章当智能；知识图谱＝聊天标签；第五顾问席 / 第七 Runtime；P1 未验证前做全岗位培训 SaaS。

---

## 〇、生命线（冻结）

> **GPT 提供无限知识；MealKey 提供把知识变成餐饮经营能力的系统。**

| 角色 | 是什么 |
|------|--------|
| 通用大模型 | **推理发动机**（始终在线宿主，见 `MEALKEY_LLM_HOST_VS_TOOL_AGENT_V1`） |
| MealKey Restaurant Intelligence Model | **餐饮智能驾驶系统**（何时用什么知识、如何推理、如何决策） |

**一句话定义：**

> 将餐饮行业知识、经营规律、岗位能力、决策逻辑、执行标准结构化，形成可被 AI 调用的餐饮认知系统。

**为何通用模型不够：** 有 Knowledge（知道毛利率/坪效/定位），缺 Intelligence Model（**何时、按何顺序、用哪条因果**）。  
专家面对「营业额下降」不会先甩 20 条建议，而会先拆变量：客流 / 转化 / 客单 / 复购 / 产品 / 竞争 / 季节。

**战略身份（与组织扩展对齐）：**

> MealKey = 餐饮行业专业 AI 能力基础设施（老板层 + 管理层 + 员工层分阶段）。  
> P1 仍以 **老板/店长 + Mobile** 验证闭环；岗位引擎挂接本模型的「执行节点」，不另起宇宙。

---

## 一、五层架构（冻结）

```text
L5  Decision Intelligence     决策智能层     → 下一步怎么办
L4  Business Model Engine     经营模型层     → 等式与分解推理
L3  Scenario Intelligence     场景智能层     → 何时调用什么能力
L2  Knowledge Rule Layer      知识规则层     → 可执行 Rule（非文章）
L1  Restaurant Ontology       餐饮世界本体   → 世界由什么组成
```

| 层 | 产出形态 | 已有落点（复用，不平行） |
|----|----------|--------------------------|
| L1 Ontology | 实体/属性/关系骨架 | BOM 七对象 · Brain DNA · Identity/RIP |
| L2 Rules | `if–then` 可执行规则 | Knowledge Engine（RULE/CASE）· 领域 YAML |
| L3 Scenario | 场景 → 能力路由 | Goal Compiler Workflow · IntentFamily |
| L4 Models | 因果等式与分解 | Compiler 诊断框架 · DIE Context · 信号引擎 |
| L5 Decision | 选项 / 未知 / 信心 | DIE · Council · 决策室（人拍板） |

**铁律：** 上层调用下层；Agent / 页面 **不得**跳过 L4/L2 直接「装懂」出终局。

---

## 二、L1 Restaurant Ontology（世界本体 · 摘要）

不是知识库目录，而是 **「餐饮由什么组成」**：

| 域 | 核心对象（V1 必有） |
|----|-------------------|
| 人 | 老板 · 店长 · 员工 · 顾客 |
| 店 | 品牌 · 门店 · 产品 · 空间 · 商圈 |
| 经营 | 收入 · 成本 · 利润 · 效率 · 增长 |
| 产品 | 菜品 · 菜单 · 供应链 · 标准化 |

**与 BOM：** Ontology 描述行业世界；BOM 描述编译后的经营对象存在形式。二者互补：Ontology ⊃ 行业骨架，BOM ⊃ 运行时对象链。

**下一章展开：** `MealKey Restaurant Knowledge Graph`（实体 · 属性 · 关系 · 规则 · 决策路径）。

---

## 三、L2 Knowledge Rule Layer（可执行知识）

**禁止**只存散文（「湘菜香辣」）。  
**必须**可编译为 Rule：

```text
IF 目标客群=家庭 AND 客单价>80
THEN 产品设计提高分享菜比例
```

形态：条件 · 结论 · 适用场景 · 证据强度 · 来源（经验蒸馏 / 案例 / 行业）。  
注入路径：Knowledge Engine → Compiler / Coach（岗位化答法）→ 不得直出拍板合同。

---

## 四、L3 Scenario Intelligence（场景智能）

场景决定 **调用哪条推理链与哪些能力**：

| 场景族（P1 优先） | 典型调用 |
|-------------------|----------|
| 开店 / 定位 | 定位→客群→产品→投资模型 |
| 利润 / 亏损 | 营业额分解→成本→人效 |
| 门店运营 | 排班/客诉/培训（店长语境） |
| 岗位训练（P2） | RoleProfile · 行为标准 · 反馈 |

场景 ≠ Wizard 死路径；由 Goal Compiler 动态 Workflow 编排（见 Goal Compiler V1）。

---

## 五、L4 Business Model Engine（经营模型 · 护城河核心）

### 5.1 最小因果等式（V1 必实现推理）

**利润：**

```text
利润 ≈ 营业额 − 食材 − 人工 − 房租 − 损耗 − 营销 − 其他
```

**营业额：**

```text
营业额 ≈ 客流 × 转化率 × 客单价 × 复购效应
```

（复购可作倍率或分客群结构；实现时允许简化，但 **禁止**跳过变量拆解直接给「做营销」清单。）

### 5.2 Restaurant Causal Graph（经营因果图）

**不是**通用知识图谱观光层，而是 **可传播影响的因果网络**：

```text
定位 → 客群 → 产品 → 价格 → 客流 → 营业额 → 利润 → 扩张能力
```

示例：降价 → 客单↓ → 需订单↑ → 厨房压力↑ → 人效风险↑ → 利润可能↓。  
Compiler / DIE 在相关意图下 **必须先走变量影响，再给动作建议**。

### 5.3 岗位作为执行节点（接入 Role Engine）

| 岗位 | 因果切入（示例） |
|------|------------------|
| 服务员 | 能力 → 推荐率 → 客单 → 营业额 |
| 厨师 | 出品稳定 → 满意度 → 复购 |
| 店长 | 管理 → 人效 → 利润 |

岗位模型 = 经营模型上的 **执行节点**，不是独立聊天 Bot。

---

## 六、L5 Decision Intelligence（决策智能）

解决「下一步怎么办」：同营业额可赚钱/亏钱，需归因（产品结构 / 人工 / 租金 / 复购…）→ 选项 + Unknowns + 信心。  
**终局拍板在人**（决策室 / Council）；本层产 Decision Intelligence，不产假权威。

复用：DIE · Decision Experience · Case.id≡MKDecision.id。

---

## 七、与既有系统边界（冻结）

```text
              Host LLM（推理发动机）
                        │
         Restaurant Intelligence Model（本文件）
           Ontology · Rules · Scenario · Models · Decision
                        │
     ┌──────────┼──────────┬────────────┐
  Brain/RIP   Compiler   DIE/Council   Role（P2）
  （事实/理解） （编译）   （决策形成）  （岗位能力）
                        │
              Mobile / Studio（呈现与调用）
```

| 系统 | 管什么 | 不管什么 |
|------|--------|----------|
| Brain | 这家店的事实与 DNA | 行业通用因果（在本模型） |
| RIP | 对这家店的理解投影 | 专家推理链本体 |
| Compiler | Intent→资产 | 私自发明因果（须引用本模型） |
| Knowledge Engine | 规则/案例载体 | 场景路由 |
| Role Engine | 岗位能力成长 | 替代经营引擎 |

---

## 八、工程顺序（冻结）

1. **冻本模型 + 因果等式/图（最小）** ✓  
2. **Restaurant Knowledge Graph V1** ✓ — `MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1.md`  
3. **Compiler 竖切绑定**：利润诊断强制走营业额分解（显式引用本模型 + 图谱因果链）  
4. **Skill Engine** ✓ — `MEALKEY_SKILL_ENGINE_V1.md`（能力阶梯；挂因果 Outcome）  
5. **Learning & Evolution Loop**（系统飞轮）  
6. UI/Workspace 只做调用面，禁止倒逼认知层

**验收（认知层）：**  
同一问「营业额下降怎么办」——输出必须含变量拆解与至少一条因果影响链，禁止直接 20 条无序建议。

---

## 九、下一章入口

理解层 + 能力层已冻。下一拼图：

**`MealKey Learning & Evolution Loop`** — 越用越懂餐饮、越用越懂每个用户。

---

## 十、冻结句

> MealKey 不训练「另一个大模型」；在通用推理引擎之上，构建 **可调用的餐饮经营智能模型**。  
> 护城河 = **经营因果图 + 可执行规则 + 场景推理链 + 岗位执行节点**，不是聊天皮肤。

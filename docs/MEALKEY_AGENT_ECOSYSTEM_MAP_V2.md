# MealKey Agent 生态地图 V2（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-17  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `docs/MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` · `docs/MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md`  
> **冲突裁决：** 与本文冲突时，以本文 + `AUTHORITY.md` 为准

---

## 0. 核心问题（为什么冻结这张图）

> MealKey 不是不断增加 Agent，而是形成「经营智能操作系统」。

一句话原则：

> **四大能力决定方向，Runtime 负责闭环，工具型 Agent 负责执行。**

最终形态：

> **AI 驱动的餐饮经营操作系统：上层帮助老板做正确决策，中层帮助老板持续成长，下层帮助老板完成具体执行。**

不是「餐饮版 ChatGPT」。

---

## 1. 总体架构（冻结）

```
                         MealKey Founder OS
                         创始人经营操作系统
                                  │
                                  ▼
                    ┌──────────────────────┐
                    │    Decision Layer    │
                    │       判断层          │
                    └──────────────────────┘
             ┌────────┬────────┬────────┬────────┐
          M-PNT    M-MKT    M-BIZ    M-ED
          定位     市场     商业     治理
          专家     专家     专家     专家
             └────────┴────────┴────────┘
                       MKDecision
                            │
                            ▼
                    ┌────────────────┐
                    │ Runtime Layer  │
                    │   运行层（六大） │
                    └────────────────┘
  Decision  Execution  Memory  Growth  Risk  Opportunity
  做什么     怎么做     记住     成长    防止    发现
                            │
                            ▼
                    ┌────────────────┐
                    │ Agent Layer    │
                    │ 工具执行层      │
                    └────────────────┘
              专业工具 Agent 生态（可无限扩展）
                            │
                            ▼
     结果 → Memory / Growth；Risk 监控；Opportunity → 下一轮 Decision
```

| 层 | 名称 | 可否无限增加 | 本质 | 商业化 |
|----|------|--------------|------|--------|
| **L1** | Decision Layer（判断层） | **否**（永远四席） | 企业经营最底层四个问题 | 高价值：咨询级服务 |
| **L2** | Runtime Layer（运行层） | **否**（六大已冻，禁止第七） | 与普通 AI 咨询的最大区别 | 中价值：经营系统订阅 |
| **L3** | Agent Layer（工具执行层） | **是** | 具体执行物；不创造战略 | 高频：按调用收费 |

治理（七常委 / Chief of Staff）属决策治理，**不是** L1 第五 Expert，也不是 L3 工具。权限细则见 `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md`。

---

## 2. 第一层：Decision Layer（四大核心能力）

### 定位原则

**永远保持四席。** 这是企业经营最底层的四个问题。

| 代号 | 能力 | 回答 | 输出（允许） |
|------|------|------|--------------|
| **M-PNT** | 品牌定位 | 我是谁？占据消费者什么位置？ | 品牌定位、品类机会、用户心智、竞争空位、品牌战略 |
| **M-MKT** | 市场分析 | 市场在哪里？机会在哪里？ | 市场结构、用户洞察、竞争分析、增长机会 |
| **M-BIZ** | 商业设计 | 如何建立赚钱模型？ | 商业模式、盈利结构、成本模型、扩张模型 |
| **M-ED** | 股权设计 | 如何组织人和利益？ | 股权方案、合伙机制、激励设计、治理结构 |

**冻结：**

- 本版本 **不再增加** 第五个 `FounderAgentName` / 专业顾问席。  
- ❌ `M-EXEC`、`M-GROW`、`M-LEARN`、任意 L3 工具 **不得**升格为 L1。  
- 四席输出汇聚为决策对象：**`MKDecision`**（经 Decision Runtime 收口）。

---

## 3. 第二层：Runtime Layer（系统能力）

这里是 MealKey 与普通 AI 咨询最大的区别。加深 Runtime ≠ 增加顾问席。

### 3.1 Decision Runtime — 决策闭环

管理决策生命周期：决策记录、证据绑定、决策追踪、决策复盘。

**核心对象：** `MKDecision`

### 3.2 Execution Runtime（M-EXEC）— 执行闭环

**重新定义：** 不是第五专家；是 **决策执行操作系统**。

| 能力 | 职责 |
|------|------|
| **Action** | 把决策拆成行动 |
| **Validation** | 验证假设 |
| **Monitoring** | 监控偏差 |
| **Feedback** | 反馈决策 |

**核心对象：** `DecisionExecution` · `ActionPlan` · `ValidationTask`

禁止：ERP/门店 DevOps 终局；终局改战略；注册为第五 Expert。

### 3.3 Growth Runtime — 成长闭环

创始人经营能力进化。**不是培训**，而是从真实经营结果中成长。

| | |
|--|--|
| **输入** | Decision · Action · Result · Failure |
| **输出** | Founder Growth Map · Capability Gap · Next Learning Path |

禁止：做成 `M-GROW` 顾问席；「上课式」售卖。

### 3.4 Memory Runtime — 知识闭环

MealKey 长期壁垒。沉淀：

| 记忆类型 | 内容 |
|----------|------|
| **企业记忆** | 这个老板过去做过什么决定 |
| **项目记忆** | 这个品牌经历过什么 |
| **行业记忆** | 餐饮行业规律 |
| **AI 经验记忆** | 什么判断有效 / 失败 |

禁止：另起独立「学习 Agent」顾问席。

### 3.5 Risk Runtime — 风险闭环

企业风险雷达。六大风险域 · Score · Alert → 建议召回席 / Decision。

**专篇：** `MEALKEY_RISK_RUNTIME_BACKEND_V1.md`

禁止：自行改战略；无证据 CRITICAL；升格 Expert。

### 3.6 Opportunity Runtime — 机会闭环（六大收官）

基于企业自身条件的机会判断。五大来源 · 四因子 Score · → Decision Request。

**专篇：** `MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md`

| 角色 | 职责 |
|------|------|
| Opportunity | 发现「值得研究什么」 |
| 四大 Expert | 判断「是否值得做」 |

禁止：资讯聚合 / 点子机；战略终局；绕过 MKDecision 调 L3。与 Risk 冲突时 **Risk 优先**。

**L2 冻结：** 六大 Runtime 设计收官，**禁止再开第七 Runtime**。下一产品扩展层 = §4 Tool Agent。

---

## 4. 第三层：Agent Layer（工具执行层）

可大量扩展，但必须遵守：

> **工具 Agent 执行，不负责战略判断。**

**框架专篇（~100 个可拆分可组合）：** `docs/MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md`  
**代码真源：** `@mealkey/tool-agent-kit` · 引擎目录 `tool-agents/`

未实现前不得在 UI 冒充 LIVE Expert；实现走 §7 闸门 + 框架上架清单。

### 4.1 创业阶段

| Agent | 能力 | 禁止 |
|-------|------|------|
| **Site Agent** | 商圈分析、人流判断、竞品调查 | 决定品类 / 是否开加盟终局 |
| **Menu Agent** | SKU 结构、毛利分析、爆品设计 | 「建议你改成火锅」类战略改判 |
| **Cost Agent** | 食材成本、人效、毛利优化 | 改商业模式终局 |
| **Launch Agent** | 开业计划、活动设计、节奏管理 | 改定位或模式 |

### 4.2 增长阶段

| Agent | 负责 | 禁止 |
|-------|------|------|
| **Marketing Agent** | 活动方案、用户增长、私域运营 | 改品牌定位 |
| **Content Agent** | 小红书、抖音、点评 | 无 M-PNT 授权发明品类叙事 |
| **CRM Agent** | 会员、复购、用户分层 | 改客群战略终局 |

### 4.3 连锁阶段

| Agent | 职责 | 禁止 |
|-------|------|------|
| **Store Audit Agent** | 门店诊断 | 改战略方向 |
| **SOP Agent** | 标准化 | 未验证打法灌装「最佳实践」 |
| **Training Agent** | 培训体系 | 替代股权 / 组织设计 |
| **Expansion Agent** | 扩张规划 | 越过 M-ED / M-BIZ 做融资终局 |

### 4.4 调用铁律（最重要）

**禁止：** 工具 Agent 自己改变战略。

```
❌ Menu Agent：「建议你改成火锅。」

✅ M-BIZ 决定：做高毛利快餐模型
        ↓
   Menu Agent 执行：设计菜单结构
```

调用权：仅在 **MKDecision 成立** 且 **Execution Runtime 授权** 后调用；结果必须回写 Memory，并由 Growth Runtime 学习。

---

## 5. 完整闭环案例

老板：「我要做一个长沙小吃品牌。」

| 步 | 层 | 动作 |
|----|-----|------|
| 1 | Decision Layer | M-PNT 定位 → M-MKT 验证市场 → M-BIZ 设计模型 → M-ED 合作结构 → 形成 **MKDecision** |
| 2 | Runtime | M-EXEC 生成 30 天验证计划；Risk 监控偏差；结果进 Memory / Growth |
| 3 | Tool Agents | Site → Menu → Marketing（仅执行，不改战略） |
| 4 | 反馈 | Growth：短板；Opportunity：下一窗口信号 → 建议复会 |
| 5 | 升级 | 下一次决策质量提升 |

飞轮：

```
AI 咨询 → AI 执行 → AI 学习 → AI 成长
```

---

## 6. 商业化结构（与分层对齐）

| 价值层 | 对应 | 收费形态 | 卖什么 |
|--------|------|----------|--------|
| **高价值** | L1 四大能力 | 咨询级专项 / 经营点开会 | 判断质量与签字交付（如品牌定位项目） |
| **中价值** | L2 Runtime | 经营系统订阅 | 会议→行动→验证→成长闭环 |
| **高频** | L3 工具 Agent | 按调用收费 | 选址一次、菜单一次、营销一次 |

**禁止叙事：** L3 包装成第五顾问席；用「再加 Agent」代替 Runtime；结果不回写却宣称「经营系统」。

---

## 7. 新模块开工闸门

| # | 问题 | 落层 |
|---|------|------|
| 1 | 回答「我是谁 / 机会在哪 / 怎么赚 / 利益怎么分」？ | → 仅可讨论 L1（默认拒增席） |
| 2 | 让决策/执行/成长/记忆闭环运转？ | → L2 Runtime（禁止 `FounderAgentName`） |
| 3 | 在已定战略下产出执行物？ | → L3 Tool Agent |
| 3b | 持续感知内外部、组装 Decision Context？ | → **M-INTEL（L3 Intelligence Provider）**；见 `MEALKEY_M_INTEL_V1.md` |
| 4 | 会替老板做战略终局？ | → 拒收或上收 L1（**含 M-INTEL**） |
| 5 | 结果回写 Memory 且 Growth 可学？ | 否 → 不得标「闭环」 |
| 6 | UI/计费冒充 LIVE Expert？ | → 禁止 |
| 7 | 权限越界？（见权限模型 V2） | → 拒收 |

---

## 8. 与既有冻结文档的关系

| 文档 | 关系 |
|------|------|
| `FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md` | 四席 + 七常委 + CoS；本文补全 L3 与商业化 |
| `MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` | Expert vs Runtime 闸门 |
| `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` | 谁能决定 / 谁能自动执行 / 谁必须召回七常委 |
| `M_EXEC_EXECUTION_RUNTIME_V2_DEEPCODE.md` | Execution 实现规范 |
| `MEALKEY_RUNTIME_LAYER_V1.md` | 六大 Runtime 总图与阶段 |
| `MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md` | Opportunity 收官专篇 |
| `M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md` | 老板六步 UX；L3 不得改六步步名 |

---

## 9. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V2-freeze | 2026-07-17 | 初冻三层生态 |
| V2-freeze-final | 2026-07-17 | 对齐终稿：MKDecision、Runtime 闭环、阶段工具表、三档商业化 |
| V2-runtime6 | 2026-07-18 | L2 对齐六大 Runtime（含 Risk/Opportunity）；禁止第七；下一站 Tool Agent Layer |

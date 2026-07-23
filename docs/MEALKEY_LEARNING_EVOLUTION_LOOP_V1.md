# MealKey Learning & Evolution Loop V1.0（学习进化闭环 · 冻结）

> **状态：正式冻结（Freeze）— 系统级数据飞轮；让 MealKey 越用越懂餐饮、越用越懂每个用户**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 认知护城河  
> **上游：** Intelligence Model · Knowledge Graph · Skill Engine · Decision Quality · User Intelligence · Memory / Growth Runtime  
> **协同：** Goal Compiler（调度入口）· Mobile Agent（交互燃料）· 权限模型 V2（终局不旁路）  
> **明确不做：** 第七 Runtime；`M-LEARN` / 学习顾问席；把闲聊当燃料；未 opt-in 写 Industry / 跨租户；平行「岗位智能总架构」；全岗位企业套件。

---

## 〇、生命线（冻结）

> Skill Engine = **人的能力成长**。  
> Learning & Evolution Loop = **系统与个人模型的飞轮**。

| GPT | MealKey |
|-----|---------|
| 每次重新回答 | 交互 → 判断 → 结果 → 反馈 → 规则/Skill 升级 |
| 无本店经验 | Memory + 本店 Pattern |
| 静态知识包 | 可进化 Rules / Skill / 决策质量 |

**一句话：**

> 没有进化闭环，所有知识都是静态资产；有了闭环，MealKey 才从「AI 应用」进入「行业智能系统」。

---

## 一、闭环主链（冻结）

```text
用户问题 / 目标表达
        ↓
Goal Compiler（理解 · 编译 · 薄调度）
        ↓
认知层（Model / KG / Rules / Role Perspective）
        ↓
Capability（Business · Role · Scenario Skill）
        ↓
Decision Runtime（四席 → 七常委 → DIE）必要时
        ↓
Execution（L3 Tool Agent / M-EXEC）必要时
        ↓
结果与用户反馈（合法燃料）
        ↓
Evolution Event 写入（本 Loop）
        ↓
更新：Skill 等级投影 · 决策习惯 · Rules 候选 · Memory Pattern
        ↓
下一次编译 / 陪练 / 决策更准
```

**铁律：**

1. **岗位不是入口**，是认知层 Role Perspective。  
2. **Agent / 垂直能力 = Intelligence Provider**，不拍板。  
3. **战略终局**服从权限模型 V2（S2 批准 / S3 战略变轨 / 人签字）；本 Loop **不得**绕过常委写战略。  
4. **禁止第七 Runtime**——本 Loop 是 Memory + Growth + Skill + Decision Quality 的**收口协议**，不是新顾问席。

---

## 二、合法燃料（冻结 · 分轨）

与 User Intelligence / Skill Engine 对齐，禁止双轨乱写。

| 轨道 | 合法燃料 | 非法 |
|------|----------|------|
| **Decision / UI 轨道** | 决策选择 · 修改/推翻 AI · M-EXEC 完成率 · 预测 vs 实际 | 普通闲聊 |
| **Skill 轨道** | 陪练评分 · 岗位任务纠偏 ·（可得时）经营代理指标 | 无 Outcome 的软课刷分 |
| **Compile 轨道** | Goal 编译完成 · 资产产出 · 用户续聊/放弃目标 | Prompt 原文当知识 |

**Memory Permission：**

- `saveExperience` / `useForPersonalGrowth` 默认可开  
- `contributeToIndustryModel` **默认关**；未 opt-in 禁止 Industry / 跨租户  
- 禁止偷偷学习

---

## 三、Evolution Event（V1 最小对象）

一次可学习的交互沉淀为一个事件（存项目 profile 侧车，不平行 Prisma 大表）。

| 字段 | 含义 |
|------|------|
| `eventId` | 唯一 id |
| `at` | ISO 时间 |
| `source` | `skill_drill` \| `goal_compile` \| `decision_feedback` \| `execution_outcome` |
| `rolePerspective` | `owner` \| `manager` \| `server` \| `chef` \| `unknown` |
| `scenarioKey` | 场景键（如 `revenue_down_7d`） |
| `dispatchLane` | 见 §四 |
| `outcomeHint` | `improved` \| `neutral` \| `worsened` \| `unknown` |
| `skillRef` | 可选：drillId / skillKey |
| `score` | 可选：陪练分 / 质量分 |
| `lesson` | 一句可复用教训（短） |
| `permissionOk` | 是否允许写入个人成长 |

V1 **只追加事件 + 聚合投影**；不自动改写行业 Rules 正文（Rules 升级需显式候选 + 人工/常委闸门，后置）。

---

## 四、薄调度协议（Goal Compiler · 冻结）

不是新架构；只回答「何时走哪条车道」。

| `dispatchLane` | 何时 | 谁干活 | 禁区 |
|----------------|------|--------|------|
| `skill` | 陪练 / 「练习」话术 / 能力训练 | Skill Engine | 不写 MKDecision |
| `business_capability` | 经营方案、诊断报告、开店/菜单编译 | Goal Compiler + Capability Providers | 不替代常委终局 |
| `council` | 重大资源 / 战略变轨 / 命中召回清单 | 四席 → 七常委 → DIE | L3 禁止直写战略 |
| `tool_agent` | 已授权的执行物（体检、巡店任务等） | L3 Tool Agent | 零战略终局权 |
| `reflect` | 复盘 / 结果反馈 | Memory + Decision Quality | 不编造结果 |

**解析优先级（V1）：**

```text
1. 显式陪练意图 → skill
2. 命中战略召回语义（扩张投资/改定位/股权终局等）→ council
3. 执行/工具话术（去做体检、生成巡店清单）→ tool_agent
4. 复盘/结果反馈 → reflect
5. 默认 → business_capability
```

实现落点：`founder-layer/evolution-loop/dispatch.ts`；Compiler / Mobile Agent 记录 `dispatchLane`，UI **不**暴露车道菜单。

---

## 五、P1 竖切范围（冻结）

### 5.1 Learning Loop 工程竖切

- profile 侧车 `evolutionLoop`：事件环 + 聚合（陪练次数、最近教训、店长/老板视角计数）  
- Skill 陪练 `evaluate` → 写 Evolution Event  
- Goal 编译成功 → 写 Evolution Event（含 `dispatchLane`）  
- 尊重 Memory Permission

### 5.2 店长 Role × Skill 竖切

在已有 `manager.labor_efficiency_v1` 之上，增加：

- **`manager.revenue_diagnosis_v1`**：店长视角 · 连续营业额压力 · 客流/客单/转化/复购拆解  

验证链：

```text
老板目标 / 经营问题
    ↓
店长 Role Perspective + Skill 陪练或编译
    ↓
Evolution Event
    ↓
下次同场景提示更贴门店执行
```

**不做：** 营运经理/厨师长/采购全岗位树；企业套件。

### 5.3 MVP 0.1 验证题（后置验收）

老板/店长真实问题 → 有判断资产 → 有一次反馈写入 Loop → 第二次同主题更贴。  
未过本验证前：禁止扩 Agent / 岗位大全 / 收费货架叙事。

---

## 六、与已冻层的挂载（禁止平行宇宙）

| 已冻 | 本 Loop 如何挂 |
|------|----------------|
| Skill Engine | Skill 轨道燃料 → Evolution Event；公式仍为 Role×Scenario×Behavior×Outcome |
| User Intelligence | Decision 四类燃料 → 可投影进 Loop；不另建画像引擎 |
| Decision Quality | Pre/Post / 偏差学习 = Decision 轨道深化；共享「越用越准」叙事 |
| Memory / Growth Runtime | 事件可投影 Growth；禁止开学习顾问席 |
| 权限模型 V2 | `council` / 战略变轨必须升级；Loop 只记事件不批准决策 |

---

## 七、工程落点

| 项 | 路径 |
|----|------|
| 契约 / 调度 / 写入 | `apps/web/src/server/founder-layer/evolution-loop/` |
| Skill 回写 | `skill-engine` evaluate → `recordSkillEvolution` |
| Compiler 回写 | `mobileAgent.compile` → `recordCompileEvolution` |
| 店长剧本 | `skill-engine/catalog.ts` · `manager.revenue_diagnosis_v1` |
| 测试 | `apps/web/tests/evolution-loop.test.ts` |

---

## 八、下一章

**MVP 0.1 第一性验证**（真实老板/店长冷启动陪跑指标）→ 再谈 Rules 候选自动晋升与行业模型（须 opt-in）。

---

## 九、冻结句

> 岗位是认知视角，不是新系统。  
> Agent 是能力组件，不是入口，不拍板。  
> Learning Loop = Memory + Growth + Skill + Decision Quality 的收口飞轮，不是第七 Runtime。  
> 下一刀：Loop 竖切 → 店长 Skill → 薄调度 → MVP 验证；停扩货架。

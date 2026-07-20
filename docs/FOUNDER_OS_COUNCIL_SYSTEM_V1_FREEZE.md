# Founder OS Council System V1 冻结版

> **状态：正式冻结（Freeze）**  
> **日期：2026-07-18**  
> **性质：** 概念 → 系统架构收口。此后不再扩组织设计，进入工程：协议 → 代码 → 测试 → 案例验证。  
> **权威入口：** 已挂 `docs/AUTHORITY.md` L0。

---

## 一、核心定位

七常委不是：

- ❌ AI 聊天机器人
- ❌ 七个专家 Prompt
- ❌ 模拟咨询顾问会议

而是：

> **AI 企业治理委员会（AI Governance Council）**

目标：把创始人的经营决策过程，升级为：

**专业分析 → 多维审议 → 风险约束 → 决策 → 执行 → 学习进化**

---

## 二、组织结构冻结

```text
                    Founder
                       │
              Founder Decision OS
                       │
              Council Governance
                       │
 ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
 CSO      CMO      CBO      BMO      CFO      COO      CRO
 战略      市场     品牌     商业     财务     运营     风险
```

### 七常委职责

| 常委 | 核心问题 |
| --- | --- |
| CSO | 方向是否正确？ |
| CMO | 用户是否真实需要？ |
| CBO | 消费者为什么选择？ |
| BMO | 商业是否成立？ |
| CFO | 资金是否安全？ |
| COO | 是否能够复制落地？ |
| CRO | 是否存在致命风险？ |

**冻结：刚好 7 席。** Founder 非第八常委；不增常委。

细则真源：`docs/COUNCIL_PROTOCOL_V1_FREEZE.md` · `docs/FOUNDER_OS_COUNCIL_PERSONA_V2.md`

---

## 三、与四大能力 Agent 的关系冻结

### 四大 Agent：专业能力生产

| Agent | 能力 |
| ----- | ---- |
| M-PNT | 品牌定位能力 |
| M-MKT | 市场分析能力 |
| M-BIZ | 商业设计能力 |
| M-ED | 股权设计能力 |

### 七常委：企业级判断

关系不是 `Agent → Decision`，而是：

```text
Agent Insight
    ↓
Council Review
    ↓
MKDecision
```

边界真源：`docs/MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` · `docs/FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md`

---

## 四、完整决策链冻结

```text
经营问题
  ↓
Decision Router
  ↓
调用专业 Agent
  ↓
生成 MKInsight
  ↓
Council Brief
  ↓
七常委独立判断
  ↓
冲突检测
  ↓
辩论校准
  ↓
投票
  ↓
MKDecision
  ↓
Execution Runtime
  ↓
Result
  ↓
Memory Learning
```

---

## 五、三个核心协议冻结

| 协议 | 解决 | 真源 |
| --- | --- | --- |
| **Council Protocol** | 怎么治理（权限 / 角色 / 投票 / veto / 会议流程） | `docs/COUNCIL_PROTOCOL_V1_FREEZE.md` |
| **Decision Protocol** | 如何形成高质量决策（状态机 / Evidence / Confidence / Trace / Review） | `docs/MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` |
| **Memory Protocol** | 如何持续进化（战绩 / 准确率 / 企业经验 / Founder 偏好） | `docs/MEALKEY_MEMORY_RUNTIME_BACKEND_V1.md` |

---

## 六、核心数据对象冻结

未来所有决策围绕：

| 对象 | 含义 | 来源 / 用途 |
| --- | --- | --- |
| **MKInsight** | 专业洞察 | 四大 Agent |
| **CouncilBrief** | 会议材料 | Router / CDO 编排 |
| **CouncilOpinion** | 常委判断 | 七常委独立输出 |
| **MKDecision** | 最终决策 | 投票 + Founder 裁决后落档 |
| **DecisionReview** | 结果复盘 | Execution / Validation 回写 |
| **LearningEvent** | 经验沉淀 | Memory Runtime |

---

## 七、后端实现路线冻结

**不要继续扩理论。进入工程阶段。顺序固定：**

### Phase 1 — Council Intelligence Integration（「4 + 1」）

> **消歧义：** 4+1 ≠ 四个选择方向。  
> **4** = 四大专业能力全部接入七常委；**+1** = 接入后的架构治理（Contract / Evidence / Trace / 边界）。  
> 真源拆解与 Sprint：`docs/FOUNDER_OS_COUNCIL_INTELLIGENCE_4PLUS1_V1.md`

- S1–S3：M-MKT / M-BIZ / M-ED Council Adapter（M-PNT 已接，同步深化为 Positioning Intelligence Provider）
- S4：统一 MKInsight Contract
- S5：Architecture Governance 审计

**目标：** 四大 Agent 以 `MKInsight` 接入委员会，系统不因多 Report 形状而混乱。

### Phase 2 — Council Runtime Engine

- Session 状态机
- Debate Runtime
- Voting Engine
- Decision Generator

**目标：** 委员会真正运行。

### Phase 3 — Memory Runtime（委员会成长侧）

- Decision Memory
- Member Performance
- Founder Preference
- **User Intelligence Evolution（加深，非新 Runtime）**：Intelligence Profile 投影 · BehaviorSignal · Memory Permission  
  见 `docs/FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md`

**目标：** 委员会成长 + 创始人经营镜像可校准常委提醒（不替签字）。

### Phase 4 — Decision Room 产品化

- 前端体验
- 可视化
- Founder 交互

**目标：** 创始人 AI 决策室（不是七人聊天）。

---

## 八、明确不做

| 不做 | 说明 |
| --- | --- |
| 第五核心 Agent | **M-EXEC 不是第五席**，是 Execution Runtime |
| 通用任务执行平台 | 不变成 ERP / OA / 项目管理 |
| 「七个人聊天」 | 最终体验是**创始人的 AI 决策室** |

---

## 九、最终价值定位

MealKey 不再只是 AI 餐饮咨询，而是：

## AI 餐饮经营操作系统

核心壁垒：

```text
专业能力 Agent
  + AI 经营委员会
  + 决策协议
  + 执行闭环
  + 长期学习
```

---

## 十、当前系统成熟度

| 层级 | 状态 |
| --- | --- |
| 四大能力 Agent | ✅ 已完成基础能力 |
| 七常委人格 | ✅ V2 完成 |
| 治理协议 | ✅ 完成 |
| 决策协议 | ✅ 完成 |
| 智能连接协议 | ✅ 完成 |
| 成长机制 | ✅ 完成设计 |
| 运行引擎 | ⏳ 下一阶段 |
| 产品体验 | ⏳ 后置 |

---

## 十一、下一阶段唯一主线

> **把 Council Runtime Engine V1 写出来，让七常委第一次真正运行。**

从这里开始，不再设计组织，而进入：

**协议 → 代码 → 测试 → 实际决策案例验证。**

工程入口建议（实现时再加深，不在此扩理论）：

- 配置 / 合约：`founder-os/` · `packages/agents/src/founder-os/`
- 协议细节：`docs/COUNCIL_PROTOCOL_V1_FREEZE.md`
- 会议引擎草案：`docs/FOUNDER_OS_COUNCIL_MEETING_ENGINE_V1.md`
- 权限召回：`docs/MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md`

---

## 变更

| 日期 | 说明 |
| --- | --- |
| 2026-07-18 | Council System V1 系统级收口；组织与协议层冻结；下一主线 = Runtime Engine |
| 2026-07-18 | Phase 1 澄清为「4+1」Intelligence 接入 + 架构治理；见 `FOUNDER_OS_COUNCIL_INTELLIGENCE_4PLUS1_V1.md` |

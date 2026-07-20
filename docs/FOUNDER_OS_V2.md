# Founder OS V2 — 四大能力 Agent 母架构

> 更新：2026-07-14  
> 定位：**增强经营者四大能力的 AI 共生体**，不是「四个餐饮咨询 Agent 的集合」。

---

## 1. 核心变化

| 过去 | V2 |
|------|-----|
| M-MKT / M-PNT / M-BIZ / M-ED 平铺为「四顾问」 | **四大能力 Agent** 为母层 |
| 堆 Agent = 堆功能 | 专业模块 = **能力插件** |
| 会议流水线即产品 | OS Kernel（Memory / Evidence / Decision Bus）共享 |

```
Founder OS
└─ AI Founder（操作系统壳）
   ├─ Cognition Agent   看懂世界
   ├─ Decision Agent    做正确选择
   ├─ Execution Agent   推动事情发生
   └─ Growth Agent      持续进化

专业插件（不消失，升级位置）：
  M-MKT → Cognition / Market
  M-PNT → Cognition / Brand
  M-BIZ → Cognition / Business
  M-ED  → Decision / Capital
```

---

## 2. 统一 Runtime 架构（OS 级）

### 2.1 三层

```
┌─────────────────────────────────────────────┐
│  Product Surface（今日 / 会议 / 决策 / 认知） │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Capability Runtime（四大能力 Agent 调度）    │
│  Cognition → Decision → Execution → Growth  │
│  （可按 Mode 跳步 / 单能力运行）               │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  OS Kernel（共享底座，Source of Truth）       │
│  Mission · Evidence · Memory · DecisionBus  │
│  Validation · Debate（Decision 子引擎）      │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Capability Plugins（领域引擎）               │
│  Market(M-MKT) Brand(M-PNT) Business(M-BIZ) │
│  Capital(M-ED) World Self Risk Sim …        │
└─────────────────────────────────────────────┘
```

### 2.2 调度原则

1. **Kernel 唯一写入口**：Evidence / Memory / Decision Contract 只经由 Kernel API 写入。  
2. **能力 Agent 只产出本域产物**：Cognition → InsightPack；Decision → DecisionContract；Execution → ActionPlan；Growth → GrowthDelta。  
3. **插件可替换、可降级**：插件失败 → heuristic，不拖垮 OS。  
4. **兼容路径**：现有 `runFounderLoop` = `Cognition(插件三席+证据) + Decision(会议/辩论/合同)` 的紧耦合实现；V2 Runtime 逐步拆开，投影层不变。

### 2.3 共享 Kernel 对象

| 对象 | 谁读 | 谁写 | 现有落点 |
|------|------|------|----------|
| Mission | 全能力 | Mission Engine | `contracts/mission.ts` |
| EvidencePack | Decision / Execution / Growth | Cognition 绑定 + Validation outcome | `evidence/` |
| MemorySnapshot | Cognition / Decision | Growth + Decision confirm + Validation | `memory/` |
| DecisionBus（合同+提案） | Execution / Growth | Decision Agent | `decision/` + debate |
| ValidationTasks | Execution / Growth | Execution（从 Decision 派生） | `validation/` |

### 2.4 能力协作协议（最小）

```
CapabilityRequest
  mission, companyContext, memory, mode, plugins[]

CapabilityResult
  agentId, insights | decision | actions | growth
  evidenceRefs[], memoryWrites[], nextSuggestedAgent?

OS Cycle（默认战略会议）
  1 Cognition.run → InsightPack + Evidence
  2 Decision.run(insights) → Debate + Contract
  3 Execution.plan(contract) → Goals/Actions（V2.1）
  4 Growth.observe(outcome) → Reflection/Memory（V2.2）
```

`nextSuggestedAgent` 允许单能力调用后催办下一能力（今日页 CTA）。

### 2.5 Mode（调度模式）

| Mode | 路径 | 产品入口 |
|------|------|----------|
| `strategy_meeting` | Cog→Dec（现 founder loop） | 会议页 |
| `cognition_only` | 仅 Cog | 世界/专项页统一 |
| `decision_pressure` | Dec（复用已有 Insight） | 董事会压力测试 |
| `execution_track` | Exec | 决策验证中心 |
| `growth_review` | Growth | 认知/复盘 |

---

## 3. 四大能力 Agent 规格（摘要）

### 3.1 Cognition — 看懂世界

**产物 `InsightPack`**：市场判断 / 品牌心智 / 赚钱逻辑 / 世界信号 / 自我画像。

| 插件 | 来源 | 状态 |
|------|------|------|
| Market | M-MKT | ✅ 已有 adapter |
| Brand | M-PNT | ✅ 已有 adapter |
| Business | M-BIZ | ✅ 已有 adapter |
| World | World Sense | ✅ 品牌+议题+Memory 推导 |
| Self | Self Sense | ✅ 偏好/成败模式/决策摘要 |

### 3.2 Decision — 做正确选择

**产物 `DecisionPack`**：战略收口 / 资本简报 / 风险推演 / 情景模拟 / Evidence 状态 / Debate + Contract。

| 模块 | 来源 | 状态 |
|------|------|------|
| Strategy | Debate + FinalDecision | ✅ Decision Agent |
| Capital | M-ED | ✅ Decision / Capital 插件 |
| Risk | 席位风险 + 冲突 + What-If | ✅ RiskBrief |
| Simulation | ScenarioTest | ✅ SimulationBrief |
| Evidence | Evidence Engine | ✅ 门禁写入 pack |

代码：`capability/decision/agent.ts` · Mode：`strategy_meeting` / `decision_pressure`

### 3.3 Execution — 推动发生

**产物 `ActionPlan`**：Goal 拆解 / Action 清单 / Alignment / Communication / ValidationTask。

| 模块 | 状态 |
|------|------|
| Goal / Action | ✅ 从 DecisionContract + Memo 生成 |
| Alignment / Communication | ✅ 对齐提示 + 对内/合伙沟通草稿 |
| Execution Memory | ✅ 写入 MemoryWrite + Validation OS 任务 |
| Validation 落库 | ✅ `startMeeting` 写入 `profile.validationTasks` / `lastActionPlan` |

代码：`capability/execution/agent.ts` · Mode：`strategy_meeting` / `execution_track`

### 3.4 Growth — 持续进化

**产物 `GrowthDelta`（Reflection + Capability Scores + Learning）**。

| 模块 | 状态 |
|------|------|
| Memory | ✅ Memory Engine V1 |
| Reflection / Capability / Learning | ✅ Growth Agent |
| 能力页实时分 | ✅ `founder.getCapabilityStatus` |
| 验证回写刷新能力分 | ✅ `refreshGrowthAfterValidation` |
| 今日一句判断 ← DecisionPack | ✅ `profile.lastDecisionPack` |

代码：`capability/growth/agent.ts` · `scoring.ts` · Mode：`strategy_meeting` / `growth_review`

---

## 4. 开发顺序（冻结）

1. **Cognition Agent** — ✅ InsightPack  
2. **Decision Agent** — ✅ DecisionPack  
3. **Execution Agent** — ✅ ActionPlan + Validation OS  
4. **Growth Agent** — ✅ GrowthDelta + 能力飞轮评分  

---

## 5. 代码落点（本仓库）

```
founder-layer/
  contracts/capability.ts
  capability/
    runtime.ts                # Cog → Dec → Exec → Growth
    cognition/agent.ts
    decision/agent.ts
    execution/agent.ts
    growth/agent.ts
    growth/scoring.ts
```

兼容：`runFounderLoop` 返回 `insightPack` + `decisionPack` + `actionPlan` + `validationTask`。

---

## 7. 前端信息架构（Founder OS 2.0）

一级导航：

```
今日 Today → 聚焦今天该做什么（Morning Brief）
能力 Capability → 四大能力入口
会议 Council → 经营委员会（决策过程）
行动 Action → 验证 / Decision Memory
成长 Growth → 经营者画像（原「大脑」）
```

用户心智：从「四个 AI 顾问」→「我的经营操作系统」。

落地状态：

| 面 | 状态 |
|----|------|
| 导航 IA | ✅ `shellNavigation.ts` |
| 今日 Morning Brief | ✅ + Growth 下一步 / 短板开委员会 |
| 能力中心 | ✅ `/projects/[id]/capability` + Memory 实时分 |
| 会议委员会化 | ✅ MeetingRoom 委员会文案与流程 |
| 行动 = Decision Memory | ✅ 行动档案文案 / Decision Memory |
| 成长 = Founder Profile | ✅ profile → 经营者画像 + GrowthDelta / 能力分 |
| 企业品牌可改可换 | ✅ `brands[]` + settings + BrandSwitcher |

视觉方向：私人战略顾问办公室 — 少卡片、少数字墙、多判断与过程。

### 经营点经济模型 V1（前后端已落地）

心智迁移：买 SaaS 套餐 / Agent 次数 → **拥有 AI 经营顾问，购买经营点解决经营问题**。

| 删除 | 新增 |
|------|------|
| 套餐中心 / 月费会员 / 剩余次数 / Token 技术展示 | 经营点钱包 `/billing` |
| Basic·Pro·Enterprise 价卡 | 探索包 / 创业包 / 连锁成长包 |
| 直接进入 Agent | 消耗确认页（购买一次专业判断） |

- 账本：`business-points.service.ts`（预扣 / 退回 / 价值档案）
- 结算：`founder.startMeeting` 预扣；失败自动退回
- 文档：`docs/BUSINESS_POINTS_V1.md`

### 品牌（企业可修改）

- 数据：`profile.brands[]` + `activeBrandId`（旧 `brandName` 自动迁移）
- API：`project.listBrands` / `upsertBrand` / `switchBrand`（`update` 改为 profile shallow merge）
- UI：`/projects/[id]/settings` + 能力/部门看板/成长页 `BrandSwitcher`
- Founder：`contextFromProfile` → 当前品牌心智注入会议 Loop

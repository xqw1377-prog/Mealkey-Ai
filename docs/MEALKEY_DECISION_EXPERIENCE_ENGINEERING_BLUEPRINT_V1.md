# MealKey Decision Experience — Engineering Implementation Blueprint V1

> **状态：正式冻结（Freeze）— Cursor 执行版**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **产品真源：** `MEALKEY_DECISION_EXPERIENCE_V1.md`  
> **目的：** 文件改哪些、接口长什么样、先 Mock 什么、必须接 Brain 什么、每阶段验收标准。

---

## 〇、执行原则

1. **不扩第七 Runtime / 不新 Prisma Decision 大表。** Case.id ≡ Prisma `Decision.id`。  
2. **DailyScan 只投影，不滥造 Decision。** Signal → Candidate →（升格）Case。  
3. **无品牌/地理锚点 → M-INTEL 不产区域结论。**  
4. **已有 E1–E3 UI 骨架可复用**；本蓝图以契约对齐 + Candidate/Inbox/Horizon/Readiness State 补齐为主。  
5. 老板可见文案服从 Experience；内部可保留 DIE/Council 命名。

---

## 一、Phase 0 — 冻结接口（先于新 UI）

### 1.1 代码 SSOT（新建/对齐）

| DTO | 路径 | 说明 |
|-----|------|------|
| `BusinessIdentityV1` | `apps/web/src/server/founder-layer/contracts/business-identity.ts` | + `decisionHorizon` |
| `DecisionReadinessV1` | 同上 | + `state: ready \| need_evidence \| need_context \| high_uncertainty` |
| `DecisionCandidateV1` | `.../contracts/decision-candidate.ts` | **新建** |
| `DecisionInboxV1` | `.../contracts/decision-inbox.ts` | **新建**（Queue 投影） |
| DIE Case/Context | `decision-intelligence-data-contract.ts` | 已有；Candidate 升格后写入 |

### 1.2 DTO 形状（冻结）

```typescript
// BusinessIdentity — 增补
decisionHorizon: "short" | "mid" | "long"; // 7-30d | 3-12m | 1-3y

// DecisionReadiness — 增补
state: "ready" | "need_evidence" | "need_context" | "high_uncertainty";
stateLabel: string; // 需要补充经营事实 | …

// DecisionCandidateV1
{
  candidateId: string;
  projectId: string;
  signalIds: string[];
  title: string;
  whyNow: string;
  impactStars: 1|2|3|4|5;
  urgencyStars: 1|2|3|4|5;
  horizonFit: "short"|"mid"|"long"|null;
  promoteScore: number; // 0-100
  status: "open" | "promoted" | "dismissed" | "watching";
  caseId?: string; // 升格后
  createdAt: string;
}

// DecisionInboxV1
{
  pendingDecide: number;
  watching: number;
  executing: number;
  reviewing: number;
  items: Array<{
    id: string; // candidateId or caseId
    kind: "candidate" | "case";
    title: string;
    bucket: "pending_decide" | "watching" | "executing" | "reviewing";
    href: string;
  }>;
}
```

### 1.3 Phase 0 验收

- [x] 上述类型可被 `apps/web` 引用编译（`decision-experience-v1.ts` SSOT）  
- [x] Signal / RestaurantContext / Candidate 契约落地（见 `MEALKEY_DECISION_EXPERIENCE_PHASE0_CONTRACTS.md`）  
- [x] **不改**老板主路径 UI；**本阶段不改 AUTHORITY**（按执行指令）  
- [x] P2：`signal-engine` + `candidate-promote` 已接线 daily-scan（2026-07-18）

---

## 二、Phase 1 — Identity Intake（含 Horizon）

### 2.1 目标

登录 60 秒认识生意；品牌+地理必采；Horizon 可采。

### 2.2 改哪些文件

| 文件 | 动作 |
|------|------|
| `lib/onboarding-interview.ts` | + Horizon 题（choice）；`buildBusinessIdentity` 写字段 |
| `app/onboarding/page.tsx` | 选项 UI；摘要展示 Horizon |
| `server/routers/user.ts` `completeOnboarding` | 持久化 `decisionHorizon`；redirect `/dashboard` |
| `server/routers/project.ts` `saveBusinessIdentity` | 补档含 Horizon |
| `app/.../business-identity/page.tsx` | 补档表单 |
| Brain sync（已有） | city / storeCount / brandName |

### 2.3 Mock vs 真实

| 项 | 策略 |
|----|------|
| 阶段/关注摘要 | **启发式可 Mock**（已有） |
| brand/city/store | **必须真实**写 Project + Brain |
| Horizon | **真实**进 `businessIdentity` JSON |

### 2.4 验收

> 代码已接线（onboarding / `saveBusinessIdentity` / Horizon）；下列为**手测勾选**。

- [ ] 新用户走完速写进驾驶舱  
- [ ] `profile.businessIdentity` 含 brand、city、horizon  
- [ ] `RestaurantProfile.city` 非空（有地理时）  
- [ ] 无地理时 `externalIntelReady === false`

---

## 三、Phase 2 — Today's Cockpit + Inbox 投影

### 3.1 目标

跑通：`Brain → Signal → Candidate(规则) → Primary Focus`；Inbox 计数可见。

### 3.2 改哪些文件

| 文件 | 动作 |
|------|------|
| `capability/decision-center/daily-scan.ts` | 产出 `todayFocus` + `inbox`；CTA 文案 |
| `contracts/decision-center.ts` | `DailyScanV1.inbox?` |
| `capability/decision-intelligence/candidate-promote.ts` | **新建**：Signal→Candidate→是否升格 |
| `routers/dashboard.ts` | 传入 Identity/Horizon；挂 inbox |
| `DecisionCenterMorning.tsx` | 焦点主角 + Inbox 弱计数 |
| `DecisionReadinessPanel.tsx` | 展示 `stateLabel` |

### 3.3 升格规则（V1 最小 · 可 Mock 分数）

```text
promoteScore =
  impact*20 + urgency*20
  + (阻断风险 ? 25 : 0)
  + (与 Horizon 对齐 ? 15 : 0)
  - (完整度<15 ? 20 : 0)

promoteScore >= 55 → 可升格 Case / 进入今日焦点
否则 → Inbox.watching 或仅 Signal
```

### 3.4 Mock vs 真实

| 项 | 策略 |
|----|------|
| Risk/Opportunity Signal | **真实**读现有 Runtime 投影 |
| promoteScore | **规则真实**；暂不用 LLM |
| 打开 Case | 仅焦点/用户进入时 `openExpansionCase` 等；**禁止**每日扫描批量 createDecision |

### 3.5 验收

- [x] 驾驶舱第一屏是今日焦点，不是聊天  
- [x] Inbox 四计数可渲染（可为 0）  
- [x] 低分 Signal **不**自动产生新 Decision 行（仅 Candidate；无 createDecision）  
- [x] 有焦点时 CTA → 决策室  
- [x] 单测：`decision-candidate-promote.test.ts`

---

## 四、Phase 3 — Decision Room 数据流

### 4.1 目标

```text
Context → Evidence → Option → Challenge → Decision
```

准备度 **State 优先**；Challenge Layer **摘要优先**。

### 4.2 改哪些文件

| 文件 | 动作 |
|------|------|
| `capability/decision-intelligence/readiness.ts` | 推导 `state` / `stateLabel` |
| `DecisionReadinessPanel.tsx` | 状态文案置顶 |
| `DecisionIntelligenceRoom.tsx` | Challenge 摘要 UI（3 条风险挑战 + 展开来源） |
| `challenge-seed.ts` | 输出可聚合为「财务/运营/市场风险」 |
| `context-builder.ts` | 品牌/城市 facts；Unknowns |
| `service.ts` | 已有 open/decide/exec/learn；对齐 Trace |

### 4.3 Mock vs 真实

| 项 | 策略 |
|----|------|
| Options/Simulation | **规则真实**（扩店 A/B/C 已有） |
| Challenge 全文七常委 | **可链旧 decision-room**；摘要层先 Mock/种子 |
| Assessment | **真实**纯函数 |
| Brain Context | **必须真实** `loadRestaurantBrainContext` |

### 4.4 验收

- [x] 准备度显示状态句（非仅星级）— `DecisionReadinessPanel` + 裁决区  
- [x] Challenge 默认非「CSO: 我认为」角色秀 — `ChallengeLayerPanel` + `buildChallengeReport`  
- [x] 无城市时准备度 `need_evidence`，且不宣称外部情报  
- [x] 裁决写 Trace + Case.status（既有 service）  
- [x] 单测：`die-challenge-layer.test.ts`

---

## 五、Phase 4 — M-EXEC + Learning + 经营决策习惯

### 5.1 改哪些文件

| 文件 | 动作 |
|------|------|
| `commitExpansionExecution`（已有） | 保持 Package→`createFromDecision` |
| `learning.ts` / `recordLearning` | Post + Brain `learn` |
| Founder / Learning 投影 | 对外文案「经营决策习惯」 |
| Decision Room 复盘区 | 展示习惯提醒（有样本后） |

### 5.2 验收

- [x] 裁决→执行→今日行动出现（Package 7/30/60/90 预览 + `createFromDecision`）  
- [x] 复盘写入 Learning（Decision.learning + Brain `learn`）+ profile `operatingDecisionHabit`  
- [x] UI 对外「经营决策习惯」，不出现「决策人格」；单测 `die-learning-habit.test.ts`

---

## 六、Phase 5 — M-INTEL 锚点门禁

| 文件 | 动作 |
|------|------|
| `capability/m-intel/anchor-gate.ts` | 无 `brand+city` → 拒绝区域结论；返回 gap |
| `capability/m-intel/evidence-bind.ts` | 主体绑定话术（城市·品牌：变化；对本店影响） |
| `context-builder` / `signal-engine` | 接线：压低外部权重、剔伪区域量化 |

### 6.1 验收

- [x] 无锚点时零伪造区域百分比（`filterEvidenceByAnchorGate`）  
- [x] `queryMintelRegional` 缺锚点只回 gap  
- [x] Context 无城市 → `mintelAnchorsReady=false` + openGaps  
- [x] 单测：`m-intel-anchor-gate.test.ts`

---

## 七、目录与新建清单（汇总）

```text
# 新建
contracts/decision-candidate.ts
contracts/decision-inbox.ts
capability/decision-intelligence/candidate-promote.ts
tests/decision-candidate-promote.test.ts
tests/decision-readiness-state.test.ts

# 已有 · 加深
contracts/business-identity.ts
capability/decision-center/daily-scan.ts
capability/decision-intelligence/{service,readiness,context-builder,challenge-seed}.ts
components/operating/{DecisionCenterMorning,DecisionIntelligenceRoom,DecisionReadinessPanel}.tsx
routers/{user,project,dashboard,decision-intelligence}.ts
app/onboarding/page.tsx
app/.../business-identity/page.tsx
app/.../decision-case/page.tsx
```

**明确不改：** Prisma schema 新 Decision 表；FounderAgentName；平行 `/decision-os` 树。

---

## 八、与已实现代码的差距（诚实）

| 能力 | 现状（2026-07-18） | Blueprint 补齐 |
|------|-------------------|----------------|
| Identity Intake | 有（缺 Horizon） | Phase 1 |
| Cockpit Focus | 有 | Phase 2 加 Inbox |
| Readiness | 有星级/列表 | Phase 0/3 加 State |
| Challenge | 角色列表+种子 | Phase 3 摘要层 |
| Candidate 升格 | **无**（Scan 直链 Case） | Phase 2 核心 |
| Inbox | **无** | Phase 2 |
| EXEC/Learning | 扩店闭环有 | Phase 4 打磨文案 |
| M-INTEL 门禁 | 已强制（anchor-gate） | Phase 5 ✓ |

---

## 九、Cursor 开工顺序（已完成）

```text
P0–P5 工程已收口（2026-07-19）
下一刀 = §十一 黄金路径手测（非新平行体验层）
```

---

## 十、一句话

**契约先于皮肤；Candidate 过滤噪声；Focus 定义打开理由；Room 用状态解释不确定；EXEC 与习惯完成闭环。**

---

## 十一、黄金路径手测清单（下一刀）

锁定题：**「要不要开第二家店？」**

| # | 步骤 | 通过标准 | 勾选 |
|---|------|----------|------|
| 1 | 新用户 / 补档 Identity | 填品牌 + 城市 + Horizon；进 `/dashboard` | [ ] |
| 2 | 查 profile | `businessIdentity` 有 `brandName`/`city`/`decisionHorizon`；`externalIntelReady === true` | [ ] |
| 3 | 驾驶舱 | 第一屏是今日焦点（非聊天）；Inbox 四计数可见 | [ ] |
| 4 | 扩店焦点 CTA | 进 `/decision-case`，不因弱信号滥造多条 Decision | [ ] |
| 5 | 决策室准备度 | 可见状态句（非仅星）；无城市时为 `need_evidence` | [ ] |
| 6 | Challenge Layer | 默认风险摘要，非常委角色墙；可「查看来源」 | [ ] |
| 7 | 裁决 → 执行 | 可见 7/30/60/90 预览；执行后有行动/任务 | [ ] |
| 8 | 复盘 Learning | 写预测 vs 实际；Brain/Learning 有记录 | [ ] |
| 9 | 经营决策习惯 | UI 出现「经营决策习惯」；**无**「决策人格」 | [ ] |
| 10 | 负例：清城市 | 补档去掉城市 → 不宣称区域结论；无假百分比 | [ ] |

回归单测（合并前）：

```bash
cd apps/web && npx vitest run \
  tests/decision-experience-phase0-contracts.test.ts \
  tests/decision-candidate-promote.test.ts \
  tests/decision-center-daily-scan.test.ts \
  tests/die-challenge-layer.test.ts \
  tests/die-learning-habit.test.ts \
  tests/m-intel-anchor-gate.test.ts
```

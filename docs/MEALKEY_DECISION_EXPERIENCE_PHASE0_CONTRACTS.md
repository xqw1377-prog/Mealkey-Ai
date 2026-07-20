# Decision Experience Phase 0 — 数据契约交付

> **状态：Phase 0 完成**  
> **日期：** 2026-07-18  
> **约束（本阶段）：** 不新增 Prisma 表 · 不新建 Runtime · **不修改 AUTHORITY**  
> **产品真源：** `MEALKEY_DECISION_EXPERIENCE_V1.md`  
> **工程蓝图：** `MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md`

---

## 1. 文件位置（SSOT）

| 对象 | 文件 |
|------|------|
| **统一出口** | `apps/web/src/server/founder-layer/contracts/decision-experience-v1.ts` |
| BusinessIdentity · Readiness | `.../contracts/business-identity.ts` |
| RestaurantContext | `.../contracts/restaurant-decision-context.ts` |
| DecisionSignal | `.../contracts/decision-signal.ts` |
| DecisionCandidate | `.../contracts/decision-candidate.ts` |
| DecisionCase · Learning · Context | `.../contracts/decision-intelligence-data-contract.ts`（既有 DIE） |
| DecisionInbox | `.../contracts/decision-inbox.ts` |
| MKDecision | `.../contracts/mk-decision.ts`（既有） |

导入：

```ts
import type {
  BusinessIdentityV1,
  RestaurantDecisionContextV1,
  DecisionSignalV1,
  DecisionCandidateV1,
  DecisionCaseV1,
  DecisionReadinessV1,
  DecisionLearningV1,
} from "@/server/founder-layer/contracts/decision-experience-v1";
```

**不建** `apps/web/src/server/decision-intelligence/` 平行树——能力仍在  
`founder-layer/capability/decision-intelligence/`，契约在 `founder-layer/contracts/`。

---

## 2. 类型定义（要点）

### BusinessIdentityV1

- `scope` / `objectName` / `brandName` / `city`(+district/address)
- `decisionHorizon`: `short` | `mid` | `long`
- 落点：`project.profile.businessIdentity`（键名冻结于 `PROFILE_IDENTITY_KEY`）
- 文档大写枚举：`BusinessScopeTypeV1` + `toScopeType` / `fromScopeType`

### RestaurantDecisionContextV1

- Brain **只读投影**：facts / metrics / history / decisions / learnings / unknowns
- **不判断**

### DecisionSignalV1

- `source` · `type(RISK|OPPORTUNITY|CHANGE|UNKNOWN)` · `title` · `description`
- `importance` · `urgency` · `suggestedQuestion` · `relatedScope`
- ≠ Case

### DecisionCandidateV1

- `question` · `whyNow` · `promoteScore` · `readiness?` · `recommendedAction?`
- `caseId?` 仅升格后填写
- 阈值：`PROMOTE_SCORE_THRESHOLD = 55`

### DecisionReadinessV1

- `state`: `ready` | `need_evidence` | `need_context` | `high_uncertainty`
- `stateLabel` · `known[]` · `missing[]`（状态优先于分数）

### DecisionCaseV1 / DecisionLearningV1

- 沿用 DIE Data Contract；`id ≡ MKDecision.id ≡ Prisma Decision.id`

---

## 3. 与 MKDecision 映射

```text
DecisionCase.id  ════════════════════════════╗
MKDecision.id    ════════════════════════════╬══ Prisma Decision.id
outcome.mkStatus ← CASE_STATUS_TO_MK[case.status]
outcome.case / contextSnapshot / die / scores / trace / learning
```

| Case.status | mkStatus |
|-------------|----------|
| DISCOVERED | DRAFT |
| ANALYZING | ANALYSIS |
| DELIBERATING | COUNCIL_REVIEW |
| DECIDED | APPROVED |
| EXECUTING | EXECUTING |
| LEARNING | LEARNED |

**禁止：** Signal/Candidate 每日扫描批量 `createDecision`。  
**升格时：** Candidate → `openExpansionCase` / `createDecision` 才落库。

---

## 4. 黄金验证路径（仍锁定）

**「我要不要开第二家店？」** — 第一条用户闭环。  
Phase 1+ 只加深此路径，不扩题型。

---

## 5. 下一阶段实现计划（Phase 1→2）

| Phase | 目标 | 主要文件 | 验收 |
|-------|------|----------|------|
| **P1** | Identity Intake 含 Horizon 已基本有；补齐 profile 读写一致性 | onboarding · `saveBusinessIdentity` | Identity 可 round-trip |
| **P2** | **Signal Engine + Candidate promote** | `capability/decision-intelligence/signal-engine.ts` · `candidate-promote.ts` · daily-scan | 低分 Signal 不建 Decision；焦点来自 Candidate |
| **P3** | Room：Readiness State + Challenge 摘要 | DecisionIntelligenceRoom · readiness | 状态句可见；非常委角色秀 |
| **P4** | M-EXEC + Learning → 经营决策习惯 | service commit/learn | 90 天行动 + 复盘 |
| **P5** | M-INTEL 锚点门禁 | `capability/m-intel/*` | ✓ 无 city/brand 零区域假数 |

---

## 6. Phase 0 验收清单

- [x] 六核心对象 TS 可导入  
- [x] 无新 Prisma 表  
- [x] 无新 Runtime  
- [x] 未改 AUTHORITY（本阶段）  
- [x] MKDecision 映射表落地在 `decision-experience-v1.ts`  
- [x] P2：`signal-engine` + `candidate-promote` 已接线 daily-scan（不 createDecision）

---

**一句话：** Phase 0 只冻结「一次经营判断」所需对象与落点；下一刀用 Signal→Candidate 把第二条黄金路径串成不可滥造 Decision 的闭环。

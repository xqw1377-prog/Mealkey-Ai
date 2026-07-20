# MealKey Decision Intelligence 技术架构映射 V1（冻结）

> **状态：正式冻结（Freeze）— Schema 落点与接线清单**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上游契约：** `MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md`  
> **目的：** 回答 Schema 放哪、怎么接 Brain/Council/四席、Cursor **改哪些文件**；完成后即可工程实现「第二家店闭环」。

---

## 一、总览接线

```text
                    Decision Center UI
                    (Dashboard / Room)
                            │
                            ▼
              tRPC decisionIntelligence.*  （新建薄路由）
                            │
                            ▼
         founder-layer/capability/decision-intelligence/
              case · context · assessment · learning
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  Restaurant Brain     Council Runtime     createDecision
  (读 State/Memory)    (Challenge)         (Prisma Decision)
         │                  │                  │
         └──────────────────┴────────┬─────────┘
                                     ▼
                              outcome JSON
                           + Brain DecisionRecord
                                     │
                                     ▼
                         executionRuntime.createFromDecision
                                     │
                                     ▼
                              Validation → Learning
```

**禁止：** 新 Prisma `DecisionCase` 表；新 FounderAgentName；第七 Runtime。

---

## 二、Schema 放哪里？

| 契约对象 | 运行时形态 | 持久化 |
|----------|------------|--------|
| DecisionCase | DTO + `outcome.case` | Prisma `Decision` 行（id 共用） |
| DecisionContext | 内存/缓存组装；可选 `outcome.contextSnapshot` | 瘦身 JSON，非第二主库 |
| Evidence | Context 内数组；可溯 Brain/M-INTEL | Brain Fact / Event id 引用 |
| Option / Simulation | `outcome.die.options` / `simulations` | outcome JSON |
| Assessment | `outcome.scores.pre|post` | outcome JSON |
| Learning | `DecisionLearningV1` → Brain | `LearningRecord` + outcome 指针 |
| Trace | `outcome.die.trace` | outcome JSON |
| Signal | 投影进 DailyScan；可选短暂存储 | 优先由 Risk/Opportunity/State 派生 |

**代码 SSOT：**  
`apps/web/src/server/founder-layer/contracts/decision-intelligence-data-contract.ts`

---

## 三、与 Restaurant Brain 连接

| 方向 | 动作 | 锚点文件 |
|------|------|----------|
| Brain → Context | `ensureByProject` / AgentRestaurantContext → State · facts · historical | `restaurant-brain/service.ts` · `prisma-service.ts` |
| Case 落库后 | `linkDecisionToRestaurantBrain` | `agent-os.service.ts` → `linkDecisionToRestaurantBrain` |
| Learning → Brain | `learn` / LearningRecord 写入 | `restaurant-brain` Service Layer |
| Unknowns | 由 State 完整度 + 议题槽位 Gap 生成 | `buildDecisionContext`（新建） |

**铁律：** Brain **提供记忆，不写终局结论**；终局在 Case + 老板裁决。

---

## 四、与 Founder Council（七常委）连接

| 步骤 | 动作 | 锚点 |
|------|------|------|
| Context 就绪 | 填 `councilInput` | `CouncilDecisionInputV1` |
| DELIBERATING | `decisionCouncil.open` / advance / board | `routers/decision-council.ts` · DecisionRoom |
| Challenge 回写 | opinions → Context.expertOpinions；更新 Assessment.councilAgreement | mapper（新建） |
| 老板裁决 | `founderDecide` + 写 Trace | 现有 founderDecide |

**UI：** 辩论墙（非群聊）— `DecisionCenter` Interaction；实现升格 `DecisionRoom.tsx` 五区壳。

---

## 五、与 M-PNT / M-MKT / M-BIZ / M-ED 连接

| 规则 | 说明 |
|------|------|
| 四席不直写 Case.conclusion | 经 **MKInsight Adapter** → Evidence 或 Opinion |
| 扩店 V1 | 可拉 M-BIZ（模型/财务）· M-ED（组织）Insight 作 Evidence |
| 定位类 | 非本闭环主路径；扩店不强制跑完整 M-PNT 六步 |
| 锚点 | `packages/agents` mk-insight · `founder-os` · 各 `m-*.service.ts` 的 Insight 出口 |

---

## 六、与 M-EXEC / Decision Center 连接

| From | To | 锚点 |
|------|----|------|
| DECIDED + Package | `executionRuntime.createFromDecision` | `capability/execution` · tRPC executionRuntime |
| Journey | Validation Task / 今日行动 | `dashboard.toggleTodayAction` · validation OS |
| 首页 Feed | `toDailyScanV1` + Case/Signal 投影 | `capability/decision-center/daily-scan.ts` |
| 主 CTA | 进决策室（扩店 Case） | `DecisionCenterMorning.tsx` |

---

## 七、目录与新建文件（Cursor 清单）

### 7.1 新建（建议）

```text
apps/web/src/server/founder-layer/capability/decision-intelligence/
  index.ts
  case-factory.ts          # 扩店 Case：fromSignal / fromFounderAsk
  context-builder.ts       # Brain + Evidence → DecisionContextV1
  assessment.ts            # Pre/Post Assessment 纯函数
  options-expansion.ts     # 第二家店默认 A/B/C + Simulation 骨架
  trace.ts                 # DecisionTrace 组装
  learning.ts              # Post → DecisionLearning → Brain
  mk-status-map.ts         # Case.status ↔ mkStatus

apps/web/src/server/routers/decision-intelligence.ts
  # getContext / openExpansionCase / assess / attachLearning（薄）

apps/web/tests/
  die-context-builder.test.ts
  die-assessment.test.ts
  die-expansion-case.test.ts
```

### 7.2 修改（现有）

| 文件 | 改动 |
|------|------|
| `contracts/decision-intelligence-data-contract.ts` | 已 SSOT；随契约字段对齐 |
| `capability/decision-center/daily-scan.ts` | Feed 可挂 expansion Case href |
| `capability/decision-center/evidence-weight.ts` | 已有；Context builder 复用 |
| `routers/dashboard.ts` | 可选附带 openCases 摘要 |
| `server/index.ts` | 挂 `decisionIntelligence` router |
| `components/operating/DecisionCenterMorning.tsx` | CTA → 扩店 Case / Room |
| `components/operating/meeting/DecisionRoom.tsx` | 五区：事实/认知/辩论/路径/裁决 |
| `services/agent-os.service.ts` | createDecision 后写 `outcome.case` |
| `restaurant-brain/service.ts` | Learning 写入钩子（learning.ts 调） |

### 7.3 明确不改

- 不新增 Prisma model  
- 不注册第五 `FounderAgentName`  
- 不新建平行 `/decision-os` 路由树（Room 升格即可）

---

## 八、第二家店闭环 — 调用顺序（实现验收）

```text
1. trpc.decisionIntelligence.openExpansionCase({ projectId })
     → case-factory + createDecision(DRAFT) + outcome.case

2. context-builder(projectId, caseId)
     → Brain State + gaps/unknowns + evidences

3. （若 openGaps）停答先采 ≤3 → 写 Brain → rebuild context

4. options-expansion → 3 options + simulations → outcome.die

5. assessment(pre) → outcome.scores.pre

6. UI：进入 Decision Room / decision-room?caseId=
     → council challenge（现有）→ 更新 opinions + assessment

7. founderDecide / 裁决三按钮
     → status DECIDED + Trace + Package
     → createFromDecision

8. Validation 完成后
     → assessment(post) + learning.ts → Brain LearningRecord
```

**手测句：** 老板问「要不要开第二家」→ 可见 unknowns → 三方案路径 → 常委冲突 → 裁决 → 行动出现 → 复盘可打开 Trace。

---

## 九、工程切片（与 Data Contract 对齐）

| 切片 | 交付 | 主要文件 |
|------|------|----------|
| **T0** | Tech Map + 契约字段对齐 | 本文 · data-contract.ts |
| **T1** | case-factory + mk-status-map + 单测 | case-factory.ts |
| **T2** | context-builder + unknowns/gaps | context-builder.ts |
| **T3** | options-expansion + assessment(pre) | options · assessment |
| **T4** | tRPC + Room 五区最小壳 | router · DecisionRoom |
| **T5** | Package → M-EXEC + learning 钩子 | learning.ts · execution |

---

## 十、成功标准（技术）

1. 扩店 Case 的 `id` 与 Prisma `Decision.id` 一致。  
2. Context 含 `unknowns` 且无 POS 时不编硬数。  
3. Options ≥ 2 且各有 Simulation 骨架。  
4. Assessment.pre 可解释因子。  
5. 裁决后 outcome 含 trace；Brain 有 DecisionRecord。  
6. 零新 Prisma Decision 表。  

---

**落地状态（2026-07-18）：** T0–T5 已实现 — `decisionIntelligence` tRPC、`/projects/[id]/decision-case` 五层室、Package→`createExecutionFromDecision`、Learning→Brain。手测：打开决策室 → 裁决 → 执行 → 复盘。

**一句话：**  
Tech Map 规定 —— **契约在 contracts，编排在 capability/decision-intelligence，持久靠 Decision.outcome + Brain，冲突靠 Council，执行靠 M-EXEC**。

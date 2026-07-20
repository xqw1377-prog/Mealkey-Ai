# Founder OS 七常委运行规则 V1.0

> **制度 + 流程 + 记忆 + 进化** = 真正壁垒  
> 宪法：`FOUNDER_OS_DECISION_COUNCIL_CONSTITUTION_V1.md`  
> 配置：`founder-os/operating-rules/`  
> 运行时：`@mealkey/agents` → `founder-os`（`cdo` / `dualTrack` / `decisionMemory`）

七常委若只有 Prompt，只是七个会说话的模型。本文件把 FDC 变成可运行的治理组织。

---

## 1. CDO（决策秘书长）

- **是**：流程官、材料官、门禁官  
- **不是**：常委、不投票、不表达经营立场  

职责：议题分级 → 选人 → 控五阶段 → 禁止闲聊 → 落 Memory。

API：`classifyIssueLevel` · `selectCouncilRoster` · `buildAgendaBrief` · `advanceMeetingStage`

---

## 2. 议题分级与花名册

| Level | 常委会 | 默认常委 |
|---|---|---|
| L1 | 不开 | —（仅引擎） |
| L2 | 开 | CSO, BMO, CFO, COO（可按类型微调） |
| L3 | 开 | 七席全员 |
| L4 | 开 | 七席全员 + Founder 必裁决 |

触发常委会：≥ L2，或 Founder 强制，或引擎标红。  
不触发：纯问答；验证期内重复议题（复用 Memory）。

---

## 3. 五阶段标准流程

| Stage | 名称 | 产出 |
|---|---|---|
| 1 | 议题定义 | Agenda Brief |
| 2 | 专业输入 | Expert Reports |
| 3 | 常委审议 | 五段意见（盲评） |
| 4 | 交叉质询 | challenges / responses |
| 5 | 形成决议 | Decision Resolution → 待 Founder |

常委五段结构（禁止空话）：

```text
我的判断 / 支持理由 / 反对理由 / 最大风险 / 建议方案
```

---

## 4. 双轨表决

**轨道 A — 观点投票（一人一票）**  
计 `support` / `oppose` / `conditional` 人数；多数形成「普通意见」。

**轨道 B — Red Flag（专业否决）**  
CFO / CRO / COO（授权时）有效红线 → **不得直接通过**，进入暂缓或二次论证，且须附替代方案。

展示层仍可输出 `weighted_result`（按 decisionType 权重）作参考，**不替代**一人一票多数与红线门闩。

---

## 5. Founder Override

最终链：委员会建议 → Founder 判断 → 最终决策。  
Override 必填：不同意原因、核心判断、承担风险、验证方式。

---

## 6. Decision Memory

单位：`Decision Memory`（含 Brief 快照 + 结果回写槽）。  
必存：选择、依据、反对、决议、Override、验证计划、事后偏差。  
形成 Decision Intelligence Database。

---

## 7. 学习进化

验证后写：`outcomeStatus` · `whoWasRight` · `lesson`。  
用于：分级阈值、红线灵敏度、Override 成功域。

---

下一步（规格预告）：交叉质询挑战包自动生成（按 V2 提问清单互怼）· ExpertReport 适配器接四席咨询室。

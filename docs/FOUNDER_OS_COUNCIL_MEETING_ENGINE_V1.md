# Founder OS 决策委员会会议引擎 V1.0

> 让七常委真正「开会」，而不是七个 AI 分别回答  
> 代码：`meeting-engine.ts` · `issue-classifier.ts`  
> 前置：FDC 宪法 · Persona V2.0 · Expert × Council

---

## 0. 反模式

```text
A 分析 → B 分析 → C 分析 → 总结   ❌ 报告拼接
```

正模式：

```text
议题定义 → 专业调查 → 观点碰撞 → 风险暴露 → 权衡取舍 → 决策 → 验证
```

---

## 1. 总架构

```text
创始人问题 → Decision Secretary(CDO)
  → Issue Classification
  → Expert Engines (M-PNT/MKT/BIZ/ED) → Evidence Layer
  → 七常委三轮会议
  → Decision Resolution / Decision Board
  → Founder 裁决
  → Validation OS → Memory Learning
```

---

## 2. 议题识别

`classifyDecisionIssue(question)` → `DecisionIssue`

| 字段 | 含义 |
|---|---|
| type | STRATEGY/MARKET/BRAND/BUSINESS/CAPITAL/OPERATION/RISK |
| importance | L1–L4 |
| relatedAgents | 调用哪些 Expert Engines |
| suggestedRoster | 召集哪些常委 |

例：「我要不要加盟？」→ STRATEGY · L3 · engines=[M-BIZ,M-ED,M-PNT]

---

## 3. 召集规则

| 级别 | 常委数 | 例 |
|---|---|---|
| L1 | 1–2 | 菜单价格 → 市场+商业 |
| L2 | 3–5 | 开第二家店 / 新品线 |
| L3 | 7 | 新城市 / 加盟 |
| L4 | 7 + Founder | 融资 / 卖公司 |

---

## 4. 三轮机制

| Round | 规则 | 产出 |
|---|---|---|
| 1 专业陈述 | **禁止互看**，独立判断 | Stance Matrix |
| 2 委员会质询 | 必须引用 Evidence ID | Conflict Map |
| 3 决策形成 | 非简单多数；双轨+红线 | Decision Board + Minority Report |

---

## 5. Decision Board（创始人看到的）

- 决策事项 / 共识 / 最大争议 / 少数意见  
- 推荐动作 / 条件 / 风险 / 验证任务  
- 三选一：接受委员会 · 修改方案 · 推翻委员会  

---

## 6. 少数意见与学习

反对票与红线**不可删除**，写入 Minority Report 与 Decision Memory。  
验证后可对照「谁提前发现」→ `calibrationHints` 进入专家校准。

---

## API

```text
conveneCouncilMeeting
prepareRound1 → submitRound1Opinions
prepareRound2 → resolveConflicts?
closeCouncilMeeting
runCouncilMeetingSync
buildStanceMatrix / buildConflictMap / buildDecisionBoard
```

下一层建议：《七常委知识库体系》（方法论 / 案例 / 失败库）。

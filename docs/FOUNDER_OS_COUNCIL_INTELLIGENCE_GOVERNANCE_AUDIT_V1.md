# Council Intelligence 架构治理审计 V1（S5）

> **日期：2026-07-18**  
> **对应：** `FOUNDER_OS_COUNCIL_INTELLIGENCE_4PLUS1_V1.md` Sprint 5  
> **状态：** 工程闸门已落地；本文件为审计清单与通过标准

---

## 1. 统一输出协议

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| `MKInsight` 合同存在 | ✅ | `packages/agents/src/founder-os/mk-insight.ts` |
| 四引擎 Adapter 产出 Insight | ✅ | `m-{pnt,mkt,biz,ed}/consulting/mk-insight-adapter.ts` |
| Council 开会挂载 Insights | ✅ | `loadProjectExpertReports` → `openDecisionRoom({ insights })` |
| ExpertReport 仅为投影 | ✅ | `insightsToExpertReport` / `expertReportToInsights` |

---

## 2. Evidence Layer

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| Insight 无证据则校验失败 | ✅ | `validateMkInsight` |
| Insight → EvidencePacket | ✅ | `mergeEvidencePacket` |
| 闸门拒绝空 Insight 直进 | ✅ | `assertCouncilIngressViaMkInsight` |

---

## 3. Decision Trace

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| Trace 对象定义 | ✅ | `DecisionTrace` |
| Founder 裁决后写入 session | ✅ | `founderCloseDecisionRoom` → `decisionTrace` |
| Trace 写入 Memory | ✅ | `persistCouncilMemory` 含 `decisionTrace` / `insightSummary` |
| 开会强制 Adapter 闸门 | ✅ | `decisionCouncil.open` → `assertCouncilIngressViaMkInsight`（stub 须显式勾选） |
| Prompt 优先 Insight | ✅ | `buildCouncilRuntimePrompt({ insights })` |
| Decision Room 展示 Insight/Trace | ✅ | `DecisionRoom.tsx` |
| 行动档案展示 Trace | ✅ | `CouncilTracePanel` · `decisions/page.tsx` |
| 能力页决策室入口 | ✅ | `capability/page.tsx` → `/decision-room` |

---

## 4. 防膨胀闸门

未来垂直 Agent（选址 / 菜单 / 营销 / 招聘）：

```text
New Agent → MKInsight Adapter → Council Review
```

禁止：私有 Report 形状直进 `CouncilMeetingSession.expertReports` 而不经 Adapter。

运行时入口：`assertCouncilIngressViaMkInsight`（产品开会路径应保证 `loaded.insights` 来自 Adapter）。

---

## 5. 测试

| 套件 | 路径 |
| --- | --- |
| Contract + Adapters | `apps/web/tests/mk-insight-contract.test.ts` |

通过标准：`validateMkInsight` / M-MKT·BIZ·ED Adapter / 桥接 / 决策室挂载 Insight 用例全绿。

---

## 6. 明确未做（不在本 Sprint）

- 垂直 Tool Agent 批量接入（属 L3，另开）
- Decision Room 前端可视化 Insight 列表（Phase 4 产品化）
- 把 Protocol V1 全文从 ExpertReport 改写为 MKInsight（兼容桥已足够；文档大改后置）

---

## 变更

| 日期 | 说明 |
| --- | --- |
| 2026-07-18 | S1–S5 工程落地后的首次治理审计 |

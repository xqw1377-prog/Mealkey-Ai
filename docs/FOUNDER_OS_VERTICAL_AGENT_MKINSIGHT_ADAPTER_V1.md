# 垂直 Agent → MKInsight Adapter V1

> **日期：2026-07-18**  
> **冻结：** 新垂直能力不得直进七常委。

## 规则

```text
New Agent → MKInsight Adapter → Council Review → MKDecision
```

真源：`packages/agents/src/founder-os/vertical-mk-insight-adapter.ts`

## 接入步骤

1. 实现 `VerticalInsightSource`（agentId / kind / findings + evidence）
2. 调用 `toVerticalMkInsights` 或 `assertVerticalCouncilIngress`
3. 将 Insight 并入 `openDecisionRoom({ insights })` / EvidencePacket
4. **禁止**把垂直 Agent 的私有 JSON 直接塞进 `expertReports`

## 样例

- 选址：`exampleSiteSelectionInsights`
- 菜单 / 营销 / 招聘：复用同一 Adapter，改 `kind` 与 `domain`

## 与四大核心 Agent

四大（M-PNT/M-MKT/M-BIZ/M-ED）使用专用 Intelligence Provider；  
垂直 Agent 一律走本 Adapter，属 L3 Tool Agent 层。

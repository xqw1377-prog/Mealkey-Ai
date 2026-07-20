# M-EXEC Execution Runtime V2（已落地规范）

> **日期：** 2026-07-17  
> **状态：** 代码已按本规范增强；**不是**第五专业 Agent  
> **权威：** 挂载于 `docs/AUTHORITY.md` L2 执行运行时

## 一句话

M-EXEC = Founder OS Execution Runtime：决策 → 行动 → 验证 → 偏航建议复会 → 反馈。不拥有专业判断权。

## 落点（真相源）

```
apps/web/src/server/founder-layer/
  contracts/execution-runtime.ts
  capability/execution/
    agent.ts                 # 加深动作质量
    action-lifecycle.ts      # 状态机
    monitor.ts               # 偏航检测
    feedback.ts              # 结果→复会建议
    decision-execution-view.ts
apps/web/src/server/routers/execution-runtime.ts
```

复用：`validationOs.*` · `dashboard.toggleTodayAction` · `profile.lastActionPlan` / `validationTasks` / `suggestedNextMeeting`

## 禁止

- FounderAgentName / forceAgent = M-EXEC  
- agents/m-exec Python  
- 新建 Prisma 执行主表（V2）  
- DevOps / deploy 语义  

## API

- `executionRuntime.getDecisionExecution`
- `executionRuntime.runDeviationCheck`
- `executionRuntime.listDeviations`

## 测试

`apps/web/tests/execution-runtime.test.ts` + `boss-north-star.journey.test.ts`

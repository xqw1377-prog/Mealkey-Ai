# Founder OS Agent Gateway 与四 Agent 接入规范 V1

> 日期：2026-07-14  
> 原则：**不动内核，只经 Gateway 调用**  
> 配套：`FOUNDER_OS_MVP_TECH_BREAKDOWN_V1.md`

---

## 0. 一句话

四个 Agent 继续是「专业部门引擎」。  
Founder Layer 只负责：**组会、提问、收意见、结构化决策、写记忆**。

```text
Meeting Engine
    → Agent Gateway.execute(agentId, mission, context)
        → M-PNT | M-MKT | M-BIZ | M-ED
    ← ExpertOpinion (统一合同)
    → Decision Engine
```

---

## 一、统一身份映射（前后台）

| 前台顾问席（用户可见） | agentId（Gateway） | forceAgent / 现有入口 |
|------------------------|--------------------|------------------------|
| 品牌顾问 | `M-PNT` | `m-pnt` → `streamAgentResponse` |
| 市场顾问 | `M-MKT` | `m-mkt` → `streamAgentResponse` |
| 商业顾问 | `M-BIZ` | `m-biz` → 现阶段 `agent.bizChat`；目标并入 stream |
| 组织顾问 | `M-ED` | `m-ed` → `streamAgentResponse` |
| 主持人 / 综合 | `CHIEF` | `chief` |

**硬规则：** SSE / UI 文案禁止出现 `M-PNT` 等产品名；仅 Gateway 日志与 `AgentRun.agentId` 可用内部码。

---

## 二、Decision / Opinion Contract（冻结）

### ExpertOpinion（单席输出）

```ts
type ExpertOpinion = {
  opinionId: string;
  meetingId: string;
  agentId: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED" | "CHIEF";
  seatLabel: string; // 品牌顾问…
  stance: "support" | "oppose" | "conditional" | "neutral";
  claim: string; // ≤80 字主张
  reasons: string[]; // 1–3 条
  risks: string[];
  confidence: number; // 0–1
  rawRef?: {
    // 可选：指向内核快照，不进前台
    snapshotType?: "positioning" | "market" | "business" | "equity";
    conversationId?: string;
    agentRunId?: string;
  };
  createdAt: string; // ISO
};
```

### MeetingMission（会中任务）

```ts
type MeetingMission = {
  missionId: string;
  companyId: string; // = projectId
  question: string; // 用户原话
  goal: string; // 战略任务标题
  topic: string; // 会议议题
  requiredAgents: Array<"M-PNT" | "M-MKT" | "M-BIZ" | "M-ED">;
  companyContext: CompanyContext;
};
```

### CompanyContext（最小集）

```ts
type CompanyContext = {
  brandName: string;
  industry: string;
  storeCount?: string;
  city?: string;
  stageLabel?: string;
  currentChallenge?: string;
  yearlyGoal?: string;
  strategicSummary?: string;
};
```

### DecisionCard（会后输出）

```ts
type DecisionCardContract = {
  problem: string;
  judgement: string;
  reasons: string[];
  validationPlan: string; // 如「90天直营复制」
  status: "validating" | "validated" | "adjusted" | "revisiting";
  opinions: ExpertOpinion[]; // 引用摘要即可
};
```

内核原有 `PositioningSnapshot` / `MarketSnapshot` 等**不替代**本合同；Gateway 负责从快照 **投影** 成 `ExpertOpinion`。

---

## 三、Gateway API

### 签名

```ts
async function executeAgent(input: {
  agentId: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED" | "CHIEF";
  mission: MeetingMission;
  context: CompanyContext;
  mode?: "sync" | "stream";
  userId: string;
}): Promise<ExpertOpinion>;

async function* executeAgentStream(...): AsyncGenerator<GatewayEvent>;
```

### GatewayEvent（会议实时）

对齐产品侧事件，但前台只展示 `seatLabel`：

```ts
type GatewayEvent =
  | { type: "EXPERT_THINKING"; seatLabel: string; agentId: string; content?: string }
  | { type: "EXPERT_OPINION"; opinion: ExpertOpinion }
  | { type: "EXPERT_ERROR"; seatLabel: string; message: string; degraded: true }
  | { type: "DONE"; agentId: string };
```

MVP 传输：复用 `POST /api/agent/stream`（SSE）。  
P2：`WS /ws/meeting/{id}` 广播上述事件。

---

## 四、四 Agent 接入方式（不改内核）

### 1. M-PNT（品牌）

| 项 | 规范 |
|----|------|
| 调用 | `forceAgent: "m-pnt"` → 现有 `runMPnt` / stream |
| 提问模板 | 「基于企业上下文，判断品牌是否支持规模化复制。输出：主张、理由、风险。」 |
| 投影 | 从 `positioning_result` / 文本：`oneLiner`→claim；`risks`→risks；策略态度→stance |
| 降级 | 无 Key / 超时 → 启发式品牌席意见 + `degraded: true` |

### 2. M-MKT（市场）

| 项 | 规范 |
|----|------|
| 调用 | `forceAgent: "m-mkt"` |
| 提问模板 | 「判断该品类/城市扩张窗口：机会等级、竞争风险、是否值得做。」 |
| 投影 | `market_result.finalDecision` / scores → claim + stance |
| 降级 | 启发式市场席 |

### 3. M-BIZ（商业）

| 项 | 规范 |
|----|------|
| 现状 | `trpc.agent.bizChat` / `mbizChat`（独立工作台） |
| MVP Gateway | 封装 `executeMBizViaChat(mission)` → 投影为 ExpertOpinion |
| 目标 | `streamAgentResponse` 支持 `forceAgent: "m-biz"`（**只加路由，不改 M-BIZ 服务内核**） |
| 提问模板 | 「单店模型是否成立？加盟模型是否验证？扩张的财务风险？」 |

### 4. M-ED（组织/股权）

| 项 | 规范 |
|----|------|
| 调用 | `forceAgent: "m-ed"` |
| 提问模板 | 「当前组织/股权结构能否支撑 N 店？最大治理风险？」 |
| 投影 | `equity_result` health / finalDecision → Opinion |
| 降级 | 启发式组织席 |

---

## 五、会议并行调用策略

扩张评估默认四席：

```text
PREPARING
  → Promise.allSettled([M-MKT, M-PNT, M-BIZ, M-ED])  // ANALYZING
  → Conflict Engine（观点碰撞）                       // DEBATING
  → Decision Engine 结构化 + 用户 A/B/C               // SYNTHESIS → DECISION
```

规则：

1. **单席失败不整会失败** → `EXPERT_ERROR` + 启发式补席  
2. **超时**（建议 45s/席）→ 降级  
3. **冲突**由 Meeting Engine 生成，不要求内核互相调用  
4. 内核之间已有 handoff 字段可保留，但 **Founder 会议不依赖跨 Agent 强制流水线**

---

## 六、与现有代码的落地清单

| 步骤 | 动作 | 文件建议 |
|------|------|----------|
| 1 | 新增类型合同 | `apps/web/src/server/founder/contracts.ts` |
| 2 | 实现 Gateway | `apps/web/src/server/founder/agent-gateway.ts` |
| 3 | 快照→Opinion 投影 | `apps/web/src/server/founder/projections/*.ts` |
| 4 | Meeting 启动编排 | `apps/web/src/server/founder/meeting-engine.ts` |
| 5 | tRPC 薄封装 | `founder.startMeeting` / `founder.getBrief` |
| 6 | 前端 MeetingRoom | 优先消费 Opinion；无则继续启发式 |

**禁止：** 修改 `m-pnt.service` / `m-mkt.service` / `m-ed.service` / `m-biz-client` 的判断内核逻辑来「迁就」会议。只允许 Gateway 增加调用参数与投影。

---

## 七、验收标准（扩张场景）

- [ ] 用户从 Mission「做到 30/100 家」进入会议  
- [ ] 四顾问席出现，无 M-XX 字样  
- [ ] Gateway 至少成功拉起 M-MKT + M-PNT + M-ED；M-BIZ 可用 chat 降级路径  
- [ ] 生成 DecisionCard 并写入 `Decision`  
- [ ] 验证回填写入 `Memory`  
- [ ] 任一 Agent 失败，会议仍能完成（降级席位）

---

## 八、下一步实现顺序

1. 落 `contracts.ts` + `agent-gateway.ts`（包装现有 stream/bizChat）  
2. `founder.startMeeting`：创建四席 → 返回 opinions[]  
3. MeetingRoom：用 opinions 覆盖/补充 Round1  
4. 再考虑 Meeting 表持久化与 WS  

完成后：体验合并在 Founder Layer，四个 Agent 仍是独立专业引擎。

# Founder OS MVP 技术拆解 V1

> 日期：2026-07-14  
> 把「AI 咨询团队体验」映射到真实工程  
> 原则：**不动 M-PNT / M-MKT / M-BIZ / M-ED 内核，只新增 Founder Layer**  
> 配套：`FOUNDER_OS_USER_JOURNEY_V1.md` · `FOUNDER_OS_AGENT_GATEWAY_CONTRACT_V1.md`

---

## 0. 产品定位（冻结）

不是：AI 商业分析工具 / 4 个 Agent 集合。

而是：

# Founder OS  
## 每个创业者身边的 AI 咨询委员会

MVP 只证明一件事：

> AI 咨询团队是否成立 —— 用户是否觉得「它帮我做了一个重要决定」。

---

## 一、MVP 技术目标

只验证一个闭环：

```text
用户提出企业问题
  → AI 理解企业
  → 生成战略任务 (Mission)
  → 召集专业 Agent
  → 形成会议
  → 生成决策
  → 保存企业记忆
  → 下一次更懂用户
```

### 明确不做

| 不做 | 原因 |
|------|------|
| 全自动企业管理 | 过早 |
| 全行业覆盖 | 过早 |
| 完整商业数据库 | 过早 |
| 自建知识库 / 复杂 RAG | 不是核心风险 |
| Agent 训练平台 | 内核已有 |
| 多租户商业化 / 数据大屏 / CRM | 范围膨胀 |

核心风险是体验，不是技术栈。

---

## 二、系统整体结构

```text
frontend (6 页)
    │
Founder OS API  (tRPC + /api/agent/stream)
    │
Founder Layer   ← 只新增这一层
├── Company Service
├── Context Engine
├── Mission Engine
├── Meeting Engine
├── Decision Engine
├── Memory Engine
└── Agent Gateway
        │
   ┌────┼────┬────┐
M-PNT M-MKT M-BIZ M-ED   ← 内核不动，只被 Gateway 调用
```

### 与现有仓库映射

| 概念层 | 现有实现（复用） | Founder Layer 增量 |
|--------|------------------|-------------------|
| Company | `Project` + `Owner` + `profile` JSON | Company Context 规范化读写 |
| Context | onboarding 访谈 + `profile` | 抽取规则 / stageLabel |
| Mission | `lib/mission.ts` + `/mission` 页 | 可选落库 `Mission` 表（已有但用途不同） |
| Meeting | `lib/meeting*.ts` + `MeetingRoom` | MeetingSession 持久化（P2） |
| Decision | `Decision` + `confirmFromMeeting` | 验证回填已接 |
| Memory | `Memory` + feedback | insight 聚合接口 |
| Agent Gateway | `agent.service.ts` `forceAgent` | **统一 Contract + 会议并行调用** |

---

## 三、前端 6 页冻结

底栏可仍用五页导航；认知页 = Memory。部门看板为深入层，非 MVP 首页入口。

| # | 页面 | 路由（现有） | 职责 | 理想 API |
|---|------|--------------|------|----------|
| 1 | Home | `/dashboard` | AI 怎么看你的企业 | `GET company/{id}/brief` ≈ `dashboard.getHome` |
| 2 | Company | `/projects/[id]` | AI 理解（非资料表） | `GET company/{id}/profile` |
| 3 | Mission | `/projects/[id]/mission` | 问题 → 战略任务 | `POST mission/create` |
| 4 | Meeting | `/projects/[id]/advisor` | 会议桌，非 Chat | `POST meeting/start` + 流式 |
| 5 | Decision | `/projects/[id]/decisions` | 决策卡 | `GET decision/{id}` + list/feedback |
| 6 | Memory | `/profile` | AI 越来越懂我 | `GET memory/insight/{companyId}` ≈ `getOwnerPortrait` |

### Page 1 Home 结构

```
今日企业判断 · 湘宴
当前阶段：复制增长期
AI关注：品牌复制能力
今日建议：召开扩张评估会议
[开始会议]
```

### Page 4 Meeting（核心）

```
议题：是否启动100店扩张？
专家席：市场 / 品牌 / 商业 / 组织
进度：诊断 → 讨论 → 共识 → 决策
```

前台永不展示 M-XX；事件流里 `agent` 字段仅服务端 / 调试用。

### 实时通道

MVP：**SSE**（已有 `POST /api/agent/stream`）代替 WebSocket。  
P2 再升 `WS /ws/meeting/{id}`；事件类型对齐 Gateway Contract。

---

## 四、后端 Founder Layer 模块

### 1. Company Service

企业主体 = 现有 `Project`（不改名强制迁移）。

| 文档字段 | Prisma |
|----------|--------|
| company.id | Project.id |
| name | Project.name / profile.brandName |
| industry | Project.category / profile.businessType |
| stage | Project.stage / profile.stageLabel |
| owner_id | Project.ownerId |

### 2. Context Engine

碎片 → 结构。入口：`completeOnboarding` + 访谈理解（`lib/onboarding-interview.ts`）。

输出 `CompanyContext`（写入 `Project.profile`）：

```ts
{
  brandName, businessType, storeCount,
  city?, goal, stageLabel,
  currentChallenge, yearlyGoal,
  strategicSummary, growthPlan?
}
```

### 3. Mission Engine

`understandMissionGoal()`（`lib/mission.ts`）已实现前端版。

目标形态：

```ts
createMission(userInput, companyContext) → {
  id, companyId, question, goal, status,
  requiredDepartments: ["market","brand","business","org"]
}
```

### 4. Agent Gateway（最关键）

统一调用，**不改四个内核**。详见：

→ `FOUNDER_OS_AGENT_GATEWAY_CONTRACT_V1.md`

```ts
executeAgent({ agentId, mission, context }) → ExpertOpinion
```

内部路由到现有：

| agentId | 现有入口 |
|---------|----------|
| M-PNT / m-pnt | `streamAgentResponse` + forceAgent |
| M-MKT / m-mkt | 同上 |
| M-ED / m-ed | 同上 |
| M-BIZ / m-biz | `agent.bizChat` / mbiz client（stream 尚未 force） |

### 5. Meeting Engine 状态机

```text
CREATED → PREPARING → ANALYZING → DEBATING → SYNTHESIS → DECISION → DONE
```

对齐前端 `MeetingLifecycle`：PREPARE → OPEN → DISCUSS → DEBATE → SYNTHESIS → USER_CONFIRM → DECISION → VALIDATE → MEMORY_UPDATE。

流程：召集 → 并行分析 → 观点碰撞 → 综合 → 用户确认。

### 6. Decision Engine

不替专家决策；负责**结构化**四个意见 → Decision Card。

已有：`decisionArchive.confirmFromMeeting` + 启发式 `buildConsensusDraft`。

---

## 五、第一次联调场景（冻结）

**餐饮连锁扩张评估**（3 店 → 30/100 店）

| 顾问席 | Agent | 问题 |
|--------|-------|------|
| 市场 | M-MKT | 市场机会是否存在？ |
| 品牌 | M-PNT | 品牌是否可复制？ |
| 商业 | M-BIZ | 单店/加盟模型是否成立？ |
| 组织 | M-ED | 组织能否承载？ |

期望输出：暂缓全面加盟 / 直营复制验证 + 90 天计划。

联调顺序：

1. 启发式会议可完整演示（已具备）  
2. Gateway 按席位 `forceAgent` 并行/串行补意见  
3. 结构化 ExpertOpinion 覆盖启发式  
4. M-BIZ 进入 stream force 路由  

---

## 六、数据表

### 现有可复用

| 需要 | 现有表 | 说明 |
|------|--------|------|
| company | Project | profile 承载 Context |
| decision | Decision | type=meeting |
| memory | Memory | feedback / LEARNING |
| mission（Agent 间） | Mission | 现为 Agent→Agent；Founder Mission 可另字段或新表 |
| 对话 | Conversation / Message | 会议附属 |

### MVP 建议新增（P2，可延后）

```text
FounderMeeting     — 会议会话持久化
ExpertOpinion      — 单席位结构化意见
```

关系目标：

```text
Company(Project) → Mission → Meeting → ExpertOpinion → Decision → Memory
```

第一周：**不强制建新表**；Meeting + Opinion 可先落 Conversation.metadata / Decision.evidence。

---

## 七、工程优先级（对齐 90 天）

### 第 1 阶段（2 周）— 现在

- [x] 旅程 + 六页骨架  
- [x] 访谈建企 / Mission / MeetingRoom / 决策卡 / 验证回填  
- [ ] Founder API 收口命名（brief / profile / insight）  
- [ ] Agent Gateway + Decision Contract  
- [ ] 四 Agent 可被 Gateway 稳定调用（含 m-biz）

### 第 2 阶段（3–4 周）

- Meeting Engine 服务端化 + SSE 事件协议  
- 会议室体验打磨（可选 WS）

### 第 3 阶段（4 周）

- Decision Memory 洞察页  
- 「越来越懂」可感知

### 第 4 阶段

- 真实用户验证（扩张场景）

---

## 八、代码落点速查

| 能力 | 路径 |
|------|------|
| Home | `DashboardPage.tsx` · `dashboard.getHome` |
| Company | `projects/[id]/page.tsx` |
| Mission | `mission/page.tsx` · `lib/mission.ts` |
| Meeting | `advisor/page.tsx` · `MeetingRoom.tsx` · `lib/meeting*.ts` |
| Decision | `decisions/page.tsx` · `decision-archive.ts` |
| Memory | `profile/page.tsx` · `getOwnerPortrait` |
| Stream 网关雏形 | `server/services/agent.service.ts` |
| 部门深入（非 MVP 主路径） | `positioning|market|business|equity/page.tsx` |

---

## 九、下一步

→ **`FOUNDER_OS_AGENT_GATEWAY_CONTRACT_V1.md`**

直接解决：

- 四 Agent 如何接入且不改内核  
- 统一 ExpertOpinion / Decision Contract  
- 会议并行调用与错误降级  

完成后：合并的是**体验**，不是把四个 Agent 揉成一个代码包。

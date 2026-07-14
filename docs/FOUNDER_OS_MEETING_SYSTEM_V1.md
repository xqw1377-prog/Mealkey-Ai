# Founder OS 会议系统详细设计 V1

> 文档类型：系统核心机制冻结稿  
> 日期：2026-07-13  
> 状态：交互与机制冻结，待工程落地  
> 前置：`FOUNDER_OS_FRONTEND_MASTER_V2.md` · `FOUNDER_OS_FIVE_PAGES_LOFI_V1.md`  
> 目标：从 Chat → **AI 咨询会议室**

---

## 0. 为什么这一层最关键

前面所有能力：

- M-BIZ 商业判断  
- M-PNT 品牌定位  
- M-MKT 市场分析  
- M-ED 股权设计  

最终都必须通过 **一次高质量咨询会议** 被用户感知。

四个 Agent 统一成一个系统，靠的是同一套会议机制，不是同一套页面皮肤。

---

# 一、核心定义重新冻结

## 错误模型（ChatGPT）

```text
用户提问
  ↓
AI回答
  ↓
结束
```

## Founder OS 模型

```text
企业问题
  ↓
建立议题
  ↓
专家进入
  ↓
多方分析
  ↓
冲突出现
  ↓
形成共识
  ↓
用户决策
  ↓
验证执行
  ↓
进入长期记忆
```

## 一句话

> AI 不是回答用户，而是组织一次商业会议。

---

# 二、会议对象模型

## Meeting（核心实体）

```typescript
type MeetingStage =
  | "preparation"   // PREPARE
  | "discussion"    // DISCUSS
  | "debate"        // DEBATE
  | "consensus"     // SYNTHESIS
  | "decision"      // DECISION（用户已确认）
  | "validation";   // VALIDATE

interface Meeting {
  id: string;
  companyId: string;           // = projectId
  ownerId: string;

  topic: string;               // 会议主题 / 议题
  title: string;               // 显示名：商业战略会议 / 定位委员会
  department: "general" | "market" | "brand" | "business" | "org";

  stage: MeetingStage;

  /** 生命周期细状态（工程用，可比 stage 更细） */
  lifecycle:
    | "INIT"
    | "PREPARE"
    | "OPEN"
    | "DISCUSS"
    | "DEBATE"
    | "SYNTHESIS"
    | "USER_CONFIRM"
    | "DECISION"
    | "VALIDATE"
    | "MEMORY_UPDATE"
    | "ABANDONED";

  participants: Expert[];
  transcript: Message[];       // 附属记录，非主舞台

  knownFacts: string[];
  unknownGaps: string[];

  conflicts: Conflict[];
  activeConflictId?: string;

  consensusDraft?: ConsensusDraft;
  options?: DecisionOption[];  // 方案选择节点用

  decision?: Decision;         // 用户确认后写入

  agentCode?: "m-mkt" | "m-pnt" | "m-biz" | "m-ed" | "chief";
  agentRunIds: string[];
  conversationId?: string;     // 兼容现网落库

  createdAt: string;
  updatedAt: string;
}
```

## Expert

```typescript
interface Expert {
  roleId: string;              // expert.biz_model
  displayName: string;         // 商业模式顾问
  persona?: string;            // 可选人格化名（如里斯）
  duty: string;                // 一句话职责
  focus: string[];             // 关注点
  agentCode?: string;
}
```

## ExpertStatement（发言）

```typescript
interface ExpertStatement {
  id: string;
  roleId: string;
  round: 1 | 2 | 3;            // 独立判断 / 互相挑战 / 收口贡献
  stance: "support" | "oppose" | "conditional" | "neutral";
  claim: string;               // ≤40 字判断
  reasons: string[];           // ≥1 条事实依据
  challengeTo?: string;        // Round2：挑战谁 / 哪条 claim
  risks?: string[];
  conditions?: string[];
  evidenceRefs?: string[];
}
```

## Conflict（冲突引擎产物）

```typescript
interface Conflict {
  id: string;
  issue: string;               // 是否加盟
  positionA: string;           // 立即扩张
  positionB: string;           // 暂缓扩张
  conflictLabel: string;       // 市场机会 vs 组织能力
  sideAExpertIds: string[];
  sideBExpertIds: string[];
  resolved: boolean;
}
```

## ConsensusDraft / DecisionOption / DecisionCard

```typescript
interface ConsensusDraft {
  summary: string;
  proposedDecision: string;
  coreReasons: string[];
  nextActions: string[];
  validationPlan?: string;     // 如 90 天
  openConflicts?: string[];
}

interface DecisionOption {
  id: string;
  label: string;
  summary: string;
  tradeoff: string;
}

/** 会议输出 = 决策卡，不是报告 */
interface DecisionCard {
  problem: string;
  consensus: string;
  coreReasons: string[];
  nextSteps: string[];
  validationDays?: number;
  owner: string;               // 默认「老板」
  status: "executing" | "validating" | "done" | "abandoned";
}
```

---

# 三、会议生命周期状态机

## 冻结路径

```text
INIT
  ↓
PREPARE
  ↓
OPEN
  ↓
DISCUSS
  ↓
DEBATE
  ↓
SYNTHESIS
  ↓
USER_CONFIRM
  ↓
DECISION
  ↓
VALIDATE
  ↓
MEMORY_UPDATE
```

可退出：任意 → `ABANDONED`（未确认决策可恢复）。

### stage ↔ lifecycle 映射

| lifecycle | Meeting.stage | 用户感知 |
|-----------|---------------|----------|
| PREPARE | preparation | 我正在准备这场会议 |
| OPEN | discussion | 主持人开场、专家入席 |
| DISCUSS | discussion | Round1 独立判断 |
| DEBATE | debate | Round2 互相挑战 + 核心分歧 |
| SYNTHESIS | consensus | Round3 共识草案 |
| USER_CONFIRM | consensus | 你的决定？ |
| DECISION | decision | 决策卡已生成 |
| VALIDATE | validation | 验证中 |
| MEMORY_UPDATE | validation | 写入三类 Memory |

### 转移触发

| 从 | 到 | 触发 |
|----|-----|------|
| INIT | PREPARE | 创建 Meeting（今日判断 / 企业世界进入） |
| PREPARE | OPEN | 背景整理完成；议题已确认（节点1） |
| OPEN | DISCUSS | 主持开场结束、专家席就位 |
| DISCUSS | DEBATE | Round1 至少 2 席已发言 |
| DEBATE | SYNTHESIS | Conflict 已展示；用户选过关注方向（节点3）或主持判定可收口 |
| SYNTHESIS | USER_CONFIRM | 共识草案 + 可选方案就绪 |
| USER_CONFIRM | DECISION | 用户确认决策（节点5） |
| USER_CONFIRM | DEBATE | 继续讨论 |
| USER_CONFIRM | SYNTHESIS | 修改共识 / 换方案 |
| DECISION | VALIDATE | 写入 Decision + 决策卡，默认验证中 |
| VALIDATE | MEMORY_UPDATE | 回填验证结果 或 即时写入事实/偏好 |
| * | ABANDONED | 退出且无 DECISION |

---

## 1. PREPARE — 会前准备

AI **先不让专家说话**。先整理：

- 企业背景  
- 当前问题  
- 已知事实  
- 缺失信息  

示例：

```text
会议主题：是否进入加盟扩张？

已有事实：
✓ 3家直营店
✓ 单店盈利
✓ 无加盟体系

未知：
? 培训体系
? 供应链复制
```

用户看到：

> 我正在准备这场会议。

**价值：** 增加「AI 正在理解」，而不是秒回作文。

可并行触发 **节点1（确认问题）**、**节点2（补充事实）**。

---

## 2. OPEN — 会议开始

主持人出场（首席顾问 / 部门主持）。

> 今天讨论一个核心问题：  
> 湘宴是否应该进入加盟扩张阶段。  
> 我邀请 4 位顾问参与。

专家席出现（人格化名称 + 职责一行）。

---

# 四、专家 Agent 设计

不要叫 AI1 / AI2。要 **人格化 + 职责清晰**。

## 通用商业会议默认席（general）

| 角色 ID | 显示名 | 职责 | 关注 |
|---------|--------|------|------|
| `expert.biz_model` | 商业模式顾问 | 赚钱逻辑 | 收入、成本、盈利、可持续 |
| `expert.market` | 市场顾问 | 外部机会 | 用户、趋势、竞争 |
| `expert.ops` | 运营顾问 | 落地能力 | 标准化、人员、供应链 |
| `expert.finance` | 财务顾问 | 风险 | 现金、投入、回报 |

主持：`host.chief`（首席顾问），不占对立席，负责开场与综合。

---

# 五、专家发言机制：回合制咨询

**不是同时输出一整份报告。** 采用回合制。

## Round 1 — 独立判断（DISCUSS）

每人只给判断 + 短理由：

```text
商业顾问：
我的判断：暂缓加盟。
理由：模型未复制。
```

## Round 2 — 互相挑战（DEBATE）

针对他人观点提问 / 反驳：

```text
市场顾问：如果等待一年，市场窗口是否会消失？
运营顾问：快速扩张失败成本更高。
```

此时 **Conflict Engine** 必须产出并可展示「核心分歧」。

## Round 3 — 形成共识（SYNTHESIS）

主持综合 → `consensusDraft` + 决策卡草案；进入 USER_CONFIRM。

### 发言质量门槛

- `claim` ≤ 40 字  
- `reasons` ≥ 1 条可追溯事实  
- Round2 须有 `challengeTo` 或明确对立表述  
- 不达标 → 该席重说或标「待补充」

---

# 六、冲突引擎（Conflict Engine）

**没有冲突，没有价值。**

## 职责

识别专家观点差异，结构化为 `Conflict`，驱动前端「核心分歧」而非全文聊天。

```json
{
  "issue": "是否加盟",
  "positionA": "立即扩张",
  "positionB": "暂缓扩张",
  "conflict": "市场机会 vs 组织能力"
}
```

## 前端展示（主舞台）

```text
当前最大争议：

市场窗口
   VS
复制能力
```

用户瞬间感知：**AI 真的在思考。**

## 规则（V1）

1. Round1 结束后聚类 stance / claim → 生成 0–N 个 Conflict  
2. 主舞台只突出 **1 个 activeConflict**（最大争议）  
3. 其余冲突可折叠，不刷屏  
4. 用户选关注方向（节点3）后，可标记某侧加权，再进 SYNTHESIS  
5. 无冲突时允许进入 SYNTHESIS，但须明示「专家高度一致」（少见，需检查是否假一致）

---

# 七、用户参与节点（5 个）

不能让 AI 自己开会。用户必须进入。

| 节点 | 时机 | AI 说 | 用户动作 | 若不做 |
|------|------|-------|----------|--------|
| 1 确认问题 | PREPARE→OPEN | 「我理解你的问题是…是否正确？」 | 确认 / 修改 | 不 OPEN |
| 2 补充事实 | PREPARE / DISCUSS | 「我缺少…」 | 回答 / 跳过（标未知） | 可继续，但 unknownGaps 保留 |
| 3 选择关注方向 | DEBATE | 「你更关注：A 快速增长 / B 稳健盈利 / C 品牌长期价值」 | 三选一 | 不强制，但默认「均衡」须明示 |
| 4 方案选择 | SYNTHESIS | 「三个方案，你倾向哪个？」 | 选 Option | 可直接进确认若只有一案 |
| 5 确认决策 | USER_CONFIRM | 「形成决策卡，是否确认？」 | 接受 / 修改 / 继续讨论 | **不写入 Decision Memory** |

### 交互句式

错误：

> 以下是完整分析报告，请查收。

正确：

> 三位专家出现分歧。你更想先压住组织风险，还是先抓住市场窗口？

---

# 八、会议输出不是报告：决策卡

```text
商业决策

问题：是否加盟？
共识：暂缓6个月。
核心原因：复制体系不足。
下一步：建立加盟标准体系。
验证周期：90天。
负责人：老板。
状态：执行中。
```

决策卡 = 决策档案列表/详情的最小单元，对齐 Protocol `MKDecision` 字段映射：

| 决策卡 | MKDecision |
|--------|------------|
| 问题 | problem |
| 共识 | judgement |
| 核心原因 | diagnosis + evidence |
| 下一步 | action / strategy |
| 验证周期 | validation（metadata） |

---

# 九、会议与 Memory 连接

一次会议至少写入 **三类记忆**：

## 1. 企业事实 Memory

```text
已有3家直营店
```

来源：PREPARE knownFacts、节点2 补充、验证回填。

## 2. 用户偏好 Memory

```text
偏向稳健增长
```

来源：节点3 关注方向、节点4/5 最终选择模式（需累积，单次会议弱更新）。

## 3. 决策 Memory

```text
2026-07 选择暂缓加盟
```

来源：USER_CONFIRM → DECISION；含支持/反对观点、放弃选项、验证计划。

三者共同形成 **AI 长期理解**（飞轮：更好的今日判断）。

### 写入禁止

- 未走节点5「确认」  
- 无 topic / 无 judgement  
- 仅 transcript 闲聊、无共识草案  

---

# 十、四个 Agent 的会议模板

前台永远是会议名 + 专家名；Agent Code 仅路由与计量。

## M-PNT — 品牌定位委员会

| 项 | 内容 |
|----|------|
| 专家 | 里斯、特劳特、叶茂中、市场专家（对齐现有 M-PNT 专家矩阵） |
| 流程 | 市场认知 → 定位争论 → 品牌选择 → 定位验证 |
| 冲突典型 | 品类机会 vs 心智占位；差异化锐度 vs 短期销量 |

## M-MKT — 市场机会评估会

| 项 | 内容 |
|----|------|
| 专家 | 行业研究员、用户洞察、增长专家 |
| 流程 | 品类/城市事实 → 机会争论 → 进入判断 → 窗口验证 |
| 冲突典型 | 窗口紧迫 vs 证据不足 |

## M-BIZ — 商业模式评审会

| 项 | 内容 |
|----|------|
| 专家 | 商业模型、财务、运营（可加增长） |
| 流程 | 模式拆解 → 复制争论 → 路径选择 → 90天验证 |
| 冲突典型 | 增长 vs 复制能力；利润 vs 规模 |

## M-ED — 组织与股权设计会

| 项 | 内容 |
|----|------|
| 专家 | 股权专家、HR专家、创始人顾问 |
| 流程 | 控制权事实 → 激励/治理争论 → 结构选择 → 落地验证 |
| 冲突典型 | 激励力度 vs 控制权安全 |

**共用同一 Meeting 状态机 + Conflict Engine + 五节点 + 决策卡。** 变的是 `participants` 与 Round 提示词模板。

---

# 十一、前端最终形态

不是聊天窗口，而是：

```text
┌───────────────────┐
会议主题
是否进入加盟？

专家席
商业顾问 · 市场顾问 · 运营顾问

-------------------
当前争议
增长机会
   VS
复制能力

-------------------
会议结论
90天验证计划

-------------------
你的决定？
[接受] [修改] [继续讨论]
└───────────────────┘
```

### 区块 ↔ 状态

| 区块 | 主要 lifecycle |
|------|----------------|
| 准备中 / 已知·未知 | PREPARE |
| 会议主题 + 主持开场 | OPEN |
| 专家席发言卡 | DISCUSS / DEBATE |
| 当前争议 | DEBATE（Conflict Engine） |
| 会议结论 | SYNTHESIS |
| 你的决定 | USER_CONFIRM |
| 决策卡 | DECISION+ |

`transcript` / 补充输入 = 次要区，永不占主舞台。

---

# 十二、这一步完成后的价值变化

| 现在 | 之后 |
|------|------|
| 我在用一个 AI | 我有一个 AI 咨询团队 |

这是 M-BIZ / M-PNT / M-MKT / M-ED 从 **工具** 变成 **组织** 的关键。

---

# 十三、工程落地要点（增量）

1. 新建 `Meeting` 投影（可先 `Conversation.metadata.meeting`）  
2. `/advisor` 默认会议室布局：主题 / 专家席 / 核心分歧 / 结论 / 决定  
3. SSE 解析为 `ExpertStatement` + 回合推进，禁止整页报告流  
4. 实现 Conflict Engine（规则聚类 V1，可后接 LLM 标注）  
5. 五节点用显式 UI（确认/选择题/方案卡），不靠纯自然语言隐含  
6. 「接受」→ DecisionCard + Decision Memory + 事实/偏好弱更新  
7. 四部门只换模板与 `agentCode`，不换页面壳  

---

# 十四、验收标准

1. 打开会议先看到 **准备/理解**，不是秒出长文  
2. 能指出至少两位专家的 **独立判断**  
3. DEBATE 阶段必须出现 **核心分歧**（或显式「高度一致」）  
4. 未经节点5，**不产生**决策档案  
5. 输出是 **决策卡**，不是报告 PDF 感  
6. 今日判断「进入会议」自动带入 topic  
7. 换部门会议，壳不变、专家与流程变  

---

# 十五、冻结清单（本文件）

1. Chat → 会议 的核心定义  
2. Meeting 对象模型  
3. 生命周期状态机（含 PREPARE / DEBATE / MEMORY_UPDATE）  
4. 人格化专家席  
5. 回合制发言  
6. Conflict Engine  
7. 五个用户参与节点  
8. 决策卡输出  
9. 三类 Memory 写入  
10. 四 Agent 会议模板  
11. 前端会议室形态  

**下一步（已完成 P0 + P1）：**  
- P0：会议室壳 + lifecycle + Conflict + 接受写入决策卡 ✓  
- P1：四部门专家模板 + 回合制 Round1/2/3 + 方案选择 + forceAgent 路由 ✓  
- P2：LLM 驱动专家发言（替换启发式剧本）、MeetingSession 持久化  

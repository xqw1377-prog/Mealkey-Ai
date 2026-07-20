# MealKey Decision Center V1（产品原型 · 冻结）

> **状态：正式冻结（Freeze）— 产品入口形态**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **对外品牌：** 餐启 · Mealkey  
> **对内产品名：** Decision Center（餐厅经营决策中心）  
> **路由收口：** V1 **仍挂** `/dashboard`（今日），用叙事与信息架构升级，**禁止**另起平行首页数据管道  
> **冲突裁决：** 不是 ChatGPT 输入框、不是顾问聊天室、不是数据大屏「驾驶舱」。是**每天一次经营决策**的入口。  
> **体验隐喻：** 每天早上的「经营晨会」——先体检、再出决策卡、再开会论证，而不是打开对话框。  
> **技术配套：** `docs/MEALKEY_DECISION_CENTER_TECHNICAL_V1.md`

---

## 〇、战略转向（必须先读）

### 系统能力 vs 用户入口

| 层 | 是什么 | 老板是否直接感知 |
|----|--------|------------------|
| 七常委 / 四席 / Brain / Runtime | **内核** | 弱（幕后） |
| Decision Center | **入口产品** | 强（每天打开的理由） |

前面搭的是内核。现在缺的是：

> 老板每天为什么打开 MealKey？

### 新入口定位（冻结）

**保留品牌：** MealKey = 餐饮经营能力增长系统  

**用户入口变成：**

> **每天帮餐饮老板做一次经营决策。**

**产品核心句（与 DIE 对齐 · 冻结）：**

> MealKey 不是帮老板回答问题，而是每天帮助老板发现关键经营问题，并基于真实经营事实做出正确决策。

| 文案位 | 冻结句 |
|--------|--------|
| 广告语 | MealKey，让你的能力持续增长。 |
| 产品解释 | 每一天，发现关键问题，基于真实事实做对决策。 |
| 入口产品名 | **餐厅经营决策中心**（Decision Center） |
| 壳层导航标签 | 仍可叫「今日」；副标题/页眉用「今日经营决策」 |

### 禁止（冻结）

1. **禁止**首页以空白输入框 /「有什么可以帮你」开场  
2. **禁止**把 Decision Center 做成第七 Runtime 或新顾问席  
3. **禁止**另起一套与 `dashboard.getHome` 平行的 Brief 聚合  
4. **禁止**把数据大屏、多图表 KPI 墙当作第一屏（≠ 经营决策）  
5. **禁止**用「继续扩 Brain Schema」挤占本模块的工程主线  
6. **禁止**把七常委做成通用聊天；常委只出现在**决策论证层**

### 与 Restaurant Brain 的关系（冻结）

```text
Decision Center = 入口（感知）
Restaurant Brain = 深度（记忆与事实）
七常委           = 过程（论证）
M-EXEC           = 执行（行动）
```

**优先级（产品）：**

| 优先级 | 模块 | 角色 |
|--------|------|------|
| **P0** | Decision Center | 用户入口 |
| **P1** | Restaurant Brain | 长期认知与档案深度 |
| **P2** | 七常委 | 决策过程展示 |
| **P3** | M-EXEC / Execution Runtime | 决策后执行 |

Brain **不停工**，但工程主线从「扩 Brain」切到「Decision Center 收口今日入口」。

---

## 一、三层产品结构（冻结）

```text
L1 今日经营决策（Decision Center Home）
      ↓ 点风险 / 机会 / 建议
L2 决策空间（Decision Space）
      ↓ 老板确认
L3 决策档案（Decision Archive · Brain）
```

| 层 | 产品名 | 现有代码落点（复用） | 不是 |
|----|--------|---------------------|------|
| L1 | 今日经营决策 | `/dashboard` · `DashboardPage` · `dashboard.getHome` | 聊天首页 |
| L2 | 决策空间 | `decision-room` + 会议 `advisor` 分流 · `MeetingHub` | 自由闲聊 |
| L3 | 决策档案 | `/decisions`（行动）+ Brain `DecisionRecord` | 聊天记录 |

---

## 二、L1：首页信息架构（第一屏）

### 2.1 第一屏只做一件事

> **告诉老板：今天该关注什么、该做什么决定。**

### 2.2 信息架构（冻结 · 经营晨会）

```text
┌─────────────────────────────────────┐
│ 餐启 MealKey                         │
│ 早上好，{老板名}                      │
│ 你的餐厅今天 · 经营健康度 {score|—}   │
├─────────────────────────────────────┤
│ 今日诊断（经营体检卡）                 │
│  阶段标签 · 主因 · 非因 · 影响句       │
│  依据勾选 + 可信度（禁止无证据假数）    │
├─────────────────────────────────────┤
│ 今日需要关注：                        │
│  🔴 n 风险 · 🟡 n 机会 · 🟢 n 行动    │
├─────────────────────────────────────┤
│ Decision Card（主卡，非列表墙）        │
│  问题 · 情况 · 影响/紧急星级           │
│  七常委预览票数 · 一句建议             │
│  [进入决策]                           │
├─────────────────────────────────────┤
│ 🟢 今日行动（≤3，可勾选）              │
├─────────────────────────────────────┤
│ 主 CTA（唯一强按钮）                   │
└─────────────────────────────────────┘
```

**第一屏预算（冻结）：**

- 晨会问候 + 健康度（可空）  
- **一份**今日诊断（体检卡）  
- **一张**主 Decision Card（次卡 ≤2）  
- **≤3** 行动 + **1** 主 CTA  
- **禁止**堆 Agent 入口、知识库、多 Runtime Tab、KPI 大屏、聊天输入框主角

### 2.3 与现网 Morning Brief 对齐

现网已有近似结构（`DashboardPage` + `buildDashboardHome`）。V1 **改造叙事与卡片层级**，不重写聚合：

| 原型块 | 现网字段 / 逻辑 |
|--------|-----------------|
| 🔴 最大风险 | `pickTopOpenRiskAlert` · `isBlockingRisk` · `runtime-priority` |
| 🟡 当前机会 | `pickTopOpportunity`（风险阻断时暂缓） |
| 🟢 今日行动 | `lastActionPlan` · `toggleTodayAction` |
| 主 CTA | `needRedeision` / Council pending / 草稿 / 开会 |
| Brain 弱信号 | `restaurantBrain` prior 理解度（可选角标，非主角） |

### 2.4 空态（Brain 事实不足）

当理解度 / 完整度偏低：

- **禁止**假装深刻诊断  
- 展示：「我们还不够了解这家店」+ 1 个补全入口（我的餐厅 / 一次定位或经营采集）  
- 仍可给**保守**行动建议（基于 Project 薄事实），置信明示

---

## 三、每日经营扫描机制（Daily Scan）

### 3.1 定义（冻结）

**Daily Scan ≠ 新 Runtime。**  
它是对已有 Risk / Opportunity / Growth / Validation / Council / Brain 的**每日投影编排**。

```text
Restaurant Brain 事实
Risk / Opportunity / Growth / Validation 状态
未完成会议 / 待拍板 Council
      ↓
Daily Scan（编排，落在 buildDashboardHome）
      ↓
今日经营决策（L1）
```

### 3.2 扫描产出契约（V1）

```typescript
type DailyScanCard = {
  kind: "risk" | "opportunity" | "action";
  title: string;          // 老板语言，禁止术语堆砌
  impactLine: string;     // 一句影响（钱/客/组织）
  evidenceHint?: string;  // 可选：数据变化一句
  href: string;           // 进入 L2 或 Runtime 详情
  severity?: "blocking" | "warn" | "info";
};

type DailyScanV1 = {
  restaurantName: string;
  understandingScore?: number; // Brain
  risk: DailyScanCard | null;
  opportunity: DailyScanCard | null;
  actions: Array<{ id: string; title: string; done: boolean }>; // ≤3
  primaryCta: {
    label: string;
    href: string;
    reason: "redeision" | "council" | "draft" | "meeting" | "checkin";
  };
};
```

### 3.3 排序铁律（复用现网）

1. **阻断性风险**压过机会（`runtime-priority`）  
2. **待拍板 / 复会**抬升主 CTA  
3. 无风险无机会时：主议题回落到「场景矩阵 / 预设议题」或「补全 Brain」  
4. Scan **每天刷新**；同一风险未处理可跨日延续，但文案须带「仍未关闭」

### 3.4 数据从哪来（禁止新造）

| 信号 | 真源 |
|------|------|
| 风险 | Risk Runtime · `openRiskAlerts` |
| 机会 | Opportunity Runtime · `openOpportunities` |
| 行动 | Execution / `lastActionPlan` |
| 拍板压力 | Council draft · Validation 偏航 · `needRedeision` |
| 事实可信度 | Restaurant Brain `understandingScore` / `dataCompleteness` |

---

## 四、决策卡片设计（L1 卡片）

### 4.1 风险卡（示例结构 · 文案可换数据）

```text
🔴 最大风险
人效下降，正在吞噬利润

系统发现：营业额 ↑ · 人工成本 ↑↑
影响：利润承压（用已有证据，禁止编造精确万元除非有数）

[查看原因]  → L2 决策空间
```

### 4.2 机会卡

```text
🟡 当前机会
老客复购信号走弱，会员策略可调整

数据：复购相关指标变化（有则写，无则弱化「数据」二字）

[评估机会] → L2 或 Opportunity Runtime
```

### 4.3 行动卡

```text
🟢 今日行动
☐ 检查晚餐套餐设计
☐ 与店长沟通排班
☐ 调整一个爆品推广
```

勾选复用 `dashboard.toggleTodayAction`。

### 4.4 视觉约束

- **一屏一叙事**：红/黄/绿是语义色，不是仪表盘图例墙  
- **禁止**卡片内嵌多图、雷达、七常委头像墙  
- 常委只在 L2 出现  

---

## 五、L2：决策空间（交互流程）

### 5.1 进入方式

从 L1 点风险/机会/主 CTA → **不是弹出聊天框**。

分流（复用 `MeetingHub`）：

| 意图 | 去向 |
|------|------|
| 需要研究 / 补事实 | `advisor` 会议（四席） |
| 需要拍板 | `decision-room`（七常委） |
| 已有草稿 | 复会 / 继续拍板 |

### 5.2 决策页结构（冻结）

```text
1. 问题
   为什么最近利润下降？

2. AI 诊断（可折叠）
   原因权重：人效 / 产品结构 / 市场…（须有证据或明示假设）

3. 七常委观点（会议桌，非聊天）
   CSO / CFO / COO … 各一句判断 + 风险

4. 决策结论（待老板确认）
   暂停扩张 30 天，先修复人效模型。

5. 下一步行动（M-EXEC 接管预览）
   Day1 / Day3 / Day7
```

### 5.3 七常委呈现方式（冻结）

- **形态：** 观点卡片 / 会议桌，**不是**多轮闲聊  
- **协议：** 继续走 Council Runtime（Insight → Opinion → Board → Founder Decide）  
- **产品名：** 对老板可称「经营委员会意见」；对内仍七常委  
- **V1 展示上限：** 主议题相关 3–5 席发言摘要 + 争议点一句；完整辩论在 Room 内展开  

### 5.4 老板确认

确认 = 写入：

1. Prisma `Decision`（既有）  
2. Brain `DecisionRecord`（`mkDecisionId` 关联，已接线）  
3. Execution / Validation 任务种子（既有 Runtime）  

**确认后离开 L2，回到 L1 或进入行动页**，不掉进无限聊。

---

## 六、L3：决策档案（壁垒）

### 6.1 定义

每一次确认的决策，形成可复盘资产：

```text
日期 · 问题 · 当时判断 · 原因 · 预期
      ↓（90 天 / Validation）
结果 · 判断对错 · Brain Learning
```

### 6.2 落点

| 展示 | 路由 |
|------|------|
| 行动中的验证列表 | `/projects/:id/decisions` |
| 餐厅侧决策记忆 | Brain `DecisionRecord` + 「我的餐厅」 |
| 学习回灌 | `BrainLearning` / founder blindSpots（既有进化路径） |

### 6.3 档案卡字段（老板语言）

- 决策是什么  
- 当时为什么这样判  
- 结果如何（进行中 / 正确 / 失误）  
- 系统学到了什么（一句）  

这是 Brain 的**用户可感价值**，不是后台表。

---

## 七、端到端数据流（冻结）

```text
每天打开 /dashboard
        │
        ▼
 Daily Scan ← Risk / Opp / Growth / Validation / Council / Brain
        │
        ▼
 L1 今日经营决策（1 风险 · 1 机会 · ≤3 行动 · 1 CTA）
        │ 点击
        ▼
 L2 决策空间 ──┬── advisor（研究）
               └── decision-room（七常委拍板）
        │ 老板确认
        ▼
 Decision + DecisionRecord + BrainEvent
        │
        ▼
 M-EXEC / Execution + Validation（行动与复盘）
        │
        ▼
 结果回写 → Learning → Brain → 次日 Scan 更准
```

**飞轮一句：**

> Scan → Decide → Argue → Confirm → Execute → Learn → Scan

---

## 八、与现有导航的映射

| 壳层 | Decision Center 角色 |
|------|----------------------|
| **今日** | = Decision Center L1（改叙事） |
| 能力 | 深度能力与「我的餐厅」；非每日入口 |
| 会议 | L2 研究 / 拍板过程 |
| 行动 | L3 执行与验证档案 |
| 成长 | 能力成长回看；不抢 L1 |

V1 **不改五段导航结构**；只强化「今日 = 今日经营决策」。

---

## 九、工程切片（Cursor 执行顺序 · 不扩架构）

| 切片 | 内容 | 验收 |
|------|------|------|
| **D0** | 文案与 IA：Dashboard 页眉改为「今日经营决策」；卡片层级 红/黄/绿 | 第一屏无输入框主角 |
| **D1** | `DailyScanV1` 投影：从 `buildDashboardHome` 导出稳定 DTO（可加字段，不新服务） | 前端只吃 Scan DTO |
| **D2** | 风险/机会卡 CTA → `MeetingHub` 分流（研究 vs 拍板） | 一键进入 L2 |
| **D3** | L2 决策页骨架：问题 / 诊断 / 常委摘要 / 结论 / 行动预览（复用 Room） | 无自由聊开场 |
| **D4** | 确认后档案回显：今日或行动页展示「最近决策」一条（读 DecisionRecord） | Brain 可感 |
| **D5** | 空态：Brain 完整度低时的补全引导 | 不装懂 |

**明确不做（本冻结）：** 新 Prisma 大表、新 Agent、新 Runtime、ChatGPT 首页。

---

## 十、成功标准（V1）

老板打开产品 10 秒内能回答：

1. **今天最大风险是什么？**  
2. **今天该推的机会/议题是什么？**  
3. **我下一步点哪里？**（一个主按钮）  

若仍需「先想清楚问 AI 什么」—— V1 失败。

---

## 十一、与旧文档关系

| 文档 | 关系 |
|------|------|
| `FOUNDER_OS_V2.md` 今日 = Morning Brief | **继承并升格叙事**为 Decision Center |
| `FOUNDER_OS_FIVE_PAGES_LOFI_V2.md` 禁驾驶舱 | **遵守**：禁止 KPI 大屏；「决策中心」≠ 数据驾驶舱 |
| `FOUNDER_OS_OPERATING_SCENARIO_MATRIX_V1.md` Today Decision | **接入** Scan 主议题候选 |
| Restaurant Brain 系列 | **降为 P1 深度层**；入口让位 Decision Center |
| Council System | L2 论证引擎；产品化跟 D3 |
| `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md` | **壁垒层真源**；L2 必须挂 DIE |
| `MEALKEY_DECISION_CENTER_INTERACTION_V1.md` | **入口交互冻结**；Card / 压力测试台 / 裁决页 |

---

**一句话：**  
Decision Center 让老板每天走进决策链路；**Decision Intelligence Engine** 决定走进去之后是否比 GPT 更可靠。入口与壁垒必须一起成立。

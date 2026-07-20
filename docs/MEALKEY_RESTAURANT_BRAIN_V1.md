# MealKey Restaurant Brain V1（产品设计 · 冻结）

> **状态：正式冻结（Freeze）— 餐厅智能层 / Restaurant Intelligence Layer**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **对外品牌：** 餐启 · Mealkey（中文「餐启」，英文 Mealkey）  
> **对内对象名：** Restaurant Brain（餐厅经营大脑）  
> **冲突裁决：** **不是第五 Expert、不是第七 Runtime、不是聊天机器人。**  
> 它是所有 Agent / Council / M-EXEC / Daily 的**认知底座**。先懂餐厅，再谈决策。

---

## 〇、战略冻结（必须先读）

### 一句话定位

> **MealKey 不是每天多答一个问题，而是每天比昨天更了解你的餐厅。**

品牌闭环（已冻结文案）：

> 让认知持续成长，让每一次决策，都比昨天更正确。

这里「认知」是双向的：

| 侧 | 成长对象 |
|----|----------|
| 老板 | 经营认知、决策质量 |
| MealKey | 对这家餐厅的认知（Restaurant Brain） |

### 第一阶段目标（冻结）

> **MealKey 第一阶段不是让 AI 帮老板经营，而是让 AI 先成为最了解这家餐厅的人。**

只有做到这一点，七席、四席、M-EXEC、所有 Agent 才真正有价值。

### 关系变化（为什么老板每天打开）

| 过去 | 未来 |
|------|------|
| 遇到问题 → 找人咨询 → 得到答案 → 结束 | 每天经营 → MealKey 持续理解 → 判断越来越准 → 陪伴成长 |

核心不是一个功能，而是一种**关系**：餐厅的 AI 经营大脑。

### 禁止（冻结）

1. **禁止**继续堆新的顾问席 / 垂直 Agent 作为下一阶段主线  
2. **禁止**把 Restaurant Brain 做成两小时问卷  
3. **禁止**用聊天流水当唯一学习燃料  
4. **禁止**在 DNA 置信度不足时假装「深刻了解你的店」  
5. **禁止**另开与 Memory / Decision / Growth 平行的第七 Runtime 名叫 Brain Runtime——Brain 是**投影 + 写入协议**，落点加深现有层

---

## 一、旧闭环 vs 新闭环

### 旧逻辑（普通 AI）

```text
用户提出问题
    ↓
Agent 分析
    ↓
输出建议
```

### 新逻辑（Restaurant Brain）

```text
建立餐厅认知
    ↓
持续收集经营信息
    ↓
理解经营状态
    ↓
辅助每一次决策
    ↓
记录结果
    ↓
更新餐厅认知
    ↓
越来越懂这家店
```

飞轮（冻结）：

```text
老板每天问 / 决策 / 执行
        ↓
MealKey 回答并调用 Restaurant Brain
        ↓
沉淀事实 · 决策记忆 · 学习事件
        ↓
Restaurant DNA 更完整
        ↓
决策更准确
        ↓
老板更依赖
        ↓
继续使用
```

---

## 二、Restaurant Intelligence Layer

对内层名：**Restaurant Intelligence Layer（餐厅智能层）**  
对内核心对象：**Restaurant Brain**  
老板入口名（产品面）：**我的餐厅**（不叫「首页」）

挂载关系（铁律）：

```text
Restaurant Intelligence Layer
        │
        ├── Restaurant Profile     ← 餐厅身份壳（一店一脑）
        ├── Restaurant DNA         ← 五层认知（读模型 + 分片写）
        ├── Decision Memory        ← 重大决策记忆（对错都记）
        ├── Learning Event         ← 验证/复盘后的教训
        └── Daily Cognition        ← 「今日新增认知」产品面
                │
        落点加深（不新开席）：
        ├── Project.profile / Brand Registry
        ├── Memory Runtime（事实 / 偏好 / 成败）
        ├── Decision Runtime + Execution Runtime
        ├── Growth Runtime + User Intelligence Evolution（Founder DNA）
        └── 四席（M-PNT / M-MKT / M-BIZ / M-ED）只读 DNA 再发言
```

与既有权威的关系：

| 已有权威 | 本层关系 |
|----------|----------|
| User Intelligence Evolution | **Founder DNA** 的读投影；本层补齐「餐厅侧」对称物 |
| Memory Runtime | 事实存储与价值分级；DNA 字段经 Memory / profile 回写 |
| Decision / Execution Runtime | Decision Memory 燃料；M-EXEC = Decision→Action→Learning |
| Council 4+1 | 四席是 DNA 的**读写专家**，不是绕过 Brain 的独立顾问 |
| M-PNT 六步 | Brand DNA 的高强度建设路径；签字结论必须回写 Brand DNA |

---

## 三、Restaurant DNA（五层）

正式命名空间：

```text
RestaurantBrain
  └── dna: RestaurantDNA
        ├── brand        → Brand DNA      （这是谁？）      ↔ M-PNT
        ├── business     → Business DNA   （怎么赚钱？）    ↔ M-BIZ
        ├── market       → Market DNA     （在哪里竞争？）  ↔ M-MKT
        ├── organization → Organization DNA（靠什么人？）  ↔ M-ED
        └── founder      → Founder DNA    （谁在经营？）    ↔ Founder OS / Intelligence Profile
```

### 3.1 Brand DNA

回答：**这是谁？**

| 字段族 | 示例 |
|--------|------|
| 定位 | oneLiner、品类、心智位置 |
| 客群 | 核心客群、消费场景 |
| 竞争 | 竞争集、竞争位置 |
| 优劣 | 品牌优势、品牌风险 |

**主写入路径：** M-PNT 六步签字、定位复审、店访证据升级。

### 3.2 Business DNA

回答：**怎么赚钱？**

| 字段族 | 示例 |
|--------|------|
| 模式 | 堂食 / 外卖 / 会员 / 加盟等结构 |
| 经济 | 客单、收入结构、成本结构、毛利逻辑 |
| 模型 | 单店模型、扩张逻辑 |

**主写入路径：** M-BIZ 会议/咨询、经营点决策复盘、老板主动补充。

### 3.3 Market DNA

回答：**在哪里竞争？**

| 字段族 | 示例 |
|--------|------|
| 场域 | 城市、商圈、门店区位 |
| 需求 | 用户需求、场景趋势 |
| 竞争环境 | 竞品动态、流量来源 |

**主写入路径：** M-MKT、店访回填、市场议题会议。

### 3.4 Organization DNA

回答：**靠什么人实现？**

| 字段族 | 示例 |
|--------|------|
| 结构 | 团队结构、关键岗位 |
| 能力 | 人效、管理能力、执行能力 |

**主写入路径：** M-ED、执行完成率、组织类决策复盘。

### 3.5 Founder DNA

回答：**谁在经营？**

| 字段族 | 示例 |
|--------|------|
| 风格 | 决策习惯、风险偏好 |
| 能力 | 短板、成长轨迹 |
| 教训 | historicalLessons |

**主写入路径：** User Intelligence Evolution（已冻结契约），本层只挂接不重造。

### 3.6 完整度（产品可见）

```typescript
type DnaCompleteness = {
  overall: number; // 0–100，加权
  byLayer: {
    brand: number;
    business: number;
    market: number;
    organization: number;
    founder: number;
  };
  /** 今日相对昨日的增量（百分点） */
  deltaToday: number;
  updatedAt: string;
};
```

**规则（冻结）：**

- 完整度必须可解释（缺哪一层、缺哪些字段）  
- **禁止**用空洞模板句把完整度刷高  
- 置信度低的字段计入「已知但弱」，不得计入「已深知」

---

## 四、核心对象 V1（Schema 方向）

> V1 允许先落在 `Project.profile` + Memory + Decision 表的**规范化投影**；对外 API 只暴露下列契约。  
> 禁止五套平行 JSON 各写各的。

### 4.1 RestaurantProfile

```typescript
type RestaurantProfile = {
  restaurantId: string; // V1 = projectId（一项目一脑；多品牌见 brandId）
  projectId: string;
  activeBrandId?: string;
  displayName: string; // 老板看到的「我的餐厅」名
  stage: "idea" | "opening" | "operating" | "expanding" | "unknown";
  version: "v1";
  createdAt: string;
  updatedAt: string;
};
```

### 4.2 RestaurantDNA

```typescript
type DnaFact = {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  confidence: number; // 0–1
  source:
    | "onboarding"
    | "consulting"
    | "meeting"
    | "decision"
    | "validation"
    | "conversation"
    | "import";
  evidenceIds?: string[];
  updatedAt: string;
};

type RestaurantDNA = {
  version: "v1";
  brand: Record<string, DnaFact>;
  business: Record<string, DnaFact>;
  market: Record<string, DnaFact>;
  organization: Record<string, DnaFact>;
  founder: Record<string, DnaFact>; // 可与 Intelligence Profile 双向投影
  completeness: DnaCompleteness;
};
```

### 4.3 Decision Record（Decision Memory）

每次重大决策必须可落：

```typescript
type DecisionRecord = {
  decisionId: string;
  problem: string; // 是否开新店
  judgementThen: string; // 当时判断
  expectation?: string; // 预计：半年回本
  rationale?: string[]; // 依据（引用 DNA / 证据）
  actualResult?: string; // 实际结果（验证后填）
  lesson?: string; // 学习：以后降低扩张速度
  dnaTouches?: Array<{
    layer: keyof Omit<RestaurantDNA, "version" | "completeness">;
    keys: string[];
  }>;
  status: "open" | "executing" | "validated" | "archived";
};
```

> **关键壁垒句（冻结）：** MealKey 不只懂餐厅静态档案，还知道**这家餐厅过去犯过什么错误**。

### 4.4 Learning Event

```typescript
type LearningEvent = {
  eventId: string;
  decisionId?: string;
  summary: string;
  outcome: "confirmed" | "partial" | "invalidated";
  dnaUpdates: Array<{ layer: string; key: string; before?: string; after: string }>;
  createdAt: string;
};
```

### 4.5 日更原则（反问卷）

老板**不会**花两小时填表。V1 写入只允许：

1. 薄启动：开户 4～6 问，只建 Brand/Business 的「能说话的壳」  
2. 对话抽取：每次问答后，仅当置信度 ≥ 阈值才写 DNA  
3. 决策/验证回写：最高价值燃料  
4. 咨询签字：批量升级对应层（如 Brand DNA）

**每日只长一点。**

---

## 五、老板入口：我的餐厅

导航心智调整（产品面）：

| 旧 | 新（建议） |
|----|------------|
| 今日（给建议的首页） | **我的餐厅**（认知状态 + 今日新增） |
| 会议 / 行动 / 能力 / 管理 | 保留；全部默认先读 Restaurant Brain |

### 第一屏结构（冻结预算）

1. **经营认知完整度**（大数字 + 今日 ↑Δ）  
2. **今日新增认知**（1 条主洞察，禁止堆列表）  
3. **今日值得问的经营问题**（可选 1 条；点进去先调 Brain 再答）  

示例文案（产品语气，非实现绑定）：

```text
经营认知完整度  68%
↑ 今天增加 2%

今日新增认知
通过最近 3 次新品决策，系统发现：
你的品牌更适合稳定爆品，而不是快速上新。
```

回答「要不要开第二家」时：

> 不是先甩模板建议，而是先调用 Restaurant Brain，再基于定位 / 现金流能力 / 组织成熟度给出有依据的判断。

---

## 六、M-EXEC 的位置（冻结）

M-EXEC **不是**执行顾问席。

它是闭环：

```text
Decision → Action → Learning → 更新 Restaurant Brain
```

示例：优化会员体系 → 拆 30 天计划 → 复盘结果 → 回写 Business / Founder DNA。

---

## 七、Agent 与 Brain 的调用铁律

```text
任何 Agent / Council / 决策室
        │
        ▼
必须先 loadRestaurantBrain(projectId)
        │
        ▼
再发言 / 投票 / 建议
        │
        ▼
产出若含可验证事实或决策结果
        │
        ▼
proposeDnaPatch（带 confidence + source）
        │
        ▼
闸门通过后 merge → completeness 重算
```

**禁止：** Agent 在空 Brain 上装「深知你的店」。须明示「已知 / 未知」。

---

## 八、开发顺序（价值排序 · 冻结）

> **下一阶段主线 = Restaurant Brain，不是新 Agent。**

### Phase 1 — Restaurant Brain 基础层（最高优先）

1. `RestaurantProfile`  
2. `RestaurantDNA` Schema + 投影读写 API  
3. Memory 扩展（事实可映射到五层）  
4. `DecisionRecord`（Decision Memory 最小面）  
5. `LearningEvent` 回写 DNA  

**验收：** 任一会议/咨询/决策结束后，Brain 完整度可解释地上升；Agent 读到的 prior 含 DNA 摘要。

### Phase 2 — Daily Intelligence

不是传统「日报」。

产品名：**今日餐厅认知更新**

每天告诉老板：

- 我今天更了解你的什么？  
- 我发现什么变化？  
- 哪个问题值得关注？  

**验收：** 「我的餐厅」第一屏可稳定产出 Δ完整度 + 1 条新增认知。

### Phase 3 — Decision Assistant

所有重要决策进入 MealKey；回答前强制 Brain 上下文；决策后强制 Decision Memory。

### Phase 4 — 自动进化飞轮

```text
越使用 → 越了解 → 判断越准 → 越依赖 → 数据越丰富
```

营销话术仅在 Phase 2 验收通过后允许加强；禁止空转「越用越懂」。

---

## 九、与工程现状的映射（诚实账本）

| DNA / 能力 | 现状 | V1 动作 |
|------------|------|---------|
| Brand | profile + M-PNT + brand-registry 较强 | 规范投影进 `dna.brand` |
| Business | 散落会议/顾问快照 | 建字段族 + M-BIZ 回写 |
| Market | 弱；店访有线索 | 店访/M-MKT → `dna.market` |
| Organization | 弱 | M-ED + 执行率 → `dna.organization` |
| Founder | Intelligence Profile 已冻结 | 双向投影，不重造 |
| Decision Memory | Decision + Validation 部分有 | 补 expectation / lesson / dnaTouches |
| Daily | Dashboard 拼简报偏「待办」 | 改为「认知更新」主叙事 |

---

## 十、验收句（给产品与工程）

1. **陌生测试：** 清空 Brain 后，系统必须承认「还不了解这家店」，不得装懂。  
2. **日更测试：** 连续 7 天各一次真实决策或验证，完整度单调不减，且至少 3 天有「今日新增认知」。  
3. **决策测试：** 「要不要开第二家」类问题，回答中必须显式引用 ≥2 层 DNA（如 Brand + Organization）。  
4. **错误记忆测试：** 一次验证失败必须留下 lesson，并在同类议题再次出现时被召回。  
5. **反问卷测试：** 新用户 ≤6 步开户即可进入「我的餐厅」；不得要求一次填齐五层。

---

## 十一、后端与代码真源

| 层 | 路径 |
|----|------|
| 后端设计冻结 | `docs/MEALKEY_RESTAURANT_BRAIN_BACKEND_V1.md` |
| Entity / Event / Evolution | `packages/restaurant-brain`（`@mealkey/restaurant-brain`） |
| Prisma | `RestaurantBrain` · `RestaurantDnaEvent` · `DecisionMemory` |
| Web 服务骨架 | `apps/web/src/server/restaurant-brain/service.ts` |

工程切片（见后端文档 §10）：B0 契约 → B1 落库 → B2 投影 → B3 merge → B4 inject MKContext → B5 DecisionMemory → B6 「我的餐厅」UI。

**本文件是 MealKey 2.0 产品底座真源。** 与本文件冲突的「继续堆 Agent」排期一律后置。

# Business Signal Engine 数据契约 V1（冻结）

> **状态：正式冻结（Freeze）— 经营信号数据契约**  
> **日期：** 2026-07-21  
> **产品一句：** 将企业内部事实与外部变化，转化为老板每天可以理解、判断和行动的经营信号。  
> **代码 SSOT：** `@mealkey/business-signal-engine`（`src/types/*` · `src/bridge/signal-to-case.ts`）  
> **产品冻结：** `docs/BUSINESS_SIGNAL_ENGINE_V1.md`  
> **证据语义：** `docs/EVIDENCE_CHAIN_PROTOCOL_V1.md`  
> **雷达体验：** `docs/TODAY_RADAR_EXPERIENCE_V1.md`  
> **权威挂载：** `docs/AUTHORITY.md` L0 日活入口 / L1 信号数据契约  
> **持久化铁律：** 本层**不**新建 Prisma Decision 表；升格 Case 时 `DecisionCase.id ≡ MKDecision.id ≡ Prisma Decision.id`

---

## 〇、四个原则（冻结）

### 原则 1：Signal 回答「跟我的生意有什么关系」

| Brain | M-INTEL | **Signal Engine** |
|-------|---------|-------------------|
| 我是谁、经营什么 | 外部发生什么 | **变化与本店的关系判断** |

### 原则 2：Signal ≠ 结论 ≠ Case

- Signal 是入口，不是答案  
- 不是所有 Signal 都开会  
- Agent（M-PNT / M-MKT / M-BIZ / M-ED）**禁止**绕过 Signal 直接对老板下经营结论  

### 原则 3：五层缺一不可

```text
Observation → Pattern → Meaning → Impact → Action
（事实）      （异常）    （解释）    （影响）   （行动）
```

缺层的对象不得进首页主焦点。

### 原则 4：不 invent 无来源事实

证据链至少 2 步，且至少 1 步非 `inference`。见证据协议。

---

## 一、Signal 类型体系（冻结六类 · 不再扩展）

```typescript
type BusinessSignalTypeV1 =
  | "CUSTOMER"       // 顾客：满意度 / 抱怨 / 描述你的方式
  | "OPERATION"      // 经营：赚钱能力（含客单/客流/翻台/财务指标）
  | "COMPETITION"    // 竞争：半径内竞品变化
  | "BRAND"          // 品牌：消费者如何理解你（M-PNT 强相关）
  | "MARKET"         // 市场：外部趋势（搜索/品类/区域消费）
  | "ORGANIZATION";  // 组织：人员/管理复制风险
```

| 类型 | 老板问题 | 主来源 |
|------|----------|--------|
| CUSTOMER | 客人不满意我知不知道？ | 点评 / 小红书 / 抖音 / 私域 |
| OPERATION | 是市场问题还是客单问题？ | POS / SaaS / Excel / Brain |
| COMPETITION | 竞争圈变了吗？ | 地图 / 点评竞品 |
| BRAND | 消费者怎么理解我？ | 评价关键词 / M-PNT |
| MARKET | 大趋势跟我相关吗？ | 趋势情报 / M-INTEL |
| ORGANIZATION | 人变了生意变了吗？ | 老板输入 / 人员事件 |

**兼容：** 旧枚举 `FINANCE` → 映射为 `OPERATION`（赚钱能力的财务侧面，不另开类型）。  
**Web UI 别名：** `customer/business/market/brand/organization` 仅展示层，真源为大写枚举。  
**V1 首页三大雷达：** CUSTOMER · COMPETITION · OPERATION（其余默认可生成但不堆首页，除非升格规则触发）。

---

## 二、Evidence 数据结构（冻结）

```typescript
type EvidenceKindV1 =
  | "internal_fact"    // Brain / POS / 老板确认事实
  | "external_intel"   // M-INTEL / 点评 / 地图
  | "inference";       // AI 推理（必须标清，不得单独成链）

type BusinessSignalEvidenceItemV1 = {
  source: string;              // 「大众点评」「Brain·客单」「地图」
  fact: string;                // 可核验事实句（老板语言）
  kind: EvidenceKindV1;        // V1 必填
  sourceRef?: string;          // 锚：评价批次 / 竞品 ID / Brain factId / Evidence.id
  observedAt?: string;         // ISO
  weightHint?: number;         // 0–1 可选，供 trust/confidence 校准
};
```

### 硬约束

1. `evidence.length >= 2`  
2. 至少 1 条 `kind !== "inference"`  
3. 最后一步允许 `inference`（「判断：…」）  
4. 无合格证据链 → 不得 `HIGH`/`CRITICAL`，不得进雷达主焦点  

与 DIE `Evidence` / M-INTEL Evidence：**本层存摘要句 + sourceRef**；完整证据对象仍在 DIE/M-INTEL，禁止平行复制大表。

---

## 三、BusinessSignal 数据结构（冻结 · 五层）

```typescript
type BusinessSignalSeverityV1 = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type BusinessSignalSubjectV1 = {
  brand?: string;
  store?: string;
  region?: string;
};

type SignalScoreBreakdownV1 = {
  impact: number;       // 1–10  Business Impact
  urgency: number;      // 1–10
  confidence: number;   // 1–10  证据置信（≡ 旧字段 trust）
  relevance: number;    // 1–10  与本店相关度
  /** impact × urgency × confidence × relevance */
  rankScore: number;
  /** @deprecated 使用 confidence */
  trust?: number;
};

type BusinessSignalStatusV1 =
  | "detected"          // 已检出
  | "surfaced"          // 已进雷达
  | "investigating"     // 经营调查追问中
  | "promoted_case"     // 已升格 DecisionCase
  | "dismissed"         // 老板忽略
  | "merged"            // 并入其他信号
  | "resolved";         // 已闭环（含学习回写）

/**
 * 五层语义（产品）↔ 字段（工程）
 * Layer1 Observation  → observation
 * Layer2 Pattern      → pattern
 * Layer3 Meaning      → meaning（insight 为同义别名）
 * Layer4 Impact       → impact
 * Layer5 Action       → recommendation
 */
type BusinessSignalV1 = {
  id: string;
  schemaVersion: 1;
  projectId: string;
  subject: BusinessSignalSubjectV1;

  type: BusinessSignalTypeV1;
  severity: BusinessSignalSeverityV1;
  status: BusinessSignalStatusV1;

  title: string;

  /** L1 观察：纯事实（发生了什么） */
  observation: string;
  /** L2 模式：是否异常 / 相对基线 */
  pattern: string;
  /** L3 意义：为什么重要（对本店） */
  meaning: string;
  /** @deprecated 同 meaning；过渡期双写 */
  insight?: string;
  /** L4 影响：不处理会怎样 */
  impact: string;
  /** L5 行动：今天建议做什么 */
  recommendation: string;

  evidence: BusinessSignalEvidenceItemV1[];

  /** 0–1 展示用置信（与 scores.confidence/10 对齐） */
  confidence: number;
  scores: SignalScoreBreakdownV1;

  /** 经营调查：升格 Case 前可选追问（≤3） */
  probeQuestions?: string[];

  /** 升格决策室 */
  decisionTopic?: string;
  suggestedQuestion?: string;  // 「是否需要调整晚市服务流程？」
  decisionCaseId?: string;     // 升格后 ≡ MKDecision.id
  href?: string;

  /** 溯源 */
  sourceRefs?: {
    brainContextId?: string;
    mintelEvidenceIds?: string[];
    worldChangeIds?: string[];
    dieSignalId?: string;      // 可选映射 Experience DecisionSignal
  };

  createdAt: string;
  updatedAt: string;
  observedWindow?: { from: string; to: string }; // 如近7天
};
```

### 五层示例（冻结范式）

```text
L1 Observation
  过去7天大众点评新增评价46条；其中等待时间18条（39%）

L2 Pattern
  过去30天等待相关评价均值12%；当前39%；变化 +225% → 异常

L3 Meaning
  不是单纯「服务差」标签：晚市营业占比最高，等待直接影响翻台

L4 Impact
  可能：复购下降 / 评分下降 /「聚餐」心智受损

L5 Action
  今天检查 18:00–20:00：点单→出餐→收台流程
```

---

## 四、Signal Ranking 算法（冻结）

```text
Priority / rankScore
  = BusinessImpact × Urgency × Confidence × Relevance
  （各维度整数 1–10，乘积范围 1–10000）
```

| 维度 | 含义 | 校准线索 |
|------|------|----------|
| impact | 对赚钱/品牌/组织的伤害或机会幅度 | 复购、评分、客单、分流 |
| urgency | 为何是今天 | 窗口期、恶化速度、高峰临近 |
| confidence | 证据是否站得住 | 事实步数、来源信任、新鲜度 |
| relevance | 跟**这家店**的关系 | Brain DNA / 区域 / 客群重合 |

### 进雷达切片规则

| 规则 | 值 |
|------|-----|
| 主焦点 primary | 每日 **1** 条（最高分且证据合格） |
| 其他 others | ≤ **3** |
| 门槛 | `rankScore < 800` 且非正向 → 不进首页 |
| 同分 | severity CRITICAL>HIGH>MEDIUM>LOW → confidence → CUSTOMER>COMPETITION>OPERATION |
| 三大雷达优先 | 非三大类型默认不进 Top，除非 `rankScore ≥ 3500` 且证据合格 |

### Severity 映射（实现允许启发式）

- CRITICAL ≈ impact≥9 且 urgency≥8  
- HIGH ≈ decide 向 或 rankScore≥3500  
- MEDIUM ≈ 观察  
- LOW ≈ 弱信号  

正向机会：可用 `severity=MEDIUM|LOW` + 文案/雷达 UI `positive` 别名表达，不另开类型。

---

## 五、Daily Radar 输出协议（冻结）

首页不是卡片堆，而是 **AI 经营判断书**：

```typescript
type DailyRadarOutputV1 = {
  schemaVersion: 1;
  projectId: string;
  generatedAt: string;

  /** 1. 今日判断 — 一句话 */
  headlineJudgment: string;

  /** 「我昨天观察了你的生意，发现 N 个变化。」 */
  summaryLine: string;
  changeCount: number;
  attentionCount: number; // severity HIGH/CRITICAL 数

  /** 2. 经营信号切片 */
  primary: BusinessSignalV1 | null;   // 🔴 首要关注
  others: BusinessSignalV1[];         // ≤3；机会/正向/次要风险

  /** 3. AI 建议 — 今天只做一件事 */
  todayOneThing: {
    action: string;                   // = primary.recommendation
    why: string;                      // = primary.meaning 摘要
  } | null;

  /** 经营状态四维（体验层可投影，非 Signal 本体） */
  health?: {
    status: "stable" | "watch" | "pressure" | "unknown";
    statusLabel: string;
    dims: Array<{
      id: "perception" | "market" | "efficiency" | "growth";
      label: string;
      trend: "up" | "down" | "flat" | "warn";
      note: string;
    }>;
  };
};
```

**Web 现有 `BusinessRadarV1`：** 为 UI 投影（decide/watch/positive 等别名）；字段以本协议为准逐步对齐，Ranking **禁止**写在 UI 组件内。

---

## 六、Signal → DecisionCase 转换规则（冻结）

```text
Signal
  ↓ （可选）Investigating：≤3 追问补 Context
  ↓ promote
DecisionCase（id ≡ MKDecision.id）
  ↓
Decision Intelligence / 七常委
  ↓
老板裁决 → M-EXEC → Evolution
```

### 6.1 何时可升格（Promote Gate）

同时满足：

1. `severity ∈ {HIGH, CRITICAL}` **或** 老板显式「进入分析」  
2. 证据链合格（§二）  
3. `suggestedQuestion` 或 `decisionTopic` 非空  
4. 非 `dismissed` / `merged` / `resolved`  

**禁止：** DailyScan / Radar 批量自动滥造 Decision 行（服从 Experience：Signal → Candidate → Case）。

### 6.2 转换映射

```typescript
type SignalToCaseDraftV1 = {
  /** 创建 MKDecision 后回填；创建前为空 */
  caseId?: string;
  projectId: string;
  title: string;                 // 短题
  question: string;              // = suggestedQuestion
  objective: string;             // 从 meaning/impact 压缩
  decisionType: 
    | "GROWTH" | "OPERATION" | "PRODUCT"
    | "MARKETING" | "ORGANIZATION" | "FINANCE";
  urgency: "LOW" | "MEDIUM" | "HIGH";
  impactStars: 1 | 2 | 3 | 4 | 5;
  signalId: string;
  /** 进入 Brief / Context 的证据摘要 */
  evidenceSummary: Array<{ source: string; fact: string; sourceRef?: string }>;
  unknowns: string[];            // 来自 probeQuestions 未答项
  status: "DISCOVERED";          // 初始
};
```

| Signal.type | decisionType（默认） |
|-------------|----------------------|
| CUSTOMER / OPERATION | OPERATION |
| COMPETITION / MARKET | GROWTH |
| BRAND | MARKETING |
| ORGANIZATION | ORGANIZATION |
| （赚钱指标主导） | FINANCE 可选 |

| Signal.severity | Case.urgency |
|-----------------|--------------|
| CRITICAL / HIGH | HIGH |
| MEDIUM | MEDIUM |
| LOW | LOW |

`impactStars` ← `scores.rankScore` 分档（同引擎 stars 启发式）。

### 6.3 升格后写回

- `BusinessSignal.status = "promoted_case"`  
- `BusinessSignal.decisionCaseId = Case.id`  
- Case.`signalId` = Signal.id  
- Brief 必带：五层摘要 + evidenceSummary（进决策室 VoiceBrief）

### 6.4 与 Experience DecisionSignal

`BusinessSignal`（本契约）是经营雷达真源；  
`DecisionSignalV1`（Experience）可作薄投影：`type RISK|OPPORTUNITY|CHANGE`、`suggestedQuestion`、`status`。  
映射：`sourceRefs.dieSignalId` 双向可选；**不得**两套各算一套 Ranking。

---

## 七、上下游接口（冻结）

### 7.1 输入：`SignalAnalyzeInputV1`

```typescript
type SignalAnalyzeInputV1 = {
  projectId: string;
  subject?: BusinessSignalSubjectV1;
  /** Restaurant Brain 摘要（可空；空则 relevance 下调） */
  restaurantContext?: {
    brandName?: string;
    stageLabel?: string;
    peakDaypart?: string;          // 如晚市
    dnaHints?: string[];           // 定位/客群关键词
  };
  /** M-INTEL / RIP 外部事实 */
  externalFacts?: Array<{
    id?: string;
    source: string;
    fact: string;
    observedAt?: string;
  }>;
  /** 内部经营事实 */
  internalFacts?: Array<{
    id?: string;
    source: string;
    fact: string;
    observedAt?: string;
  }>;
  /** 兼容 WorldChange 投影 */
  worldHints?: Array<{
    id: string;
    title: string;
    detail?: string;
    kind?: string;
    source?: string;
    decisionTopic?: string;
    href?: string;
  }>;
};
```

### 7.2 输出

```text
BusinessSignal[]  →  rank  →  DailyRadarOutputV1
                 ↘ promote → SignalToCaseDraftV1 → MKDecision
```

### 7.3 Council

高价值 Signal 进决策室时：

- 注入 EvidencePacket：`evidenceSummary` + Brain 切片 +（若有）M-INTEL ids  
- **不在** Signal Engine 内跑七常委辩论  
- 常委只消费已升格 Case 的 Context  

### 7.4 Evolution / Learn

Case 闭环后：结果回写 Brain；可选将原 Signal.`status→resolved`，供后续 Pattern 基线学习（V1 可记接口，深度学习非本契约范围）。

---

## 八、经营调查模式（V1 预留 · 不扩 UI）

发现信号后可进入追问（≤3），用于 Context 补全，**不是**闲聊：

```text
Signal.status = investigating
probeQuestions = [
  "最近是否调整过菜单？",
  "晚市是否增加新人？",
  "高峰期是否出现排队？",
]
```

规则：

1. 问题必须服务「解释 Pattern → Meaning」  
2. 回答写入 Case.unknowns 清除项 / Context.facts  
3. V1 工程：字段与转换规则冻结；首页大改交互另开体验迭代  

---

## 九、非目标（V1）

- 不扩展第 7 类 Signal type  
- 不做全量 BI / 报表中心  
- 不新建 Prisma DecisionCase / Signal 大表  
- 不在本层做七常委  
- 不 invent 无 sourceRef 的「精确数字」（无数据时用定性观察 + 低 confidence）

---

## 十、包内文件与验收

```text
packages/business-signal-engine/
  types/signal.ts              # 本契约字段 SSOT
  types/radar-output.ts        # DailyRadarOutputV1
  bridge/signal-to-case.ts     # Promote Gate + 映射
  evidence/evidence-chain.ts
  ranking/signal-ranking.ts    # confidence 维度
  analyzer/signal-analyzer.ts
  loop/intelligence-loop.ts
  index.ts
```

验收：

- [x] 任意进首页 Signal：五层字段非空 + 证据合格  
- [x] Ranking 使用 impact×urgency×confidence×relevance  
- [x] Promote Gate 单测：证据不足不可升格  
- [x] Case 映射不创建平行表；question 来自 suggestedQuestion  
- [x] AUTHORITY 挂载本文为信号数据契约 SSOT  

---

## 十一、版本

- **V1 冻结日：** 2026-07-21  
- **破坏性变更：** 升 `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V2`  
- **与产品冻结文档关系：** 产品叙事见 `BUSINESS_SIGNAL_ENGINE_V1.md`；**改字段先改本文与代码类型**  

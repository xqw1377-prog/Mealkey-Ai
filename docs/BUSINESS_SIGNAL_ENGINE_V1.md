# Business Signal Engine V1 — 产品与技术冻结

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-20（数据契约对齐：2026-07-21）  
> **定位：** 连接 Restaurant Brain · M-INTEL · 今日经营雷达 · Decision Room 的**核心中间层**  
> **包：** `@mealkey/business-signal-engine`  
> **字段 SSOT：** `docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md`（改字段先改契约）  
> **配套体验：** `TODAY_RADAR_EXPERIENCE_V1` · `EVIDENCE_CHAIN_PROTOCOL_V1`  
> **权威挂载：** `docs/AUTHORITY.md` L0 日活入口 / L1 经营信号数据契约

---

## 〇、产品一句（冻结）

> **Business Signal Engine：把「数据」变成「值得告诉老板的经营信号」，并强制附带证据、影响与建议。**

它不替代：

| 层 | 职责 |
|----|------|
| Restaurant Brain | 这家生意是谁（长期认知） |
| M-INTEL | 外部证据采集 |
| Daily Radar | 每天展示 / 习惯入口 |
| Decision Room | 重大判断 |
| M-EXEC | 推动改变 |
| Evolution | 结果学习 |

Agent（M-PNT / M-MKT / M-BIZ / M-ED）**禁止**直接对老板输出结论；应产出或消费 **BusinessSignal**。

---

## 一、经营智能循环（Business Intelligence Loop）

不是日报，而是循环：

```text
Observe（观察）
    ↓
Detect（发现变化）
    ↓
Understand（理解原因）
    ↓
Judge（判断影响）
    ↓
Recommend（建议行动）
    ↓
Learn（结果学习）
```

对应对象：

```text
数据 → Signal → Insight → Decision → Action → Learning
```

V1 Engine **负责 Detect → Understand → Judge → Recommend**（产出 Signal）。  
Observe 由 Brain + M-INTEL 供数；Learn 由 Evolution / 决策复盘回写。

---

## 二、BusinessSignal 标准协议（冻结）

```typescript
type BusinessSignalTypeV1 =
  | "CUSTOMER"      // 用户口碑
  | "OPERATION"     // 经营/运营（含财务指标侧面）
  | "COMPETITION"   // 竞争
  | "BRAND"         // 品牌心智
  | "MARKET"        // 市场趋势
  | "ORGANIZATION"; // 组织
// FINANCE → 兼容映射为 OPERATION，见数据契约

type BusinessSignalSeverityV1 =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

type BusinessSignalSubjectV1 = {
  brand?: string;
  store?: string;
  region?: string;
};

type BusinessSignalEvidenceItemV1 = {
  source: string;   // 如「大众点评」「Brain·客单」「地图」
  fact: string;     // 可核验事实句
  kind?: "internal_fact" | "external_intel" | "inference";
  sourceRef?: string;
};

type BusinessSignalV1 = {
  id: string;
  subject: BusinessSignalSubjectV1;
  type: BusinessSignalTypeV1;
  severity: BusinessSignalSeverityV1;
  title: string;
  /** L1 观察 · L2 模式 · L3 意义 · L4 影响 · L5 行动 — 字段见数据契约 */
  observation: string;
  pattern: string;
  meaning: string;
  insight?: string; // 同 meaning（过渡）
  impact: string;
  recommendation: string;
  evidence: BusinessSignalEvidenceItemV1[];
  confidence: number; // 0–1
  scores: {
    impact: number;
    urgency: number;
    confidence: number; // ≡ 旧 trust
    relevance: number;
    rankScore: number;
  };
  decisionTopic?: string;
  suggestedQuestion?: string;
  href?: string;
  createdAt?: string;
};
```

### 硬约束

1. `evidence.length >= 2`，且至少 1 条非 `inference`  
2. 无证据链 → 不得 `HIGH` / `CRITICAL`，不得进雷达主焦点  
3. 五层（观察/模式/意义/影响/行动）进主焦点前必须非空  
4. 老板语言：禁止「指标异常」空话  

完整字段与 Signal→Case 规则见 `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1`。

---

## 三、V1 范围：三大雷达（冻结）

**不要追求全面。** V1 首页只做：

| 雷达 | Signal type | 价值 | 主要来源 |
|------|-------------|------|----------|
| **用户口碑雷达** | `CUSTOMER` | ★★★★★ 老板最怕不知道客人不满意 | 点评 / 小红书 / 抖音 / 私域（M-INTEL） |
| **竞争雷达** | `COMPETITION` | ★★★★ 竞争圈变化 | 地图 / 新店 / 客单 / 卖点 |
| **经营风险雷达** | `OPERATION`（+必要时 `FINANCE`） | ★★★★ 内部恶化 | Brain 营业额/客流/客单/翻台 |

`BRAND` / `ORGANIZATION` 可在引擎内生成，但 **V1 默认不进首页 Top**，除非 `rankScore` 极高且带完整证据链（升格规则见 §四）。

---

## 四、Ranking（冻结公式）

```text
rankScore = impact × urgency × confidence × relevance
（各 1–10；confidence ≡ 旧 trust）
```

### 进雷达规则

| 规则 | 说明 |
|------|------|
| 主焦点 | 每日 **1** 条最高分 |
| 其他变化 | 最多 **3** 条（合计首页 ≤4） |
| 门槛 | `rankScore < 800` 且非正向 → 不进首页 |
| 同分 | severity CRITICAL>HIGH>MEDIUM>LOW；再比 confidence |
| 三大雷达优先 | 同分时 CUSTOMER > COMPETITION > OPERATION |

Severity 与分数启发式映射（实现允许）：

- CRITICAL ≈ impact≥9 且 urgency≥8  
- HIGH ≈ rank 高且 decide 向  
- MEDIUM / LOW ≈ 观察 / 弱信号  

---

## 五、技术架构（冻结）

```text
packages/business-signal-engine/
  types/signal.ts           # 协议 SSOT
  types/radar-output.ts     # DailyRadarOutputV1
  bridge/signal-to-case.ts  # Promote Gate → Case 草稿
  evidence/evidence-chain.ts
  ranking/signal-ranking.ts
  analyzer/signal-analyzer.ts
  loop/intelligence-loop.ts
  index.ts
```

### 输入（V1）

```text
SignalAnalyzeInput =
  subject
  + restaurantContext?     # Brain 摘要（可空）
  + externalFacts[]         # M-INTEL / RIP 差分事实
  + internalFacts[]         # 营业额/客流等（可空）
  + worldHints[]            # 兼容现有 WorldChange 投影
```

### 输出

```text
BusinessSignal[]  →  rank  →  RadarSlice { primary, others }
```

### Web 适配

`apps/web/.../business-signal-engine.ts` **薄适配**：WorldChange → package analyzer；雷达 UI 只消费 `BusinessSignal` / RadarSlice。  
禁止在 UI 组件内写 Ranking 公式。

---

## 六、与上下游接线

```text
Restaurant Brain  ──┐
M-INTEL Evidence  ──┼─→ Signal Engine ─→ Daily Radar (Top)
WorldChange/RIP   ──┘         │
                              ↓ HIGH/CRITICAL
                         Decision Room / Case
                              ↓
                           M-EXEC
                              ↓
                         Evolution / Brain 回写
```

高价值 Signal 一键进入决策室时：必须带 `decisionTopic` + evidence 摘要进 Brief。

---

## 七、老板三问（体验硬约束）

每条进首页信号必须可答：

1. **为什么告诉我？** → evidence  
2. **为什么现在告诉我？** → urgency / timing（可写入 insight）  
3. **我应该怎么办？** → recommendation  

---

## 八、非目标（V1 明确不做）

- 不做全量经营 BI / 报表中心  
- 不在本层做七常委辩论  
- 不 invent 无来源事实  
- 不把六个 type 全部堆上首页  

---

## 九、验收清单

- [x] `@mealkey/business-signal-engine` 可独立 typecheck  
- [x] 任意 Signal：`evidence ≥ 2` 且含事实步  
- [x] Ranking 单测：口碑风险 > 弱竞争观察  
- [x] 雷达首页：1 primary + ≤3 others，三大雷达优先  
- [x] AUTHORITY 指向本文为信号层 SSOT  

---

## 十、版本

- **V1 冻结日：** 2026-07-20  
- **破坏性变更：** 升 `BUSINESS_SIGNAL_ENGINE_V2`  
- **旧小写枚举 / FINANCE** 视为兼容别名；字段真源以 `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1` 为准。

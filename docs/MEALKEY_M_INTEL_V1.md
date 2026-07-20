# MealKey M-INTEL V1（经营情报层 · 架构冻结）

> **状态：正式冻结（Freeze）— Decision Evidence Engine（决策证据引擎）**  
> **日期：** 2026-07-18（精修：Evidence Engine / State 模型 / Signal）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **对内模块名：** M-INTEL  
> **正式定位：** **Decision Evidence Engine**（不是「情报 Agent」，不是爬虫）  
> **配套：** `MEALKEY_DECISION_CONTEXT_V1.md` · `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md`  
> **冲突裁决：** 只生产 **Evidence / Event / State / Signal**；**禁止**战略终局、顾问席、第八常委、第七 Runtime、新闻堆进 Prompt。  
> **任务定义：** 在 Decision Case 推演之前，把 Raw 变成**可挂到决策上的证据**。

---

## 〇、认知修正（必须先读）

### 0.1 错误理解

```text
每天抓新闻 / 竞品价格 / 评论 → 塞给 GPT
```

价值有限，且会把 MealKey 做成资讯 App。

### 0.2 正确理解（冻结）

> **M-INTEL = Decision Evidence Engine（决策证据引擎）。**  
> 持续感知是手段；**产出挂在 Decision Case 上的 Evidence** 才是目的。

| 不是 | 是 |
|------|-----|
| 情报 Agent / 爬虫 | Evidence 流水线 |
| 碎新闻 | 「商圈+变化+对本店影响」的证据句 |
| 收集老板资料 | **Restaurant State 经营状态模型**日更 |
| 战略结论 | Evidence / Event / Signal / GapQuestion |

流水线（冻结）：

```text
Raw Data → Information → Event → Impact Analysis → Decision Evidence
```

### 0.3 一句话

> 决策需要的不是信息，是证据；感知不是为了知道更多，而是为了决策时不至于无知。

### 0.4 禁止（冻结）

1. **禁止**把 M-INTEL 当成「新闻/点评爬虫产品」  
2. **禁止**原始网页/新闻直接进 Prompt 当结论  
3. **禁止**顾问席 / 第八常委 / `FounderAgentName`  
4. **禁止**第七 Runtime  
5. **禁止**平行于 Brain 的第二套内部事实主库  
6. **禁止**无来源硬数字进 Decision Context  
7. **禁止**无限采集：采集必须 **Decision Driven**  
8. **禁止** Daily Decision Brief 做成 KPI 驾驶舱  

---

## 一、在 MealKey 中的位置（冻结）

```text
                 用户
                  |
          Decision Center          ← 感知入口（经营晨会）
                  |
        Decision Intelligence Engine  ← 推演壁垒
                  |
                  | 只读 Decision Context
                  |
        +---------+---------+
        |                   |
 Restaurant Brain        M-INTEL
 （内部认知 SSOT）     （持续感知系统）
 存理解 / DNA / 学习    Internal + External Sense
        |                   |
        +---------+---------+
                  |
           Decision Context   ← 见 DECISION_CONTEXT_V1
                  |
             七常委决策
                  |
               M-EXEC
                  |
              结果反馈
                  |
         Restaurant Brain 进化
```

| 组件 | 职责 |
|------|------|
| **Restaurant Brain** | 内部认知与记忆的 **SSOT**（存） |
| **M-INTEL** | 持续感知与事件化（采 → 洗 → 事件 → 供 Context） |
| **DIE** | 在 Context 上重构/推演/挑战（判） |
| **Decision Center** | 把 Brief/Scan 变成老板每天打开的门 |

**三者合成「经营大脑」：** Brain（懂这家店）+ M-INTEL（持续感到变化）+ DIE（推演决策）。

---

## 二、三层架构（冻结）

### Layer 1：Internal Sense（内部感知）

**目标问题：**「我的餐厅现在真实状态是什么？」

| 通道 | 形态 | V1 |
|------|------|----|
| **A. 老板主动输入** | 每天约 30 秒：营业额 / 客流 / 最大问题（分档优先） | **必做** |
| **B. 系统自动同步** | POS / 订单 / 会员 / 财务 / 库存 | **接口预留**；未接则降级 |
| **C. AI 智能追问** | 发现异常 → 主动问（如利润降：「最近是否加人？」） | **必做**（规则+轻模型） |

```text
主动采集 + 被动同步 + 智能追问
        ↓
   Restaurant State（理解，不是报表）
        ↓
   写回 Restaurant Brain
```

### Layer 2：External Sense（外部感知）

**目标问题：**「外面的世界发生了什么？」

六大类（冻结）：

| # | 域 | 感知什么（例） | 决策用途 |
|---|-----|----------------|----------|
| 1 | 品类趋势 | 热度、消费升降、新品类 | 机会/风险 |
| 2 | 竞争环境 | **变化**（新增店、均价 68→59） | 价格压力阶段等 |
| 3 | 消费者变化 | 评价主题从「正宗」→「性价比」 | 套餐/定位议题 |
| 4 | 政策环境 | 食安、房租、用工 | 成本/合规 |
| 5 | 商圈变化 | 办公减少、学校增加 | 午晚市结构 |
| 6 | 标杆案例 | 增长/转型/失败教训 | 路径参照（非抄作业） |

V1 深度：窄域 + 有来源；全网爬虫农场后置。

### Layer 3：Intelligence Processing（处理层 · 非爬虫→GPT）

```text
原始信息
  → 清洗
  → 实体识别
  → 事件提取（Intelligence Event）
  → 影响判断（对象 / 方向 / 指标 / 相关决策）
  → 进入 Decision Context / Daily Decision Brief
```

**铁律：** 不进 Context 的原始噪声，等于没采。

---

## 三、Internal Sense：经营状态模型 Restaurant State（冻结）

> 目标不是「收集老板资料」，而是 **建立并日更经营状态模型**（理解，非报表）。

```text
经营状态
├── Growth
├── Profitability
├── Customer
├── Product
├── Organization
├── Finance
└── Owner Capability
```

日更示例：Growth 80→75、Customer 70→65 → 触发 **Decision Signal** 候选。  
字段 SSOT：`contracts/decision-intel-data.ts` · `RestaurantStateV1`。  
DNA Onboarding = 冷启动；日常 = 30 秒脉搏 + 智能追问；POS 同步后置。

---

## 四、核心输出：Intelligence Event（冻结）

**不要存无结构新闻。** 必须转换成事件：

```typescript
type IntelligenceEventV1 = {
  eventId: string;
  kind: string;                 // e.g. "competition_price_down"
  title: string;                // 「竞争价格下降」
  object: string;               // 「湘菜市场 / 本商圈」
  impact: string;               // 「客单价压力增加」
  impactDirection: "positive" | "negative" | "mixed" | "neutral";
  impactMetrics: string[];      // 「客单价」「客流」
  relatedDecisions: string[];   // 「是否调整套餐」
  confidence: number;           // 0–1；无依据不得虚高
  domain: "internal" | "category" | "competition" | "consumer"
    | "policy" | "trade_area" | "benchmark";
  sourceLabel: string;          // 必填
  observedAt: string;
  rawRef?: string;              // 可选原始引用 id，不进老板主文案
};
```

> M-INTEL 输出不是数据，是 **可用于决策的情报**。

---

## 五、Daily Decision Brief（每日决策简报 · 冻结）

每天打开 MealKey 的理由之一：不是数据，是 **决策信号**。

```text
## 今日变化（过去 24h）
内部：昨日营业额下降 8%（有数才量化）
外部：附近新增竞争店
用户：价格敏感词上升

## AI 判断（信号级，非终局）
核心风险正在从「客流不足」转向「价格竞争」

## 推荐决策
建议讨论：是否推出晚餐高性价比套餐？
```

**投影：** → `DailyScanV1` / Decision Center（**禁止**平行首页管道）。  
命名：产品可用「今日经营情报」；契约名 `DailyDecisionBriefV1`（兼容旧称 Daily Intelligence Brief）。

---

## 六、采集策略：Decision Driven（冻结）

信息采集 **服务决策**，不无限采。

| 场景 | 行为 |
|------|------|
| 无扩店议题 | **不**拉高选址权重 |
| 老板问「要不要开新店」 | 提升：现金 / 组织 / 市场容量 / 竞争 / 选址 |
| Gap | 每次 ≤3 问；停答先采 |

形成 **动态信息地图**：议题 → 权重 → 感知优先级 → Context 切片。

---

## 七、与模型的关系（冻结）

```text
❌ 爬虫 → GPT → 建议

✅ 原始信息 → Processing → Intelligence Event
         → Decision Context → DIE / 七常委 → 建议
```

LLM 可参与清洗/事件抽取/润色，**不得**跳过事件层直接终局。

---

## 八、壁垒句（冻结）

```text
GPT：知识库 → 回答

MealKey：持续感知 → 理解一家餐厅 → 经营认知
       → 辅助决策 → 验证结果 → 越来越懂这家店
```

差异不在模型强弱，在 **感知 → 认知 → 决策 → 验证** 飞轮。

---

## 九、工程切片（修正后）

| 切片 | 交付 | 验收 |
|------|------|------|
| **I0** | 本文定位修正 + Event/State 契约 | 「非爬虫」对齐 |
| **I1** | DNA 冷启动 + Restaurant State 初值 | 15 分钟可解释状态 |
| **I2** | 30 秒脉搏 + 智能追问（异常触发） | 不靠长表单维持 State |
| **I3** | Gap Detector（决策驱动 ≤3） | 扩店缺信息时停答先采 |
| **I4** | Intelligence Event 管线（内规则为主） | 输出事件而非新闻标题 |
| **I5** | Daily Decision Brief → Scan | 晨会是决策信号 |
| **I6** | External Sense 窄域（竞争变化优先） | 有来源；进 Context |
| **C0–C2** | Decision Context 组装 | 见 `MEALKEY_DECISION_CONTEXT_V1.md` |

---

## 十、成功标准（V1）

1. 决策前能回答：对这家店，我们 **知道什么 / 缺什么**。  
2. 外部输入以 **Event** 出现，而非新闻列表。  
3. Brief 能推动 **一张 Decision Card**，不是资讯流。  
4. 无 POS 时，靠脉搏+追问仍可维持 State（置信明示）。  
5. M-INTEL **从不**单独说「建议你开第二家」。  

---

## 十一、文档关系

| 文档 | 关系 |
|------|------|
| **本文** | 感知系统真源 |
| `MEALKEY_DECISION_CONTEXT_V1.md` | **桥梁**：Context / Evidence / Score / 常委输入 |
| `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md` | 推演；只读 Context |
| `MEALKEY_DECISION_CENTER_V1.md` | Brief → 晨会 |
| `MEALKEY_RESTAURANT_BRAIN_*` | 内部认知 SSOT |

---

**一句话：**  
M-INTEL 不是爬虫，而是决策前的**持续感知与事件化系统**——让 MealKey 在开口推演之前，已经对这家餐厅和它的世界「够懂」。

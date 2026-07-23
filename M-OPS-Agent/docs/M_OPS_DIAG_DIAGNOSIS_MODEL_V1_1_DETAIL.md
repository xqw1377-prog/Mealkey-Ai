# M-OPS-Agent V1.1 · 诊断模型详细设计

> **版本：** V1.1 Detailed
> **状态：** Draft Freeze
> **日期：** 2026-07-21
> **产品：** 餐启经营诊断（`m-ops-diag`）
> **定位：** Delta-Driven Restaurant Health Intelligence
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `M_OPS_DIAG_UX_V1.md`

---

## 0. 一句话

> M-OPS 不诊断「餐厅好不好」，而诊断「餐厅正在发生什么变化，以及变化意味着什么」。

它不是报告生成器，而是经营感知引擎。

---

## 1. 总模型

运行时总链路冻结为：

```text
Restaurant World
  ↓
Restaurant Identity
  ↓
Fact / Evidence Ingestion
  ↓
Delta Detection
  ↓
Pattern Recognition
  ↓
Business Meaning
  ↓
Finding / Signal / Insight / Gap
  ↓
MealKey Decision System
```

### 1.1 关键原则

- 不做静态总分，做变化判断。
- 不做行业空话，做主体绑定观察。
- 不直接拍板，只提出值得关注的问题。
- 不重新写一篇散文报告，而是持续维护健康快照。

---

## 2. 六层诊断链

### Layer 0 · Restaurant Identity

回答：我诊断的是谁？

最小锚点：

```json
{
  "brand": "等里长沙",
  "store": "岳麓店",
  "city": "长沙",
  "area": "岳麓区",
  "category": "湘菜",
  "price": "80元",
  "stage": "single_store"
}
```

没有 Identity 锚点，不允许把外部信息升级成强结论。

### Layer 1 · Restaurant Fact Layer

事实来源分四类：

- `owner_fact`：老板主动提供
- `system_fact`：系统连接数据
- `external_evidence`：公开平台与外部世界
- `inferred_fact`：系统推理得到，必须显式标注

### Layer 2 · Delta Detection

诊断中心不再是「状态描述」，而是「状态变化」：

```text
过去状态
  -
当前状态
  =
变化
```

变化至少回答：

- 什么变了
- 变强还是变弱
- 幅度多大
- 由哪些证据触发

### Layer 3 · Pattern Recognition

把离散变化聚合成经营模式。

例：

```text
等待投诉增加
  +
集中在晚餐高峰
  +
多人聚餐评论场景
  =
高峰承载能力不足
```

### Layer 4 · Business Meaning

把模式翻译成经营含义。

例：

```text
问题不是产品吸引力不足
而是接待能力正在限制复购
```

### Layer 5 · Output Objects

最终输出：

- `Finding`
- `Pattern`
- `Meaning`
- `Signal`
- `Insight`
- `Gap`

---

## 3. 六大健康模型

### 3.1 Customer Health

核心问题：顾客还喜欢你吗？

观察：

- 满意度结构
- 口碑趋势
- 顾客记忆点
- 流失原因

### 3.2 Product Health

核心问题：菜品还有竞争力吗？

观察：

- 招牌菜稳定度
- 新品形成率
- 评价矩阵
- 生命周期

### 3.3 Service Health

核心问题：顾客体验在哪里断裂？

观察：

- 等待
- 态度
- 响应
- 卫生
- 流程

### 3.4 Operation Health

核心问题：店的经营效率有没有异常？

观察：

- 高峰承载
- 人效
- 排班稳定
- 人货场约束

### 3.5 Competition Health

核心问题：你的市场位置有没有变化？

观察：

- 500 米竞品变化
- 同价位竞争
- 活动变化
- 新店进入

### 3.6 Growth Health

核心问题：有没有正在出现的新增长机会？

观察：

- 内容热词
- 聚餐/家庭/打卡场景
- 曝光与转化线索
- 品牌心智机会

---

## 4. Health State

每个健康维度都采用五级状态：

```text
Healthy   正常
Observe   观察
Attention 关注
Risk      风险
Critical  严重
```

### 4.1 规则

- `Healthy`：稳定且无明显负向变化
- `Observe`：有变化，但暂不足以上升为问题
- `Attention`：持续变化，需要老板注意
- `Risk`：已对复购、评价、客流或竞争位置形成实际影响
- `Critical`：只有在高可信强证据下才允许触发

---

## 5. Delta Engine

`Delta Engine` 是每日扫描的第一入口。

### 5.1 输入

- `previousSnapshot`
- `todayEvidence`
- `todayFacts`

### 5.2 输出

```text
dimension
fromLevel
toLevel
direction
magnitude
trigger
impactSummary
```

### 5.3 硬规则

- 每条 `Signal` 必须至少有一个 `Delta` 支撑。
- 没有变化的内容，不进入今日主位。
- 没有证据的变化，不得升级为强结论。

---

## 6. 核心输出对象

### Finding

可核验的变化发现。

例：

```text
近30天等待相关评价增加42%
```

### Pattern

变化背后的结构模式。

例：

```text
问题集中在晚餐高峰、周末、多人聚餐
```

### Meaning

该变化对经营的含义。

例：

```text
当前增长受接待能力限制，而不是产品吸引力不足
```

### Signal

进入 MealKey 的经营信号。

例：

```json
{
  "type": "SERVICE_RISK",
  "severity": "medium",
  "title": "晚餐高峰服务体验下降",
  "recommendedDecision": "是否优化晚高峰服务流程"
}
```

### Insight

供决策室继续展开的问题框架，不是拍板结论。

### Gap

当前关键证据缺失点，用于诚实降级。

---

## 7. 与 GPT 的边界

普通 GPT：

```text
用户提问
  ↓
模型回答
```

M-OPS：

```text
系统观察变化
  ↓
收集证据
  ↓
识别趋势
  ↓
判断影响
  ↓
提醒老板是否值得关注
```

---

## 8. 工程落地要求

- `contracts.ts` 必须引入 `Health State / Delta / Snapshot`。
- `engine.ts` 必须先产出 `health`，再投影为 `signals / insights / gaps`。
- 保持与现有 `RestaurantDiagnosisResult` 兼容，避免打断前端和 Gateway。
- 新模型优先服务 `Customer / Service / Operation` 三个高价值维度，其余维度先诚实占位。

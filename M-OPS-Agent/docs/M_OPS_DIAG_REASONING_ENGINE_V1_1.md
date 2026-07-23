# M-OPS-Agent V1.1 · 诊断推理引擎设计

> **版本：** V1.1  
> **状态：** Draft Freeze  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **定位：** Restaurant Diagnosis Intelligence Engine  
> **简称：** RDIE  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1_1_DETAIL.md` · `M_OPS_DIAG_DATA_INTELLIGENCE_V1_1.md` · `M_OPS_DIAG_KNOWLEDGE_MODEL_V1_2.md` · `M_OPS_DIAG_UX_V1.md`

---

## 0. 一句话

> 前面的数据采集解决「知道发生了什么」；RDIE 解决「为什么发生、影响多大、是否值得老板关注、下一步如何验证」。

没有这一层，M-OPS 只是评论总结工具；有了这一层，M-OPS 才是经营诊断系统。

---

## 1. 战略定位

普通 AI：

```text
评论：服务不好
  ↓
回答：提高服务质量
```

这是总结，不是诊断。

RDIE：

```text
评论变化
  ↓
异常识别
  ↓
模式发现
  ↓
原因假设
  ↓
经营影响
  ↓
验证建议
  ↓
Business Signal
```

这是一套像优秀店长、运营总监一样思考的推理链。

---

## 2. 核心诊断链路（冻结）

```text
Evidence
  ↓
Observation
  ↓
Pattern
  ↓
Hypothesis
  ↓
Impact Assessment
  ↓
Validation
  ↓
Business Signal
```

### 2.1 Evidence

原始事实或结构化证据。

例：

```text
过去 7 天：
- 大众点评新增 32 条评价
- 其中 12 条提到等待
- 等待关键词提及速度显著增加
```

硬规则：

- 必须能追溯来源
- 必须有时间上下文
- 必须标注可信度或来源权重

### 2.2 Observation

先描述变化，不直接下结论。

例：

```text
最近 7 天顾客关于等待时间的负面反馈明显增加
```

Observation 的任务是“把变化说清”，不是“把原因说死”。

### 2.3 Pattern

寻找重复结构和场景集中。

例：

```text
等待问题：
- 集中在周五晚餐
- 集中在多人聚餐用户
- 与高峰时间明显相关
```

Pattern 是可复用的经营结构，不是散点评论摘要。

### 2.4 Hypothesis

生成多个可能原因，而不是伪装成唯一真相。

例：

```text
原因 A：高峰产能不足      65%
原因 B：前厅排队管理不足  25%
原因 C：菜品制作复杂度提高 10%
```

硬规则：

- 允许多个假设并存
- 每个假设都要给出置信度
- 无证据支持的假设不得升为主判断

### 2.5 Impact Assessment

判断这件事的经营影响，而不是只说“有问题”。

至少覆盖：

- 对收入的影响
- 对复购的影响
- 对品牌认知的影响
- 对运营效率的影响

### 2.6 Validation

不是直接给老板拍板，而是给出下一步最值得验证什么。

例：

```text
验证建议：
- 对比工作日与周末晚餐出菜节奏
- 核查烤炉产能与排队峰值
- 查看等位阶段是否出现前厅管理断点
```

### 2.7 Business Signal

只有当证据、模式、影响、验证路径都基本成立时，才允许进入 Signal。

---

## 3. RDIE 的设计原则

- 先描述变化，再解释变化
- 先给出模式，再给出原因假设
- 先输出假设，再给出验证路径
- 不把推理当事实
- 不把建议当决策
- 不给老板 20 个问题，只给最值得看的少量问题

---

## 4. 六大诊断引擎

RDIE 不是一个大 Prompt，而是多个诊断器的组合。

```text
M-OPS Diagnosis Engine
   ├── Customer Engine
   ├── Operation Engine
   ├── Product Engine
   ├── Financial Engine
   ├── Competition Engine
   ├── Brand Engine
   └── Growth Engine
```

V1.1 工程优先顺序依然遵循产品优先级，但推理协议按七引擎能力先冻结。

### 4.1 Customer Engine

回答：

```text
顾客怎么看你？
```

输入：

- 点评
- 小红书
- 抖音
- 私域反馈

输出：

`Customer Perception Map`

例：

```text
优势：
- 湘菜味道
- 环境

弱点：
- 等位
- 服务速度

机会：
- 年轻情侣场景增加

风险：
- 价格敏感增强
```

核心模型：

```text
Expectation
  VS
Experience
  ↓
Gap
```

关键价值：

- 识别品牌承诺与顾客体验是否出现偏差
- 把“顾客说了什么”升级成“顾客是怎么理解你的”

### 4.2 Operation Engine

回答：

```text
店为什么效率不好？
```

这是 V1.1 第一优先的诊断器。

输入：

- 等待
- 翻台
- 服务评价
- 人员反馈
- 高峰/低谷时段

核心模型：

`Service Flow Graph`

```text
顾客进入
  ↓
等位
  ↓
点餐
  ↓
出菜
  ↓
用餐
  ↓
结账
```

每个节点都要计算：

- 问题频率
- 影响程度
- 趋势变化

例：

```text
出菜慢
  +
差评主要集中在周末
  +
工作日基本正常
  =
更像峰值承载问题，而不是全时段厨房能力问题
```

### 4.3 Product Engine

回答：

```text
菜品是不是满足市场？
```

分析：

- 菜品生命周期
- 评价趋势
- 招牌菜提及变化
- 菜单结构

生命周期：

```text
爆品
增长品
稳定品
衰退品
问题品
```

例：

```text
招牌菜过去长期高提及
现在提及减少 70%
  =
品牌资产正在衰减
```

同时需要区分：

- 高销量低利润
- 低销量高利润
- 高潜菜
- 拖累菜

### 4.4 Financial Engine

回答：

```text
当前经营问题是否已经影响盈利结构？
```

V1.1 不强制产出复杂财务模型，但要冻结边界。

输入：

- 营收趋势
- 客单
- 成本压力
- 毛利或近似利润结构

职责：

- 识别问题是否已经从体验层传导到收入层
- 给出“收入/成本/利润”影响强度

没有足够内部事实时：

- 允许降级为 `Gap`
- 禁止伪造利润结论

### 4.5 Competition Engine

回答：

```text
外面发生什么变化？
```

不是列对手，而是发现外部世界变化。

例：

```text
过去 90 天附近新增 3 家低价湘菜
同时你的差评中“价格贵”增加
  =
价格认知被重新定义
```

核心职责：

- 看新开店 / 闭店
- 看价格带变化
- 看活动变化
- 看竞品评价变化

### 4.6 Brand Engine

回答：

```text
顾客脑中你是谁？
```

连接 M-PNT，但不替代 M-PNT。

模型：

```text
品牌表达
  ↓
顾客认知
  ↓
竞争位置
  ↓
定位偏差
```

例：

```text
老板认为：年轻湘菜
顾客评价：更适合家庭聚餐
  =
品牌认知已经变化
```

### 4.7 Growth Engine

回答：

```text
下一步增长在哪里？
```

分析链：

```text
新客来源
  ↓
首次体验
  ↓
复购
  ↓
推荐
```

例：

```text
小红书收藏很多
但点评复购弱
  =
获客强，转化弱
```

职责：

- 识别机会信号
- 判断增长断点
- 给出最值得验证的增长假设

---

## 5. Hypothesis Engine

Hypothesis 是 RDIE 的核心能力，不允许被一句“因为厨房慢”替代。

### 5.1 输入

- Observation
- Pattern
- Identity / Context
- Historical Snapshot

### 5.2 输出

每个问题至少生成：

- 主假设 1 个
- 备选假设 1-2 个

结构：

```text
Hypothesis
- title
- reasoning
- confidence
- requiredEvidence
- validationQuestion
```

### 5.3 规则

- 假设必须能被验证
- 假设必须与证据链一致
- 假设之间可以竞争，不强行合并
- 证据不足时允许“未知原因”

---

## 6. Impact Assessment

每天不能只告诉老板“有问题”，还要告诉老板“这件事值不值得管”。

### 6.1 评估维度

- 严重度
- 影响人数
- 趋势速度
- 证据可信度
- 解决成本

### 6.2 Impact Score

冻结公式：

```text
Impact Score
=
问题严重度
×
影响人数
×
趋势速度
×
证据可信度
÷
解决成本
```

### 6.3 用途

- 决定是否进入今日焦点
- 决定 Signal severity
- 决定是否升格为 Decision Room 议题

### 6.4 例子

```text
等待增加：
严重度 8
影响人数 9
趋势 7
可信度 9
解决成本 5
```

高分问题进入今日主位。

---

## 7. Attention Priority

老板每天只看最重要的少数问题。

### 7.1 今日上屏规则

- 最多 3 个 Signal
- 默认 1 个主风险 + 1 个机会 + 1 个稳定或变化摘要
- 低 Impact 的问题只进入观察区

### 7.2 观察区规则

以下情况不直接生成主 Signal：

- 证据不足
- Pattern 不明确
- 影响不够大
- 没有可行动验证路径

这些问题进入：

- `Observe`
- `Watchlist`
- `Gap`

---

## 8. Signal 生成规则（冻结）

只有同时满足以下条件才允许生成 Signal：

```text
Evidence ≥ 2
Pattern 明确
Impact > 阈值
Action 可能
```

否则只能进入观察。

### 8.1 Signal 结构

```typescript
BusinessSignal {
  id
  title
  severity
  category
  evidence[]
  pattern
  hypothesis[]
  impact
  confidence
  recommendedValidation
}
```

### 8.2 Signal 的最小问题集

每条 Signal 必须能回答：

- 发生了什么
- 为什么可能发生
- 影响什么
- 下一步应该验证什么

---

## 9. 反胡乱归因规则

这是 RDIE 是否可信的核心。

### 9.1 禁止

- 单条评论直接推出根因
- 把推断写成事实
- 用常识句顶替证据判断
- 在无内部数据时直接断言厨房、排班、利润问题

### 9.2 必须

- 先 Observation，再 Pattern，再 Hypothesis
- 给多个原因备选
- 标明置信度
- 标明需要补充验证的事实

### 9.3 降级机制

证据不足时：

- 降级为 `Observation`
- 或进入 `Gap / Watchlist`

而不是硬生成 Signal。

---

## 10. 与 Decision Room 的边界

M-OPS 不决策，只发现问题、形成诊断、提出验证问题。

```text
M-OPS
  发现问题
  形成诊断
  提出验证

Decision Intelligence
  判断如何选择

M-EXEC
  执行
```

例：

```text
M-OPS：
最近 30 天等待问题增加

Decision Room：
是否调整服务流程？
是否增加晚班人员？
是否优化菜单结构？
```

---

## 11. 飞轮

```text
每天采集
  ↓
发现变化
  ↓
诊断原因
  ↓
生成 Signal
  ↓
老板进入决策室
  ↓
做决定
  ↓
执行
  ↓
结果反馈
  ↓
模型学习
  ↓
越来越懂这家店
```

---

## 12. 工程落地顺序

### Phase 1

先打穿：

- Customer Engine
- Operation Engine
- Hypothesis Engine
- Impact Score
- Signal Gate

### Phase 2

补充：

- Product Engine
- Competition Engine

### Phase 3

连接：

- Brand Engine
- Growth Engine
- Financial Engine

### Phase 4

把 RDIE 升格为可复用平台能力，为后续第三方 Agent 提供统一诊断协议。

---

## 13. 下一步

下一刀进入：

`M_OPS_DIAG_KNOWLEDGE_MODEL_V1_2.md`

用于冻结：

1. `Evidence` 怎么存
2. `Pattern` 怎么形成
3. `Diagnosis Case` 怎么生命周期管理
4. `Signal` 如何进入 MealKey
5. 如何让第三方 Agent 复用诊断协议

---

## 14. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.1 Draft Freeze | 2026-07-21 | 冻结 RDIE 总链路、六大诊断引擎、Hypothesis Engine、Impact Score、Signal Gate、Decision Room 边界 |
| V1.2 Knowledge Link | 2026-07-21 | 补充诊断知识模型与数据结构真源引用，形成 Data → Reasoning → Knowledge 连续链路 |

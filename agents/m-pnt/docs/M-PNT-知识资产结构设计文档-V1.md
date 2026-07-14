# M-PNT 知识资产结构设计文档 V1

## 1. 文档信息

| 项 | 内容 |
|---|---|
| 版本 | V1.0 |
| 依赖文档 | 《M-PNT 餐饮品牌定位决策引擎 V1.2 产品定义文档》<br>《M-PNT 专业模型设计文档 V1》（当前仓库为 V1.0）<br>《M-PNT Prompt 体系设计文档 V1》 |
| 目标 | 定义 M-PNT 的知识资产类型、数据结构、组织方式、调用关系与维护原则 |
| 日期 | 2026年7月 |

---

## 2. 文档目标

本文件回答的问题是：

> M-PNT 需要怎样的知识资产结构，才能稳定支持品牌定位判断、多方案生成、三理论碰撞、风险挑战与最终输出。

这份文档**不讨论具体数据库技术选型**，而定义上层知识结构。

它的目标是让 M-PNT 的知识资产满足以下要求：

- 可被结构化存储
- 可被 Prompt 稳定调用
- 可被不同模块复用
- 可持续扩展和维护
- 能支撑「品牌定位决策」而不是一般知识问答

---

## 3. 总体原则

### 3.1 知识资产不等于资料堆积

M-PNT 需要的不是一堆文章、截图、案例介绍，而是**可参与判断的结构化资产**。

### 3.2 一切知识必须服务于决策

所有知识对象都必须能回答以下至少一个问题：

- 这个方向是否成立
- 这个风险是否真实
- 这个方案为什么优于其他方案
- 这个定位如何被消费者记住

### 3.3 理论、案例、规则、心智资产必须分层

如果所有内容都混在一起，后续调用会非常混乱。

### 3.4 知识资产必须支持多理论调用

Ries、Trout、Ye Maozhong 三个理论视角，都需要能从同一知识底座中提取各自所需内容。

### 3.5 优先设计「知识对象」，而不是「知识文档」

面向对象设计比文档式堆叠更适合后续 Prompt 调用和模块复用。

---

## 4. 知识资产总架构

M-PNT 的知识资产建议分为七类：

```text
1. Theory Rules
2. Positioning Patterns
3. Case Assets
4. Challenge Rules
5. Mental Assets
6. Market & Competition Assets
7. Output Schemas
```

它们在整体中的作用分别是：

| 资产类型 | 作用 |
|---|---|
| Theory Rules | 提供判断原理 |
| Positioning Patterns | 提供常见成功 / 失败模式 |
| Case Assets | 提供真实决策经验 |
| Challenge Rules | 提供风险挑战逻辑 |
| Mental Assets | 提供心智语言与联想资产 |
| Market & Competition Assets | 提供市场与竞品参照 |
| Output Schemas | 提供标准化输出结构 |

---

## 5. Theory Rules

### 5.1 定义

Theory Rules 是把定位理论蒸馏成**可执行判断规则**后的知识对象。

### 5.2 作用

主要用于：

- 支撑六维判断框架
- 支撑三理论 Agent 的独立推理
- 支撑最终推荐时的解释逻辑

### 5.3 标准结构

```text
TheoryRule

- id
- theory_source
- name
- principle
- decision_question
- applicable_context
- key_variables
- decision_rules
- anti_patterns
- output_implication
- theory_view_tag
```

### 5.4 字段说明

| 字段 | 说明 |
|---|---|
| theory_source | 例如 ries、trout、ye_maozhong |
| principle | 核心原理 |
| decision_question | 这个规则主要用来回答什么问题 |
| applicable_context | 适用项目类型 |
| decision_rules | 转化后的判断规则 |
| anti_patterns | 对应反模式 |
| output_implication | 如何影响最终输出 |
| theory_view_tag | 支持三理论矩阵调用 |

### 5.5 示例

```text
TheoryRule
- theory_source: trout
- name: 聚焦单一心智锚点
- principle: 品牌应在消费者心智中建立一个简单清晰的认知位置
- decision_question: 当前定位是否足够聚焦
- decision_rules:
  - 定位语必须可一句话复述
  - 不应同时覆盖多个无强关联场景
  - 不应同时服务多个核心客群
- anti_patterns:
  - 面向所有人
  - 什么都想表达
  - 价值点过多
```

---

## 6. Positioning Patterns

### 6.1 定义

Positioning Patterns 用于沉淀高频出现的定位模式，包括成功模式、失败模式和可复用模式。

### 6.2 作用

主要用于：

- 多方案生成时提供原型参考
- 风险挑战时提供反模式识别
- 三理论 Agent 调用时快速归类

### 6.3 类型

建议分为三类：

- `success_pattern`
- `failure_pattern`
- `strategy_pattern`

### 6.4 标准结构

```text
PositioningPattern

- id
- name
- pattern_type
- summary
- typical_context
- trigger_signals
- positioning_formula
- success_reason
- failure_modes
- recommended_usage
- not_recommended_when
- theory_alignment
```

### 6.5 示例

```text
PositioningPattern
- name: 家庭聚餐型品牌定位
- pattern_type: strategy_pattern
- typical_context:
  - 家庭消费占比较高
  - 高频周末聚餐
  - 情感价值强于极致专业性
- positioning_formula:
  - 品类 + 家庭场景 + 情感价值
- failure_modes:
  - 场景太泛
  - 环境与体验支撑不足
  - 儿童 / 家庭友好能力不成立
```

---

## 7. Case Assets

### 7.1 定义

Case Assets 是围绕「品牌定位决策过程」而组织的案例对象。

### 7.2 作用

主要用于：

- 提供真实决策路径
- 支撑 Few-shot
- 支撑类比推理
- 支撑风险验证

### 7.3 标准结构

```text
CaseAsset

- id
- brand_name
- category
- city_context
- market_stage
- project_stage
- initial_problem
- resource_condition
- competition_context
- candidate_positions
- final_position
- why_choose
- why_not_others
- differentiation_design
- execution_actions
- market_feedback
- result_summary
- success_or_failure
- mental_takeaway
- reusable_principles
- risk_lessons
- theory_tags
```

### 7.4 必须保留的信息

每个案例至少应明确：

- 面对的竞争环境
- 出现过哪些候选方向
- 最终为什么这样选
- 结果如何
- 有什么可复用原则

### 7.5 案例分层

建议按质量分为：

| 等级 | 说明 |
|---|---|
| gold_case | 决策过程完整、结果清晰、强复用价值 |
| silver_case | 信息较完整，可用于参考 |
| bronze_case | 信息有限，只能作辅助参考 |

---

## 8. Challenge Rules

### 8.1 定义

Challenge Rules 是从失败案例、反模式和风险逻辑中提炼出的挑战规则对象。

### 8.2 作用

主要用于：

- 风险识别
- 红队挑战
- 方案淘汰
- 质量校验

### 8.3 标准结构

```text
ChallengeRule

- id
- name
- risk_type
- trigger_condition
- challenge_questions
- typical_failure_signal
- severity_level
- elimination_condition
- mitigation_direction
- linked_patterns
- linked_theories
```

### 8.4 常见风险类型

建议统一使用以下风险类型：

| risk_type | 含义 |
|---|---|
| mental_confusion | 心智混乱 |
| customer_blur | 客群模糊 |
| scene_weakness | 场景薄弱 |
| competition_overlap | 竞争重叠 |
| resource_mismatch | 资源不匹配 |
| execution_fragility | 执行脆弱 |
| defensibility_low | 防御性不足 |

### 8.5 示例

```text
ChallengeRule
- name: 客群过宽风险
- risk_type: customer_blur
- trigger_condition:
  - 第一目标客群超过两类
  - 需求动机明显不同
- challenge_questions:
  - 谁才是第一客户
  - 哪个客群会最先选择你
  - 若只能保留一类客户，应保留谁
- severity_level: R3
- elimination_condition:
  - 无法明确第一客群
```

---

## 9. Mental Assets

### 9.1 定义

Mental Assets 是与品牌心智占位直接相关的语言、联想、场景和认知资产。

### 9.2 作用

这是 M-PNT 区别于一般战略分析工具的关键资产，用于支撑：

- 心智占位判断
- 定位语生成
- 场景绑定判断
- 竞品区隔分析

### 9.3 资产类型

建议至少包含以下五类：

- `mental_keywords`
- `scene_triggers`
- `first_association_terms`
- `price_anchor_terms`
- `emotional_value_terms`

### 9.4 标准结构

```text
MentalAsset

- id
- asset_type
- term
- meaning
- target_customer_tags
- scene_tags
- category_tags
- mental_effect
- competitor_overlap_level
- cultural_relevance
- usage_notes
```

### 9.5 示例

```text
MentalAsset
- asset_type: scene_triggers
- term: 周末家庭团聚
- target_customer_tags:
  - 年轻家庭
  - 亲子家庭
- mental_effect:
  - 情感强
  - 高频稳定
  - 易形成品牌记忆
```

---

## 10. Market & Competition Assets

### 10.1 定义

Market & Competition Assets 用于支撑市场机会判断和竞争位置判断。

### 10.2 作用

主要用于：

- 竞争密度评估
- 品类地图生成
- 竞品心智位置判断
- 多方案比较时的参照系建立

### 10.3 资产分类

建议分为：

- `category_map`
- `competition_map`
- `competitor_profile`
- `market_signal`
- `city_scene_profile`

### 10.4 竞品对象结构

```text
CompetitorProfile

- id
- brand_name
- category
- city
- main_positioning
- mental_keywords
- main_scene
- target_customer
- price_band
- differentiation_basis
- strengths
- weaknesses
- occupancy_strength
```

### 10.5 品类地图对象结构

```text
CategoryMap

- id
- category_name
- main_segments
- common_positioning_types
- crowded_positions
- white_space_positions
- key_customer_groups
- key_scene_groups
- price_structure
```

---

## 11. Output Schemas

### 11.1 定义

Output Schemas 不是知识内容，而是知识驱动后的**标准输出结构资产**。

### 11.2 作用

主要用于：

- 保证所有输出统一
- 保证不同 Prompt / Agent 输出可拼接
- 保证最终结果可沉淀进 Brain

### 11.3 主要 Schema

建议至少定义以下几个：

- SituationSchema
- InsightSchema
- CandidatePositionSchema
- TheoryViewSchema
- CrossFireSchema
- DecisionSchema
- FinalSolutionSchema

### 11.4 FinalSolutionSchema

建议结构：

```text
FinalSolutionSchema

1. Situation
2. Insight
3. Position
4. Strategy
5. Action
6. Validation
7. Decision
```

---

## 12. 知识资产之间的关系

M-PNT 的知识资产不是孤立存在的，而是有明确调用关系。

### 12.1 典型调用链

```text
Theory Rules
 + Positioning Patterns
 → 形成判断基础

Case Assets
 + Market & Competition Assets
 → 形成项目参照

Mental Assets
 → 形成心智判断与表达基础

Challenge Rules
 → 形成淘汰与风险挑战

Output Schemas
 → 形成统一输出
```

### 12.2 在 Prompt 体系中的挂载位置

| Prompt | 调用资产 |
|---|---|
| 主 System Prompt | Theory Rules + Output Schemas |
| Position 生成 Prompt | Positioning Patterns + Mental Assets |
| 三理论 Agent Prompt | Theory Rules + Case Assets |
| Cross-Fire Prompt | Challenge Rules |
| Final Output Prompt | Output Schemas |

---

## 13. 组织方式建议

### 13.1 一级目录建议

```text
knowledge/
  theory-rules/
  positioning-patterns/
  case-assets/
  challenge-rules/
  mental-assets/
  market-assets/
  output-schemas/
```

### 13.2 二级组织建议

可按以下方式继续划分：

- 按理论来源
- 按品类
- 按客群
- 按场景
- 按城市
- 按案例质量等级

---

## 14. 调用策略建议

### 14.1 检索优先顺序

建议调用顺序为：

1. 先调 Theory Rules
2. 再调与项目匹配的 Case Assets
3. 再调 Mental Assets
4. 再调 Challenge Rules
5. 最后套入 Output Schemas

### 14.2 控制原则

- 不要一次加载过多案例
- 不要让无关理论进入推理
- 优先调用与当前品类、场景、客群最相关的对象

### 14.3 三理论矩阵调用策略

| Agent | 优先调用 |
|---|---|
| Ries Agent | Theory Rules(ries) + Positioning Patterns(leadership/category) |
| Trout Agent | Theory Rules(trout) + Competition Assets + Mental Assets |
| Ye Agent | Theory Rules(ye) + Mental Assets + Case Assets(china/local) |

---

## 15. 维护与迭代原则

### 15.1 新增优先级

建议知识资产建设优先顺序如下：

1. Theory Rules
2. Challenge Rules
3. Mental Assets
4. Case Assets
5. Market & Competition Assets
6. Positioning Patterns

### 15.2 更新原则

- 优先补高价值对象，不追求数量
- 优先补能影响决策质量的对象
- 优先补失败案例与挑战规则

### 15.3 删除原则

以下资产应考虑降级或删除：

- 没有决策价值的内容
- 只有故事没有判断过程的案例
- 高度重复的心智词
- 无法验证的市场结论

---

## 16. 建设优先级建议

如果按最小可行系统推进，建议分三阶段建设：

### Phase 1

- Theory Rules
- Challenge Rules
- Mental Assets
- FinalSolutionSchema

### Phase 2

- Case Assets
- CompetitorProfile
- CategoryMap

### Phase 3

- Positioning Patterns
- 更细颗粒度城市与场景资产

---

## 17. 与后续文档的关系

这份文档完成后，后续最自然的衔接是：

| 文档 | 解决的问题 |
|---|---|
| 《M-PNT Few-shot 案例集 V1》 | 怎么示范 |
| 《M-PNT 知识库初始化清单 V1》 | 先建哪些知识对象 |

---

## 18. 结论

M-PNT 的知识资产结构可以正式收敛为：

> 一套以 **Theory Rules** 为原理层、以 **Case Assets** 和 **Market & Competition Assets** 为经验层、以 **Mental Assets** 为心智层、以 **Challenge Rules** 为风险层、以 **Output Schemas** 为交付层的分层知识资产系统。

这套结构的意义在于：

- 让 M-PNT 的判断有稳定知识底座
- 让三理论 Agent 有可共享又可分化调用的知识来源
- 让 Prompt 体系真正有「东西可用」
- 让后续 Few-shot、Workflow、Brain 沉淀都有统一接口

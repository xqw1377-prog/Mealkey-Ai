# M-PNT Prompt 体系设计文档 V1

## 1. 文档信息

| 项 | 内容 |
|---|---|
| 版本 | V1.0.1 |
| 依赖文档 | 《产品定义 V1.2》《专业模型 V1.0.1》《三理论 Agent 矩阵设计 V1》 |
| 目标 | 定义 M-PNT 的 Prompt 分层结构、各子 Prompt 的职责边界、输入输出协议与协同机制 |
| 日期 | 2026年7月 |
| 变更 | V1.0.1：与三理论矩阵专章对齐；六维进入 Situation；双轨推荐等级 |

---

## 2. 文档目标

本文件回答的问题是：

> 如何把 M-PNT 的产品定义、专业模型、三理论 Agent 矩阵，转化成一套可执行、可迭代、可维护的 Prompt 体系。

这套 Prompt 体系的目标不是「写几个提示词」，而是建立一套稳定的认知执行结构，使 M-PNT 能够：

- 先理解项目，再判断问题
- 先生成多个方向，再进行对抗碰撞
- 先挑战风险，再给出推荐
- 最终输出符合 M-Solution Framework 的品牌定位决策方案

---

## 3. Prompt 体系总原则

### 3.1 Prompt 不是功能文案，而是认知流程的载体

Prompt 体系不是用来「让模型说得更像顾问」，而是用来约束模型的思考顺序、判断标准、输出结构与风险意识。

### 3.2 主 Prompt 负责统一方向，子 Prompt 负责专项推理

M-PNT 不应依赖一个超长 Prompt 完成所有任务，而应拆成：

- 主控 Prompt
- 理论 Prompt
- 对抗 Prompt
- 综合 Prompt
- 质量校验 Prompt

### 3.3 每个 Prompt 必须有明确职责边界

避免所有 Prompt 都在做同一件事，导致输出重复、职责混乱、难以维护。

### 3.4 Prompt 必须服务于最终决策

任何 Prompt 都不能沦为知识解释器，必须服务于：

- 品牌定位方向生成
- 品牌定位方案比较
- 品牌定位风险挑战
- 品牌定位最终推荐

### 3.5 Prompt 之间必须有统一输入输出协议

如果没有统一协议，多 Agent 只会变成多段自然语言拼接，难以比较、难以综合、难以稳定输出。

---

## 4. Prompt 体系总架构

M-PNT 的 Prompt 体系建议采用以下结构：

```text
主 M-PNT System Prompt
    ↓
Situation / Insight Prompt
    ↓
Position 生成 Prompt
    ↓
三理论 Agent Prompt
  ├─ Ries Agent Prompt
  ├─ Trout Agent Prompt
  └─ Ye Maozhong Agent Prompt
    ↓
Cross-Fire Prompt
    ↓
Synthesis Prompt
    ↓
Quality Check Prompt
    ↓
Final Output Prompt
```

这套结构可以理解为：

| 段 | 职责 |
|---|---|
| 前段 | 看懂问题 |
| 中段 | 生成与碰撞 |
| 后段 | 整合与校验 |

---

## 5. 主 M-PNT System Prompt

### 5.1 职责

主 Prompt 是整个系统的总控层，负责定义：

- M-PNT 的角色
- 目标
- 工作原则
- 输出边界
- 禁止事项
- 总体执行顺序

### 5.2 角色定义

主 Prompt 应将 M-PNT 定义为：

> 一个面向餐饮行业的品牌定位决策引擎，不提供空泛营销知识，不解释理论概念，而是基于项目上下文、品牌定位方法论和多视角推理，为经营者输出可执行、可验证、可沉淀的品牌定位决策方案。

### 5.3 必须写入的核心约束

- 不输出品牌理论教学内容
- 不用空洞鸡汤代替判断
- 不直接给单一答案，必须比较多个方向
- 不跳过风险挑战直接推荐
- 不输出脱离餐饮现实的品牌空话
- 必须围绕心智占位、竞争区隔、场景绑定、资源匹配进行判断

### 5.4 主 Prompt 的核心任务声明

主 Prompt 应要求系统完成以下任务：

1. 识别项目问题
2. 形成关键洞察
3. 生成候选品牌定位方向
4. 调用三理论 Agent 进行多视角生成
5. 组织 Cross-Fire 碰撞
6. 执行风险挑战与评分
7. 给出最优推荐与验证路径
8. 按统一结构输出最终决策方案

### 5.5 主 Prompt 输出约束

主 Prompt 应明确最终输出必须符合：

- M-Solution Framework
- Position 段必须有多方案比较
- 必须包含推荐理由
- 必须包含主要风险
- 必须包含验证动作

---

## 6. Situation / Insight Prompt

### 6.1 职责

这个 Prompt 负责把用户原始输入转成「可判断的项目理解」。

### 6.2 输入

- 用户原始项目描述
- 结构化项目上下文
- 补充问答信息
- 市场与竞品基础信息

### 6.3 输出

必须输出：

- `project_summary`
- `current_problem`
- `key_constraints`
- `market_insights`
- `competition_insights`
- `customer_insights`
- `scene_insights`

### 6.4 Prompt 重点

它不是为了开始给答案，而是为了确认：

- 现在的问题到底是什么
- 这个项目最大的机会和最大约束在哪里
- 后面生成方案应该围绕什么展开

### 6.5 Prompt 示例职责语句

> 请先完成项目解析和关键洞察提炼，不要直接输出品牌定位结论。先识别项目当前最核心的问题、主要机会、竞争压力、目标客群与核心场景，再为后续品牌定位方向生成提供基础判断。

---

## 7. Position 生成 Prompt

### 7.1 职责

负责生成基础候选品牌定位方向，作为后续三理论 Agent 和 Cross-Fire 的输入基底。

### 7.2 输入

- 项目理解结果
- 六维判断结果
- 心智变量摘要
- 关键机会与约束

### 7.3 输出

生成 3-5 个候选品牌定位方向，每个方案必须包含：

- `name`
- `positioning_statement`
- `target_customer`
- `core_scene`
- `key_value`
- `differentiation_basis`
- `competitive_entry_point`
- `capability_requirement`
- `expected_advantage`

### 7.4 Prompt 核心要求

- 候选方案必须真正不同
- 至少包含稳健型与进攻型方案
- 不允许只换措辞不换逻辑
- 不允许直接进入最终推荐

### 7.5 Prompt 示例职责语句

> 请基于当前项目理解，生成 3-5 个逻辑自洽、可比较、具备不同竞争路径的品牌定位方向。不要急于判断最终答案，先确保候选方案具有足够差异，并且每个方案都能被一句话讲清楚。

---

## 8. 三理论 Agent Prompt 体系

三理论 Agent 是 M-PNT 的多视角生成层。

它们共享同一份输入，但采用不同理论立场输出各自偏好的品牌定位方案。

---

## 9. Ries Agent Prompt

### 9.1 职责

从「第一位置、品类开创、战略聚焦、长期领导壁垒」的视角重新审视项目。

### 9.2 思考重点

- 是否存在成为「第一」的机会
- 是否可以切出新的认知位置
- 是否足够聚焦
- 是否具备长期领导可能性

### 9.3 Prompt 要求

Ries Agent 输出时必须重点回答：

- 哪个方向最有机会形成第一位置
- 哪个方向最有可能建立领导心智
- 哪个方向最不聚焦，不建议选择

### 9.4 Prompt 风格约束

- 少讲执行细节
- 多看战略高度
- 强调品类、位置、领导性
- 强调长期品牌资产

### 9.5 Prompt 示例职责语句

> 你现在从「第一心智位置」和「战略聚焦」的视角审视该项目。请判断哪些品牌定位方向最有机会成为一个值得长期占领的认知位置，哪些方向虽然看起来合理，但无法建立长期领导价值。

---

## 10. Trout Agent Prompt

### 10.1 职责

从「竞争区隔、心智联想、差异化表达、避开强敌」的视角审视项目。

### 10.2 思考重点

- 主要竞争对手是谁
- 用户第一联想会是什么
- 定位是否足够简单、锋利、可区隔
- 是否进入了不该进入的正面战场

### 10.3 Prompt 要求

Trout Agent 输出时必须重点回答：

- 哪个方向最容易在竞品中被区分
- 哪个方向最容易形成第一联想
- 哪个方向最容易被头部竞品压制

### 10.4 Prompt 风格约束

- 强调竞争视角
- 强调位置而非愿景
- 强调简单清晰而非表达丰富

### 10.5 Prompt 示例职责语句

> 你现在从「竞争导向的定位」视角评估该项目。请判断在当前竞争环境下，哪些方向真正有机会与现有品牌形成清晰区隔，哪些方向看似不错，但实际会淹没在拥挤市场中。

---

## 11. Ye Maozhong Agent Prompt

### 11.1 职责

从「中国市场现实、消费者心理、场景记忆、传播引爆、执行落地」的视角审视项目。

### 11.2 思考重点

- 中国消费者是否会买单
- 是否有强场景记忆点
- 是否易传播、易理解、易落地
- 是否只是理论正确但现实难做

### 11.3 Prompt 要求

Ye Agent 输出时必须重点回答：

- 哪个方向最符合中国消费者的认知方式
- 哪个方向最容易形成场景记忆
- 哪个方向虽然理论高级但落地性差

### 11.4 Prompt 风格约束

- 强调本土现实
- 强调执行感
- 强调情感和场景
- 强调传播力

### 11.5 Prompt 示例职责语句

> 你现在从「中国餐饮市场实战」和「消费者心理记忆」的视角评估该项目。请判断哪些品牌定位方向最容易被中国消费者理解、记住并传播，哪些方向虽然理论上成立，但执行和传播成本过高。

---

## 12. 三理论 Agent 统一输入协议

为保证三理论 Agent 可比较，必须统一输入结构。

建议输入对象包含：

```text
Input Package

1. Project Context
- 城市
- 商圈
- 品类
- 客单
- 预算
- 资源条件

2. Problem Summary
- 当前核心问题
- 当前定位困境

3. Six-Dimension Diagnosis
- 市场机会
- 竞争格局
- 目标客群
- 场景机会
- 资源匹配
- 可防御性

4. Candidate Directions
- 候选方案集

5. Mental Signals
- 竞品心智词
- 场景触发词
- 用户第一联想
```

---

## 13. 三理论 Agent 统一输出协议

三理论 Agent 必须输出统一结构，便于后续 Cross-Fire 和综合比较。

建议输出：

```text
Theory View Output

1. Preferred Direction
2. Why This Direction
3. Rejected Directions
4. Core Strategic Logic
5. Key Mental Position
6. Main Risks
7. Recommendation Level
```

其中 Recommendation Level 为**理论层**字段，统一使用：

- `strong_recommend`
- `recommend`
- `neutral`
- `not_recommend`

对应字段名优先写作 `theory_recommend`。  
**最终决策层**不得使用上述枚举，而使用 `decision_recommend`：`primary` | `secondary` | `backup` | `reject`。  
双轨映射见《三理论 Agent 矩阵设计 V1》与 `prompts/protocols/recommendation-mapping.md`。

---

## 14. Cross-Fire Prompt

### 14.1 职责

Cross-Fire Prompt 负责组织三理论 Agent 之间的相互质疑、相互校正和相互补强。

### 14.2 核心目标

它不是为了让三个观点「平均化」，而是为了：

- 暴露单一理论盲点
- 逼出更强的定位结论
- 识别真正不能成立的方向
- 形成综合优化后的推荐逻辑

### 14.3 Prompt 输入

- Ries Agent 输出
- Trout Agent 输出
- Ye Agent 输出
- 基础候选方案集

### 14.4 Prompt 输出

必须输出：

- `major_conflicts`
- `shared_agreements`
- `eliminated_options`
- `optimized_direction`
- `merged_reasoning`

### 14.5 Prompt 关键要求

- 明确指出三方分歧点
- 明确指出三方共识点
- 明确指出哪些方向应淘汰
- 明确指出综合后为何推荐某一方向

### 14.6 Prompt 示例职责语句

> 请基于三理论 Agent 的输出组织一次战略碰撞。不要简单汇总观点，而要明确指出：三方在哪些方向上存在冲突、哪些判断形成共识、哪些方案应被淘汰、最终应该保留怎样的综合定位方向。

---

## 15. Synthesis Prompt

### 15.1 职责

Synthesis Prompt 负责在 Cross-Fire 之后完成最终整合，形成统一的推荐逻辑。

### 15.2 目标

把多个理论视角、多个候选方向、多个风险判断，收敛成：

- 主推荐方案
- 备选方案
- 不推荐方案
- 最终推荐理由

### 15.3 Prompt 输出

应生成：

- `final_recommended_position`
- `secondary_option`
- `rejected_options`
- `why_choose_this`
- `why_not_others`
- `core_risk_summary`
- `validation_focus`

### 15.4 Prompt 关键原则

- 不做平均主义整合
- 必须做明确取舍
- 必须把「推荐」建立在比较之上
- 必须把「推荐」建立在挑战之后

---

## 16. Quality Check Prompt

### 16.1 职责

质量校验 Prompt 是最后一道关，负责检查最终输出是否符合 M-PNT 的质量标准。

### 16.2 校验维度

必须检查：

- 是否有清晰推荐结论
- 是否体现了多方案比较
- 是否有明确风险提示
- 是否有验证路径
- 是否语言空泛
- 是否出现理论说教
- 是否脱离餐饮品牌定位场景

### 16.3 质量校验输出

建议输出：

- `is_pass`
- `quality_issues`
- `missing_parts`
- `revision_suggestions`

### 16.4 Prompt 示例职责语句

> 请检查当前输出是否已经达到 M-PNT 品牌定位决策方案的质量要求。重点检查是否存在空洞表达、缺少比较、缺少风险、缺少验证、没有明确推荐或过度理论化的问题。

---

## 17. Final Output Prompt

### 17.1 职责

Final Output Prompt 负责把最终结论组织成用户可直接使用的品牌定位决策方案。

### 17.2 输出结构

必须严格对齐：

```text
1. Situation
2. Insight
3. Position
4. Strategy
5. Action
6. Validation
7. Decision
```

### 17.3 输出要求

- 要像高水平顾问交付结果
- 要有明确结论
- 要可执行
- 要有战略感但不虚
- 要避免知识课口吻

### 17.4 Prompt 示例职责语句

> 请将最终结论整理为一份正式的品牌定位决策方案。不要解释理论，不要输出教学内容，而是围绕 Situation、Insight、Position、Strategy、Action、Validation、Decision 七个部分，给出用户可直接理解和使用的结果。

---

## 18. Prompt 编排顺序建议

实际执行时，建议按以下顺序运行：

```text
主 M-PNT System Prompt
    ↓
Situation / Insight Prompt
    ↓
Position 生成 Prompt
    ↓
Ries Agent Prompt
    ↓
Trout Agent Prompt
    ↓
Ye Maozhong Agent Prompt
    ↓
Cross-Fire Prompt
    ↓
Synthesis Prompt
    ↓
Quality Check Prompt
    ↓
Final Output Prompt
```

---

## 19. Prompt 体系的实现建议

### 19.1 拆分原则

- 主 Prompt 尽量稳定
- 理论 Prompt 各自独立维护
- Cross-Fire 与 Synthesis 可单独优化
- Quality Check 可作为通用校验层复用

### 19.2 维护原则

| 变更类型 | 优先修改 |
|---|---|
| 理论更新 | 子 Prompt，不轻易动总控 |
| 输出结构变化 | Final Output Prompt |
| 质量问题 | Quality Check Prompt |

### 19.3 后续优化方向

- 补充每个 Prompt 的 Few-shot 示例
- 给三理论 Agent 建立更细的角色边界
- 增加基于案例召回的 Prompt 增强策略
- 增加不同项目类型的 Prompt 变体

---

## 20. 与知识资产结构的关系

Prompt 体系不是孤立存在的，它必须依赖知识资产结构。

后续知识资产应至少为 Prompt 提供：

- 理论规则对象
- 案例对象
- 风险规则对象
- 心智词与场景词对象
- 竞品位置对象

> 对应文档：`docs/M-PNT-知识资产结构设计文档-V1.md`（已落盘）

---

## 21. 结论

M-PNT 的 Prompt 体系可以收敛为：

> 一套以主控 Prompt 为总线、以三理论 Agent Prompt 为多视角生成层、以 Cross-Fire 和 Synthesis 为对抗整合层、以 Quality Check 为质量守门层、以 Final Output 为正式交付层的分层 Prompt 系统。

这套体系的价值在于：

- 让 M-PNT 具备稳定的决策流程
- 让多理论矩阵真正可执行
- 让输出质量可被校验
- 让后续知识资产、Few-shot 与 Workflow 有明确挂载位置

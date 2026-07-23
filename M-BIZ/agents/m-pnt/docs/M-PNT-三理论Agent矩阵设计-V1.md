# M-PNT 三理论 Agent 矩阵设计 V1

## 1. 文档信息

| 项 | 内容 |
|---|---|
| 版本 | V1.0 |
| 状态 | 优化定版，对齐产品定义 / 专业模型 / Prompt / 知识资产 |
| 依赖 | 《产品定义 V1.2》《专业模型 V1》《Prompt 体系 V1》《知识资产结构 V1》 |
| 日期 | 2026年7月 |

---

## 2. 设计目标

三理论 Agent 矩阵不是「三个营销大师的聊天室」，而是 M-PNT 的**多视角压力生成与校准层**。

它要解决的问题：

| 问题 | 矩阵如何解决 |
|---|---|
| 单一视角易盲视 | 三个正交视角同时审视同一候选集 |
| 多方案无法比较 | 统一输入 / 统一输出协议 |
| 平均主义整合 | Cross-Fire 对抗 + Synthesis 明确取舍 |
| 理论空转 | 每个 Agent 必须对候选方向给出推荐等级与淘汰理由 |

**原则：**

1. 共享输入，分化立场  
2. 可比较输出，不可自由散文  
3. 碰撞求强结论，不求三方和稀泥  
4. 最终推荐权在 Synthesis，不在任一理论 Agent  

---

## 3. 矩阵总览

```text
                    ┌─────────────────┐
                    │ Candidate Set   │
                    │ (3–5 定位方向)   │
                    └────────┬────────┘
                             │ 同一 Input Package
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │ Ries Agent │    │ Trout Agent│    │ Ye Agent   │
    │ 第一/聚焦  │    │ 竞争/区隔  │    │ 场景/落地  │
    └──────┬─────┘    └──────┬─────┘    └──────┬─────┘
           │ Theory View     │ Theory View     │ Theory View
           └─────────────────┼─────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Cross-Fire    │
                    │ 冲突/共识/淘汰  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │   Synthesis     │
                    │ primary/…/reject│
                    └─────────────────┘
```

| Agent | 理论锚点 | 一句话立场 | 最怕的错误 |
|---|---|---|---|
| **Ries** | 第一位置、品类、聚焦、领导壁垒 | 这个位置值不值得长期当「第一」去占？ | 不聚焦、假品类、无领导资产 |
| **Trout** | 竞争区隔、心智联想、避开强敌 | 在竞品地图里，这句话能不能钉住一个空位？ | 拥挤正面战、模糊联想、愿景替代位置 |
| **Ye Maozhong** | 中国现实、场景记忆、传播、落地 | 中国消费者能不能懂、记、传、买？ | 理论正确但做不动、场景虚、传播贵 |

---

## 4. 职责边界（禁止越权）

### 4.1 三个 Agent 共同允许

- 对候选方向排序与推荐/淘汰  
- 指出本视角下的主风险  
- 提出「更锋利的表述」或「应收窄的点」（不另起完全无关新方案集，除非现有集全灭）  

### 4.2 三个 Agent 共同禁止

- 跳过候选集直接给「唯一真理答案」且不比较  
- 讲解定位理论课  
- 输出视觉/菜单/投放执行细案（Ye 可谈落地可行性，但不写执行手册）  
- 修改六维事实诊断本身（可质疑其含义，不可虚构市场数据）  
- 使用与协议不符的自由结构输出  

### 4.3 分工边界

| 事项 | Ries | Trout | Ye |
|---|---|---|---|
| 品类/第一心智 | **主** | 辅 | 辅 |
| 竞品区隔与第一联想 | 辅 | **主** | 辅 |
| 场景记忆与传播落地 | 辅 | 辅 | **主** |
| 资源与执行门槛 | 弱 | 中 | **强** |
| 长期壁垒 / 领导性 | **强** | 中 | 弱–中 |
| 表达是否够简单锋利 | 中 | **强** | 中 |

Cross-Fire 负责暴露「主视角互相打架」；Synthesis 负责最终取舍。

---

## 5. 统一输入协议（Input Package）

三 Agent **必须**吃同一份输入，禁止各自私下改写项目事实。

```yaml
project_context:
  city: ""
  trade_area: ""
  category: ""
  avg_ticket: ""
  budget: ""
  resources: ""

problem_summary:
  core_problem: ""
  positioning_dilemma: ""

six_dimension_diagnosis:
  market_opportunity: ""
  competition: ""
  target_customer: ""
  scene_opportunity: ""
  resource_fit: ""
  defensibility: ""
  overall_positioning_feasibility: high | medium | low | not_recommended

candidate_directions: []   # 来自 Position 生成，3–5 个

mental_signals:
  competitor_mental_keywords: []
  scene_triggers: []
  first_associations: []
```

**挂载知识（差异化检索，同一底座）：**

| Agent | 优先知识 |
|---|---|
| Ries | `Theory Rules(ries)` + `Positioning Patterns(leadership/category)` |
| Trout | `Theory Rules(trout)` + `Market/Competition Assets` + `Mental Assets` |
| Ye | `Theory Rules(ye_maozhong)` + `Mental Assets` + `Case Assets(china/local)` |

---

## 6. 统一输出协议（Theory View）

```yaml
agent_id: ries | trout | ye_maozhong
preferred_direction: ""          # 候选 name 或 id
why_this_direction: ""
rejected_directions: []          # [{name, reason}]
core_strategic_logic: ""
key_mental_position: ""          # 一句话心智位置
main_risks:
  - risk: ""
    severity: R1 | R2 | R3 | R4
direction_scores:                # 对每个候选打本视角分
  - name: ""
    theory_score: 0-100          # 本视角贡献分，非最终总分
    theory_recommend: strong_recommend | recommend | neutral | not_recommend
recommendation_level: strong_recommend | recommend | neutral | not_recommend  # 对 preferred
```

### 6.1 各 Agent 必答问题（强制）

**Ries**

1. 哪个方向最有机会形成「第一位置」？  
2. 哪个方向最有可能建立领导心智？  
3. 哪个方向最不聚焦，应淘汰？  

**Trout**

1. 哪个方向最容易与竞品区分？  
2. 哪个方向最容易形成第一联想？  
3. 哪个方向最容易被头部竞品压制？  

**Ye**

1. 哪个方向最符合中国消费者认知方式？  
2. 哪个方向最容易形成场景记忆？  
3. 哪个方向理论成立但落地性差？  

---

## 7. 推荐等级双轨映射

两套等级服务不同层，**禁止混用字段名**。

| 层 | 字段名 | 枚举 |
|---|---|---|
| 理论视角层 | `theory_recommend` / Theory View 的 `recommendation_level` | `strong_recommend` \| `recommend` \| `neutral` \| `not_recommend` |
| 最终决策层 | `decision_recommend` | `primary` \| `secondary` \| `backup` \| `reject` |

### 7.1 从理论票到决策建议（Synthesis 规则）

| 条件（对某一候选方向） | 倾向 decision_recommend |
|---|---|
| ≥2 个 Agent 为 `strong_recommend`，且无 R4 | **primary** 候选 |
| ≥2 个 Agent ≥ `recommend`，分歧可控 | **secondary** 或与评分后争 primary |
| 仅 1 个 Agent 强推，另两方 neutral | **backup** 或需 Cross-Fire 加严 |
| ≥2 个 Agent `not_recommend` | 默认 **reject** |
| 任一方给出 R4 且 Cross-Fire 确认 | **reject**（不可作 primary） |
| 三方 preferred 完全不同 | 进入 Cross-Fire 深碰撞，禁止直接平均选中间项 |

### 7.2 与心智等级 / 百分制的关系

```text
Theory Views（三票 + 理由）
    + Cross-Fire（冲突/共识/淘汰）
    + 百分制评分（100分）
    + 心智占位 A–D
    → decision_recommend: primary | secondary | backup | reject
```

| mind_position_level | decision 倾向（在无 R4 时） |
|---|---|
| A | primary 优先 |
| B | secondary，或资源允许时 primary |
| C | backup，需验证 |
| D | reject |

**否决优先级：** R4 淘汰 > 心智 D > 两票 not_recommend > 百分制排序。

---

## 8. Cross-Fire 汇合规则

### 8.1 输入

- 三份 Theory View  
- 原始 Candidate Set  
- Challenge Rules（可选召回）  

### 8.2 必须输出

```yaml
major_conflicts: []       # 三方分歧点
shared_agreements: []     # 共识
eliminated_options: []    # 应淘汰方向及理由
surviving_options: []     # 进入 Synthesis 的方向
optimized_direction: ""   # 碰撞后优先方向（可微调表述，不可偷换逻辑）
merged_reasoning: ""
open_risks: []            # 仍未消解的风险，severity R1–R4
```

### 8.3 碰撞原则

1. **禁止平均**：三个 preferred 不同时，不得输出「折中第四方向」 unless 能一句话说清且通过红队  
2. **暴露盲点**：Ries 忽视落地时 Ye 必须打；Trout 忽视领导资产时 Ries 必须打  
3. **淘汰优先于美化**：先删不能成立的，再优化能成立的  
4. **optimized_direction** 必须能追溯到原候选逻辑，禁止全新空降品牌故事  

---

## 9. Synthesis 最终取舍

### 9.1 必填

```yaml
final_recommended_position: ""
decision_recommend_primary: primary   # 主推固定为 primary
secondary_option: ""
secondary_decision_recommend: secondary
backup_option: ""
rejected_options: []
why_choose_this: ""
why_not_others: ""
theory_vote_summary:
  ries: ""
  trout: ""
  ye_maozhong: ""
overall_score: 0
mind_position_level: A | B | C | D
max_risk_severity: R1 | R2 | R3 | R4
core_risk_summary: ""
validation_focus: ""
```

### 9.2 取舍口诀

> 比较之上推荐，挑战之后推荐；三票是证据，不是投票过半数自动赢。

若出现「Ries 强推领导位、Ye 判定做不动」：

- 默认降为 `secondary` 或 `backup`，并写清能力缺口  
- 仅当资源约束可被 30/90 天验证计划覆盖时，才可 primary  

---

## 10. 与主 Workflow 的挂载位置

```text
1 Situation 解析
2 Insight + 六维诊断          ← 产出 six_dimension_diagnosis
3 Position 多方案生成         ← 产出 candidate_directions
4 三理论 Agent 矩阵（并行）   ← 本章核心
5 Cross-Fire
6 评分 + 红队补强（可与 5 合并）
7 Synthesis → Decision
8 Validation 设计
9 Quality Check → Final Output
```

对应 Prompt 文件：

| 步骤 | 文件 |
|---|---|
| 三理论 | `prompts/03a-ries-agent.md` / `03b-trout-agent.md` / `03c-ye-maozhong-agent.md` |
| 碰撞 | `prompts/04-cross-fire.md` |
| 综合 | `prompts/05-synthesis.md` |
| 协议 | `prompts/protocols/*` |

---

## 11. 与产品「五选」的对应

| 产品五选 | Ries | Trout | Ye |
|---|---|---|---|
| 竞争位置 | 第一/品类位置 | 竞品地图空位 | 可被认知的现实位置 |
| 目标心智客户 | 是否过宽（反聚焦） | 第一联想归谁 | 谁会买单、谁会传 |
| 核心消费场景 | 是否冲淡品类第一 | 场景是否可钉住差异 | **场景是否真、频、可记** |
| 差异化方向 | 是否构成领导资产 | **是否锋利可区隔** | 是否可感知、可交付 |
| 验证与强化 | 长期占位能否强化 | 模仿后是否仍成立 | **最小动作能否验证** |

---

## 12. 风险等级（统一 R1–R4）

全库统一，**不使用 R5**。

| 等级 | 含义 | 对决策影响 |
|---|---|---|
| R1 | 低风险，可控 | 可 primary |
| R2 | 中风险，需配套策略 | 可 primary，Strategy/Action 必须写对策 |
| R3 | 高风险，谨慎 | 默认不超过 secondary，或 primary 但 Validation 加重 |
| R4 | 不可接受 | 不得 primary；通常 reject |

---

## 13. 质量门禁（矩阵专属）

进入 Final Output 前，矩阵段必须满足：

- [ ] 三份 Theory View 字段完整  
- [ ] Cross-Fire 含冲突、共识、淘汰  
- [ ] Synthesis 含 why_choose / why_not_others  
- [ ] 主推方向有 theory_vote_summary  
- [ ] 无 R4 残留在 primary 上  
- [ ] 未出现「三方平均」式无立场推荐  

---

## 14. 结论

三理论 Agent 矩阵正式定义为：

> **在同一候选集与同一事实输入上，以 Ries（第一/聚焦）、Trout（竞争/区隔）、Ye（场景/落地）三个正交视角并行施压，经 Cross-Fire 对抗与 Synthesis 取舍，产出可追溯、可比较、可淘汰的品牌定位推荐依据。**

它是实现层机制，服务于产品层「多方案竞争选择」；**不替代**六维判断，**不替代**百分制评价，而是与之串联。

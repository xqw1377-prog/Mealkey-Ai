# M-PNT Frontend Workshop UI V1

> 版本：V1 | 状态：草案 | 对应后端数据：`PositioningPageOutput`

## 1. 设计前提

M-PNT 不是一个独立前端产品，而是 **MealKey 经营会议中的定位策略与执行方案专项模块**。

因此 V1 前端工作台的设计前提是：

1. **不建独立路由**，而是定义 4 个 MealKey 挂载点
2. **不重新造数据层**，直接消费 `PositioningPageOutput` + `MKDecision`
3. **不依赖高保真设计系统**，先用纯 HTML/CSS 静态骨架验证交互结构
4. **不先做移动端**，V1 只做桌面端三栏布局
5. **三态驱动**：`idle` → `running` → `decision_ready`，状态由后端 runtime 决定

---

## 2. 四个挂载点

### A. Dashboard / Today 定位状态卡

MealKey 首页直接展示定位状态，不做独立 M-PNT 首页。

| 字段 | 数据来源 |
|---|---|
| 当前状态 | `decision_recommend` + 是否已有结论 |
| 主推定位 | `summary / mentalPosition` |
| 风险等级 | `max_risk_severity` |
| 当前 Next Step | `nextSteps[0]` |
| 主动作 | `进入经营会议 / 发起复审` |

### B. Advisor / 经营会议中的定位模块

核心工作台。这是 V1 的实现重点。

三栏布局，直接消费 `PositioningPageOutput`。

### C. Project Profile / 项目档案中的定位卡

展示当前定位结论、验证进展、历史版本 diff。

### D. Decisions / Review Queue 中的复审入口

基于 kill criteria 和验证结果，展示是否需要复审。

---

## 3. 状态机

V1 前端只处理三个核心状态：

```text
┌───────┐  发起定位分析   ┌─────────┐  工作流完成   ┌───────────────┐
│ idle  │ ──────────────► │ running │ ────────────► │ decision_ready │
└───────┘                 └─────────┘               └───────────────┘
                                                         │
                                                    ┌────▼────┐
                                                    │review_due│（V2）
                                                    └─────────┘
```

| 状态 | 触发条件 | 页面行为 |
|---|---|---|
| `idle` | 项目无定位结论 | 显示"发起定位分析"CTA，项目上下文面板可见 |
| `running` | 用户点击"发起定位分析" | 显示进度条 + 当前执行步骤，不可编辑 |
| `decision_ready` | `runMPntV1()` 返回结果 | 完整三栏工作台展示 |

---

## 4. 桌面端三栏布局

### 布局比例

```
┌────────────────────┬──────────────────────────────┬──────────────────┐
│ 左栏：项目上下文    │ 中栏：定位策略                 │ 右栏：执行行动    │
│ 280px              │ minmax(760px, 1fr)            │ 320px            │
└────────────────────┴──────────────────────────────┴──────────────────┘
```

### 顶部固定决策条

始终固定在顶部，不随滚动消失。

```
┌──────────────────────────────────────────────────────────────────────┐
│ [主推定位: 成为「长沙家庭聚餐第一想起的湘菜」] [primary] [R2] [Next Step] │
│                                           [发起复审] [继续讨论]       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. 核心交互模块（8 个）

### 5.1 顶部决策条

**目的**：用户在任何位置都知道当前推荐结论是什么。

| 字段 | 来源 |
|---|---|
| 主推定位 | `summary` |
| 决策等级 | `decision_recommend`，带颜色标记 |
| 风险等级 | `max_risk_severity`，R4 高亮 |
| Next Step | `nextSteps[0].step` |
| 动作 | 发起复审 / 继续讨论 |

**交互原则**：
- 始终固定，不随滚动消失
- 始终只显示 1 个主推定位
- 风险必须和结论并列

### 5.2 项目事实面板（左栏）

**目的**：承载定位决策所需的项目上下文，不要求用户重复填写。

| 字段 | 来源 |
|---|---|
| 项目摘要 | `category / city / district` |
| 预算 / 阶段 | `project` 上下文 |
| 创始人优势/盲区 | `owner` 上下文 |
| 当前假设场景 | `target_customers / mental_position` 推断 |
| 缺失事实提醒 | 系统标记 |

### 5.3 候选方向卡组（中栏）

**目的**：让用户一眼知道哪个是主推、哪个备选、哪个被淘汰。

每张卡包含：
- 方案名 + 一句话定位
- 类型标签：稳健型 / 进攻型 / 备选型
- 切口标签：场景 / 竞争 / 人群 / 价值
- 评分（0-100）
- 决策等级：primary / secondary / backup / reject（颜色区分）
- 主优势 + 主风险

排序规则：primary → secondary → backup → reject

### 5.4 三理论交锋区（中栏）

**目的**：让用户感知到"这个推荐是经过冲突和淘汰后留下的"。

三列并排：Ries | Trout | Ye

每列只展示：
- 偏好方向
- 关键理由
- 理论推荐等级
- 主要风险

下方单独 Cross-Fire 摘要：
- 主要冲突点
- 硬共识 / 软共识
- 淘汰项
- 辩论叙事（可折叠展开）

**交互原则**：
- 默认先看结论，允许展开完整辩论
- 冲突优先展示，不做教学式理论解释
- R4 风险高亮标记

### 5.5 最终裁决区（中栏）

页面中心。必须固定展示 4 块内容：

| 区块 | 数据来源 |
|---|---|
| 选这个 | `summary / mentalPosition` |
| 为什么选 | `why_choose_this` |
| 为什么不选别的 | `why_not_others` |
| 接下来怎么验证 | `validation + nextSteps` |

### 5.6 定位策略区（中栏）

解决"定在哪里"的问题：

- 核心定位一句话
- 目标心智客户
- 核心消费场景
- 竞争位置
- 差异化钉子

### 5.7 执行行动栏（右栏）

**目的**：不管用户滚到哪里，都看到当前要做什么。

- 今日唯一问题
- 本周执行动作
- 30 天验证
- Kill Criteria
- 动作入口：发起复审 / 标记验证完成 / 继续讨论

### 5.8 执行方案区（中栏）

解决"接下来怎么落地"：

- 品牌口号
- 视觉调性
- 传播策略
- 落地执行路径（按周）
- 里程碑（按月）
- 不做什么（品牌边界）

---

## 6. 数据映射

V1 前端直接消费 `PositioningPageOutput`，不重新定义数据层。

| 模块 | 数据源 | 映射路径 |
|---|---|---|
| 顶部决策条 | `PositioningPageOutput` | `.summary .decision_recommend .max_risk_severity .next_steps[0]` |
| 项目事实 | `MKContext` | `project / owner` |
| 候选方向 | `PositioningPageOutput` | `.candidates[]` |
| 三理论交锋 | `PositioningPageOutput` | `.theory_vote_summary[] .cross_fire_game_summary` |
| 最终裁决 | `PositioningPageOutput` | `.why_choose_this .why_not_others .summary` |
| 定位策略 | `PositioningPageOutput` | `.category .target_customers .differentiation .mental_position` |
| 执行行动 | `PositioningPageOutput` | `.next_steps[] .validation` |
| 执行方案 | `PositioningPageOutput` | `.creative_strategy` |
| 风险 | `PositioningPageOutput` | `.risks[]` |
| 验证 | `PositioningPageOutput` | `.validation.day30 .validation.day90 .validation.kill_criteria` |
| M-Solution | `PositioningPageOutput` | `.m_solution` |

---

## 7. 交互原则

### 原则 1：永远把"当前推荐 + 怎么落地"放在第一屏

用户不是来学习流程的，是来拿走可执行的定位策略和执行动作的。

### 原则 2：冲突比过程更重要

不是把所有推理都搬上来，而是优先展示：
- 谁支持
- 谁反对
- 反对是否构成否决

### 原则 3：下一步必须常驻

`Next Step` 不能被滚动淹没。

### 原则 4：默认收敛，按需展开

长文本、完整论证、历史版本都应折叠在第二层。

### 原则 5：状态驱动而非页面切换

不需要独立"页面感"，而是靠状态变化驱动 UI 变化：
- `idle` → 显示 CTA
- `running` → 显示进度
- `decision_ready` → 显示完整工作台

---

## 8. 实现优先级

1. **顶部固定决策条** — 最基础，最常用
2. **候选方向卡组** — 用户第一眼要比较的内容
3. **三理论交锋区** — M-PNT 核心差异化
4. **最终裁决区** — 页面中心
5. **执行行动栏** — Next Step 常驻
6. **项目事实面板** — 左栏上下文
7. **定位策略区 + 执行方案区** — 中栏下半部分
8. **状态机** — idle → running → decision_ready

---

## 9. 数据流

```text
MealKey Orchestrator
    │
    ├── MKContext (project / owner / knowledge)
    │       │
    │       ▼
    │   runMPntV1()
    │       │
    │       ▼
    │   MPntRunResult
    │       │
    │       ▼
    │   decisionToPageOutput(result.decision)
    │       │
    │       ▼
    │   PositioningPageOutput  ←── 前端直接消费
    │       │
    │       ├──► 顶部决策条
    │       ├──► 候选方向卡组
    │       ├──► 三理论交锋
    │       ├──► 最终裁决
    │       ├──► 定位策略
    │       ├──► 执行方案
    │       ├──► 执行行动栏
    │       └──► 风险 / 验证
    │
    └── 状态：idle → running → decision_ready
```

---

## 10. 与 V0.1 原型的关系

| 维度 | V0.1（交互原型框架） | V1（前端工作台 UI） |
|---|---|---|
| 形态 | 低保真文字框架 + HTML 骨架 | 可交互 HTML/CSS 工作台 |
| 数据 | 示例数据写死 | 对接 `PositioningPageOutput` |
| 状态 | 7 种状态 | 3 种核心状态 |
| 布局 | 三栏 + 移动端 | 仅桌面端三栏 |
| 模块 | 8 个模块全定义 | 8 个模块全实现 |
| 数据映射 | 文字建议 | TypeScript 接口级映射表 |

---

## 11. 下一步（V2）

1. JS 交互层：卡片点击展开/收起、三理论候选视角切换
2. 状态机 JS 实现：idle → running → decision_ready
3. 移动端适配
4. 复审态（review_due）UI
5. 验证进度追踪 UI
6. 版本历史 diff 视图

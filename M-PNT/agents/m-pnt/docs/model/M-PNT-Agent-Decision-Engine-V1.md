# M-PNT Agent Decision Engine V1

> 版本：V1 | 状态：草案 | 对应代码：`packages/agents/src/m-pnt/decision-engine/`

## 1. 设计目标

将 M-PNT 当前的分散决策逻辑（rule-engine.ts / synthesis.ts / cross-fire.ts / three agents）收敛为一个**可测试、可追踪、可扩展的决策引擎**。

### V1 解决的问题

| 问题 | 现状 | V1 目标 |
|---|---|---|
| 三个理论 Agent 的 evaluate() 都调用同一 `evaluateByRules()` | 伪差异化 | 每条规则按理论体系加权 |
| `evaluateByRules()` 基于 keyword 匹配 | 脆弱 | 改为维度评分卡 + 规则权重 |
| Synthesis 评分公式硬编码 | 不透明 | 六维评分模型显式化 |
| Cross-Fire 攻击文本硬编码 | 不可维护 | 从评估数据动态生成 |
| 决策理由散落在多段字符串拼接中 | 不可追踪 | 统一 `DecisionTrace` 记录每条理由 |

### 非目标

- 不改变 MatrixInputPackage / TheoryView / CrossFireResult / SynthesisResult 接口
- 不改变运行时调用方式（runTheoryMatrix 签名不变）
- 不引入外部依赖

---

## 2. 决策引擎架构

```text
DecisionEngine
  │
  ├── evaluateCandidate(candidate, pkg, theoryId)
  │     └── 按理论体系执行维度评分卡
  │
  ├── evaluateAll(theoryId, pkg)
  │     └── 对所有候选方向执行 evaluateCandidate
  │     └── 返回 TheoryView（兼容现有接口）
  │
  ├── scoreCard: DimensionScoreCard
  │     └── 六维评分模型定义（权重 + 评分函数）
  │
  └── trace: DecisionTrace[]
        └── 记录每一步决策理由
```

### 与现有架构的关系

```text
现有的:
  riesAgent.evaluate()  ──调用──►  evaluateByRules()  (keyword匹配)
  troutAgent.evaluate() ──调用──►  evaluateByRules()  (同一个函数)
  yeAgent.evaluate()    ──调用──►  evaluateByRules()  (同一个函数)

V1:
  riesAgent.evaluate()  ──调用──►  DecisionEngine.evaluateAll('ries', pkg)
  troutAgent.evaluate() ──调用──►  DecisionEngine.evaluateAll('trout', pkg)
  yeAgent.evaluate()    ──调用──►  DecisionEngine.evaluateAll('ye_maozhong', pkg)
                                    │
                                    ├── scoreCard.dimensions[6]
                                    ├── theoryWeights[theoryId]
                                    └── trace[] 可追踪
```

---

## 3. 六维评分模型（V1 显式化）

对应《专业模型 V1.0.1》的六维框架，当前在 `computeOverallScore()` 中隐式使用，V1 将其显式化为 `DimensionScoreCard`：

```typescript
interface DimensionDef {
  id: string;           // mental_uniqueness, competitive_strength, ...
  name: string;         // 心智独特性
  weight: number;       // 满分（总计 100）
  scoreFn: (candidate, pkg, theoryId) => number;  // 评分函数
  theoryWeights?: Record<TheorySource, number>;   // 按理论调整权重
}

const DEFAULT_DIMENSIONS: DimensionDef[] = [
  { id: 'mental_uniqueness',    name: '心智独特性',   weight: 25, scoreFn: scoreMental },
  { id: 'competitive_strength', name: '竞争优势强度', weight: 20, scoreFn: scoreCompetitive },
  { id: 'customer_fit',         name: '客群匹配度',   weight: 15, scoreFn: scoreCustomer },
  { id: 'executability',        name: '可执行性',     weight: 15, scoreFn: scoreExecutable },
  { id: 'long_term_defense',    name: '长期壁垒',     weight: 15, scoreFn: scoreDefense },
  { id: 'risk_controllability', name: '风险可控性',   weight: 10, scoreFn: scoreRisk },
];
```

### 按理论调整的权重

| 维度 | Riew | Trout | Ye |
|---|---|---|---|
| 心智独特性 | **30** (+5) | 20 (-5) | 20 (-5) |
| 竞争优势强度 | 15 (-5) | **25** (+5) | 15 (-5) |
| 客群匹配度 | 15 | 15 | 15 |
| 可执行性 | 10 (-5) | 10 (-5) | **20** (+5) |
| 长期壁垒 | **20** (+5) | 15 | 10 (-5) |
| 风险可控性 | 10 | 10 | 10 |
| **总计** | **100** | **100** | **100** |

---

## 4. Theory View 生成流程

```text
evaluateAll(theoryId, pkg)
    │
    ├── 1. 对每个候选方向：
    │       └── evaluateCandidate(candidate, pkg, theoryId)
    │             ├── 计算六维评分（按 theoryWeights 调整）
    │             ├── 计算理论推荐等级 (theory_recommend)
    │             ├── 识别主要风险 (R1-R4)
    │             └── 记录决策追踪 (trace)
    │
    ├── 2. 按总评分排序
    │
    ├── 3. 构建 TheoryView
    │       ├── preferred_direction = 排序第一的候选方向
    │       ├── direction_scores = 所有候选方向评分
    │       ├── main_risks = 首选方向的风险
    │       ├── theory_recommend = 映射自总评分
    │       └── why_this_direction = 从 trace 生成
    │
    └── 4. 返回 TheoryView
```

### Score → TheoryRecommend 映射

| 总评分区间 | theory_recommend |
|---|---|
| ≥ 80 | strong_recommend |
| [62, 80) | recommend |
| [45, 62) | neutral |
| < 45 | not_recommend |

---

## 5. 决策追踪 (DecisionTrace)

V1 新增 `DecisionTrace`，记录每个候选方向在每一维度的得分和理由：

```typescript
interface DecisionTrace {
  candidateId: string;
  candidateName: string;
  theoryId: TheorySource;
  dimensions: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    weight: number;
    weightedScore: number;
    reason: string;         // 为什么给这个分数
    evidence?: string;      // 支撑证据（市场数据引用）
    risk?: {                // 该维度识别的风险
      risk: string;
      severity: RiskLevel;
    };
  }>;
  totalScore: number;
  theoryRecommend: TheoryRecommend;
  mainRisks: Array<{ risk: string; severity: RiskLevel }>;
  timestamp: number;
}
```

---

## 6. Cross-Fire 动态生成

V1 将 Cross-Fire 的攻击文本从硬编码改为**从评估数据动态生成**：

```typescript
interface ChallengeGenerator {
  // 从 TheoryView 中提取核心分歧点
  extractConflicts(views: TheoryView[]): string[];
  
  // 从评分数据生成攻击文本（不再硬编码大师语录）
  generateAttack(from: TheoryView, to: TheoryView): {
    attack: string;
    severity: RiskLevel;
  };
  
  // 从评分数据提取共识点
  extractConsensus(views: TheoryView[]): {
    hard: string[];
    soft: string[];
    eliminate: string[];
  };
}
```

攻击文本生成规则：

| 条件 | 攻击模板 |
|---|---|
| 对方首选方向评分在我方体系下得分低 | "从{from}角度看，{to}推的{direction}在{dimension}维度得分仅{score}，明显低于候选平均水平" |
| 对方首选方向触发了我方体系的高权重风险 | "{to}推的{direction}触发{severity}风险：{risk}，在我的体系中这是不可接受的" |
| 双方推同一方向但评分理由不同 | "我同意{direction}大方向，但{to}的原因忽略了{point}" |

---

## 7. 与现有接口兼容

V1 不改变任何对外接口：

```typescript
// 现有接口不变
const result = await runTheoryMatrix(context);
// result.views.ries  → TheoryView（内容不变）
// result.crossFire   → CrossFireResult（内容不变）
// result.synthesis   → SynthesisResult（内容不变）

// V1 新增
const engine = new DecisionEngine();
const trace = engine.getTrace();  // 获取完整决策追踪
```

---

## 8. 测试策略

| 测试场景 | 覆盖 |
|---|---|
| 三个理论 Agent 对同一候选方向打出不同分数 | 验证权重差异化 |
| 高风险方向（R4）被正确降级 | 硬规则校验 |
| 决策追踪记录完整 | 每条维度有 reason |
| Cross-Fire 攻击文本不包含硬编码大师名 | 动态生成验证 |
| Synthesis 结果不因评估引擎更换而变化 | 接口兼容性 |

---

## 9. 迁移路线

| Phase | 内容 | 涉及文件 |
|---|---|---|
| 1 | 实现 `DecisionEngine` 核心 + `DimensionScoreCard` | `decision-engine/engine.ts` |
| 2 | 替换三个 Theory Agent 的 evaluate() 实现 | `ries.ts`, `trout.ts`, `ye-maozhong.ts` |
| 3 | 替换 Cross-Fire 攻击生成 | `cross-fire.ts` 的 generateAttack() |
| 4 | 添加 DecisionTrace | `decision-engine/trace.ts` |
| 5 | 旧引擎退役 | `rule-engine.ts` 标记 deprecated |

---

## 10. 与 V1 对比

| 维度 | 当前实现 | V1 Decision Engine |
|---|---|---|
| 评估方式 | `evaluateByRules()` 共享函数 | `evaluateAll()` 按理论差异化 |
| 评分维度 | 隐式 hardcode（领导地位/差异化/聚焦/场景/执行性） | 六维评分卡显式定义 |
| 理论差异化 | 无（三个 Agent 共享同一 keyword 匹配） | 按理论调整维度权重 |
| 决策追踪 | 无 | `DecisionTrace[]` 完整记录 |
| 攻击生成 | 硬编码大师语录 | 从评估数据动态生成 |
| 可测试性 | 依赖上下文（keyword 匹配不稳定） | 维度评分函数可独立测试 |

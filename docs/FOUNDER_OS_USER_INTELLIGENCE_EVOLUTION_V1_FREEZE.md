# Founder OS — User Intelligence Evolution V1（冻结）

> **状态：正式冻结（Freeze）— 用户智能进化层最小契约**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** Memory Runtime · Growth Runtime · Council System  
> **冲突裁决：** **不是第七 Runtime**；不是第五 Expert；不是偷偷学习用户。实现加深挂在 Memory + Growth；工程主线仍以 Council Runtime Phase 1–2 优先。

---

## 一、一句话定位

> **每一个餐饮经营者拥有一个不断成长的 AI 经营大脑。**  
> 系统越陪伴越懂他；用户越经营，系统越懂经营。

判定标准：

| 形态 | 特征 |
|------|------|
| AI 工具 | 每次像第一次见面；建议不记结果；不随用户变强 |
| AI 经营操作系统 | 有决策→执行→结果→能力更新闭环；常委与建议随 Founder Model 校准 |

**现状裁决（冻结）：** 系统已具备**进化架构**（Memory / Decision Memory / Preference / LearningEvent / Knowledge / Growth 八维），**尚未完全具备自动进化闭环**。本文件冻结补齐的核心层名：

# User Intelligence Evolution Layer

挂载方式（铁律）：

```text
User Intelligence Evolution
        │
        ├── Intelligence Profile   ← 统一投影（读模型）
        ├── Behavior Learning      ← 高价值信号采集
        ├── Evolution Engine       ← 更新规则（写回 Memory/Growth）
        └── Memory Permission      ← 同意与边界
                │
        落点：Memory Runtime + Growth Runtime（加深，不新开席）
```

**禁止：** 新建 `M-LEARN` / `M-INTEL` 顾问席；新建第七 Runtime；把聊天流水当学习燃料。

---

## 二、与现有权威的关系

| 已有权威 | 本层关系 |
|----------|----------|
| `MEALKEY_MEMORY_RUNTIME_BACKEND_V1.md` | 存什么、四层、价值分级；本层加 **Permission + 投影契约** |
| `MEALKEY_GROWTH_RUNTIME_BACKEND_V1.md` | 八维能力 / Decision Quality / GrowthEvent；本层统一为 **Intelligence Profile 视图** |
| `FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md` Phase 3 | Decision Memory / Member Performance / Founder Preference = 本层燃料与校准输入 |
| `MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` | 飞轮：四席→Decision→M-EXEC→Memory/Growth；本层 = 飞轮末端的**用户侧收口** |
| `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` | 管战略写权；本层管 **记忆学习同意**（正交，不替代） |

工程顺序（冻结，与对话收口一致）：

```text
① 四大能力接入 Council（4+1）
    ↓
② Council Runtime Engine
    ↓
③ M-EXEC 执行闭环（稳定结果数据）
    ↓
④ User Intelligence Evolution（本文件 · Memory/Growth 加深）
```

没有决策与执行数据 = 学习没有燃料。禁止在燃料不足时上「自动变强」营销话术。

---

## 三、现在有什么 / 缺什么

### 已有（架构侧）

- Founder / Project / Decision Memory 设计与部分实现
- Founder Preference、LearningEvent（常委校准）、Knowledge Engine（行业）
- Growth：八维 `FounderCapability`、Decision Pattern、认知差距、`refreshGrowthAfterValidation`

### 缺口（本文件要冻结补齐）

| 缺口 | 说明 |
|------|------|
| **统一 Intelligence Profile** | 能力/风格/偏好散落 profile JSON、Memory、GrowthEvent |
| **高价值行为信号契约** | 决策选择、修改 AI 建议、执行完成率、预测误差 — 未统一 ingress |
| **Evolution 更新规则** | 「观察→判断→反馈→验证→更新」未产品化闸门 |
| **Memory Permission Protocol** | 个人提升 vs 行业贡献未可审计开关 |
| **Council 权重校准闭环** | Member Performance 有战绩；缺「Founder Model → 常委提醒强度」稳定回灌 |

---

## 四、Intelligence Profile V1（最小契约）

> **读模型 / 投影**，不是新表堆砌。V1 允许由 Memory + Growth + profile 组装；对外只暴露本契约。

```typescript
/** 经营者数字镜像 — V1 最小面 */
type FounderIntelligenceProfile = {
  ownerId: string;
  projectId?: string;
  version: "v1";
  updatedAt: string; // ISO
  confidence: number; // 0–1，证据不足则低，禁止虚高

  personality: {
    /** 经营人格摘要（短句，可展示） */
    summary: string;
    traits: string[]; // ≤8
  };

  decisionStyle: {
    riskPreference: "conservative" | "balanced" | "aggressive" | "unknown";
    speedPreference: "deliberate" | "balanced" | "fast" | "unknown";
    detailLevel: "high" | "medium" | "low" | "unknown";
    /** 相对 AI 建议的典型姿态 */
    aiStance: "follow" | "negotiate" | "override" | "unknown";
  };

  /** 复用 Growth 八维；禁止另起一套维度名 */
  businessCapability: Array<{
    dim:
      | "strategy"
      | "positioning"
      | "marketing"
      | "product"
      | "finance"
      | "organization"
      | "execution"
      | "learning";
    score: number; // 0–100
    confidence: number;
    note?: string;
  }>;

  knowledgeLevel: {
    categoryFamiliarity: "low" | "medium" | "high" | "unknown";
    notes: string[];
  };

  executionAbility: {
    recentCompletionRate: number | null; // 0–1
    followThrough: "weak" | "mixed" | "strong" | "unknown";
  };

  historicalLessons: Array<{
    lessonId: string;
    summary: string;
    source: "decision" | "execution" | "override" | "validation";
    outcome: "confirmed" | "partial" | "invalidated" | "unknown";
  }>;

  /** 权限快照（见 §六） */
  permissions: MemoryPermissionState;
};
```

**写入门槛（冻结）：**

- 单次聊天 **不得**单独更新 `businessCapability` 或 `riskPreference`
- 跨项目/多次重复信号 ≥2，或验证/复盘显式回写，才允许升 `confidence`
- 覆盖 AI 建议且有结果验证 → 优先写入 `historicalLessons` + 调整 `aiStance` / 相关维

**产品名映射：**

| 对话用语 | V1 字段 |
|----------|---------|
| Founder Capability Profile | `businessCapability` |
| Founder Digital Twin | `FounderIntelligenceProfile` 整体 |
| Decision Pattern | Growth `DecisionPattern` → 投影进 `historicalLessons` / style |
| Personal Business Model | 同 Digital Twin；禁止另开平行对象 |

---

## 五、学习燃料（只收这四类）

不是所有聊天。V1 只承认：

### 1. 决策行为（最高价值）

```typescript
type DecisionBehaviorSignal = {
  kind: "decision_choice";
  decisionId?: string;
  caseId?: string;
  topic: string;
  optionsShown: string[];
  choice: string; // 含创始人对七常委的裁决
  vsRecommended?: "aligned" | "modified" | "overturned";
  at: string;
};
```

### 2. 修改行为（极高价值）

AI 建议 A，用户坚持 B → 必须可追溯「为何」与后续结果。

```typescript
type OverrideBehaviorSignal = {
  kind: "override_ai";
  recommendation: string;
  userChoice: string;
  reason?: string;
  laterOutcome?: "success" | "fail" | "mixed" | "unknown";
  at: string;
};
```

### 3. 执行行为（M-EXEC）

```typescript
type ExecutionBehaviorSignal = {
  kind: "execution_followthrough";
  planId?: string;
  completionRate: number; // 0–1
  windowDays: number;
  at: string;
};
```

### 4. 结果数据（核心资产）

```typescript
type OutcomeBehaviorSignal = {
  kind: "prediction_error";
  metric: string; // e.g. revenue
  predicted: number;
  actual: number;
  unit?: string;
  at: string;
};
```

统一入口（逻辑名，非强制包名）：

```text
BehaviorSignal → Evolution Engine → GrowthEvent / Memory 写入 → Intelligence Profile 投影刷新
```

**明确不做燃料：** 普通闲聊、未结构化的长文本、未授权的行业侧上传。

---

## 六、Memory Permission Protocol（冻结）

> 不能「偷偷学习用户」。尤其企业用户：收集什么、为何、如何用，必须可展示、可关闭。

```typescript
type MemoryPermissionState = {
  /** 保存本次经营经验到本人/本项目记忆 */
  saveExperience: boolean; // 默认 true
  /** 用于个人能力提升与后续建议校准 */
  useForPersonalGrowth: boolean; // 默认 true
  /** 脱敏后贡献行业模型 / Industry Memory */
  contributeToIndustryModel: boolean; // 默认 false
  /** 用户上次确认时间 */
  confirmedAt?: string;
};
```

| 开关 | 关闭时系统行为 |
|------|----------------|
| `saveExperience=false` | 本轮不写 Decision/Lesson Memory；仍可完成当次决策 UI |
| `useForPersonalGrowth=false` | 不更新八维 / style；Council 不因本轮校准 Founder 侧权重 |
| `contributeToIndustryModel=false` | **禁止**写入 Industry Memory / 跨租户聚合（默认） |

**UI 最低要求（V1）：** 决策归档或学习写入前，可查看三项开关；行业贡献必须显式 opt-in。  
**审计：** 权限变更本身应可追溯（谁、何时、从何值到何值）——实现可后置，语义不可删。

与权限模型 V2 的边界：

- Permission Model V2 = **谁能改战略 / 谁能召回七常委**
- Memory Permission = **记忆能否被学习与共享**
- 二者同时满足才允许「写 Industry + 改战略类记忆」

---

## 七、进化闭环（产品语义）

```text
用户行为（四类信号）
    ↓
AI 观察（BehaviorSignal ingress）
    ↓
能力 / 风格判断（Evolution Engine · 规则优先）
    ↓
生成反馈（GrowthTask / 简报提醒 / 常委语气校准）
    ↓
用户行动
    ↓
结果验证（Validation / Outcome）
    ↓
更新 Intelligence Profile + Memory
```

示例（冻结语义，非实现细节）：

- 连续多次选择「低成本扩张」且结果未证伪 → `riskPreference` 倾向 `conservative`，`confidence` 上升  
- 用户多次推翻「不要加盟」且验证失败 → lesson + 财务/组织维提示加强；**不自动替用户否决下一次加盟**（建议增强，非终局）

**V1 算法边界：** 规则 / 启发式 + 显式置信度；**不做**静默模型微调、不把用户原文送入跨租户训练（除非 `contributeToIndustryModel`）。

---

## 八、七常委如何因此进化

```text
Founder
  → Council
  → Decision
  → Learning（信号 + 结果）
  → Founder Intelligence Profile
  → Better Council（权重 / 提醒强度 / 争议焦点）
```

允许（Runtime / Council 侧）：

- 提高某常委在 Prompt / 议程中的**提醒权重**（例：常低估现金 → CFO 更强）
- 把 Founder 历史 lesson 注入 Case / Insight 上下文

禁止：

- 常委「替老板做终局签字」
- 因画像标签歧视性拒绝开会
- 无 Permission 的跨企业套用他人失败案为硬规则

Member Performance（常委战绩）与 Founder Profile **双轨**：前者评常委准不准，后者评老板是谁；会合在 Decision Trace / LearningEvent。

---

## 九、三个飞轮（与边界）

| 飞轮 | 含义 | V1 边界 |
|------|------|---------|
| **用户飞轮** | 越用越懂该老板 | 依赖 PersonalGrowth 权限；主路径 |
| **行业飞轮** | 用户越多品类规律越强 | **仅** opt-in 脱敏贡献；默认关 |
| **Agent 飞轮** | 案例越多判断越准 | Expert LearningEvent + Knowledge；不得绕过 Adapter / Evidence |

---

## 十、工程落点（禁止乱开包）

**推荐落点（加深现有）：**

```text
apps/web/src/server/founder-layer/
  contracts/intelligence-profile.ts   ← V1 契约
  intelligence/                       ← 投影组装 + evolution 规则（可后置目录）
  memory/                             ← Permission 读写
  capability/growth/                  ← 八维与 refresh 已有

packages/agents/src/founder-os/
  （可选）intelligence-profile.ts 类型导出，与 web 契约同源或再导出
```

**不推荐（V1）：** 新建顶层 `packages/intelligence` 冒充第七 Runtime。若未来抽包，只能是 **契约/纯函数库**，不得注册顾问席。

代码真源（当前相关）：

- Growth：`apps/web/src/server/founder-layer/capability/growth/*`
- Memory：`apps/web/src/server/founder-layer/memory/*`
- Council 学习：`packages/agents/.../knowledge/learning.ts` · `council/knowledge-learning.ts`
- Decision Memory：`packages/agents/.../decision-memory.ts`

---

## 十一、交付 Phase（本层内部）

| Phase | 内容 | 前置 |
|-------|------|------|
| **U0 契约** | ✅ `contracts/intelligence-profile.ts` + 本文件 | — |
| **U1 投影只读** | ✅ `intelligenceRuntime.getProfile` · 简报 `founderIntelligence` · Profile/Growth UI | — |
| **U2 信号 ingress** | ✅ `founderDecide` · `validationOs.complete` · `toggleTodayAction` | — |
| **U3 进化写回** | ✅ Evolution · `councilWeightHints` 注入开会 · Permission UI | — |
| **U4 行业 opt-in** | ✅ `IndustryInsight` 脱敏池 · `tryContributeFromValidation` · `recallIndustryInsights` · Permission UI | 默认关；须 opt-in |

**工程主线提醒：** Council Runtime 仍是产品主线；本层已随决策/验证自动加深，禁止另开第七 Runtime。

---

## 十二、明确不做

| 不做 | 说明 |
|------|------|
| 第七 Runtime | Intelligence Evolution = Memory/Growth 加深 |
| 学习顾问席 | 禁止 `M-LEARN` / `M-GROW` 产品席 |
| 偷学 / 默认进行业模型 | 默认 `contributeToIndustryModel=false` |
| 用聊天当燃料 | 只收 §五 四类信号 |
| 无置信度的人格标签 | `unknown` + 低 confidence 优先于瞎填 |
| 替代签字权 | 画像只增强建议与提醒，不替代 Founder / 常委治理 |

---

## 十三、验收句（给产品与工程）

1. 能回答：「这个老板是什么类型的经营者？」——有 Profile，且带 confidence。  
2. 能回答：「上次他推翻建议后结果如何？」——有 override + outcome 链。  
3. 用户能关闭「用于行业模型」且系统不再写入 Industry。  
4. 不新增 Expert / Runtime 席位名。  
5. 终局叙事一致：**不断成长的 AI 经营大脑**，不是一次性问答工具。

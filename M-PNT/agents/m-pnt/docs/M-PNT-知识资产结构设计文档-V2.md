# M-PNT 知识资产结构设计文档 V2

> 版本：V2 | 状态：草案 | 依赖：V1 | 目标：从"资产分类"推进到"可执行的知识体系"

## 1. V1 回顾与 V2 目标

V1 完成了知识资产的**分类定义**：7 类资产 + 8 个 Schema 文件 + 目录结构 + 调用关系。

V2 要解决的问题是：

| 问题 | V1 状态 | V2 目标 |
|---|---|---|
| 资产间关系 | 隐式调用链 | 显式关系图 + 跨资产索引 |
| 代码/目录双轨 | `knowledge-ries.ts` 与 `knowledge/` 两套 | 统一加载器 + 单数据源 |
| Prompt 上下文生成 | 手动拼接 | 从知识资产到 Prompt 片段的自动转换 |
| 版本控制 | 无 | 知识对象级版本号 + 变更记录 |
| 查询接口 | 无 | 按品类/理论/场景/风险的查询能力 |
| 运行时知识注入 | 仅种子文件 | 知识引擎接口 + 缓存策略 |

---

## 2. V2 知识资产总架构

### 2.1 三层模型

V2 从 V1 的"7 类平铺"升级为"三层架构"：

```text
┌─────────────────────────────────────────────────────────────────────┐
│  应用层 — 消费知识资产的业务模块                                     │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Ries Agent   │ │ Trout Agent  │ │ Ye Agent     │ │ Cross-Fire │ │
│  │ evaluate()   │ │ evaluate()   │ │ evaluate()   │ │ 辩论引擎   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ │
│         │               │               │               │        │
│  ┌──────▼───────────────▼───────────────▼───────────────▼──────┐ │
│  │             知识编排层 (Knowledge Orchestrator)              │ │
│  │  queryByCategory() / queryByTheory() / queryByRiskType()    │ │
│  │  buildPromptFragment() / resolveRelations()                │ │
│  └────────────────────────┬────────────────────────────────────┘ │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│  知识存储层 — 统一数据源                                           │
│                                                                   │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Theory  │ │ Position │ │ Case   │ │Challeng  │ │ Mental    │ │
│  │ Rules   │ │ Patterns │ │ Assets │ │ Rules    │ │ Assets    │ │
│  └─────────┘ └──────────┘ └────────┘ └──────────┘ └───────────┘ │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────────┐  │
│  │ Market Assets│ │ Output Schemas   │ │ 跨资产索引 (V2新增)  │  │
│  └──────────────┘ └──────────────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 存储策略

| 资产类型 | V1 存储 | V2 存储 |
|---|---|---|
| Theory Rules | `knowledge-ries/trout/ye.ts` + `knowledge/theory-rules/examples/` | 统一到 `knowledge/theory-rules/` |
| Case Assets | `knowledge-loader.ts` 内嵌 + `knowledge/case-assets/` | 统一到 `knowledge/case-assets/` |
| Market Assets | `market-intel.ts` + `knowledge/market-assets/` | 统一到 `knowledge/market-assets/` |
| 运行时种子 | `knowledge/seeds.ts` | 合并到统一加载器 |

### 2.3 双轨合并路径

```text
V1 双轨                              V2 单轨
────────────────────────────────────────────────────
packages/agents/                     knowledge/
  src/m-pnt/matrix/                    theory-rules/
    knowledge-ries.ts      ──────►      ries/
    knowledge-trout.ts     ──────►      trout/
    knowledge-ye.ts        ──────►      ye/
    knowledge-loader.ts    ──────►      (废弃，由统一加载器替代)
    market-intel.ts        ──────►      market-assets/
    seeds.ts               ──────►      (合并入统一加载器)
```

---

## 3. 跨资产索引（V2 新增核心）

### 3.1 为什么需要

V1 的资产是孤立的。一个 CaseAsset 上标注了 `theory_tags: [ries, trout]`，但没有指向具体的 TheoryRule。运行时无法做"给我所有和 Ries 第一法则相关的案例"这样的查询。

### 3.2 索引结构

```yaml
# knowledge/_index.yaml — 跨资产索引文件（V2 新增）
# 不存储知识内容，只记录资产间的关系
version: "2.0"
relations:
  # TheoryRule → CaseAsset: 该规则被哪些案例验证/支持
  - from_type: TheoryRule
    from_id: tr-ries-focus-principle
    to_type: CaseAsset
    to_id: case-chayan-yueSe
    relation: supports
    strength: strong

  - from_type: TheoryRule
    from_id: tr-ries-focus-principle
    to_type: CaseAsset
    to_id: case-guyue-longjing-tea
    relation: supports
    strength: medium

  # TheoryRule → ChallengeRule: 违反该规则会导致什么风险
  - from_type: TheoryRule
    from_id: tr-ries-focus-principle
    to_type: ChallengeRule
    to_id: cr-customer-too-broad
    relation: triggers
    strength: strong

  # ChallengeRule → Mitigation Pattern: 该风险的缓解模式
  - from_type: ChallengeRule
    from_id: cr-scene-not-authentic
    to_type: PositioningPattern
    to_id: pp-family-dining-brand
    relation: mitigated_by
    strength: medium

  # CaseAsset → PositioningPattern: 该案例遵循的模式
  - from_type: CaseAsset
    from_id: case-haidilao-service
    to_type: PositioningPattern
    to_id: pp-rebel-brand-packaging
    relation: follows
    strength: strong
```

### 3.3 索引查询接口

```typescript
interface KnowledgeIndex {
  // 查询某条规则的所有支持案例
  getCasesByRule(ruleId: string): Array<{ caseId: string; strength: 'strong' | 'medium' | 'weak' }>;
  
  // 查询某个案例涉及的所有理论规则
  getRulesByCase(caseId: string): Array<{ ruleId: string; strength: 'strong' | 'medium' | 'weak' }>;
  
  // 查询违反某规则可能触发的风险
  getRisksByRule(ruleId: string): Array<{ challengeId: string; strength: 'strong' | 'medium' | 'weak' }>;
  
  // 查询某个风险的建议缓解模式
  getPatternsByRisk(challengeId: string): Array<{ patternId: string; strength: 'strong' | 'medium' | 'weak' }>;
  
  // 按理论体系查询所有关联资产
  getAssetsByTheory(theoryId: 'ries' | 'trout' | 'ye_maozhong'): KnowledgeAssetBundle;
}
```

---

## 4. 知识版本化（V2 新增）

### 4.1 版本号策略

每个知识对象应包含：

```yaml
# 新增字段（所有资产类型通用）
version: "1.2"          # 语义化版本
created_at: "2026-01-15"
updated_at: "2026-07-01"
changelog:
  - version: "1.2"
    date: "2026-07-01"
    changes:
      - "更新 decision_rules：新增场景绑定检查条款"
      - "新增 anti_pattern: 同时绑定多个不相关的需求联想"
  - version: "1.1"
    date: "2026-04-10"
    changes:
      - "新增 applicable_context 字段：覆盖品牌延伸场景"
  - version: "1.0"
    date: "2026-01-15"
    changes:
      - "初始版本"
```

### 4.2 版本影响范围

| 版本变更级别 | 影响 | 示例 |
|---|---|---|
| major (1.x→2.x) | 规则逻辑变化，影响决策输出 | 某条决策规则被废弃/反转 |
| minor (1.1→1.2) | 新增规则/案例，不影响现有逻辑 | 新增 anti_pattern |
| patch (1.1.1→1.1.2) | 描述/示例更新 | 修改 principle 措辞 |

---

## 5. 知识引擎 Loader（V2 统一加载器）

### 5.1 架构

```text
KnowledgeLoader
  │
  ├── loadAll(): KnowledgeBase
  │     └── 从 knowledge/ 目录加载所有资产 + 索引
  │
  ├── loadByTheory(ries|trout|ye): TheoryKnowledgeBundle
  │     └── 加载某理论体系的所有 Rules + 关联 Cases + 关联 Patterns
  │
  ├── loadForCategory(category: string): CategoryKnowledgeBundle
  │     └── 加载某品类的 MarketAssets + Cases + RelatedRules
  │
  ├── buildPromptFragment(query: KnowledgeQuery): string
  │     └── 根据查询条件生成可注入 Prompt 的文本片段
  │
  └── resolveIndex(): KnowledgeIndex
        └── 构建跨资产索引
```

### 5.2 查询接口

```typescript
interface KnowledgeQuery {
  theoryIds?: ('ries' | 'trout' | 'ye_maozhong')[];
  category?: string;
  city?: string;
  scene?: string;
  riskType?: string;
  patternType?: 'success_pattern' | 'failure_pattern' | 'strategy_pattern';
  maxRules?: number;
  maxCases?: number;
}

interface KnowledgeAssetBundle {
  rules: TheoryRule[];
  cases: CaseAsset[];
  patterns: PositioningPattern[];
  challenges: ChallengeRule[];
  mental: MentalAsset[];
  promptFragments: {
    systemPart: string;    // 用于 system prompt 的知识片段
    userPart: string;      // 用于 user message 的知识片段
  };
}
```

### 5.3 Prompt 片段生成策略

```text
KnowledgeQuery
    │
    ▼
KnowledgeLoader.buildPromptFragment()
    │
    ├─ 1. 筛选匹配资产（按 theoryId / category / riskType）
    │
    ├─ 2. 排序：强关联 > 中关联 > 弱关联
    │
    ├─ 3. 截断：rules ≤ maxRules, cases ≤ maxCases
    │
    ├─ 4. 格式化：
    │      【规则 - 理论名】
    │      规则名称 + principle + decision_rules(前3条) + anti_patterns(前2条)
    │
    │      【参考案例 - 品牌名】
    │      初始问题 + 最终定位 + 选择理由 + 可复用原则(前2条)
    │
    └─ 5. 返回 systemPart + userPart
```

---

## 6. 资产 Schema V2 更新

### 6.1 通用字段新增

所有资产类型在 V2 中新增以下通用字段：

```yaml
# 通用字段（所有资产类型）
version: string          # 语义化版本，如 "1.2"
created_at: string       # ISO 日期
updated_at: string       # ISO 日期
changelog: list          # 变更记录（可选）
deprecated: boolean      # 是否已废弃（默认 false）
superseded_by: string    # 被哪个新版本资产替代（可选）
tags: list[string]       # 通用标签，扩展索引维度
```

### 6.2 TheoryRule V2 更新

```yaml
# TheoryRule V2 — 新增字段
fields:
  # ...V1 所有字段保留...
  
  # V2 新增
  version: string
  created_at: string
  updated_at: string
  changelog: list[object]
  deprecated: boolean
  superseded_by: string
  tags: list[string]
  
  # V2 增强
  related_rules: list[string]          # 关联规则 ID（当前规则的补充/冲突）
  related_challenges: list[string]     # 关联风险规则 ID
  decision_weight: enum[high, medium, low]  # 该规则在决策中的权重
  evidence_level: enum[proven, practice, theory]  # 证据等级
```

### 6.3 CaseAsset V2 更新

```yaml
# CaseAsset V2 — 新增字段
fields:
  # ...V1 所有字段保留...
  
  # V2 新增版本字段
  version: string
  created_at: string
  updated_at: string
  changelog: list[object]
  deprecated: boolean
  tags: list[string]
  
  # V2 增强
  related_rules: list[string]          # 该案例验证/支持的理论规则 ID
  related_challenges: list[string]     # 该案例触发的风险规则 ID
  related_patterns: list[string]       # 该案例遵循的定位模式 ID
  decision_chain: list[object]         # 决策过程链（V2 新增关键）
    # - step: "六维诊断"
    #   conclusion: "..."
    #   alternatives_considered: ["方向A", "方向B"]
    # - step: "三理论矩阵"
    #   ries_verdict: "recommend"
    #   trout_verdict: "not_recommend"
    #   ye_verdict: "recommend"
  
  quantified_impact: object            # 量化影响（V2 新增）
    # revenue_growth: "30%"
    # customer_retention: "提升 15%"
    # market_share: "品类前三"
```

### 6.4 MarketAsset V2 更新

当前 `market-intel.ts` 的品类数据（`CityCategoryData`）需要对应的结构化知识资产：

```yaml
# MarketAsset V2 — 对应 market-intel.ts 的 CityCategoryData
object_type: MarketAsset
fields:
  id: string
  category: string
  city: string
  data_type: enum[competition_map, white_spots, mental_landscape, price_band]
  
  # 竞争数据
  leaders: list[CompetitorBrief]
  # 心智空白区
  white_spots: list[string]
  # 价格带
  price_band: list[number]   # [min, max]
  # 饱和度
  saturation: enum[极高, 高, 中, 低]
  # 生命周期
  stage: enum[导入期, 成长期, 成熟期, 衰退期]
  
  # 心智词库
  mental_keywords: object
    # category_words: ["辣", "下饭"]
    # scene_words: ["朋友聚餐"]
    # value_words: ["实惠"]
    # emotional_words: ["过瘾"]
  
  # V2 新增
  version: string
  updated_at: string
  data_confidence: enum[high, medium, low]  # 数据置信度
  source: string                             # 数据来源
```

---

## 7. 目录结构 V2

```text
knowledge/
  _index.yaml                     # V2 跨资产索引
  _loader.ts                      # V2 统一加载器（TypeScript）
  
  theory-rules/
    ries/
      ries-focus-principle.yaml   # V2: 含 version/changelog/related_rules
      ries-category-first.yaml
      ries-ladder-of-preemption.yaml
      ries-category-tree.yaml
      ...
    trout/
      trout-first-association.yaml
      trout-differentiation-imperative.yaml
      trout-flanking-war.yaml
      trout-simplicity-power.yaml
      ...
    ye/
      ye-conflict-core.yaml
      ye-scene-memory.yaml
      ye-communication-propagation.yaml
      ye-execution-reality.yaml
      ...
  
  case-assets/
    haidilao-service.yaml         # V2: 含 decision_chain/quantified_impact
    chayan-yueSe.yaml
    wanglaoji-conflict.yaml
    guyue-longjing-tea.yaml
    feiyue-dumpling.yaml
    laojie-hotpot.yaml
    zhangxiaoheng-noodle.yaml
    weidao-chongqing-sichuan.yaml
    teayeah-failure.yaml
    bali-bear-failure.yaml
    taikang-zhajiangmian.yaml
    ...
  
  positioning-patterns/
    family-dining-brand.yaml
    rebel-brand-packaging.yaml
    category-origin-claim.yaml
    price-flanker.yaml
    ...
  
  challenge-rules/               # 保持 V1 结构
    customer-too-broad.yaml
    scene-not-authentic.yaml
    competitor-copy-easy.yaml
    price-signal-conflict.yaml
    budget-insufficient.yaml
    ...
  
  mental-assets/                 # 保持 V1 结构
    weekend-family-reunion.yaml
    first-association-regional.yaml
    emotional-anchor-price.yaml
    uber-scene-trigger.yaml
    ...
  
  market-assets/                 # V2: 从 market-intel.ts 提取的结构化数据
    changsha-xiangcai-competition.yaml
    changsha-xiangcai-mental.yaml
    chongqing-hotpot-competition.yaml
    beijing-fastfood-competition.yaml
    shanghai-tea-competition.yaml
    ...
  
  output-schemas/                # 保持 V1 结构
    final-solution.schema.yaml
    ...
```

---

## 8. 代码迁移策略

### 8.1 迁移优先级

| 阶段 | 内容 | 涉及文件 |
|---|---|---|
| Phase 1 | 统一加载器 + 索引 | 新增 `knowledge/_loader.ts` | 
| Phase 2 | Theory Rules 迁移 | `knowledge-ries.ts` → `knowledge/theory-rules/ries/` |
| Phase 3 | Market Assets 迁移 | `market-intel.ts` → `knowledge/market-assets/` |
| Phase 4 | Case Assets 增强 | 案例添加 `decision_chain` 字段 |
| Phase 5 | 运行时切换 | `knowledge/seeds.ts` 由加载器替代 |

### 8.2 兼容策略

迁移期间，加载器同时支持：

```typescript
// 兼容模式：同时从目录和代码内嵌加载
const loader = new KnowledgeLoader({
  sources: [
    { type: 'directory', path: './knowledge/' },       // V2 目录
    { type: 'inline', data: riesRules },                 // V1 内嵌（回退）
    { type: 'inline', data: mPntKnowledgeSeeds },        // V1 种子
  ],
  preferDirectory: true,   // 目录优先
});
```

---

## 9. 运行时知识注入流程（V2）

```text
runMPntV1() 启动
    │
    ├── KnowledgeLoader.loadForCategory(category, city)
    │     ├── 从 market-assets/ 加载品类竞争数据
    │     ├── 从 case-assets/ 加载相关案例
    │     ├── 从 theory-rules/ 加载三理论规则
    │     └── 从 mental-assets/ 加载心智词
    │
    ├── buildPromptFragment({ theoryId: 'ries', category: '湘菜' })
    │     ├── 筛选 ries 规则 + 湘菜案例 + 关联风险
    │     └── 返回格式化文本片段
    │
    ├── 注入到 Capability.execute() 的 LLM Prompt 中
    │     ├── M_PNT_SYSTEM_PROMPT + 知识片段（system role）
    │     └── 项目事实 + 候选方向（user role）
    │
    └── LLM 输出 → 规则引擎校验 → MKDecision
```

---

## 10. 与 V1 的对比总结

| 维度 | V1 | V2 |
|---|---|---|
| 资产分类 | 7 类平铺 | 三层模型（应用/编排/存储） |
| 资产关系 | 隐式 | 显式跨资产索引 (`_index.yaml`) |
| 版本控制 | 无 | version/changelog/deprecated 字段 |
| 数据源 | 双轨（代码内嵌 + 目录文件） | 统一加载器，目录优先 |
| 查询能力 | 无 | 按 theoryId/category/riskType 查询 |
| Prompt 生成 | 手动拼接 | `buildPromptFragment()` 自动生成 |
| 案例结构 | 基础字段 + theory_tags | 新增 decision_chain + quantified_impact |
| 市场资产 | `market-intel.ts` 硬编码 | 结构化 `MarketAsset` + 数据置信度 |
| 运行时注入 | seeds.ts 手动注入 | KnowledgeLoader 统一注入 |

---

## 11. 下一步

1. **Phase 1**: 实现 `knowledge/_loader.ts` 统一加载器 + `_index.yaml` 索引
2. **Phase 2**: 迁移 Theory Rules（knowledge-ries/trout/ye.ts → yaml 文件）
3. **Phase 3**: 迁移 Market Assets（market-intel.ts → market-assets/）
4. **Phase 4**: 增强 Case Assets（添加 decision_chain 字段）
5. **Phase 5**: 切换 runtime 使用 KnowledgeLoader，废弃 seeds.ts

# Council Protocol V1 — 七常委治理协议冻结

> **冻结日期**: 2026-07-08  
> **冻结范围**: 七常委决策委员会的全部接口、合约、数据流、运行时对象  
> **冻结性质**: 协议冻结（接口不改），实现可演进（引擎可升级）  
> **真源位置**: `founder-os/`（YAML 配置层）· `packages/agents/src/founder-os/`（TypeScript 运行时层）  
> **文档镜像**: `docs/`（Markdown 规格层）

---

## 零、冻结宣言

> 七常委不是七个 Prompt。  
> 七常委是一个**治理协议**。

| 不是 | 是 |
|------|----|
| 七个 AI 聊天室 | 企业决策委员会 |
| 各自回答后汇总 | 三轮审议 + 交叉质询 + 双轨表决 |
| AI 替老板做决定 | 强迫企业进行高质量思考 |
| 聊天记录当档案 | Decision Brief 是企业核心资产 |
| 每次从零开始 | Decision Memory 持续进化 |

**协议的壁垒不是模型能力，而是：制度 + 流程 + 记忆 + 进化。**

---

## 一、组织架构（冻结）

### 1.1 层级关系

```
Founder（人类创始人 · 最终裁决 · 非第八常委）
    │
CDO（Decision Secretary · 决策秘书长 · 管流程不投票）
    │
Founder Decision Council（FDC · 七常委决策委员会）
    ├── CSO  战略常委  │  看未来  │  McKinsey Strategy Triangle
    ├── CMO  市场常委  │  看变化  │  市场机会公式
    ├── CBO  品牌常委  │  看心智  │  定位公式
    ├── BMO  商业常委  │  看赚钱  │  BMC + 单位经济模型
    ├── CFO  财务常委  │  看安全  │  ROIC + 现金跑道
    ├── COO  运营常委  │  看执行  │  人货场 × SOP × 组织带宽
    └── CRO  风险常委  │  看最坏  │  五类风险 × 概率 × 冲击 × 缓释
    │
Expert Engines（四大专业引擎 · 研究不投票）
    ├── M-PNT  Brand Strategy Engine  │  我是谁？
    ├── M-MKT  Market Intelligence    │  市场有没有机会？
    ├── M-BIZ  Business Model Engine  │  能不能赚钱？
    └── M-ED   Capital & Ownership   │  如何组织资本？
```

### 1.2 固定规则（冻结，不可违反）

1. **Founder 不是第八常委** — 不参与投票，只有最终裁决权
2. **CDO 不是常委** — 管流程、管材料、管门禁，不表达经营立场
3. **Expert Engines 不投票** — 只生产专业报告，供常委消费
4. **七常委禁止二次分析** — 只能基于 Expert Report 做 Decision Intelligence

---

## 二、七常委认知合约（冻结）

### 2.1 统一人格协议

每位常委必须包含以下 8 个维度的认知结构：

```
Identity（身份）→ Mission（使命）→ World View（世界观）
  → Decision Model（判断模型 + 公式 + 步骤）
  → Question Bank（核心问题库）
  → Veto Protocol（否决协议：hard/soft + red_flag）
  → Memory Pattern（学习方式）
  + Natural Bias（天然倾向，制造冲突源）
```

### 2.2 固定首问与天然倾向

| 常委 | 固定首问 | 天然倾向 | 判断模型 |
|------|---------|---------|---------|
| CSO | 这件事是否值得做？ | 看未来 | 市场机会 × 竞争优势 × 组织能力 |
| CMO | 有没有真实需求？ | 看变化 | 需求强度 × 规模 × 增速 ÷ 竞争 |
| CBO | 为什么用户会选你？ | 看心智 | 目标用户 + 竞争环境 + 独特价值 + 可信理由 |
| BMO | 这个模式成立吗？ | 看赚钱 | 单位经济成立 ∧ 利润来源清晰 ∧ 可复制 |
| CFO | 钱够不够，值不值？ | 看安全 | 风险调整后回报 ≥ 门槛 ∧ 现金跑道安全 |
| COO | 现实中能跑吗？ | 看执行 | 可培训 ∧ 可标准化 ∧ 可复制 |
| CRO | 最坏情况是什么？ | 看最坏情况 | 最坏情况清晰 ∧ 有缓释 ∧ 有停损信号 |

### 2.3 否决协议（冻结）

| 常委 | Hard Veto（红线） | Soft Veto |
|------|------------------|-----------|
| CSO 🔴 | 战略漂移：同时在多个互不相关的方向上投入核心资源 | 追热点 / 无聚焦 / 无长期路径 |
| CMO 🔴 | 零行为证据：仅有问卷而无实际转化数据支撑的需求主张 | 老板偏好 / 无购买行为 / 无增长空间 |
| CBO 🔴 | 定位不存在：删掉品牌名后无法说出任何差异化印象 | 无差异 / 靠低价 / 只讲产品 |
| BMO 🔴 | 单店稳态亏损：正常经营条件下单位经济始终为负 | 靠规模掩盖亏损 / 无复制能力 |
| CFO 🔴 | 烧钱换增长且无刹车 / 回报周期不可接受 / 现金安全不足 | 回收路径依赖乐观融资 |
| COO 🔴 | 依赖个人能力 / 无标准 / 无流程 | 培训与爬坡成本被严重低估 |
| CRO 🔴 | 法律风险 / 食品安全 / 致命现金或声誉风险不可承受 | 风险已识别但停损仍模糊 |

**红线规则**：有效 veto → 议题不得直接通过，必须暂缓或进入二次论证，且必须附替代方案。

---

## 三、会议流程（冻结）

### 3.1 五阶段会议

```
Stage 1  议题定义     CDO 产出 Agenda Brief
Stage 2  专业输入     四大引擎 → Expert Report（研究，不投票）
Stage 3  常委审议     五段结构：判断/依据/风险/建议/验证（盲评，禁止互看）
Stage 4  交叉质询     董事会式互怼，必须引用 Evidence ID
Stage 5  形成决议     Decision Resolution（非简单投票，双轨表决）
```

### 3.2 三轮审议机制（冻结）

| Round | 名称 | 规则 | 产出 |
|-------|------|------|------|
| 1 | 独立陈述 | **禁止互看**，独立判断 | Stance Matrix（观点矩阵） |
| 2 | 交叉质询 | 必须引用 Evidence ID 进行挑战 | Conflict Map（冲突图） |
| 3 | 最终决议 | 非简单多数，保留少数意见 | Decision Board（决议板） |

Round1 硬规则：  
- `禁止查看或引用其他常委观点。只输出独立判断。避免互相迎合。`
- `证据不足时不得强行支持。`
- `禁止二次研究：只基于 Expert Reports 做企业选择。`

Round2 硬规则：  
- `必须引用 Evidence ID 质疑对方。`
- `先展示 strongest objection，再展示 majority case。`
- `所有常委必须回应至少一个反方挑战。`

### 3.3 议题分级（冻结）

| 级别 | 例 | 常委会 | 默认花名册 | 创始人 |
|------|----|--------|-----------|--------|
| L1 日常 | 菜单调整 | 不开 | 仅 Expert Engine | 无需 |
| L2 经营 | 增加品类/开新店 | 开 | 3-5 常委 + 相关引擎 | 无需 |
| L3 战略 | 进入新城市 | 开 | 七常委全员 + 引擎 | 确认 |
| L4 生死 | 融资/卖公司/重大转型 | 开 | 七常委全员 + 引擎 | 必裁决 |

---

## 四、常委发言格式（冻结）

### 4.1 禁止用语

`我觉得` · `或许吧` · `一般来说` · `可能还行`

### 4.2 必须包含的五个区块

```
【我的判断】  一句话结论
【核心依据】  Evidence ID（必须引用证据包内的 ID）
【最大风险】  什么情况下会失败
【我的建议】  行动方案 / 替代方案
【需要验证】  下一步需要什么数据
```

### 4.3 输出 Schema（冻结）

```typescript
interface CouncilOpinion {
  member: CouncilRoleId;           // CSO | CMO | CBO | BMO | CFO | COO | CRO
  position: "support" | "oppose" | "conditional";
  confidence: number;              // 0-100
  judgment: string;                // 【我的判断】一句话结论
  evidence_used: string[];         // 【核心依据】Evidence ID 列表
  top_risk: string;                // 【最大风险】
  proposal: string;                // 【我的建议】行动方案
  needs_validation: string;        // 【需要验证】
  reasoning: string[];             // 推理过程
  risks: string[];                 // 风险清单
  conditions: string[];            // 条件清单
  veto: boolean;                   // 是否触发红线否决
  veto_reason?: string;            // 红线理由
  challenge_to_others?: string[];  // 向其他常委的质询
  response_to_challenges?: string[]; // 对他人的回应
  change_of_view?: boolean;        // 是否改判（Round3）
  change_reason?: string;          // 改判理由
  minority_report?: boolean;       // 是否保留少数意见
  prediction?: {                   // 三情景预测
    best_case?: string;
    base_case?: string;
    worst_case?: string;
    kill_metric?: string;
  };
}
```

---

## 五、双轨表决（冻结）

### 5.1 Track A — 一人一票

- 计 `support` / `oppose` / `conditional` 人数
- 多数侧 = support + conditional 人数 > oppose 人数
- 通过门槛：L2 ≥ 60%、L3 ≥ 85%、L4 = 全员推进侧（红线管）

### 5.2 Track B — Red Flag（专业否决）

- 有效红线角色：CFO（现金/资本）、CRO（合规/声誉/法律）、COO（执行/无标准）、以及决策类型授权的角色
- **红线触发 → 议题不得直接通过**
- 红线必须附带替代方案（`must_on_veto`）

### 5.3 决策类型矩阵（冻结）

| 类型 | 门槛 | Veto 角色 |
|------|------|-----------|
| new_city_expansion | 6/7 + 创始人确认 | CFO, COO, CRO |
| new_brand | 6/7 + 创始人确认 | CBO, CFO |
| fundraising | 7/7 + 创始人确认 | CFO, CRO |
| store_expansion | 5/7 | CFO, COO |
| restructuring | 7/7 + 创始人确认 | COO, CRO |

### 5.4 推荐结果

`"执行"` | `"暂缓"` | `"推翻"`

---

## 六、Decision Board（决议板）— 创始人看到的（冻结）

```typescript
interface DecisionBoard {
  title: string;                    // 决策事项
  consensus: string[];              // 共识（支持席+条件席）
  biggestDispute: string;           // 最大争议
  minorityReport: string[];         // 少数意见（不可删除）
  recommendedAction: "执行" | "暂缓" | "推翻";
  conditions: string[];             // 执行条件
  risks: string[];                  // 风险清单
  validation: Array<{ task: string; metric: string }>;  // 验证任务
  founderChoices: ["接受委员会", "修改方案", "推翻委员会"];
}
```

---

## 七、Founder Override（冻结）

创始人**不是**第八常委，不参与投票，但有最终裁决权。

Override 必填字段：
1. `whyDisagree` — 为什么不同意委员会建议
2. `coreJudgment` — 我的核心判断
3. `acceptedRisks` — 我承担哪些风险
4. `validationMethod` — 验证方式

事后追踪：`whoWasRight` — `founder | council | mixed | unknown`

---

## 八、Decision Brief（核心数据单元 · 冻结）

### 8.1 完整结构

```typescript
interface DecisionBrief {
  briefId: string;
  // 输入层
  casePacket: CasePacket;           // 议题定义
  evidencePacket?: EvidencePacket;  // 证据包
  expertReports: ExpertReport[];    // 四大引擎专业报告
  // 审议层
  councilOpinions: CouncilOpinion[]; // 七常委意见
  conflicts: DecisionBriefConflict[]; // 冲突轴
  // 决议层
  resolution: DecisionResolution;    // 决议结果
  founderOverride?: {                // Founder 裁决
    overrode: boolean;
    finalAction: "执行" | "暂缓" | "推翻";
    note: FounderDecisionNote;
  };
  // 执行层
  validationPlan: ValidationPlan;   // 验证计划
  // 学习层
  learningHook?: {
    outcomeStatus: "pending" | "validated" | "killed" | "overridden_success" | "overridden_fail";
    whoWasRight: "founder" | "council" | "mixed" | "unknown";
    lesson?: string;
  };
}
```

### 8.2 核心资产（不是聊天记录）

Decision Brief 是企业决策数据库的基本单元。  
每次会议产出一个 Brief，写入 Decision Memory。  
禁止只保存聊天记录。

---

## 九、Decision Memory（决策记忆 · 冻结）

### 9.1 结构

```typescript
interface DecisionMemory {
  memoryId: string;
  caseId: string;
  decision: "执行" | "暂缓" | "推翻";
  rationale: string[];         // 决策依据
  objections: string[];         // 反对意见 + 红线（不可删除）
  resolutionSnapshot: DecisionResolution;
  founderOverride?: ...;
  outcome?: {                   // 验证后回写
    whatHappened?: string;
    deviation?: string;
    whoWasRight?: "founder" | "council" | "mixed" | "unknown";
    lesson?: string;
  };
  createdAt: string;
  closedAt?: string;
}
```

### 9.2 记忆进化闭环

```
企业问题 → FDC 审议 → Decision Brief → 执行验证
  → 结果回写 Decision Memory
  → 校准常委权重 / 红线灵敏度 / Override 成功域
  → 下次决策时注入历史相似案例
```

---

## 十、知识资产架构（冻结）

每位常委的知识库包含六个模块：

| 模块 | 用途 | 运行时注入 |
|------|------|-----------|
| Methodology | 方法论（如 McKinsey Strategy, BMC） | Round1 Prompt |
| Frameworks | 判断框架+公式+步骤 | Round1 Prompt |
| Cases | 案例锚点（成败经验） | Round1 Prompt |
| Benchmarks | 行业基准参考 | Round1 Prompt |
| Questions | 核心问题库 | Round1+Round2 Prompt |
| FailurePatterns | 失败模式+信号+对策 | Round1 Prompt |

知识更新通过 Expert Learning Loop：
`预测 → 执行 → 结果 → 偏差 → learning_adjustments → 权重校准`

---

## 十一、Expert Engine 联动协议（冻结）

### 11.1 四大引擎定位

| Engine | 问题 | 产出 | 常委消费镜头 |
|--------|------|------|-------------|
| M-PNT | 我是谁？ | Brand Strategy Report | CBO(稀释?)、CSO(长期?)、CMO(心智?) |
| M-MKT | 市场有没有机会？ | Market Intelligence | CMO(需求?)、CSO(窗口?)、BMO(赚钱?) |
| M-BIZ | 能不能赚钱？ | Business Model Report | BMO(盈利?)、CFO(ROI?)、COO(落地?) |
| M-ED | 如何组织资本？ | Capital Structure | CFO(结构?)、CRO(合规?)、CSO(方向?) |

### 11.2 转换契约（硬规则）

1. 常委输入 = Case Packet + Evidence Packet + Expert Reports
2. 常委不得自行检索外部世界重做研究
3. 常委输出 = 企业视角的 support/oppose/conditional + 条件 + veto + kill metric
4. 若 Expert Report 缺失，常委应标出证据缺口并倾向 conditional/oppose
5. Founder View 是输入模块，不是预设结论

---

## 十二、扩展能力（协议扩展点，非强制）

以下能力在当前 V1 协议中**可选实现**，但接口已冻结：

### 12.1 跨角色质询（Cross-Examination）

7×7 质询矩阵，每位常委对其他 6 位有针对性挑战问题。
触发时机：Round2 交叉质询阶段。
输出：`examinationPacket` — 包含 from/to/question/conflictAxis/severity。

### 12.2 假设情景分析（Scenario Analysis）

每位常委可做与其角色匹配的 What-If 推演。
- CSO: 竞争格局恶化情景
- CMO: 需求萎缩情景
- CBO: 品牌稀释情景
- BMO: 单位经济压力测试
- CFO: 现金极端情景
- COO: 执行走样情景
- CRO: 最坏情景全面推演

### 12.3 常委决策战迹（Track Record）

追踪每位常委的：历史决策、准确率、校准偏差、盲区。
Round2/Round3 自动注入校准提示。

---

## 十三、代码 ↔ 配置 ↔ 文档映射（冻结）

| 组件 | YAML 配置 | TypeScript 运行时 | Markdown 规格 |
|------|-----------|-----------------|---------------|
| 宪法 | `constitution/council_constitution.yaml` | `catalog.ts` COUNCIL_CONSTITUTION | `FOUNDER_OS_DECISION_COUNCIL_CONSTITUTION_V1.md` |
| 角色合约 | `roles/*.yaml` (7个) | `catalog.ts` ROLE_CONTRACTS | `FOUNDER_OS_COUNCIL_PERSONA_V2.md` |
| 人格模型 | `roles/persona_protocol_v2.yaml` | `persona-v2.ts` PERSONA_V2 | `FOUNDER_OS_COUNCIL_PERSONA_V2.md` |
| 会议引擎 | `operating-rules/meeting_engine_v1.yaml` | `meeting-engine.ts` | `FOUNDER_OS_COUNCIL_MEETING_ENGINE_V1.md` |
| 运行规则 | `operating-rules/council_operating_rules_v1.yaml` | `catalog.ts` | `FOUNDER_OS_COUNCIL_OPERATING_RULES_V1.md` |
| 知识资产 | `knowledge/*` | `knowledge/catalog.ts` | `FOUNDER_OS_COUNCIL_KNOWLEDGE_ASSETS_V1.md` |
| Expert×Council | `architecture/expert_to_council.yaml` | `expert-engines.ts` / `prompt-stack.ts` | `FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md` |
| 议题识别 | — | `issue-classifier.ts` | `FOUNDER_OS_DECISION_COUNCIL_CONSTITUTION_V1.md` |
| 双轨表决 | — | `dual-track.ts` + `resolution.ts` | `FOUNDER_OS_DECISION_COUNCIL_CONSTITUTION_V1.md` |
| Decision Brief | — | `decision-brief.ts` | `FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md` |
| Decision Memory | — | `decision-memory.ts` | 同上 |
| CDO | — | `cdo.ts` | `FOUNDER_OS_DECISION_COUNCIL_CONSTITUTION_V1.md` |
| 质询引擎 | — | `cross-examination.ts` | 本文 §12.1 |
| 情景分析 | — | `scenario-engine.ts` | 本文 §12.2 |
| 战迹追踪 | — | `track-record.ts` | 本文 §12.3 |

---

## 十四、协议版本与演进规则

### 14.1 版本

- 当前协议：**Council Protocol V1.0.0**
- 冻结日期：**2026-07-08**
- 下一版本触发条件：任一接口不兼容变更

### 14.2 变更规则

| 变更类型 | 允许 | 需要 |
|---------|------|------|
| Bug 修复 | ✅ 随时 | PR + 测试 |
| 引擎升级（不改接口） | ✅ 随时 | PR + 测试 |
| 新增常委席位 | ⚠️ 需审议 | V2 协议 |
| 修改发言格式 | ❌ 冻结 | V2 协议 |
| 修改双轨表决规则 | ❌ 冻结 | V2 协议 |
| 修改 CouncilOpinion 必填字段 | ❌ 冻结 | V2 协议 |
| 修改输出 Schema | ❌ 冻结 | V2 协议 |

### 14.3 冻结验证清单

- [x] 七常委 8 维认知结构完整
- [x] 全部 7 位有 Hard Veto（红线）
- [x] 发言 5 段格式冻结
- [x] 禁止用语清单冻结
- [x] 三轮审议机制冻结
- [x] 双轨表决冻结
- [x] 议题分级 L1-L4 冻结
- [x] 决策类型矩阵冻结
- [x] Decision Board 结构冻结
- [x] Founder Override 必填字段冻结
- [x] Decision Brief 结构冻结
- [x] Decision Memory 结构冻结
- [x] Expert→Council 转换契约冻结
- [x] 知识资产 6 模块冻结
- [x] Cross-Examination 接口冻结
- [x] Scenario Analysis 接口冻结
- [x] Track Record 接口冻结
- [x] YAML ↔ TypeScript ↔ Markdown 三向映射

---

## 附录：API 映射

### 会议生命周期

| API | 输入 | 输出 | 位置 |
|-----|------|------|------|
| `conveneCouncilMeeting` | topic, forceLevel, roster | CouncilMeetingSession | `meeting-engine.ts` |
| `prepareRound1` | session, expertReports, evidencePacket | session (round1_prompts_ready) | `meeting-engine.ts` |
| `submitRound1Opinions` | session, opinions | session (round1_matrix_ready) | `meeting-engine.ts` |
| `prepareRound2` | session, round1Opinions | session (round2_challenges_ready) | `meeting-engine.ts` |
| `closeCouncilMeeting` | session, finalOpinions, founderOpts | session (closed) | `meeting-engine.ts` |
| `buildStanceMatrix` | opinions | StanceMatrix | `meeting-engine.ts` |
| `buildConflictMap` | opinions, challenges, evidence | ConflictEntry[] | `meeting-engine.ts` |
| `buildDecisionBoard` | title, opinions, resolution, conflicts | DecisionBoard | `meeting-engine.ts` |

### 决策对象

| API | 位置 |
|-----|------|
| `resolveCouncilDecision` | `resolution.ts` |
| `resolveDualTrack` | `dual-track.ts` |
| `buildDecisionBrief` | `decision-brief.ts` |
| `applyFounderOverride` | `decision-brief.ts` |
| `createDecisionMemory` | `decision-memory.ts` |
| `memoryFromBrief` | `decision-memory.ts` |

### 角色与知识

| API | 位置 |
|-----|------|
| `getPersonaV2` | `persona-v2.ts` |
| `renderPersonaV2Block` | `persona-v2.ts` |
| `getRoleContract` | `catalog.ts` |
| `getKnowledgeBase` | `knowledge/catalog.ts` |
| `renderKnowledgeBlock` | `knowledge/catalog.ts` |
| `buildCouncilRuntimePrompt` | `prompt-stack.ts` |
| `renderExaminationBlock` | `cross-examination.ts` |
| `renderScenarioBlock` | `scenario-engine.ts` |
| `renderTrackRecordBlock` | `track-record.ts` |

### Web API

| tRPC Procedure | 功能 | 位置 |
|---------------|------|------|
| `decisionCouncil.open` | 打开决策室 | `decision-council.ts` |
| `decisionCouncil.advanceDebate` | Round1→Round2 | `decision-council.ts` |
| `decisionCouncil.advanceBoard` | 生成决策板 | `decision-council.ts` |
| `decisionCouncil.founderDecide` | Founder 裁决 | `decision-council.ts` |
| `decisionCouncil.runToBoard` | 一键到决策板 | `decision-council.ts` |
| `decisionCouncil.meta` | 预设+席位查询 | `decision-council.ts` |
| `decisionCouncil.validateRoster` | 花名册校验 | `decision-council.ts` |

---

> **协议冻结完成**  
> 后续任何变更必须经协议版本审议，不得单方面修改接口。

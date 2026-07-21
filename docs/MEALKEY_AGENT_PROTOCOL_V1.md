# MealKey Agent Protocol V1（餐启 Agent 协议 · 冻结）

> **版本：** V1.2  
> **状态：正式冻结（Freeze）** — 生态规则，不只是技术接口  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **官网：** `https://mealkey.cn`  
> **产品一句：** MealKey 不是开发一堆 Agent，而是定义餐饮经营 Agent 操作系统；本协议把「能力」标准化，防止生态变成 AI 应用垃圾场。  
> **三文档收口（生态下一层）：**  
> 1. **本文** — 第三方 Agent 技术与能力标准化（Protocol · 宪法）  
> 2. `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md` — Agent 商城与开放平台（老板侧）  
> 3. `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md` — 第一个官方样板（Hello World）  
> **开发者机场（产品）：** `MEALKEY_DEVELOPER_PORTAL_V1.md` · `https://developers.mealkey.cn`  
> **线级接入面：** `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`（Gateway · Context · Ingress）  
> **配套：** `MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md` · `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md` · `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` · `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`  
> **代码落点（演进）：** `@mealkey/tool-agent-kit` · `@mealkey/agent-sdk` · Host Bridge  
> **冲突裁决：** 生态规则以本文为准；商城 UX/商业化以 Marketplace PRD 为准；L3 四件套以 Tool Agent Framework 为准；HTTP 形状以 External Interface 为准；战略边界以 AUTHORITY 为准  

---

## 目录（冻结）

1. Agent 定位与五层模型  
2. Agent Manifest  
3. Capability Registry（能力地图）  
4. Context Contract（含 Brain 租用）  
5. Evidence Contract  
6. Insight Contract（输出分级 L1–L5）  
7. Decision Skill Contract  
8. Permission Model  
9. Quality Model  
10. Marketplace Model（餐饮能力市场）  
11. Memory 隔离与 Learning  
12. Runtime 调用与三模式  
13. Version Strategy  
14. 合规样板 m-ops-diag  
15. 验收与下一步  

---

## 0. 护城河（冻结）

| 壁垒 | 资产 |
|------|------|
| 数据 | Restaurant Brain |
| 认知 | Decision Intelligence |
| 生态 | **Agent Protocol（把能力拆解·封装·组合·交易）** |

护城河不是某一个模型，也不是某几个 Agent，而是：

> **把餐饮经营领域的能力标准化。**

外置 `restaurant-diagnosis`（`M-OPS-Agent`）= 第一个协议合规样板。

---

## 1. Agent 定位与五层模型（冻结）

### 1.1 接协议，不接库

```text
❌ Agent → Prisma / 全库
✅ Agent → Protocol → Runtime → Identity / Brain / Memory / Decision / Execution
```

### 1.2 铁律

1. 零直连数据面  
2. 能力必须挂 Capability Registry（禁无限自造）  
3. 核心交付物是 **Decision Skill**，不是 Prompt  
4. 合法 Port：Signal · Insight · Work · Gap  
5. 默认最大输出级 **L3**；L4/L5 须平台认证  
6. 无永久私有记忆；Learning 经 Brain 审核  
7. 永不升格 L1 / 战略终局  

### 1.3 五层结构（任何 Agent 必须符合）

```text
                 Agent
                  ↑
        Capability Layer     它能解决什么问题
                  ↑
        Intelligence Layer   它如何判断（Decision Skill）
                  ↑
        Context Layer        它基于什么事实（MKContext 租用）
                  ↑
        Evidence Layer       它有什么依据
                  ↑
        Execution Layer      如何产生改变（经 Port → Host，非直写）
```

缺任一层 → 不得 Live 上架。  
「只有 Prompt」= 不合格。

---

## 2. Agent Manifest（冻结）

```typescript
AgentManifestV1 {
  id: string                         // m-<domain> | partner.<org>.<slug>
  name: string
  version: string                    // semver
  provider: "mealkey" | "partner" | "enterprise"
  runtimeMode: "inprocess" | "cloud_https" | "enterprise_local"
  stage: "idea" | "pilot" | "sandbox" | "live" | "deprecated"

  /** 必须挂 Registry，见 §3 */
  capabilityIds: string[]            // 例 ["ops.diagnosis.health_check"]

  ports: Array<"signal"|"insight"|"work"|"gap">
  maxInsightLevel: 1 | 2 | 3 | 4 | 5  // 默认 ≤3；4/5 须认证

  permissions: DataPermissionV1[]
  skillPackageRef: string            // Decision Skill Package 契约 ID

  schemas: { inputRef: string; outputRef: string }
  invokePolicy: {
    requiresDecisionAuth: boolean
    requiresBossConfirm: boolean
    billable: boolean
  }
  quality: {
    minEvidenceSteps: number         // 首页 Signal 默认 ≥2
    allowsInferenceOnly: false
  }
  marketplace?: {
    priceMonthlyFen?: number
    pricePerUseFen?: number
    pitch?: string                   // 能力卖点，非 App 介绍
  }
}
```

对齐：`ToolAgentManifest`（kit）+ `agent-sdk` 演进字段。

---

## 3. Capability Registry（冻结）

### 3.1 规则

> Agent **不允许无限定义能力**。必须挂到 MealKey 能力分类。

未注册 `capabilityId` → 审核失败。

### 3.2 一级分类（V1）

```text
经营 · 营销 · 产品 · 组织 · 财务 · 增长 · 学习 · 选址
```

（与 Tool `kind` 可映射：ops/campaign/menu/hiring/finance/…）

### 3.3 二级示例（经营）

```text
经营
 ├─ ops.diagnosis.*      经营诊断
 ├─ ops.cost.*           成本分析
 ├─ ops.efficiency.*     效率优化
 └─ ops.store_mgmt.*     门店管理
```

样板能力（m-ops-diag）：

```json
{
  "capabilityIds": [
    "ops.diagnosis.health_check",
    "ops.diagnosis.problem_detection",
    "ops.diagnosis.operation_analysis"
  ]
}
```

### 3.4 能力地图目标

Registry 累积后形成 **餐饮经营能力地图** —— Marketplace 按能力浏览，不是按 App 图标浏览。

新增一级/二级：须改本文 + Registry 真源，禁止 silently 膨胀。

---

## 4. Context Contract（冻结）

### 4.1 MKContextV1

第三方只消费 Host 下发投影（见 V1.0 字段集），核心块：

- `user` · `businessIdentity`  
- `restaurantBrain`（facts/history/dna **切片**）  
- `externalEvidence`  
- `decisionContext` · `invoke`  

### 4.2 Brain 租用模型

第三方 **不拥有** 餐厅数据。请求：

```json
{
  "agent": "m-ops-diag",
  "need": ["store.basic", "reviews", "sales.trend"]
}
```

Runtime 按 Permission 裁剪 → 返回 **Context Package**。  
类比：iOS 不给 App 整机权限。

`RestaurantDiagnosisRequest` = 诊断场景下的合法特化投影。

---

## 5. Evidence Contract（冻结）

1. 进宿主的判断须可追溯 Evidence（`EVIDENCE_CHAIN_PROTOCOL_V1`）。  
2. 首页 Signal：`evidenceChain.length ≥ 2`，且不得纯 inference。  
3. 权重服从采集架构 / 决策质量机制；AI 推测不得冒充事实。  
4. 无证据 → Gap，禁止装懂。  

---

## 6. Insight Contract · 输出分级（冻结）

**不能所有输出都进老板视野。**

| Level | 名称 | 含义 | 例 | 默认第三方 |
|-------|------|------|-----|------------|
| **L1** | Observation | 观察/事实 | 近30天等待相关差评关键词 +35% | ✅ |
| **L2** | Diagnosis | 诊断判断 | 高峰人员配置不足是主因（有 Pattern） | ✅ |
| **L3** | Recommendation | 关注/改善建议 | 建议评估晚高峰排班（非拍板） | ✅ 默认上限 |
| **L4** | Decision Support | 决策室议题 | 是否增加一个晚班人力？ | 🔒 须认证 |
| **L5** | Execution | 进 M-EXEC | 生成排班调整计划 | 🔒 须认证 + 授权 |

### 6.1 与 Ports 映射

| Level | 典型 Port / 落点 |
|-------|------------------|
| L1–L2 | Signal（今日）· Gap |
| L3 | Signal.watchHint · Insight（弱） |
| L4 | Insight → 决策室（Promote Gate） |
| L5 | Work → Execution（须 `requiresDecisionAuth`） |

### 6.2 硬规则

- Manifest `maxInsightLevel` 默认 **3**  
- 未认证 Agent 输出 L4/L5 → Runtime **降级或拒收**  
- L3 禁止「请批准 / 已决策」句式  
- L4 只形成议题，拍板仍只在决策室  
- Report 长文不是一等公民；须附带 L1+ 结构化物  

---

## 7. Decision Skill Contract（冻结）

### 7.1 核心不是 Prompt

```text
普通 AI:  问题 → LLM → 答案
MealKey:  问题 → Context → Evidence → Hypothesis
          → Challenge → Assessment → Action → Learning
```

第三方提交物：

| ❌ 不合格 | ✅ 合格 |
|----------|--------|
| 「我的 Prompt 很牛」 | **Decision Skill Package** |

### 7.2 Skill Package 形状

```typescript
DecisionSkillPackageV1 {
  skillId: string                 // 例 skill.ops.restaurant_health
  title: string                   // 餐厅健康评估
  capabilityIds: string[]

  inputs: string[]                // 经营数据 · 顾客评价 · 竞争环境
  judgments: string[]             // 收入/产品/服务/组织风险 等判断面
  outputs: {
    maxLevel: 1|2|3|4|5
    ports: Array<"signal"|"insight"|"work"|"gap">
  }

  /** 推理阶段声明（可映射 DIE） */
  stages: Array<
    | "context" | "evidence" | "hypothesis"
    | "challenge" | "assessment" | "action" | "learning"
  >

  /** 稳定性：同输入应同档结论的约束说明 */
  stabilityNotes?: string
}
```

样板叙事（m-ops-diag）：

```text
Skill: 餐厅健康评估
输入: 经营事实 · 顾客评价 · 竞争环境
判断: 收入/产品/服务/组织等风险面
输出: 诊断卡 · 改善关注项 · 待验证 gaps（默认 ≤L3）
```

---

## 8. Permission Model（冻结）

### 8.1 可读声明（最小集）

`Restaurant.Basic` · `Restaurant.Facts` · `Restaurant.Reviews` · `Restaurant.Operation` · `Restaurant.Market` · `Brain.DNA`（高门槛）· `Finance.Summary`

### 8.2 默认拒绝

`Founder.Personal` · `Finance.Bank` · `Org.HR.PII` · `Raw.Database`

### 8.3 写出

仅经 Ports；`WRITE_MEMORY` **仅 Host**。映射既有 `ToolPermission`。

---

## 9. Quality Model（冻结）

防止能力市场变成垃圾场。

### 9.1 五维 Agent Quality Score

| 维度 | 说明 |
|------|------|
| **Accuracy** | 判断是否经得起复核 |
| **Evidence** | 有没有依据 / 链是否完整 |
| **Explainability** | 能否说明为什么（L1→L2 可追溯） |
| **Outcome** | 能否改变结果（进今日/决策/执行后的有效性） |
| **Learning** | 是否经平台 Learning 闭环变好（非私自记忆） |

```text
AgentScore ≈ Accuracy + Evidence + Explainability + Outcome + Learning
（实现可归一 0–100；上架用阈值）
```

### 9.2 运行时拒收（摘要）

Port 未声明 · 无证据上主位 · 纯推理链 · 拍板句 · 无源数字 · 越级 L4/L5 · 越权字段。

### 9.3 阈值（V1 建议）

Sandbox ≥ 70 · Live ≥ 80 · 抽检失败降级/下架。

与旧版加权式 QualityScore 并存时：**五维为人读真源**；加权式为自动化近似，冲突以五维审计为准。

---

## 10. Marketplace Model（冻结）

### 10.1 不是应用商店

> 餐饮 **能力市场**：老板购买的是能力，不是下载 App。  
> **产品真源：** `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md`（Store · Developer Center · 安装 · 分成）。  
> **域名：** `mealkey.cn`（Store）· `mealkey.cn/developers`（开发者中心）。

例（价格示意，不冻结数字）：

| 能力 | 计价形态 |
|------|----------|
| 经营诊断 | ¥199/月 |
| 品牌定位 | ¥999/次 |
| 选址分析 | ¥499/次 |

### 10.2 生命周期

```text
注册 Manifest + Skill Package
  → 能力挂载审核（Registry）
  → Sandbox（标准模拟餐厅）
  → 发布能力市场（Published）
  → 用户按门店安装/订阅（非下载安装包）
```

官方 / 第三方 / 企业私有三类供给，均服从同一 Protocol；供给节奏服从 MVP 停扩闸门。

### 10.3 平台收入钩子

抽佣（V1 示意开发者 70% / 平台 30%）· Brain/M-INTEL 调用计费 · 企业版接入。  
具体费率商务定；协议冻结 `billable` + 计量点。

---

## 11. Memory 隔离与 Learning（冻结）

第三方 Agent **不能**直接拥有用户永久记忆。

```text
❌ Agent 偷偷保存老板习惯 / 跨店档案
✅ Agent → Learning Event → MealKey Brain 审核 → 写入 Decision DNA / Memory
```

| 规则 | 含义 |
|------|------|
| 会话态 | 单次 invoke 内可用 |
| 结果态 | Signal/Insight 由 Host 落今日/决策室 |
| 长期态 | 仅经审核的 Learning Event |
| 禁止 | Agent 侧私有用户画像库 |

---

## 12. Runtime 调用与三模式（冻结）

```text
Host.invoke → 鉴权 → Context 切片 → 调度 Engine
  → 校验 Port / Level / Quality → 投影宿主 → 审计/计费
```

| 模式 | 说明 |
|------|------|
| inprocess | 仅历史/过渡；**新能力禁止**以此在 Core 新增 Agent |
| cloud_https | **默认**：外置云 Agent；经 Gateway 租用 Context；只回 Ports |
| enterprise_local | 企业私有 Runtime |

远程：禁止回调内部读库 API。  
**官方样板 M-OPS 已外置（cloud_https）**；见 `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`。

---

## 13. Version Strategy（冻结）

| 规则 | 说明 |
|------|------|
| Protocol semver | 破坏性变更升 major；本文 V1.x 内可加字段 |
| Agent semver | Manifest.version；Host 可钉版本调用 |
| Capability 稳定性 | 已 Live 的 capabilityId 不改语义；废弃走 `deprecated` |
| 双轨兼容 | 旧 ToolAgentManifest 可适配升级；新字段缺省=最严（maxLevel=3） |
| 停扩闸门 | Store 批量上架服从 MVP 核心飞轮闸门 |

---

## 14. 合规样板：m-ops-diag / M-OPS-Agent（冻结）

> 完整「用户产品 · 开发模板 · 教材」定义见 `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`。  
> 实现仓：`C:\Users\xqw13\M-OPS-Agent`（禁止回流 Core）。

覆盖闭环验证：

```text
用户输入餐厅 → Identity → Brain → M-INTEL
  → 经营扫描 → 诊断 → Signal → Decision → Execution → Learning
```

| 项 | 值 |
|----|-----|
| id | `m-ops-diag` |
| capabilities | ops.diagnosis.* |
| maxInsightLevel | 3（认证前） |
| ports | signal · insight · gap |
| skill | 餐厅健康评估 |
| 五层 | 齐备（Execution 仅经 Host/决策授权） |

第一个实现叙事：`restaurant-diagnosis-agent implements Agent Protocol V1`（工程 id 仍为 `m-ops-diag`）。

---

## 15. 验收标准（冻结）

1. 无 Manifest / 无 Skill Package → 不可调用  
2. capabilityId 不在 Registry → 不可上架  
3. 默认第三方无法发出 L4/L5  
4. Agent 进程无 DB 凭证、无永久用户记忆  
5. 输出可映射 L1–L3 且证据可追溯  
6. Learning 不经 Brain 审核不得进 DNA  

---

## 16. 下一步（冻结）

**平台原则与架构已另冻：**  
`MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md` · `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md`

下一刀：

# Developer Portal：P0.1 UI + Prisma 草案（按 IA）

> UI/UX V1.1 · IA/数据模型 V1 已冻  
> **停扩协议**；对象落库不得污染 Brain/Decision；Publish 接既有 Listing。

并行：诊断 Agent 按**独立产品形状**推进（Gateway 语义），禁止在 Core 再堆业务 Agent。

---

## 17. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | Manifest · MKContext · Ports · Permission · Runtime · Quality · Store |
| V1.1 | 2026-07-21 | 五层模型 · Capability Registry · Decision Skill · Insight L1–L5 · 五维质量 · Memory 隔离 · 能力市场 · Version Strategy · 下一刀=开发者接入流程 |
| V1.2 | 2026-07-21 | 三文档收口 · mealkey.cn · Marketplace PRD 挂钩 · M-OPS=Reference Implementation · cloud_https 默认 |
| V1.2+ | 2026-07-21 | 下一刀改为 Portal P0；宪法索引独立成文 |

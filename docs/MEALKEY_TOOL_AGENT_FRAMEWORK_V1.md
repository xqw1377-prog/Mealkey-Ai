# MealKey Tool Agent Framework V1（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `MEALKEY_AGENT_PROTOCOL_V1.md` · `MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` · `FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` · `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` · `BUSINESS_SIGNAL_ENGINE_V1.md`  
> **代码真源：** `@mealkey/tool-agent-kit` · `packages/agents/src/founder-os/vertical-mk-insight-adapter.ts`  
> **冲突裁决：** 生态第三方接入以 `MEALKEY_AGENT_PROTOCOL_V1` 为准；L3 四件套/四 Ports 以本文为准；战略边界以 `AUTHORITY.md` 为准

---

## 0. 一句话

> **约 100 个独立 Agent = 同一套 L3 框架上的可插拔工具；可拆分运行、可组合进 MealKey；永不升格为第五顾问席。**

> **生态上层：** `MEALKEY_AGENT_PROTOCOL_V1` = 接入契约；`MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1` = Gateway/独立部署；`MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1` = OS 定规则。  
> 本文 = 过渡期 L3 四件套工程具体化。  
> **硬闸门（2026-07-21）：MealKey 仓禁止新增任何 Agent**；外接见 `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`。

MealKey 不是「不断加聊天机器人」，而是：

```text
L1 四席（永远 4）     → 战略判断
L2 六大 Runtime（冻） → 经营闭环
L3 Tool Agent（可扩） → 场景执行物  ← 本文只冻结这一层的框架
```

---

## 1. 三层铁律（不得破坏）

| 层 | 数量 | Agent 可否无限加 | 可否做战略终局 |
|----|------|------------------|----------------|
| L1 Decision | 4 席 | **否** | **是**（经 Council） |
| L2 Runtime | 6 个 | **否** | **否** |
| L3 Tool | ~100 | **是** | **否** |

**禁止：**

- 把任一 L3 注册为 `FounderAgentName` / 第五 Expert  
- L3 直出老板拍板句 / `FounderDecisionContract` / `DecisionPack`  
- L3 私有 JSON 直进七常委 `expertReports`  
- 为扩 Agent 再开第七 Runtime  

**MVP 闸门：** 飞轮未验证前，**框架可冻结、骨架可落**；批量上架新 L3 仍服从 `MEALKEY_CORE_PRODUCT_LOOP_V1` 停扩产品闸门。

---

## 2. 一个 Tool Agent = 四件套（可拆分单元）

每个独立 Agent **必须**具备且仅具备：

```text
┌─────────────────────────────────────────┐
│  Tool Agent Unit                        │
│  1. Manifest   身份证（id/kind/ports）   │
│  2. Engine     纯逻辑（零 Prisma / 零 UI）│
│  3. Ports      合法出口（见 §3）          │
│  4. Host Bridge（可选）接 MealKey 宿主   │
└─────────────────────────────────────────┘
```

| 件 | 职责 | 禁止 |
|----|------|------|
| **Manifest** | 发现、权限、计费、组合声明 | 藏副作用 |
| **Engine** | `run(input) → output` | 读 Prisma、写 profile、调决策室 |
| **Ports** | 只走合法出口 | 平行私有协议进宿主 |
| **Bridge** | Host 侧薄适配 | 把业务逻辑塞进 Bridge |

**可拆分定义：** 拿走 Engine + Manifest，在无 MealKey 进程内仍可单测、可独立 HTTP 服务化。  
**可组合定义：** 同一 Engine 可被 Radar / Decision Room / Execution / 外部 Host 通过 Ports 调用，无需改 Engine。

---

## 3. 四个合法出口（Ports）— 唯一组合面

L3 **只能**经下列端口进入 MealKey（可多选，须在 Manifest 声明）：

| Port | 类型出口 | 宿主消费方 | 用途 |
|------|----------|------------|------|
| **P1 Signal** | `BusinessSignalV1[]` / fact hints | 今日雷达 · Signal Engine | 日活感知，不做决策 |
| **P2 Insight** | `VerticalInsightSource` → `MKInsight[]` | 决策室 · Council | 供常委压力测试 |
| **P3 Work** | `ToolWorkResult`（结构化执行物） | Execution Runtime | 菜单草案、SOP、审计清单等 |
| **P4 Gap** | `evidenceGaps[]` | 任意 Host | 诚实缺证据，禁止装懂 |

```text
                    ┌─ P1 Signal ──────────► Radar / Opportunity
Tool Agent Engine ──┼─ P2 Insight ─────────► MKInsight Adapter → Council
                    ├─ P3 Work ────────────► Execution（须有授权）
                    └─ P4 Gap ─────────────► UI / 采集补证
```

**非法出口（一律拒收）：**

- 直接 `MKDecision` / 拍板合同  
- 改 Brain 事实（须经正式 Memory/Brain API，且仅 Host Bridge 可调）  
- 聊天长文冒充 Insight  

P2 真源：`toVerticalMkInsights` / `assertVerticalCouncilIngress`。

---

## 4. 目录与包结构（支撑 ~100）

```text
packages/tool-agent-kit/              # 框架：Manifest / Ports / Registry / Compose
  src/types.ts
  src/registry.ts
  src/compose.ts

tool-agents/                          # 所有 L3 引擎单体（可拆仓库）
  <agentId>/                          # 例：ops-diag / site-audit / menu-margin
    package.json                      # @mealkey/tool-<agentId>（可选独立包）
    src/
      manifest.ts                     # ToolAgentManifest
      engine.ts                       # run(input) → ToolAgentResult
      contracts.ts                    # 本 Agent I/O schema
      index.ts
    tests/

packages/agents/src/l3/               # 仅 Adapter（可选薄层）
  <agentId>/
    mk-insight-adapter.ts             # → VerticalInsightSource
    signal-adapter.ts                 # → BusinessSignal hints

apps/web/src/server/tool-agents/      # Host Bridge（MealKey 宿主）
  registry.ts                         # 注册已启用的 L3
  bridges/<agentId>.ts                # 读 Brain/RIP → 调 Engine → 写回合法路径
  invoke.ts                           # 统一调用：鉴权 · 计费 · 审计
```

**规模原则：**

| 数量级 | 做法 |
|--------|------|
| 1–10 | `tool-agents/<id>` 单仓 monorepo |
| 10–40 | 每 Agent 独立 `package.json`，workspace 收录 |
| 40–100+ | `tool-agents` 可拆独立 git；MealKey 只留 Bridge + Registry |

**禁止：** 把 100 个 Engine 塞进 `apps/web` 或 `packages/agents` 咨询六步树。

---

## 5. Manifest 身份证（每个 Agent 必填）

```ts
ToolAgentManifest {
  id: string                 // 例 "l3.ops.diag"  — 全局唯一，小写点分
  name: string               // 中文短名 ≤8 字  例「经营诊断」
  version: string            // semver
  kind: ToolAgentKind        // 见 §6 分类
  stage: "idea" | "pilot" | "live" | "deprecated"
  ports: Array<"signal" | "insight" | "work" | "gap">
  permissions: ToolPermission[]   // 最小权限
  inputSchemaRef: string     // 契约标识
  outputSchemaRef: string
  invokePolicy: {
    requiresDecisionAuth: boolean   // true = 须 MKDecision / Execution 授权
    requiresBossConfirm: boolean    // 高副作用
    billable: boolean
  }
  compose: {
    upstream?: string[]      // 可串联的上游 agentId
    downstream?: string[]
    conflictsWith?: string[] // 互斥
  }
}
```

**权限枚举（最小集）：**

`READ_BRAIN_SLICE` · `READ_RIP` · `READ_EVIDENCE` · `EMIT_SIGNAL` · `EMIT_INSIGHT` · `EMIT_WORK` · `WRITE_MEMORY`（仅 Host 代写）

Engine **自身**不得持有 `WRITE_MEMORY`；由 Bridge 代执行。

---

## 6. 分类（Kind）— 便于 100 个检索与组合

| Kind | 场景簇 | 示例 Agent |
|------|--------|------------|
| `ops` | 门店经营 / 诊断 / 人效 / 成本 | 经营诊断、毛利诊断 |
| `site` | 选址 / 商圈 | 铺位评估 |
| `menu` | 菜单 / SKU | 毛利结构、爆品候选 |
| `campaign` | 营销活动 | 开业节奏、私域活动 |
| `hiring` | 组织人力 | 排班、招聘画像 |
| `content` | 内容投放 | 点评回复草案 |
| `audit` | 巡店 / 合规 | 门店审计 |
| `sop` | 标准化 | SOP 草案 |
| `finance` | 财务经营（非股权战略） | 周经营解读 |
| `other` | 未归类（须说明） | — |

`kind` 对齐 `VerticalAgentKind`；新增 kind 须改 Adapter + 本文，禁止 silently 膨胀。

**命名（两套等价，均为 L3）：**

- 框架态：`l3.<kind>.<capability>`（例 `l3.ops.diag`）  
- 产品族态：`m-<domain>`（例 `m-ops-diag`，与 m-pnt 族对齐，**仍不是** L1 顾问席）  

首个样板冻结为产品族态：`m-ops-diag`（见 `M_OPS_DIAG_AGENT_V1.md`）。

---

## 7. 组合模型（Compose）

框架只承认三种组合，禁止隐式耦合。

### 7.1 Host 单呼（默认）

```text
Host.invoke(agentId, input) → Ports → 宿主落点
```

### 7.2 Pipeline（串行）

```text
A(work|gap) → B(work) → C(signal)
```

- 仅当 Manifest `compose.upstream/downstream` 声明  
- 中间物必须是 Port 类型，禁止传私有大对象  

### 7.3 Fan-in（并行汇聚）

```text
     ┌─ Agent A ─┐
Case ┼─ Agent B ─┼─→ MKInsight[] → Council
     └─ Agent C ─┘
```

- 一律经 P2 Insight 汇聚；由 `sanitizeInsights` 消歧  
- Fan-in **不**等于「开第五席」

### 7.4 谁有权调用

| 调用方 | 条件 |
|--------|------|
| 今日 / Radar | 仅 P1 / P4；不得借机拍板 |
| Decision Room | P2；经 Adapter |
| Execution | P3；`requiresDecisionAuth` 时须已有批准决策 |
| 外部 Host | 只调 Engine；无 MealKey Bridge 则无写回 |

---

## 8. 统一调用契约（Host）

```ts
invokeToolAgent({
  agentId,
  projectId,
  input,                 // 符合该 Agent contracts
  purpose: "radar" | "council" | "execution" | "standalone",
  auth: { decisionId?, executionGrantId? },
}): Promise<{
  result: ToolAgentResult
  emitted: { signals?; insights?; work?; gaps? }
  auditId: string
}>
```

Host 职责：鉴权 · 计费 · 审计 · Brain 只读切片注入 · 合法写回。  
Engine 职责：纯函数式诊断/生成。

---

## 9. 新 Agent 上架清单（闸门）

每个新 L3 合并前必须打勾：

1. [ ] 落在 L3（闸门题见生态地图 §7）  
2. [ ] 有 `manifest.ts` + `engine.ts` + 单测（无 Web）  
3. [ ] 只声明合法 Ports；无战略终局句样例  
4. [ ] 若接 Council：有 `VerticalInsightSource` 样例并通过 `assertVerticalCouncilIngress`  
5. [ ] 若接 Radar：Signal 含证据链字段，禁无证据 CRITICAL  
6. [ ] Host Bridge 可选；默认 feature-flag **关**  
7. [ ] 不改 L1/L2 路由、不进底栏「第五席」  
8. [ ] `stage: idea|pilot` 时 UI 不得标 LIVE Expert  

---

## 10. 与第一批落地的关系

| 顺序 | 交付 | 说明 |
|------|------|------|
| **F0** | 本文 + `@mealkey/tool-agent-kit` | 框架冻结（本刀） |
| **F1** | 首个样板 `l3.ops.diag`（餐厅经营诊断） | 证明可拆分可组合 |
| **F2** | Host `invokeToolAgent` + Registry | MealKey 组合面 |
| **F3** | 按场景批量加 Agent | 仍受 MVP 产品闸门约束 |

样板 Agent **不得**抢先定义特殊协议；必须吃本框架。

---

## 11. 非目标

- 不做 Agent 应用商店 UI（可后置）  
- 不做 Agent 互相改战略的「自治多 Agent 公司」  
- 不做把 L3 训练成第四个以上 Expert  
- 不在本文扩 L1/L2  

---

## 12. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-21 | 首冻：四件套 · 四 Ports · 目录 · Manifest · 组合 · 上架闸门 |

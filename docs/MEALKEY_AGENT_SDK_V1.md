# MealKey Agent SDK V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **产品一句：** 第三方（及官方外置）Agent 开发者拿到的唯一官方工具包——**只连 Gateway，不连数据库。**  
> **配套：** `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`（线级 HTTP）· `MEALKEY_AGENT_PROTOCOL_V1.md` · `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md` · `MEALKEY_AGENT_UI_FRAMEWORK_V1.md`  
> **代码落点：** `@mealkey/agent-sdk` → 演进子路径 `platform/`（Gateway Client）；**禁止** SDK 内嵌垂直 Agent 业务  
> **冲突裁决：** SDK 方法语义以本文为准；HTTP 路径/签名/拒收码以 External Interface 为准  

---

## 0. 开发者拿到什么（冻结）

```text
npm i @mealkey/agent-sdk
（或后续公开发布名 @mealkey/agent-platform-sdk）
```

| 模块 | 用途 |
|------|------|
| `createAgentClient` | Gateway 客户端（签名·Token·重试） |
| `context` | 拉取餐厅 Context Package |
| `ingress` | 提交 Signal / Insight / Work / Gap / Learning |
| `auth` | 用户 OAuth/委托 · 安装状态检查 |
| `manifest` | Manifest / Skill Package 类型与校验 |
| `billing` | 计量事件上报钩子（只读账单查询可选） |
| `sandbox` | 模拟餐厅夹具 · sandbox baseUrl |
| `handoff` | 生成回 OS 今日/决策室的深链 |

**故意不包含：** Prisma · Brain 内部 API · 决策室私有 tRPC · 垂直诊断算法 · UI 组件库（UI 见框架文档，实现在 Agent 仓）。

---

## 1. 最小 Hello（7 行心智）

```typescript
import { createAgentClient } from "@mealkey/agent-sdk/platform";

const mk = createAgentClient({
  agentId: "partner.acme.diagnosis",
  clientSecret: process.env.MK_AGENT_SECRET!,
  baseUrl: process.env.MK_GATEWAY_URL!, // https://api.mealkey.com
});

// 1) 用户已在 Agent UI 完成授权 → 持有 userAccessToken
const ctx = await mk.getRestaurantContext(restaurantId, {
  scopes: ["basic", "facts", "review"],
  userAccessToken,
});

// 2) 本地跑 Decision Skill（开发者自己的引擎）
const result = await mySkill.run(ctx);

// 3) 只经 Ingress 回写
const ack = await mk.submitIngress({
  restaurantId,
  invokeId: crypto.randomUUID(),
  userAccessToken,
  items: [
    { port: "signal", level: 2, payload: result.signal },
    { port: "gap", level: 1, payload: result.gaps[0] },
  ],
});
```

无 `ack.ok` → 不得引导用户「已同步到今日」。

---

## 2. Client 配置（冻结）

```typescript
AgentClientConfig {
  agentId: string
  clientSecret: string           // 或 mTLS 材料（企业）
  baseUrl: string                // Gateway 根
  manifestVersion?: string       // 钉版本
  timeoutMs?: number             // 默认 15000
  maxRetries?: number            // 默认 2；仅 429/503
  env?: "production" | "sandbox"
}
```

Sandbox：`baseUrl` 指向 sandbox Gateway，或 `env: "sandbox"` 由 SDK 换 host。

---

## 3. 如何获取餐厅上下文（冻结）

### 3.1 API

```typescript
mk.getRestaurantContext(
  restaurantId: string,
  options: {
    scopes: ContextScope[]   // basic|facts|review|operation|market|dna
    userAccessToken: string
    purpose?: "standalone" | "radar" | "council" | "execution"
  }
): Promise<ContextPackageV1>
```

底层：`GET /v1/gateway/context/restaurant/{id}?scope=`（Interface §3）。

### 3.2 「调用 Brain」的正确含义

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| `import brain from @mealkey/restaurant-brain` | `getRestaurantContext` |
| 直连 Brain DB | Gateway 组装的切片 |
| 自己爬全量评论库冒充 OS | `scope=review` 租用 |

SDK **不提供** `getBrain()` 内部方法名，避免误导；文档用语统一为 **Context / Brain 切片租用**。

### 3.3 ContextPackageV1

与 Interface 同构：`identity` · `facts` · `evidence` · `scopesGranted/Denied` · `asOf` · 可选 `decisionContext`。

SDK 辅助：

```typescript
ctx.assertGranted("review")      // 未授予则抛 MkScopeError
ctx.evidenceByTheme("wait")      // 纯客户端过滤，不发新请求
```

---

## 4. 如何返回 Signal / Insight（冻结）

### 4.1 submitIngress

```typescript
mk.submitIngress(batch: {
  restaurantId: string
  invokeId: string              // 幂等
  userAccessToken: string
  horizon?: "today" | "7d" | "30d"
  items: IngressItemV1[]
}): Promise<IngressAckV1>
```

底层：`POST /v1/gateway/ingress`（Interface §4）。

### 4.2 构造器（防脏数据）

```typescript
import { signal, insight, gap, work } from "@mealkey/agent-sdk/platform";

signal({
  type: "CUSTOMER",
  title: "服务体验风险",
  severity: "HIGH",
  observation: "…",
  pattern: "…",
  meaning: "…",
  impact: "…",
  confidence: 0.82,
  evidence: [{ source: "dianping", fact: "…" }],
  evidenceChain: [
    { kind: "external_intel", claim: "…" },
    { kind: "inference", claim: "…" },
  ],
  watchHint: "建议关注高峰服务流程",
})
```

校验失败在 **客户端抛错**（缺 evidence、confidence 越界、禁拍板词），减少 422。

### 4.3 默认等级

未认证 Agent：`level` 最大 **3**。提交 `level≥4` → SDK 可预检拒绝或 Gateway `LEVEL_EXCEEDED`。

---

## 5. 如何进入 Decision Room（冻结）

决策室在 **MealKey OS**，不在 Agent 进程内「打开会议室」。

### 5.1 路径 A — 用户主动（默认）

```typescript
const url = mk.handoff.decisionRoom({
  restaurantId,
  topic: "是否增加一个晚班人力？",
  invokeId,                     // 关联已 ingress 的 insight
});
// 跳转 OS；用户在决策室拍板
```

### 5.2 路径 B — L4 Insight Ingress（须认证）

```typescript
await mk.submitIngress({
  …,
  items: [{
    port: "insight",
    level: 4,                   // Manifest.maxInsightLevel≥4
    payload: {
      topic: "运营",
      finding: "…",
      decisionTopic: "是否增加一个晚班人力？",
      confidence: 0.8,
      evidence: […],
    },
  }],
});
```

Gateway → VerticalInsight → 决策室候选；**仍不自动拍板**。

### 5.3 路径 C — L5 Work

须 `requiresDecisionId`（已批准决策）；否则拒收。SDK：

```typescript
work({ title, summary, requiresDecisionId, artifacts })
```

---

## 6. 如何获得用户授权（冻结）

### 6.1 安装（能力市场）

用户在 OS 安装 Agent 到某 `restaurantId` 并勾选 scopes → Registry 记录。  
未安装：`getRestaurantContext` → `MkAuthError` / HTTP 403。

```typescript
const status = await mk.auth.getInstallStatus(restaurantId, userAccessToken);
// { installed: boolean, scopesGranted: string[], maxInsightLevel: number }
```

### 6.2 登录委托（Agent UI）

```typescript
// 浏览器跳转
mk.auth.getAuthorizeUrl({
  redirectUri: "https://diagnosis.example.com/oauth/callback",
  restaurantId,
  scopes: ["basic", "review"],
  state,
});

// callback 换 token
const session = await mk.auth.exchangeCode(code);
// { userAccessToken, expiresAt, restaurantIds[] }
```

### 6.3 Token 规则

- Access Token 短时（建议 ≤1h）；Refresh 仅 Agent 服务端持有  
- 禁止写入 LocalStorage 明文长期密钥  
- 用户撤销安装 → 既有 Token 在 Gateway 侧失效  

---

## 7. 如何收费结算（冻结）

SDK **不内置支付收银台**（支付可在 Agent 自有商业化）；与平台结算通过钩子：

### 7.1 平台侧自动计量（主路径）

每次成功 `getRestaurantContext` / `submitIngress` 且 Manifest `billable: true` → Gateway 记 `MeterEvent`。开发者无需手写。

### 7.2 开发者上报（可选增值）

```typescript
await mk.billing.reportUsage({
  restaurantId,
  userAccessToken,
  event: "skill_run",
  units: 1,
  meta?: { skillId: "skill.ops.restaurant_health" },
});
```

用于 Agent 自有「按次技能」与平台对账（须审核开通）。

### 7.3 查询

```typescript
await mk.billing.getStatement({ period: "2026-07" })
// 调用量 · 预估平台费用 · 合作分成状态（若开通）
```

分成比例商务合同定；SDK 只暴露只读账单与上报，**不**硬编码 70/30。

---

## 8. Learning（记忆隔离）

```typescript
await mk.submitLearning({
  restaurantId,
  userAccessToken,
  event: {
    kind: "diagnosis_outcome",
    summary: "老板确认等待主题属实",
    evidenceRefs: ["ev-1"],
  },
});
```

→ Learning 审核队列；**不**直写 Decision DNA。禁止 SDK 提供 `writeBrain` / `saveUserMemory`。

---

## 9. 错误模型（冻结）

```typescript
MkError
  code: string          // 对齐 Interface 拒收码 + AUTH_* / NETWORK_*
  message: string
  httpStatus?: number
  details?: unknown
```

| code | 处理建议 |
|------|----------|
| `SCOPE_DENIED` | UI 引导补授权/安装 |
| `LEVEL_EXCEEDED` | 降级到 L3 再提交 |
| `NO_EVIDENCE` | 补证据或改 gap |
| `AUTH_EXPIRED` | 走 refresh / 重新授权 |
| `RATE_LIMITED` | 按 `Retry-After` 退避 |

---

## 10. Sandbox

```typescript
const mk = createAgentClient({ …, env: "sandbox" });
const fixture = await mk.sandbox.getRestaurantFixture("changsha-xiangcai-a");
// 含合成评价与事实；可反复 invoke 不计生产计量
```

上架前须用 fixture 跑通：Context → Skill → Ingress → `accepted.length > 0`。

---

## 11. 包结构目标（Core 仓演进 · 非新 Agent）

```text
packages/agent-sdk/
  src/
    platform/                 # 本文真源实现
      client.ts               # createAgentClient
      context.ts
      ingress.ts
      auth.ts
      billing.ts
      handoff.ts
      sandbox.ts
      builders.ts             # signal/insight/gap/work
      errors.ts
      types.ts                # ContextPackageV1 / Ingress* 与 Interface 对齐
    types/protocols.ts        # 既有 7 Protocols（兼容保留）
    index.ts                  # 再导出；platform 建议 deep import
```

**禁止**在 `agent-sdk` 下新增 `agents/diagnosis` 业务实现。

外置 Agent 仓：

```text
restaurant-diagnosis-agent/
  package.json
  depends: @mealkey/agent-sdk
  src/engine/                 # Decision Skill
  src/web/                    # 独立前端
```

---

## 12. 与旧 SDK 的关系

| 旧表面 | V1 Platform Client |
|--------|---------------------|
| 进程内 `AgentContext` / 七协议类型 | 仍可用于 Core 内部；**外接 Agent 以 platform client 为准** |
| `agent-runtime` 工作流 | 不作为第三方主路径 |
| `packages/m-ops-diag` 直调 | 过渡期映射为同等 `getRestaurantContext` + `submitIngress` 语义后迁出 |

---

## 13. 验收（SDK 本身）

1. 无 DB 依赖、无 Prisma peer  
2. 外网只打 `baseUrl` Gateway  
3. Hello 路径可在 Sandbox 跑通  
4. 客户端拦截无证据 Signal、L4 未认证  
5. 文档与 Interface 路径一致  

---

## 14. 下一步（冻结）

| 优先级 | 动作 |
|--------|------|
| P0 | 在 `@mealkey/agent-sdk/platform` 落下类型 + client 骨架 + 单测（mock Gateway） |
| P1 | Gateway 真实路由对接 Interface |
| P2 | 外置诊断仓改用本 SDK |
| P3 | 7 日开发者上手手册（基于本文 Hello） |

**禁止：** MealKey 仓内新增垂直 Agent。

---

## 15. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 SDK Freeze | 2026-07-21 | Client · Context 租用 · Ingress · 决策室 Handoff · OAuth/安装 · Billing 钩子 · Sandbox · 包结构 · 与旧 SDK 边界 |

# MealKey Agent 开发者接入 · 7 日上手（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `MEALKEY_AGENT_SDK_V1.md` · `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` · `MEALKEY_AGENT_UI_FRAMEWORK_V1.md` · 样板 `mealkey-agents/restaurant-diagnosis-agent`  
> **一句话：** 第三方拿到 SDK 后，**7 天内**做出可在 MealKey 上跑的外接 Agent（含最小 UI）。  

---

## Day 0 · 读懂边界（0.5 天）

必读：

1. 原则：Agent 外置；Core 禁增 Agent  
2. 协议：Ports · L1–L5（默认 ≤L3）· Decision Skill  
3. 接口：Context / Ingress / HMAC  
4. 样板仓：`mealkey-agents/restaurant-diagnosis-agent`  

验收：能用自己的话说明「为什么不能直连 Prisma」。

---

## Day 1 · 环境与 Hello Context（1 天）

```bash
# 终端 A：MealKey OS
npm run dev -w @mealkey/web

# 终端 B：样板离线 Skill
npm run test -w @mealkey-agents/restaurant-diagnosis

# 终端 C：Sandbox → Gateway（需 A 已起）
set MK_GATEWAY_URL=http://localhost:3000/api
set MK_AGENT_SECRET=mk-sandbox-agent-secret
npm run run:sandbox -w @mealkey-agents/restaurant-diagnosis
```

自写最小脚本：

```ts
const mk = createAgentClient({
  agentId: "partner.acme.diagnosis",
  clientSecret: process.env.MK_AGENT_SECRET!,
  baseUrl: "http://localhost:3000/api",
});
const ctx = await mk.sandbox.getRestaurantFixture("changsha-xiangcai-a");
```

验收：拿到 `ContextPackageV1`，含 `scopesGranted`。

---

## Day 2 · Decision Skill（1 天）

交付物：`runXxxSkill(ctx) → { ingressItems }`

规则：

- 输入只来自 Context  
- 输出用 `signal` / `insight` / `gap` builders  
- `maxInsightLevel ≤ 3`  
- 无证据只出 gap  

对照样板：`src/skill.ts`。

验收：离线自测有 signal 或 gap；无拍板句。

---

## Day 3 · Ingress 回写（1 天）

```ts
await mk.submitIngress({
  restaurantId,
  invokeId: crypto.randomUUID(),
  userAccessToken: "sandbox",
  items: ingressItems,
});
```

验收：`accepted.length > 0`；非法无证据被 `NO_EVIDENCE` 拒收。

---

## Day 4 · Manifest + 注册（0.5 天）

准备 `AgentManifestV1`：

- `capabilityIds` 挂 Registry（如 `ops.diagnosis.*`）  
- `permissions` / `context_required`  
- `maxInsightLevel: 3`  

本地 V1：写入 Host `MK_AGENT_REGISTRY_JSON` 或使用内置 `restaurant-diagnosis` / `partner.acme.diagnosis`。

验收：错误 `agentId` 签名失败；正确 agent 可调 Context。

---

## Day 5 · Agent UI 五段旅程（1.5 天）

按 `MEALKEY_AGENT_UI_FRAMEWORK_V1`：

Onboarding → Working → Portrait → Diagnosis Card → Handoff  

样板前端：

```bash
npm run web:dev -w @mealkey-agents/restaurant-diagnosis
# http://localhost:5173
```

硬禁：假总分、诊断页拍板、无证据金句。

验收：老板能在 60s 内走完「认识我的店」并看到声音墙 + 诊断卡。

---

## Day 6 · Handoff 与今日可见（1 天）

1. UI 提供「回 MealKey 今日」  
2. Ingress 成功后，OS `daily-scan` 消费 `profile.agentGatewayIngress`  
3. 验证信号出现在今日（sandbox 项目 id 需可映射时）  

验收：同步文案诚实（Gateway 未开时不装成功）。

---

## Day 7 · Sandbox 质量清单 + 提交包（0.5 天）

提交审核包：

- [ ] Manifest + Skill Package 说明  
- [ ] `npm test` / 自测通过  
- [ ] fixture `changsha-xiangcai-a` 跑通 Ingress  
- [ ] UI 录屏或手测清单（五段）  
- [ ] 无 DB 密钥、无 L4/L5  
- [ ] Learning 仅事件（若有）  

通过后：`Verified` →（商务后）`Published`。

---

## 速查

| 项 | 值 |
|----|-----|
| SDK | `@mealkey/agent-sdk/platform` |
| Gateway | `{origin}/api` + path `/v1/gateway/*` |
| 用户 Token（dev） | `Bearer sandbox` |
| Agent 密钥 | `MK_AGENT_SANDBOX_SECRET` 默认 `mk-sandbox-agent-secret` |
| 样板 UI | `npm run web:dev -w @mealkey-agents/restaurant-diagnosis` |

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 7 日路径；对齐 SDK/Gateway/外置诊断样板与 Web |

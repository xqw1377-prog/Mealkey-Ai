# M-OPS-Agent 作为生态 Reference Implementation（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **独立仓（真源）：** `C:\Users\xqw13\M-OPS-Agent`  
> **MealKey 侧指针：** `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`  
> **配套：** `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md` · `MEALKEY_AGENT_PROTOCOL_V1.md` · `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` · `MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md` · `MEALKEY_AGENT_UI_FRAMEWORK_V1.md`  
> **一句话：** M-OPS 不是「又一个功能」，而是 **MealKey Agent 生态的 Hello World** —— 第一个可复制的官方样板。

---

## 0. 为什么必须冻结本文

前面已解决：

> 第一个外置 Agent 怎么开发、独立运行、接入 MealKey。

下一步要解决：

> **任何第三方**如何基于 Protocol 开发、申请、发布、分发、商业化。

因此 M-OPS 必须同时具备三重身份，缺一不可：

| 身份 | 对谁 | 交付 |
|------|------|------|
| **用户产品** | 餐厅老板 | Store 上的「餐厅经营诊断系统」 |
| **开发模板** | 第三方工程师 | Tool Agent Reference Implementation |
| **开发教材** | 新手 | 「如何开发一个 MealKey Agent」对照物 |

---

## 1. 生态坐标（冻结）

```text
mealkey.cn  Agent Marketplace / Store
        │
 Agent Gateway + Protocol
        │
 ------------------------------------------------
 官方样板              第三方               企业私有
 M-OPS-Agent      供应链/培训/营销…     连锁内部 Agent
 = Hello World
```

规则：

1. **实现永远外置** — 禁止把诊断引擎/UI 恢复进 MealKey monorepo  
2. **契约永远以 OS 为准** — Gateway / Ports / maxInsightLevel≤3  
3. **样板可演进，契约不回滚** — 样板升级不得逼 Protocol 破坏性变更（除非 Protocol major）

---

## 2. 仓库职责切分（冻结）

### 2.1 `M-OPS-Agent`（外置仓）必须包含

| 模块 | 要求 |
|------|------|
| Manifest | 合规 `AgentManifestV1` + capabilities / scopes / maxInsightLevel |
| Decision Skill | Context → Ingress items；无拍板句 |
| Gateway 客户端 | SDK 或等价 HMAC 签名调用 |
| Sandbox runner | fixture 餐厅跑通 Context + Ingress |
| Agent Web UI | 五段旅程（UI Framework）；独立部署 |
| 文档 | 产品/UX/采集/诊断模型 + **给第三方看的「照着做」README** |
| 测试 | `npm test`；质量拒收场景（无证据、越权） |

### 2.2 MealKey Core 只保留

| 保留 | 说明 |
|------|------|
| Gateway | `/api/v1/gateway/*` |
| Ingress → 今日 | 投影 Signal 等 |
| Store 详情位 | 官方 Agent 卡片指向本样板 |
| Developers「Reference」页 | 链到本文 + 外置仓说明 |
| 本文 + External Pointer | 不迁回引擎代码 |

---

## 3. 作为开发模板的验收（冻结）

第三方「照着 M-OPS 做」时，7 日内应能对照完成（与 Onboarding 一致）：

| Day | 样板对照物 | 第三方产出 |
|-----|------------|------------|
| 0 | 边界说明 | 能口述「为何不直连 Prisma」 |
| 1 | sandbox Context | Hello Context |
| 2 | `skill` | 自有 Decision Skill |
| 3 | Ingress 提交 | 合法 Ports 批 |
| 4 | Manifest | 自有 `partner.<org>.<slug>` |
| 5 | Web UI 五段 | 最小 Agent UI |
| 6 | Handoff → 今日 | 信号可见 |
| 7 | 审核包 | 可提审 Marketplace |

样板 README 必须用 **mealkey.cn/developers** 文档链接，不维护第二套 API 真相。

---

## 4. 作为 Store 用户产品的呈现（冻结）

Store 详情页（PRD §3）官方位字段示意：

| 字段 | 内容 |
|------|------|
| 名称 | 餐启·餐厅经营诊断系统 |
| 开发者 | MealKey Official |
| 类型 | 经营分析 |
| 能力 | 顾客评价分析 · 服务问题识别 · 经营风险发现 · 每日经营扫描 |
| 输入 | 店铺信息 · 顾客评价 · 经营数据（经 Gateway scope） |
| 输出 | 经营信号 · 诊断洞察 · 缺口（Gap）— **非拍板** |
| CTA | 安装到我的 MealKey · 开发者文档 |

---

## 5. 作为教材的章节映射（冻结）

| 教材章 | 权威文档 | 样板仓落点 |
|--------|----------|------------|
| Protocol | `MEALKEY_AGENT_PROTOCOL_V1` | Manifest + Skill |
| API | `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1` | gateway client |
| UI | `MEALKEY_AGENT_UI_FRAMEWORK_V1` | web 五段 |
| 质量 | Protocol Quality + Ingress 拒收码 | tests |
| 发布 | `MEALKEY_AGENT_MARKETPLACE_PRD_V1` | 提审包清单 |

---

## 6. 禁止事项（冻结）

1. 以「方便 demo」在 Core 恢复进程内诊断包  
2. 样板输出 L4/L5 或决策室拍板句  
3. 样板私藏老板永久画像库  
4. 把样板特有业务规则写进 Protocol 逼所有第三方遵守（领域规则留在样板仓）  
5. Store 文案承诺「一键替你决定关店/涨价」  

---

## 7. 与 Lifecycle 的关系

```text
M-OPS 自身：Verified / Published（官方）
第三方复制路径：Draft → … → Published（经 Marketplace 审核）
```

M-OPS 变更若影响 Gateway 契约 → **先改 External Interface / Protocol**，再改样板，最后改 Developers 投影。

---

## 8. 验收清单

- [ ] 外置仓可独立 `dev` / `test` / `sandbox→Gateway`  
- [ ] Store 官方卡与开发者 Reference 页互相深链  
- [ ] Onboarding 7 日命令以本仓为对照且可跑通  
- [ ] MealKey Core 无诊断引擎源码回流  
- [ ] 文档声明：M-OPS = Hello World，不是生态终点  

---

## 9. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 首次冻结：用户产品 · 模板 · 教材三重身份 |

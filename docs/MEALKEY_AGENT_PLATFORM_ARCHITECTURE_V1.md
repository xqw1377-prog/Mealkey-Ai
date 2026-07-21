# MealKey Agent Platform Architecture V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **原则真源：** `MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md`  
> **协议真源：** `MEALKEY_AGENT_PROTOCOL_V1.md`  
> **配套：** `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` · `M_OPS_DIAG_AGENT_V1.md`  
> **冲突裁决：** 部署/网关/SDK/共存模型以本文为准；能力质量与 L1–L5 以 Protocol 为准；一句话原则以 Principle 为准  

---

## 0. 目标（冻结）

把 MealKey 从「AI 餐饮产品」升级为 **餐饮 AI 平台**：

```text
MealKey OS（薄）
  = Identity + Brain + Decision + Execution + Protocol + Gateway + Marketplace
Agent（厚·外置）
  = 独立产品创造垂直能力
```

本文冻结八块：

1. Agent 独立部署架构  
2. Agent Gateway  
3. Agent SDK  
4. Context API  
5. Permission 系统  
6. Agent 审核体系  
7. Agent Marketplace  
8. 官方 Agent 与第三方共存模型  

---

## 1. 总览拓扑（冻结）

```text
                    ┌─────────────────────────┐
                    │      MealKey Core OS      │
                    │  User · Identity · Brain  │
                    │  DIE · Council · M-EXEC   │
                    │  Marketplace · Billing    │
                    └────────────┬────────────┘
                                 │
                         Agent Gateway
                     (auth · scope · meter · audit)
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       官方 Agent           第三方 Agent        企业私有 Agent
    diagnosis.mealkey…    partner HTTPS      enterprise_local
     独立前端/后端/业务库    同等 Protocol         同等 Protocol
```

**铁律：** Agent 不直连 Prisma / Brain DB / Memory 表；只经 Gateway。

---

## 2. Agent 独立部署架构（冻结）

### 2.1 一个 Agent = 完整产品

| 部件 | 职责 | 例（经营诊断） |
|------|------|----------------|
| **Agent UI** | 独立体验与转化 | `diagnosis.mealkey.com` |
| **Agent Server** | 业务 API · 工作流 · 支付对接 | `restaurant-diagnosis-server` |
| **Diagnosis Engine** | Decision Skill 实现 | 纯逻辑，可同仓 |
| **Agent DB** | 诊断历史 · 报告 · 模型参数 · 测试集 | **禁止**存平台 User/Brain 主事实 |
| **Protocol Client** | SDK 调 Gateway | Context 入 · Insight/Signal 出 |

### 2.2 数据边界

| 数据 | 归属 |
|------|------|
| User / 登录身份 / 门店 Identity | MealKey Core |
| Restaurant Brain 事实与 DNA | MealKey Core |
| Decision / Execution 主记录 | MealKey Core |
| 诊断报告原文、Agent 内部评分缓存、A/B 实验 | Agent DB |
| Learning 回写 | 仅 Learning Event → Core 审核（Protocol §11） |

### 2.3 部署形态

| 形态 | 用途 |
|------|------|
| 独立域名 + 独立服务 | 官方/第三方默认 |
| inprocess 包 | **仅过渡/单测**；不得作为长期堆 Core 的借口 |
| enterprise_local | 集团内网 Engine，仍经 Gateway 换 Context / 回传 Ports |

### 2.4 仓库目标结构

```text
mealkey-core/                    # 本 monorepo 演进方向：变薄
  packages/
    agent-sdk/                   # 开发者 SDK（协议客户端）
    agent-runtime/               # OS 侧调度（可含 Gateway 逻辑）
    protocol/                    # 或 agent-sdk/protocol 类型 SSOT
    identity-sdk / brain-sdk / decision-sdk / ui-sdk
    tool-agent-kit/              # 过渡：Ports/Registry；语义并入 Protocol
    restaurant-brain/ …
    # ❌ 不再新增业务垂直 Agent 大包

mealkey-agents/                  # 独立仓或多仓
  restaurant-diagnosis-agent/    # 样板（现 packages/m-ops-diag → 迁出）
  restaurant-location-agent/
  menu-optimization-agent/
```

**过渡：** `packages/m-ops-diag` 保持可运行样板，直到拆仓完成；新功能优先按独立 Agent 形状开发。

---

## 3. Agent Gateway（冻结）

### 3.1 定位

类似 API Gateway：**唯一** Agent↔Core 数据与能力通道。

```text
Agent → Gateway → Core services
Agent ← Gateway ← Context Package / Ack
```

### 3.2 网关职责

| 职责 | 说明 |
|------|------|
| 认证 | Agent 身份（client_id + 签名/mTLS）· 用户委托 token |
| 鉴权 | Permission / scope 裁剪 |
| Context 组装 | 调 Brain/Evidence，生成 MKContext 切片 |
| 输出校验 | Port · Insight Level · Quality 闸门 |
| 投影 | Signal→今日 · Insight→决策室适配 · Work→EXEC（须授权） |
| 计量 | billable 调用计数 |
| 审计 | 请求/响应摘要 · 拒收原因 |

### 3.3 非职责

- 不跑垂直诊断算法  
- 不替 Agent 渲染 UI  
- 不把私有 JSON 直接写入 Brain  

### 3.4 工程落点（演进）

```text
apps/web 或独立 gateway 服务
  /v1/agents/invoke
  /v1/context/...
  /v1/insights/ingress
  /v1/signals/ingress
```

V1 可先 Host Bridge 内聚；对外形状必须像 Gateway。

---

## 4. Agent SDK（冻结）

面向官方与第三方开发者的最小包（`@mealkey/agent-sdk` 演进）：

| 模块 | 用途 |
|------|------|
| `manifest` | Manifest + Skill Package 类型 |
| `context` | 请求/解析 Context Package |
| `ports` | 构造 Signal / Insight / Work / Gap |
| `auth` | 签名与 token 助手 |
| `invoke` | 本地 stub / 连 Gateway |
| `sandbox` | 标准模拟餐厅夹具 |

**Hello 路径（语义）：** 声明 Manifest → `getContext(scope)` → Skill.run → `submitPorts(result)`。

详细「7 日上手」另文；本文冻结 SDK 边界。

---

## 5. Context API（冻结）

### 5.1 形态

```http
GET /v1/context/restaurant/{restaurantId}
Authorization: Bearer <user-or-delegation>
X-Agent-Id: m-ops-diag
X-Agent-Signature: ...

?scope=basic,operation,review,market
```

### 5.2 响应（概念）

```json
{
  "restaurant": "湘味馆",
  "location": "长沙岳麓",
  "category": "湘菜",
  "reviews": [],
  "operation": {},
  "meta": {
    "scopesGranted": ["basic", "operation", "review"],
    "scopesDenied": ["market"],
    "asOf": "2026-07-21T00:00:00Z"
  }
}
```

### 5.3 硬规则

1. scope ⊆ Manifest.permissions 映射  
2. 拒绝字段不出现（不靠客户端自觉）  
3. 只读；写回走 `/v1/signals` · `/v1/insights` · `/v1/learning`  
4. 与 Protocol `MKContextV1` 同构  

---

## 6. Permission 系统（冻结）

复用并产品化 Protocol §8：

| 层 | 机制 |
|----|------|
| 声明 | Manifest `permissions` / capability 所需 scope |
| 用户授权 | 安装能力时授权范围（类 iOS 权限弹窗，产品可渐进） |
| 网关裁剪 | Context API 强制执行 |
| 默认拒绝 | Personal / Bank / HR PII / Raw DB |

官方 Agent **不享受** 隐式全量权限；与第三方同一套表，仅审核可放宽 `maxInsightLevel`。

---

## 7. Agent 审核体系（冻结）

```text
提交 Manifest + Skill Package + Sandbox 报告
        ↓
能力挂载（Capability Registry）
        ↓
安全审核（权限·隐私·远程回调）
        ↓
质量审核（五维 Score · L 级）
        ↓
Sandbox 标准餐厅跑批
        ↓
stage: live → Marketplace 上架
```

| 认证档 | maxInsightLevel | 说明 |
|--------|-----------------|------|
| 默认上架 | ≤3 | 观察/诊断/建议 |
| 决策认证 | 4 | 可进决策室议题 |
| 执行认证 | 5 | 可发 Work（仍须决策授权） |

抽检失败 → 降级 `pilot` / 下架。

---

## 8. Agent Marketplace（冻结）

### 8.1 产品形态

**餐饮能力市场**（非 App Store 图标墙）：

- 浏览 Capability Registry  
- 购买/订阅能力  
- 按门店安装启用  
- 官方与第三方混排，标注 provider  

### 8.2 平台收入钩子

抽佣 · Context/M-INTEL 调用计费 · 企业接入。费率商务定。

### 8.3 MVP 闸门

协议与架构可冻；**批量第三方上架**仍服从核心飞轮停扩，直到诊断样板闭环验证。

---

## 9. 官方 Agent 与第三方共存（冻结）

| 维度 | 官方 | 第三方 |
|------|------|--------|
| Protocol | 同一套 | 同一套 |
| Gateway | 同一套 | 同一套 |
| 默认 L 级 | ≤3，可申请认证 | ≤3，可申请认证 |
| 预装 | 可系统预装（如诊断） | 须用户安装 |
| 品牌 | mealkey.com 子域 | 自有域或合作域 |
| 数据 | 自有业务库 + 租用 Context | 同左 |
| 信任标识 | 「官方」徽章 | 「认证伙伴」 |

**禁止双轨特权 API**（官方私有读库通道）。过渡期 inprocess 调用必须可替换为 Gateway 等价路径。

---

## 10. 输出统一与宿主投影（冻结）

Agent 不得输出私有「我的分析」大对象作为唯一出口。

标准 Ingress 例：

```json
{
  "type": "Insight",
  "source": "restaurant-diagnosis-agent",
  "severity": "HIGH",
  "title": "服务体验下降",
  "evidence": ["近30天差评相关指标上升（有源）"],
  "confidence": 0.86,
  "level": 2
}
```

Core 自动：

- 今日驾驶舱（Signal）  
- 决策室（L4 认证 + Promote）  
- M-EXEC（L5 + 授权）  

对齐 Protocol Ports 与 Insight L1–L5。

---

## 11. 战略适配：为何外接（冻结）

目标不是又一个餐饮 SaaS，而是 **餐饮经营能力生态**：

- 平台自研少量核心官方 Agent（样板质量）  
- 供应链 / 培训 / 空间设计等第三方接入  
- 迭代解耦 · 商业清晰 · 融资故事 = OS + 生态  

---

## 12. 样板路径：餐厅经营诊断（冻结）

```text
Agent UI 登录（可 SSO 到 MealKey）
  → Gateway 获取 Business Identity
  → Context API 读 Brain / Reviews
  →（可选）触发 M-INTEL 采集授权
  → Engine 诊断
  → submit Signal/Insight（≤L3）
  → 用户回 MealKey 今日 / 决策室
  → Execution · Learning
```

验收：不读 Core DB 连接串；输出可进今日；拆仓后行为不变。

---

## 13. 与旧框架映射（冻结）

| 旧概念 | 平台态 |
|--------|--------|
| Tool Agent Framework 四件套 | Agent 仓内 Engine + Manifest；Host Bridge → Gateway |
| `packages/m-ops-diag` | 官方诊断 Agent 过渡包 |
| L1 四席 | 留在 Core；消费 Ingress，不做 Marketplace 商品 |
| agent-runtime | Gateway/调度核心 |

---

## 14. 落地阶段（工程建议 · 非停扩豁免）

| Phase | 内容 |
|-------|------|
| **P0** | 原则+协议+本文冻结；诊断样板标明 Gateway 语义 |
| **P1** | Context API + Ingress 校验；SDK 类型 |
| **P2** | 诊断 Agent 独立前端/部署形状（可仍 monorepo） |
| **P3** | 拆 `mealkey-agents`；Marketplace 最小安装 |
| **P4** | 第三方 cloud_https + 审核后台 |

---

## 15. 下一步（冻结）

1. **《Agent 运行时与第三方开发者接入流程》** — 7 日上手手册（SDK 实操）  
2. 经营诊断：按独立产品形状推进 UI/Gateway，而非继续加厚 Core  
3. 类型落地：`agent-sdk` Context/Ports；Gateway 路由草案  

**停止：** 在 Core `packages/` 新增第二个、第三个业务垂直 Agent 大包。

---

## 16. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 Platform Freeze | 2026-07-21 | 独立部署 · Gateway · SDK · Context API · Permission · 审核 · Marketplace · 官方/第三方共存 · 仓库变薄 |

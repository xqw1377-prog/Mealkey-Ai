# MealKey Agent Platform Architecture V1（冻结）

> **版本：** V1.1  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **原则真源：** `MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md`  
> **协议真源：** `MEALKEY_AGENT_PROTOCOL_V1.md`  
> **接口真源：** `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`（HTTP/签名/Ingress 字段）  
> **UI 框架：** `MEALKEY_AGENT_UI_FRAMEWORK_V1.md`（实现外置）  
> **冲突裁决：** 平台拓扑/四基建/Lifecycle/Orchestra/商业分层以本文为准；线级 API 以 External Interface 为准；质量与 L1–L5 以 Protocol 为准  
> **硬闸门：** MealKey 仓 **禁止新增任何 Agent**；Agent 独立开发·部署·商业化  

---

## 0. 一句话（冻结）

> **Agent 独立开发、独立部署、独立商业化；MealKey 负责连接、治理、组合。**

平台要回答的下一层问题：

> 外部 Agent 如何像 App 一样 **安全、稳定、高质量** 跑在 MealKey 生态里？

---

## 1. 平台整体架构（冻结）

```text
                         用户
                          │
                    MealKey 入口层
        ┌─────────────────┴─────────────────┐
        │                                   │
   MealKey Web                         Agent 独立 Web
   今日驾驶舱                           诊断系统 / 定位…
   决策会议室                           （外置产品）
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                  Agent Gateway Layer
                      （统一入口）
                          │
                  Agent Runtime
        Registry · Router · Context Manager
        Permission Manager · Quality Monitor
                          │
                  External Agents
        餐厅诊断 ·（外置）M-PNT 能力面 · 选址 · 招聘 · 第三方…
```

| 层 | 职责 |
|----|------|
| **入口层** | OS 宿主面 + 各 Agent 独立前端（双表面，见 UI Framework） |
| **Gateway** | 认证·鉴权·计量·审计·唯一数据通道 |
| **Runtime** | 注册·路由·Context 组装·权限·质量监控 |
| **External Agents** | 专业能力；**不在** MealKey 仓新增 |

Council 四席留在 **Decision Infrastructure**（Core），不是 Marketplace 商品。

---

## 2. MealKey 真正拥有的：四大基础设施（冻结）

不要理解为「MealKey 拥有所有 Agent」。MealKey 拥有：

```text
Identity OS  +  Brain OS  +  Decision OS  +  Agent OS
```

### 2.1 Identity Infrastructure（身份）

> 你是谁？你经营什么？

共享对象：`User` · `Founder` · `Company` · `Brand` · `Restaurant` · `Store` · `Region`

Agent 租用 `scope=basic` 即可获得店名/城市/品类/阶段等，**禁止**每个 Agent 重新问一遍身份长表。

### 2.2 Brain Infrastructure（经营事实）

> 这盘生意发生了什么？

经营数据 · 顾客评价 · 菜单/价格 · 竞争 · 历史事件 · 过去决策记忆  

**最大数据资产。** Agent 只经 Context Manager 租用切片，不拥有主库。

### 2.3 Decision Infrastructure（决策）

> 如何把信息变成判断。

`Signal` · `Case` · `Evidence` · `Option` · `Assessment` · `Decision` · `Execution` · `Learning`

所有 Agent 合法输出最终进入这里（经 Ingress 投影）。拍板唯一场仍在决策室。

### 2.4 Agent Infrastructure（能力）

> 谁来解决问题。

Registry · Lifecycle · Marketplace · Quality · Orchestra · Billing 钩子  

**连接、治理、组合** —— 不替代垂直算法。

---

## 3. Agent Lifecycle（冻结）

第三方不是「上传一段 Prompt」，而是完整生命周期：

```text
Draft → Registered → Verified → Published → Running → Optimizing → Deprecated
```

| 状态 | 含义 |
|------|------|
| **Draft** | 独立仓开发 |
| **Registered** | 登记 Manifest · Capability · Permission · Version |
| **Verified** | 输入/输出/安全/质量测试通过（Sandbox） |
| **Published** | 进入能力市场 |
| **Running** | 真实用户；Runtime 持续监控 |
| **Optimizing** | 依反馈·决策结果·效果升级版本 |
| **Deprecated** | 停止新装；已装可只读或迁移 |

对齐 Protocol `stage`：`idea/pilot/sandbox/live/deprecated`（映射见下）。

| Lifecycle | Protocol stage（约） |
|-----------|----------------------|
| Draft | idea |
| Registered–Verified | sandbox / pilot |
| Published–Running | live |
| Deprecated | deprecated |

---

## 4. Agent Manifest（运行时身份证）

每个 Agent 必备（类 `package.json`）。完整字段以 Protocol `AgentManifestV1` 为准；运行时最小例：

```json
{
  "id": "restaurant-diagnosis",
  "name": "餐厅经营诊断系统",
  "version": "1.0.0",
  "category": "operation",
  "provider": "mealkey",
  "capabilities": [
    "ops.diagnosis.health_check",
    "ops.diagnosis.problem_detection",
    "ops.diagnosis.operation_analysis"
  ],
  "context_required": [
    "restaurant.basic",
    "restaurant.review",
    "restaurant.operation"
  ],
  "output": ["BusinessSignal", "MKInsight", "Gap"],
  "permission": ["read:restaurant", "read:evidence"],
  "maxInsightLevel": 3
}
```

说明：`Report` 不是一等 Ingress 出口（见 Protocol）；长报告仅 Agent 自有面附件。

线级注册 API：`MEALKEY_AGENT_EXTERNAL_INTERFACE_V1` §5。

---

## 5. Agent Runtime：一次调用怎么跑（冻结）

例：用户问「我的店最近为什么生意下降？」

```text
用户问题
  → MealKey Intent Router（OS）
  → 判断需要经营诊断能力
  → Agent Gateway
  → Runtime Router 解析已安装 Agent
  → Context Manager 组装 Business Context
  → Permission Manager 裁剪 scope
  → 调用外接 restaurant-diagnosis-agent
  → Agent 执行 Decision Skill
  → 返回 Insight/Signal（Ingress）
  → Quality Monitor 闸门
  → 投影 Decision Infrastructure（今日 / 决策室候选）
```

### 5.1 Runtime 五件套

| 组件 | 职责 |
|------|------|
| **Agent Registry** | Manifest · 版本 · 安装关系 |
| **Agent Router** | Intent/能力 → agent_id；编排入口 |
| **Context Manager** | 决定给什么、何时给、给多少（壁垒） |
| **Permission Manager** | 安装授权 · scope · 默认拒绝集 |
| **Quality Monitor** | 运行时拒收 · Score 抽样 · 降级/下架信号 |

Gateway = 对外边缘；Runtime = 对内治理引擎。接口形状见 External Interface。

---

## 6. Context Manager = 关键壁垒（冻结）

AI 能力越来越便宜；**喂什么上下文**决定质量。第三方无法复制的是：

> 什么信息给它 · 什么时候给 · 给多少 · 与历史决策如何对齐。

| 普通 GPT | MealKey Context |
|----------|-----------------|
| 「生意不好」 | 湘菜·长沙·营业18个月·客单78 |
| 泛建议 | 近90天营业额↓12%（有源） |
| 无记忆 | 等待差评↑40% · 500m 新竞品2家 · 曾增员失败的 Learning |

Context Manager 规则（冻结方向）：

1. **最小充分**：只给 Manifest `context_required` ∩ 用户授权  
2. **新鲜度优先**：日扫 Δ 与历史基线一并标注 `asOf`  
3. **决策记忆可选注入**：相关 past Decision/Learning（须权限）  
4. **禁止倾倒全库**：条数/字段硬顶（Interface 已定）  
5. **可审计**：每次 invoke 记录 Context 指纹（hash/scope），供复盘  

这是平台相对「裸 LLM 壳」的护城河之一（并列 Brain 数据本身）。

---

## 7. Agent Orchestra（组合 · 冻结）

未来默认不是单 Agent 聊天，而是 **任务编排**：

```text
Mission（例：开第二家店）
  → Agent Chain（选址 + 品牌落差 + 经营诊断 + 财务摘要…）
  → Evidence Merge
  → Decision Package（进决策室，非自动拍板）
```

### 7.1 硬规则

| 规则 | 含义 |
|------|------|
| 组合在 OS | Orchestra 由 Runtime 编排，不由 Agent 互调私有 API |
| 中间物合法 | 仅 Port 类型（Signal/Insight/Work/Gap）可串联 |
| 默认 ≤L3 | 链上 Agent 未认证不得冒充 L4/L5 |
| 汇聚非聊天 | Evidence Merge 进 DIE，不是群聊纪要 |
| 用户可见 | Mission 进度可解释；禁黑盒自动战略终局 |

与 Tool Framework 的 Pipeline/Fan-in 语义对齐，升级为平台级 Mission。

---

## 8. 四个独立（每个 Agent 必须满足）

| # | 独立 | 例（诊断） |
|---|------|------------|
| 1 | **独立仓库** | `restaurant-diagnosis-agent` |
| 2 | **独立部署** | `diagnosis-api.…` |
| 3 | **独立前端** | `diagnosis.mealkey.com`（或自有域） |
| 4 | **独立商业化** | subscription / usage / enterprise |

MealKey 仓内 **不得** 为新 Agent 开包；存量 `m-ops-diag` 仅过渡迁出。

---

## 9. 商业分层（冻结方向）

| 类型 | 谁开发 | 收入 |
|------|--------|------|
| **官方 Agent** | MealKey（外置仓） | 归平台（或内部结算） |
| **合作 Agent** | 服务商 | 示意分成：开发者 70% / 平台 30%（费率商务定） |
| **企业 Agent** | 连锁内部 | Enterprise 接入费 / 席位；`enterprise_local` |

计费钩子：安装订阅 · Context/Ingress 调用 · 能力市场抽佣。数字不冻死在架构文。

---

## 10. 官方与第三方共存

同一 Gateway · 同一 Context/Ingress · 同一 Quality。  
官方无特权读库通道。预装仅「默认安装」，权限表仍执行。  
详见 V1.0 共存表；徽章：官方 / 认证伙伴。

---

## 11. 样板：餐厅经营诊断 = 标准 Agent 产品模板（冻结）

**不是** MealKey 内一个功能菜单，而是第一个证明路径：

```text
独立创造 → 接入 MealKey → 共享经营数据（Context）
  → 进入决策系统（Ingress）→ 持续学习进化（Learning 审核）
```

体验：`M_OPS_DIAG_UX_V1` + `MEALKEY_AGENT_UI_FRAMEWORK_V1`（实现外置）  
算法：`M_OPS_DIAG_DIAGNOSIS_MODEL_V1`（外置 Engine）  
接入：`MEALKEY_AGENT_EXTERNAL_INTERFACE_V1`

---

## 12. 与线级接口 / 旧框架映射

| 本文概念 | 落点 |
|----------|------|
| Gateway + Runtime | External Interface `/v1/gateway/*` |
| Context Manager | Context API + 组装策略（本文 §6） |
| Ingress | Signal/Insight/Work/Gap/Learning |
| Registry/Lifecycle | Manifest 注册 + stage |
| Orchestra | Mission 编排（工程后置，语义先冻） |
| `packages/m-ops-diag` | 过渡；禁止再增兄弟包 |
| L1 四席 | Decision OS 内治理角色 |

---

## 13. 落地阶段（提醒：非停扩豁免）

| Phase | 内容 |
|-------|------|
| **P0** | 本文 V1.1 + 外接接口 + UI 框架已冻 |
| **P1** | Gateway Context/Ingress 工程；Context Manager 最小策略 |
| **P2** | 外置诊断仓（四独立）打通样板 |
| **P3** | Registry Lifecycle + Marketplace 安装 |
| **P4** | Orchestra Mission 最小链；第三方 Verified |

批量第三方上架仍服从核心飞轮闸门。

---

## 14. 下一步（冻结）

**Agent SDK V1 已冻结：** `docs/MEALKEY_AGENT_SDK_V1.md` · `@mealkey/agent-sdk/platform`

下一工程刀：

1. Gateway 真实路由对接 External Interface  
2. 外置诊断仓改用 Platform SDK  
3. 7 日开发者手册（基于 SDK Hello）  

**禁止** MealKey 仓内新增 Agent。

---

## 15. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 独立部署 · Gateway · SDK 边界 · Context · 审核 · Marketplace · 共存 |
| V1.1 | 2026-07-21 | 四基建 · Lifecycle · Runtime 五件套 · Context Manager 壁垒 · Orchestra · 四独立 · 商业分层 · 下一刀=Agent SDK V1 |

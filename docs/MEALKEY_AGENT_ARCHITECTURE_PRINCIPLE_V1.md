# MealKey Agent Architecture Principle V1（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `MEALKEY_AGENT_PROTOCOL_V1.md` · `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md` · `MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md`  
> **冲突裁决：** 组织/仓库/商业边界以本文为准；接入契约以 Protocol 为准；平台工程以 Platform Architecture 为准  

---

## 0. 一句话（冻结）

> **MealKey 不开发功能；MealKey 定义能力标准。  
> Agent 独立创造能力，通过协议进入经营大脑。**

MealKey = **餐饮 AI 能力操作系统**  
不是 = 餐饮 AI 大杂烩 App  

本原则影响：代码结构 · 商业模式 · 团队组织 · 融资叙事 · 后续 3～5 年架构。

---

## 1. 关系重定义（冻结）

### 1.1 废弃心智

```text
MealKey
 ├── M-PNT / M-BIZ / M-ED …
 ├── 餐厅诊断
 ├── 选址
 └── 招聘
```

问题：平台越来越重 · 迭代节奏冲突 · 商业模式混乱 · 第三方无法参与。

### 1.2 目标心智

```text
                 MealKey OS
                      │
           Agent Protocol / Runtime / Gateway
                      │
     ┌────────────────┼────────────────┐
餐厅诊断 Agent     选址 Agent      招聘 Agent …
独立产品·团队·部署  （官方或第三方，同等协议）
```

---

## 2. 三条边界（冻结）

| 层 | 负责 | 不负责 |
|----|------|--------|
| **MealKey Core** | User · Business Identity · Restaurant Brain · Decision Intelligence · Council · M-EXEC · Protocol/Gateway | 垂直专业算法细节 · Agent 私有业务库 · Agent 独立前端体验 |
| **Agent** | 专业能力（健康模型/诊断算法/选址模型…）· Decision Skill · 自有业务数据 | 直连 Prisma/Brain · 私有永久用户记忆 · 战略终局拍板 |
| **Agent UI** | 该能力的完整用户体验（可独立域名） | 伪造平台身份 · 绕过 Gateway 读核心数据 |

---

## 3. 一个 Agent = 一个独立创业单元（冻结）

每个垂直 Agent（官方或第三方）原则上具备：

1. **独立前端**（例 `diagnosis.mealkey.com`：首页/登录对接/工作流/报告/支付）  
2. **独立后端**（engine + 经 Protocol 连 OS）  
3. **独立业务库**（诊断历史、报告、模型参数等）——**非**核心身份/Brain 事实  

核心身份与餐厅事实：**只租用** MealKey Context API。

---

## 4. 与四席 / L1 的关系（冻结 · 防误读）

| 概念 | 归属 | 说明 |
|------|------|------|
| Council 四席（认知治理角色） | **Core OS** | 永不取消、永不第五席；消费 Agent Insight，不做 Marketplace App |
| 垂直能力产品（诊断/选址/培训…） | **Agent 层** | 独立产品；经 Protocol 进大脑 |
| 历史 monorepo 内咨询六步 | **过渡态** | 可逐步产品化为官方 Agent；不得再把新垂直能力堆进 Core |

**禁止：** 把 Marketplace Agent 注册为第五 `FounderAgentName`。  
**禁止：** 用「全外置」当借口拆掉 Brain / DIE / 拍板唯一场。

---

## 5. 仓库与组织原则（冻结）

```text
MealKey Core 仓库（变薄）
  packages: agent-sdk · agent-runtime · protocol · identity/brain/decision/ui sdks …

mealkey-agents/（或独立 git）
  restaurant-diagnosis-agent
  restaurant-location-agent
  …
```

- Core `packages/` **不再**堆大量业务 Agent  
- 现有 `packages/m-ops-diag` = **样板过渡**：语义上已是独立 Agent；物理拆仓可在 Platform 落地阶段执行  
- 团队：平台组 vs Agent 组（可内可外），节奏解耦  

---

## 6. 商业原则（冻结）

- 平台：身份/Brain/决策/执行/协议 + 能力市场抽佣与数据调用计费  
- Agent：能力订阅/按次 · 可官方可第三方  
- 老板买的是 **能力**，不是又一个大 App 菜单项  

---

## 7. 样板验证（冻结）

**餐厅经营诊断 Agent** = 第一个完整验证件：

登录 → Identity → Brain → M-INTEL → 诊断 → Insight/Signal → 决策室 → 执行 → Learning  

跑通后，其余 Agent **复制协议路径，不复制堆进 Core**。

---

## 8. 下一步

工程与产品边界展开见：

**`docs/MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md`**

---

## 9. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | OS 定规则 / Agent 独立产品；三边界；与四席防误读；仓库变薄 |

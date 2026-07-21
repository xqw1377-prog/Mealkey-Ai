# MealKey Developer Portal V1 · UI/UX 设计规范（冻结）

> **版本：** V1.1  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **产品真源：** `MEALKEY_DEVELOPER_PORTAL_V1.md`  
> **数据/IA：** `MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1.md`  
> **契约真源：** `MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1.md` · Protocol · External Interface  
> **路径：** P0 已挂 `apps/web` `/developers`；本规范指导 **P0.1 体验升级 + P1 Console**。  
> **一句话：** 第三方 Agent 创作者进入 MealKey 生态的 **第一工作台**（非文档站）。  
> **核心体验路径：** 第一次访问 → 理解为何加入 → 10 分钟注册 → 1 小时 Sandbox → 7 天首个 Agent → Marketplace。  
> **冲突裁决：** 路由与对象以 IA/数据模型为准；**本文件管构图与气质**；契约字段禁止分叉。

---

## 0. 设计前提（冻结）

### 0.1 气质：AI Operating System Developer Hub

| 传统 API 站 | MealKey |
|-------------|---------|
| 冷冰冰参数/代码墙 | 能力生态 · 经营场景 · 智能伙伴 · 共同创造 |

关键词：**专业 · 克制 · 可信 · 工程化 · 生态感**。

### 0.2 三类用户

| 角色 | 首页强调 |
|------|----------|
| Agent 开发者 | 开始创建 · Quick Start · Console |
| 企业合作伙伴 | Context 价值 · 数据/能力接入 |
| 平台管理员 | 链到 `/platform/admin` |

### 0.3 视觉 Token

| Token | 值 |
|-------|-----|
| 背景 | `#f3f5f0 → #e8ede4 → #dfe6d9` |
| 字色 | `#171717` · 强调 `#66735E` |
| 主 CTA | `#181817` 底白字 |
| 字体 | `font-display` + 正文 15–16px |

**禁止：** 紫靛渐变、玻璃拟态堆、胶囊统计条、emoji 图标系统、首屏卡海。

### 0.4 动效 · 移动端

动效：rise 入场 · CTA focus · 状态点 · Sandbox 日志行。  
移动：首页/Docs 可读；Console PC 优先。

---

## 1. 六页 + 路由

| # | 页面 | 路由 |
|---|------|------|
| 1 | Landing | `/` · `/developers` |
| 2 | Quick Start | `/start` |
| 3 | Agent 创建 | `/console/agents/new` |
| 4 | Sandbox | `/console/agents/[id]/sandbox` |
| 5 | 提交审核 | `/console/agents/[id]/submit` |
| 6 | Marketplace Preview | `/console/agents/[id]/listing` |

另：`/apply` · `/docs/*` · `/sdk` · `/examples` · `/console`。完整树见 IA §1。

---

## 2. Landing

### 2.1 Hero（左文右图）

左：英标题 `Build AI Agents for Restaurant Intelligence` · 中文「让每一个餐饮经营者拥有下一代 AI 能力」· CTA「开始创建 Agent」「查看官方示例」。  

右（非代码）：

```text
Agent (M-OPS Diagnosis) → MealKey OS → Restaurant Brain → Business Decision
```

### 2.2 Why MealKey?

1. **Context Ready** — Agent + Context + Evidence，无需重采  
2. **Decision Connected** — Today / Decision Room / Execution  
3. **Marketplace Distribution** — 用户 · 场景 · 收入  

### 2.3 捷径

Developer Kit · 宪法索引 · Apply。

---

## 3. Quick Start `/start`

三入口：Build from SDK · Fork Example · Connect Existing Agent。  

衔接：Create Manifest → Gateway 示意 → Sandbox 日志时间线。  

**Docs 布局：** 左导航 · 中正文 · 右 Try it（P1）。每 API 页三区：你能做什么 / 技术契约 / M-OPS 案例。

---

## 4. Agent 创建

步进：Identity → Capability → Permission → Runtime → Review。  

Capability **从 Registry 树点选**。右侧 Manifest 预览。数据落点见 IA §5。

---

## 5. Sandbox

左：fixture + scope 勾选。右：Finding / Evidence / Signal。下：日志 + 五项检查（Context/Scope/Ingress/Evidence/Level）；失败展示拒收码原文。

---

## 6. 提交审核

Checklist：Manifest · Security · Sandbox · Evidence · UI Demo → Submit（`ReviewTask`）。

---

## 7. Marketplace Preview

老板卡预览：名称 · 提供商 · 能力 · 适用 · 价格 · Install（发布前禁用并说明）。

---

## 8. Console Dashboard

焦点 Agent：Status · Quality · Version · Usage · Revenue（未开通明示）· 下一步勾选。禁止卡海。

---

## 9. Developer Kit · Apply

`/sdk` = Kit（SDK/CLI/Generator/Sandbox/Example）。`/apply` = 10 分钟入驻 → `DeveloperAccount`。

---

## 10. P0 升级关系

现有 `/developers` → 按 §2–3 做 P0.1；Console 按 IA P1。

---

## 11. 验收

- [x] 5 秒懂生态定位  
- [x] Why 讲场景不讲参数墙  
- [x] Start 三入口  
- [x] Docs 有「你能做什么」  
- [x] Sandbox 分栏 + 日志  
- [x] Submit/Preview 对齐审核与 Store  
- [x] 非冷冰冰 API 站、非紫套模板  

---

## 12. 下一步

P0–P2 工程已落地。

---

## 13. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 六页初冻 |
| V1.1 | 2026-07-21 | OS Hub · Hero 左右 · Why 三卡 · Start 三入口 · Docs 左中右 · Playground · Apply · 对齐 IA |
| V1.1+ | 2026-07-21 | 验收勾选对齐工程 |

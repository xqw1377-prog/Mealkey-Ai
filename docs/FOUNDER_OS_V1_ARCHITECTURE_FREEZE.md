# Founder OS V1.0 总体架构冻结

> **状态：正式冻结（Freeze）**  
> 日期：2026-07-16  
> 真源配置：`founder-os/architecture/v1_freeze.yaml`  
> 原则：继续往下扩易陷入「无限设计」——宏观架构至此收口。  
> **2026-07-18 补充：** 七常委系统级收口见 `docs/FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md`（下一主线 = Council Runtime Engine，不再扩组织）。

---

## 一句话定义

> Founder OS 是一个面向企业创始人的 AI 决策操作系统，通过专业判断引擎、决策委员会和企业记忆系统，把 AI 的无限知识转化为企业家的长期决策能力。

---

## 一、最终架构（三层）

### 第一层：专业判断层（Expert Engine）

目标：把单一领域做到全球顶级咨询能力。  
不是聊天 Agent，不是助手，而是**专业咨询能力产品化**。

| Engine | 名称 | 解决 | 对标 |
|---|---|---|---|
| **M-PNT** | Brand Positioning Engine | 心智中占据什么位置？ | Interbrand / Landor |
| **M-MKT** | Market Intelligence Engine | 市场机会在哪里？ | 麦肯锡市场进入战略 |
| **M-BIZ** | Business Model Engine | 模式是否成立？ | 商业战略咨询 |
| **M-ED** | Equity Design Engine | 如何长期组织资本与利益？ | 投行 + 股权顾问 |

**冻结：四大核心，本版本不再增加第五个专业 Engine。**

> **2026-07-17 补充：** 执行 / 成长 / 学习属于 **Runtime**，不是第五 Expert。完整边界见 `docs/MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md`。  
> **2026-07-17 补充：** 落地工具型 Agent 属 **L3**，可规模扩展但不得做战略判断。总图见 `docs/MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md`。  
> **2026-07-17 补充：** 谁能自动执行、何时召回七常委见 `docs/MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md`。

---

### 第二层：决策治理层（Founder Decision Council）

七常委 = 企业最高决策机构（不是第二专家层）。

| 常委 | 职责 |
|---|---|
| CSO 战略 | 方向选择 |
| CMO 市场 | 需求判断 |
| CBO 品牌 | 心智资产 |
| BMO 商业 | 盈利模型 |
| CFO 财务 | 资本安全 |
| COO 运营 | 执行复制 |
| CRO 风险 | 底线控制 |

**冻结：刚好 7 个。** 少则视角不足，多则效率下降。不再增加常委。

---

### 第三层：企业智能层（Chief of Staff Agent）

不是第 5 个专业 Agent，而是 **Founder OS 操作中枢**。

职责冻结：

1. **问题发现** — 经营异常 / 战略机会 / 风险信号  
2. **议题管理** — 归属 M-PNT / M-MKT / M-BIZ / M-ED / 七常委  
3. **决策组织** — 召集会议、生成 Decision Brief  
4. **执行跟踪** — 连接 Validation OS  
5. **企业记忆** — 决策 / 依据 / 结果 / 偏差  

---

## 二、完整闭环（冻结）

```text
企业问题
  → Chief of Staff
  → 专业判断（四大 Engine）
  → Evidence Layer
  → 七常委 Decision Council
  → Founder 最终决策
  → Validation
  → Memory
  → 能力进化
```

相关已落地规格（不再改宏观边界）：

- Expert × Council：`FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md`
- FDC 宪法 / 运行规则 / 人格 V2 / 会议引擎 / 知识资产 / 经营场景矩阵  
- 配置树：`founder-os/`

---

## 三、明确不做什么（冻结）

Founder OS 管 **决策层**，不管执行层。

| 不做 | 原因 |
|---|---|
| 餐饮 ERP | 执行层 |
| 门店管理系统 | 执行层 |
| 员工培训系统 | 执行层 |
| 营销执行工具 | 执行层 |
| 供应链系统 | 执行层 |
| 点餐系统 | 执行层 |
| 日常 SOP 工具 | 执行层 |

避免变成「大杂烩」。

---

## 四、未来 Agent 扩展规则（冻结）

新增 Agent **不是因为行业热闹**，而是：

> 若老板缺少这个能力，会导致重大决策错误吗？

符合才增加。候选（**现在不进入 V1**）：

- M-INV 投资并购（发展到一定阶段）  
- M-HR 组织人才（规模化以后）  
- M-OPS 运营系统能力（连锁阶段）  

---

## 五、开发优先级（冻结）

| Phase | 内容 | 说明 |
|---|---|---|
| **1** | 四大 Engine 深度化 | 顺序：**M-PNT → M-BIZ → M-MKT → M-ED** |
| **2** | Evidence Layer | 无证据则判断只是观点 |
| **3** | Decision Council Engine | 组织智能（架构已冻，工程加深） |
| **4** | Chief of Staff Agent | 统一入口，系统闭环 |

Phase 1 理由：

1. **M-PNT** — 定位是餐饮创业最源头，第一块专业壁垒  
2. **M-BIZ** — 决定能不能赚钱  
3. **M-MKT** — 验证市场  
4. **M-ED** — 资本放大  

---

## 六、产品定位（冻结）

| 不是 | 是 |
|---|---|
| AI 咨询机器人 | **Founder OS** |
| 餐饮老板助手 | **AI 企业决策操作系统** |

核心价值：

> 帮助创始人像拥有一个世界级咨询团队 + 董事会 + CEO 办公室一样经营企业。

---

## 七、本轮收口声明

**宏观架构正式冻结。**  
下一阶段进入工程：**M-PNT V2**（见 `docs/M_PNT_V2_FOUNDER_OS_ENGINEERING_FOCUS.md`）  
已接线：`toMPntExpertReport` / `computeBrandStrength` → 七常委可消费。

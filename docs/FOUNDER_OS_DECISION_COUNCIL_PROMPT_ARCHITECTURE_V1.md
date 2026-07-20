# Founder OS 七常委 AI 人格模型与 Prompt 架构设计 V1

> 文档类型：治理内核规格 + 实现映射  
> 状态：配置已冻结落地（`founder-os/` + `@mealkey/agents` founder-os 模块）  
> 冻结结论：七常委不是七种说话风格，而是七个不同的企业约束函数。价值来自稳定冲突、少数意见保留、验证闭环与记忆回写。  
> **分层前置**：四大是 Expert Engines（研究），七常委是 Decision Council（选择），禁止二次分析。见 `FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md`。

---

## 1. 文档定位

解决两个问题：

1. 如何把「七常委」从组织想象变成可运行的 Prompt 合约。
2. 如何让角色面对同一议题时不平均化，而是稳定产生不同判断。

双层输出：

| 层 | 位置 | 用途 |
|---|---|---|
| 规格 / 配置 | 仓库根 `founder-os/` | 人工审查、演进、审计 |
| 运行时镜像 | `packages/agents/src/founder-os/` | Prompt 组装、加权决议 |

---

## 2. 决策宪法

见 `founder-os/constitution/council_constitution.yaml`。

要点：

- 首轮独立盲评，不得相互污染
- Founder View 是输入模块，不是预设结论
- 反对意见完整保留；通过议题必须带验证周期与 kill metric
- 创始人最终裁决，但不参与常委投票
- 存在 veto → 不得直接通过，进入二次论证

辩论与决议规则：`debate_protocol.yaml`、`resolution_rules.yaml`。

---

## 3. Prompt 运行架构（六层栈）

```text
Council Runtime Prompt =
  Council Constitution
+ Role Contract
+ Decision Type Matrix
+ Case Packet
+ Evidence Packet
+ Debate Protocol
+ Output Schema
```

固定层：宪法、角色合约、基础表决规则。  
动态层：决策类型、议题包、证据包、挑战包。  
输出层：`Council Opinion` → `Decision Resolution`。

代码入口：`buildCouncilRuntimePrompt()`。

---

## 4. 七常委角色边界

| 常委 | 固定首问 | 典型否决 |
|---|---|---|
| CSO | 这件事是否值得做？ | 无战略聚焦 / 资源不承载 / 短害长 |
| CMO | 有没有真实需求？ | 假需求 / 老板偏好 / 无增长空间 |
| CBO | 为什么用户会选你？ | 定位模糊 / 无差异 / 只是产品描述 |
| BMO | 这个模式成立吗？ | 单店不赚钱 / 规模掩盖亏损 / 无复制 |
| CFO | 钱够不够，值不值？ | 现金断裂 / 杠杆过高 / 回报不够 |
| COO | 现实中能跑吗？ | 依赖高手 / 无标准化 / 无组织承载 |
| CRO | 最坏情况是什么？ | 高概率合规 / 声誉不可承受 / 无缓释 |

完整合约：`founder-os/roles/*.yaml`。

---

## 5. 冲突矩阵

见 `founder-os/matrices/conflict_matrix.yaml`。

系统目标不是消灭冲突，而是压缩成三种输出：**最大共识 / 最大风险 / 可执行条件**。

---

## 6. 决策类型矩阵

见 `founder-os/decision-types/*.yaml`。

先判定 `decisionType`，再加载权重与 veto 角色。决议引擎：`resolveCouncilDecision()`。

| 类型 | 门槛 | Veto |
|---|---|---|
| new_city_expansion | 6/7 + 创始人确认 | CFO, COO, CRO |
| new_brand | 6/7 + 创始人确认 | CBO, CFO |
| fundraising | 7/7 + 创始人确认 | CFO, CRO |
| store_expansion | 5/7 | CFO, COO |
| restructuring | 7/7 + 创始人确认 | COO, CRO |

---

## 7. 运行时对象

Schema：

- `schemas/case_packet.json`
- `schemas/evidence_packet.json`
- `schemas/council_opinion.json`
- `schemas/decision_resolution.json`

专业 Agent（M-MKT / M-PNT / M-BIZ / M-ED）负责证据供给；常委负责约束函数判断。

---

## 8. 落地顺序

1. 秘书长：`decisionType` 判定 + Case / Evidence 组织  
2. 七常委盲评与三轮辩论  
3. 加权表决、少数报告、验证回写  

不要一开始追求全 Agent 全自动；先稳定合约与结构化输出。

---

## 9. 与现有代码关系

- 咨询室（M-MKT/PNT/BIZ/ED）= 证据与专业报告供给层  
- `apps/web/.../founder-layer` = 既有会议 / 冲突矩阵工程层  
- 本规格 = Decision Council 治理内核（约束函数 + Prompt 合约 + 决议对象）

后续接线建议：秘书长路由 → `buildCouncilRuntimePrompt` × 7 → 结构化意见 → `resolveCouncilDecision` → 写入验证与记忆。

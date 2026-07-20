# Founder OS：四大 Expert Engine × 七常委 Decision Council 协同架构 V1.0

> 文档类型：架构冻结稿  
> 状态：配置已落地（`founder-os/architecture/` · `expert-engines/` · schemas）  
> 运行时：`packages/agents/src/founder-os/`  
> 配套：`FOUNDER_OS_DECISION_COUNCIL_PROMPT_ARCHITECTURE_V1.md` · `FOUNDER_OS_COUNCIL_OPERATING_RULES_V1.md`

---

## 0. 必须先纠正的错误

**四大 Agent 和七常委不是两个专家层。**

错误模型：

```text
4 个专家分析一次 → 7 个专家再分析一次 → 重复消耗
```

正确模型：

| 层 | 定位 | 类比 | 产出 |
|---|---|---|---|
| 四大 | **Expert Engine（专业咨询机构）** | 麦肯锡 / Interbrand / 财顾 / 投行 | 领域专业报告 |
| 七常委 | **Decision Council（最高决策委员会）** | 董事会战略委 / ExCo | 企业选择与条件 |

一句话：

> 四大把领域研究透；七常委在冲突中做企业选择。七常委不重新分析。

---

## 1. 组织图

```text
          Founder（Override，非第八常委）
                |
         Chief of Staff AI
                |
         七常委决策委员会
                |
    -------------------------------
    M-PNT Brand Strategy Engine
    M-MKT Market Intelligence Engine
    M-BIZ Business Model Engine
    M-ED  Capital & Ownership Engine
                |
           Evidence Layer
                |
           Validation OS
```

---

## 2. 三层智能

```text
L1 知识智能 Knowledge Layer     → AI 知道世界
L2 专业智能 Expert Engines      → AI 像咨询专家
L3 治理智能 Decision Council    → AI 帮助企业做选择
```

这比「餐饮 AI 助手」高一个维度：从回答问题，升级为企业治理操作系统。

---

## 3. 四大 Expert Engine 重定位

未来产品叙事上，不要再把它们叫成与常委同级的「Agent 专家」。它们是 **专业判断引擎**。

| Engine | 解决 | 产出 |
|---|---|---|
| M-PNT | 我是谁？ | Brand Strategy Report |
| M-MKT | 市场有没有机会？ | Market Intelligence Report |
| M-BIZ | 能不能赚钱？ | Business Model Report |
| M-ED | 如何长期组织资本？ | Capital Structure Report |

它们**不投票**。它们生产**专业意见**，供常委消费。

配置：`founder-os/expert-engines/*.yaml`。

---

## 4. 七常委只做 Decision Intelligence

同样议题「是否进入上海」：

| 来源 | 产出性质 |
|---|---|
| M-MKT | 机会 / 风险（专业事实判断） |
| M-PNT | 品牌可行性与条件 |
| M-BIZ | 模型能否撑住租金 |
| M-ED | 资本路径建议 |
| 七常委 | 从各自管理视角：对企业整体是否正确 |

常委固定首问不变（战略值得做？需求真实？心智？赚钱？现金？可执行？最坏情况？），但输入必须是 Expert Report，禁止二次研究。

转换契约：`founder-os/architecture/expert_to_council.yaml`。

---

## 5. 核心对象：Decision Brief

```text
决策问题
  → 专业证据
  → 四大专家意见（Expert Reports）
  → 七常委意见
  → 冲突点
  → 最终方案（Resolution ± Founder Override）
  → 验证计划
```

这是企业**决策数据库**单元，不是聊天记录。Schema：`founder-os/schemas/decision_brief.json`。

---

## 6. 投票与红线否决

- **不是**一人一票民主。
- **是**按 `decisionType` 的权重矩阵 + 红线否决。
- 重大扩张示例权重（百分比，运行时由整数权重归一化）：CSO 20% / CMO 15% / CBO 15% / BMO 20% / CFO 15% / COO 10% / CRO 5%。
- 红线否决：CFO（现金/资本）、CRO（合规/声誉/法律底线）、以及决策类型授权的 COO 等。
- 有效 veto → **不得直接通过**，进入二次论证或暂缓。

---

## 7. Founder Override

创始人**不是**第八常委。

- 不参与常委投票。
- 拥有最终裁决权。
- 若与委员会不一致，必须留下 `Founder Decision Note`（为什么不同意、接受哪些风险）。
- 验证回写后标注 `whoWasRight`：founder / council / mixed —— 这是长期数据资产。

---

## 8. 落地顺序（与实现对齐）

1. 秘书长：议题准入 + `decisionType` + 选定 Expert Engines  
2. Expert Engines：出专业报告（可复用现有四席咨询室）  
3. 编译 Evidence Packet + 组装给常委的输入包（禁止重研）  
4. 七常委盲评 → 辩论 → 加权决议 + veto  
5. Founder 确认 / Override + Decision Brief 落库  
6. Validation OS 回写学习  

代码入口：

- `buildCouncilRuntimePrompt`（已注入 Expert Reports 层）
- `buildDecisionBrief` / `applyFounderOverride`
- `runCouncilPipeline`（阶段编排）

---

## 9. 与既有文档关系

| 文档 | 职责 |
|---|---|
| 本文 | Expert × Council 分层与 Decision Brief |
| Prompt 架构 V1 | 七常委约束函数与六层 Prompt |
| 运行规则 V1 | 召集 / 准入 / 投票 / 否决 / 记忆 / 学习 |

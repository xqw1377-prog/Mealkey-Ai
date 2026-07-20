# Founder OS Decision Council Constitution V1.0

> 组织名：**Founder Decision Council（FDC）** · 创始人决策委员会  
> 状态：制度冻结稿，配置与运行时已对齐  
> 真源：`founder-os/constitution/` · `founder-os/operating-rules/` · `packages/agents/src/founder-os/`  
> 前置：`FOUNDER_OS_EXPERT_COUNCIL_COLLABORATION_V1.md`

---

## 一、组织定位

### 核心使命

> 模拟企业董事会与高级管理委员会机制，帮助创始人在复杂、不确定环境下做高质量经营决策。

### 工作原则

**不是替老板做决定**，而是：

> 强迫企业进行高质量思考。

否则七常委只是七个 Prompt。真正壁垒是：**制度 + 流程 + 记忆 + 进化**。

---

## 二、组织结构

```text
                 Founder（最终裁决 / Override）
                    |
          Decision Secretary（CDO · 决策秘书长）
                    |
           Founder Decision Council
    ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
   CSO    CMO    CBO    BMO    CFO    COO    CRO
  战略   市场   品牌   商业   财务   运营   风险
```

- Founder **不是**第八常委。
- CDO **不是**常委：管流程，不参与观点。
- 四大 Expert Engines 在委员会之下，负责专业输入，不投票。

---

## 三、决策秘书长（CDO）

英文：Chief Decision Officer / Decision Secretary  
类比：国务院秘书处 · 董事会秘书 · CEO Office

| 职责 | 内容 |
|---|---|
| 接收议题 | 判断战略 / 商业 / 市场 / 执行属性，定 `decisionLevel` |
| 组建会议 | 按级别选择常委与 Expert Engines |
| 控制流程 | 五阶段推进，禁止 AI 闲聊 |
| 材料组织 | Stage 1 Agenda Brief → 汇总 Expert Report → 压成 Resolution / Memory |

---

## 四、议题分级

| 级别 | 例子 | 参与 |
|---|---|---|
| L1 日常 | 菜单调整 | 仅 Expert Engine，不开常委会 |
| L2 经营 | 增加品类 / 开新店 | 3–4 常委 + 相关引擎 |
| L3 战略 | 进入新城市 | 七常委 + 引擎 |
| L4 生死 | 融资 / 卖公司 / 重大转型 | 七常委 + Founder 最终裁决 |

不是所有问题都开常委会。

---

## 五、一次会议五阶段

1. **议题定义** — CDO 产出 Agenda Brief（主题 / 为何现在 / 目标 / 约束 / 待答问题 / 截止）  
2. **专业输入** — 四大引擎 → Expert Report（研究，不投票）  
3. **常委审议** — 五段结构：判断 / 支持理由 / 反对理由 / 最大风险 / 建议方案  
4. **交叉质询** — 董事会式互怼（最重要）  
5. **形成决议** — Decision Resolution（非简单投票）

---

## 六、双轨表决

```text
第一层 观点投票：一人一票 → support / oppose / conditional → 多数决定
第二层 风险红线：专业否决 → 不得直接通过
```

商业不是民主：6 票支持开店，CFO 现金红线仍可挡住。

---

## 七、Red Flag Protocol

| 红线 | 角色 | 例 |
|---|---|---|
| 财务 | CFO | 现金不足 6 个月 |
| 风险 | CRO | 法律 / 安全 / 品牌危机 |
| 运营 | COO | 无法执行 / 不可复制 |

否决不是结束：**必须提出替代方案**。

---

## 八、Founder Final Decision

```text
委员会建议 → Founder 判断 → 最终决策
```

不同意则填 Founder Override：不同意原因 / 核心判断 / 承担风险 / 验证方式。  
系统事后学习：哪些领域委员会更准，哪些领域创始人直觉更强。

---

## 九、Decision Memory

每次会议沉淀：决策、依据、反对意见、结果、偏差（谁判断正确）。  
形成企业自己的 **Decision Intelligence Database**。  
禁止只用聊天记录当档案。

---

## 十、闭环

```text
企业问题 → CDO 分级与召集 → Expert Engines
  → 七常委审议与质询 → Resolution → Founder 决策
  → 执行验证 → 结果回写 → AI 学习企业
```

这就是企业级 AI 董事会。

运行细则见：`FOUNDER_OS_COUNCIL_OPERATING_RULES_V1.md`。

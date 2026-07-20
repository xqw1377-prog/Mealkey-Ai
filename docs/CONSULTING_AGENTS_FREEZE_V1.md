# 四 Agent 咨询引擎纠偏冻结 · M-PNT 首轮审计

> 冻结日：2026-07-15  
> 原则：**不混层、不虚报、对标顶级咨询机构落地。**

---

## 0. 两层分离（必须冻结）

| 层 | 目标 | 现在做什么 |
|----|------|------------|
| **Founder OS** | 把 AI 无限知识转化为经营者能力 | 暂缓扩张边界 |
| **四专业 Agent** | 达到「小型顶级咨询项目组」水平 | **当前唯一建设焦点** |

```
M-PNT / M-MKT / M-BIZ / M-ED
= 方法论系统 + 知识资产 + 推理流程 + 判断机制 + 交付体系
≠ 泛经营助手 / 聊天报告机
```

对标：

| Agent | 机构对标 | 终稿 |
|-------|----------|------|
| M-PNT | Interbrand / Landor / Bain Brand Strategy | 《品牌定位战略报告》 |
| M-MKT | McKinsey Market Entry / BCG Growth | 《市场机会战略报告》 |
| M-BIZ | McKinsey Strategy / BCG BMI | 《商业模式战略报告》 |
| M-ED | PE Advisory / 融资顾问 | 《股权战略设计报告》 |

每个 Agent 必须具备咨询机构五核：

1. **Discovery** — 先提问，企业访谈系统  
2. **Framework** — 本域咨询框架（非自由发挥）  
3. **Analysis** — 框架驱动分析  
4. **Judgment** — 形成判断，非信息总结  
5. **Deliverable** — 可签字级交付物  

建设顺序：**先逐个审计补齐 → 再联合委员会（Phase 2）。**

---

## 1. M-PNT 总判（诚实）

**未达到顶级品牌咨询流程标准。**

现状定性：

> 带方法论骨架的「一次跑完的 7 步定位决策引擎 + 咨询感 UI」  
> **不是**可持久化、可门禁推进的咨询项目状态机。

文档（约 17 份 M_PNT* V2）把咨询公司流程写得很完整；  
`BrandConsultingState` / `BrandBrief` / `PositionContract` 等在代码里 **基本未落地**。

---

## 2. 对照六阶段审计

| Phase | 顶级标准 | 现状 | 判级 |
|-------|----------|------|------|
| **1 Business Diagnosis** | 企业阶段/品类/产品/用户/竞争/目标 → 品牌战略诊断包 | 有六维诊断链、score-card；缺经营诊断资产与阶段门禁 | 🟡 |
| **2 Category Analysis** | 品类趋势/机会/消费变化/竞争战场 | **相对最实**：workflow 品类步 + knowledge-engine | 🟡→偏✅ |
| **3 Consumer Insight** | JTBD/场景/心智障碍/未满足需求 | 客群画像推断为主；无洞察资产沉淀 | 🟡偏❌ |
| **4 Competitive Positioning** | Positioning Map（可审计空位） | 竞品文案 + 理论卡；**无定位地图对象/可视化** | ❌ |
| **5 Brand Position** | For / who need / is / because 合同句 | 有 oneLiner / statement 近邻；**非标准定位合同** | 🟡偏❌ |
| **6 Brand System + 终稿** | 价值/理念/传播/产品体系 + 《品牌定位战略报告》 | 调性步 + MKDecision；**无 Brand System、无签字级报告包** | ❌ |

### 横切五核

| 能力 | 判级 | 说明 |
|------|------|------|
| Discovery | 🟡 | 页内 4 字段 intake，非顾问式访谈状态机 |
| Framework | 🟡 | 生产 7 步 / 六维 / 文档 6–8 阶段并存，对外无单一六步法 |
| Analysis | 🟡 | 有规则/知识注入；有 Key 时仍偏 LLM 叙述 |
| Judgment | 🟡→✅ | 三理论 Cross-Fire 相对最强 |
| Deliverable | ❌ | 缺可签字《品牌定位战略报告》 |

---

## 3. M-PNT 补齐优先级（下一阶段只干这个）

严格按咨询机构路径补，**不扩新 Agent、不混 Founder OS 能力叙事。**

### P0 — 变成「咨询项目」而不再是「一次跑完」

1. **持久化咨询状态机**：S0→S6（Diagnosis→…→Report），未过门禁不可跳步  
2. **Discovery / BrandBrief**：结构化访谈产出落库，作为全流程输入合同  
3. **标准定位合同句**：For–Who–Is–Because 版本化冻结  

### P1 — 分析资产可审计

4. **Positioning Map** 对象（轴、竞品坐标、空位、证据）  
5. **Consumer Insight** 结构化资产（非仅画像文案）  
6. **Category Decision** 独立交付（战场选择 + 理由 + 否决项）  

### P2 — 交付体系

7. **Brand System** 最小集（价值主张、禁用语、传播主线、产品映射）  
8. **《品牌定位战略报告》** 章节合同 + 版本/签字状态  

---

## 4. 路线冻结

```
Phase 1（现在）
  逐个把 M-PNT → M-MKT → M-BIZ → M-ED
  做到「小型麦肯锡/Interbrand 项目组」水平

Phase 2（之后）
  四席串联 = Founder Strategy Committee
  市场 → 品牌 → 商业模式 → 股权
  输出完整创业/经营战略方案
```

**禁止：** 继续用「四大能力 OS」叙事掩盖四 Agent 咨询深度不足。  
**允许：** Founder OS 作为壳与记忆/会议编排；专业深度必须在四 Agent 内闭环。

---

## 5. 下一步动作

**已进入实施：** `docs/M_PNT_V2_P0_IMPLEMENTATION_DESIGN.md`  
代码内核：`packages/agents/src/m-pnt/consulting/`

P0 只做：StateMachine / BrandBrief / PositioningContract。  
然后：用同一审计表扫 M-MKT / M-BIZ / M-ED。

---

## 6. 纠偏（2026-07-15）

**老板主路径已改冻结**：见 `docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md`。

P0 门禁状态机仍作内部质量控制，但 **不得再作为用户主叙事**。用户必须感知：

```
采集 → 市场调研 → 三顾问出策 → 四方会议 → 策略确认 → 执行路径
```

终稿文档只是步 5 之一，不是唯一价值点。禁止「填很久 → 甩 PDF」作为主体验。

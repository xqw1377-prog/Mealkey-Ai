# M-PNT Brand Strategy Protocol V1.0

> 冻结日：2026-07-17  
> 状态：**权威协议（设计冻结）** — 未授权前禁止按「八阶段重做老板 UX」开工  
> 对标意图：Interbrand / Landor / Trout & Partners 的工作方式（非话术生成）  
> 上位约束：`AUTHORITY.md` · `M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md`（老板主路径）· `FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md`

---

## 0. 裁决（读 GPT V2 后的结论）

| GPT 主张 | 裁决 |
|----------|------|
| M-PNT = AI 原生品牌战略咨询公司，不是定位问答机器人 | **采纳** |
| 目标是「找到战略选择」，不是生成一句定位 | **采纳** |
| 证据链 Claim→Evidence→Reasoning→Choice→Risk | **采纳**（加强现有 Evidence Ledger） |
| 拆成 Diagnosis / Category / Insight / Competition / Positioning / Brand System / Report 能力 | **采纳**（内部 Capability，不是七个独立 Agent 产品） |
| 老板主路径改成 8 个 Phase UI | **否决** — 与已冻结六步冲突；八阶段降为**内核协议阶段** |
| 先冻结协议再改大架构代码 | **采纳** |
| 马上重写 Agent / 重铺状态机 | **否决** — 在现有六步 + 合同/签字闭环上加深 |

**一句话：**  
对外仍是六步咨询交付；对内用本协议的八阶段 Contract + Evidence 把门。  
八阶段是「咨询公司怎么干活」，六步是「老板怎么感知」。

---

## 1. 产品定义（冻结）

### 旧定义（废弃作主叙事）

> 输入企业信息 → 输出品牌定位句

### 新定义

**M-PNT Brand Strategy Engine**

> 帮助企业找到并占据一个长期可赢的消费者心智位置。

核心任务：**做出可签字的战略选择**，不是「创造品牌文案」。

非目标：

- 替老板写广告语
- 无证据的「年轻化/高端化」口号
- 与 M-MKT 抢「是否进入某城/某品类机会」的主责（见边界）

---

## 2. 双层架构（强制）

```text
┌─────────────────────────────────────────────┐
│ 老板主路径（不可改乱序）· 六步价值路径          │
│ INTAKE → RESEARCH → ADVISORS → WAR_ROOM     │
│ → STRATEGY_LOCK → EXECUTION_PATH            │
└───────────────────┬─────────────────────────┘
                    │ 投影 / 合成
┌───────────────────▼─────────────────────────┐
│ 内核协议阶段（本文件）· Phase 0–7             │
│ 每阶段：Input Contract → Evidence → Output  │
│ Artifact → Gate → 下一阶段                   │
└─────────────────────────────────────────────┘
```

| 六步（老板可见） | 内核 Phase（协议） | 主要 Artifact |
|------------------|-------------------|---------------|
| 1 INTAKE | P0 项目启动 + P1 企业诊断（精简） | Brand Challenge Brief · Business Reality Map（轻量） |
| 2 MARKET_RESEARCH | P2 品类 + P3 洞察 + P4 竞争（合成调研包） | Category Map · Human Truth · Positioning Battle Map |
| 3 THREE_ADVISORS | P5 战略选择（三方向提案） | Strategy Options A/B/C |
| 4 WAR_ROOM | P5 Decision 节点 | Founder Decision · 共识陈述 |
| 5 STRATEGY_LOCK | P6 定位系统 + P7 交付（冻结/签字） | Positioning Contract · Brand System · Strategy Book |
| 6 EXECUTION_PATH | P7 落地原则延伸 | Execution Roadmap · Staff Delivery |

**禁止**：把 P0–P7 做成第二条老板进度条。  
**禁止**：为对齐「八阶段」拆掉已接通的签字/证据闭环。

---

## 3. 与 M-MKT / M-BIZ / M-ED 边界（冻结）

| 模块 | 主责问题 | 不负责 |
|------|----------|--------|
| **M-PNT** | 心智中占什么位置、牺牲什么、如何证明 | 城市进入 ROI、单位经济主航道、股权条款 |
| **M-MKT** | 进不进、以什么切口进 | 定位六段合同权威 |
| **M-BIZ** | 90 天主航道（利润/增长/品牌） | 品类心智空位裁决 |
| **M-ED** | 控制权 / 融资 / 激励谁先锁 | 品牌人格与传播主线 |

P2「品类分析」在 M-PNT：**消费者如何理解品类与心智竞争**。  
市场机会大小、进入打法 → M-MKT；可引用 M-MKT 资产，不得重复当主责。

---

## 4. 内核八阶段 Contract

每阶段统一结构：

```text
Input → Work → Evidence Hooks → Output Artifact → Gate → Decision? 
```

### Phase 0 — 项目启动

| 项 | 冻结 |
|----|------|
| 目的 | 定义咨询任务，禁止未定义问题就定位 |
| 输入 | 老板目标意图（赚钱 / 连锁规模 / 资本 / 区域王者 / 个人 IP 等）+ 品类/城市信号 |
| 输出 | **Brand Challenge Brief**（项目名、战略目标、核心挑战一句话） |
| Gate | 有明确「本轮要回答的战略问题」；否则不得进调研确认 |
| 老板触点 | 六步 INTAKE 内完成；不单开 Phase 页 |

### Phase 1 — 企业战略诊断

| 项 | 冻结 |
|----|------|
| 目的 | 判断「有没有资格打这场心智战」 |
| 输入 | Brand Basics / Brief / 资源与约束 |
| 输出 | **Business Reality Map**（优势·劣势·机会·威胁，须可指证据） |
| Gate | 至少 2 条可核实经营事实（非空话优势） |
| 说明 | 不对品牌「好不好」评分；只标战备资格与缺口 |

### Phase 2 — 市场与品类分析（心智品类）

| 项 | 冻结 |
|----|------|
| 目的 | 品类在消费者脑子里如何分层 |
| 输入 | 调研包 + 证据账本（品类柱） |
| 输出 | **Category Map**（层次 / 价格-体验象限 / 推荐战场与否决战场） |
| Gate | 一手或可追溯来源覆盖品类柱；禁止「品类很大」无坐标 |

### Phase 3 — 消费者洞察

| 项 | 冻结 |
|----|------|
| 目的 | 形成 Human Truth，不是人口统计口号 |
| 结构 | 行为 → 隐藏矛盾 → 未满足需求 → 战略机会 |
| 输出 | **Human Truth Card**（四段齐全） |
| Gate | 禁止单独「年轻人喜欢 XX」；须有矛盾句 + 机会句；用户侧事实优先 |

### Phase 4 — 竞争定位分析

| 项 | 冻结 |
|----|------|
| 目的 | 画 Positioning Battle Map |
| 三维 | 品类位置 · 心智位置（想到谁）· 竞争空位 |
| 输出 | **Battle Map** + 空位候选 + 禁入区 |
| Gate | 至少 1 个具名竞品心智句 + 1 个空位主张；可审计 |

### Phase 5 — 品牌战略选择（最高价值）

| 项 | 冻结 |
|----|------|
| 目的 | **选择**，不是再堆分析 |
| 输出 | **Strategy Options ≥3**（各含：主张、优势、风险、牺牲） |
| Decision | 进 WAR_ROOM / Decision Council；创始人拍板前不得锁合同 |
| Gate | 三策必须互斥（不能同时为真）；伪共识 = 失败 |

### Phase 6 — 定位系统设计

| 项 | 冻结 |
|----|------|
| 输出 A | **Positioning Statement**（For / Who / Is / That / Because / Unlike） |
| 输出 B | **Brand System** 最小集（价值主张、传播主线、禁用语、产品映射；使命/人格/空间为可加深层） |
| Gate | 合同 proposed→冻结前须证据覆盖 + 可复述/六步确认背书（已实现路径保留） |

### Phase 7 — 品牌战略交付

| 项 | 冻结 |
|----|------|
| 输出 | **Brand Strategy Book**（可签字 Markdown / 交付包） |
| 章节 Schema | 见 §6 |
| Gate | `evaluateSignOffReadiness` 通过 → 签字 → 正式包；草稿预览可导出但不冒充正式 |

---

## 5. Evidence Protocol（每条战略判断）

任何进入报告或合同的判断，必须可展开为：

```text
Claim
  → Evidence[]（factId / 来源类型 / 强度）
  → Reasoning（为何由证据推出）
  → Strategic Choice（因此选什么）
  → Risk（若选错会怎样）
```

最低覆盖（签字前，与现网 `primaryEvidenceCoverage` 对齐）：

- 用户/洞察 ≥1 核实事实  
- 品类/经营 ≥1  
- 竞争 ≥1  
- 合计核实事实 ≥3  

弱源（纯启发式、无 URL/无店访/无账本）**不得**单独过 P2–P4 合成确认。

---

## 6. Brand Strategy Book Schema（P7）

正式交付包至少包含：

1. 战略背景（Challenge Brief + Reality Map 摘要）  
2. 市场与品类（Category Map）  
3. 消费者洞察（Human Truth）  
4. 竞争分析（Battle Map）  
5. 定位战略（Options 摘要 + 选定陈述）  
6. 品牌系统（Brand System 最小集）  
7. 产品 / 体验建议（映射 Because）  
8. 落地原则（90 天路径 + 杀出线）  
附录 A：一手证据账本  

与现网 `buildStrategyReport` / `buildSignOffPackageMarkdown` **对齐加深**，不另起第三套报告生成器。

---

## 7. Capability 拆分（Agent OS，非七个产品）

```text
M-PNT
├── DiagnosisCapability        → P0–P1
├── CategoryAnalysisCapability → P2
├── ConsumerInsightCapability  → P3
├── CompetitionMappingCapability → P4
├── PositioningStrategyCapability → P5–P6（含三理论矩阵）
├── BrandSystemCapability      → P6
└── ReportCapability           → P7
```

规则：

- Capability = 可测试纯函数 / 服务单元 + Contract  
- **不是**七个独立计费 Agent、不是七个导航入口  
- 三理论矩阵仍挂在 PositioningStrategyCapability 之下  

---

## 8. 决策节点（必须有人拍板）

| 节点 | 谁 | 未通过则 |
|------|-----|----------|
| D1 战略问题确认 | 创始人 | 不得确认调研 |
| D2 战场/空位倾向 | 创始人（可默认推荐） | 不得进三策定稿 |
| D3 三策拍板 | 创始人（WAR_ROOM） | 不得冻结合同 |
| D4 策略报告确认 | 创始人 | 不得进签字 |
| D5 正式签字 | 创始人 | 不得导出「正式」包 |

系统可提议，**不可**代替 D3–D5。

---

## 9. 成熟度目标（诚实口径）

| 项 | 现在 | 本协议目标（不宣称已达成） |
|----|------|---------------------------|
| 流程形态 | 六步 + 合同/签字闭环（L3+） | 保持 |
| 洞察厚度 | Human Truth 结构弱 | P3 结构化门禁 |
| 战略选择感 | 三策有，选项叙事可加强 | P5 Options 卡片化 |
| 品类地图 | 有分析资产，象限表达弱 | P2 Category Map 可视化契约 |
| 证据 | 账本+签字门禁已接 | 全 Phase 判断可展开五段链 |
| 等级自称 | 禁止对外写「已是 L4」 | 能力达标后再标 |

---

## 10. 实施顺序（协议冻结后）

**协议加深（2026-07-17 已落地，不大拆 UX）：**

1. P0 Brand Challenge Brief — ✅ 挂到 INTAKE 编译 / 六步可见  
2. P3 Human Truth — ✅ 洞察强制四段 + 调研面板展示  
3. P5 Options — ✅ 三顾问映射 Option A/B/C 卡片  
4. P7 Schema — 签字包已有；章节对齐可继续加深  
5. 证据五段链 — 账本+签字门禁已有；Claim 展开可继续加深  

**明确不做（本协议周期）：**

- 重做八阶段老板 UX / 废弃六步  
- 新建平行 Python 主路径  
- 先堆知识库文章替代 Contract  

**并行产品线（席位合同闭环）：**

- M-BIZ Mode Contract：**已落地**  
- M-MKT Entry Contract：**已落地**  
- M-ED Governance Contract：**已落地**  

---

## 11. 文档关系

| 文档 | 角色 |
|------|------|
| **本文件** | 内核咨询协议 + Evidence/Decision/Report Schema |
| `M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md` | 老板主路径 UX（更高优先级冲突时以它为准） |
| `M_PNT_CONSULTING_DATA_CONTRACT_V2.md` | 资产字段细节（服从本协议阶段门禁） |
| `M_PNT_V2_FOUNDER_OS_ENGINEERING_FOCUS.md` | 工程三刀；不推翻本协议 |

冲突时：

1. 六步价值路径（老板感知）  
2. 本协议（内核 Contract）  
3. 其余设计稿  

---

## 12. 冻结声明

自本文件起：

- GPT《八阶段重构》中的**定义、证据、能力拆分、先协议后代码**生效。  
- 「用八阶段替换六步主 UI」**不生效**。  
- 未修订本文件版本号前，不得以「全球顶级咨询重构」为名开大型状态机重写 PR。  

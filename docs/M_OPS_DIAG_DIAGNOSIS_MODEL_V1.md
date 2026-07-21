# 餐厅经营诊断系统 V1 · 诊断模型设计（冻结）

> **版本：** V1.1  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_UX_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `EVIDENCE_CHAIN_PROTOCOL_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md`  
> **代码 SSOT：** `packages/m-ops-diag/src/contracts.ts` · `engine.ts`  
> **冲突裁决：** 推理规则以本文为准；能力边界以 Architecture 为准；采集以 Data Collection 为准；页面以 UX 为准  

---

## 0. 一句话（冻结）

> GPT 是回答问题；MealKey 是发现问题。  
> 诊断模型不是生成建议，而是形成 **可核验的经营诊断**，再投影为 Improvement Signal / Decision Support。

数据采集解决「是谁、发生了什么」。  
本层解决「为什么发生、哪里有问题、什么最值得改变」。

输出必须分清：**事实 → 推断 → 诊断 → 关注建议**，禁止混淆。

---

## 1. 核心定位（冻结）

### 1.1 普通 GPT

```text
用户问题 → 语言模型 → 建议
```

缺陷：无经营背景 · 无证据 · 无优先级 · 无验证。

### 1.2 餐启经营诊断

```text
Restaurant Identity
        ↓
Business Facts
        ↓
External Evidence
        ↓
Pattern Recognition
        ↓
Root Cause Analysis（Diagnosis）
        ↓
Business Diagnosis
        ↓
Improvement Signal
        ↓
Decision Support（非拍板）
```

### 1.3 壁垒对照

| 普通 GPT | 餐启经营诊断 |
|----------|--------------|
| 回答问题 | **发现问题** |
| 行业常识句 | **锚点句**（店型×区位×客单×证据） |
| 一上来给方案 | 先走完整推理链 |
| 混用事实与猜测 | 分层标注 + 置信度 |
| 一次报告 | **历史诊断 + 日扫增量** |

**禁止（V1）：** 战略终局句 · 无证据数字/星级/家数 · 假评分排行 · 诊断页拍板。

---

## 2. Restaurant Health Model（冻结）

不是简单总分。是 **六大经营系统** 的健康观察面：

```text
                 Restaurant Health

    客户系统       产品系统       运营系统
       ↓             ↓             ↓
    品牌系统       财务系统       增长系统
```

| 系统 | 对应引擎 | V1 深度 |
|------|----------|---------|
| 客户 | Customer Insight | **MVP 打穿** |
| 产品 | Product | 骨架→竖切 |
| 运营 | Operation（含原 Service 主题） | MVP 主题竖切（等待/交付） |
| 品牌 | Brand Position | 骨架；接 M-PNT 落差 |
| 财务 | 挂 Operation「钱」瓶颈 + gaps | **V1 不假造报表诊断** |
| 增长 | Growth | 机会信号合成 |

健康模型 **禁止** 输出 0–100 假总分（见 UX）。可输出分系统 strength / risk / confidence。

---

## 3. 核心推理链（最重要 · 冻结）

所有输出必须经过：

```text
Evidence → Finding → Pattern → Diagnosis → Signal
```

### 3.1 全链示例

| 层 | 内容 |
|----|------|
| **Evidence** | 近90天点评：服务慢相关评论 +35%（有源） |
| **Finding** | 服务体验相关负向提及上升 |
| **Pattern** | 高峰期承载不足 |
| **Diagnosis** | 增长瓶颈更可能来自运营能力，而非产品吸引力 |
| **Signal** | 需关注高峰服务流程（→ 今日 / 可进决策室话题） |

这条链是 MealKey 相对 ChatGPT 的核心资产。

### 3.2 与代码映射

| 模型层 | 代码 / 出口 |
|--------|-------------|
| Evidence | `DiagnosisEvidenceItem` + Evidence Card |
| Finding | `DiagnosisFinding.observation` |
| Pattern | `DiagnosisFinding.pattern` |
| Diagnosis | `DiagnosisFinding.meaning`（诊断结论句）；完整卡见 §7 |
| Signal | `DiagnosisSignal`（P0 → 今日） |
| Decision Support | `DiagnosisInsight`（P1 → 决策室，非拍板） |

### 3.3 各层定义

#### Evidence

归一输入（见 Data Collection）：

```typescript
{ id?, source, claim, sentiment?, theme?, observedAt?, url? }
```

硬规则：权重折算 · AI 推测不得单独成 Finding · 无证据只 `gaps` · 首页 Signal 证据链 ≥2（`EVIDENCE_CHAIN_PROTOCOL_V1`）。

#### Finding

可复核「看见了什么」。合格例：有样本/锚点的主题变化；不合格：「服务不好」。

#### Pattern

跨证据稳定结构：「这像什么问题」。允许「可能/正在」，必须挂 ≥1 Finding。

#### Diagnosis（诊断）

根因级经营判断：「为什么发生 / 瓶颈在哪一类系统」。

| 合格 | 不合格 |
|------|--------|
| 增长瓶颈来自运营承载，而非产品吸引力 | 建议加强培训提升服务 |
| 消费者认知=朋友聚会，与定位「家庭」存在偏差 | 应该全面品牌升级 |

Diagnosis **仍不是** 战略方案；只定位问题所属系统与方向。

#### Signal

Improvement Signal：对齐 Business Signal 五层  
`observation → pattern → meaning → impact → watchHint`  
引擎 **不** 创建 MKDecision；Promote 走既有 Gate。

---

## 4. 六大诊断引擎（冻结）

V1 架构冻结六引擎；**MVP：Customer + Operation（服务/等待主题）打穿**；其余骨架诚实 `gaps`，禁假 LIVE。

统一接口：

```text
Input:  Identity + Facts + EvidenceCards + horizon + focus
Output: Finding[] → Pattern → Diagnosis → (可选 Signal 草案) + gaps[]
Side-effect: 无
```

命名对齐（相对 V1.0）：`Service` ⊂ `Operation`；`Brand Perception` → `Brand Position`；`Growth Opportunity` → `Growth`。

### 4.1 Customer Insight Engine

> 顾客为什么来？为什么不来？

输入：点评 / 小红书 / 抖音 / 用户反馈。

| 分析面 | 输出 |
|--------|------|
| 选择理由 | 高频心智词 → 核心认知一句 |
| 流失原因 | 差评聚类 → **归因到模式**（非「服务不好」） |

归因范式：

```text
❌ 服务不好
✅ 高峰期服务承载能力不足
```

Customer Diagnosis 形状：

```json
{
  "strength": "场景体验强",
  "risk": "服务效率限制复购",
  "confidence": 0.86
}
```

`customerLens.theyThink` 必须来自真实 claim，禁编造金句。  
**MVP：** `engine.ts` → `analyzeConsumerFeedback`。

### 4.2 Product Engine

> 你的产品为什么赢 / 哪里拖累？

菜品结构观察（有证据才写）：

| 类型 | 含义 |
|------|------|
| 招牌 | 老板自述 + 外感点名 |
| 引流 | 高提及、偏转化 |
| 利润 | 需毛利 Fact；V1 常为 gap |
| 记忆 | 评论反复点名形成单品心智 |

例：销售与评论双高「小炒黄牛肉」→ 优势=单品心智；机会=围绕单品加固记忆（机会信号，非战略书）。

### 4.3 Competition Engine

> 你在竞争中的位置？

输入：地图 · 点评 · 竞品价格 · 评论。建立 **竞争地图**（价格 × 体验 等二维，有源才画）。

合法输出例：

```text
空位：50–80 元家庭湘菜；体验相对领先；附近暂无强品牌占位（有地图/竞品证据）
```

无源 → 禁「市场竞争激烈」；只 `gaps`。

### 4.4 Operation Engine

> 经营机器哪里卡住？（原 Service 主题并入本引擎）

五大瓶颈：

| 维 | 观察 |
|----|------|
| 人 | 服务 / 厨房 / 店长 |
| 货 | SKU / 毛利（缺数据→gap） |
| 场 | 动线 / 翻台 |
| 客 | 到店 / 复购 |
| 钱 | 成本结构（V1 慎写，无 POS 不装懂） |

诊断范式：

```text
发现：营业额下降未必是客流减少
而是：高峰接待能力不足
（损失桌数：仅当有可核验模型/数据时写；否则定性 + gap）
```

代码 `focus: "service"` 映射本引擎服务主题。

### 4.5 Brand Position Engine

> 现在距离「要成为的品牌」差多少？

与 M-PNT 分工（冻结）：

```text
M-PNT     → 我要成为什么品牌（战略意图）
经营诊断  → 现在距离目标差多少（现实落差）
```

例：定位=家庭聚餐湘菜；外感认知=朋友聚会 → **定位偏差** → 机会信号「强化家庭场景」（非重做品牌全书）。

### 4.6 Growth Engine

> 下一步哪里有增长空间？

增长分解：

```text
新客 × 转化 × 复购 × 客单
```

例：收藏高、到店弱 → 更可能是曝光转化问题，而非产品本身 → Signal：关注线上入口转化（关注项，非营销战役终局）。

合成规则：

```text
Opportunity ≈
  强正向记忆（Customer/Brand）
  − 未吸收的战略目标/最大问题（Fact）
  − 竞品同质化点（有 Competition 证据时）
```

---

## 5. 诊断优先级 · Business Impact Score（冻结）

不能一次甩 10 个问题。老板只关心：**哪个最重要？**

```text
Impact =
  影响范围
  × 发生概率
  × 改善价值
  × 证据强度
```

各因子 V1 可用 1–5 离散星，再归一到排序键；与 §6 confidence 联动（证据强度 ≈ 来源权重 × 样本量档）。

| 用途 | 规则 |
|------|------|
| 今日主位 | Impact 最高且 confidence≥0.45 的 1 条风险或机会 |
| 诊断卡 | 优先展示 Top-1 风险 + Top-1 机会 |
| 其余 | 折叠 / 次级列表，禁止并列恐吓 |

Severity（HIGH/MEDIUM/LOW）由 Impact 档位映射；CRITICAL 默认不发（无硬安全/POS 事实时）。

---

## 6. 置信度（冻结）

```text
confidence ≈
  clip(
    0.35
    + 0.08 × 支撑证据条数（封顶 +0.32）
    + 0.15 × 最高来源权重贡献
    + 0.10 ×（有 Identity 锚点交叉 ? 1 : 0）
    − 0.12 ×（样本 < 5 ? 1 : 0）
  , 0.2, 0.9)
```

- `< 0.45`：可进 findings，默认不上今日主位  
- AI 推测（权重 0.3）：**不得**把 confidence 抬过 0.55  

---

## 7. 诊断结果交互 · 经营诊断卡（冻结）

**不要输出长报告。** 输出诊断卡（对齐 UX）：

```text
🔴 当前最大经营风险
服务体验正在限制增长

为什么（Evidence / Finding）：
· 服务相关负评 +35%（有源）
· 高峰等待关键词增加

可能原因（Pattern → Diagnosis）：
厨房产能与客流峰值不匹配（推断须标注）

影响：
可能损失复购

建议进入：
「服务效率改善」决策话题（→ 决策室，本页不拍板）
```

同理可出 **最大增长机会** 卡。禁战略方案正文。

---

## 8. 与每日扫描的关系（冻结）

每天 **不是** 重新写一份诊断散文：

```text
历史诊断模型（Restaurant Health 快照）
        +
今日变化（Δ Evidence / 竞争 / 品牌 / 经营）
        ↓
新的经营信号（增量）
```

例：昨日服务平稳；今日突发等待类评论簇 → 推送「服务体验风险正在增加」。无变化 → 保留昨日摘要，禁每日换鸡汤。

---

## 9. V1 诊断能力边界（冻结）

不追求「万能经营顾问」。只保证 **6 个高价值判断**：

1. 顾客为什么喜欢你  
2. 顾客为什么离开你  
3. 你的竞争位置  
4. 当前最大经营风险  
5. 最大增长机会  
6. 下一步最值得验证什么（→ `gaps` / unknowns）  

超出范围：财务精算、多店扩张战略、完整品牌重塑 —— **不做或显式 gap**。

---

## 10. 反「泛泛建议」闸门（冻结）

| # | 闸门 | 失败动作 |
|---|------|----------|
| G1 | 每条 Finding ≥1 Evidence/Fact | 丢弃 |
| G2 | 含可核验锚或显式 gap | 改写/降级 |
| G3 | 事实 / 推断 / 关注建议分层 | 拆分 |
| G4 | 禁词：全面升级、打造爆款、降本增效、赋能…（无证据） | 拦截 |
| G5 | 诊断页无拍板；watchHint 无「请批准」 | 删改 |
| G6 | 数字必须有源 | 删数字或改定性 |
| G7 | 必须能指出所属 Health 系统（客户/产品/运营/品牌/财务/增长） | 补全或丢弃 |
| G8 | Top 问题必须有 Impact 排序依据 | 不得并列堆砌 |

```text
合格：近窗负面约 40% 在等待 → Pattern=高峰交付不足 → Diagnosis=运营瓶颈 → Signal=盯高峰流程
不合格：餐饮要重视体验，建议加强员工培训
```

---

## 11. 与 MealKey 总系统关系（冻结）

```text
餐厅经营诊断 Agent（m-ops-diag）

输入：Restaurant Brain + M-INTEL（Evidence）
输出：Business Signal + Vertical Insight
        ↓
Today's Cockpit（今日）
        ↓
Decision Room（拍板唯一场）
        ↓
M-EXEC
        ↓
Learning → Brain
```

闭环：

```text
数据采集 → 经营认知 → 诊断判断 → 每日扫描 → 决策升级 → 执行验证
```

---

## 12. Identity / Fact 交叉（冻结）

| Fact | Evidence | 合法推断 |
|------|----------|----------|
| 客单·家庭定位 | 「适合带娃」 | 场景同向 |
| 营业下降 | 等待负评升 | 体验瓶颈可能放大下滑（标注推断） |
| 最大问题=翻台慢 | 等待主题 | 同向 → 提高 confidence |
| 目标=提高利润 | 仅环境好评 | 不自动涨价；gap 成本事实 |

「如果只能改一件事」→ Decision DNA；可影响 Impact 排序，**不**直接当 Signal 标题。

---

## 13. MVP 工程切片

| 切片 | 状态 |
|------|------|
| Customer + Operation（等待主题） | ✅ `diagnoseRestaurantSync` |
| 空证据 → gaps | ✅ |
| Diagnosis 层语义（meaning=诊断句） | ⏳ 文案对齐本文 |
| Impact Score 排序 | ⏳ |
| Product / Competition / Brand / Growth 骨架 | ⏳ 诚实 gaps |
| 日扫 = 历史模型 + Δ | ⏳ |
| G1–G8 单测 | ⏳ |
| 六引擎目录 `engines/` | ⏳ Architecture 目标树 |

---

## 14. 验收标准（冻结）

老板应感到：

1. 说的是我的店  
2. 说的是可核对现象  
3. 有 Diagnosis（根因方向），不是鸡汤  
4. 知道 Top-1 风险/机会  
5. 知道缺什么、今天盯什么  

不达标 = 禁止用更长 Prompt 掩盖。

---

## 15. 下一步（冻结）

诊断模型（判断「像顾问」）已收口。  
生态接入契约已另冻：`MEALKEY_AGENT_PROTOCOL_V1.md`（m-ops-diag = 首个合规样板）。

经营诊断产品线下一刀：

# 《餐厅经营诊断系统 V1 AI 推理架构设计》

须覆盖：规则 vs 模型 · 多阶段链 · 稳定性 · 专家感非聊天感。  
完成后加深引擎竖切与 UX 五页落地。

---

## 16. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-21 | 初冻：六引擎 · E→F→P→S · 闸门 · 日扫 |
| V1.1 | 2026-07-21 | 升格：Health Model · Diagnosis 层 · Operation/Brand Position · Impact Score · 诊断卡 · 六判断 · 下一刀=AI 推理架构 |

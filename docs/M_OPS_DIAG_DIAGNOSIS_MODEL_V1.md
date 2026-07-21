# 餐厅经营诊断系统 V1 · 诊断模型设计（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_UX_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `EVIDENCE_CHAIN_PROTOCOL_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md` · `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md`  
> **代码 SSOT：** `packages/m-ops-diag/src/contracts.ts` · `engine.ts`  
> **冲突裁决：** 推理规则以本文为准；能力边界以 Architecture 为准；采集以 Data Collection 为准；页面以 UX 为准  

---

## 0. 一句话（冻结）

> MealKey 与 ChatGPT 的根本区别：**不是更会写建议，而是能从可核验证据推出「这家店此刻最该盯的经营信号」。**

诊断模型 = 顾问式判断的算法骨架。  
输出必须分清：**事实 → 推断 → 建议（仅关注提示）**，禁止混淆。

---

## 1. 壁垒定义（冻结）

| 普通 GPT | 餐启经营诊断 |
|----------|--------------|
| 行业常识句 | **锚点句**（店型×区位×客单×证据） |
| 一上来给方案 | 先 **Finding → Pattern → Signal** |
| 混用事实与猜测 | 每层标注来源与置信度 |
| 泛建议「加强服务」 | **可复核的观察 + 模式 + 影响面** |
| 一次性报告 | **日扫增量**（变化才出新信号） |

**禁止输出形态（V1）：**

- ❌ 「建议你做品牌升级 / 开第二家」类战略终局  
- ❌ 无证据的百分比、星级、竞争家数  
- ❌ 假评分 / 假排行（见 UX 六观察面）  
- ❌ 诊断页直接拍板文案  

---

## 2. 推理总链（冻结）

```text
Identity + Business Facts          ← 锚点（Layer 1/2）
        +
Evidence Cards（加权）             ← 外感（Layer 3）
        │
        ▼
   ┌────────────────────┐
   │  六大诊断引擎并行    │  （各引擎只读，不写 Brain）
   └─────────┬──────────┘
             ▼
        Finding（L1）     可核验的发现
             ▼
        Pattern（L2）     跨证据的模式
             ▼
        Meaning / Impact  经营含义与影响面
             ▼
        Signal（L3）      → 今日 / 雷达（P0）
             │
             └─► Insight Draft → 决策室（P1，非拍板）
```

映射代码：

| 模型层 | 字段 |
|--------|------|
| Finding | `DiagnosisFinding.observation` |
| Pattern | `DiagnosisFinding.pattern` |
| Meaning | `DiagnosisFinding.meaning` |
| Signal | `DiagnosisSignal`（五层语义对齐 BusinessSignal） |
| Insight | `DiagnosisInsight`（VerticalInsight 草稿） |

---

## 3. Evidence → Finding → Pattern → Signal（算法结构）

### 3.1 Evidence（输入原子）

来自数据采集架构的 **Evidence Card**，进入引擎前归一为：

```typescript
DiagnosisEvidenceItem = {
  id?, source, claim,
  sentiment?, theme?, observedAt?, url?
}
```

**硬规则：**

1. `weight` 按 Data Collection 权重表折算置信度贡献（老板事实 1.0 · 消费者评价 0.9 · 社媒 0.7 · AI 推测 0.3）  
2. AI 推测 **不得单独** 生成 Finding；最多作为 Pattern 的辅助步  
3. 无 Evidence 且无关键 Fact → 只产出 `gaps`，**禁止假 LIVE 信号**  
4. 证据链须服从 `EVIDENCE_CHAIN_PROTOCOL_V1`：进首页的 Signal 至少 2 步，且不得纯推理  

### 3.2 Finding（发现）

**定义：** 一句话可复核陈述，回答「看见了什么」。

| 合格 | 不合格 |
|------|--------|
| 近 30 天差评中「等待」相关提及占比上升（样本 N=…） | 服务不好 |
| 500m 内同价位湘菜可核验门店 = 17（有地图证据） | 竞争激烈 |

**生成条件（任一）：**

- 同主题证据 ≥ 阈值（V1 默认：负面主题 ≥ 2，或占比 ≥ 25% 且样本 ≥ 5）  
- 日扫相对基线出现显著变化（见 §6）  
- Identity 锚点 + 外感交叉（例：客单区间与评价「贵」主题共振）  

**禁止：** 把老板一句话愿望直接写成 Finding（那是 Fact / Decision DNA，不是发现）。

### 3.3 Pattern（模式）

**定义：** 跨多条 Evidence / Fact 的稳定结构，回答「这像什么问题」。

模板：

```text
[时间窗] + [主题聚类] + [强度/方向] + [与锚点的关系]
```

例：

```text
晚市高峰窗口内，等待/上菜类负评聚类增强；
与老板自述「最大问题=翻台慢」同向，但尚未有 POS 翻台事实核验。
```

Pattern **允许** 使用推断动词（「可能」「正在」），但必须挂至少 1 条 Finding。

### 3.4 Meaning / Impact

| 字段 | 回答 |
|------|------|
| Meaning | 对这家店意味着什么（顾客记忆 / 复购 / 口碑扩散） |
| Impact | 不处理时的经营影响面（仍非战略方案） |

禁止在此层写「你应该开分店 / 改定位」。

### 3.5 Signal（经营信号）

对齐 Business Signal 五层：

```text
observation → pattern → meaning → impact → watchHint
```

| Signal 字段 | 约束 |
|-------------|------|
| `type` | CUSTOMER / OPERATION / COMPETITION / BRAND / MARKET |
| `severity` | 见 §5 分级表 |
| `title` | ≤12 字，风险/机会名词，禁「全面升级」 |
| `watchHint` | 仅关注建议；禁拍板句 |
| `evidence` | ≥1 条可展示事实；首页展示另需证据链 ≥2 |
| `decisionTopic` | 可选「若进决策室该讨论什么」——**不是**已拍板方案 |

**Promote 规则：** Signal → Case / 决策室，服从既有 Promote Gate；诊断引擎本身 **不** 创建 MKDecision。

---

## 4. 六大诊断引擎（推理契约）

V1 **六引擎架构冻结**；**MVP 实现打穿 Customer（+ Service 主题）**，其余骨架可返回 `gaps` / 空 findings，**禁止假数据充 LIVE**。

每个引擎统一接口（逻辑契约）：

```text
Input:  Identity + Facts + EvidenceCards + horizon + focus
Output: Finding[] + (可选) Pattern 草案 + gaps[]
Side-effect: 无（不写 Brain / 不写 Decision）
```

### 4.1 Customer Insight Engine

**问题：** 顾客到底怎么看你的店？

| 输入焦点 | 输出 |
|----------|------|
| 点评/小红书/抖音评论主题与情绪 | `positiveMemory` / `negativeMemory` |
| 心智关键词 | 顾客声音墙素材 |
| 矛盾对 | 例：产品强 × 服务弱 |

**推理要点：**

1. 主题聚类（等待 / 口味 / 环境 / 价格 / 场景）  
2. 正负记忆不对称时，优先标 **核心矛盾**  
3. `customerLens.theyThink` 必须来自真实 claim 摘要，禁编造金句  

**MVP：** 当前 `engine.ts` 的 `analyzeConsumerFeedback` 即本引擎竖切。

### 4.2 Product Engine

**问题：** 什么留下顾客，什么拖累经营？

| Finding 方向 | 证据 |
|--------------|------|
| 招牌提及率 | 评论/笔记点名菜品 |
| 差评菜集中 | 同菜名负向聚类 |
| 性价比张力 | 「贵/份量」主题 × 客单区间 Fact |

V1 骨架：无菜品级证据 → `gaps: product_menu_evidence`。

### 4.3 Service Engine

**问题：** 服务有没有在拖增长？

| Finding 方向 | 证据 |
|--------------|------|
| 等待/上菜 | WAIT 主题 |
| 态度 | 服务态度关键词 |
| 高峰压力 | 时段标签 + 等待主题共现 |

可与 Customer 共享主题抽取；Service 强调 **交付能力 vs 期待**。

### 4.4 Brand Perception Engine

**问题：** 顾客脑中有没有稳定记忆？别人为什么选你？

| Finding 方向 | 证据 |
|--------------|------|
| 心智词 | 小红书/抖音描述「适合…」「必吃…」 |
| 场景标签 | 约会 / 家庭 / 商务 |
| 记忆空白 | 有流量无稳定关键词 → gap 或弱信号 |

输出进「市场怎么看你 / 品牌心智地图」，**不是**品牌战略书。

### 4.5 Competition Engine

**问题：** 你在市场里的位置？

| Finding 方向 | 证据 |
|--------------|------|
| 空间密度 | 地图同品类/同价位数量（有源才写数） |
| 相对口碑 | 本店 vs 可核验竞品星级/主题（有源才比） |
| 新店冲击 | 日扫「新竞品出现」 |

无地图/竞品证据 → 禁止「市场竞争激烈」类空话；只 `gaps`。

### 4.6 Growth Opportunity Engine

**问题：** 下一步增长机会在哪里？（机会信号，非战略终局）

**合成规则（冻结）：**

```text
Opportunity Signal =
  强正向记忆主题（Customer/Brand）
  − 未被经营目标吸收的缺口（Fact.战略目标 / 最大问题）
  − 未与竞品同质化的差异点（Competition 有证据时）
```

例（合格）：

> 环境体验被稳定正向提及，家庭聚餐场景词增多 → **机会信号**：巩固「家庭聚餐场景」心智（关注项，非「立刻改定位」）。

例（不合格）：

> 建议全面品牌升级并开启多店扩张。

---

## 5. 置信度与严重度（冻结）

### 5.1 Confidence

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

- `confidence < 0.45`：可进 findings，默认不上今日主位  
- AI 推测权重 0.3：**不得**把 confidence 抬过 0.55  

### 5.2 Severity

| 级别 | 条件（满足其一） |
|------|------------------|
| CRITICAL | V1 **默认不发**（无 POS/安全类硬事实时禁止） |
| HIGH | 负向主题占比高或条数≥3，且影响复购/口碑；或日扫突变 |
| MEDIUM | 有清晰 Pattern，样本中等 |
| LOW | 弱信号 / 样本不足但仍可观察 |

与 Risk Runtime CRITICAL 语义隔离：诊断 HIGH ≠ 企业风险 CRITICAL。

---

## 6. 日扫推理（变化优先）

每日扫描不是重跑全量散文报告，而是：

```text
ΔEvidence / ΔMarket / ΔBrand / ΔOps
    → 仅对变化主题跑引擎
    → 生成 Daily Signals（增量）
```

| 变化类型 | 信号倾向 |
|----------|----------|
| 新差评主题涌现 | CUSTOMER / OPERATION |
| 竞品新店 / 活动 | COMPETITION |
| 传播热度突变 | BRAND |
| 经营 Fact 异常（有数据时） | OPERATION |

无变化 → 可保留昨日信号摘要，**禁止**每日换一套空话。

---

## 7. 反「泛泛建议」闸门（冻结）

输出前必须通过：

| # | 闸门 | 失败动作 |
|---|------|----------|
| G1 | 每条 Finding 可指向 ≥1 Evidence 或 Fact | 丢弃 |
| G2 | 句子含可核验锚（店/区/主题/样本）或显式 gap | 改写或降级 |
| G3 | 分层标注：事实 / 推断 / 关注建议 | 拆分 |
| G4 | 禁词表：全面升级、打造爆款、降本增效、赋能…（无证据时） | 拦截 |
| G5 | 诊断页无拍板 CTA；watchHint 不含「请批准」 | 删改 |
| G6 | 数字必须有源；无源用定性或 gaps | 删除数字 |

**顾问感来自结构，不来自口吻：**

```text
合格：「近窗负面中约 40% 集中在等待；模式=高峰交付不足；影响=复购与差评扩散。」
不合格：「餐饮行业要重视顾客体验，建议加强员工培训。」
```

---

## 8. 与 Identity / Fact 的交叉推理

无锚点禁止行业空话（Data Collection §1）。交叉示例：

| Fact | Evidence | 合法推断 |
|------|----------|----------|
| 客单 80–100 · 家庭聚餐 | 「适合带娃」「环境好」 | 场景心智与目标客群同向 |
| 营业状态=下降 | 等待负评上升 | 体验瓶颈可能放大下滑（推断，需标注） |
| 最大问题=「翻台慢」 | 等待主题 | 老板判断与外感同向 → 提高 confidence |
| 战略目标=提高利润 | 仅有环境好评 | **不**自动推出涨价方案；最多 gap「缺成本/毛利事实」 |

老板「如果只能改一件事」→ 写入 Decision DNA / Fact，**不**直接变成 Signal 标题；可用于排序关注项。

---

## 9. 输出到产品面的投影

| 出口 | 消费方 | 内容 |
|------|--------|------|
| P0 Signal | 今日雷达 / Daily Signals | severity · title · 五层 · evidence |
| P1 Insight | 决策室 VerticalInsight | question · finding · reasoning · unknowns |
| UX 画像 | First Moment | customerLens + 机会/风险一句话（有证据才写） |
| gaps | 采集引导 / 诚实空态 | 缺什么证据，下一步采什么 |

引擎 **只读** Brain；写回由 Host（日扫 / RIP / Memory）按既有协议执行。

---

## 10. MVP 实现切片（工程对齐）

| 切片 | 状态目标 |
|------|----------|
| Customer + Service 主题竖切 | ✅ 已有 `diagnoseRestaurantSync` |
| Evidence 空 → gaps，无假信号 | ✅ |
| Product / Brand / Competition / Growth 骨架 | ⏳ 返回 gaps，禁假 LIVE |
| 日扫 Δ 主题 | ⏳ 接 Data Collection 日扫四域 |
| G1–G6 闸门单测 | ⏳ |
| 六引擎目录迁入 `engines/` | ⏳ 服从 Architecture 目标树 |

---

## 11. 验收标准（冻结）

同一家店、同一批 Evidence，诊断结果应让老板感到：

1. **说的是我的店**（有锚点）  
2. **说的是可核对的现象**（有 Finding）  
3. **不是鸡汤**（过 G4）  
4. **知道缺什么**（有 gaps）  
5. **知道今天盯什么**（有 Signal，无拍板压迫）  

不达标 = 模型未通过，禁止用更长 Prompt 掩盖。

---

## 12. 下一步（冻结）

模型已冻结。工程与产品落地顺序：

1. 按本文加深六引擎（先骨架诚实，再竖切 Product/Competition）  
2. 接入日扫 Δ + Evidence Card 权重  
3. 按 UX 五页落地前端（First Moment → 画像 → 声音墙 → 观察面 → 今日扫描卡）  
4. package 目录演进至 Architecture §9 目标树  

**不再开新的产品叙事专题**，直到上述竖切可演示。

---

## 13. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 Diagnosis Model Freeze | 2026-07-21 | 六引擎推理契约 · E→F→P→S · 置信/严重度 · 反泛建议闸门 · 日扫变化优先 |

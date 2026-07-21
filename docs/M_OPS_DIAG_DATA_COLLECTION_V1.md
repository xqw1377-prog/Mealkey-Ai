# 餐厅经营诊断系统 V1 · 数据采集架构设计（冻结）

> **版本：** V1.0  
> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_UX_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `MEALKEY_M_INTEL_V1.md` · `MEALKEY_RESTAURANT_BRAIN_V1.md` · `EVIDENCE_CHAIN_PROTOCOL_V1.md` · `BUSINESS_SIGNAL_ENGINE_V1.md`  
> **冲突裁决：** 采集范围与权重以本文为准；能力边界以 Architecture 为准；页面流程以 UX 为准  

---

## 0. 一句话（冻结）

> 餐厅经营诊断系统不是「用户填资料 → AI 写报告」，而是 **最少主动采集 + 最大外部感知 + 持续经营学习**，持续建立餐厅认知。

诊断能力上限 = 三类信息融合质量。

---

## 1. 核心原则（冻结）

```text
                Restaurant Diagnosis

        Business Identity
              │
       用户主动提供事实（最少）
              │
              ▼
        Restaurant Brain  ←── 外部经营环境感知
              ▲                      ▲
              │                      │
              │               M-INTEL Data Engine
              │                      │
              └──────────► Diagnosis Engine
                                 │
                                 ▼
                          Business Signal
```

| 原则 | 含义 |
|------|------|
| **最少主动采集** | 老板 ≤60s（见 UX）；不逼填报表 |
| **最大外部感知** | 点评/小红书/抖音/地图 → Evidence |
| **持续经营学习** | 每日扫描变化，不是一次性报告 |
| **锚点优先** | 无 Identity 锚点，禁止空泛行业句 |

错误 vs 正确：

```text
❌ 长沙湘菜市场竞争激烈。
✅ 你的岳麓区约 50 元客单湘菜门店，500 米内有 N 家可核验直接竞争（有证据才写 N）。
```

---

## 2. 数据三层模型（冻结）

### Layer 1 · Identity Layer（经营主体）

**回答：** 你是谁？  
**时机：** 第一次必须采集（UX First Moment）。

#### BrandIdentity

```typescript
{
  name: string
  category: string
  foundedYear?: number
  positioning?: string
  priceRange?: string
  targetCustomer?: string
}
```

#### StoreIdentity

```typescript
{
  storeName: string
  city: string
  district?: string
  address?: string
  openingDate?: string
  area?: number
  seats?: number
  businessHours?: string
}
```

#### 经营阶段（四档）

```text
单店验证期 → 增长复制期 → 规模扩张期 → 品牌升级期
```

**价值：** 给外部数据钉锚点，避免空泛市场判断。

---

### Layer 2 · Business Fact Layer（经营事实）

**回答：** 你的店现在发生了什么？  
**策略：** 最小必要事实集；区间优先于假精确。

#### V1 必采 10 个事实

| # | 事实 | 形态 |
|---|------|------|
| 1 | 营业状态 | 增长 / 稳定 / 下降 / 波动 |
| 2 | 日均营业额区间 | `<5k` / `5–10k` / `10–30k` / `30k+` |
| 3 | 客单价 | 区间 |
| 4 | 店龄 | 年/月区间即可 |
| 5 | 最大问题 | 老板一句话（极重要） |
| 6 | 客户来源 | 附近居民 / 商务 / 游客 / 线上 / 会员（可多选） |
| 7 | 最大竞争压力 | 一句话或短选项 |
| 8 | 招牌产品 | 文本 |
| 9 | 当前战略目标 | 提高利润 / 提升营业额 / 扩大规模 / 打造品牌 |
| 10 | 老板判断 | 「如果只能改变一件事，你觉得是什么？」→ 进 Decision DNA |

其余经营数字：**V1 不强制**；有 POS/周经营 CSV 时按权重并入，不挡首次诊断。

---

### Layer 3 · Consumer Intelligence（消费者外部感知）

**杀手能力层。** 与普通 AI 的最大区别：外采可核验证据，不是凭空聊天。

#### 数据源

| 源 | 采什么 | 分析目标 |
|----|--------|----------|
| **大众点评 / 美团** | 星级、评论量、收藏、排名变化；评论文本 | 消费者认知模型（非简单词频） |
| **小红书** | 打卡描述、标签、场景、情绪 | 心智关键词 / 品牌心智地图 |
| **抖音** | 视频量、互动、评论情绪、爆点 | 传播能力 |
| **地图** | 周边餐饮密度、同品类数、商圈/人流线索 | 空间竞争 |

#### 评论拆解示例（冻结语义）

原始：`菜很好吃，就是服务慢。`

```text
产品价值：强
服务体验：弱
核心矛盾：消费期待 > 服务承载能力
```

无检索源 / 超时：**诚实空证据 + gaps**，禁止编造星级与百分比。

---

## 3. 外部数据进入方式 · Evidence Card（冻结）

不是「抓一堆 HTML」，而是标准化 **Evidence Card** 进 Brain / Diagnosis。

### Evidence Card 形状（示意）

```text
Evidence #001
来源：大众点评
时间：2026-07-18
发现：过去 90 天，「等待时间」相关负评增长 38%（可核验时才写）
可信度：★★★★☆
影响：服务体验风险
权重：见 §4
kind：external_intel | internal_fact | inference（须标注）
```

工程对齐：

- RIP / `RestaurantEvidenceV1`  
- `EVIDENCE_CHAIN_PROTOCOL_V1`  
- m-ops-diag `DiagnosisEvidenceItem`  
- M-INTEL：只产 Evidence，不产终局决策  

---

## 4. 数据权重体系 · Evidence Weight（冻结）

| 来源 | 权重 |
|------|------|
| 老板真实经营数据 | 1.0 |
| POS / 经营系统数据 | 1.0 |
| 消费者真实评价 | 0.9 |
| 门店观察（一手） | 0.8 |
| 社交媒体 | 0.7 |
| 行业报告 | 0.5 |
| AI 推测 | 0.3 |

### 输出分层强制标注

```text
事实 → 推断 → 建议关注
```

**禁止混淆。**  
「建议关注」≠ 战略方案 ≠ 拍板。AI 推测不得标成事实；无证据不得写精确百分比。

---

## 5. 每日自动扫描机制（冻结）

形成每日打开价值：

```text
00:00（或打开今日时增量）
  M-INTEL / 外采更新
    ↓
  扫描变化
    ↓
  Diagnosis Engine（m-ops-diag）
    ↓
  Daily Signals / worldChanges
    ↓
  Dashboard / 今日经营扫描卡
```

### 扫描维度

| 域 | 看什么 |
|----|--------|
| **消费者** | 新差评、新关键词、情绪变化 |
| **竞争** | 新店、竞品活动、价格线索 |
| **品牌** | 热度、传播变化 |
| **经营** | 内部事实异常（有数据时） |

无变化时：诚实空态，不编造「今日已采齐」。

---

## 6. 第一次使用后的用户感知（与 UX 对齐）

老板输入：`湘味小馆，长沙岳麓区` → 等待几十秒（采集过程页）→ 出现：

# 我的餐厅经营画像

- **你是谁**（Identity + 区间事实）  
- **顾客怎么看你**（喜欢 / 担心 · 声音墙）  
- **市场怎么看你**（有证据的竞争锚点）  
- **当前最大机会**（一句机会信号，非战略终局）  

感知目标：

> 这不是聊天机器人，它真的研究过我的店。

---

## 7. V1 数据架构落点（冻结）

```text
Restaurant Brain
├── Identity          ← Layer 1
├── Business Facts    ← Layer 2（10 必采 + 可选系统数据）
├── Consumer Evidence ← Layer 3 评论/社媒
├── Market Evidence   ← Layer 3 地图/竞争
├── Diagnosis History ← m-ops-diag 运行留痕
├── Signal History    ← BusinessSignal / worldChanges
└── Learning          ← Decision DNA / 反馈回写
```

| 层 | 写入规则 |
|----|----------|
| Identity / Facts | UX 入口确认后 → Brain / RIP（门禁） |
| External Evidence | M-INTEL / live collector → Evidence Card；确认前不当死事实 |
| Diagnosis / Signal | Engine 产出；Host 投影今日；**Engine 零 Prisma 直写** |
| Learning | 决策与验证回写既有 Memory/Growth API |

---

## 8. V1 采集范围边界

### 必须（首次诊断可跑）

- Layer 1：店名 + 城市（区域/地址尽量有）+ 品类  
- Layer 2：至少「最大问题」+「最想知道什么」（UX 焦点）；其余 10 事实可渐进补  
- Layer 3：尽力外采；失败则 gaps，仍可出「基于已知事实的弱画像」  

### 不做（V1）

- ❌ POS 实时接入为必选项  
- ❌ 强迫填完整 ERP 字段  
- ❌ 无源编造评论/星级/竞争家数  
- ❌ 把 AI 推测权重抬到 ≥ 事实  

---

## 9. 下一步（冻结）

**诊断模型已冻结：** `docs/M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md`  

**下一刀：** 六引擎竖切加深 + UX 五页落地（有证据才 LIVE，骨架诚实 gaps）。

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 Data Collection Freeze | 2026-07-21 | 三层数据 · 10 必采事实 · 外采源 · Evidence Card · 权重 · 日扫 · Brain 落点 |

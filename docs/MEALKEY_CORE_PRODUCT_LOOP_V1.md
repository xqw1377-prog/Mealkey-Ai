# MealKey 核心产品闭环 V1（最终冻结）

> **状态：正式冻结（Freeze）— 战略收口 · 禁止再扩能力面**  
> **日期：** 2026-07-21  
> **产品一句：** MealKey 每天观察你的生意，发现关键变化，帮助你做出更好的经营决策，并在执行结果中持续成长。  
> **品牌：** MealKey 餐启 · **定位：** 餐饮经营能力增长系统  
> **配套落地：** `docs/MEALKEY_MVP_90DAY_ROADMAP_V1.md`  
> **权威挂载：** `docs/AUTHORITY.md` L0 战略收口  

---

## 〇、它是 / 不是（冻结）

| ✅ 是 | ❌ 不是 |
|------|--------|
| 餐饮经营能力增长系统 | AI 助手 / ChatGPT 壳 |
| 经营智能（发现问题） | 知识智能（只回答问题） |
| 每天打开的经营雷达 + 决策闭环 | 餐饮 SaaS 报表中心 |
| 决策质量提升机制（七常委） | 咨询机器人 / 专家聊天群 |
| 一条完整飞轮 | 更多 Agent / 更多功能面 |

**广告语（冻结二选一主推，对外可 A/B）：**

1. **让你的经营能力持续增长。**（主推）  
2. 每天提升认知，每次做对决策。

**首页核心文案（冻结）：**

> 经营最大的差异，是认知差异。  
> 经营最大的成本，是错误决策。  
>  
> 餐启每天观察你的生意，发现关键变化，帮助你做出更好的经营判断。  
>  
> 让每一次决策，都比昨天更接近正确。

---

## 一、最终五层架构（冻结）

```text
① Business Identity     认识你
② Restaurant Brain      理解你的生意（长期记忆）
③ Business Signal Engine 每天发现变化
④ Decision Intelligence  深度判断（含七常委）
⑤ M-EXEC + Evolution     改变与成长
```

工程展开（同一闭环，不新增第六能力层）：

```text
Business Identity
        ↓
Restaurant Brain
        ↓
Business Signal Engine
        ↓
Daily Radar              ← 日活入口（不是能力层，是③的展现）
        ↓
Decision Intelligence
        ↓
Seven Council            ← 决策质量机制（不是入口）
        ↓
M-EXEC
        ↓
Evolution → Decision DNA
```

| 层 | 解决的问题 | 老板感知 |
|----|------------|----------|
| Identity | 你是谁、经营什么、权责目标 | 认知入口；无此只能答行业题 |
| Brain | 这家生意过去发生了什么 | 长期记忆：事实 / DNA / 成败 |
| Signal Engine | 今天什么变化值得关注 | 经营信号（非原始数据） |
| Decision Intelligence | 到底怎么办 | Signal→…→Founder Decision |
| M-EXEC + Evolution | 决定后有没有变好 | 行动→结果→复盘→更准 |

### 决策链路（第四层内部 · 冻结）

```text
Signal → Problem → Evidence → Insight → Options
      → Challenge → Simulation → Founder Decision
```

**七常委定位（冻结）：** 决策质量提升机制；挑战老板、降低认知偏差。  
**不是**产品入口、不是聊天群、不占首页 C 位。

---

## 二、日活体验（冻结）

早上打开 → **餐启 · 今日经营判断书**（不是功能菜单）：

1. **今日判断**（一句话）  
2. **今天最值得关注**（1 条 · 证据链 · 我的判断 ·【进入经营分析】）  
3. **其他变化**（≤3：机会 / 关注）  
4. **今天只做一件事**（来自 primary.recommendation）

老板必须产生：**「这个 AI 真在看我的店。」**  
细则服从：`TODAY_RADAR_EXPERIENCE_V1` · `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1`。

---

## 三、与 GPT 的本质区别（冻结话术）

| GPT | MealKey |
|-----|---------|
| 用户提问 → 回答 | 每天主动：我观察了你的店 |
| 知识智能 | 经营智能 |
| 回答问题 | **发现问题** |
| 一次性对话 | 决策→执行→复盘飞轮 |

---

## 四、明确停止扩展（冻结闸门）

在 **第一条完整飞轮跑通并验证前**，禁止作为主线：

- 新增 L1 顾问席 / 第五垂直 Agent  
- 扩 Signal 第 7 类、扩常委席位  
- 全量 BI / 报表中心 / 员工协同大系统  
- 平行 Prisma DecisionCase / Signal 大表  
- 首页堆更多模块抢雷达 C 位  

例外：仅为打通 MVP 闭环所必需的接线、真实数据与 7 日复盘仪式。

---

## 五、MVP 唯一场景（冻结）

> **一家餐厅老板每天打开 MealKey。**

完整生命体路径：

```text
第一次进入
  → 采集 Business Identity
  → 生成餐厅认知卡（RIP）
  → 抓取外部信息（诚实降级）
  → 生成 / 充实 Restaurant Brain
  → 每日扫描 → 发现 Signal
  → 进入决策室 → 七常委挑战
  → 老板裁决 → 形成行动（M-EXEC）
  → 7 天后复盘（Evolution）
```

成功判据：闭环可演示、可复述、种子用户愿意**第二天还打开**。

落地节奏见：`MEALKEY_MVP_90DAY_ROADMAP_V1.md`。

---

## 六、文档与代码真源（不重复发明）

| 主题 | 真源 |
|------|------|
| 信号字段 / Ranking / →Case | `BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1` · `@mealkey/business-signal-engine` |
| 雷达体验 | `TODAY_RADAR_EXPERIENCE_V1` |
| Brain | `MEALKEY_RESTAURANT_BRAIN_*` · `@mealkey/restaurant-brain` |
| 决策 / Case.id | `MEALKEY_DECISION_INTELLIGENCE_*`（Case.id≡MKDecision.id） |
| 七常委 | `FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE` |
| 日活 Experience | `MEALKEY_DECISION_EXPERIENCE_V1` |
| 第一价值瞬间 | `MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1` |

本文只冻结**战略形状与停止条件**；改字段仍服从各层数据契约。

---

## 七、版本

- **V1 最终冻结日：** 2026-07-21  
- **破坏性变更：** 升 `MEALKEY_CORE_PRODUCT_LOOP_V2`（需显式战略评审）  
- **下一动作：** 只执行 90 天 MVP 路线，不再开新能力设计专题。  

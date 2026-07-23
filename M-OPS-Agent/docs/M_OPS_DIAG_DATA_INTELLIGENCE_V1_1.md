# M-OPS-Agent V1.1 · 数据采集与外部情报引擎设计

> **版本：** V1.1  
> **状态：** Draft Freeze  
> **日期：** 2026-07-21  
> **产品：** 餐启经营诊断（`m-ops-diag`）  
> **定位：** Restaurant Reality Model + External Intelligence Engine  
> **配套：** `M_OPS_DIAG_AGENT_V1.md` · `M_OPS_DIAG_DATA_COLLECTION_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1_1_DETAIL.md` · `M_OPS_DIAG_REASONING_ENGINE_V1_1.md` · `M_OPS_DIAG_UX_V1.md`

---

## 0. 一句话

> M-OPS 的护城河不是会写诊断，而是能持续、可信地建立一家餐厅的现实世界模型。

外部情报不是“抓更多网页”，而是让系统真正回答：

```text
这家店是谁
顾客怎么看它
它的经营现实是什么
它所处的市场发生了什么
老板的判断和客观事实之间有没有偏差
```

---

## 1. 设计目标

V1.1 数据采集与外部情报层解决五个问题：

1. 大众点评、小红书、抖音、地图等数据如何进入系统
2. 如何建立 `Restaurant World`，而不是堆一堆原始证据
3. 如何支持每日自动扫描，而不是一次性抓取
4. 如何保证证据可信，不把噪声当事实
5. 如何把外部情报转成 `Health Model` 可消费的标准输入

---

## 2. 总模型

```text
Restaurant Identity
        +
Owner Reality
        +
Operation Reality
        +
Customer Voice
        +
Market Reality
        ↓
Restaurant Reality Model
        ↓
Restaurant World
        ↓
Delta-Driven Diagnosis Model
        ↓
Health Snapshot / Signal / Insight
```

原则：

- 不追求“抓全网”，追求“与这家店强相关的可核验现实”
- 不追求一次抓全，追求“先建立基线，再持续更新”
- 不追求原始内容堆砌，追求“可用于诊断的结构化情报”

---

## 3. Restaurant Reality Model

餐厅现实模型由五类现实构成。

### 3.1 Business Identity

回答：这是谁的店？

```text
品牌
门店
城市
区域
品类
面积
客单
阶段
```

作用：

- 作为所有外部情报的检索锚点
- 作为竞争圈层判断基础
- 作为所有模型输出的主体绑定条件

### 3.2 Customer Voice

回答：顾客怎么看这家店？

这不是简单的“好评/差评/关键词”，而是 `Customer Voice Intelligence`。

目标输出：

- 顾客为什么来
- 顾客为什么犹豫
- 顾客为什么流失
- 顾客如何描述品牌
- 顾客最近在抱怨什么变化

### 3.3 Operation Reality

回答：店的经营现实是什么？

来源：

- POS
- ERP
- 外卖平台
- 收银系统
- 会员系统
- 库存系统
- 手工输入

目标输出：

- 收入趋势
- 客流结构
- 高峰与低谷
- 成本压力
- 产品表现
- 人效与运营稳定性

### 3.4 Market Reality

回答：与这家店强相关的外部世界是什么？

不是行业报告，而是：

- 附近 500 米到 3 公里真实竞争圈
- 同品类与同价格带店
- 新开店 / 关店 / 活动 / 降价 / 爆品变化
- 平台曝光与竞争位置波动

### 3.5 Owner Reality

回答：老板是怎么理解自己的店的？

目标不是证明老板错，而是识别：

```text
老板认知
  vs
客观事实
```

例：

```text
老板认为：客流不足
系统发现：复购不足
原因：服务等待与产品记忆弱
```

这是 MealKey 系统的重要壁垒，因为它天然连接后续决策层。

---

## 4. Customer Voice Intelligence

`Customer Voice` 是 V1.1 第一优先级，也是用户第一次感知价值的核心。

### 4.1 数据源

#### 大众点评 / 美团

采集目标：

- 星级
- 评论数量
- 最新评论
- 高赞评论
- 差评
- 图片
- 标签
- 排名变化

诊断价值：

- 满意度趋势
- 负面主题聚类
- 顾客场景偏好
- 复购阻碍因素

#### 小红书

小红书不是评价源，而是消费心理与品牌心智源。

采集目标：

- 种草内容
- 内容关键词
- 用户标签
- 聚餐/约会/本地推荐等场景词
- 情绪与推荐语气

诊断价值：

- 顾客为什么种草
- 这家店被归入什么消费场景
- 品牌文化认知是否形成

#### 抖音

抖音不是单纯曝光源，而是传播能力源。

采集目标：

- 视频数量
- 热门内容
- 评论情绪
- 用户 UGC
- 菜品或场景视觉传播点

诊断价值：

- 哪些内容有传播势能
- 是否形成固定记忆点
- 传播与到店之间是否存在断层

### 4.2 标准化对象

进入诊断层前，所有顾客声音统一转为 `Customer Voice Item`：

```json
{
  "source": "dianping",
  "sourceType": "review",
  "content": "菜味道不错，但是服务员态度一般",
  "sentiment": "negative",
  "topic": "service",
  "keywords": ["态度", "等待", "服务"],
  "scenario": ["晚餐", "朋友聚餐"],
  "observedAt": "2026-07-18"
}
```

### 4.3 中间产物

顾客声音不直接喂给首页，而先沉淀成：

- `Customer Voice Pool`
- `Customer Voice Map`
- `Customer Reality Map`

#### Customer Voice Pool

原始标准化声音集合。

#### Customer Voice Map

用于诊断的结构化聚合：

- 喜欢什么
- 抱怨什么
- 离开什么
- 正在变化什么

#### Customer Reality Map

给产品层展示的高价值摘要：

```text
❤️ 被认可
⚠ 正在流失
❌ 高频抱怨
🔥 新机会
```

---

## 5. Operation Reality

V1.1 不强制所有餐厅接完整经营系统，但必须定义标准入口。

### 5.1 最小经营现实

可来自手工输入或基础系统数据：

- 日营业额区间
- 月营业额趋势
- 客单
- 高峰时段
- 进店人数 / 翻台
- TOP 菜品
- 最大经营问题

### 5.2 深度经营现实

未来连接：

- POS
- ERP
- 外卖
- 会员
- 排班
- 库存

### 5.3 目标产物

标准化为：

- `Revenue Trend`
- `Traffic Pattern`
- `Peak Load`
- `Cost Pressure`
- `Product Structure`
- `Operating Stability`

这些对象不是直接展示给用户，而是进入 `Health Model`。

---

## 6. Market Reality

市场现实必须是“主体绑定情报”。

### 6.1 检索锚点

- 城市
- 区域
- 地址
- 品类
- 价格带
- 店型

### 6.2 外部世界范围

V1.1 建议三层圈：

- `Core Ring`：500 米
- `Near Ring`：1 公里
- `Business Ring`：3 公里或商圈级

### 6.3 采集对象

- 同品类门店数
- 同价格带门店数
- 新开店 / 关店
- 降价 / 活动 / 套餐
- 平台评分变化
- 高热竞品菜品或内容趋势

### 6.4 输出产物

- `Competition Pressure`
- `Price Band Position`
- `New Entrant Alert`
- `Competitor Activity`
- `Market Change Signal`

这部分最终进入：

```text
My Restaurant World
我的经营世界
```

---

## 7. Owner Reality

Owner Reality 不是噪声，而是决策系统的重要前置层。

### 7.1 采集内容

- 老板认为当前最大问题是什么
- 老板最想知道什么
- 老板最想改变的一件事
- 老板对竞争和客流的判断

### 7.2 作用

- 决定首次诊断的聚焦方向
- 与客观证据做偏差对比
- 为 Decision Room 提供“认知差距”输入

### 7.3 输出对象

- `Owner Hypothesis`
- `Reality Gap`
- `Decision DNA Hint`

---

## 8. Restaurant World

`Restaurant World` 是 V1.1 数据与情报层的总资产对象。

```text
Restaurant World
├── Identity
├── Owner Reality
├── Customer Voice
├── Operation Reality
├── Market Reality
├── Evidence Timeline
├── Snapshot History
└── Learning Notes
```

### 8.1 原则

- 不是原始抓取数据库
- 不是“所有信息”的堆场
- 是供 `Health Model`、`Daily Scan`、`Decision Room` 反复消费的结构化经营世界

### 8.2 与现有架构关系

- `Restaurant Brain`：长期记忆与官方存储边界
- `Restaurant World`：V1.1 在外接 Agent 视角下的现实世界建模层
- `Diagnosis Engine`：消费 `Restaurant World`，产出 `health/signal/insight`

---

## 9. 数据进入管道

统一的数据进入链路：

```text
Source
  ↓
Raw Collector
  ↓
Normalizer
  ↓
Evidence Filter
  ↓
Evidence Card / Voice Item / Market Item
  ↓
Restaurant World
  ↓
Delta Engine / Health Model
```

### 9.1 Collector

负责：

- 拉取源数据
- 记录抓取时间
- 记录抓取上下文

### 9.2 Normalizer

负责：

- 标准化平台字段
- 统一时间
- 去平台差异
- 补充基础主题标签

### 9.3 Evidence Filter

负责：

- 去重
- 噪声过滤
- 反广告
- 反无关内容
- 可信度分级

---

## 10. 每日自动扫描

`Daily Health Scan` 是 V1.1 的高频入口。

### 10.1 触发方式

- 凌晨定时任务
- 用户打开今日时按需增量扫描

### 10.2 扫描链路

```text
Yesterday Snapshot
  +
New Evidence
  +
New Market Changes
  +
New Owner / Operation Facts
  ↓
Delta Detection
  ↓
Today's Health Scan
```

### 10.3 输出结构

每日输出不是重新写报告，而是：

- 今天发现了什么变化
- 哪个风险最值得关注
- 哪个机会开始出现
- 哪些维度保持稳定

### 10.4 每日输出示意

```text
今天发现：

1 个风险
2 个变化
1 个机会
```

---

## 11. 证据可信度体系

### 11.1 来源权重

| 来源 | 权重 |
|------|------|
| 老板真实经营数据 | 1.0 |
| POS / 经营系统 | 1.0 |
| 真实消费者评价 | 0.9 |
| 地图 / 官方平台公开信息 | 0.8 |
| 社交内容 | 0.7 |
| 招聘 / 二手外围信号 | 0.5 |
| AI 推理 | 0.3 |

### 11.2 可信度判断维度

- 来源可靠性
- 时间新鲜度
- 与主体相关性
- 样本量
- 是否有交叉证据

### 11.3 强规则

- 无证据不写精确百分比
- AI 推理不得单独变成强 Signal
- 招聘、论坛、搬运内容默认低权重
- 单条评论不得直接代表整体经营问题

---

## 12. 反垃圾与反噪声机制

这是 V1.1 能不能成为护城河的关键。

### 12.1 必须过滤的内容

- 广告帖
- 搬运帖
- 无关探店合集
- 纯情绪化但无信息量内容
- 重复抓取内容
- 与门店不匹配的错误 POI 内容

### 12.2 过滤规则

- 同文案 / 高相似内容去重
- 无门店锚点内容降级
- 非近 90 天内容默认降权
- 纯营销话术不进入诊断主链
- 只有“好吃/不错”但无主题信息的内容仅作弱证据

### 12.3 反错误归因

禁止：

```text
看到 2 条差评
→ 直接下结论：服务有重大问题
```

必须：

```text
先看主题聚类
再看时间变化
再看场景集中
再决定是否升级为变化信号
```

---

## 13. 产品输出对齐

数据与情报层必须服务以下产品对象：

### 13.1 Restaurant Health Profile

首次价值页：

- 我认识你的店
- 顾客怎么看你
- 你的经营现实是什么
- 市场环境正在发生什么

### 13.2 Customer Voice Wall

输出：

- 顾客喜欢什么
- 顾客犹豫什么
- 顾客离开什么
- 最近正在变化什么

### 13.3 Daily Health Scan

输出：

- 今日风险
- 今日机会
- 今日变化
- 进入诊断 CTA

### 13.4 Decision Room Handoff

输出：

- 值得继续判断的问题
- 证据链
- 可能原因
- 仍缺哪些关键事实

---

## 14. 工程边界

V1.1 数据采集与外部情报层只负责：

- 收集
- 标准化
- 过滤
- 聚合
- 建模

不负责：

- 终局决策
- 自动执行
- 直接给老板拍板方案

### 14.1 与诊断层边界

```text
Data / Intel Layer
  负责：喂给系统真实世界

Diagnosis Layer
  负责：解释世界发生了什么变化
```

### 14.2 与 MealKey Core 边界

```text
M-OPS
  看见问题 / 形成诊断

MealKey Core
  判断是否决策 / 如何执行
```

---

## 15. V1.1 开发顺序

### Sprint 1 · 产品价值优先

完成：

- Restaurant Health Profile
- 大众点评采集
- 小红书采集
- 抖音采集
- Customer Voice 分析

交付：

```text
我的餐厅经营画像
```

### Sprint 2 · 高频入口

完成：

- Daily Health Scan
- Snapshot 增量更新
- 今日变化信号

### Sprint 3 · 深诊断

完成：

- 六大诊断引擎逐步拆开

### Sprint 4 · 商业化

完成：

- 独立 Agent SaaS 化
- 订阅与套餐能力

---

## 16. 下一步

数据与外部情报层解决「喂给系统什么现实」。

下一刀：

`M_OPS_DIAG_REASONING_ENGINE_V1_1.md`

用于冻结：

- 数据如何变成判断
- Signal 如何排序
- 如何避免胡乱归因
- 如何形成「发现问题 → 找到原因 → 建议验证」的诊断链

---

## 17. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.1 Draft Freeze | 2026-07-21 | 新增 Restaurant Reality Model、Customer Voice Intelligence、Restaurant World、Daily Health Scan、可信度与反垃圾规则 |

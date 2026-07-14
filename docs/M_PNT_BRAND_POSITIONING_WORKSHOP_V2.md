# M-PNT Brand Positioning Workshop V2 产品设计文档

> 状态：Product Design Frozen  
> 模块：M-PNT  
> 定义：Brand Positioning Workshop / 品牌定位工作坊

## 1. 核心重定义

M-PNT V2 不再定义为：

- AI 品牌定位工具
- Brand Positioning Agent

M-PNT V2 重新定义为：

**品牌定位工作坊**

一句话定义：

> 帮助餐饮创业者通过 AI 专家团队完成一次完整品牌定位过程，并形成可执行的品牌战略。

它的目标不是：

```text
用户问 → AI回答 → 输出定位
```

而是：

```text
AI主持一次完整品牌战略会议
  ↓
用户参与判断
  ↓
形成品牌战略资产
```

## 2. 产品本质

MealKey 在这个模块里真正要做的不是：

- AI 替用户完成品牌定位

而是：

- AI 把顶级品牌咨询过程透明化
- 让创始人参与关键判断
- 让创始人在过程中形成自己的品牌认知能力

所以 M-PNT V2 的价值核心是：

1. 高感知
2. 高信任
3. 高成长

## 3. 产品原则

1. `过程大于答案`
2. `参与大于黑盒`
3. `冲突大于伪共识`
4. `品牌战略大于 slogan`
5. `落地路径大于结论展示`
6. `长期品牌资产大于一次性回答`

## 4. 总体工作流

完整链路如下：

```text
Stage 0  品牌启动
  ↓
Stage 1  创始人访谈
  ↓
Stage 2  市场战场扫描
  ↓
Stage 3  定位专家分析
  ↓
Stage 4  专家战略辩论
  ↓
Stage 5  创始人战略选择
  ↓
Stage 6  定位战略确认
  ↓
Stage 7  落地路径模拟
  ↓
Stage 8  品牌资产沉淀
```

## 5. 各阶段设计

### Stage 0：品牌启动室

目标：

- 建立项目上下文
- 创建一次明确的品牌定位任务

用户进入时不应该直接开始聊天。

而应该先看到：

```text
创建品牌定位项目

品牌名称：
_____

品类：
_____

城市：
_____

目前阶段：

○ 想创业
○ 已开店
○ 连锁扩张
○ 品牌升级

开始品牌诊断 →
```

系统生成：

`Brand Context`

示例：

```text
品牌：XX湘菜
阶段：单店验证期
当前目标：建立差异化定位
定位任务：寻找市场空位
```

### Stage 1：创始人战略访谈

这是整个系统最重要的一步。

AI 要理解的不只是企业资料，而是：

- 创始人的认知
- 创始人的战略偏好
- 创始人的品牌野心
- 创始人的风险边界

#### 第一层：业务事实

收集字段：

- 品牌名称
- 品类
- 城市
- 店型
- 面积
- 客单
- 价格
- 用户
- 竞争品牌
- 经营时间

#### 第二层：创始人认知

关键问题：

1. 你觉得客户为什么选择你？
2. 你的竞争优势是什么？
3. 如果三年后成功，你希望别人怎么描述你的品牌？
4. 你最不想成为哪一种品牌？

AI 形成：

`Founder Mindset Profile`

示例：

```text
创始人核心诉求：
希望从普通湘菜升级为城市特色品牌

潜在偏好：
重视品质与长期品牌价值

风险：
可能高估产品优势，低估认知竞争
```

### Stage 2：市场战场扫描

这里不是生成长报告。

而是建立：

`Brand Battlefield Map`

它必须回答三个问题：

#### 品类地图

```text
消费者现在如何理解这个品类？
```

#### 竞争地图

```text
消费者已有哪些选择？
```

#### 心智空位

```text
哪里没人占？
```

输出示例：

```text
当前市场状态：
湘菜竞争高度同质化

主要机会：
家庭宴请场景存在升级空间

主要风险：
高端湘菜已有强势品牌
```

### Stage 3：三大师定位分析

这里不是三个答案。

而是三套理论体系。

#### Agent 1：Ries 品类战略专家

输入：

- 市场扫描
- 用户资料
- Founder Mindset Profile

输出结构：

```text
核心判断：
是否存在新品类机会？

建议占据：
________

原因：
1.
2.
3.
```

关注：

- 品类
- 第一
- 心智

#### Agent 2：Trout 竞争定位专家

输出结构：

```text
竞争问题：
消费者为什么选择别人？

你的差异：
________

建议定位：
________
```

关注：

- 竞争
- 差异
- 位置

#### Agent 3：叶茂中消费者洞察专家

输出结构：

```text
消费者真实需求：
________

传播机会：
________

品牌记忆点：
________
```

关注：

- 人
- 情绪
- 场景

### Stage 4：专家战略会议

这是 M-PNT 的最大差异化。

这里不能简单合并，而必须产生：

`Conflict`

示例：

```text
Ries：
应该创造“湘菜宴请”新品类

Trout：
不同意，因为已有品牌占据高端宴请

叶茂中：
用户不会因为新品类购买，他们购买的是家庭体面
```

AI 主持人输出：

```text
核心争议：
品类创新 vs 场景占领

需要创始人决策
```

### Stage 5：创始人参与决策

这是用户能力成长的关键节点。

AI 提出三个战略方向：

#### 路线 A：品类领导者

适合：

- 长期品牌建设

风险：

- 需要教育市场

#### 路线 B：竞争突破者

适合：

- 快速切入

风险：

- 需要精准差异

#### 路线 C：场景占领者

适合：

- 快速传播

风险：

- 容易复制

用户做出选择：

```text
我选择路线 C
```

系统记录：

`Founder Decision Event`

### Stage 6：定位战略生成

生成：

`Brand Positioning Blueprint`

包含：

1. 定位一句话
2. 品类定义
3. 用户价值
4. 差异化
5. 品牌人格
6. 传播方向

这不是一条 slogan。

它是品牌战略蓝图。

### Stage 7：定位落地模拟

这是旧版缺失的关键层。

定位必须进入经营动作。

模拟结构：

```text
第1阶段
产品：调整 SKU

第2阶段
空间：强化定位表达

第3阶段
营销：建立传播主题

第4阶段
验证：用户反馈
```

生成：

`Positioning Execution Map`

### Stage 8：品牌资产沉淀

最终形成的资产：

- Brand DNA
- Positioning Decision
- Expert Debate
- Founder Choice
- Execution Roadmap
- Future Decisions

这些资产写入：

- MealKey Memory
- 后续 M-BIZ / M-MKT / M-ED 可读取的品牌上下文

## 6. M-PNT V2 的核心变化

| 旧版 | 新版 |
| --- | --- |
| 定位问答 | 战略工作坊 |
| AI 给答案 | AI 组织决策 |
| 单模型 | 专家体系 |
| 结果输出 | 过程沉淀 |
| 一次使用 | 长期品牌资产 |

## 7. 关键产品对象

### `BrandContext`

字段：

- brandName
- category
- city
- businessStage
- positioningGoal
- workshopTask

### `FounderMindsetProfile`

字段：

- founderGoal
- perceivedStrength
- desiredFutureDescription
- unwantedBrandIdentity
- cognitiveBias
- strategicPreferenceHint

### `BrandBattlefieldMap`

字段：

- categoryMap
- competitorMap
- whitespaceMap
- marketSummary
- opportunitySummary
- riskSummary

### `ExpertPositioningView`

字段：

- expertId
- expertName
- theoryLens
- coreJudgment
- recommendedPosition
- reasons
- risks
- evidenceRefs

### `ExpertDebateSummary`

字段：

- conflictTopic
- expertViewpoints
- moderatorSummary
- unresolvedDecision

### `FounderDecisionEvent`

字段：

- selectedRoute
- rationale
- rejectedRoutes
- decisionConfidence
- createdAt

### `BrandPositioningBlueprint`

字段：

- positioningOneLiner
- categoryDefinition
- userValue
- differentiation
- brandPersonality
- communicationDirection

### `PositioningExecutionMap`

字段：

- phase1Product
- phase2Space
- phase3Marketing
- phase4Validation
- validationMetric
- riskNotes

### `BrandPositioningAssetPack`

字段：

- brandDNA
- positioningDecision
- expertDebate
- founderChoice
- executionRoadmap
- futureDecisionContext

## 8. 页面形态

M-PNT V2 不应该是长聊天页。

它应该是：

**品牌定位工作坊**

页面结构建议：

- 左：当前阶段 / 进度
- 中：当前阶段主内容
- 右：专家观点 / 证据 / 创始人已选方向

在移动端：

- 长文本严格单列
- 只有短指标可以双列
- 用户选择节点必须始终在主阅读链里

## 9. 用户参与节点

以下节点必须有创始人参与，不能自动跳过：

1. `Stage 1` 创始人认知输入
2. `Stage 4` 理解专家冲突
3. `Stage 5` 做出战略路线选择
4. `Stage 7` 对落地路径给出接受/调整反馈

## 10. 成功标准

用户完成后应明确感受到：

1. AI 真的理解了我的品牌
2. 我看见了真实战略冲突
3. 我不是旁观者，而是决策参与者
4. 我理解了为什么是这个定位
5. 我知道接下来 90 天该怎么做

## 11. 模块战略意义

M-PNT V2 的价值，不是比 ChatGPT 更快给答案。

而是把品牌咨询过程产品化：

- 专家视角可见
- 冲突可见
- 用户参与可见
- 决策路径可积累
- 品牌战略资产可复用

这才是 MealKey 的护城河之一。

## 12. 当前冻结内容

这一版冻结以下内容：

1. M-PNT = `品牌定位工作坊`
2. 工作流是 `Stage 0 - Stage 8`
3. 三位大师固定为 `Ries / Trout / 叶茂中`
4. 专家冲突必须显式出现
5. 创始人选择是第一类对象，不是附属字段
6. 最终交付物必须包含战略蓝图和执行地图
7. 结果必须沉淀为长期品牌资产

## 13. 下一步工程文档

基于这份产品设计，下一步进入：

1. `M-PNT Agent Runtime Workflow V1`
2. `M-PNT Frontend Workshop UI Design`

当前优先级：

**先做 `M-PNT Agent Runtime Workflow V1`**

因为现在 M-PNT 的价值已经明确，下一步需要把这套品牌咨询流程真正收成可运行工作流。

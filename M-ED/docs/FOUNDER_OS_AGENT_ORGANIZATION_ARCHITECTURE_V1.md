# 《Founder OS Agent 组织架构设计 V1》

> 子标题：从“四个 Agent”升级为“AI 咨询公司”
>
> 核心判断：用户觉得 Agent 不聪明，根因不是模型不够强，而是组织结构仍然停留在“聊天机器人”。

## 一、这一步要解决什么

当前系统底层虽然已经有：

- `M-BIZ`
- `M-PNT`
- `M-MKT`
- `M-ED`

也已经逐步补上了：

- `Founder Intelligence Layer`
- `Mission / Decision / Memory`
- 前后端统一的 `protocolProjection`

但用户感知上，系统仍然容易被理解成：

```text
用户
  ↓
Agent
  ↓
LLM
  ↓
答案
```

这本质上还是：

- 一次提问
- 一次回答
- 一次性结论

所以用户会觉得：

> 这只是一个比较会说话的 AI，不像真正的顾问团队。

Founder OS 下一步要冻结的，不是某个 Agent 的 prompt。

而是：

> 整个 Founder OS 应该以什么组织形态运行。

也就是：

## Founder OS 不是四个工具，而是一家 AI 咨询公司

---

## 二、Founder OS 的最终组织结构

Founder OS 的顶层组织结构冻结如下：

```text
                 Founder OS

              Chief Advisor
               首席顾问

                   |
    --------------------------------
    |              |               |
 商业战略部      品牌战略部       市场研究部
 M-BIZ           M-PNT            M-MKT

                   |

              组织设计部
                M-ED

                   |

             Knowledge Layer

                   |

              Memory Layer

                   |

             Decision Layer
```

这意味着：

- 用户面对的不是四个并列机器人
- 而是一个由 `Chief Advisor` 组织的咨询公司
- 四个模块从“产品页面”升级为“咨询部门”
- `Knowledge / Memory / Decision` 不再是隐式支撑，而是底层共享基础设施

---

## 三、为什么必须引入 Chief Advisor

现在系统里最缺失的角色，不是专家。

而是：

## 谁负责组织专家

现实咨询公司里，客户不会直接面对：

- 财务顾问
- 品牌顾问
- 运营顾问
- 战略顾问

客户真正面对的是：

> 一个项目负责人，一个首席顾问。

他负责：

- 理解企业
- 定义问题
- 组织团队
- 主持会议
- 形成决策

Founder OS 必须补上这个缺口。

否则四个 Agent 永远只是：

- 谁先被点到谁回答
- 谁擅长哪个模块谁各说各话
- 没有人做问题拆解
- 没有人做会议组织
- 没有人做最终决策形成

---

## 四、Chief Advisor Agent 的最终定义

## 1. 角色定位

`Chief Advisor` 不是专业判断专家。

它是：

> Founder OS 的项目负责人 / 首席顾问 / 企业大脑。

它不直接负责输出品牌理论、财务模型、市场结论。

它负责：

1. 理解企业
2. 发现问题
3. 调度专家
4. 组织会议
5. 形成决策

---

## 2. Chief Advisor 的职责边界

### Chief Advisor 应该做什么

- 统一理解用户当前真实问题
- 判断这是不是市场问题、品牌问题、商业问题或组织问题
- 决定应该召集哪些专家
- 决定会议类型
- 把专家意见压成可执行决策
- 将决策写入长期记忆

### Chief Advisor 不应该做什么

- 直接替代所有专家
- 直接输出专业细节判断
- 用“总结一段话”代替决策形成
- 绕过 Founder 决策节点

Chief Advisor 是：

> 组织能力，不是专业能力。

---

## 3. 示例

用户说：

> 最近感觉生意不好。

普通 AI 往往直接给：

- 营销建议
- 降本建议
- 门店运营建议

Chief Advisor 的第一反应应该是：

```text
问题可能来自：

- 市场进入错了？
- 品牌心智不清？
- 商业模型不成立？
- 组织能力跟不上？
```

然后它应该触发：

- 诊断
- 专家路由
- 会议组织

而不是立即给答案。

---

## 五、Agent 三层架构冻结

Founder OS 的 Agent 组织架构冻结为三层：

## L0：Chief Advisor

角色：

- 企业大脑
- 项目总负责人
- 咨询流程主持人

职责：

- Mission 定义
- 专家召集
- 会议组织
- 决策收口

---

## L1：Domain Expert

角色：

- 领域专家
- 咨询部门负责人

当前至少包括：

```text
商业模式专家
品牌定位专家
市场专家
组织专家
财务专家
增长专家
运营专家
```

说明：

- `M-BIZ / M-PNT / M-MKT / M-ED` 是部门级 Expert Runtime
- 其中还可以继续包含更细的专家角色
- 这些专家不一定都先做独立 Agent，也可以先作为 Runtime 内部角色存在

---

## L2：Knowledge Specialist

角色：

- 知识专家
- 思考路径专家
- 决策模式专家

例如：

### 品牌战略方向

```text
里斯定位理论
特劳特定位理论
叶茂中冲突理论
```

### 商业战略方向

```text
商业模式画布
精益创业
SaaS 模型
连锁模型
```

这一层不再被定义为“查资料”。

而是：

> 提供专家思考路径与决策模式。

---

## 4. 三层调用关系

```text
Chief Advisor
    ↓
Domain Expert
    ↓
Knowledge Specialist
```

也就是说：

- Chief Advisor 不直接查理论
- Chief Advisor 先调用领域专家
- 领域专家再调用知识专家
- 知识专家负责补思考路径，而不是替代领域判断

---

## 六、为什么当前 M-PNT 让用户感觉“不像专家”

当前 `M-PNT` 的问题不是没有三位理论角色。

而是：

```text
Ries Agent
Trout Agent
Ye Agent
```

用户感知上仍然像：

- 三个名字不同的 AI 输出
- 三份报告
- 三段差不多的话

所以用户会觉得：

> 换名字的 AI。

正确设计不是三份答案。

而是：

## 三个真正参与会议的咨询顾问

---

## 1. 里斯顾问

核心问题：

> 你应该占据消费者什么心智位置？

关注：

- 品类
- 第一
- 认知

---

## 2. 特劳特顾问

核心问题：

> 你的竞争位置是什么？

关注：

- 对手
- 差异化
- 空位

---

## 3. 叶茂中顾问

核心问题：

> 用户为什么选择你？

关注：

- 冲突
- 情绪
- 场景

---

## 4. 正确的输出形态

不是：

- 三份理论报告

而是：

- 三位顾问发言
- 观点发生冲突
- 主持人压出共识
- 形成品牌定位决策

这就是：

> 咨询会议，而不是多 Agent 报告拼盘。

---

## 七、Founder OS Runtime 的重新设计

当前很多 Agent Runtime 仍然更像：

```text
runAgent()
  ↓
Capability
  ↓
LLM
```

Founder OS 应升级为：

```text
Mission
  ↓
Chief Advisor
  ↓
Meeting Planner
  ↓
Expert Router
  ↓
Expert Agents
  ↓
Debate Engine
  ↓
Decision Synthesizer
  ↓
Memory Writer
```

这里的重点不是又多了几个模块。

重点是：

> Founder OS 运行的最小单位不再是一次问答，而是一次咨询任务。

---

## 八、Runtime 的核心模块冻结

## 1. Mission Planner

作用：

- 把用户输入升级成咨询任务
- 明确需要哪些专家
- 明确会议类型

输入：

- 用户问题
- Founder Context
- Business Context
- Memory

输出：

```typescript
interface MissionPlan {
  missionId: string
  topic: string
  objective: string
  missionType:
    | "diagnosis"
    | "strategy_review"
    | "entry_decision"
    | "positioning_review"
    | "org_design"
  requiredExperts: string[]
  meetingType:
    | "discovery"
    | "strategy_assessment"
    | "positioning_council"
    | "expansion_review"
    | "decision_session"
  urgency?: "low" | "medium" | "high"
}
```

示例：

用户：

> 我要做加盟。

生成：

```text
Mission:
评估加盟可行性

需要专家:
商业模式 / 市场 / 运营 / 财务

会议类型:
战略评估会
```

---

## 2. Expert Router

作用：

- 根据 Mission 动态选择专家
- 不再固定“一问就调用某个 Agent”

例如：

### 品牌问题

```text
M-PNT + M-MKT
```

### 商业问题

```text
M-BIZ + M-ED
```

### 加盟问题

```text
M-BIZ + M-MKT + 运营专家 + 财务专家
```

对应结构：

```typescript
interface ExpertRoute {
  missionId: string
  primaryExpert: string
  supportingExperts: string[]
  excludedExperts?: string[]
  reason: string
}
```

---

## 3. Meeting Planner

作用：

- 决定这场咨询会议如何组织
- 决定发言顺序、争论焦点、决策节点

```typescript
interface MeetingPlan {
  missionId: string
  meetingType: string
  agenda: string[]
  speakingOrder: string[]
  decisionGate: string
}
```

Meeting Planner 的意义在于：

- 系统不只是“并发调用多个 Agent”
- 而是组织一场有明确议程的咨询会议

---

## 4. Debate Engine

这是 Founder OS 的核心价值层。

没有争议，就只是报告。

有争议，才有：

- 取舍
- 判断
- 决策含金量

数据结构冻结如下：

```typescript
interface Debate {
  topic: string
  positions: Array<{
    expert: string
    view: string
    confidence: number
  }>
  conflicts: Conflict[]
  consensus: string
}

interface Conflict {
  dimension: string
  sideA: string
  sideB: string
  tension: string
}
```

Debate Engine 不负责“总结”。

它负责：

- 暴露冲突
- 比较冲突
- 压缩冲突

---

## 5. Decision Synthesizer

Decision Synthesizer 不是摘要器。

它是：

> 决策形成器。

例如：

- 市场专家：扩张
- 运营专家：暂缓
- 财务专家：谨慎

最终输出不应是：

> 三位专家意见如上。

而应是：

```text
综合判断：
未来 90 天验证直营复制能力，暂不开放加盟。
```

对应结构：

```typescript
interface SynthesizedDecision {
  decisionId: string
  missionId: string
  problem: string
  decision: string
  reasoning: string[]
  tradeoff: string[]
  validationPlan: string[]
}
```

---

## 6. Memory Writer

作用：

- 把一次咨询的结果写回 Founder OS 的长期认知系统
- 让系统不是“再次从零分析”

写入目标：

- Enterprise Memory
- Decision Memory
- Cognitive Memory

---

## 九、知识资产必须从“知识库”升级成“Decision Pattern”

当前很多知识库的定位仍是：

> 给 AI 查资料。

这不够。

Founder OS 的知识层应该被重新定义为：

## 专家能力资产

例如：

`M-PNT` 不应该只保存：

```text
定位理论文本
```

而应该保存：

```text
里斯专家思考路径

第一问：
这个品牌属于什么品类？

第二问：
消费者第一联想是什么？

第三问：
是否有机会成为第一？
```

也就是说，知识资产应该是：

## Decision Pattern

```typescript
interface DecisionPattern {
  id: string
  domain: "brand" | "market" | "business" | "organization"
  expert: string
  trigger: string
  thinkingPath: string[]
  diagnosticQuestions: string[]
  evaluationRules: string[]
  typicalTradeoffs: string[]
}
```

Knowledge Layer 的价值，从“喂知识”升级成：

> 提供专家如何思考。

---

## 十、Founder OS 的 Memory 体系冻结

Founder OS 的长期壁垒来自 Memory，不来自一次回答。

Memory 分三层：

## 1. Enterprise Memory

记录企业事实。

例如：

```text
成立 5 年
3 家店
100 员工
```

作用：

- 让系统知道这家公司现在是什么状态
- 避免每次重新盘问

---

## 2. Decision Memory

记录历史选择。

例如：

```text
2026 年 7 月：
放弃快速加盟
选择直营验证
```

作用：

- 让系统知道公司怎么做过取舍
- 让未来建议可以引用历史决定

---

## 3. Cognitive Memory

记录创始人的认知与偏好。

例如：

```text
老板偏稳健
关注长期品牌
不喜欢高杠杆
```

作用：

- 让系统理解“为什么这个 Founder 会接受某种方案”
- 形成真正的 Founder OS 陪伴感

---

## 4. 三层 Memory 的关系

```text
Enterprise Memory
    记录企业现实

Decision Memory
    记录企业选择

Cognitive Memory
    记录 Founder 偏好
```

三层组合之后，系统才能形成：

- 事实理解
- 决策连续性
- 认知连续性

这才是 Founder OS 的护城河。

---

## 十一、最终用户感知应该发生什么变化

### 第一次使用

用户感知：

> AI 帮我分析企业。

### 第二个月

用户感知：

> AI 知道我的企业发生了什么变化。

### 半年

用户感知：

> 这个 AI 像我的长期商业伙伴。

### 一年

用户感知：

> 它比新来的咨询顾问更了解我的公司。

也就是说，Founder OS 的最终价值不是“第一次回答更强”。

而是：

> 越用越懂，越懂越有陪伴价值，越陪伴越形成决策壁垒。

---

## 十二、当前四个项目的组织升级

当前四个项目需要重新定义：

| 项目 | 当前定位 | 升级后 |
| --- | --- | --- |
| `M-PNT` | 品牌定位工具 | 品牌战略咨询部 |
| `M-MKT` | 市场分析工具 | 市场研究部 |
| `M-BIZ` | 商业模式判断工具 | 商业战略部 |
| `M-ED` | 股权设计工具 | 组织设计部 |

这意味着：

- 它们不再是四个产品
- 它们是 Founder OS 内部四个咨询部门
- 前台工作台只是部门工作台
- 真正面对 Founder 的统一入口是 `Chief Advisor`

---

## 十三、与当前工程状态的映射

基于目前已经完成的工程收口，Founder OS 已经具备三层基础：

### 1. 前台工作台层

当前已完成：

- `market / business / positioning / equity` 四个工作台
- 三栏咨询工作台结构
- `Founder Intelligence Layer`
- `Ledger / Agent Protocol / Memory Update`

这意味着：

> 前台已经具备“部门工作台”的形态基础。

### 2. 协议层

当前已完成：

- `FounderContext`
- `BusinessContext`
- `FounderDecision`
- `MemoryRecord`
- `protocolProjection`

这意味着：

> 系统已经开始拥有“咨询公司内部共用语言”。

### 3. Runtime Projection 层

当前已完成：

- 四条线统一的 `runtime-projections/*`
- `agent.ts` 的四个 `*Context` 已返回 `protocolProjection`

这意味着：

> 技术上已经有了 Chief Advisor 未来统一调度的中间层。

---

## 十四、下一阶段工程收口建议

Founder OS 不应该立刻开始大规模多 Agent 并发开发。

正确顺序应该是：

### P0：先冻结组织模型

输出：

- `Chief Advisor`
- `Domain Expert`
- `Knowledge Specialist`
- `Mission / Route / Debate / Decision / Memory`

这一步即本文件。

### P1：补 Chief Advisor Contract

输出：

- `MissionPlan`
- `ExpertRoute`
- `MeetingPlan`
- `Debate`
- `SynthesizedDecision`

### P2：让前台进入 Chief Advisor 模式

输出：

- 用户首先进入 Chief Advisor
- Chief Advisor 决定进入哪个部门工作台
- 部门工作台从“入口”变成“专业会场”

### P3：让 Runtime 进入组织调度模式

输出：

- `Mission Planner`
- `Expert Router`
- `Debate Engine`
- `Decision Synthesizer`
- `Memory Writer`

### P4：让 Memory 形成长期闭环

输出：

- Enterprise Memory
- Decision Memory
- Cognitive Memory
- 事件流驱动的学习闭环

---

## 十五、最终结论

Founder OS 不应该继续被理解为：

- 四个产品
- 四个 Agent
- 四个聊天入口

Founder OS 的最终定义应该是：

> 一个由 Chief Advisor 统筹、由四个咨询部门执行、由 Knowledge Layer 提供思考路径、由 Memory Layer 沉淀长期认知、由 Decision Layer 形成最终选择的 AI 咨询公司。

所以 Founder OS 从这一刻开始的顶层组织定义是：

## Founder Intelligence Company

不是四个工具。

而是一家公司。

---

## 十六、下一步

下一步进入：

# 《Founder OS 数据闭环设计》

重点冻结六件事：

1. 用户画像模型
2. 企业知识图谱
3. 决策 Memory
4. 事件流
5. AI 学习机制
6. 从一次咨询到长期陪伴的飞轮

这一层才是真正决定 Founder OS 护城河的基础设施。

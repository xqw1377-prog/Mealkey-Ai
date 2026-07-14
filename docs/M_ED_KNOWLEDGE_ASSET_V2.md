# M-ED Knowledge Asset V2 设计

## Equity Intelligence Knowledge System

## 一、目标

这一层不是做：

- 股权知识问答
- 治理概念百科
- 规则解释器

而是做：

> 一个服务于股权决策引擎的知识系统

M-ED V2 的知识资产不直接服务“回答问题”。

它服务的是：

**场景判断、风险识别、方案生成、治理决策。**

---

## 二、M-ED 知识资产重新定位

### 原来的思路

```text
股权规则

↓

AI 回答
```

问题：

- 用户感知不到专业价值
- 不能支撑复杂治理判断
- 不能复用历史处理经验
- 不能沉淀可执行方案

### V2 思路

```text
企业场景

↓

历史案例

↓

专家判断逻辑

↓

风险模型

↓

方案策略

↓

决策结果
```

知识资产最终服务的是：

**Decision Engine**

而不是聊天输出。

---

## 三、M-ED Knowledge Asset 总架构

建议目录：

```text
packages/knowledge/m-ed/

├── scenarios/
│   ├── partner-entry.yaml
│   ├── financing.yaml
│   ├── option-pool.yaml
│   ├── founder-conflict.yaml
│   └── exit.yaml
│
├── cases/
│   ├── startup/
│   ├── restaurant/
│   ├── saas/
│   └── franchise/
│
├── rules/
│   ├── control.yaml
│   ├── dilution.yaml
│   ├── fairness.yaml
│   └── governance.yaml
│
├── experts/
│   ├── founder.yaml
│   ├── investor.yaml
│   └── governance.yaml
│
└── strategies/
    ├── equity-grant.yaml
    ├── vesting.yaml
    └── incentive.yaml
```

这 5 层不是并列知识堆。

它们分别对应 Runtime 中的 5 个判断步骤：

1. `scenarios/` 识别当前企业遇到了什么问题
2. `cases/` 找相似处理经验
3. `rules/` 发现控制、公平、治理风险
4. `experts/` 引入不同治理立场
5. `strategies/` 输出可执行股权方案

---

## 四、第一类资产：Scenario Library

这是 M-ED 最核心的一层。

因为用户不是来“学股权”。

用户是：

> 遇到了一个真实治理问题

例如：

- 新合伙人加入
- 融资要不要让股
- 员工激励怎么给
- 创始人之间出现分歧
- 连锁扩张如何分权

### 作用

Scenario Library 直接驱动：

```text
Scenario Matcher
```

它负责把用户输入从“自然语言问题”压成“标准治理场景”。

### Scenario Schema

例如：`partner-entry.yaml`

```yaml
id: partner_entry

name: 新合伙人加入

trigger:
  - 技术合伙人加入
  - 高管加入
  - 核心人才引入

questions:
  - 对方贡献是什么？
  - 是否全职？
  - 是否投入资金？
  - 是否承担长期责任？

risk_dimensions:
  control:
    weight: 30
  fairness:
    weight: 25
  incentive:
    weight: 25
  governance:
    weight: 20

solutions:
  - immediate_equity
  - vesting_equity
  - profit_share
```

### 统一协议建议

```ts
type EquityScenario = {
  id: string;
  name: string;
  trigger: string[];
  questions: string[];
  riskDimensions: {
    control?: { weight: number };
    fairness?: { weight: number };
    incentive?: { weight: number };
    governance?: { weight: number };
  };
  solutions: string[];
};
```

### V2 要求

- 场景必须结构化
- 每个场景必须有触发条件
- 每个场景必须定义追问问题
- 每个场景必须显式映射风险维度
- 每个场景必须列出允许调用的方案模式

---

## 五、第二类资产：Case Library

这是 M-ED 专业感的来源。

不是“新闻案例收藏”。

而是：

> 在什么企业阶段、什么问题下、如何设计股权结构、结果如何

### Case Schema

```yaml
case_id: restaurant_partner_001

industry: 餐饮

stage: early

problem: 厨师合伙人加入

initial:
  founder: 80%
  partner: 20%

issue: 贡献价值无法量化

solution: 10% + 4年vesting

result: 稳定合作5年

lesson: 核心人才股份必须绑定长期贡献
```

### 统一协议建议

```ts
type EquityCase = {
  caseId: string;
  industry: string;
  stage: string;
  problem: string;
  initial: Record<string, string>;
  issue: string;
  solution: string;
  result: string;
  lesson: string;
};
```

### Case Library 的价值

- 给用户“真实咨询感”
- 给 Decision Engine 提供相似处理路径
- 让专家判断不只依赖规则，而是依赖经验

### V2 要求

- 案例必须结构化
- 必须包含问题、初始结构、方案、结果、教训
- 不能只写成功案例，必须包含失败案例和代价

---

## 六、第三类资产：Expert Judgment Library

这层是 M-PNT 的思想复制。

不是让 LLM 随机扮演专家。

而是：

> 给每种专家角色一套稳定的判断原则、警告模式和优先级

### 1. Founder Expert

```yaml
role: 创始人保护专家

principles:
  - 控制权优先
  - 长期价值优先
  - 避免一次性释放

common_warnings:
  - 过早稀释
  - 平分股份
  - 无退出机制
```

### 2. Investor Expert

```yaml
role: 投资与激励专家

principles:
  - 激励关键人才
  - 保持融资空间
  - 结构清晰
```

### 3. Governance Expert

```yaml
role: 治理结构专家

principles:
  - 权责匹配
  - 规则透明
  - 提前约定退出
```

### 统一协议建议

```ts
type EquityExpertProfile = {
  role: string;
  principles: string[];
  commonWarnings?: string[];
  preferredPatterns?: string[];
};
```

### 这层的作用

- 把“专家视角”从 Prompt 变成知识资产
- 保证不同轮次判断风格稳定
- 支撑 M-ED Frontend Workspace 中的“专家讨论”

---

## 七、第四类资产：Risk Rule Engine

规则层不是为了回答概念。

是为了：

> 发现当前股权结构中隐藏的问题

### 规则示例 1：控制权风险

```yaml
rule: founder_equity < 50

risk: 控制权下降

severity: high

recommendation: 建立控制机制
```

### 规则示例 2：平分股份风险

```yaml
condition: founders_equal = true

risk: 重大决策僵局

recommendation: 设计最终决策机制
```

### 统一协议建议

```ts
type EquityRiskRule = {
  id: string;
  condition: string;
  risk: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
  tags?: string[];
};
```

### 风险维度建议

M-ED V2 统一使用 4 个维度：

1. `control` 控制权
2. `fairness` 公平性
3. `incentive` 激励有效性
4. `governance` 治理稳定性

### 这层的价值

- 让 AI 能系统发现问题，而不是“凭感觉提醒”
- 让每一轮建议都可追溯到规则证据
- 为 `DecisionTrace` 提供结构化风险来源

---

## 八、第五类资产：Solution Pattern Library

很多 AI 的问题是：

能发现问题，但不知道怎么解决。

M-ED 不行。

它必须知道：

> 面对不同治理问题，有哪些标准化、可执行的方案模式

### 示例：Vesting

```yaml
strategy: vesting

period: 48 months

cliff: 12 months

purpose: 绑定长期贡献
```

### 示例：Profit Share

```yaml
strategy: profit_share

purpose: 不直接释放股权，先绑定结果

applicable_for:
  - 外部经营合伙人
  - 区域负责人
  - 短中期合作角色
```

### 统一协议建议

```ts
type EquitySolutionPattern = {
  strategy: string;
  purpose: string;
  period?: string;
  cliff?: string;
  applicableFor?: string[];
  requiredClauses?: string[];
};
```

### V2 原则

方案库输出的不是一段建议文字。

而是：

**可执行治理方案模式**

---

## 九、Knowledge -> Runtime 的进入方式

最终链路：

```text
用户输入

↓

Scenario Matcher

↓

Case Retrieval

↓

Risk Engine

↓

Expert Perspective

↓

Solution Pattern

↓

Decision
```

### 对应 Runtime 模块

| Runtime 节点 | 知识资产来源 |
| --- | --- |
| Scenario Matcher | `scenarios/` |
| Case Retrieval | `cases/` |
| Risk Engine | `rules/` |
| Expert Perspective | `experts/` |
| Solution Generator | `strategies/` |
| Equity Decision | 上述所有层聚合 |

### 输出物

这条链最后输出的不是解释。

而是：

```text
Equity Decision
```

包含：

- 当前场景判断
- 风险诊断
- 专家分歧
- 建议方案
- 决策说明

---

## 十、和 M-PNT / M-MKT 的统一架构

现在三个 Agent 的知识体系统一为：

### M-PNT

知识：

- 品牌理论
- 品类案例
- 定位原则

输出：

```text
Brand Decision
```

### M-MKT

知识：

- 市场数据
- 行业规律
- 机会模型

输出：

```text
Market Decision
```

### M-ED

知识：

- 股权场景
- 治理规则
- 案例模式
- 专家判断
- 方案结构

输出：

```text
Equity Decision
```

### 三者统一为

```text
Knowledge

↓

Reasoning Engine

↓

Decision Protocol

↓

Workspace

↓

Memory
```

这一步很重要。

因为 MealKey 未来不是四个孤立工具。

而是：

**四个共享认知结构的 AI 咨询部门**

---

## 十一、M-ED Knowledge Asset V2 优先级

不要一开始做大而散。

建议分 4 个阶段推进。

### Phase 1（必须）

完成：

#### Scenario Library

先做 20 个高频场景。

至少包括：

1. 新合伙人加入
2. 老员工激励
3. 融资稀释
4. 创始人分裂
5. 股权调整
6. 退出机制
7. 家族企业接班
8. 连锁扩张合伙

### Phase 2

完成：

#### Case Library

先做 50 个结构化案例。

行业优先级建议：

- 餐饮
- 连锁
- 初创
- 加盟

### Phase 3

完成：

#### Expert Judgment Library

先把 3 类专家角色固定下来：

- Founder
- Investor
- Governance

### Phase 4

完成：

#### Solution Pattern Library

优先覆盖：

- vesting
- immediate equity
- option pool
- profit share
- buyback
- exit arrangement

---

## 十二、V2 最终判断

M-ED V2 的核心不是：

> 增加多少股权知识

而是建立：

> 遇到什么企业问题，经过什么判断，参考什么案例，由什么专家视角，最终形成什么治理方案

这才是真正的：

**Equity Intelligence Engine**

---

## 十三、与前端工作台的关系

这份知识系统不是孤立存在。

它会直接决定后续 M-ED Workspace 的体验结构：

1. 用户先进入场景诊断
2. AI 匹配治理场景
3. AI 展开历史案例与风险判断
4. 三位治理专家给出不同处理立场
5. AI 压成治理共识
6. 最终生成可执行股权方案

所以 M-ED 前端不应该是：

```text
股权分析页面
```

而应该是：

```text
股权顾问工作台
```

---

## 十四、下一步

下一步应该进入：

# 《M-ED Frontend Workspace V2 设计》

重点不是页面好不好看。

而是：

**如何把这套股权决策知识系统，变成用户可参与、可理解、可确认的咨询流程。**

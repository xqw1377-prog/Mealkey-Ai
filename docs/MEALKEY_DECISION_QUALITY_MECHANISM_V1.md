# MealKey 决策质量提升机制 V1.0（冻结）

> **状态：正式冻结（Freeze）— DIE 与 GPT 的根本差异层**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md`  
> **数据契约：** `MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md`  
> **一句话：** 流程解决「怎么做一次决策」；本层解决「**怎么让决策越来越准**」。

---

## 〇、壁垒定义（冻结）

真正的经营系统必须具备：

```text
决策 → 执行 → 结果 → 学习 → 下一次决策提升
```

| GPT | MealKey |
|-----|---------|
| 每次重新回答 | Pre-Score → 执行 → Post-Score → 偏差学习 |
| 无本店经验 | Similar Decision Memory |
| 装懂 | 明示不确定因素 |
| 单答案 | Challenge + Counterfactual |

目标能力层级：**Level 5 经营大脑**（见 §八），不是停在 Level 3 决策助手。

---

## 一、Decision Quality Score（核心指标）

每一次决策必须产生质量评分，不是简单日志。

### 1.1 组成（冻结）

```text
Decision Quality Score ≈
  信息完整度
+ 问题定义准确度
+ 方案合理度
+ 风险控制能力
+ 执行结果（仅 Post）
```

### 1.2 Pre vs Post（冻结）

| 阶段 | 名称 | 时机 | 含执行结果？ |
|------|------|------|--------------|
| 裁决前 | **Pre-Decision Score** | DELIBERATING → DECIDED | 否（预测质量） |
| 验证后 | **Post-Decision Score** | LEARNING | 是（实际质量） |

```text
预测评分（Pre）
      ↓
实际结果
      ↓
偏差分析（Δ = Post − Pre 及因子拆解）
      ↓
模型 / 权重 / 先验学习
```

字段见数据契约 `DecisionQualityScoreV1`。

**展示：** 决策室「决策信心」= Pre；Journey / 档案展示 Post + 偏差一句。

---

## 二、Evidence Weight（证据权重）

不是所有信息价值一样。

| 示例 | 参考 sourceTrust |
|------|------------------|
| 「感觉生意不好」（老板主观） | ~0.30 |
| POS：30 天营业额 ↓15% | ~0.90 |
| 近 50 条评价价格敏感 | ~0.75 |
| 历史相似案例 | ~0.70 |

```text
evidenceWeight =
  sourceTrust × timeFreshness × relevance
```

（实现可再乘采集 confidence；无来源 weight=0。）

进入事实层主列必须 `weight ≥ 阈值`；低权证据可进「弱信号」折叠区。

---

## 三、Decision Confidence Model（决策信心模型）

输出不是「建议这样做」，而是：

```text
决策信心：82 分

为什么：
  事实完整 90
  外部信息 80
  历史匹配 85
  风险未知 60   ← 明示不知道

主要不确定因素：
  店长执行能力
```

**铁律：** 优秀系统不是装懂，而是知道**哪里不知道**。  
`unknownFactors[]` 必填至少 0～3 条；高未知 → suggestion 偏向 `defer` / `proceed_with_conditions`。

与 Pre-Score 因子对齐；UI 用「决策信心」文案。

---

## 四、Similar Decision Memory（相似决策记忆）

Restaurant Brain 最大决策价值：

```text
过去 Case A：单店盈利下降 → 调菜单 → 90 天利润 +18%
      ↓
新店出现类似 Signal
      ↓
相似度 87% · 过去方案有效把握：高/中（有样本才给%）
```

写入 Context.`similarMatches`；供路径分档、反驳提示、常委 lessonLine。  
**GPT 没有这个。**

---

## 五、Counterfactual Engine（反事实引擎）

重大决策必须回答：**如果失败，为什么？**

```text
开第二家店 — 失败路径分解（有样本/规则才量化）
  组织能力不足 …
  现金压力 …
  选址错误 …
  市场变化 …
      ↓
反推门槛：
  店长独立经营能力未达阈值前，不建议扩张
```

输出：`CounterfactualV1` → 挂选中 Option / Challenge；门槛写入 `requiredCapability` 与裁决条件。  
**禁止**无样本时伪造精确失败概率表；可用分档或「主要失败模式排序」。

---

## 六、Decision Challenge Protocol（攻击协议）

七常委 = **决策攻击系统**（非顾问群聊）：

```text
方案生成 → 攻击 → 发现漏洞 → 方案修正 → 再次评估（更新 Pre-Score）
```

攻击维度例：利润（CFO）· 品牌（CMO）· 复杂度（COO）· 食安/合规（CRO）· 战略（CSO）。  
最终：更强方案 + 更新后的决策信心，不是七段作文。

---

## 七、Decision Evolution Loop（进化飞轮）

```text
一次决策
  → 产生结果
  → 比较预测与现实（Pre vs Post）
  → 发现误差
  → 更新判断模型（权重 / 先验 / Learning）
  → 下一次更准确
```

跨店规律（未来，权限默认关闭）例：

```text
3 店以内：老板亲自管控往往更好
超过 5 店：需要区域经理
```

→ 属 **经营经验**（经 Memory Permission），不是互联网常识。  
V1 先做 **单店 / 单老板** 进化；行业聚合后置且默认 opt-in。

**Evolution Engine** = 本飞轮的规则+写回编排，**不是**第七 Runtime / 新顾问席。

---

## 八、能力五级（产品路标）

| Level | 名称 | 能力 |
|-------|------|------|
| 1 | 信息助手 | 知道发生了什么 |
| 2 | 分析助手 | 解释为什么 |
| 3 | 决策助手 | 提供方案 |
| 4 | 决策伙伴 | 挑战方案、模拟未来、反事实 |
| 5 | 经营大脑 | 长期学习老板与餐厅，Pre/Post 进化 |

**MealKey 目标：奔向 Level 5，不满足于 Level 3。**  
V1.0 验收至少稳定在 **Level 4 可感**，Level 5 飞轮可演示（同店二次决策变准）。

---

## 九、架构收敛（冻结）

```text
           Decision Center
                 |
       Decision Intelligence Engine
       ------------+------------
       |           |           |
   Evidence    Reasoning    Learning
       |           |           |
    M-INTEL     七常委    Decision Memory
                 |
          Restaurant Brain
                 |
              M-EXEC
                 |
         Execution Feedback
                 |
         Evolution Engine（本机制）
```

---

## 十、工程切片

| 切片 | 内容 |
|------|------|
| **Q0** | 本文 + 数据契约对齐 |
| **Q1** | Pre-Score 纯函数 |
| **Q2** | Evidence weight |
| **Q3** | Similar match → Context |
| **Q4** | Counterfactual + Challenge 回写 Score |
| **Q5** | Post-Score + Δ + Learning 写 Brain |

数据模型 SSOT：`MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md`。

---

**一句话：**  
质量机制让 MealKey 拥有 **预测—验证—纠偏** 的经营经验，而不是一次性聪明的措辞。

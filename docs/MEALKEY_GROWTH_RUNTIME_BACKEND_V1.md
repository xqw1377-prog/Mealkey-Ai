# MealKey Growth Runtime 后端设计 V1（冻结）

> **状态：正式冻结（Freeze）— Founder OS 经营者成长操作系统**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `docs/MEALKEY_RUNTIME_LAYER_V1.md`  
> **上游：** Decision · Execution · Memory  
> **下游：** 反向增强 Decision（建议议题 / 加强某席）；不改 MKDecision 正文  
> **用户侧收口：** `docs/FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md`（八维投影进 Intelligence Profile；BehaviorSignal → GrowthEvent）  
> **冲突裁决：** **不是**在线课程 / 商学院 / 知识平台；**不是** `M-GROW` 顾问席

---

## 一、核心定位

> **Growth Runtime 是基于经营行为、决策质量和结果反馈，持续提升经营者能力的成长系统。**

前面三个 Runtime：

| Runtime | 作用 |
|---------|------|
| Decision | 帮老板做更好的决策 |
| Execution | 帮老板把决策执行下去 |
| Memory | 帮企业积累经验 |

Growth 回答核心问题：

> **老板本人有没有因为这些决策和经历而变得更强？**

决定 MealKey 是「企业咨询工具」还是真正的 **Founder OS（经营者成长操作系统）**。

**传统：** 学知识 → 尝试 → 失败 → 靠自己总结（慢）。  
**MealKey：** 经营问题 → AI 分析 → 决策 → 执行结果 → 能力评价 → 针对性提升 → 下一次决策更好。

---

## 二、核心对象：Founder Capability Profile

核心不是「用户账号」，而是 **经营者能力模型**。

---

## 三、Founder Capability Model（八维 · 冻结）

```
Founder Capability
        │
 ┌──────┼──────┐
战略 · 市场 · 品牌 · 商业 · 财务 · 组织 · 执行 · 学习
```

| 维度 | 判断什么 | 主要数据来源 |
|------|----------|--------------|
| **战略能力** | 长期方向、趋势、竞争优势 | Decision Runtime |
| **市场能力** | 用户理解、市场洞察、竞争分析 | M-MKT 调用 / 验证 |
| **品牌能力** | 定位、品牌建设、心智竞争 | M-PNT |
| **商业能力** | 模型设计、盈利结构、增长逻辑 | M-BIZ |
| **财务能力** | 成本意识、现金流、投资回报 | M-BIZ + Result |
| **组织能力** | 人才、管理、激励 | M-ED + Execution |
| **执行能力** | 计划、推进、复盘 | M-EXEC |
| **学习能力** | 吸收经验、调整认知 | Memory Runtime |

---

## 四、Capability Score（能力评分）

不是拍脑袋打分。

```typescript
interface CapabilityScore {
  capability: string; // 八维之一
  score: number; // 0–100
  confidence: number; // 0–1，证据不足则低
  evidence: string[]; // 可追溯摘要
  trend: "up" | "down" | "stable";
}
```

示例：商业能力 72 · trend up · evidence「3 次模型调整 / 2 次成功验证」。

**现网过渡：** 四能力分（cognition/decision/execution/growth）可双写，逐步投影到八维。

---

## 五、成长评价 ≠ 结果评价（铁律）

老板赚多少钱 **≠** 能力。第一次创业成功可能是运气。

因此引入：

## Decision Quality Score（决策质量）

一次决策评价三维：

```
判断质量 + 过程质量 + 结果质量
```

加权模型（冻结）：

```
Decision Score =
  30% 判断依据
+ 30% 执行质量
+ 40% 最终结果
```

示例：开店失败，但因市场突变且判断过程合理 → 决策分可仍为 80，**不**简单判能力低。

窗口聚合（如近 10 次）→ 失败簇（如市场判断弱）→ 建议加强 M-MKT。

```typescript
interface DecisionQualityScore {
  ownerId: string;
  windowSize: number;
  avgScore: number;
  confirmed: number;
  partial: number;
  invalidated: number;
  failureClusters: string[];
  summary: string;
  updatedAt: string;
}
```

---

## 六、Growth Event（成长事件）

成长来自事件，不是来自刷课。

```typescript
interface GrowthEvent {
  id: string;
  ownerId: string;
  type: "decision" | "failure" | "success" | "learning" | "feedback";
  impact: string;
  capabilityChanges: Array<{
    capability: string;
    change: number; // 可负
    reason?: string;
  }>;
  sourceDecisionId?: string;
  createdAt: string;
}
```

示例：新品失败 → 用户洞察不足 → `{ capability: "市场能力", change: -5 }`。

现网：`CognitiveGap` / `DecisionPattern` / `refreshGrowthAfterValidation` 可作为 GrowthEvent 的生产者投影。

---

## 七、Growth Loop（成长循环）

```
经营事件 → 能力分析 → 发现短板
    → 生成成长任务 → 再次经营验证 → 能力提升
```

---

## 八、Growth Task（经营能力训练任务）

**不是**学习任务 / 推荐课程。  
而是：**真实经营能力训练**。

发现品牌定位弱 → 要求完成一次真实定位项目（开会走 M-PNT），不是买课。

```typescript
interface GrowthTask {
  id: string;
  capability: string;
  goal: string;
  action: string;
  validation: string;
  status: "proposed" | "active" | "done" | "abandoned";
  suggestExpert?: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
}
```

案例：财务弱 / 常低估成本 → 完成 3 个项目成本预测 → 验证：预测误差 < 10%。

---

## 九、Founder Growth Report（能力报告）

个人经营体检：

```
当前阶段：创业扩张期
优势：品牌能力强
短板：财务模型
关键建议：未来 90 天提升商业测算能力
```

Brief「成长下一步」与能力页消费此报告（现网 `founderGrowth` / Gap / Path 为雏形）。

---

## 十、数据库设计

### 逻辑表

| 表 | 关键列 |
|----|--------|
| **founder_capabilities** | id, owner_id, capability, score, confidence, updated_at |
| **growth_events** | id, owner_id, type, source, impact, created_at |
| **growth_tasks** | id, owner_id, capability, goal, status, validation |
| **capability_history** | id, owner_id, capability, before_score, after_score, reason |

### V1 落地映射（诚实）

| 逻辑 | 现网 | 目标 |
|------|------|------|
| founder_capabilities | `profile.lastCapabilityScores` + Growth scoring | 双写八维；可后拆表 |
| growth_events | DecisionPattern / CognitiveGap / memory learning | 统一投影 `GrowthEvent` |
| growth_tasks | `learningNext` / GrowthPath 文案 | 结构化 GrowthTask |
| capability_history | 部分在 scores.trend | 追加 history 数组或表 |

**不新建**必选 Prisma 表即可启动 MVP；有迁移窗口再拆表。

---

## 十一、与其他 Runtime 关系

```
Decision → Execution → Result → Memory
                              ↓
                         Growth Runtime
                         分析老板能力变化
                              ↓
                      反向增强 Decision
                   （建议议题 / 加强某席）
```

| 方向 | 规则 |
|------|------|
| Growth → L1 | 仅 `recommendedExpertCalls` / 复会 CTA |
| Growth → MKDecision | **禁止**改 conclusion / 战略终局 |
| Growth → 计费 | 不得包装成强制上课扣点 |

---

## 十二、MVP（P0）

### 必须

1. Founder Capability Model（八维契约）  
2. Capability Score（含 evidence / trend）  
3. Growth Event（从验证/学习投影）  
4. Growth Report（Brief / 能力页可读）  

### 暂时不做

- ❌ 自动培养课程  
- ❌ 社区 / 商学院  
- ❌ 游戏化积分  

### 工程切片

| 序 | 切片 | 验收 |
|----|------|------|
| G1 | 八维 + CapabilityScore 契约扩展 | 类型 + 映射四维→八维 |
| G2 | Decision Quality（30/30/40）聚合 | 单测 + profile 字段 |
| G3 | GrowthEvent 从 validation/learned 投影 | 可列表 |
| G4 | GrowthTask + Report 写入 Brief | 可点开会建议 |
| G5 | （已有）CognitiveGap / Path 保持 | 不回退 |

**已落地指针：** `capability/growth/*` · `growthRuntime.getSnapshot` · Brief 成长块。

---

## 十三、第二层 Runtime 进度（对照）

```
Founder OS → 四大能力 Agent → Runtime Layer
  ✅ Decision
  ✅ Execution
  ✅ Memory（设计冻结）
  ✅ Growth（本设计冻结；代码加深中）
  ⬜ Risk
  ⬜ Opportunity
```

---

## 十四、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-18 | 初冻八维与 Quality |
| V1-freeze-final | 2026-07-18 | 对齐终稿：Decision Quality 权重、GrowthEvent/Task/Report、库表、MVP |

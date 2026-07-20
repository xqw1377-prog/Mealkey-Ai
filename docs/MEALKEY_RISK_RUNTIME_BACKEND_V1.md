# MealKey Risk Runtime 后端设计 V1（冻结）

> **状态：正式冻结（Freeze）— 经营风险感知系统**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `docs/MEALKEY_RUNTIME_LAYER_V1.md`  
> **对称篇：** `docs/MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md`  
> **冲突裁决：** Risk **不是**财务软件 / ERP 预警 / BI；**不是**专家顾问席；发现问题 → 触发复核/Decision，**自己不执行战略终局**

---

## 一、核心定位

> **Risk Runtime 是 MealKey 的企业经营风险感知系统，持续监测战略、市场、品牌、商业、财务、执行等风险，并在风险扩大前触发干预。**

补齐后，第二层 Runtime 才形成完整「经营大脑」的避坑半边。

| 前面 Runtime | 作用 |
|--------------|------|
| Decision | 做正确判断 |
| Execution | 推动行动发生 |
| Memory | 记住过去经验 |
| Growth | 提升老板能力 |
| **Risk** | **在错误发生之前，发现风险** |

**传统：** 问题出现 → 老板发现 → 处理（通常已晚）。  
**MealKey：** 经营信号 → 风险识别 → 评级 → 专家复核 → 提前调整。

它是 **AI 经营风险判断系统**，不是 ERP/BI。

---

## 二、信息基座（不孤立判断）

Risk 基于五类信息：

```
Decision · Execution · Memory · Growth · Industry
```

---

## 三、六大风险域（冻结）

```
Enterprise Risk
1. Strategic Risk      战略风险
2. Market Risk         市场风险
3. Brand Risk          品牌风险
4. Business Model Risk 商业模式风险
5. Financial Risk      财务风险
6. Execution Risk      执行风险
```

| 域 | 回答 | 主来源 | 示例 |
|----|------|--------|------|
| **Strategic** | 方向是不是错了？ | Decision + Memory 禁区 | 进高端商场 vs 历史高租金失败 3 次 → HIGH |
| **Market** | 用户和市场变了吗？ | M-MKT / 趋势信号 | 健康趋势 vs 重口味心智 → 品类老化 |
| **Brand** | 心智是否冲突/稀释？ | M-PNT | 同时高端宴请 + 低价套餐 → 心智冲突 |
| **Business** | 赚钱逻辑是否失效？ | M-BIZ / Validation | 假设 300 单 / 实际 150 → 模型失效 |
| **Financial** | 现金流是否断裂？ | 财务事实 / Memory | 90 天支出 300 万 / 现金 200 万 |
| **Execution** | 计划与现实差距？ | M-EXEC Deviation | 计划 60 天开店 / 30 天仅完成 20% |

---

## 四、RiskAlert（核心实体）

```typescript
type RiskType =
  | "strategic"
  | "market"
  | "brand"
  | "business"
  | "financial"
  | "execution";

type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskAlert {
  id: string;
  ownerId: string;
  projectId: string;
  type: RiskType;
  level: RiskLevel;
  title: string;
  description: string;
  evidence: string[];
  source: string; // deviation | validation | memory | rule | …
  /** 0–100，见 §五 Risk Score */
  score?: number;
  suggestExpert?: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
  suggestCouncil?: boolean;
  suggestedTopic?: string;
  status: "open" | "reviewing" | "resolved";
  createdAt: number; // epoch ms 或 ISO 均可，实现统一 ISO
}
```

---

## 五、Risk Score 模型

```
Risk Score = Probability × Impact × Exposure
（各 0–1，乘积 ×100 → 0–100）
```

| 分数 | 等级 |
|------|------|
| 0–20 | low |
| 20–50 | medium |
| 50–80 | high |
| 80+ | critical |

示例：开店失败 概率 0.6 × 影响 0.9 × 暴露 0.8 → 43.2 → medium。

**CRITICAL 必须有 evidence**；禁止无来源恐吓。

---

## 六、Risk Detection Engine（三层）

| Layer | 机制 | 示例 |
|-------|------|------|
| **1 规则** | 确定性阈值 | 现金储备 < 3 个月固定成本 |
| **2 案例** | Memory 匹配历史失败 | 高租金模型失败 ×3 |
| **3 AI/专家** | 建议召回席位或七常委 | 品牌心智冲突 → M-PNT+M-MKT |

```
Rule + Memory + Expert → Risk Decision（评级与路由，非战略终局）
```

---

## 七、Risk Review（复核，非单 Agent 独断）

高/严重风险：邀请相关席 + 必要时战略常委，输出 **Risk Opinion**（可进七常委）。

对齐权限模型：战略变轨 / 重大利益 → 必须召回七常委。

---

## 八、Risk Event

```typescript
interface RiskEvent {
  type: "detected" | "confirmed" | "mitigated" | "closed";
  riskId: string;
  source: string;
  timestamp: number;
}
```

流程：

```
发现风险 → Alert → 委员会确认 → 生成 Action / Decision Request
    → M-EXEC 执行验证或缓解 → 关闭
```

**Risk 发现问题；M-EXEC 解决问题。Risk 自己不执行战略。**

示例：用户接受度下降 → Decision Request → M-MKT 重分析 → M-EXEC 验证。

---

## 九、数据库设计

### 逻辑表

| 表 | 列 |
|----|-----|
| **risk_alerts** | id, owner_id, project_id, type, level, title, description, status, score, created_at |
| **risk_evidence** | id, risk_id, source, content, confidence |
| **risk_events** | id, risk_id, event_type, payload, timestamp |

### V1 落地

| 策略 | 说明 |
|------|------|
| 起步 | `profile.openRiskAlerts[]` + 复用 `lastDeviationReport` 投影 |
| 后续 | 拆物理表；evidence/events 可 JSON 起步 |

---

## 十、MVP（P0）

### 必须

1. Risk Entity（六域 type）  
2. Risk Rule Engine（至少：现金流月数、验证 invalidated、Deviation medium+、Memory 禁区冲突）  
3. Risk Alert 生成与列表  
4. Risk → Decision Request（复会 / 建议席 CTA，不自动扣点）  

### 暂时不做

- ❌ 实时 POS 监控  
- ❌ 自动全量财务分析  
- ❌ 全行业实时情报  

### 工程切片

| 序 | 切片 | 验收 |
|----|------|------|
| R1 | `contracts/risk-runtime.ts` 六域 + Score | 类型 + 分级单测 |
| R2 | Rule：验证 off / Deviation → Alert | 投影函数 |
| R3 | Memory 禁区冲突 → strategic HIGH | 单测 |
| R4 | `riskRuntime.listOpen` | tRPC |
| R5 | Brief 合并 Risk/Deviation | UI |
| R6 | confirmed → Decision Request CTA | 不开会代扣 |

**与旧四维文档：** 以本篇六域为准；旧「组织风险」并入 execution / 必要时 strategic。

---

## 十一、完整 Runtime 进度

```
Decision ✅ → Execution ✅ → Memory ✅ → Growth ✅ → Risk ✅（本篇）
→ Opportunity ⬜
```

---

## 十二、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-18 | 初冻四维雷达 |
| V1-freeze-final | 2026-07-18 | 对齐终稿：六大风险域、Score 公式、三层检测、Review、MVP |

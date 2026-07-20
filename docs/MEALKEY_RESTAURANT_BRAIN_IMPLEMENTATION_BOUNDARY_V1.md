# Restaurant Brain V1 — 后端实现边界（冻结）

> **状态：正式冻结（Freeze）— DeepCode 开发不得偏离**  
> **日期：** 2026-07-18  
> **上级：** `MEALKEY_RESTAURANT_BRAIN_TECHNICAL_V1.md` · `MEALKEY_RESTAURANT_BRAIN_V1.md`  
> **代码真源：** `packages/restaurant-brain`  
> **本阶段目标：** 冻结实现边界与契约；**不是**写完整业务代码。

---

## 1. 核心定位（冻结）

Restaurant Brain **不是**：

- Agent  
- 聊天模块  
- 通用知识库  

Restaurant Brain **是**：

> **MealKey 内部所有智能能力共享的餐厅认知基础设施。**

职责：

1. 存储餐厅事实  
2. 记录经营变化  
3. 沉淀决策历史  
4. 形成老板 / 能力画像  
5. 生成 Agent 上下文  
6. 驱动系统进化（规则 V1）  

---

## 2. 架构位置（冻结）

```text
packages/
├── agent-sdk
├── agent-runtime
├── mealkey-core
├── agents
└── restaurant-brain   ⭐ 认知底座（SSOT）
```

调用关系：

```text
                 Restaurant Brain
                        |
     ------------------------------------
     |        |         |         |
   M-PNT    M-MKT     M-BIZ     M-ED
            |
     Founder Council
            |
          M-EXEC
            |
    Evolution Engine
```

**禁止：** 在 `packages/agents` 内新建平行「餐厅档案」表或私有 JSON 真相。

---

## 3. 目标模块结构（DeepCode 对齐）

实现时应收敛到下列目录（现有文件可逐步搬迁，**契约名不变**）：

```text
packages/restaurant-brain/src/
├── domain/
│   ├── types.ts              # 全量 Entity（已有）
│   ├── restaurant.ts         # Profile 再导出 / 校验（可选拆分）
│   ├── brand.ts
│   ├── business.ts
│   ├── capability.ts
│   ├── decision.ts
│   └── learning.ts
├── context/
│   ├── context-types.ts      # RestaurantContext（Agent 眼睛）
│   └── context-builder.ts    # buildRestaurantContext
├── memory/
│   ├── decision-memory.ts
│   ├── action-memory.ts
│   └── learning-memory.ts
├── evolution/
│   ├── evolution-engine.ts
│   └── pattern-detector.ts   # V1 规则模式，非 ML
├── service/
│   └── restaurant-brain-service.ts  # 统一入口接口
├── events/
│   └── brain-event.ts
├── api/
│   ├── memory-api.ts
│   └── context-api.ts
├── repository/               # 接口；Prisma 实现在 apps/web
└── index.ts
```

Web 侧只做 Prisma 实现 + HTTP/tRPC 适配，**不重新定义实体**。

---

## 4. 统一服务入口（冻结）

所有 Agent 只依赖此接口（或由其派生的 Context API）：

```typescript
interface RestaurantBrainService {
  getRestaurantContext(restaurantId: string): Promise<RestaurantContext>;
  updateKnowledge(event: BrainEvent): Promise<void>;
  recordDecision(decision: DecisionRecord): Promise<void>;
  learn(learning: LearningMemory): Promise<void>;
}
```

真源：`packages/restaurant-brain/src/service/restaurant-brain-service.ts`

与已有 API 关系：

| 本接口方法 | 落点 |
|------------|------|
| getRestaurantContext | Context Builder → `RestaurantContext` |
| updateKnowledge | 消化 `BrainEvent` → Memory/DNA/Capability |
| recordDecision | Decision Memory API |
| learn | Learning Memory API |

---

## 5. Context Builder（最关键 · 冻结）

**作用：** 把复杂餐厅信息变成 Agent 能用的「眼睛」。

输入：`restaurantId`（V1 = projectId）  
输出：`RestaurantContext`

```typescript
type RestaurantContext = {
  restaurantProfile: RestaurantProfile;
  brandUnderstanding: BrandDnaFields;
  businessStatus: BusinessContext;
  marketStatus: MarketDnaFields;
  founderProfile: FounderDnaFields;
  capabilityScore: CapabilityProfile;
  recentDecisions: DecisionRecord[];
  activeRisks: string[];
  growthOpportunities: string[];
  /** prompt 用短文 */
  priorBlock: string;
  unknowns: string[];
  evolution: EvolutionState;
};
```

示例（加盟议题）：

```text
品牌：湘菜 · 阶段：3店增长期
优势：产品强
风险：组织能力不足
老板：行动型
历史：一次扩张失败
当前能力：65
```

`priorBlock` 必须由 Builder 生成；Agent **不得**自己拼餐厅事实。

---

## 6. Event System（冻结）

靠事件进化，不靠人工改库。

```typescript
enum BrainEventType {
  DECISION_CREATED = "DECISION_CREATED",
  DECISION_COMPLETED = "DECISION_COMPLETED",
  ACTION_COMPLETED = "ACTION_COMPLETED",
  BUSINESS_CHANGED = "BUSINESS_CHANGED",
  CAPABILITY_CHANGED = "CAPABILITY_CHANGED",
  USER_INSIGHT = "USER_INSIGHT",
  AI_DISCOVERY = "AI_DISCOVERY",
  DNA_PATCH = "DNA_PATCH",
}
```

```typescript
type BrainEvent = {
  id?: string;
  restaurantId: string;
  type: BrainEventType;
  payload: Record<string, unknown>;
  source: string; // meeting | exec | manual | agent | consulting
  at: string;
};
```

例：新品测试完成 → `ACTION_COMPLETED` → Brain 更新产品/业务认知。

落库：`BrainEvent` 表（审计流）；DNA 细粒度变更仍可写 `RestaurantDnaEvent`。

---

## 7. Decision / Learning / Evolution（边界）

### Decision Memory

创建时保存：背景快照、AI 判断、七常委意见、预期结果、老板选择。  
HTTP 形态（可选适配）：`POST /api/brain/decision`（实现可挂 tRPC）。

### Learning Engine（V1 = 规则）

输入：历史 Decision + Action + Result  
输出：`LearningMemory`（pattern / insight / confidence）

例：

```text
Expansion_Risk_Pattern
condition: organizationScore < 70
recommendation: 禁止快速扩张
confidence: 0.82
```

**禁止 V1 上复杂预测模型 / 独立学习 Agent。**

### Evolution Engine（V1 = 规则）

输入：Decision / Action / Result  
输出：New Insights / Risks / Recommendations（写入 Learning + EvolutionState + activeRisks 投影）

---

## 8. Prisma 表映射（冻结）

概念名 → **实际表**（不得再发明第三套）：

| 概念 | Prisma Model | 说明 |
|------|--------------|------|
| Restaurant / Profile | `RestaurantBrain` | 一 project 一行；身份字段在列上 |
| BrandProfile | `RestaurantBrain.dnaJson` → brand | 不另建 Brand 表（V1） |
| BusinessProfile | `businessContextJson` | |
| CapabilityProfile | `capabilityJson` | |
| DecisionRecord | `DecisionMemory` | |
| ActionRecord | `ActionMemory` | |
| LearningRecord | `LearningMemory` | |
| EvolutionState | `evolutionJson` | |
| BrainEvent（流） | `BrainEvent` | 统一事件审计 |
| DNA 字段级审计 | `RestaurantDnaEvent` | 保留 |

**原则：** Agent 不建表；统一写 Restaurant Brain 数据。

---

## 9. V1 范围冻结

### 必须实现（DeepCode）

- [x] 契约：Profile / Context / Decision / Learning / Event / Service  
- [ ] Repository Prisma 实现  
- [ ] Context Builder  
- [ ] Decision Memory 读写  
- [ ] Learning Memory + 规则 Pattern Detector  
- [ ] Event ingest（`updateKnowledge`）  
- [ ] Agent Context Injection（`buildMKContext`）  

### 暂不实现

- 自动连接 POS / 美团 / 饿了么  
- 自动财务分析  
- 门店 IoT  
- 复杂预测模型  
- 独立 Brain AI Agent / M-BRAIN 席  

---

## 10. 验收标准（产品闭环）

```text
建立一家餐厅
    → 形成第一版 Restaurant Brain
    → 「我要不要开新店？」
    → M-PNT / 七常委读取 Brain Context
    → 基于该店历史判断（非通用空谈）
    → 用户执行
    → 结果写回 Decision/Action/Learning
    → Brain 更新（理解度 / 风险 / 模式）
```

陌生店：`unknowns` 非空，禁止装懂。

---

## 11. DeepCode 输入清单

1. 本文（实现边界）  
2. `MEALKEY_RESTAURANT_BRAIN_TECHNICAL_V1.md`  
3. `packages/restaurant-brain` 全部导出类型与接口  
4. `apps/web/prisma/schema.prisma` 中 Brain 相关 model  

**改字段：先改契约与本文，再改库与实现。**

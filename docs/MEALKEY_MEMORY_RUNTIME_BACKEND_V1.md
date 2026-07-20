# MealKey Memory Runtime 后端设计 V1（冻结）

> **状态：正式冻结（Freeze）— 长期竞争壁垒核心**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `docs/MEALKEY_RUNTIME_LAYER_V1.md`  
> **上游：** Decision Runtime · Execution Runtime  
> **下游：** Growth Runtime（把记忆转化为老板能力）  
> **用户侧收口：** `docs/FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md`（Intelligence Profile · Memory Permission；非第七 Runtime）  
> **冲突裁决：** Memory **不是**学习顾问席；不是聊天日志仓库；无来源不得升格为战略结论

---

## 一、核心定位

> **Memory Runtime 是 MealKey 的企业长期记忆系统，负责采集、结构化、学习和复用企业经营过程中的知识资产。**

相对角色：

| Runtime | 回答 |
|---------|------|
| Decision | 为什么这样决定？ |
| Execution | 怎么把决定跑出来？ |
| **Memory** | **企业经历过什么，以及这些经历如何改变未来决策？** |

没有 Memory → MealKey 只是一次性 AI 咨询工具。  
有 Memory → 越来越了解企业、懂老板、更聪明的经营伙伴。

**传统：** 老板经验 → 脑子里 → 离职/遗忘 → 重新踩坑。  
**MealKey：** 经营经历 → Memory Runtime → 结构化知识 → 下一次决策增强。

---

## 二、核心原则

### 原则 1：不是存聊天记录

| 错误 | 正确 |
|------|------|
| 保存所有对话 | 只保存**对未来决策有价值**的信息 |

普通聊天「今天讨论了菜单」→ 无价值。  
结构化资产示例：

```
企业：XX 湘菜品牌
发现：SKU 过多导致后厨复杂
结论：控制 SKU 数量
适用：30–80 平快餐模型
置信度：85%
```

### 原则 2：理解企业 ≠ RAG 搜资料

| RAG | Memory |
|-----|--------|
| 这个行业有什么知识？ | **你的企业过去发生过什么？** |

### 原则 3：一次失败 ≠ 永久规则

经验规律（Level 3）须多次验证或显式确认后才进 Founder / Industry。

---

## 三、四层模型（冻结）

```
              Memory Runtime
                    │
        ┌───────────┴───────────┐
        Founder Memory     创始人记忆
        Company Memory     企业记忆
        Project Memory     项目记忆
        Industry Memory    行业记忆
```

---

## 四、Founder Memory（创始人记忆）

**定位：** 记录老板是谁，以及他的经营方式——**经营人格模型**，不是个人资料页。

```typescript
interface FounderMemory {
  id: string;
  ownerId: string;
  capabilityProfile: {
    strategy: number;
    marketing: number;
    finance: number;
    execution: number;
    organization: number;
  };
  decisionStyle: {
    riskPreference: string;
    speedPreference: string;
    detailLevel: string;
  };
  strengths: string[];
  weaknesses: string[];
}
```

示例：喜欢快速试错 · 战略强 · 财务弱 → 以后 M-BIZ 方案自动强化财务提醒（**建议增强**，不替席位做终局）。

**写入门槛：** 跨项目重复信号 ≥2，或 Growth / 复盘显式回写。

---

## 五、Company Memory（企业记忆）

**定位：** 企业自己的经营历史。

| 子类 | 示例 |
|------|------|
| **企业事实** | 品牌名、成立年、模型、客单 |
| **企业规律** | 「过去 12 个月低价活动差、会员复购好」 |
| **企业禁区** | 「不要进高租金购物中心——失败两次」 |

禁区记忆优先级高：Agent 检索时必须露出（仍不自动改战略，只强化提醒）。

---

## 六、Project Memory（项目记忆）

最频繁使用。

```typescript
interface ProjectMemory {
  projectId: string;
  timeline: MemoryEvent[];
  decisions: DecisionMemory[];
  results: ResultMemory[];
  lessons: Lesson[];
}
```

示例（新品牌开发）：定位年轻湘菜 → 测 3 个月 → 失败 → 学习「用户画像错误」→ 类似项目自动提醒。

**默认写入层：** 有 `projectId` 的决策/验证/学习优先落 Project。

---

## 七、Industry Memory（行业记忆）

MealKey 行业壁垒。来源：大师经验 · 案例 · 失败案例 · 行业规律。

```typescript
interface IndustryMemory {
  category: string;
  rule: string;
  cases: string[];
  confidence: number;
  source: string;
}
```

示例：`社区店成功概率：位置 > 产品 > 营销`。

**Phase 1 慎写：** 须 `sourceLevel=validated_outcome` 或人工/运营确认；禁止未验证百科灌库。

**U4 跨租户管道（2026-07-18）：** 表 `IndustryInsight`（无 owner 外键，仅 `contributorHash`）。写入须 `contributeToIndustryModel=true` + 脱敏（品牌/电话/地址）。入口：`tryContributeFromValidation`；召回：`recallIndustryInsights` → `recallForDecision` prior。真源：`founder-layer/intelligence/industry-contribute.ts`。

---

## 八、写入价值分级（四级）

| Level | 含义 | 动作 |
|-------|------|------|
| **0** | 普通信息 | **不保存** |
| **1** | 事实信息 | → Company Memory |
| **2** | 经营判断 | → Decision / Project Memory |
| **3** | 经验规律 | → Founder / Industry（须复现或确认） |

---

## 九、Memory 形成流程（冻结）

```
Decision → Execution → Result → Reflection
    → Memory Candidate → Memory Review → Permanent Memory
```

关键步：**Reflection（复盘）**——对应 Decision `LEARNED` / Validation 收口 / Growth refresh。

现网已接钩子：`DecisionApproved`、`DecisionLearned`、`validationOs.complete` learning writes。

---

## 十、数据模型

### 10.1 逻辑表

**memory_items**

| 列 | 说明 |
|----|------|
| id | |
| owner_id | |
| project_id | 可空（Founder/Industry） |
| type | FOUNDER \| COMPANY \| PROJECT \| INDUSTRY \| DECISION \| LESSON \| RULE |
| content | 结构化 JSON 或摘要文本 |
| confidence | 0–1 |
| source | |
| created_at | |

**memory_links**

| 列 | 说明 |
|----|------|
| id | |
| from_memory | |
| to_memory | |
| relation | 如 `caused` / `supports` / `contradicts` |

示例：失败案例 → `caused` → 现金流规则。

### 10.2 V1 落地映射（诚实）

| 逻辑 | 现网 | 目标 |
|------|------|------|
| memory_items | Prisma `Memory`（type/key/content/importance） | 扩展 type 枚举语义；`content` JSON 含 layer/kind/decisionId |
| memory_links | **未建表** | V1 可用 `payload.links[]`；后续 migration |
| FounderMemory 画像 | Growth scores / profile | 投影写入 `Memory` type=OWNER + payload |

---

## 十一、与 Agent 关系

```
Agent 请求分析 → Memory 检索 → 历史经验 → 专家判断 → Decision
```

| 席位 | 典型召回 |
|------|----------|
| M-PNT | 品牌历史、定位尝试、禁区 |
| M-MKT | 市场动作结果、复购/活动规律 |
| M-BIZ | 过去模型结果、现金流踩坑 |
| M-ED | 合伙/股权案例 |

输出：**增强判断**，不替代四席终局。

---

## 十二、MVP 范围（P0）

### 必须

1. Memory Entity（逻辑模型 + type 映射）  
2. Memory Store（复用 Prisma Memory + FounderMemoryWrite）  
3. Memory Retrieval（按 project / owner 检索）  
4. Decision → Memory（自动沉淀，已有路径加固）  
5. Execution Result → Lesson（`DecisionLearned` / validation learning，已有）  

### 暂时不做

- ❌ 自动长期学习算法  
- ❌ 自动修改行业规则  
- ❌ 自我训练模型  
- ❌ 全量聊天入库  

### 工程切片

| 序 | 切片 | 验收 |
|----|------|------|
| M1 | `payload.memoryLayer` + type 映射单测 | approve/learned 带 layer |
| M2 | `recallForDecision(projectId, topic)` | 返回摘要块供开会 |
| M3 | 禁区/失败 pattern 轻量提醒 | 文案级，不改战略 |
| M4 | memory_links 逻辑边（JSON） | 失败→规则可追溯 |

---

## 十三、三大 Runtime 闭环

```
四大能力 → Decision Runtime → Execution Runtime
    → Result → Memory Runtime → 下一次决策更强
                    ↓
              Growth Runtime（老板能力）
```

---

## 十四、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-18 | 初冻四层与写入 |
| V1-freeze-final | 2026-07-18 | 对齐终稿：原则/四级价值/流程/RAG 区别/MVP/与 Agent |

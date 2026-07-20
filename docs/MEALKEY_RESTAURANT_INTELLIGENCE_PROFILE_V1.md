# MealKey Restaurant Intelligence Profile V1（经营认知画像 · 正式冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-19  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **对外产品名：** 《你的餐厅经营画像》  
> **对内对象名：** Restaurant Intelligence Profile（RIP） / Restaurant Intelligence Snapshot  
> **定位：** MealKey **第一个价值瞬间**——不是信息采集，而是「建立你的经营认知」。  
> **上游：** Business Identity · M-INTEL（Evidence Engine）· Restaurant Brain  
> **下游：** Today's Cockpit · Decision Intelligence · 经营决策习惯（DNA）  
> **冲突裁决：** 与 Brain / M-INTEL / Experience 冲突时：  
> - **事实 SSOT** = Restaurant Brain  
> - **证据流水线** = M-INTEL  
> - **老板每日入口** = Decision Experience  
> - **理解层（AI 当前认知）** = 本文 RIP Snapshot（确认前不得伪装为 Brain 事实）

---

## 〇、产品哲学（冻结）

### 0.1 旧心智 → 新心智

| 旧 | 新（冻结） |
|----|------------|
| 用户告诉我是谁 → 我认识你 → 再开始服务 | 用户给最少信息 → **我马上去认识你的生意** → 返回《经营认知卡》 → 确认/修正 → 真正开始懂你 |
| 第一次登录 = 填资料 | 第一次登录 = **建立经营认知** |
| Business Identity = 全部答案 | Identity =「我是谁」；**RIP =「我看到的你的生意」** |

### 0.2 第一个「哇」瞬间（不可降级）

老板第一次打开时，系统必须能说出：

> 「我已经开始看你的店了：顾客喜欢什么、不满意什么、你可能忽略什么。」

**没有认知基础，决策室再强也是空中楼阁。**  
本模块优先级：**高于 Dashboard UI 打磨**，与 Experience 入口并列产品主线。

### 0.3 三层语义（冻结）

```text
事实层：Restaurant Brain          ← 真实事实 / DNA / 记忆（SSOT）
理解层：Restaurant Intelligence Profile  ← AI 当前理解（Snapshot，可错、可改）
决策层：Decision Intelligence     ← Signal → Case → 判断
```

| 层 | 回答 | 可否未经确认写入 |
|----|------|------------------|
| Identity | 管哪盘生意、锚点、Horizon | 用户提交即可 |
| RIP Snapshot | AI 此刻如何理解这家店 | **否** — 须老板确认/修正后才沉淀 |
| Brain | 可复用的经营事实 | 仅来自确认后的 RIP 投影 + 既有写回路径 |

---

## 一、第一次体验路径（冻结）

**对外流程名：建立你的经营认知**  
**禁止对外：** 信息采集 / 完善档案 / 问卷建档。

```text
注册
  ↓
经营速写（≤60 秒）          ← Business Identity Intake（最少信息）
  ↓
MealKey 开始认识你的生意     ← External Intelligence Collector（经 M-INTEL）
  ↓
生成《餐厅经营画像》V1.0     ← Restaurant Intelligence Snapshot
  ↓
老板确认 / 修正              ← Cognition Confirm Gate
  ↓
Brain 写入（投影事实）+ DNA 种子
  ↓
进入今日经营驾驶舱
```

### 1.1 经营速写（60 秒 · 最少字段）

用户只提供「我是谁」（Identity），**不**要求长问卷：

| 字段 | 必填 | 例 |
|------|------|-----|
| 品牌名 | ✓ | 湘小馆 |
| 城市 | ✓ | 长沙 |
| 门店/商圈线索 | ✓（店名或商圈/地址其一） | 五一广场店 |
| 规模带 | ✓ | 1 / 2–5 / 5+ |
| 当前关注 | ✓ | 利润增长 |
| Decision Horizon | 可第二轮补 | short / mid / long |
| 老板自认优势（可选） | 用于认知差距 | 菜品品质 |

**锚点铁律（继承 Experience）：** 无品牌+地理 → `externalIntelReady === false` → **禁止**宣称「已完成网络评价分析」。

### 1.2 认识中屏（感知进度）

文案气质：

```text
餐启 · MealKey
正在认识你的生意…

已完成：
✓ 基础信息
✓ 网络评价分析（有锚点且采集成功时）
✓ 用户反馈分析
✓ 市场环境扫描

生成你的经营画像
```

规则：

- 任一步失败 → **明示降级**，不得打假勾。  
- 无外部源 → 仍可出 **Identity-only 画像**，标注「外部证据不足」。

---

## 二、核心资产拆分（冻结）

```text
Business Identity          +          Restaurant Intelligence Profile
（用户提供：我是谁）                    （系统生成：我看到的你的生意）
```

### 2.1 Business Identity

落点（不变）：`project.profile.businessIdentity`（无新 Prisma Identity 表）。  
职责：Scope · Brand · Geo · Scale · Focus · Horizon · `externalIntelReady`。

### 2.2 Restaurant Intelligence Profile（理解层）

| 概念 | 定义 |
|------|------|
| **RIP** | 某餐厅在某时刻的「经营理解」产品对象 |
| **Snapshot** | RIP 的一次版本化投影（V1.0 / V1.1…） |
| **Card UI** | 《XX餐厅经营画像》——Snapshot 的老板可见面 |

**禁止：**

1. 把 RIP 叫「档案」（无价值感）——对外固定 **画像**。  
2. 未确认的 Snapshot 直接覆写 Brain 事实。  
3. 平行于 Brain 的第二套「内部事实主库」。  
4. 把爬虫原文当结论塞进 Prompt。  
5. 第七 Runtime / 新顾问席 / `M-LEARN` 情报席。

---

## 三、《餐厅经营画像》卡片结构（冻结）

标题形态：

```text
{品牌或店名}经营画像 V{major}.{minor}
```

### 3.1 一、基础身份

来源：用户提供 +（可选）网络信息。

| 字段 | 说明 |
|------|------|
| 品牌 | Identity |
| 类型/品类 | 推断或用户确认 |
| 位置 | 城市·商圈 |
| 经营阶段 | 如：成熟单店 / 扩张期 — **可被老板改** |
| 客单（估） | 有证据才写数字；否则「未知」 |
| 主要竞争 | 区域/品类级描述，禁止无来源硬点名 |

### 3.2 二、顾客怎么看你（顾客认知资产）

来源经 **Market Evidence Layer**（见 §五），不是「评价墙」。

呈现：

- **印象维度**（有证据时）：味道 / 环境 / 服务 / 性价比等比例或星级叙事  
- **正向关键词**（✔）  
- **需要关注**（⚠）— 负向/风险信号  

无证据时整块折叠为：

```text
尚未形成可靠的顾客认知（缺锚点或外部采集未就绪）
```

### 3.3 三、老板认知 vs 顾客认知（认知差距）

MealKey 差异化模块（冻结为 V1 必选区块，可为空态）。

```text
你认为：{founderClaim}
        ↓
顾客感知：{customerPerception}
```

例：老板填「优势=菜品品质」；证据高频=「环境 / 聚餐氛围」→ 产出差距卡。  
修正结果进入 **经营决策习惯 / Founder DNA 种子**（不是心理测试文案）。

### 3.4 四、系统当下判断（弱结论）

最多 3 条「我现在最想提醒你的事」——必须可追溯到 Evidence 或 Identity；  
**禁止**战略终局句（「你应该立刻融资/关店」）。

---

## 四、确认门禁（Cognition Confirm Gate · 冻结）

画像出现后 **不得静默保存为最终理解**。

```text
这是我对你的第一理解

准确吗？
👍 基本准确
✏ 修改
❌ 不符合
```

| 动作 | 系统行为 |
|------|----------|
| 基本准确 | Snapshot → `confirmed`；投影可写 Brain 的安全字段；进驾驶舱 |
| 修改 | 打开结构化修正（阶段/优势/品类/关注点等）→ 再确认 |
| 不符合 | Snapshot → `rejected`；保留证据层；引导最小修正后重生或 Identity-only 前进 |

**老板修改的价值：** 第一次学习「老板怎么看自己的店」——写入 Decision DNA / Founder 层种子。

---

## 五、Market Evidence Layer（冻结）

架构上不是「爬虫产品」，而是 **经 M-INTEL 的证据层**：

```text
大众点评 / 小红书 / 抖音 / 美团 / 地图 / 竞品公开信息
        ↓
 External Intelligence Collector（采集适配器，可降级）
        ↓
 M-INTEL：Raw → Information → Event → Evidence
        ↓
 RestaurantEvidence[] 挂到 Snapshot / 后续 Decision Case
```

### 5.1 RestaurantEvidence（V1 契约形）

```ts
type RestaurantEvidenceV1 = {
  schemaVersion: 1;
  id: string;
  source: string;           // 大众点评 | 小红书 | …
  content: string;          // 清洗后的短句，非整页 HTML
  sentiment: "positive" | "neutral" | "negative";
  keyword?: string;
  aspect?: string;          // 服务 | 味道 | 环境 | 价格 | …
  signal?: string;          // 如「等待时间」
  confidence: number;       // 0–1
  observedAt?: string;      // ISO
  relatedAspect?: string;
};
```

例：

```json
{
  "schemaVersion": 1,
  "id": "ev_…",
  "source": "大众点评",
  "aspect": "服务",
  "signal": "等待时间",
  "sentiment": "negative",
  "content": "高峰等位偏长，影响复购感知",
  "confidence": 0.86
}
```

**禁止：** 无来源硬数字；原文网页直接进 Prompt；无限采集（须 Identity 锚点 + Decision/画像驱动）。

---

## 六、每日更新（壁垒 · 冻结）

第一次：建立画像。  
以后（凌晨/日更任务，可与 DailyScan 同编排）：

```text
扫描新增评价 / 竞品公开变化 / 反馈变化
  ↓
Evidence 增量
  ↓
Snapshot 差分（画像变化）
  ↓
Signal → Candidate（Experience 既有升格）
  ↓
Today's Focus 投影
```

例：

```text
过去 7 天「服务慢」相关评价 +35%
附近竞品上线套餐活动
→ Today's Focus：晚餐体验下降可能影响复购，需关注服务流程
```

差分进入 Inbox / Focus 时 **仍走 Candidate 门禁**，禁止 Scan 滥造 Decision。

---

## 七、工程闭环（冻结）

```text
用户输入
  → Business Identity Intake
  → Restaurant Brain（锚点占位 / prior）
  → External Intelligence Collector
  → M-INTEL Evidence Engine
  → Restaurant Intelligence Snapshot（理解层）
  → 用户确认门禁
  → Brain 写入（事实投影）+ DNA 种子
  → Today's Cockpit
```

### 7.1 落点策略（V1 · 禁止新 Prisma Decision 表）

| 对象 | V1 落点 |
|------|---------|
| Identity | `project.profile.businessIdentity`（已有） |
| Snapshot 草稿/确认 | `project.profile.restaurantIntelligenceProfile`（JSON）或 Brain 扩展字段；**优先 profile JSON**，待量级再表化 |
| Evidence | M-INTEL / Context Evidence 管线；可引用 id，不在 Snapshot 内嵌海量原文 |
| 确认事件 | BrainEvent 或 profile 审计字段（`confirmedAt` / `confirmedBy`） |

### 7.2 与现有模块关系

| 模块 | 关系 |
|------|------|
| Experience | 首登路径升级为「建立经营认知」；驾驶舱在确认后打开 |
| M-INTEL | 唯一外部证据引擎；RIP 消费 Evidence，不另起爬虫产品 |
| Restaurant Brain | 确认后接收可固化事实；RIP ≠ Brain |
| DIE / Room | 无 RIP/Identity 锚点时降低外部自信；准备度 `need_evidence` |
| User Intelligence | 老板修正 → BehaviorSignal / Founder DNA；不是第七 Runtime |

### 7.3 工程切片建议（非本文件验收义务，供 Blueprint）

| Phase | 交付 |
|-------|------|
| R0 | 契约 TS + 本文冻结 + AUTHORITY 挂载 |
| R1 | 经营速写 → 进度屏 → Identity-only 画像 + 确认门禁 |
| R2 | M-INTEL 证据接入顾客认知块（可降级） |
| R3 | 认知差距块 + DNA 种子 |
| R4 | 日更差分 → Signal/Candidate |
| R5 | 黄金路径手测：注册→画像→确认→驾驶舱 |

---

## 八、禁止清单（冻结）

1. **禁止**把第一次登录做成问卷式「完善资料」。  
2. **禁止**无锚点假装「已分析大众点评/小红书」。  
3. **禁止**未确认 Snapshot 覆写 Brain。  
4. **禁止**第七 Runtime / 情报顾问席。  
5. **禁止**平行事实主库。  
6. **禁止**战略终局话术出现在 V1 画像。  
7. **禁止**对外使用「档案」作为主名称（可用内部 storage 名）。  
8. **禁止**为 RIP 新建 Prisma `Decision*` 大表；Case 规则仍服从 DIE Tech Map。

---

## 九、成功标准

1. 第一次会话在 ≤60 秒速写后出现《经营画像》，而非空白驾驶舱。  
2. 老板感知到「系统看过我的店」，而非「又填了一张表」。  
3. 确认/修正有明确门禁；修正可追溯。  
4. 顾客认知块无证据时诚实降级。  
5. 认知差距至少在「有自认优势 + 有顾客证据」时出现。  
6. 确认后进入 Today's Focus 路径，与 Experience 一致。  
7. 日更能把证据变化变成 Focus/Inbox 信号（不直接刷 Decision 行）。

---

## 十、一句话

**Business Identity 回答「我是谁」；Restaurant Intelligence Profile 交付「我看见的你的生意」；确认之后，Restaurant Brain 才真正开始记住你——这是 MealKey 相对普通 AI 的第一个差异化瞬间。**

配套契约：`apps/web/src/server/founder-layer/contracts/restaurant-intelligence-profile.ts`  
下一工程蓝图：可增 `MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_ENGINEERING_BLUEPRINT_V1.md`（R0–R5）。

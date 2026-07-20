# MealKey Decision Experience V1（产品核心交互冻结）

> **状态：正式冻结（Freeze）— 架构审查定稿**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **定位：** MealKey **每日经营决策系统**的核心体验真源。  
> **工程蓝图：** `MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md`  
> **上游能力：** DIE · M-INTEL · Restaurant Brain · Council · M-EXEC · Quality  
> **与旧文关系：** 覆盖并升级 `MEALKEY_DECISION_CENTER_INTERACTION_V1.md`；技术实体仍服从 DIE Data Contract / Tech Map（不新开 Prisma Decision 大表、不新 Runtime）。

---

## 〇、产品哲学（冻结）

> ChatGPT 回答问题；**MealKey 帮助你把工作中每一次决策做对，并陪你把决定变成结果。**

| 旧心智 | 新心智（冻结） |
|--------|----------------|
| AI 帮我分析问题 | AI 每天帮我发现「我现在最应该关注和决定什么」 |
| 我要问 AI 一个问题 | MealKey 今天有没有发现需要拍板的事？ |
| 只有战略题才配决策 | **岗位上每天的工作决策**都值得被做对 |
| 咨询模块 = 今日决策 | **今日决策 ≠ 四大咨询**（咨询可另设咨询品牌） |

**今日决策（成立）：** 帮用户处理**工作当中的决策事项**——不论岗位，每天都要做很多判断；MealKey 的主战场是**把每一次决策做对**。  
类似飞书/财务/CRM 的「今日」——MealKey 的今日 = **今天有没有需要我判断的事**（系统推送 + 任意发起）。

### 0.1 决策能力四层（交互与能力必须同时成立 · 冻结）

交互做好只是入口；**决策能力**由四层共同支撑，缺一层就不能宣称「帮你决对」：

| 层 | 对外语义 | 解决什么 | 工程锚点（不新增 Runtime） |
|----|----------|----------|---------------------------|
| **1. 工作 / 企业画像** | 认识你是谁、管什么生意 | 决策必须绑在「用户正在做的企业 / 品牌 / 门店 / 岗位语境」上；越决策越懂你 | Business Identity · RIP · Restaurant Brain · 经营决策习惯 |
| **2. 决策时信息采集 + 动态采集** | 这次决什么、缺什么证据 | 开案时问清题面与约束；日更外部/经营信号持续补证；**不得无锚点装懂外部** | Decision Room Intake · Readiness · M-INTEL · RIP 日更差分 → Signal |
| **3. AI 无限知识 → 可用能力** | 不是百科，是针对本题的判断力 | 把通用知识压成：证据、选项、质询、模拟、否决条件——可执行的决策能力 | Decision Intelligence · Challenge Layer · Council（退后）· Quality |
| **4. 提升用户决策能力** | 越用越会决 | 多知识结构：财务 / 运营 / 组织 / 市场 / 品牌…按题调用；复盘沉淀习惯与短板 | Learning · 经营决策习惯 · Capability / Growth |

**闭环（冻结）：**

```text
工作决策高频发生
    → 今日入口 / 任意发起
    → 画像提供语境
    → 决策时采集 + 动态情报
    → AI 知识转化为本题能力
    → 拍板 → 执行 → 学习
    → 画像与决策能力一起变强
```

**与四大咨询的边界（冻结）：** 品牌定位等咨询可单独设定咨询对象；**今日决策只服务用户当前经营主体上的工作决策**，禁止与咨询主路径搅在一起。

| 能力模块 | 解决什么 |
|----------|----------|
| **Business Identity** | 认识「我是谁、管什么、看多远」（最少信息） |
| **Restaurant Intelligence Profile** | **第一价值瞬间**：系统生成《经营画像》→ 老板确认（见 `MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md`） |
| **Restaurant Brain** | 经营事实与记忆（确认后的 SSOT） |
| **M-INTEL** | 与主体相关的外部世界 → Evidence |
| **Decision Intelligence** | Signal → Candidate → Case → 判断 |
| **M-EXEC** | 决定 → 改变 |
| **经营决策习惯**（内部可称 Decision DNA） | 越来越懂这个人怎么决；反哺第 4 层 |

---

## 一、核心架构（冻结）

```text
                  MealKey

            Today's Cockpit
                  |
            Decision Inbox
                  |
          Decision Candidate
                  |
            Decision Room
         --------+--------
         |                |
      Evidence         Challenge Layer
         |           （七常委退后）
      Simulation
         |
   Founder Decision
         |
      M-EXEC
         |
      Learning
         |
  经营决策习惯（DNA）

底层：
Business Identity → RIP（理解层确认）→ Restaurant Brain → M-INTEL
```

**第一次登录（冻结升级）：** 不是信息采集，而是 **「建立你的经营认知」**  
（速写 → 认识生意 → 《餐厅经营画像》→ 确认/修正 → 今日驾驶舱）。详见 RIP V1。

**Signal → Case 不得跳级（冻结）：**

```text
Brain / Runtime / M-INTEL
        ↓
   Signal Engine
        ↓
 Decision Candidate   ← 不是所有异常都升级
        ↓（升格条件满足）
   Decision Case
        ↓
  Today's Focus / Inbox
```

DailyScan **只投影** Candidate/Case，**不直接**为每个波动创建 Prisma Decision。

---

## 二、Business Identity（经营身份）

**对外名：** Business Identity。  
**禁止对外：** Decision Base / 主体档案（可作内部别名）。

### 2.1 结构（冻结）

```text
Business Identity
    ├ Founder Identity
    ├ Company（可选）
    ├ Brand[]（≥1）
    ├ Store[] / Region（地理/地址必填）
    ├ Business Scope
    ├ Decision Authority
    ├ Decision Horizon      ← 本版增补
    └ Capability Profile（渐进）
```

### 2.2 Decision Horizon（决策时间尺度 · 冻结）

| 值 | 含义 | 老板感知 |
|----|------|----------|
| `short` | 7–30 天 | 现金流、本周人效、促销 |
| `mid` | 3–12 个月 | 单店模型、店长、季节 |
| `long` | 1–3 年 | 品牌布局、多店网络 |

**为何必须：** 同一「扩店」题，短期老板与长期老板答案不同；后续进入**经营决策习惯**。

Intake V1：可在关注点后用一题采集，或第二轮补；**不得缺省假装已知**。

### 2.3 必采锚点（冻结）

品牌信息 + 地理区域/门店地址 = **必采**，否则禁止宣称可采外部情报。

### 2.4 与 Brain / RIP

| | Identity | RIP（理解层） | Brain |
|--|----------|---------------|-------|
| 回答 | 管哪盘生意、边界、时间尺度 | AI 此刻看见的生意 | 事实 / DNA / 记忆 |
| 落点 | `project.profile.businessIdentity` | `project.profile.restaurantIntelligenceProfile` | Restaurant / Profile 表族 |
| 写入 | 用户提交 | **须确认门禁** | 确认后投影 + 既有写回 |

完整卡片结构、Evidence、认知差距、日更：见 `MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md`。

---

## 三、Today's Focus + Decision Inbox（冻结）

### 3.1 Today's Focus = 系统入口（不可降级）

驾驶舱核心一句：

> 今天，工作上有没有需要你拍板的事？

结构：

```text
今日焦点（唯一主角 · 系统建议）
  ↓
进入今日决策 / 决策室（若需判断）
  +
任意发起一笔工作决策（最高频）
  ↓
Decision Inbox（问题池，非任务墙）
```

**入口原则（冻结）：** CTA 与发起一律进决策链路（`decision-room` / `decision-case`），**禁止**默认掉进顾问咨询会。

### 3.1b 语音主体 + 三易（冻结 · 2026-07-19）

**交互主体：** 今日决策以 **语音** 为主、打字为辅。手机端优先 **语音对话模式**（系统问一句 → 用户说一句 → 采齐决策事项 → 输出摘要 → 开案）。单轮口述为辅路径。复用既有 `useSpeechToTextField` + 云端 ASR；引导可用浏览器 TTS；Brief 客户端暂存，**不新开 Runtime / Prisma 表**。

**对话采集四问（冻结）：**

```text
1 决什么？
2 为何现在必须定？
3 底线不能碰什么？
4 做成了长什么样？
        ↓
   决策事项摘要（Brief）
        ↓
   进入决策室输出判断
```

| 三易 | 老板感知 | 产品要求 |
|------|----------|----------|
| **易学** | 像微信语音对话 | 绿色麦、按住/松手；系统可朗读提问 |
| **易做** | 不用打字也能采齐 | 对话引导；可跳过非首问；一句话模式为辅 |
| **易管** | 决完能跟住 | 收件箱是管理面；拍板回今日 |

禁止：把今日决策做成「先填四张表再开会」的咨询会流程；禁止手机主路径以打字表单为主。

### 3.1c 决策闭环打透（冻结 · 2026-07-19）

**心智目标：** 用户每天碰到任何决策事项，第一反应是打开餐启「今日」。

```text
触发（今日 / 底栏决策 / 收件箱）
   → 语音对话采集
   → 决策室判断
   → 老板拍板
   → 行动打卡
   → 复盘学习
   → 回今日（收件箱更新 · 越决越懂）
```

| 原则 | 要求 |
|------|------|
| **一词一路** | 对外「决策」= `decision-room`；扩店题才进 `decision-case`；顾问咨询只在「能力」 |
| **拍板三 CTA** | 主：回今日 · 次：去打卡执行 · 辅：再开一笔 |
| **收件箱四桶真连** | 待判断/观察 → 决策室；执行中/复盘中 → 行动页真实条目 |
| **复盘不进咨询会** | 再判断一律 `decision-room` |
| **闭环轨道可视** | 采集→判断→拍板→执行→复盘→今日，各页同轨 |

**工程落点（已落地）：**  
`DecisionCenterMorning` · `VoiceDecisionDialogue` · `decision-room` · `DecisionLoopRail` / `DecisionClosedActions` · `daily-scan` 收件箱四桶 · `/decisions` 行动页 · 底栏「决策」→ Room · 扩店分流 `decision-case` · 入口工具 `lib/decision-entry.ts`。

### 3.2 Decision Inbox / Queue（经营问题池）

Today's Focus 只展示**当天主焦点**；问题不因「今天没选中」而消失。

```text
待判断   pending_decide
观察中   watching
执行中   executing
复盘中   reviewing
```

驾驶舱可展示计数（弱区即可）：

```text
待判断 3 · 观察中 5 · 执行中 2 · 复盘中 1
```

**不是**待办管理；是**经营问题池**。条目来自 Decision Candidate / Case 投影。

---

## 四、Decision Candidate（信号升格层 · 冻结）

| 对象 | 定义 |
|------|------|
| **Signal** | 异常/机会/变化（可来自 Risk/Opportunity/Brain） |
| **Decision Candidate** | 「可能值得判断」的候选；尚未开 Case |
| **Decision Case** | 已进入决策室资产；`id ≡ Prisma Decision.id` |

**升格启发（V1 可规则，后可模型）：** 影响×紧急×与 Horizon 对齐×是否阻断 → 超过阈值才 `openCase`。  
例：营业额 -5% → Signal；未必开会。

---

## 五、决策准备度（Readiness · 冻结）

**对外名：** 本次决策准备度。  
**禁止**让用户以为这只是「打分游戏」。

### 5.1 状态机（优先于星级语义）

| State | 含义 | UI 一句 |
|-------|------|---------|
| `ready` | 可直接判断 | 可以直接判断 |
| `need_evidence` | 缺外部/证据 | 需要补充外部证据 |
| `need_context` | 缺经营事实 | 需要补充经营事实 |
| `high_uncertainty` | 风险过大 | 不确定性过高，建议暂缓 |

星级可并存，但**状态文案为主**：

```text
本次决策准备度  ★★★☆☆
状态：需要补充经营事实
已掌握：…
缺少：过去6个月利润趋势 · 店长独立能力
```

核心不是「给多少分」，而是：**为什么现在不能确定**。

---

## 六、决策会议室与 Challenge Layer（冻结）

### 6.1 五层（老板语言）

1. 发生了什么？  
2. 为什么会这样？  
3. 我们有哪些选择？  
4. **（插层）挑战选择**  
5. 每个选择未来会怎样？  
6. 我应该怎么决定？  

（实现上常委在 3 与「路径」之间；文案以老板语言为准。）

### 6.2 Challenge Layer（重大进步 · 冻结方向）

**禁止**默认呈现「开会机器人」式角色秀：

```text
CSO: 我认为…
CMO: 我认为…
```

**应该**呈现判断前置的挑战摘要：

```text
这个方案受到 3 个挑战：
  财务风险：现金压力
  运营风险：复制能力不足
  市场风险：定位模糊
[查看来源] → 展开常委/证据
```

常委退后，判断前置。V1 可先摘要+展开；完整七常委仍链 `decision-room`。

---

## 七、经营决策习惯（原 Decision DNA · 命名冻结）

**对外名：经营决策习惯。**  
**禁止 V1 对外：「你的决策人格」**（防心理测试化）。

示例：

```text
系统逐渐发现你的经营特点：
  增长导向 · 执行快 · 偏好快速验证
提醒：过去两次扩张，风险主要来自现金安排。
```

内部字段可仍用 `decisionDna` / Learning pattern；**首日不强制测评**。

---

## 八、三屏交互（摘要冻结）

### 屏 A · Identity Intake

开场：`先告诉我，你希望我帮你经营哪一家生意？`  
必采：经营对象 · 名称 · **品牌** · **地理** · 规模 · 关注 · 困扰；（**Horizon** 首轮或第二轮）  
心智：不是填表，是「AI 开始认识我」。

### 屏 B · 今日经营驾驶舱

路由 `/dashboard`。今日焦点主角 + Inbox 计数 + 行动 ≤3 + Identity 弱区。

### 屏 C · 决策会议室

准备度（状态优先）+ 五层 + Challenge Layer + 裁决三按钮 + 执行/复盘。

---

## 九、状态机（Case · 冻结）

```text
发现问题 → 补充信息 → 分析中 → 挑战中
  → 等待老板裁决 → 已裁决 → 执行中 → 复盘学习
```

---

## 十、工程映射（冻结口诀）

1. Brain = 认识你的生意  
2. M-INTEL = 感知与你相关的世界（须 Identity 锚点）  
3. DIE = 如何判断（含 Candidate 升格）  
4. M-EXEC = 如何改变  
5. 经营决策习惯 = 越来越懂你怎么决  

**禁止：** 新 Prisma DecisionCase 表；第七 Runtime；无锚点硬编区域结论；DailyScan 直接滥造 Decision。

细节与文件清单见 **Engineering Blueprint**。

---

## 十一、成功标准

1. 打开先见「今天最该关注什么」。  
2. 无重大决策日仍有驾驶舱价值（观察/Inbox）。  
3. 无品牌/地理不装懂外部。  
4. 准备度以**状态**解释「为何不能确定」。  
5. Challenge 以风险挑战摘要为主，非常委群聊。  
6. Signal 不自动等于 Case。  
7. 「经营决策习惯」可感且不心理测试化。

---

## 十二、一句话

**Today's Focus 定义每日打开理由；Identity+Horizon 锚定主体与时间尺度；Candidate 过滤噪声；Room 用准备度与 Challenge 陪老板决定；EXEC+习惯完成闭环。**

下一文档：`MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md`。

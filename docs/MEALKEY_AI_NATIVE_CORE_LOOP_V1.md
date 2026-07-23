# MealKey AI Native Core Loop V1.0（生命周期闭环冻结）

> **状态：正式冻结（Freeze）— 产品骨架层，先于 UI**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 表现层范式  
> **上游架构：** `docs/MEALKEY_AI_NATIVE_INTERACTION_ARCHITECTURE_V1.md`  
> **智能体四大核心：** `docs/MEALKEY_PERSISTENT_BUSINESS_AGENT_V1.md`  
> **战略飞轮对照：** `docs/MEALKEY_CORE_PRODUCT_LOOP_V1.md`（能力层日活飞轮；本文 = **人机协作生命周期**）  
> **明确不做：** 不画页面稿；不新开第七 Runtime；不绕过 Identity/RIP/Council/DIE；不把闭环写成「每天闲聊变聪明」。

---

## 〇、本文冻结什么

> 定义一个用户从**第一次进入**到**长期使用**的完整闭环。  
> 闭环一旦成立，MealKey 产品骨架确定；页面只是投影。

**与 Core Product Loop 的分工（冻结）：**

| 文档 | 回答 |
|------|------|
| `MEALKEY_CORE_PRODUCT_LOOP_V1` | 系统能力飞轮：Identity→Brain→Signal→Decision→Exec/Evolution；日活雷达 |
| **本文 AI Native Core Loop** | 老板如何用自然语言目标走完：进入→编译→资产→更懂你 |

二者必须咬合，禁止各写一套互不认的「主路径」。

---

## 一、闭环总图（冻结）

```text
第一次进入
        ↓
建立经营身份（Identity + RIP 确认）
        ↓
提出第一个目标（Goal Seed · 一句话）
        ↓
AI 理解 + 编译（Goal Compiler）
        ↓
形成方案 / 待拍板决策（Decision Asset）
        ↓
老板裁决（决策室 · 常委压力测试）
        ↓
执行反馈（M-EXEC）
        ↓
记忆沉淀（Brain / Memory / Evolution）
        ↓
下一次更懂用户（User Intelligence · Goal Awareness）
        ↓
（循环）提出下一目标 / 继续当前目标 / 响应雷达信号
```

**一句话骨架：**

> **认识你 → 接住目标 → 编译成专业路径 → 拍板沉淀 → 执行复盘 → 下一次更准。**

---

## 二、阶段定义（冻结）

### L0 · First Open（第一次进入）

| 项 | 冻结 |
|----|------|
| 目的 | 建立「这盘生意」的最小可服务语境 |
| 老板动作 | 最少信息（Identity 速写）；确认/修正《经营画像》 |
| 系统动作 | Identity → RIP Snapshot →（确认后）Brain 投影 |
| 成功判据 | 系统能说出对这家店的初步理解；**未确认不得装事实** |
| 真源 | `MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1` |
| 禁止 | 两小时问卷；未建身份就进 Agent 商城；用聊天代替确认门禁 |

### L1 · First Goal（提出第一个目标）

| 项 | 冻结 |
|----|------|
| 目的 | 从功能心智切换到目标心智 |
| 老板动作 | 一句话 / 语音：「我要开长沙湘菜馆」或「利润掉了」 |
| 系统动作 | Intent Capture → **Goal Seed**（结构化槽位，未知标 `unknown`） |
| 成功判据 | 出现可读 Goal 名 + 缺失信息最小追问（非表单墙） |
| 禁止 | 要求先选 Agent；一句话直接当成已完成任务 |

### L2 · Compile（AI 编译）

| 项 | 冻结 |
|----|------|
| 目的 | 把种子编译成可推进结构 |
| 系统动作 | Understand（读 Identity/Brain/Memory）→ Frame → Plan(`taskGraph`) → Invoke(Agent 函数) |
| 老板感知 | 「利润提升计划 / 开店筹备」进度与阶段，不是专家群聊 |
| 成功判据 | 有 `taskGraph` + `currentStage` + 至少一份结构化草稿产出或明确 Unknowns |
| 禁止 | 只吐长文建议无状态；Compile 直出终局 Decision 绕过 Council |

### L3 · Materialize（形成方案与决策资产）

| 项 | 冻结 |
|----|------|
| 目的 | 交互变成企业资产 |
| 系统动作 | 方案 v1 / Brand Decision 等写入 `Goal.artifacts`；战略点进入待拍板 |
| 老板感知 | 可回看的定位/模型/菜单等卡片，而非聊天泡泡 |
| 成功判据 | 聊天可丢，资产仍在；后续 Agent **不得重问已确认决策** |
| 真源 | Architecture §3.4 Decision Asset；MKDecision / Memory |

### L4 · Decide（裁决）

| 项 | 冻结 |
|----|------|
| 目的 | 经营判断落地为签字决策 |
| 老板动作 | 在**决策室**确认 / 修改 / 否决 |
| 系统动作 | DIE Case · 证据 · 选项 · Council Challenge（命中召回则必经） |
| 成功判据 | Case.id ≡ MKDecision.id；拍板回今日/Goal 进度 |
| 禁止 | 今日页直接拍板主 CTA；顾问聊天冒充签字 |

### L5 · Execute（执行反馈）

| 项 | 冻结 |
|----|------|
| 目的 | 决定变成行动与可观察结果 |
| 系统动作 | M-EXEC Action Package；偏差与完成率回写 |
| 老板感知 | Goal 阶段推进；「该做的事」可勾可验 |
| 禁止 | M-EXEC 顾问席化；无 Decision 的空执行任务刷量 |

### L6 · Remember（记忆沉淀）

| 项 | 冻结 |
|----|------|
| 目的 | 企业经营记忆成立 |
| 系统动作 | 确认后的事实→Brain；决策/学习→Memory；复盘→Evolution |
| 燃料 | 仅 User Intelligence 四类（决策选择 · 修改/推翻 · 执行完成率 · 预测vs实际） |
| 禁止 | 聊天流水当学习燃料；未 opt-in 写行业模型 |

### L7 · Evolve & Return（更懂你 · 再进入）

| 项 | 冻结 |
|----|------|
| 目的 | 第二次打开明显「记得」且能主动推 |
| 系统动作 | Goal Awareness 列出进行中 Goal + 今日优先一件事；可并入雷达 Signal |
| 老板感知 | 「王总，你有两个经营目标…今天建议优先…需要继续吗？」 |
| 成功判据 | 无需重述已确认定位/约束；优先事项可一键「继续」触发 Compile 下一 Stage |
| 循环入口 | 继续当前 Goal / 新一句话目标 / 雷达信号 Promote |

---

## 三、日循环（有 Goal 之后 · 冻结）

第一次闭环跑通后，日常不是重新找功能，而是：

```text
打开 MealKey
  → Goal Awareness（进行中目标 + 今日一件事）
  → （可选）雷达高优信号并入
  → 老板：继续 / 换目标 / 一句话新意图
  → Compile 下一 Stage 或开决策室
  → Asset 更新 → 执行/复盘 → 记忆加深
```

**日循环成功判据：** 老板产生「它在盯我的目标进度，不只是等我提问」。

与日活雷达关系：

- **雷达** = 生意变化发现面（Core Product Loop）  
- **Goal Awareness** = 目标进度推进面（本文）  
- 首页应能同时投影二者，但 **主 CTA 仍服从一件事**

---

## 四、状态机（跨会话 · 冻结）

### 4.1 用户×企业生命周期

```text
anonymous / signed_in
  → identity_ready
  → rip_confirmed
  → goal_active          （至少一个 active/blocked Goal）
  → decision_fluent      （完成过 ≥1 次签字决策）
  → compounding          （Memory/习惯开始校准主动建议）
```

### 4.2 单 Goal 与闭环阶段映射

| Goal.status | 典型所处环 |
|-------------|------------|
| `draft` | L1–L2 |
| `active` | L2–L5 |
| `blocked` | L2 追问或 L4 待拍板 |
| `completed` | L6 沉淀后可归档 |
| `abandoned` | 显式放弃；保留资产只读 |

---

## 五、设计问题清单（AI 行为设计 · 冻结）

产品设计不再先问「按钮在哪」，每次改交互必须能回答：

1. **AI 什么时候出现？**（Proactive / Goal Awareness 规则 ID）  
2. **AI 为什么出现？**（哪个 Goal / Signal / 复盘窗）  
3. **AI 知道什么？**（Identity · Brain · 已确认 Asset · Unknowns）  
4. **AI 下一步推动什么？**（唯一主 CTA）  
5. **AI 如何形成资产？**（写入哪类 Decision Asset）

答不全 = 不得上新页面当主路径。

---

## 六、MVP 竖切（服从停扩 · 冻结）

**唯一场景仍是：** 一家餐厅老板每天打开 MealKey。

**AI Native 竖切最小路径（演示用）：**

```text
First Open（Identity + RIP 确认）
  → First Goal：「老店利润下降，想提升」
  → Compile：利润提升计划 taskGraph（收入/成本/运营三侧）
  → Materialize：方案 v1 卡片
  → Decide：1 个关键决策进决策室签字
  → Execute：生成可跟踪行动
  → Return：次日 Goal Awareness「继续推进…」
```

开店长链路可作第二竖切；**不得**在第一条竖切未演示前恢复能力目录首页。

---

## 七、禁做清单（闭环层）

- ❌ 跳过 Identity/RIP 直接「全能聊天编译」  
- ❌ 闭环终点停在聊天建议，无 Goal/Asset  
- ❌ 用更多页面模拟「成长感」  
- ❌ 并行第二套生命周期状态机与 Project/Decision 无关  
- ❌ 把「更懂用户」建成第七顾问席  
- ❌ 假监控门店实时数据冒充 Goal Awareness  

---

## 八、冲突裁决

1. 与 **Architecture V1** 冲突 → 以 Architecture 的模型定义为准；本文管阶段与节奏。  
2. 与 **Core Product Loop / 雷达** 冲突 → 保留日活发现；本文把「打开理由」扩展为 **发现 + 目标推进** 双投影，主 CTA 仍一件事。  
3. 与 **Council / DIE / 权限** 冲突 → 以后者为准。  
4. 与 **Consulting-OS 六步** 冲突 → 六步仅 L2 Invoke 内部程序。  

---

## 九、下一工程刀（仍不先画 UI）

| 顺序 | 事项 |
|------|------|
| 1 | Goal Seed DTO（`intentRaw` + `slots` + `unknown`） |
| 2 | L1→L2 竖切：一句话 → Goal + taskGraph 投影 |
| 3 | L7 回家：Goal Awareness 文案/数据挂今日壳 |
| 4 | L3 Asset 卡片最小集（定位/方案 v1） |
| 5 | 与决策室签字回写 Goal.progress |

---

## 十、一句话收口

> MealKey AI Native Core Loop =  
> **身份确认 → 目标种子 → 编译 → 决策资产 → 签字执行 → 记忆进化 → 主动再邀请。**  
> 设计的是这条环上的 **AI 行为**，不是一堆页面。

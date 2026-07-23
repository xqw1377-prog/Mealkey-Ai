# MealKey / Founder OS — 文档权威（AUTHORITY）

> 生效日：2026-07-17（…；**核心产品闭环最终冻结 + MVP 90天路线：2026-07-21**；**Agent Mini Program 平台：2026-07-22**；**AI Native 表现层范式：2026-07-23**）  
> 状态：**唯一入口**。改产品路径或交付语义前先读本文件。  
> 原则：老板 UX 与签字门禁以代码 + 下列权威文档为准；其余 `docs/M_PNT_*` 多为设计草稿或归档，**不得覆盖**本表。  
> **当前主线（2026-07-21 起）：** 不再扩能力面；只跑通「一家餐厅老板每天打开」第一条飞轮（见 L0 战略收口）。  
> **表现层范式（2026-07-23 起）：** 进目标，不进模块；Chat 是入口，状态与决策是本体。  
> **交互宪法（2026-07-23）：** 协作法则（非 UI）——目标优先·主动理解·能力隐藏·资产目的·有判断·能力提升·持续进化；禁餐饮版 GPT。真源 `MEALKEY_INTERACTION_CONSTITUTION_V1.md`。  
> **智能体定义（2026-07-23）：** MealKey = **持续理解餐饮人的专业 AI**，把行业无限知识转化为可使用的经营能力（增强老板，非 AI 副总）。  

> **工程表面顺序（2026-07-23）：** **先 Mobile Agent（关系+意图+产出）→ 再 Web Studio**（见 `MEALKEY_MOBILE_AGENT_V1.md`）。  
> **行为引擎（2026-07-23）：** 专业感=行为逻辑；五态 Explore→Reflect；真源 `MEALKEY_AI_BEHAVIOR_ENGINE_V1.md`。  
> **产品架构 V2（2026-07-23）：** 餐饮经营 AI 操作系统——交互/能力/认知三层；Agent 幕后；文件=经营输入；真源 `MEALKEY_PRODUCT_ARCHITECTURE_V2.md`。  
> **商业闭环（2026-07-23）：** 先老板/创业者；三场景开店·诊断·菜单；Core 免费+能力包收费；冷启动 100 老板陪跑；真源 `MEALKEY_GTM_MONETIZATION_V1.md`。  



> **认知护城河（2026-07-23）：** 通用大模型 = 推理发动机；MealKey = Intelligence Model + Knowledge Graph + **Skill Engine** + **Learning & Evolution Loop**（知识→能力→飞轮）；下一章 MVP 0.1 验证；真源见 L0 认知护城河。

---

## 1. 权威栈（从上到下）

| 层级 | 文件 / 代码 | 管什么 | 可否改老板路径 |
|------|-------------|--------|----------------|
| **L0 战略收口** | `docs/MEALKEY_CORE_PRODUCT_LOOP_V1.md` · `docs/MEALKEY_MVP_90DAY_ROADMAP_V1.md` · `docs/MEALKEY_COMMERCIAL_DELIVERY_CHECKLIST_V1.md` · `docs/MEALKEY_PRODUCTION_DEPLOY_V1.md` | 产品一句·日活五层飞轮·停扩闸门·MVP 唯一场景·90天·商业交付·生产部署 | **否** — 飞轮未验证前禁止新 Agent/新层；收费前必须过交付清单；上线按部署手册 |
| **L0 产品架构 V2** | `docs/MEALKEY_PRODUCT_ARCHITECTURE_V2.md` | **OS 形态**：Interaction · Capability · Cognitive；Agent 幕后；文件=经营输入 | **否** — 禁功能大厅；禁 Agent 菜单化 |
| **L0 商业闭环** | `docs/MEALKEY_GTM_MONETIZATION_V1.md` | **GTM**：P1=老板/创业者；卖「你的餐饮经营AI」非聊天/非副总；三场景开店·诊断·菜单；Core免费+Capability Pack收费；企业版后置；100老板冷启动；数据飞轮（合法） | **否** — 禁大而全冷启动；禁 Agent 商店货架收费；收费仍过交付清单；下一章 MVP 0.1 |
| **L0 交互宪法** | `docs/MEALKEY_INTERACTION_CONSTITUTION_V1.md`（`INTERACTION_PRINCIPLE` 已 redirect） | **如何与餐饮人协作**（十条原则）；改交互前闸门 | **否** — 禁 Agent 菜单化；禁被动问答壳；服从 Behavior Engine |
| **L0 行为引擎** | `docs/MEALKEY_AI_BEHAVIOR_ENGINE_V1.md` · `docs/MEALKEY_AGENT_PERSONA_V1.md` | Persona=它是谁；**Behavior=五态** · 主动/沉默 · 结构化判断 · 挑战；映射 Runtime Mode | **否** — 禁骚扰式主动；禁无判断附和；禁只有聊天态 |
| **L0 表现层范式** | `docs/MEALKEY_AI_NATIVE_INTERACTION_ARCHITECTURE_V1.md` · `docs/MEALKEY_AI_NATIVE_CORE_LOOP_V1.md` · `docs/MEALKEY_PERSISTENT_BUSINESS_AGENT_V1.md` · `docs/MEALKEY_AI_AGENT_CORE_ARCHITECTURE_V1.md` · `docs/MEALKEY_AGENT_PERSONA_V1.md` · `docs/MEALKEY_GOAL_COMPILER_V1.md` · `docs/MEALKEY_BUSINESS_OBJECT_MODEL_V1.md` · `docs/MEALKEY_AGENT_RUNTIME_ARCHITECTURE_V1.md` · `docs/MEALKEY_MOBILE_AGENT_V1.md` · `docs/MEALKEY_LLM_HOST_VS_TOOL_AGENT_V1.md` | **餐饮经营 AI**·宿主**大模型始终在线**·工具 Agent 可无模型·Mobile First | **否** — 禁无模型冒充宿主主路径；Phase1 未验证前禁 Studio 主线；服从交互宪法 |
| **L0 认知护城河** | `docs/MEALKEY_RESTAURANT_INTELLIGENCE_MODEL_V1.md` · `docs/MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1.md` · `docs/MEALKEY_SKILL_ENGINE_V1.md` · `docs/MEALKEY_LEARNING_EVOLUTION_LOOP_V1.md` | 理解世界（Model+Graph）+ **能力成长（Skill）** + **学习进化闭环（系统飞轮）**；岗位=认知视角非新系统；薄调度 skill/business/council/tool；≠餐饮 ChatGPT | **否** — 禁第七 Runtime / 学习顾问席；禁闲聊当燃料；禁未 opt-in 行业贡献；P1 店长竖切；下一章 MVP 0.1 |
| **L0 决策壁垒** | `docs/MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md` | DIE 五对象（Signal/Case/Context/Option/Learning）· 11 步 Pipeline · Confidence Score · Brain/M-INTEL/常委/M-EXEC 接口 | **否** — 决策形成系统；≠聊天/报表；Case.id≡MKDecision.id |
| **L0 决策证据** | `docs/MEALKEY_M_INTEL_V1.md` | M-INTEL = **Decision Evidence Engine**；State；Event→Evidence；Signal | **否** — 非爬虫/非顾问席；只产 Evidence |
| **L1 决策上下文** | `docs/MEALKEY_DECISION_CONTEXT_V1.md` | Context 资产树；Evidence / Score / 常委输入 | **否** — 挂 Case；非 Prompt；禁止私编事实 |
| **L0 产品核心体验** | `docs/MEALKEY_DECISION_EXPERIENCE_V1.md` | **今日工作决策** · 四层能力（画像/信息采集/知识→能力/决策力成长）· Identity（+Horizon）· Inbox · Candidate · Readiness · Challenge · 经营决策习惯 | **否** — 老板可见路径以此为准 |
| **L0 第一价值瞬间** | `docs/MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md` | **建立经营认知** · Identity 速写 · 《餐厅经营画像》· Evidence · 认知差距 · 确认门禁 · 日更→Signal | **否** — 理解层≠Brain；确认前不得写死事实；优先级高于 Dashboard UI 打磨 |
| **L1 Experience 工程蓝图** | `docs/MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md` | Cursor 执行：DTO/改文件/Mock vs 真/P0–P5 验收 | **否** — 按阶段验收；禁止 Scan 滥造 Decision |
| **L0 产品入口** | `docs/MEALKEY_DECISION_CENTER_V1.md` | Decision Center 定位 / 经营晨会（能力层命名可保留） | **否** — `/dashboard` 收口；首页心智服从 Experience |
| **L0 日活入口 · 经营雷达** | `docs/TODAY_RADAR_EXPERIENCE_V1.md` · `docs/BUSINESS_ANALYSIS_OUTPUT_TEMPLATE_V1.md` · `docs/MOBILE_THREE_EASY_IA_V1.md` · `docs/BUSINESS_SIGNAL_ENGINE_V1.md` · `docs/EVIDENCE_CHAIN_PROTOCOL_V1.md` · 包 `@mealkey/business-signal-engine` | **今日经营雷达**=每天打开理由；**经营分析**=中间层；**三易三层**≤3 点击；证据链强制；≠报表/≠决策室 | **否** — 雷达→分析→决策室；首屏禁文字墙；Agent 禁直接出结论 |
| **L1 经营信号数据契约** | `docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md` · `@mealkey/business-signal-engine` | Signal 五层·Evidence·Ranking(impact×urgency×confidence×relevance)·RadarOutput·Signal→Case（Case.id≡MKDecision.id）·Brain/M-INTEL 接口 | **否** — 改字段先改契约；禁止平行 Decision/Signal 大表；禁扩第7类 type |
| **L0 入口交互（旧）** | `docs/MEALKEY_DECISION_CENTER_INTERACTION_V1.md` | 会议室/Feed/Journey 细节参考 | **否** — **与 Experience / 雷达冲突时以雷达+Experience 为准** |
| **L1 决策质量** | `docs/MEALKEY_DECISION_QUALITY_MECHANISM_V1.md` | Pre/Post Quality·Evidence Weight·Confidence·Similar Memory·Counterfactual·Evolution·L1–L5 | **否** — 飞轮壁垒；禁止装懂 |
| **L1 DIE 数据契约** | `docs/MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md` | 七对象+Trace+Unknowns；Decision 第一公民；V1=扩店闭环 | **否** — 改字段先改契约；禁止平行表/存 Prompt |
| **L1 DIE 技术映射** | `docs/MEALKEY_DECISION_INTELLIGENCE_TECH_MAP_V1.md` | Schema 落点·Brain/Council/四席/M-EXEC 接线·Cursor 改文件清单 | **否** — 按清单实现；禁止新 Prisma DecisionCase |
| **L1 Decision Center 技术** | `docs/MEALKEY_DECISION_CENTER_TECHNICAL_V1.md` | DailyScan/Card/Diagnosis DTO；Lifecycle 映射 MKDecision；Pipeline；常委/Brain/M-EXEC 挂载 | **否** — 禁止新 Decision 大表 / 第七 Runtime；复用 outcome.mkStatus |
| **L0 餐厅智能层** | `docs/MEALKEY_RESTAURANT_BRAIN_V1.md` | Restaurant Brain / DNA 五层 / 我的餐厅 / Decision Memory；深度底座 | **否** — 先懂餐厅再堆 Agent；禁止问卷式建档；入口让位 Decision Center |
| **L1 Restaurant Brain 后端** | `docs/MEALKEY_RESTAURANT_BRAIN_BACKEND_V1.md` | Prisma / Entity / Event / Injection / Evolution；包 `@mealkey/restaurant-brain` | 可加深实现；契约语义不回滚 |
| **L1 Restaurant Brain 技术** | `docs/MEALKEY_RESTAURANT_BRAIN_TECHNICAL_V1.md` | **数据契约 SSOT**；Memory/Context API；DeepCode 实现切片 T1–T6 | **否** — 改字段先改契约；Agent 禁止私存业务事实 |
| **L1 Restaurant Brain 实现边界** | `docs/MEALKEY_RESTAURANT_BRAIN_IMPLEMENTATION_BOUNDARY_V1.md` | Service / Context Builder / BrainEvent / V1 范围；DeepCode 不得偏离 | **否** |
| **L1 Restaurant Brain Prisma+Entity** | `docs/MEALKEY_RESTAURANT_BRAIN_PRISMA_ENTITY_V1.md` | **Fact≠Decision**；规范化 Restaurant/Profile 表族；AgentContext 出口 | **否** — 改表先改本文 |
| **L1 Restaurant Brain Service Layer** | `docs/MEALKEY_RESTAURANT_BRAIN_SERVICE_LAYER_V1.md` | BrainService / Context Builder / Decision·Event 流程；Agent 调用规范 | **否** — DeepCode 按 S1–S6 |
| **L0 产品主路径** | `docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md` | 六步老板 UX（INTAKE→…→执行） | **否** — 未授权不得改名乱序 |
| **L0 系统架构** | `docs/FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md` | 四席 Engine、决策层、记忆层 | **否** — 不再加第五专业 Engine |
| **L0 Council System** | `docs/FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md` | 七常委 = AI 治理委员会；Agent→Insight→Council→MKDecision；三协议 + 工程 Phase | **否** — 不再扩组织设计；下一主线 = Council Runtime Engine |
| **L0 Council 4+1** | `docs/FOUNDER_OS_COUNCIL_INTELLIGENCE_4PLUS1_V1.md` | 4=四大能力接入；+1=MKInsight/Evidence/Trace 治理；Sprint 1–5 | **否** — 禁止把 4+1 误解为「选择方向」；Adapter 先于垂直 Agent 扩席 |
| **L0 Council 4+1 审计** | `docs/FOUNDER_OS_COUNCIL_INTELLIGENCE_GOVERNANCE_AUDIT_V1.md` | S5 闸门清单；代码真源 `founder-os/mk-insight.ts` | 可加深测试；不得绕过 Adapter |
| **L0 垂直 Agent 接入** | `docs/FOUNDER_OS_VERTICAL_AGENT_MKINSIGHT_ADAPTER_V1.md` | L3 → MKInsight Adapter → Council；禁止私有 Report 直进 | **否** — 垂直能力不得升格为第五核心 Agent |
| **L0 Agent 架构原则** | `docs/MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md` | **OS 定规则，Agent 独立产品**：不堆大杂烩；三边界 Core/Agent/UI；仓库变薄；四席留 Core | **否** — 禁 Marketplace 升格第五席；禁拆 Brain/DIE/拍板场 |
| **L0 Agent 平台架构** | `docs/MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md` | **四基建** Identity/Brain/Decision/Agent OS；Lifecycle；Runtime 五件套；Context Manager；Orchestra；四独立 | **否** — 禁 Core 新增 Agent；禁特权读库；组合须经 OS 编排 |
| **L0 Agent 外接接口** | `docs/MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` | **唯一接入面**：认证签名 · Context API · Ingress Ports · 拒收码 · SDK 边界 | **否 — MealKey 仓禁止新增任何 Agent** |
| **L0 Agent SDK** | `docs/MEALKEY_AGENT_SDK_V1.md` · `@mealkey/agent-sdk/platform` | **开发者骨架**：createAgentClient · Context 租用 · Ingress · OAuth/安装 · Handoff · Billing 钩子 · Sandbox | **否** — SDK 禁嵌垂直 Agent；禁直连 Brain/Prisma |
| **L0 Agent 7 日上手** | `docs/MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md` | Day0–7：Hello Context → Skill → Ingress → Manifest → UI → Handoff → 审核包 | 可加深样例；不得改外接硬闸门 |
| **L0 Agent UI 框架** | `docs/MEALKEY_AGENT_UI_FRAMEWORK_V1.md` | **规范在 OS、实现外置**：双表面 · 五段旅程 · 视觉禁令 · Handoff；Core 只做今日/决策室投影 | **否** — 禁止在 apps/web 新建垂直 Agent 业务站 |
| **L0 Agent Mini Program 平台** | `docs/MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md` | **微信生态总架构**：1 Shell + N Plugin · 三层入口 · 身份/燃料/裂变 · 模式 1 Plugin / 模式 2 伙伴小程序 · Brain 中枢 | **否** — 官方禁一 Agent 一小程序；禁 Shell 拍板/第二 Brain；禁第二积分宇宙；Live 服从 MVP 停扩 |
| **L0 Mini Shell · Plugin Runtime** | `docs/MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md` | **Shell 产品架构 · PluginHost · ShellContext · UI 事件 · 生命周期 · 模式 1/2 运行规范** | **否** — Plugin 零 Prisma；静态 UI 包审核；共享 Brain；动态任意脚本禁止 |
| **L0 Agent Protocol** | `docs/MEALKEY_AGENT_PROTOCOL_V1.md` | **生态壁垒/能力标准化**：五层模型 · Capability Registry · Decision Skill · Insight L1–L5 · 五维质量 · Memory 隔离 · 能力市场 | **否** — 禁直连库/私有永久记忆；默认≤L3；禁无限自造能力；Store 服从 MVP 停扩 |
| **L0 Agent Marketplace PRD** | `docs/MEALKEY_AGENT_MARKETPLACE_PRD_V1.md` | **开放平台产品**：`mealkey.cn` Store · 安装授权 · 分成 · 申请上架 | **否** — 安装≠下载包；API 以 External Interface 为准；禁伪 `/agent/run` 平行契约 |
| **L0 Developer Portal** | `docs/MEALKEY_DEVELOPER_PORTAL_V1.md` | **开发者操作系统**：`developers.mealkey.cn` · 7 日路径 · Console 四步 · 三类用户 · P0–P2 | **否** — 停扩协议；文档投影不得分叉；管理员审核在 platform admin |
| **L0 Developer Portal UI/UX** | `docs/MEALKEY_DEVELOPER_PORTAL_UI_UX_V1.md` | **第一工作台构图**：Landing · Start · 创建 · Sandbox · 提交 · Preview · Docs 三区 | **否** — P0.1/P1 服从本文；拒收码不改；禁紫套模板 |
| **L0 Developer Portal IA/数据** | `docs/MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1.md` | **工程底座**：路由 IA · DeveloperAccount · Application · Version · SandboxRun · ReviewTask · Listing/分成连接 · 状态机 | **否** — 不污染 Brain/Decision；Gateway 唯一运行时；Capability 仅 Registry |
| **L0 开发者宪法索引** | `docs/MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1.md` | **第三方可读目录**：Manifest · Context · Ingress · Scope · Sandbox · Version · 提审清单 | **否** — 禁止新字段；冲突以 Protocol / External Interface 为准 |
| **L0 M-OPS Reference** | `docs/M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md` · 仓 `C:\Users\xqw13\M-OPS-Agent` | **生态 Hello World**：用户产品 · 开发模板 · 教材；实现外置 | **否** — 禁止诊断引擎回流 Core |
| **L0 Tool Agent 框架** | `docs/MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · `@mealkey/tool-agent-kit` · `tool-agents/` | **~100 L3 可拆分可组合**：四件套 · 四 Ports · Registry · Compose · 上架闸门 | **否** — 只扩 L3；禁止升格 L1 / 第七 Runtime；MVP 未过前批量上架仍受停扩闸门 |
| **L0 经营诊断（外置指针）** | `docs/M_OPS_DIAG_EXTERNAL_POINTER_V1.md` · 仓 `C:\Users\xqw13\M-OPS-Agent` | 产品/引擎/UI/文档均在外置仓；Core 仅 Gateway + Ingress→今日 | **否** — 禁止把诊断引擎/UI 恢复进 `packages/` 或 `apps/web` 业务站 |
| **L0 治理协议细节** | `docs/COUNCIL_PROTOCOL_V1_FREEZE.md` | 常委角色 / 投票 / veto / 会议对象 | 可加深实现；接口语义不回滚 |
| **L0 Agent/Runtime 边界** | `docs/MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` | Expert 四席 vs Runtime（执行/成长/记忆）；扩模块闸门 | **否** — 运行时不得再注册为 M-* 顾问席 |
| **L0 Agent 生态地图** | `docs/MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` | 三层：L1 四席 / L2 Runtime / L3 工具；MKDecision 与商业化 | **否** — 工具层可扩，不得升格为 L1 或冒充战略判断 |
| **L0 权限模型** | `docs/MEALKEY_FOUNDER_OS_PERMISSION_MODEL_V2.md` | 谁能决定 / Runtime 自动执行边界 / L3 调用权 / 七常委召回 | **否** — 防系统失控；战略变轨禁止 Runtime/L3 直写 |
| **L0 Runtime Layer** | `docs/MEALKEY_RUNTIME_LAYER_V1.md` | 六大 Runtime、经营循环、判断权/流程权/执行权 | **否** — 先做深 Runtime，不扩 Expert |
| **L1 内核协议** | `docs/M_PNT_BRAND_STRATEGY_PROTOCOL_V1.md` | 八阶段 = **内部** Contract/Evidence；非八步 UI | **否** — 禁止按八阶段重做老板 UX |
| **L1 Decision Runtime 后端** | `docs/MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` | MKDecision、状态机、Event、Memory 规则 | 可加深；ID=Prisma Decision |
| **L1 Execution Runtime 后端** | `docs/MEALKEY_EXECUTION_RUNTIME_BACKEND_V2.md` | Action/Validation/Deviation；与 Decision 交接 | 可加深；禁止 M-EXEC 顾问席 |
| **L1 Memory Runtime 后端** | `docs/MEALKEY_MEMORY_RUNTIME_BACKEND_V1.md` | 四层记忆、四级价值、RAG 区别、MVP | 可加深；禁止学习顾问席；不存聊天流水 |
| **L1 Growth Runtime 后端** | `docs/MEALKEY_GROWTH_RUNTIME_BACKEND_V1.md` | 八维、Decision Quality(30/30/40)、GrowthEvent/Task/Report | 可加深；禁止 M-GROW/课程商城；不改决策正文 |
| **L1 User Intelligence Evolution** | `docs/FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md` | Intelligence Profile / BehaviorSignal / Memory Permission；用户飞轮收口 | **否** — 不是第七 Runtime；加深 Memory+Growth；默认不进行业贡献 |
| **L1 Risk Runtime 后端** | `docs/MEALKEY_RISK_RUNTIME_BACKEND_V1.md` | 六大风险域、Score、三层检测、Alert→Decision | 可加深；禁止自行改战略；无证据不发 CRITICAL |
| **L1 Opportunity Runtime 后端** | `docs/MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md` | 五大来源、四因子 Score、→Decision；六大 Runtime 收官 | 可加深；禁止战略终局；**禁止再开第七 Runtime**；下一阶段 Tool Agent Layer |
| **L1 交付代码** | `packages/agents` · `consulting-os` · `m-pnt/consulting` · `m-{mkt,biz,ed}/consulting` | 六步 finalize、签字门禁、一手事实 | 代码即真相 |
| **L2 运行时** | `apps/web` Consulting-OS（TS） | 产品主路径 | 主路径 |
| **L2 执行运行时（代码摘要）** | `docs/M_EXEC_EXECUTION_RUNTIME_V2_DEEPCODE.md` + `capability/execution` | 已落地路径速查 | 细节以 L1 Execution 后端为准 |
| **L2 外呼（可选）** | Python / FastAPI（M-BIZ 等） | 评分/扫描增强 | **降级明示**；失败不得假标 `engine` |

---

## 2. 运行时裁决

1. **Consulting-OS（TS 六步）= 产品主路径。**  
2. **Python 外呼 = 增强层。** 健康检查失败或超时 → 回退启发式/本地加厚，UI 必须显示「外呼降级」，且 `collectionMode` 不得冒充 `engine`。  
3. **签字标准 = L5 门禁。** 见 `packages/agents/src/consulting-os/delivery-gates.ts` 与 M-PNT `evaluateSignOffReadiness`。  
4. **计费 / 鉴权 / 支付** 以 `apps/web/src/server/services/{wallet,payment}.service.ts` 与 `lib/auth-helpers.ts` 为准。  
5. **执行闭环** 增强现有 Execution Capability + Validation OS（`executionRuntime` tRPC）；**不得**把 M-EXEC 做成第五 `FounderAgentName` / 独立顾问席。  
6. **成长闭环** 加深 Growth Runtime（`capability/growth`）；**不得**做成 `M-GROW` 顾问席。凡新模块先判定 Expert vs Runtime（见边界图 V2）。  
7. **工具型 Agent（L3）** 可按场景大量扩展；**不得**做战略终局判断；须经 Decision / Execution 授权调用，结果回写 Memory（见生态地图 V2）。  
8. **权限与副作用** 以权限模型 V2 为准：S2 批准 MKDecision 须老板/常委；S3 战略变轨禁止 Runtime/L3 直写；命中召回清单必须升级七常委。  
9. **Runtime 主线** 六大 Runtime 设计已冻结（Decision/Execution/Memory/Growth/Risk/Opportunity）。实现按 Phase 加深；**禁止再开第七 Runtime**。下一产品扩展层 = 生态地图 **L3 Tool Agent**（不创造战略）。  
10. **Council System V1 已收口**（2026-07-18）。七常委 = AI Governance Council，不是七个 Prompt / 聊天室。组织与三协议冻结后，**工程唯一主线** = Council Runtime Engine（Phase 1–2）；Decision Room 产品化后置。禁止再开「第五核心 Agent」或把七常委做成通用聊天。  
11. **「4 + 1」语义冻结**（2026-07-18）：**4** = M-PNT/M-MKT/M-BIZ/M-ED 全部以 Intelligence Provider 接入 Council；**+1** = MKInsight Contract + Evidence + Decision Trace + 接入闸门。不是四个产品方向。Phase 1 Sprint 顺序见 `FOUNDER_OS_COUNCIL_INTELLIGENCE_4PLUS1_V1.md`（S1 M-MKT Adapter 起）。  
12. **User Intelligence Evolution V1 已冻结**（2026-07-18）：统一 **Intelligence Profile** + **四类行为信号** + **Memory Permission Protocol**。挂在 Memory/Growth 加深，**禁止**第七 Runtime / `M-LEARN` 顾问席 / 默认进行业模型。工程主线仍是 Council Runtime；本层 U0 契约可并行，U2+ 须有 Decision+Execution 燃料。真源：`FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md` · 契约 `founder-layer/contracts/intelligence-profile.ts`。  
13. **Restaurant Brain V1 已冻结**（2026-07-18）：**餐厅经营大脑** = Brand/Business/Market/Organization/Founder 五层 DNA + Decision Memory + 日更认知。产品入口「我的餐厅」为深度页。战略句：先成为最了解这家餐厅的人。挂在 profile/Memory/Decision/Growth 加深，**禁止**第七 Runtime / 新顾问席 / 两小时问卷。**产品主线已切换为 Decision Center（入口）**；Brain = P1 深度层，停止为入口而扩 Schema。真源：`MEALKEY_RESTAURANT_BRAIN_V1.md`。  
13b. **Decision Center V1 已冻结**（2026-07-18）：**餐厅经营决策中心** = 经营晨会；每日扫描 → 体检卡 → Decision Card → 决策空间（七常委）→ 档案（Brain）。路由收口 `/dashboard`。**禁止** ChatGPT 首页、第七 Runtime、平行 Brief、KPI 大屏。真源：`MEALKEY_DECISION_CENTER_V1.md`。  
13c. **Decision Center Technical V1 已冻结**（2026-07-18）：`DailyScanV1` / `DecisionCardV1` / `DailyDiagnosisV1`；Lifecycle 映射 `mkStatus`；Pipeline 编排既有 Runtime；常委 `CouncilSeatView`；Brain 证据墙；接受方案 → `createFromDecision`。**禁止**新 Prisma Decision Center 表。切片 T0–T5。真源：`MEALKEY_DECISION_CENTER_TECHNICAL_V1.md`。  
13d. **Decision Intelligence Engine V1 已正式冻结**（2026-07-18）：五对象 Signal/Case/Context/Option/Learning；Pipeline Sense→…→Learn；Confidence Score（25/20/20/20/15）；七常委=压力测试；M-INTEL=Evidence；Brain=记忆；M-EXEC=Decision Package。**此后首页/常委/Brain/采集/执行/模型调用均服从本文。** 真源：`MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md`。  
13e. **M-INTEL V1 已冻结（Evidence Engine）**（2026-07-18）：只产 Evidence；真源 `MEALKEY_M_INTEL_V1.md`。  
13f. **Decision Context V1 已冻结**（2026-07-18）：系统资产非 Prompt；真源 `MEALKEY_DECISION_CONTEXT_V1.md`。  
13g. **Decision Center 产品交互 V1 已冻结**（2026-07-18）：会议室/Feed/Journey 细节参考。**老板可见路径冲突时以 Decision Experience V1 为准。** 真源：`MEALKEY_DECISION_CENTER_INTERACTION_V1.md`。  
13g2. **Decision Experience V1 已正式冻结**（2026-07-18·架构审查定稿；2026-07-19 增补）：今日决策 = **工作中的决策事项**；语音对话采集；**决策闭环打透**（一词一路·拍板回今日·收件箱四桶真连·复盘不进咨询）；三易·四层能力。真源：`MEALKEY_DECISION_EXPERIENCE_V1.md` §0 / §3.1b / §3.1c。  
13g3. **AI Native Interaction Architecture V1.0 已正式冻结**（2026-07-23）：表现层范式升级——MealKey = **餐饮经营目标编译器**；最高原则 **进目标，不进模块；Chat 是入口，状态与决策是本体**；核心公式 Human Intent→Understanding→Goal Compilation→Agent Execution→Decision Asset→Business Evolution；Goal Seed（一句话≠任务）；Goal Awareness（监控目标进度，非假监控门店）；三层协作面（对话+目标状态+专业成果）；Agent = 编译器函数非入口。真源：`MEALKEY_AI_NATIVE_INTERACTION_ARCHITECTURE_V1.md`。服从交互宪法。  
13g3b. **Interaction Constitution V1.0（交互宪法）已正式冻结**（2026-07-23）：**协作法则非 UI**——十条原则；产品句升级；`INTERACTION_PRINCIPLE` redirect。真源：`MEALKEY_INTERACTION_CONSTITUTION_V1.md`。  
13g3c. **AI Behavior Engine V1.0 已正式冻结**（2026-07-23）：专业感=行为逻辑——四能力；五态；主动 T1–T4 / 沉默；结构化判断；挑战能力。真源：`MEALKEY_AI_BEHAVIOR_ENGINE_V1.md`。  
13g3d. **Product Architecture V2.0 已正式冻结**（2026-07-23）：餐饮经营 AI 操作系统——三层 Interaction/Capability/Cognitive；Agent 隐藏；文件=经营输入。真源：`MEALKEY_PRODUCT_ARCHITECTURE_V2.md`。  
13g3e. **GTM & Monetization V1.0 已正式冻结**（2026-07-23）：商业闭环——P1 老板/创业者；三场景开店决策·经营诊断·菜单优化；Core 免费建关系 + Capability Pack 收费（禁 Agent 货架）；企业 SaaS 后置；100 老板×30 天冷启动；壁垒=合法数据飞轮。真源：`MEALKEY_GTM_MONETIZATION_V1.md`。下一章：MVP 0.1 第一性验证。  





13g4. **AI Native Core Loop V1.0 已正式冻结**（2026-07-23）：生命周期闭环——First Open(Identity+RIP)→First Goal→Compile→Materialize→Decide(决策室)→Execute→Remember→Evolve & Return；与 `MEALKEY_CORE_PRODUCT_LOOP_V1` 分工为「人机协作生命周期」vs「能力日活飞轮」；设计问题五问（何时/为何/知道什么/推什么/如何成资产）。真源：`MEALKEY_AI_NATIVE_CORE_LOOP_V1.md`。  
13g5. **Persistent Business Agent V1.0 已正式冻结**（2026-07-23）：交互定义——**餐饮老板的 AI 经营智能体**；持续学习·自然语言+文件→专业决策与执行；四大核心 **Personality · Memory · Goal Compiler · Workspace**；手机=AI 秘书 / Web=AI Coding Workspace（自然语言编程，非教老板写代码）；Intent=说+上传+观察；真资产=用户经营上下文。真源：`MEALKEY_PERSISTENT_BUSINESS_AGENT_V1.md`。  
13g6. **AI Agent Core Architecture V1.0 已正式冻结**（2026-07-23；**同日身份校准**）：MealKey = **餐饮经营 AI**——持续学习场景·理解目标·知识→能力；**增强老板，非 AI 副总**；三能力懂餐饮/懂用户/想法→专业结果；Agent=专业能力模块非部门副总；Memory 四层投影；废弃产品定位「AI COO」。真源：`MEALKEY_AI_AGENT_CORE_ARCHITECTURE_V1.md`。七常委 COO 席保留且 **≠** 产品自称。  
13g7. **Goal Compiler V1.0 已正式冻结**（2026-07-23）：经营 coding——五层 Intent/Goal/Gap/Workflow/Orchestration + 11 步工程管道；动态 Workflow（非固定 Wizard）；NL 编程隐喻；协作四阶段探索→编译→生成→优化。真源：`MEALKEY_GOAL_COMPILER_V1.md`。  
13g8. **Business Object Model V1.0 已正式冻结**（2026-07-23）：经营世界模型——核心链 Owner→Context→Goal→Decision|Workflow→Asset→Memory；七对象；Memory 三类 Fact/Decision/Pattern；既有 Chief/Council/MKDecision/Workflow/Knowledge 统一归宿；编译产物≠聊天记录。真源：`MEALKEY_BUSINESS_OBJECT_MODEL_V1.md`。  
13g9. **Agent Runtime Architecture V1.0 已正式冻结**（2026-07-23）：可运行编排——Turn Loop T0–T9；Mode Select；Routing（四席映射）；Council 介入条件；Decision/Memory 写入时机；**ChiefAgent=入口不是大脑**。真源：`MEALKEY_AGENT_RUNTIME_ARCHITECTURE_V1.md`。服从 Runtime Boundary V2 / 权限 V2。  
13g10. **Agent Persona V1.0 已正式冻结**（2026-07-23）：人格与行为规范——专业克制的餐饮经营 AI；三支柱懂餐饮/懂用户/增强不替代；自称禁副总；主动=专业提醒非假管理；回合自检五问。真源：`MEALKEY_AGENT_PERSONA_V1.md`。时机状态机见 `MEALKEY_AI_BEHAVIOR_ENGINE_V1`。  

13g11. **Mobile Agent V1.0 已正式冻结**（2026-07-23）：**工程先移动端**——验证「愿不愿意持续把经营问题交给 MealKey」；闭环表达→理解→追问→认知→有价值结果→资产；IA=说/给/看+Goal 条；三能力理解/追问/产出；Web=MealKey Studio 后置（Phase 2）。真源：`MEALKEY_MOBILE_AGENT_V1.md`。  
13g12. **宿主 LLM vs 工具 Agent 已正式冻结**（2026-07-23）：MealKey 宿主（理解/Goal Compiler/Persona/对话）**大模型始终在线**；独立 L3 工具 Agent 可不依赖大模型；禁止把无模型启发式当正式主路径；生产缺 Key → 明确失败；`ALLOW_COMPILER_STUB=1` 仅开发桩。真源：`MEALKEY_LLM_HOST_VS_TOOL_AGENT_V1.md`。  
13g13. **Restaurant Intelligence Model V1.0 已正式冻结**（2026-07-23）：核心资产层——五层 Ontology/Rules/Scenario/Business Model/Decision；护城河=**经营因果图**（非百科）；岗位=经营模型执行节点；战略=通用 LLM 之上建餐饮认知层，不自训替代大模型。真源：`MEALKEY_RESTAURANT_INTELLIGENCE_MODEL_V1.md`。  
13g14. **Restaurant Knowledge Graph V1.0 已正式冻结**（2026-07-23）：底层资产骨架——**可推理的餐饮经营世界模型**（≠传统知识库）；八域实体；关系/因果链/规则/决策模板五类构件；类型层 vs Brain 实例层；P1 先利润/开店/菜单。真源：`MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1.md`。  
13g15. **Skill Engine V1.0 已正式冻结**（2026-07-23）：能力成长层——`Skill=Role×Scenario×Behavior×Outcome`；L1–L5 等级（非考试分）；AI 训练场陪练；闭环学习→练习→工作→反馈→升级；连图谱经营结果；与 User Intelligence 燃料分轨；≠课程 SaaS / ≠ Protocol Decision Skill。真源：`MEALKEY_SKILL_ENGINE_V1.md`。**P1 竖切已接线**：`founder-layer/skill-engine` + `mobileAgent.compile` 拦截「练习/陪练」；剧本含老板营业额诊断 / 店长人效 / 店长营业额诊断 / 服务员家庭推荐。  
13g16. **Learning & Evolution Loop V1.0 已正式冻结**（2026-07-23）：系统级飞轮——合法燃料分轨；Evolution Event；薄调度 `skill|business_capability|council|tool_agent|reflect`；挂 Memory/Growth/Skill/Decision Quality；**禁止第七 Runtime**；岗位=Role Perspective 非新架构。真源：`MEALKEY_LEARNING_EVOLUTION_LOOP_V1.md`。**竖切已接线**：`founder-layer/evolution-loop` + compile/陪练回写。下一章：MVP 0.1 验证。  

13h. **决策质量提升机制 V1.0 已冻结**（2026-07-18）：Pre/Post Decision Quality·Evidence Weight·Confidence Model·Similar Memory·Counterfactual·Challenge·Evolution Loop；目标 Level 5 经营大脑。真源：`MEALKEY_DECISION_QUALITY_MECHANISM_V1.md`。  
13i. **Decision Intelligence Data Contract V1 已冻结**（2026-07-18）：Decision 第一公民；七对象（Case/Context/Evidence/Option/Simulation/Assessment/Learning）+ Unknowns + Trace；不存答案/Prompt 存推理。V1 范围=**第二家店闭环**。代码 SSOT `decision-intelligence-data-contract.ts`。真源：`MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md`。  
13j. **Business Signal Engine 数据契约 V1 已冻结**（2026-07-21）：Signal 五层（观察/模式/意义/影响/行动）；六类 type（FINANCE→OPERATION）；Ranking=`impact×urgency×confidence×relevance`；DailyRadarOutput；Signal→Case Promote Gate（Case.id≡MKDecision.id）；调查追问字段预留。代码 SSOT `@mealkey/business-signal-engine`。真源：`BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md`。  
13k. **DIE 技术架构映射 V1 已冻结**（2026-07-18）：落点 outcome+Brain；接线 Council/四席/M-EXEC；Cursor 文件清单 T0–T5。真源：`MEALKEY_DECISION_INTELLIGENCE_TECH_MAP_V1.md`。  
13l. **MealKey 核心产品闭环 V1 + MVP 90天路线已最终冻结**（2026-07-21）：定位=餐饮经营能力增长系统；五层 Identity→Brain→Signal→Decision→Exec/Evolution；停扩 Agent；唯一场景=单店老板日活；90天 Phase A 生命体征 / B 闭环咬合 / C 种子验证。真源：`MEALKEY_CORE_PRODUCT_LOOP_V1.md` · `MEALKEY_MVP_90DAY_ROADMAP_V1.md`。  
13m. **MVP 闭环断点工程收口**（2026-07-21）：批准→自动 M-EXEC；D+7 复盘进雷达；restaurantContext→Signal；雷达证据进 Brief；外采诚实空态。测试 `mvp-loop-landing.test.ts`。  
13n. **一期上线就绪审计 + P0 加固**（2026-07-21）：auto-exec 失败可感知；Council 开会预创建 DRAFT → Case.id≡MKDecision.id；D+7 双源（profile+Prisma）；confirmFromMeeting 写 Evolution。审计 Canvas：`mvp-commercial-readiness-audit`。  
13o. **商业交付收口**（2026-07-21）：auto-exec 集成测；Promote Gate 单轨；周经营 CSV 上传→Signal；验收增加 `gate.council_stub` / `ops.external_intel`；交付清单 `MEALKEY_COMMERCIAL_DELIVERY_CHECKLIST_V1.md`。**收费 Go = Acceptance `readyForProduction` + 清单手测。**  
13o2. **生产部署手册 V1**（2026-07-21）：Vercel · Postgres · S3 · Upstash · Cron · Gateway/KEK fail-closed · 域名与冒烟。真源 `MEALKEY_PRODUCTION_DEPLOY_V1.md`（配合 `POSTGRES.md` / `BLOB_STORAGE.md`）。
13p. **经营分析中间层冻结**（2026-07-21）：雷达 ≠ 经营分析 ≠ 决策室；标准输出模板+视觉结构 `BUSINESS_ANALYSIS_OUTPUT_TEMPLATE_V1.md`；路由 `/projects/[id]/business-analysis`；决策室文案「分析已就绪」。**禁止**「今日已采齐」冒充采集、禁止「进入经营分析」直跳决策室。
13q. **采集质量门禁**（2026-07-21）：公开检索/证据片段拒绝百科字源等非经营文本（`evidence-quality.ts`）；雷达 Signal 携带五层并默认 href→经营分析；脏证据不进分析正文。
13r. **移动端三易三层 IA**（2026-07-21）：易学/易做/易管；全站信息深度 ≤3；今日=经营动态+值得关注+决策室入口；账户在「我的」。真源 `MOBILE_THREE_EASY_IA_V1.md`。
13s. **拍板唯一场**（2026-07-21）：老板拍板/签字**仅决策室**；今日禁止拍板主 CTA，只允许「进入决策室」。
13t. **变化解读主页面化**（2026-07-21）：取消经营分析二级页；今日=动态模块栏（门店/舆情/推进中）+ 本页变化解读主位；旧 `/business-analysis` 重定向 `/dashboard`。
13u. **Tool Agent Framework V1 已冻结**（2026-07-21）：支撑约 100 个独立 L3；单元=Manifest+Engine+Ports+Bridge；合法出口仅 Signal/Insight/Work/Gap；代码 `@mealkey/tool-agent-kit`；引擎目录 `tool-agents/`。真源 `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md`。批量上架仍服从 MVP 停扩闸门。  
13aa. **MealKey Agent Protocol V1.2 已冻结**（2026-07-21）：五层模型；Capability Registry；Decision Skill；Insight L1–L5；五维质量；Memory 隔离；能力市场；与 Marketplace PRD / M-OPS Reference 三文档收口。真源 `MEALKEY_AGENT_PROTOCOL_V1.md`。  
13aa2. **MealKey Agent Marketplace PRD V1 已冻结**（2026-07-21）：开放平台产品；官网 `mealkey.cn`；Store · 安装授权 · 70/30 分成示意。真源 `MEALKEY_AGENT_MARKETPLACE_PRD_V1.md`。  
13aa2b. **MealKey Developer Portal V1.1 已冻结**（2026-07-21）：开发者操作系统；7 日理解→上架；三类用户；Console 四步；Developer Kit。真源 `MEALKEY_DEVELOPER_PORTAL_V1.md`。  
13aa2b2. **Developer Portal UI/UX V1.1 已冻结**（2026-07-21）：第一工作台；Hero 左右；Why 三卡；Start 三入口；Sandbox Playground。真源 `MEALKEY_DEVELOPER_PORTAL_UI_UX_V1.md`。  
13aa2b3. **Developer Portal IA + 数据模型 V1 已冻结**（2026-07-21）：路由；五对象；lifecycle 状态机；Listing/RevenueShare 连接；`/api/developers/v1`。真源 `MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1.md`。下一刀 P0.1 + Prisma 草案 / P1 Console。  
13aa2c. **第三方可读宪法索引 V1 已冻结**（2026-07-21）：Protocol + External Interface 目录/对照/提审清单；无新字段。真源 `MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1.md`。  
13aa3. **M-OPS 作为生态 Reference Implementation V1 已冻结**（2026-07-21）：Hello World 三重身份。真源 `M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1.md`。  
13ab. **Agent Architecture Principle V1 已冻结**（2026-07-21）：MealKey 不开发功能、定义能力标准；Agent 独立创造能力经协议进大脑；Core/Agent/UI 三边界；四席留 Core。真源 `MEALKEY_AGENT_ARCHITECTURE_PRINCIPLE_V1.md`。  
13ac. **Agent Platform Architecture V1.1 已冻结**（2026-07-21）：四基建；Lifecycle；Runtime 五件套；Context Manager；Orchestra；四独立。真源 `MEALKEY_AGENT_PLATFORM_ARCHITECTURE_V1.md`。  
13ad. **Agent 外接硬闸门**（2026-07-21）：**MealKey 仓库禁止新增任何 Agent**；接口 `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`；UI 框架 `MEALKEY_AGENT_UI_FRAMEWORK_V1.md`（实现外置）。  
13ad2. **Agent Mini Program 平台 V1.1 已冻结**（2026-07-22）：**不是 100 个小程序，而是 1 个 Mini Shell + ~100 Plugin**；Restaurant Brain 为共享长期资产；三层=官方 Shell / Marketplace / 伙伴小程序；模式 1 Plugin（推荐）· 模式 2 伙伴独立小程序经 Gateway；身份 Guest→Bound→Member；燃料=经营点；有效用户裂变示意双边 500、≤两级。真源 `MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md`。  
13ad3. **Mini Shell · Agent Plugin Runtime V1 已冻结**（2026-07-22）：Shell 子系统（Auth/Binder/Fuel/Invite/Catalog/PluginHost/Handoff）；`ShellContextV1` · `PluginUiEventV1` · 生命周期；UI=原生页/受控 web-view/组件片段；Gateway-only；首发 Plugin=餐厅体检。真源 `MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md`。**S1/S2 骨架已落库：** `apps/mini-shell` · `@mealkey/agent-sdk/mini-shell` · `/api/v1/mini-shell/*`；S3+（真微信登录/经营点账本/裂变/Marketplace）后置，服从 MVP 停扩。  
13ae. **MealKey Agent SDK V1 已冻结**（2026-07-21）：`@mealkey/agent-sdk/platform`。真源 `MEALKEY_AGENT_SDK_V1.md`。  
13af. **Agent Gateway Host P0**（2026-07-21）：`/api/v1/gateway/*`；侧车 `profile.agentGatewayIngress`。  
13ag–13ah. **外置诊断落地**后清理（2026-07-21）：独立仓 `C:\Users\xqw13\M-OPS-Agent`；Core 删除 `packages/m-ops-diag`、`mealkey-agents/*`、进程内 bridge/router；产品文档迁至外置仓 `docs/`；MealKey 仅留 `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`。  
13v. **M-OPS-DIAG** 产品冻结原文已迁至外置仓 `M-OPS-Agent/docs/`；MealKey 指针 `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`。  
13x–13z. **M-OPS-DIAG UX / 采集 / 诊断模型** 原文已迁至外置仓 `C:\Users\xqw13\M-OPS-Agent\docs\`（`M_OPS_DIAG_UX_V1` · `M_OPS_DIAG_DATA_COLLECTION_V1` · `M_OPS_DIAG_DIAGNOSIS_MODEL_V1`）。MealKey 仅保留指针 `M_OPS_DIAG_EXTERNAL_POINTER_V1.md`，禁止把诊断产品文档回流本仓。  

13w. **GitHub 真源 + 仓库清理**（2026-07-21；2026-07-23 迁仓）：远端 `Mealkey-Ai`（`https://github.com/xqw1377-prog/Mealkey-Ai.git`）为唯一真源；禁止本地长期堆积未推送；`.vercel/` / `*.tsbuildinfo` 出库；Cursor 规则 `tool-agent-framework-v1` · `github-source-of-truth`；说明 `REPO_SYNC_AND_TOOL_AGENT_RULES_V1.md`。  
13wi. **Core 仓布局收口**（2026-07-23）：根目录禁止再嵌套 `M-BIZ/` `M-ED/` `M-PNT/` `M-MKT/` `M-OPS-Agent/` 整仓；四席侧车仅 `agents/*`；诊断仅外置仓 + Gateway 指针；密钥文件（含 `.env.vercel*`）永不入库。  
18. **Experience Blueprint P0–P5 工程已收口（2026-07-19）**：契约 · Candidate/Inbox · Challenge/Readiness · 经营决策习惯 · M-INTEL 锚点门禁均已接线；真源 `MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md`。黄金路径手测仍有效。**2026-07-21 起主线收束为 MVP 90天飞轮**（不再并行开新能力专题）。禁止 Scan 滥造 Decision、无锚点装懂外部、对外「决策人格」字样。  
18b. **Restaurant Intelligence Profile V1 已正式冻结**（2026-07-19）：第一次登录 = **建立经营认知**（非信息采集）；Identity 速写 → M-INTEL Evidence → 《餐厅经营画像》Snapshot → 确认门禁 → Brain 投影 → 驾驶舱。三层：**事实=Brain / 理解=RIP / 决策=DIE**。契约 `founder-layer/contracts/restaurant-intelligence-profile.ts`。真源：`MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md`。**下一工程刀 = R1 经营速写+确认门禁（可先 Identity-only 画像）**。  
14. **Restaurant Brain 后端 V1 已冻结**（2026-07-18）：包 `@mealkey/restaurant-brain`；表 `RestaurantBrain` / `RestaurantDnaEvent` / `DecisionMemory`；铁律「Agent 先读 Brain」。实现切片 B0–B6 见 `MEALKEY_RESTAURANT_BRAIN_BACKEND_V1.md`。  
15. **Restaurant Brain 数据契约 / 技术 V1 已冻结**（2026-07-18）：Profile · BusinessContext · Capability · DNA · Decision/Action/Learning Memory · EvolutionState。**SSOT：Brain 是唯一业务事实来源**；Agent 只读 Brain → Decision → 写回 Memory。真源：`MEALKEY_RESTAURANT_BRAIN_TECHNICAL_V1.md` + `packages/restaurant-brain`。  
16. **Restaurant Brain 实现边界 + Prisma/Entity 已冻结**（2026-07-18）：**Fact≠Decision**；规范化 `Restaurant` + Profile 表族 + `DecisionRecord`/`ActionRecord`/`LearningRecord`/`BrainEvent`/`EvolutionState`。Agent 唯一出口 `AgentRestaurantContext`。真源：`MEALKEY_RESTAURANT_BRAIN_PRISMA_ENTITY_V1.md` + `packages/restaurant-brain`。  
17. **Restaurant Brain Service Layer V1 已冻结**（2026-07-18）：`RestaurantBrainService` 四方法 + Decision/Event 流程 + Agent 注入规范。DeepCode 切片 S1–S6 见 `MEALKEY_RESTAURANT_BRAIN_SERVICE_LAYER_V1.md`。

---

## 3. 非权威（归档 / 参考）

下列文档可参考，**冲突时以 §1 为准**，不得单独当作开工依据：

- `docs/M_PNT_V2_*`（页面/视觉/运行时设计稿）
- `docs/M_PNT_*PROTOTYPE*`、`*_WORKFLOW_*`、`*_DATA_CONTRACT_*`（多版并存）
- GPT / DeepCode 外发方案（仅输入，不冻结）

新增文档时：要么挂到本表某一层，要么标题标明 `ARCHIVE`。

---

## 4. 变更流程（短）

1. 动老板六步或签字语义 → 先改 L0/L1 文档并注明日期，再改代码。  
2. 只加深内核协议阶段（Challenge / Truth / Options 等）→ 改 Protocol + 代码，**不改**六步步名。  
3. 外呼/模型替换 → 保持降级契约，补测试证明「失败时不假升 engine」。

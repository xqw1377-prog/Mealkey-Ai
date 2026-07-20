# MealKey Founder OS V2 权限模型（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-17  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** `docs/MEALKEY_AGENT_ECOSYSTEM_MAP_V2.md` · `docs/MEALKEY_AGENT_RUNTIME_BOUNDARY_V2.md` · `docs/FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md`  
> **目的：** 明确谁能决定、谁能自动执行、谁能调用工具、何时必须召回七常委——**防止系统失控**。

---

## 0. 一句话

> **判断归四席，收口归 MKDecision，执行归 Runtime，干活归工具；战略变轨与重大利益冲突必须召回七常委（或老板显式签字）。**

权限不是「AI 能不能说话」，而是 **写副作用的权力边界**。

---

## 1. 权限主体

| 主体 | 层 | 权限本质 |
|------|-----|----------|
| **老板（Founder）** | 人 | 终局签字、付费授权、否决一切自动动作 |
| **M-PNT / M-MKT / M-BIZ / M-ED** | L1 | 领域判断与方案草案；**不直接**改执行态、不直接调工具改战略 |
| **七常委（Decision Council）** | 治理 | 多视角裁决、冲突升级、重大决策合法化 |
| **Chief of Staff** | 治理中枢 | 议题路由、议程编排；**不**替代四席做领域终局 |
| **Decision Runtime** | L2 | 创建/绑定/追踪 `MKDecision`；不发明新战略 |
| **Execution Runtime（M-EXEC）** | L2 | 在已批准决策下拆 Action / Validation / 监控 / 建议复会 |
| **Growth Runtime** | L2 | 写成长画像与建议议题；**不**改 MKDecision 正文 |
| **Memory Runtime** | L2 | 沉淀记忆；**不**擅自升格为新战略 |
| **Risk Runtime** | L2 | 发风险信号 + 建议召回席/常委；**不**自行改战略 |
| **Opportunity Runtime** | L2 | 发机会信号 + 建议进席分析；**不**直接下开品类终局 |
| **Tool Agents（L3）** | L3 | 产出执行物；**零战略终局权** |

---

## 2. 能力矩阵（Can / Cannot）

### 2.1 四大能力（L1）**能决定**

| 席位 | 可决定（草案→待收口） | 不可独自终局 |
|------|----------------------|--------------|
| **M-PNT** | 定位主张、品类机会、心智与竞争空位、品牌战略方向 | 开几家店、选哪个铺、股权比例 |
| **M-MKT** | 市场结构判断、用户洞察、竞争与增长机会 | 投放排期终稿、改定位口号 |
| **M-BIZ** | 赚钱模型、盈利/成本/扩张模型边界 | 菜单 SKU 表终稿、法务合同 |
| **M-ED** | 股权/合伙/激励/治理结构草案 | 门店巡检结论、营销文案终局 |

**L1 共同限制：**

- 可产出判断与建议，但 **写入「已批准 MKDecision」** 须经 Decision Runtime 流程 + 老板确认（或七常委表决通过）。  
- **不得**直接调用 L3 工具改变战略对象（品类、定位、模式、股权终局）。  
- **不得**静默覆盖另一席已批准结论；冲突 → 升级七常委。

### 2.2 Runtime（L2）**能自动执行**

| Runtime | 可自动（无需再开会） | 必须停手 / 升级 |
|---------|----------------------|-----------------|
| **Decision Runtime** | 记录决策、绑证据、状态机推进、触发复盘清单 | 把「草案」标成「已批准」而无老板/常委授权 |
| **Execution Runtime** | 在已批准 MKDecision 下生成 ActionPlan、ValidationTask、动作勾选、偏航检测、建议复会议题 | 改战略方向；无决策授权调用 L3；把偏航直接改成新定位 |
| **Growth Runtime** | 写 Capability Gap、Growth Map、learningNext、建议开会议题 | 扣点「强制上课」；改写历史 MKDecision 正文 |
| **Memory Runtime** | 写入企业/项目/行业/经验记忆（带来源） | 无来源的「行业真理」冒充已验证结论 |
| **Risk Runtime** | 生成 RiskAlert、建议召回席/常委文案 | 自行改定位/模式；无证据恐吓推送；直接调 L3 |
| **Opportunity Runtime** | 生成 Opportunity Candidate、建议进席分析 | 直接下「开新品类」终局；绕过 MKDecision 调 L3 |

**Runtime 自动执行前提（全部满足）：**

1. 存在 **已批准** `MKDecision`（或明确的子授权范围）；  
2. 动作在 ActionPlan / Validation 边界内；  
3. 不触及 §4「必须召回七常委」清单；  
4. 计费/钱包规则允许（若涉及扣点）。

### 2.3 工具 Agent（L3）**可以调用**

| 条件 | 说明 |
|------|------|
| **有授权** | 来自已批准 MKDecision + Execution Runtime 任务/Action 引用 |
| **有边界** | 输入含已定模型/定位/预算框；输出为执行物（报告、SKU 表、活动稿） |
| **可回写** | 结果进入 Memory / Validation 证据；供 Growth 学习 |
| **可计费** | 按次/套件扣点或订阅权益内 |

**L3 绝对禁止：**

- 改变品类、定位、商业模式、股权终局；  
- 输出「你应该改成 X 业态」而无 L1 升级路径；  
- 在无 MKDecision 时被产品主路径「一键开跑」；  
- UI 冒充 LIVE Expert / 第四席会议表决权。

---

## 3. 必须召回七常委（或等价升级）

下列任一出现 → **停止自动执行与 L3 扩权**，路由到七常委会议 / 老板显式确认：

| # | 触发条件 | 说明 |
|---|----------|------|
| 1 | **战略变轨** | 改品类、改定位主张、改赚钱模型主路径 |
| 2 | **席间高冲突** | 两席以上对同一 MKDecision 关键建议且 severity=high |
| 3 | **验证证伪** | 关键假设 `invalidated` / 验证 off，且建议放大或改方向 |
| 4 | **重大利益** | 股权变更、融资条款、合伙退出、控制权变化（M-ED 域） |
| 5 | **资本/扩张跃迁** | 从单店验证跃迁到连锁/加盟/多城复制 |
| 6 | **风险底线** | 现金流断裂风险、合规红线、品牌声誉危机（含 Risk Runtime CRITICAL） |
| 7 | **老板否决 / 复会请求** | 显式一键复会、pendingRedeision、偏航建议复会被确认 |
| 8 | **授权缺失** | 无已批准 MKDecision 却请求 L3 或大规模 ActionPlan |

**七常委做什么：** 多视角裁决与合法化，**不是**第五 Expert Engine，也不替代四席的领域深度分析（可先召四席再进常委）。

**可不召常委、Runtime 可继续：**

- 已批准决策下的动作勾选、验证打卡、指标录入；  
- 同边界内 L3 重跑（如再出一版菜单结构，模型未变）；  
- Growth 更新短板文案与建议议题（仅建议，不自动改决策）；  
- Memory 追加证据与结果。

---

## 4. 写入权限（副作用分级）

| 副作用级别 | 示例 | 谁可写 | 门禁 |
|------------|------|--------|------|
| **S0 只读建议** | 会议草案、工具草稿 | L1/L2/L3 | 无 |
| **S1 执行态** | Action 勾选、Validation check-in | Execution + 老板 | 须挂靠已批准决策 |
| **S2 决策对象** | 创建/更新 `MKDecision` 为已批准 | Decision Runtime | 老板确认或七常委通过 |
| **S3 战略变轨** | 改定位/模式/股权终局 | 仅经 L1 重判 + §3 升级 | 禁止 Runtime/L3 直写 |
| **S4 资金** | 扣经营点、支付 | billing / wallet | 既有计费门禁 |

---

## 5. 调用链权限（与生态地图一致）

```
老板意图
  → L1 四席判断（S0/草案）
  → Decision Runtime 收口 MKDecision（S2：批准）
  → Execution Runtime 拆 Action / Validation（S1）
  → L3 工具产出（S0→回写证据）
  → Growth + Memory（学习）
  → 若命中 §3 → 七常委 / 复会 → 回到 L1
```

**长沙小吃示例（权限视角）：**

1. 四席形成草案 → 老板确认 → `MKDecision` 批准；  
2. M-EXEC 自动生成 30 天验证（S1）；  
3. Site/Menu/Marketing 仅在任务授权下调用；  
4. 若验证证伪「小吃模型」→ **禁止** Menu Agent 改火锅；必须复会 / 七常委 / 重开 M-BIZ+M-PNT。

---

## 6. 产品与工程闸门（实现时对照）

| 检查项 | 失败则 |
|--------|--------|
| L3 API 是否携带 `decisionId` / `actionId` / 批准态？ | 拒绝执行 |
| Execution 是否在改 `positioning` / `businessModel` 终局字段？ | 拒绝；改走复会 |
| Growth 是否 rewrite 历史决策正文？ | 拒绝；只允许 Pattern/Gap |
| 会议扣点是否在无批准决策时「代跑」全套 L3？ | 拒绝或降级为仅 L1 会议 |
| UI 文案是否把 Tool/Runtime 写成第五顾问？ | 禁止上线 |

代码真相源（渐进对齐，不阻塞本冻结）：

- 决策/会议：`capability/decision` · meeting · council  
- 执行：`capability/execution` · Validation OS · `executionRuntime`  
- 成长：`capability/growth` · `growthRuntime`  
- 计费：`wallet` / `payment` services  

---

## 7. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V2-freeze | 2026-07-17 | 冻结权限主体、Can/Cannot、七常委召回清单、副作用分级 |
| V2-runtime6 | 2026-07-18 | 纳入 Risk / Opportunity Runtime 主体与自动执行边界 |

# MealKey Restaurant Knowledge Graph V1.0（餐饮经营知识图谱 · 冻结）

> **状态：正式冻结（Freeze）— 可推理的餐饮经营世界骨架；≠传统知识库 / ≠百科浏览层**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0 认知护城河  
> **上游：** `MEALKEY_RESTAURANT_INTELLIGENCE_MODEL_V1.md`（L1 Ontology + L2 Rules + L4 Causal 的可存储骨架）  
> **消费方：** Goal Compiler · DIE · Persona · Brain（实例化）· Role / Skill Engine（待冻）  
> **明确不做：** 资料堆砌知识库；老板逛图谱 UI；平行 Prisma「百科大表」；把聊天标签当节点；P1 未验证前全行业十万级实体入库。

---

## 〇、定义修正（冻结）

| 误解 | MealKey 真相 |
|------|----------------|
| 传统知识库 | 存很多资料 |
| 普通知识图谱 | 描述「什么和什么有什么关系」 |
| **本文件** | **可推理的餐饮经营世界模型** —— 关系可传播影响、规则可触发、路径可走 |

**一句话目标：**

> 让 AI 像拥有 30 年餐饮经验的人一样理解餐饮世界——  
> 不是只知道「什么是毛利率」，而是知道「毛利率变化会影响什么、什么情况下该调整」。

**战略定位：**

> 无限知识时代，MealKey = 餐饮行业 **知识 → 能力** 转换系统的世界骨架层。  
> 图谱服务推理与编译；**能力成长** 由下一章 Skill Engine 承接。

---

## 一、总体结构（冻结）

```text
MealKey Restaurant Knowledge Graph

                 餐饮世界
                    |
    People · Organization · Brand · Store
    Product · Customer · Market · Operation
                    |
              经营关系（Relationship）
                    |
              经营因果链（Causal Chain）
                    |
              经营规则（Rule）
                    |
              决策模板（Decision Pattern）
```

与 Intelligence Model 映射：

| 图谱构件 | Intelligence Model |
|----------|-------------------|
| 主体实体 + 属性 | L1 Ontology |
| 经营关系 | L1 边 + L4 影响入口 |
| 因果链 | L4 Causal Graph |
| 规则库 | L2 Knowledge Rule |
| 决策模板 | L3 Scenario 路由 + L5 路径骨架 |

**实例 vs 类型：**  
- **类型层（本图谱）**：行业通用「社区店 / 客单档位 / SKU 风险」  
- **实例层（Brain / BOM）**：这家店、这道菜、这个老板的事实  
推理 = 类型规则 + 实例事实；禁止用实例聊天记录冒充类型知识。

---

## 二、第一类：主体实体（Entity）

### 2.1 八域（V1 必有）

| 域 | 说明 |
|----|------|
| People | 经营者 · 员工 ·（角色视角的）顾客需求载体 |
| Organization | 公司 / 多店组织（P1 可薄） |
| Brand | 定位+价值+客群+产品+体验+文化（≠店名字符串） |
| Store | 地点→商圈→客群→场景→经营模型 |
| Product | 菜品 · 菜单结构（引流/利润/形象） |
| Customer | 年龄/场景/消费能力/需求（客群模型） |
| Market | 竞争 · 商圈供给 · 季节（P1 最小） |
| Operation | 收入/成本/利润/效率/增长变量 |

### 2.2 关键实体属性（V1 最小可推理集）

**经营者：** 经验 · 风格 · 资源 · 风险偏好  
**员工：** 岗位 · 技能 · 等级 · 成长路径（引用点 → Skill Engine）  
**顾客：** 年龄段 · 消费场景 · 消费能力 · 核心需求  
**品牌：** 定位 · 价值主张 · 主客群 · 产品主张 · 体验主张 · 文化标签  
**门店：** 面积 · 商圈类型 · 客群结构 · 主场景 · 经营模型类型  
**菜品：** 成本 · 毛利 · 制作难度 · 销售表现  
**菜单：** 结构 · 引流品 · 利润品 · 形象品 · SKU 规模  

**铁律示例：** 同 200㎡，商业街店 ≠ 社区店 ≠ 写字楼店 ≠ 商场店——**商圈类型是一等公民属性**，禁止只存地址字符串。

**品牌示例（类型理解，非营销文案）：**  
「等里长沙」类社区品牌 → 社区属性 · 地方文化 · 家庭消费 · 高频场景——AI 推理时挂客群/产品/价格逻辑，而非「一个名字」。

---

## 三、第二类：经营关系（Relationship）

真正有价值的是边，不是词条。

| 关系 | 示例 | 推理用途 |
|------|------|----------|
| Product → Customer | 辣椒炒肉 → 湖南客 / 家庭聚餐 / 高复购 | 菜单与推荐 |
| Positioning → Product | 社区餐厅 → 高频·稳定·价格友好 | 产品合规模 |
| PriceBand → CustomerLogic | 客单 30 vs 150 → 完全不同经营逻辑 | 定位/营销边界 |
| Role → Outcome | 服务员推荐力 → 加菜率 → 客单 | 岗位因果节点 |
| StoreType → Model | 社区店 → 复购优先；商场店 → 客流转化优先 | 场景路由 |

关系边须带：`from` · `to` · `type` · `strength`（可选）· `condition`（可选）。  
禁止无条件「万物相连」的装饰边。

---

## 四、第三类：经营因果链（Causal Chain）

**MealKey 最大价值落点。** 边可传播影响；Compiler/DIE 在相关意图下必须能走链。

### 4.1 菜品优化（反例对照）

| 普通 AI | MealKey |
|---------|---------|
| 「优化菜单」 | SKU↑ → 备料↑ → 损耗↑ → 厨房复杂度↑ → 出品↓ → 复购↓ → **建议控 SKU** |

### 4.2 V1 必具备用链（最小集）

1. **营业额分解：** 客流 × 转化 × 客单 × 复购 → 营业额  
2. **利润分解：** 营业额 − 食材 − 人工 − 房租 − 损耗 − 营销 → 利润  
3. **降价冲击：** 降价 → 客单↓ → 需订单↑ → 厨房压力↑ → 人效风险↑ → 利润？  
4. **SKU 膨胀：** 见上  
5. **岗位→结果：** 推荐力→加菜→客单；出品稳定→满意度→复购；店长管理→人效→利润  

验收：问「营业额下降怎么办」→ 输出须引用至少一条因果链变量拆解，禁止无序建议清单。

---

## 五、第四类：经营规则库（Rule）

专家经验 → 可执行判断依据（**不是**固定答案）。

### 5.1 V1 样板规则（必须可编码）

**开店 · 租金压力**

```text
IF 租金 / 预计营业额 > 0.15 THEN 风险↑（租金占比过高）
```

**菜单 · 复杂度**

```text
IF SKU > 80 AND 厨房面积 < 30㎡ THEN 效率风险↑
```

**人效 · 人工占比**

```text
IF 人工成本 / 营收 > 0.30 THEN 提示人员结构问题
```

### 5.2 Rule 契约字段（冻结）

`id` · `if`（条件）· `then`（判断/提示）· `domain`（开店/菜单/人效…）· `severity` · `evidenceLevel` · `source`  
注入：Knowledge 载体 / 领域 YAML → Compiler · Coach；**不得**直出拍板合同绕过决策室。

---

## 六、第五类：决策模板（Decision Pattern）

高手路径 = 经营算法骨架（Scenario 遍历顺序）。

### 6.1 开店决策路径

```text
为什么开？ → 服务谁？ → 解决什么需求？ → 竞争优势？ → 盈利模型？ → 复制可能？
```

### 6.2 菜品决策路径

```text
符合定位？ → 客户喜欢？ → 毛利合理？ → 供应稳定？ → 制作标准？
```

Pattern 字段：`id` · `scenario` · `steps[]` · `requiredEntities` · `linkedRules` · `linkedCausalChains`  
Compiler 在对应 IntentFamily 下 **优先走 Pattern 步骤**，再填实例缺口（Unknowns）。

---

## 七、智能层总图（冻结）

```text
              GPT / DeepSeek（推理发动机）
                        ↓
          MealKey Intelligence Layer
                        ↓
        Restaurant Knowledge Graph（本文件）
          世界 · 关系 · 因果 · 规则 · 决策模板
                        ↓
     Brain 实例化 · Compiler · DIE · Role/Skill
                        ↓
                   AI Agent（调用面）
                        ↓
                  用户能力提升
```

---

## 八、与既有系统边界

| 系统 | 本图谱提供 | 本图谱不提供 |
|------|------------|--------------|
| Intelligence Model | 可存储/可遍历骨架 | 产品叙事 alone |
| BOM | 类型约束与枚举 | 运行时 Goal/Decision 实例 |
| Brain | 类型→实例绑定 | 这家店私有事实本体 |
| Knowledge Engine | Rule/CASE 落点 | 场景编排 |
| DIE | 因果与 Pattern 输入 | 终局拍板 |
| Skill Engine（下一章） | Role→Outcome 边 | 成长阶梯与训练闭环 |

---

## 九、工程顺序（冻结）

1. 冻本图谱契约（实体域 · 关系类型 · 因果链最小集 · Rule/Pattern 字段）✓  
2. **Skill Engine V1** ✓ — `MEALKEY_SKILL_ENGINE_V1.md`  
3. 代码 SSOT：领域常量 / YAML 或 TS 模块（禁散落 Prompt）  
4. Compiler 竖切：利润/菜单意图强制走因果链 + Pattern  
5. Brain 绑定：门店商圈类型、客单档位等一等属性可写可读  
6. **下一章 Learning & Evolution Loop**

**P1 范围闸门：** 先覆盖老板/店长高频场景（利润、开店、菜单）；全岗位训练内容后置。

---

## 十、下一章入口

图谱 + Skill Engine 已冻。下一拼图：

**`MealKey Learning & Evolution Loop`** — 越用越懂餐饮 / 越用越懂用户的数据飞轮。

---

## 十一、冻结句

> Restaurant Knowledge Graph = **可推理的餐饮经营世界模型**，不是资料库。  
> 价值在 **关系 · 因果 · 规则 · 决策路径**；实体只是挂点。  
> 能力成长见 **Skill Engine**；系统飞轮见 **Learning & Evolution Loop**。

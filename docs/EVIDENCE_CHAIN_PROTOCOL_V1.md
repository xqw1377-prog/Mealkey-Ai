# EVIDENCE_CHAIN_PROTOCOL_V1（冻结）

> **状态：正式冻结（Freeze）— 每个雷达判断必须可追溯**  
> **日期：** 2026-07-20  
> **产品一句：** AI 必须解释「为什么提醒你」，否则就是瞎说。  
> **配套：** `BUSINESS_SIGNAL_ENGINE_V1` · `TODAY_RADAR_EXPERIENCE_V1`

---

## 〇、壁垒

| 普通 AI / 报表 | MealKey |
|----------------|---------|
| 给结论 | 结论 + **证据链** |
| 混用内外数据不说明 | 分清内部事实 / 外部情报 / AI 推理 |
| 无法复盘 | 链可写入 Brain / 决策档案 |

---

## 一、证据链结构（冻结）

```text
EvidenceChainStepV1 =
  order: number
  kind: "internal_fact" | "external_intel" | "inference"
  claim: string          # 一句可核验或可辩护的陈述
  sourceRef?: string     # 来源锚（评价批次 / 竞品 ID / Brain factId）
```

### 硬约束

1. 每条进首页的信号，`evidenceChain.length >= 2`  
2. 至少 1 步为 `internal_fact` **或** `external_intel`（禁止纯推理链）  
3. 最后一步允许 `inference`（「判断：…」）  
4. 无证据则 **不得** 标为 `decide` 进「今天最值得关注」；最多 `watch` 或不出首页  

---

## 二、示例（冻结范式）

```text
为什么提醒：

1. [external] 过去7天点评新增42条
2. [external] 其中16条提到等待
3. [external] 同区域竞品没有类似差评增长
4. [inference] 结合晚市高峰，服务流程更可能是限制因素
```

---

## 三、与证据权重

可信度 `trust` 参考：

- 来源信任带（见决策质量 / 数据契约）  
- 新鲜度  
- 与本店相关度  
- 链上事实步数  

公式细节见 `BUSINESS_SIGNAL_ENGINE_V1` Ranking。

---

## 四、版本

- **V1 冻结日：** 2026-07-20  
- **实现类型：** `EvidenceChainStepV1` in business-signal contracts

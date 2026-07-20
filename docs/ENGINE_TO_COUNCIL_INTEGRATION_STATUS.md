# 四引擎 → 七常委集成状态

> 最后更新：2026-07-18

## 最终状态

| 维度 | M-PNT | M-MKT | M-BIZ | M-ED |
|:----|:-----:|:-----:|:-----:|:-----:|
| **MKInsight Provider** | ✅ `toMPntMkInsights` | ✅ `toMMktMkInsights` | ✅ `toMBizMkInsights` | ✅ `toMEdMkInsights` |
| **领域专用 ExpertReport** | ✅（Insight 投影） | ✅（Insight 投影） | ✅（Insight 投影） | ✅（Insight 投影） |
| **专用适配器文件** | `mk-insight-adapter.ts` + ExpertReport | `mk-insight-adapter.ts` | `mk-insight-adapter.ts` | `mk-insight-adapter.ts` |
| **领域 sections** | 品类/心智/定位/品牌战略 | 市场扫描/竞争/进入方式/验证 | 模式体检/单位经济/利润/复制 | 股权扫描/控制权/合规/执行 |
| **Evidence IDs** | ✅ `evidenceLedger` | ⚠️ contract.evidenceUsed | ⚠️ contract.evidenceUsed | ⚠️ contract.evidenceUsed |
| **Strength 评估** | ✅ `brand-strength-engine.ts` | ❌ | ❌ | ❌ |
| **常委消费镜头** | CBO/CSO/CMO | CMO/CSO/BMO | BMO/CFO/COO | CFO/CRO/CSO |
| **真实挂载路径** | ✅ `m-pnt-consulting.service` | ✅ `agent-consulting.service` | ✅ `agent-consulting.service` | ✅ `agent-consulting.service` |

## 改进摘要

本轮为 M-MKT/M-BIZ/M-ED 各创建了领域深度 ExpertReport 适配器，从通用 `toAgentConsultingExpertReport`（scan/choice/proof/exec 四个泛化章节）升级为各引擎专属的领域 sections：

- **M-MKT**: 市场扫描 → 竞争格局 → 进入方式 → 验证与杀出线
- **M-BIZ**: 模式体检 → 单位经济 → 利润结构与主航道 → 复制与执行
- **M-ED**: 股权扫描 → 控制权与治理结构 → 风险与合规底线 → 签署与执行

三个适配器均已挂载到 `decision-room-runtime.ts` 的 `loadProjectExpertReports` 中。

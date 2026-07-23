# Founder OS 治理内核

> **V1.0 宏观架构已冻结** → 见 [`docs/FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md`](../docs/FOUNDER_OS_V1_ARCHITECTURE_FREEZE.md)  
> 配置真源：`architecture/v1_freeze.yaml`  
> 下一阶段：**不再扩宏观架构**；工程主线对齐 AUTHORITY —— **Council Runtime Engine** + Intelligence 接入。

## 三层（冻结）

1. **Expert Engines** — M-PNT / M-MKT / M-BIZ / M-ED（不再加第五个）  
2. **Decision Council** — 七常委刚好 7 个（不再加席）  
3. **Chief of Staff** — 操作中枢（非专业 Engine；合约已冻，Phase 4 实现）

## 管决策，不管执行

不做：ERP / 门店系统 / 培训 / 营销执行 / 供应链 / 点餐 / 日常 SOP。

## 目录

```text
founder-os/
  architecture/       # 含 v1_freeze.yaml
  knowledge/          # 七常委知识资产
  scenarios/          # 经营场景矩阵
  constitution/       # FDC 宪法
  operating-rules/    # CDO · 分级 · 会议 · 双轨 · 红线
  expert-engines/     # 四大引擎定位
  roles/ + roles/v2/  # 约束函数 + 人格认知
  decision-types/     # 权重与 veto
  matrices/           # 冲突轴
  schemas/            # 运行时对象
```

## 开发优先级（对齐 AUTHORITY）

1. Council Intelligence Integration（四席 Adapter → MKInsight）  
2. **Council Runtime Engine**（Session / Debate / Vote / Decision）  
3. Memory / Growth（战绩 · 偏好 · User Intelligence）  
4. Decision Room 产品化（后置）

四席引擎深化挂在 Adapter / Provider 上，不另开「第五顾问席」。

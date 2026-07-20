# MealKey 经营点经济模型 V1

> 更新：2026-07-15  
> 心智：**购买经营点，解决经营问题** — 不是 SaaS 套餐 / Agent 次数。

---

## 1. 账本

| 层 | 实现 |
|----|------|
| 余额 | `BillingAccount.metadata.businessPoints` |
| 流水 | `CreditLedger` · `currency=POINTS` · `POINTS_GRANT` / `POINTS_DEBIT` / `POINTS_REFUND` / `POINTS_BOOTSTRAP` |
| 价值档案 | `metadata.valueArchive[]`（投入点 + 获得物 + 状态） |

首次读取时把旧 Hybrid（剩余 run × 100 + 余额元 × 100）折算进经营点（只做一次）。

服务：`apps/web/src/server/services/business-points.service.ts`

---

## 2. 结算时机

| 动作 | 行为 |
|------|------|
| `founder.startMeeting` | **预扣** → 成功归档「已完成」→ 失败 **自动退回** |
| `/api/agent/stream` | 只做经营点门禁（`assertAgentQuota`），避免与会议双扣 |
| 充值 credit_pack | 元余额入账 + **营销经营点**到账（探索 1万 / 创业 6万 / 连锁 30万） |

---

## 3. 价格冻结

| 包 | 价格 | 经营点 |
|----|------|--------|
| 探索包 | ¥99 | 10,000 |
| 创业包 | ¥499 | 60,000 |
| 连锁成长包 | ¥1,999 | 300,000 |

| 能力 | 消耗 |
|------|------|
| 品牌 / 市场 / 经营咨询 | 800 |
| 商业 / 资本 | 1,200 |
| 增长诊断 | 3,000 |
| AI 经营委员会 | 5,000 |

---

## 4. 前端入口

- `/billing` 经营点中心（余额 / 充值 / 经营档案）
- 今日简报：余额条 + 价值
- 会议前：消耗确认页
- 成长 → 经营点

产品目录：`apps/web/src/lib/business-wallet.ts`

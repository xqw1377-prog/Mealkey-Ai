# MealKey 商业交付清单 V1（冻结）

> **状态：正式冻结** · 2026-07-21  
> **用途：** 种子上线 / 收费演示前的强制验收  
> **权威：** `docs/AUTHORITY.md` · 管理台 `buildProductAcceptanceReport`

---

## 〇、交付承诺（可对外说）

1. 老板每天打开 → 看到经营判断书（有变化或诚实空态）  
2. 签字后 → **自动进入执行** + **第 7 天复盘提醒**  
3. Case.id ≡ MKDecision.id（可追溯）  
4. **不编造**点评星级/百分比  

不可对外承诺：点评/抖音官方实时 API、POS 自动同步（V1 为周上传）。

---

## 一、环境变量（生产必须核对）

| 变量 | 要求 | 失败时行为 |
|------|------|------------|
| `SEARXNG_URL` 或 `SERPAPI_KEY` | **商业交付强烈建议** | 雷达诚实空态占比高 |
| `ALLOW_COUNCIL_STUB` | 生产必须 **未设置 / ≠1** | 验收 `gate.council_stub` fail |
| `FOUNDER_ALLOW_DEGRADED_MEETING` | 生产必须关闭 | 验收 `gate.degraded` fail |
| `HEURISTIC_ONLY` | 生产禁止 true | 假咨询 |
| `PAYMENT_MODE` | 收费环境 = `live` | sandbox 不能收真钱 |
| `WECHAT_PAY_*` | live 必配 | 无法收款 |
| `UPSTASH_REDIS_*` | 生产限流必配 | 可能全拒 |
| `QWEN_/DASHSCOPE_API_KEY` | 语音店访建议配 | 口述失败 |

验收入口：管理台 Acceptance Readiness API → `readyForProduction` 必须为 true。

---

## 二、功能验收（老板路径）

| # | 步骤 | 通过标准 |
|---|------|----------|
| 1 | 建档 Identity → 确认 RIP | 未确认不可进驾驶舱 |
| 2 | 打开今日雷达 | 有判断句；无证据时出现诚实空态 |
| 3 | 上传周经营 CSV | 雷达出现经营相关变化 / 可信度提示 |
| 4 | 从雷达进入经营分析 | Brief 含证据摘要 |
| 5 | 七常委签字 | 提示「已自动进入执行」；失败须红字说明 |
| 6 | 第 7 天打开 | 出现「第7天复盘到了」三问（与 Dashboard 验证条不重复） |
| 7 | 生产开会无 stub | 无 MKInsight 时拒绝开常委 |

---

## 三、CSV 模板（经营周报）

```text
日期,营业额,客流,客单
2026-07-14,82000,710,115
```

接口：`restaurantIntelligence.uploadWeeklyOps`  
落点：`profile.weeklyOpsMetrics` → Signal `internalFacts`

---

## 四、工程护栏（CI）

| 测试 | 覆盖 |
|------|------|
| `trpc-meeting-gates.test.ts` | `executionStarted` / 失败 `executionError` |
| `mvp-loop-landing.test.ts` | D+7 · Brief 证据 · 空态 · restaurantContext |
| `business-signal-engine-package.test.ts` | Promote Gate · Ranking |
| `decision-candidate-promote.test.ts` | DecisionSignal Promote Gate |
| `product-acceptance.test.ts` | council_stub / degraded |
| `weekly-ops-upload.test.ts` | CSV 解析 |

命令：`npm --workspace @mealkey/web run test`

---

## 五、Go / No-Go

**Go（可收费种子）：**  
`readyForProduction=true` + 上表老板路径手测全绿 + 外采 Key 已配或合同附件写明「诚实空态 SLA」。

**No-Go：**  
生产仍开 stub/降级；签字后 UI 仍显示「已写入行动」却无执行；编造口碑数字。

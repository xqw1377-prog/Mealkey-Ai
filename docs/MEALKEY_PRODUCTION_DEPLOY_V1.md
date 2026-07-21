# MealKey 上线与部署手册 V1

> **状态：运维真源（可随环境演进）** · 2026-07-21  
> **用途：** 生产 / 预发部署、环境变量、域名、迁移、冒烟与回滚  
> **产品验收（收费 Go）：** 仍以 `MEALKEY_COMMERCIAL_DELIVERY_CHECKLIST_V1.md` + Acceptance `readyForProduction` 为准  
> **权威入口：** `docs/AUTHORITY.md`

---

## 0. 部署形态（当前默认）

| 层 | 推荐 | 说明 |
|----|------|------|
| App | **Vercel**（`@mealkey/web` / Next.js） | 根目录 `vercel.json`：`turbo build --filter=@mealkey/web` |
| DB | **PostgreSQL 16+** | 生产禁止 `file:` SQLite；schema 用 `schema.postgresql.prisma` |
| 对象存储 | **S3 兼容**（AWS / R2 / MinIO） | 生产强制 `BLOB_STORAGE_PROVIDER=s3` |
| 限流 | **Upstash Redis REST** | 未配则生产 fail-closed；勿长期 `RATE_LIMIT_ALLOW_MEMORY=1` |
| Cron | Vercel Cron → `/api/cron/reconcile-payments` | 每 2 小时；须 `CRON_SECRET` |
| LLM | DeepSeek 或 OpenAI | 至少配一个；语音建议再配 `DASHSCOPE_API_KEY` |

本地基建对照：`docker-compose.yml`（Postgres / Redis / MinIO）、`docs/POSTGRES.md`、`docs/BLOB_STORAGE.md`。

---

## 1. 域名与路由约定

| 对外域名（目标） | 本仓路由 | 用途 |
|------------------|----------|------|
| `mealkey.cn` | `/` · `/store` · `/login` · `/dashboard` | 官网 + Store + 老板端 |
| `developers.mealkey.cn` | `/developers/*` | 开发者门户（当前可同域 path） |
| 管理台 | `/platform/admin` | 仅 `PLATFORM_ADMIN_EMAILS` 白名单 |

部署时至少配置：

```bash
NEXT_PUBLIC_APP_URL="https://mealkey.cn"
# 若开发者站独立子域，反向代理到同一部署的 /developers，或后续拆项目
```

支付回调须与公网 URL 一致：

- `WECHAT_PAY_NOTIFY_URL=https://mealkey.cn/api/billing/notify/wechat`
- `ALIPAY_NOTIFY_URL=https://mealkey.cn/api/billing/notify/alipay`
- `ALIPAY_RETURN_URL=https://mealkey.cn/billing`

---

## 2. 生产环境变量清单

完整模板见根目录 `.env.example`。下表按 **必须 / 强烈建议 / 禁止** 分类。校验真源：`apps/web/src/lib/env.ts`（`NODE_ENV=production`）。

### 2.1 必须（缺则构建或运行 fail-closed）

| 变量 | 要求 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串；**禁止** `file:` |
| `AUTH_SECRET` | ≥16 位强随机 |
| `CRON_SECRET` | ≥16 位；Cron Bearer |
| `BLOB_STORAGE_PROVIDER` | 必须 `s3` |
| `S3_BUCKET` · `S3_REGION` · `S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY` | 与 Provider 配套；R2/MinIO 另配 `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE` |
| `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` | 生产限流；否则须显式 `RATE_LIMIT_ALLOW_MEMORY=1`（不推荐） |
| `MK_AGENT_SECRET_KEK` | ≥16；**禁止** `mk-sandbox-agent-secret` |
| `MK_AGENT_SANDBOX_SECRET` 或 `MK_AGENT_REGISTRY_JSON` | 非默认明文；Registry 优先 |
| `MK_GATEWAY_USER_TOKENS` | 逗号分隔；推荐 `token\|ownerId` 租户绑定 |
| `PLATFORM_ADMIN_EMAILS` | 逗号分隔管理员邮箱；空则无人是管理员 |
| `NEXT_PUBLIC_APP_URL` | 生产 HTTPS 根 URL |

### 2.2 收费 / 商业交付强烈建议

| 变量 | 要求 |
|------|------|
| `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` | LLM |
| `PAYMENT_MODE` | 收费环境 = `live` |
| `WECHAT_PAY_*` / `ALIPAY_*` | live 必配对应渠道；平台公钥用于微信回调验签 |
| `SEARXNG_URL` 或 `SERPAPI_KEY` | 外采；否则雷达诚实空态占比高 |
| `DASHSCOPE_API_KEY` | 语音店访 |
| `MK_EVENT_INGEST_TOKEN(S)` · `MK_EVENT_SIGNING_SECRET` | 平台事件接入 |

### 2.3 生产禁止开启（误开即 No-Go）

| 变量 | 说明 |
|------|------|
| `ALLOW_COUNCIL_STUB=1` | 常委 stub |
| `FOUNDER_ALLOW_DEGRADED_MEETING=1` | 降级开会仍扣点 |
| `HEURISTIC_ONLY=true` | 假咨询 |
| `PAYMENT_ALLOW_SANDBOX=1` | 生产沙箱收款（仅应急） |
| `MK_GATEWAY_SKIP_INSTALL_CHECK=1` | 生产代码会忽略，但仍勿配 |
| `MK_GATEWAY_DEV_OPEN=1` | 生产忽略；勿配 |
| `MK_GATEWAY_ALLOW_SANDBOX_TOKEN=1` | 万能 sandbox Bearer |
| `MK_ALLOW_PUBLIC_PREVIEW_AUTH=1` | 公网预览鉴权旁路 |
| `SKIP_ENV_VALIDATION=1` | 跳过 env 校验（仅本地/CI） |
| `AUTH_TRUST_HOST=true` | 生产应 `false` 或不依赖宽松 Host |

生成示例：

```bash
# PowerShell
-join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object {[char]$_}))
# openssl
openssl rand -base64 32
```

---

## 3. 数据库上线步骤

详见 `docs/POSTGRES.md`。生产最短路径：

```bash
# 1) 准备 Postgres schema（会备份 sqlite schema）
npm run db:pg:prepare

# 2) 指向生产 DATABASE_URL 后
cd apps/web
npx prisma generate
npx prisma migrate deploy
# 若尚无 migration 历史、空库可临时：
# npx prisma db push

# 3) 可选种子（勿对已有生产库乱 seed）
# npm run db:seed
```

**硬闸门：**

- CI / 本地须保持 `schema.prisma` 与 `schema.postgresql.prisma` **model 集合一致**（`schema-parity` 测试）。
- Developer Portal 表（`DeveloperAccount`、`PartnerAgent*` 等）必须已在 Postgres schema 中，否则入驻/审核崩溃。
- Serverless 建议 PgBouncer / Prisma Accelerate，避免连接打满。

---

## 4. Vercel 部署步骤

1. **GitHub 真源** 推送到约定远端（见 `REPO_SYNC_AND_TOOL_AGENT_RULES_V1.md`）。  
2. Vercel 导入 monorepo；Root Directory = 仓库根（使用根 `vercel.json`）。  
3. 在 Vercel Project → Settings → Environment Variables 填入 §2 清单（Production / Preview 分开）。  
4. 确认 Build：
   - Install：`npm ci && npm --workspace @mealkey/web run prisma:generate`
   - Build：`npx turbo build --filter=@mealkey/web`
5. 绑定自定义域名；证书生效后更新 `NEXT_PUBLIC_APP_URL` 与支付回调。  
6. 确认 Cron 已启用（`vercel.json` → `/api/cron/reconcile-payments`），且请求带 `Authorization: Bearer $CRON_SECRET`。

本地等价构建：

```bash
npm ci
npm --workspace @mealkey/web run prisma:generate
npx turbo build --filter=@mealkey/web
```

---

## 5. 对象存储与限流

### S3 / R2 / MinIO

见 `docs/BLOB_STORAGE.md`。生产最低集：

```bash
BLOB_STORAGE_PROVIDER=s3
S3_BUCKET=mealkey-assets
S3_REGION=auto          # R2 常用 auto
S3_ENDPOINT=https://... # R2 / MinIO 必填
S3_FORCE_PATH_STYLE=true  # MinIO 常开
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://...   # 若对象需公网可读
```

本地冒烟：`npm run db:minio:up` → `npm run db:minio:smoke`。

### Upstash

创建 REST 数据库后填入 URL + TOKEN。多实例 Vercel 下**不要**依赖内存限流。

---

## 6. Agent Gateway / Store / 开发者门户

生态主链路依赖 Gateway 安装硬闸与密钥封装：

1. 配置 `MK_AGENT_SECRET_KEK`（轮换需计划重新 seal Partner secret）。  
2. `MK_GATEWAY_USER_TOKENS` 使用 `listedToken|ownerUserId`，与门店 Owner 对齐。  
3. 官方 / Partner Listing 经 Admin Partner Review 发布；安装写入 `AgentEntitlement`。  
4. 冒烟路径：
   - `GET /store` · `GET /api/store/listings`
   - `GET /developers` · 登录后 Console
   - 无签名 Context / Ingress → **401**
   - 未安装 `partner.*` → **403 SCOPE_DENIED**

垂直 Agent 引擎（M-BIZ/M-ED/M-MKT Python）为增强层：生产可不挂；失败须降级明示，禁止 `HEURISTIC_ONLY` 冒充 engine。

---

## 7. 上线后冒烟（15 分钟）

按顺序执行；任一项失败则暂停放量。

| # | 检查 | 期望 |
|---|------|------|
| 1 | `GET /` · `/store` · `/developers` | 200 |
| 2 | `GET /login` → 注册/登录 | 可进 `/dashboard` |
| 3 | 未登录 `GET /platform/admin` 或 Admin API | 401/403 |
| 4 | Cron dry-run | 见下方 curl；200 且鉴权通过 |
| 5 | 上传一小文件 / 资产 | S3 成功；非 local 盘 |
| 6 | 限流 | 连续打敏感 API 触发 429（或 Upstash 计数增长） |
| 7 | 支付（若 live） | 沙箱单不可当生产；回调验签成功 |
| 8 | Acceptance | 管理台 readiness → `readyForProduction=true` |
| 9 | 老板六步手测 | 见商业交付清单 §二 |

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/reconcile-payments?dryRun=1"
```

安全回归（可选，本地）：

```bash
npm --workspace @mealkey/web exec -- vitest run \
  tests/wallet-cas.test.ts \
  tests/gateway-production-fail-closed.test.ts \
  tests/schema-parity.test.ts \
  tests/payment-mode.test.ts \
  tests/auth-platform-admin.test.ts
```

---

## 8. Go / No-Go（部署视角）

**Go（可对种子用户开放）：**

- §2.1 变量齐全且无 §2.3 旁路  
- Postgres + S3 + Upstash + Cron 冒烟通过  
- `readyForProduction=true`  
- 商业交付清单老板路径手测通过  

**No-Go：**

- 仍用 SQLite / local blob / 默认 Agent Secret  
- 生产开 stub、降级开会、sandbox 收款  
- Partner 审核/Store 安装后 Gateway 仍可无 entitlement 读 Context  
- Cron 无密钥或支付漏单无法巡检  

收费对外承诺边界仍见商业交付清单 §〇。

---

## 9. 回滚

| 场景 | 动作 |
|------|------|
| 坏构建 | Vercel Instant Rollback 到上一 Production Deployment |
| 坏迁移 | 预先快照 / PITR；避免无备份 `db push --force-reset` |
| 密钥泄露 | 轮换 `AUTH_SECRET`（全员重登）、`CRON_SECRET`、`MK_AGENT_SECRET_KEK`（需 Partner 重 seal）、支付与 LLM Key |
| 限流打穿 | 确认 Upstash；关闭 `RATE_LIMIT_ALLOW_MEMORY` |

代码真源以 GitHub 为准；禁止「只在 Vercel 改、不同步仓库」。

---

## 10. 相关文档

| 文档 | 用途 |
|------|------|
| `MEALKEY_COMMERCIAL_DELIVERY_CHECKLIST_V1.md` | 收费前产品验收 |
| `POSTGRES.md` | PG 切换细节 |
| `BLOB_STORAGE.md` | 对象存储 |
| `REPO_SYNC_AND_TOOL_AGENT_RULES_V1.md` | 远端真源 / 禁止本地堆积 |
| `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md` | Gateway 外接硬闸 |
| `MEALKEY_DEVELOPER_PORTAL_V1.md` | 开发者门户产品 |
| `.env.example` | 变量模板 |
| `vercel.json` | 构建与 Cron |

---

## 11. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-21 | 初版：汇总 Vercel/PG/S3/Upstash/Gateway/Cron 上线步骤与 fail-closed 清单 |

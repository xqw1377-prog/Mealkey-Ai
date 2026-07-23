# 数据库 Schema

> 定义在 `apps/web/prisma/schema.prisma`
> 开发环境: SQLite (`file:./dev.db`)
> 迁移目录: `apps/web/prisma/migrations/`

## 迁移工作流

```bash
# 开发：根据 schema 生成并应用迁移
npm --workspace @mealkey/web run prisma:migrate

# 仅同步 schema（快速原型，不生成历史）
npm run db:push

# 生产/CI：应用已有迁移
cd apps/web && npx prisma migrate deploy

# 已有数据库首次接入迁移体系时（已 baseline 为 0_init）：
# npx prisma migrate resolve --applied 0_init
```

生产建议将 `DATABASE_URL` 切换为 PostgreSQL。完整步骤见 [POSTGRES.md](./POSTGRES.md)。

- SQLite schema：`apps/web/prisma/schema.prisma`（默认开发）
- Postgres schema：`apps/web/prisma/schema.postgresql.prisma`

```bash
# 一键切换到 postgres schema（会备份 sqlite 版）
npm run db:pg:prepare
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mealkey
npm run db:pg:generate
cd apps/web && npx prisma migrate dev --name init_pg
```

## 8 Kernel Objects（对齐 7 Protocols）

```
Protocol 1: Context → Owner + Project + Memory + Decision + Knowledge
Protocol 2: Decision → Decision
Protocol 3: Memory → Memory
Protocol 4: Agent Manifest → AgentProduct
Protocol 5: Capability → CapabilityModule
Protocol 6: Mission → Mission
Protocol 7: Agent Run → AgentRun
```

## 核心模型

### Owner（经营者）
```
id              String  @id
userId          String  @unique → User
name            String?
email           String?
experience      String  // "0年" (default)
background      String  // JSON
overallScore    Int     // 0-100
strengths       String  // JSON array
weaknesses      String  // JSON array
riskTolerance   String  // low | medium | high
investmentStyle String  // conservative | moderate | aggressive
```

### Project（经营项目）
```
id          String  @id
ownerId     String → Owner
name        String
status      String  // active | archived | paused
stage       String  // idea | positioning | location | setup | opening | growth
category    String? // "湘菜"
target      String? // "年轻消费者"
city        String?
district    String?
budget      Float?
profile     String? // JSON (扩展信息)
healthScore Int?
confidence  Float?
```

### Decision（决策 — 对齐 MKDecision）
```
id          String  @id
ownerId     String → Owner
projectId   String? → Project
agentId     String?
problem     String    // 问题
observation String    // 观察
diagnosis   String    // 诊断
judgement   String    // 判断
strategy    String    // 策略
action      String    // 行动
confidence  Float     // 0-1
evidence    String    // JSON array
outcome     String?   // JSON (结果反馈)
learning    String?   // JSON (教训)
```

### Memory（记忆 — 对齐 Protocol 3）
```
id          String  @id
ownerId     String → Owner
projectId   String? → Project
type        String  // OWNER | PROJECT | DECISION | LEARNING
key         String
content     String
importance  Int     // 0-100
source      String  // user | ai | feedback
```

### KnowledgeNode（知识节点 — 对齐 KnowledgeContext）
```
id          String  @id
title       String
content     String
categoryId  String? → KnowledgeCategory
type        String  // principle | rule | case | model | framework
tags        String  // JSON array
source      String?
confidence  Float   // 0-1
status      String  // draft | published | archived
```

## 辅助模型

- `Conversation` / `Message`: 对话记录
- `Report`: 经营报告（Agent 输出产物）
- `OwnerCapability`: 经营者能力评分
- `CognitionAssessment`: 认知评估记录
- `StrategyDocument`: 战略文档

## 种子数据

`npm run prisma db seed` 现在只初始化系统知识库：

| 数据 | 数量 | 用途 |
|------|------|------|
| KnowledgeCategory | 3 | 定位策略、选址判断、增长策略 |
| KnowledgeNode | 3 | 选址、定位、增长知识 |

## 数据库操作

```bash
npm run db:push     # 同步 Schema 到数据库（开发环境）
npm run db:seed     # 写入种子数据
npm run db:studio   # 打开 Prisma Studio
npm run db:migrate  # 创建迁移（生产环境）
```

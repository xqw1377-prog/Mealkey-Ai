# PostgreSQL 生产切换指南

> 开发默认仍用 SQLite（`apps/web/prisma/schema.prisma`）。  
> 生产 / 多用户并发请切换 PostgreSQL。  
> `schema.postgresql.prisma` 须与主 schema **model 集合保持一致**（CI 有 `schema-parity` 测试）。

## 1. 一键启动（推荐）

```bash
# 需要 Docker Desktop 运行中
npm run db:pg:up
```

会自动：
1. `docker compose up -d postgres`
2. 备份 SQLite schema → 切换 PostgreSQL schema
3. `prisma generate` + `db push` + `seed`
4. 默认再切回 SQLite schema（方便日常 `npm run dev`）

若希望保持 Postgres schema 激活：

```bash
npm run db:pg:up:keep
# 并将 apps/web/.env 的 DATABASE_URL 设为下方连接串
```

## 1b. 手动启动

```bash
docker compose up -d postgres
```

默认连接串：

```text
postgresql://postgres:postgres@localhost:5432/mealkey
```

## 2. 使用 Postgres schema

仓库提供独立 schema 文件：

- 开发 SQLite：`apps/web/prisma/schema.prisma`
- 生产 Postgres：`apps/web/prisma/schema.postgresql.prisma`

切换步骤（在 `apps/web` 下）：

```bash
# 备份当前 sqlite schema（可选）
cp prisma/schema.prisma prisma/schema.sqlite.prisma

# 启用 postgres schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 配置环境变量
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mealkey"

# 生成 client + 迁移
npx prisma generate
npx prisma migrate dev --name init_pg
# 或已有库：
# npx prisma migrate deploy
```

根目录快捷脚本：

```bash
npm run db:pg:prepare   # 复制 postgres schema 到主 schema（会覆盖）
npm run db:pg:generate
```

## 3. 环境变量

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/mealkey"
AUTH_SECRET="至少16位随机串"
DEEPSEEK_API_KEY="sk-..."
BLOB_STORAGE_PROVIDER=s3   # Serverless 务必用对象存储
```

## 4. 数据迁移（SQLite → Postgres）

Prisma 不自动跨库搬迁。建议：

1. 在 Postgres 跑空库迁移 `migrate deploy`
2. 用脚本导出 SQLite 关键表（User/Owner/Project/Decision/Memory…）
3. 通过 seed 或一次性 ETL 导入

开发环境可直接 `db:seed` 重建演示数据。

## 5. 回退 SQLite

```bash
cp apps/web/prisma/schema.sqlite.prisma apps/web/prisma/schema.prisma
# 或从 git 恢复 schema.prisma
# DATABASE_URL="file:./dev.db"
npx prisma generate
```

## 6. 注意点

| 项 | 说明 |
|----|------|
| JSON 字段 | 当前仍用 `String` 存 JSON，Postgres 可后续改为 `Json` 类型优化查询 |
| 连接池 | Serverless 建议用 Prisma Data Proxy / PgBouncer |
| 并发 | SQLite 不适合多用户写；上线必须 PG |
| 备份 | 配置自动备份与 PITR |

# 文件存储（Blob）配置

> 生产上线总览见 [`MEALKEY_PRODUCTION_DEPLOY_V1.md`](./MEALKEY_PRODUCTION_DEPLOY_V1.md)。

## 模式

| Provider | 适用 | 配置 |
|----------|------|------|
| `local`（默认） | 本地开发 | 写入 `apps/web/private/uploads`（不在 public；经鉴权 API 下载） |
| `s3` | 生产 / Serverless | S3 兼容（AWS / R2 / MinIO） |

下载入口：`GET /api/assets/[assetId]/file`（需登录且校验 owner）。

## 本地

```bash
BLOB_STORAGE_PROVIDER=local
# 可选：自定义私有根目录（测试用）
# BLOB_LOCAL_ROOT=C:\tmp\mealkey-private
```

## S3 / Cloudflare R2

```bash
BLOB_STORAGE_PROVIDER=s3
S3_BUCKET=mealkey-assets
S3_REGION=auto
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # R2 需要
S3_PUBLIC_BASE_URL=https://cdn.example.com                 # 公网访问前缀（可选）
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

安装 SDK（仅生产需要）：

```bash
npm i @aws-sdk/client-s3 --workspace @mealkey/web
```

## 本地 MinIO 端到端

```bash
# 启动 MinIO + 创建 bucket
npm run db:minio:up
npm run db:minio:smoke
```

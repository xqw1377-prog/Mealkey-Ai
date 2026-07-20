import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

function databaseUrlSchema() {
  const base = z.string().min(1);
  if (!isProd) return base;
  return base.refine(
    (value) => !value.startsWith("file:"),
    "生产环境禁止使用 SQLite（file:），请配置 PostgreSQL DATABASE_URL",
  );
}

/**
 * 环境变量验证
 * - 生产环境强制 AUTH_SECRET / PostgreSQL / S3
 * - LLM Key 在运行时由 Agent 工厂再校验（允许仅做 UI 预览时不配）
 */
export const env = createEnv({
  server: {
    DATABASE_URL: databaseUrlSchema(),
    DEEPSEEK_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    AUTH_SECRET: isProd
      ? z.string().min(16, "生产环境必须配置至少 16 位 AUTH_SECRET")
      : z.string().min(1).optional(),
    REDIS_URL: z.string().optional(),
    /** 生产多实例限流必须配置；可用 RATE_LIMIT_ALLOW_MEMORY=1 应急放行（不推荐） */
    UPSTASH_REDIS_REST_URL: isProd
      ? z
          .string()
          .url("生产环境必须配置 UPSTASH_REDIS_REST_URL")
          .optional()
          .refine(
            (v) =>
              Boolean(v) || process.env.RATE_LIMIT_ALLOW_MEMORY === "1",
            "生产环境必须配置 UPSTASH_REDIS_REST_URL，或显式 RATE_LIMIT_ALLOW_MEMORY=1",
          )
      : z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: isProd
      ? z
          .string()
          .min(1)
          .optional()
          .refine(
            (v) =>
              Boolean(v) || process.env.RATE_LIMIT_ALLOW_MEMORY === "1",
            "生产环境必须配置 UPSTASH_REDIS_REST_TOKEN，或显式 RATE_LIMIT_ALLOW_MEMORY=1",
          )
      : z.string().optional(),
    RATE_LIMIT_ALLOW_MEMORY: z.string().optional(),
    SEARXNG_URL: z.string().optional(),
    SERPAPI_KEY: z.string().optional(),
    MBIZ_API_TOKEN: z.string().optional(),
    MK_EVENT_INGEST_TOKEN: z.string().optional(),
    MK_EVENT_INGEST_TOKENS: z.string().optional(),
    MK_EVENT_SIGNING_SECRET: z.string().optional(),
    BLOB_STORAGE_PROVIDER: isProd
      ? z.literal("s3", {
          errorMap: () => ({ message: "生产环境必须设置 BLOB_STORAGE_PROVIDER=s3" }),
        })
      : z.enum(["local", "s3"]).optional(),
    PLATFORM_ADMIN_EMAILS: z.string().optional(),
    /** 是否允许预览 Host 信任（仅开发/预览） */
    MK_ALLOW_PUBLIC_PREVIEW_AUTH: z.string().optional(),
    /** Vercel Cron / 支付巡检；生产必须配置 */
    CRON_SECRET: isProd
      ? z.string().min(16, "生产环境必须配置至少 16 位 CRON_SECRET")
      : z.string().min(1).optional(),
    /** 生产显式允许沙箱收款（默认禁止） */
    PAYMENT_ALLOW_SANDBOX: z.string().optional(),
    PAYMENT_MODE: z.enum(["live", "sandbox"]).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AUTH_SECRET: process.env.AUTH_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RATE_LIMIT_ALLOW_MEMORY: process.env.RATE_LIMIT_ALLOW_MEMORY,
    SEARXNG_URL: process.env.SEARXNG_URL,
    SERPAPI_KEY: process.env.SERPAPI_KEY,
    MBIZ_API_TOKEN: process.env.MBIZ_API_TOKEN,
    MK_EVENT_INGEST_TOKEN: process.env.MK_EVENT_INGEST_TOKEN,
    MK_EVENT_INGEST_TOKENS: process.env.MK_EVENT_INGEST_TOKENS,
    MK_EVENT_SIGNING_SECRET: process.env.MK_EVENT_SIGNING_SECRET,
    BLOB_STORAGE_PROVIDER: process.env.BLOB_STORAGE_PROVIDER,
    PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
    MK_ALLOW_PUBLIC_PREVIEW_AUTH: process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH,
    CRON_SECRET: process.env.CRON_SECRET,
    PAYMENT_ALLOW_SANDBOX: process.env.PAYMENT_ALLOW_SANDBOX,
    PAYMENT_MODE: process.env.PAYMENT_MODE as "live" | "sandbox" | undefined,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});

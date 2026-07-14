/**
 * MinIO 端到端上传冒烟
 * 前提: Docker 可用
 *
 * 用法:
 *   node scripts/minio-smoke.mjs
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const web = path.join(root, "apps", "web");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  // docker compose 会把进度写到 stderr，不能用默认 shell 错误偏好误判
  execSync(cmd, {
    stdio: "inherit",
    cwd: opts.cwd || root,
    shell: true,
    env: { ...process.env, ...opts.env },
  });
}

function runSoft(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      cwd: opts.cwd || root,
      shell: true,
      env: { ...process.env, ...opts.env },
    });
  } catch (err) {
    // PowerShell 有时把 docker 进度 stderr 标为失败；若容器已在跑则继续
    console.warn("command reported failure, continuing if services are up:", String(err?.status ?? err));
  }
}

console.log("=== MinIO smoke ===");
runSoft("docker compose up -d minio minio-init");

// 等待 bucket 初始化
await sleep(4000);

const env = {
  BLOB_STORAGE_PROVIDER: "s3",
  S3_BUCKET: "mealkey-assets",
  S3_REGION: "us-east-1",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_FORCE_PATH_STYLE: "true",
  S3_PUBLIC_BASE_URL: "http://127.0.0.1:9000/mealkey-assets",
  S3_ACCESS_KEY_ID: "mealkey",
  S3_SECRET_ACCESS_KEY: "mealkeysecret",
};

run("npx tsx scripts/minio-smoke.ts", { cwd: web, env });
console.log("=== MinIO smoke done ===");

/**
 * MinIO 上传冒烟（在 apps/web 下执行）
 * 环境变量由 scripts/minio-smoke.mjs 注入
 */
import { getBlobStorageProvider, putBlob } from "../src/server/storage/blob-store";

async function main() {
  const provider = getBlobStorageProvider();
  console.log("provider=", provider);
  if (provider !== "s3") {
    throw new Error(`expected s3 provider, got ${provider}`);
  }

  const payload = `minio-smoke-${Date.now()}`;
  const stored = await putBlob({
    buffer: Buffer.from(payload),
    fileName: "smoke.txt",
    mimeType: "text/plain",
    folder: "smoke",
  });

  console.log(JSON.stringify(stored, null, 2));

  const res = await fetch(stored.publicUrl);
  console.log("GET", stored.publicUrl, "->", res.status);
  if (!res.ok) {
    throw new Error(`public URL fetch failed: ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes("minio-smoke-")) {
    throw new Error(`unexpected body: ${text.slice(0, 100)}`);
  }
  console.log("MINIO_SMOKE_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

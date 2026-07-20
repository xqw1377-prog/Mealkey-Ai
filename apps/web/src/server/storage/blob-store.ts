/**
 * 文件存储抽象
 *
 * - local: 写入 apps/web/private/uploads（不在 public，需鉴权下载）
 * - s3: S3 兼容对象存储（AWS S3 / Cloudflare R2 / MinIO）
 *
 * 生产 Serverless 应使用 s3，避免本地磁盘不可写。
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export type StoredBlob = {
  storagePath: string;
  /** 本地为相对 key；创建 Asset 后应改写为 /api/assets/:id/file */
  publicUrl: string;
  provider: "local" | "s3";
  sizeBytes: number;
  /** 本地相对路径 key，供鉴权下载 */
  relativeKey?: string;
};

export type PutBlobInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
};

/** 可注入的 S3 发送接口（便于单测 mock） */
export type S3Sender = {
  send: (command: PutObjectCommand | GetObjectCommand) => Promise<unknown>;
};

let s3ClientOverride: S3Sender | null = null;

/** 测试用：注入 mock S3 client */
export function setS3ClientForTests(client: S3Sender | null) {
  s3ClientOverride = client;
}

function resolveProvider(): "local" | "s3" {
  const explicit = process.env.BLOB_STORAGE_PROVIDER?.toLowerCase();
  if (explicit === "s3" || explicit === "local") return explicit;
  if (
    process.env.NODE_ENV === "production" &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return "s3";
  }
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    return "s3";
  }
  return "local";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-").replace(/-+/g, "-");
}

/**
 * 本地私有上传根目录（不在 public）：
 * 1. BLOB_LOCAL_ROOT（测试/自定义）
 * 2. apps/web/private
 */
export function resolveLocalPrivateRoot(): string {
  if (process.env.BLOB_LOCAL_ROOT) {
    return path.resolve(process.env.BLOB_LOCAL_ROOT);
  }
  const isWebWorkspace = /apps[\\/]+web$/i.test(process.cwd());
  return isWebWorkspace
    ? path.join(process.cwd(), "private")
    : path.join(process.cwd(), "apps", "web", "private");
}

async function ensureLocalUploadDir(relativeDir: string) {
  const target = path.join(resolveLocalPrivateRoot(), relativeDir);
  await mkdir(target, { recursive: true });
  return target;
}

function assertSafeRelativeKey(relativeKey: string) {
  const normalized = relativeKey.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    path.isAbsolute(normalized) ||
    !normalized.startsWith("uploads/")
  ) {
    throw new Error("非法文件路径");
  }
  return normalized;
}

async function putLocal(input: PutBlobInput): Promise<StoredBlob> {
  const now = new Date();
  const folderName =
    input.folder ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const relativeDir = path.posix.join("uploads", folderName);
  const diskDir = await ensureLocalUploadDir(relativeDir);
  const safeName = sanitizeFileName(input.fileName);
  const fileBaseName = `${Date.now()}-${randomBytes(3).toString("hex")}-${safeName}`;
  const relativeKey = path.posix.join(relativeDir, fileBaseName);
  const diskPath = path.join(diskDir, fileBaseName);
  await writeFile(diskPath, input.buffer);
  return {
    storagePath: diskPath,
    // 占位：Asset 创建后改写为鉴权下载 URL
    publicUrl: `/api/assets/file/${relativeKey}`,
    provider: "local",
    sizeBytes: input.buffer.byteLength,
    relativeKey,
  };
}

function buildS3ClientConfig(): S3ClientConfig {
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 存储未配置完整：需要 S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY");
  }

  return {
    region,
    endpoint: endpoint || undefined,
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      Boolean(endpoint && /localhost|127\.0\.0\.1|minio/i.test(endpoint)),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}

function createS3Client(): S3Sender {
  if (s3ClientOverride) return s3ClientOverride;
  return new S3Client(buildS3ClientConfig());
}

function buildPublicUrl(key: string, bucket: string): string {
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";

  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${key}`;
  }
  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function putS3(input: PutBlobInput): Promise<StoredBlob> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3 存储未配置完整：需要 S3_BUCKET");
  }

  const now = new Date();
  const folderName =
    input.folder ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const safeName = sanitizeFileName(input.fileName);
  const key = `uploads/${folderName}/${Date.now()}-${randomBytes(3).toString("hex")}-${safeName}`;

  const client = createS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType || "application/octet-stream",
    }),
  );

  return {
    storagePath: `s3://${bucket}/${key}`,
    // S3 也优先走鉴权代理；创建 Asset 后改写
    publicUrl: buildPublicUrl(key, bucket),
    provider: "s3",
    sizeBytes: input.buffer.byteLength,
    relativeKey: key,
  };
}

export async function putBlob(input: PutBlobInput): Promise<StoredBlob> {
  const provider = resolveProvider();
  if (provider === "s3") {
    return putS3(input);
  }
  return putLocal(input);
}

export function getBlobStorageProvider(): "local" | "s3" {
  return resolveProvider();
}

/**
 * 读取本地私有文件（鉴权下载用）
 */
export async function readLocalBlob(relativeKey: string): Promise<Buffer> {
  const safeKey = assertSafeRelativeKey(relativeKey);
  const fullPath = path.join(resolveLocalPrivateRoot(), ...safeKey.split("/"));
  const root = resolveLocalPrivateRoot();
  if (!fullPath.startsWith(root)) {
    throw new Error("非法文件路径");
  }
  return readFile(fullPath);
}

/**
 * 从 storagePath 读取本地文件
 */
export async function readBlobByStoragePath(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("s3://")) {
    const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(storagePath);
    if (!match) throw new Error("无效的 S3 路径");
    const [, bucket, key] = match;
    const client = createS3Client();
    const result = (await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    )) as { Body?: { transformToByteArray?: () => Promise<Uint8Array> } };
    if (!result.Body?.transformToByteArray) {
      throw new Error("无法读取 S3 对象");
    }
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
  const root = resolveLocalPrivateRoot();
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(root) && !process.env.BLOB_LOCAL_ROOT) {
    // 允许测试临时目录
    if (!process.env.BLOB_LOCAL_ROOT && !resolved.includes("uploads")) {
      throw new Error("非法文件路径");
    }
  }
  return readFile(resolved);
}

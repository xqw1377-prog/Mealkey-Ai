import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import {
  getBlobStorageProvider,
  putBlob,
  setS3ClientForTests,
} from "@/server/storage/blob-store";

const originalEnv = { ...process.env };

afterEach(async () => {
  process.env = { ...originalEnv };
  setS3ClientForTests(null);
});

describe("blob-store", () => {
  it("默认 provider 为 local", () => {
    delete process.env.BLOB_STORAGE_PROVIDER;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    expect(getBlobStorageProvider()).toBe("local");
  });

  it("配置完整 S3 时 provider 为 s3", () => {
    process.env.S3_BUCKET = "mealkey";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    delete process.env.BLOB_STORAGE_PROVIDER;
    expect(getBlobStorageProvider()).toBe("s3");
  });

  it("local putBlob 写入可读文件", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "mealkey-blob-"));
    process.env.BLOB_STORAGE_PROVIDER = "local";
    process.env.BLOB_LOCAL_ROOT = tmp;

    try {
      const content = Buffer.from("hello mealkey asset");
      const stored = await putBlob({
        buffer: content,
        fileName: "note.txt",
        mimeType: "text/plain",
        folder: "test-day",
      });

      expect(stored.provider).toBe("local");
      expect(stored.sizeBytes).toBe(content.byteLength);
      expect(stored.publicUrl).toContain("/api/assets/file/uploads/test-day/");
      expect(stored.publicUrl).toContain("note.txt");
      expect(stored.relativeKey).toContain("uploads/test-day/");

      const written = await readFile(stored.storagePath);
      expect(written.toString("utf8")).toBe("hello mealkey asset");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("s3 putBlob 调用 PutObject 并返回 s3 URL", async () => {
    process.env.BLOB_STORAGE_PROVIDER = "s3";
    process.env.S3_BUCKET = "mealkey-assets";
    process.env.S3_ACCESS_KEY_ID = "mealkey";
    process.env.S3_SECRET_ACCESS_KEY = "mealkeysecret";
    process.env.S3_ENDPOINT = "http://127.0.0.1:9000";
    process.env.S3_PUBLIC_BASE_URL = "http://127.0.0.1:9000/mealkey-assets";

    const send = vi.fn(async () => ({}));
    setS3ClientForTests({ send });

    const stored = await putBlob({
      buffer: Buffer.from("s3-bytes"),
      fileName: "menu.pdf",
      mimeType: "application/pdf",
      folder: "demo",
    });

    expect(send).toHaveBeenCalledTimes(1);
    const callArg = send.mock.calls.at(0)?.at(0) as
      | { input?: Record<string, unknown> }
      | undefined;
    expect(callArg?.input?.Bucket).toBe("mealkey-assets");
    expect(String(callArg?.input?.Key ?? "")).toContain("uploads/demo/");
    expect(String(callArg?.input?.Key ?? "")).toContain("menu.pdf");
    expect(callArg?.input?.ContentType).toBe("application/pdf");

    expect(stored.provider).toBe("s3");
    expect(stored.storagePath).toMatch(/^s3:\/\/mealkey-assets\//);
    expect(stored.publicUrl).toContain("http://127.0.0.1:9000/mealkey-assets/uploads/demo/");
    expect(stored.sizeBytes).toBe(8);
  });

  it("s3 缺 bucket 时抛错", async () => {
    process.env.BLOB_STORAGE_PROVIDER = "s3";
    delete process.env.S3_BUCKET;
    process.env.S3_ACCESS_KEY_ID = "k";
    process.env.S3_SECRET_ACCESS_KEY = "s";

    await expect(
      putBlob({
        buffer: Buffer.from("x"),
        fileName: "a.txt",
        mimeType: "text/plain",
      }),
    ).rejects.toThrow(/S3_BUCKET/);
  });
});

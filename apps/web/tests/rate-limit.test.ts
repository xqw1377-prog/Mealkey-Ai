import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowMemoryRateLimitFallback,
  rateLimit,
  resetMemoryRateLimitForTests,
} from "@/lib/rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMemoryRateLimitForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_ALLOW_MEMORY;
  });

  it("窗口内允许 N 次并拒绝超额", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const key = `test-${Date.now()}-${Math.random()}`;
    const r1 = await rateLimit(key, 2, 60_000);
    const r2 = await rateLimit(key, 2, 60_000);
    const r3 = await rateLimit(key, 2, 60_000);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r1.backend).toBe("memory");
  });

  it("不同 key 互不影响", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const a = `a-${Date.now()}-${Math.random()}`;
    const b = `b-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(false);
  });

  it("生产未配 Upstash 且未放行时 fail-closed", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_ALLOW_MEMORY;
    expect(allowMemoryRateLimitFallback()).toBe(false);

    const result = await rateLimit(`prod-${Date.now()}`, 10, 60_000);
    expect(result.ok).toBe(false);
    expect(result.backend).toBe("fail-closed");
  });

  it("生产显式 RATE_LIMIT_ALLOW_MEMORY=1 可回退内存", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RATE_LIMIT_ALLOW_MEMORY = "1";
    expect(allowMemoryRateLimitFallback()).toBe(true);
    const result = await rateLimit(`mem-${Date.now()}`, 2, 60_000);
    expect(result.ok).toBe(true);
    expect(result.backend).toBe("memory");
  });
});

import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("窗口内允许 N 次并拒绝超额", async () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const r1 = await rateLimit(key, 2, 60_000);
    const r2 = await rateLimit(key, 2, 60_000);
    const r3 = await rateLimit(key, 2, 60_000);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("不同 key 互不影响", async () => {
    const a = `a-${Date.now()}-${Math.random()}`;
    const b = `b-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(false);
  });
});

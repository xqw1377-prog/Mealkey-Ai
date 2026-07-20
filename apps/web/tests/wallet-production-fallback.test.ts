import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 生产环境禁止 UserWallet 缺失时静默走内存假余额。
 */
describe("wallet production fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("production throws when userWallet delegate missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { ensureUserWallet } = await import(
      "../src/server/services/wallet.service"
    );
    const prisma = {} as never;
    await expect(ensureUserWallet(prisma, "user_test")).rejects.toThrow(
      /经营点账户未就绪/,
    );
  });

  it("non-production allows in-memory fallback wallet", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { ensureUserWallet } = await import(
      "../src/server/services/wallet.service"
    );
    const prisma = {} as never;
    const wallet = await ensureUserWallet(prisma, "user_dev");
    expect(wallet.userId).toBe("user_dev");
    expect(wallet.balance).toBeGreaterThan(0);
  });
});

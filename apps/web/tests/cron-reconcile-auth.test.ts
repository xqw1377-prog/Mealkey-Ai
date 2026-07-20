import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeCronRequest } from "@/lib/cron-auth";

describe("cron reconcile auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.CRON_SECRET;
  });

  it("生产未配置 CRON_SECRET 时拒绝", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.CRON_SECRET;
    const req = new Request("https://example.com/api/cron/reconcile-payments");
    expect(authorizeCronRequest(req)).toBe(false);
  });

  it("错误密钥拒绝", () => {
    process.env.CRON_SECRET = "correct-secret-value";
    const req = new Request("https://example.com/api/cron/reconcile-payments", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(authorizeCronRequest(req)).toBe(false);
  });

  it("Bearer 正确密钥通过", () => {
    process.env.CRON_SECRET = "correct-secret-value";
    const req = new Request("https://example.com/api/cron/reconcile-payments", {
      headers: { authorization: "Bearer correct-secret-value" },
    });
    expect(authorizeCronRequest(req)).toBe(true);
  });

  it("query secret 正确通过", () => {
    process.env.CRON_SECRET = "correct-secret-value";
    const req = new Request(
      "https://example.com/api/cron/reconcile-payments?secret=correct-secret-value",
    );
    expect(authorizeCronRequest(req)).toBe(true);
  });

  it("非生产且未配置密钥时放行（本机调试）", () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost:3000/api/cron/reconcile-payments");
    expect(authorizeCronRequest(req)).toBe(true);
  });
});

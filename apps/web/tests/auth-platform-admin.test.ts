/**
 * 平台管理台鉴权 — 默认拒绝；本机旁路需显式 MK_ALLOW
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() =>
  vi.fn(() => ({
    get: (name: string) => (name === "host" ? "localhost:3000" : null),
  })),
);

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("requirePlatformAdmin", () => {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
    MK_ALLOW_PUBLIC_PREVIEW_AUTH: process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH,
  };

  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    process.env.PLATFORM_ADMIN_EMAILS = "";
    delete process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH;
  });

  afterEach(() => {
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.PLATFORM_ADMIN_EMAILS = prev.PLATFORM_ADMIN_EMAILS;
    if (prev.MK_ALLOW_PUBLIC_PREVIEW_AUTH === undefined) {
      delete process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH;
    } else {
      process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH = prev.MK_ALLOW_PUBLIC_PREVIEW_AUTH;
    }
  });

  it("rejects unauthenticated users by default", async () => {
    process.env.NODE_ENV = "development";
    authMock.mockResolvedValue(null);
    const { requirePlatformAdmin, AuthError } = await import(
      "@/lib/auth-helpers"
    );
    await expect(requirePlatformAdmin("localhost:3000")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("allows synthetic local admin only when MK_ALLOW is on and allowlist empty", async () => {
    process.env.NODE_ENV = "development";
    process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH = "1";
    process.env.PLATFORM_ADMIN_EMAILS = "";
    authMock.mockResolvedValue(null);
    const { requirePlatformAdmin } = await import("@/lib/auth-helpers");
    const user = await requirePlatformAdmin("localhost:3000");
    expect(user.id).toBe("local-preview-admin");
  });

  it("never bypasses on production even with MK_ALLOW", async () => {
    process.env.NODE_ENV = "production";
    process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH = "1";
    process.env.PLATFORM_ADMIN_EMAILS = "admin@mealkey.com";
    authMock.mockResolvedValue(null);
    const { requirePlatformAdmin, AuthError } = await import(
      "@/lib/auth-helpers"
    );
    await expect(requirePlatformAdmin("localhost:3000")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("accepts allowlisted session user", async () => {
    process.env.NODE_ENV = "production";
    process.env.PLATFORM_ADMIN_EMAILS = "admin@mealkey.com";
    authMock.mockResolvedValue({
      user: { id: "u1", email: "admin@mealkey.com" },
    });
    const { requirePlatformAdmin } = await import("@/lib/auth-helpers");
    const user = await requirePlatformAdmin("app.mealkey.com");
    expect(user.email).toBe("admin@mealkey.com");
  });
});

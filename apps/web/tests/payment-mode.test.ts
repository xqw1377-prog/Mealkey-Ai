import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/payment/alipay", () => ({
  createAlipayPagePay: vi.fn(),
  isAlipayConfigured: () => false,
}));

vi.mock("@/server/services/payment/wechat-pay", () => ({
  createWechatNativeOrder: vi.fn(),
  isWechatPayConfigured: () => false,
}));

import {
  getPaymentMode,
  isProductionSandboxAllowed,
} from "@/server/services/payment.service";

describe("payment mode", () => {
  const envKeys = [
    "PAYMENT_MODE",
    "PAYMENT_ALLOW_SANDBOX",
    "NODE_ENV",
  ] as const;
  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
    vi.unstubAllEnvs();
  });

  function remember() {
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
    }
  }

  it("非生产默认走 sandbox", () => {
    remember();
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.PAYMENT_MODE;
    expect(getPaymentMode()).toBe("sandbox");
  });

  it("PAYMENT_MODE=sandbox 强制沙箱（非生产）", () => {
    remember();
    vi.stubEnv("NODE_ENV", "test");
    process.env.PAYMENT_MODE = "sandbox";
    expect(getPaymentMode()).toBe("sandbox");
  });

  it("生产未放行时即使 PAYMENT_MODE=sandbox 也返回 live", () => {
    remember();
    vi.stubEnv("NODE_ENV", "production");
    process.env.PAYMENT_MODE = "sandbox";
    delete process.env.PAYMENT_ALLOW_SANDBOX;
    expect(isProductionSandboxAllowed()).toBe(false);
    expect(getPaymentMode()).toBe("live");
  });

  it("生产显式放行后可 sandbox", () => {
    remember();
    vi.stubEnv("NODE_ENV", "production");
    process.env.PAYMENT_MODE = "sandbox";
    process.env.PAYMENT_ALLOW_SANDBOX = "1";
    expect(getPaymentMode()).toBe("sandbox");
  });

  it("生产未配渠道不再自动落 sandbox", () => {
    remember();
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.PAYMENT_MODE;
    delete process.env.PAYMENT_ALLOW_SANDBOX;
    expect(getPaymentMode()).toBe("live");
  });
});

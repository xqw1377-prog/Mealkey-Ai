/**
 * 微信支付回调 — 生产必须配置平台公钥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/payment/wechat-pay", async (importOriginal) => {
  return importOriginal();
});

describe("verifyAndParseWechatNotify production gate", () => {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    WECHAT_PAY_MCH_ID: process.env.WECHAT_PAY_MCH_ID,
    WECHAT_PAY_SERIAL_NO: process.env.WECHAT_PAY_SERIAL_NO,
    WECHAT_PAY_PRIVATE_KEY: process.env.WECHAT_PAY_PRIVATE_KEY,
    WECHAT_PAY_API_V3_KEY: process.env.WECHAT_PAY_API_V3_KEY,
    WECHAT_PAY_PLATFORM_PUBLIC_KEY: process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY,
  };

  beforeEach(() => {
    process.env.WECHAT_PAY_APP_ID = "wx_app";
    process.env.WECHAT_PAY_MCH_ID = "mch";
    process.env.WECHAT_PAY_SERIAL_NO = "serial";
    process.env.WECHAT_PAY_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----";
    process.env.WECHAT_PAY_API_V3_KEY = "0123456789abcdef0123456789abcdef";
    delete process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY;
  });

  afterEach(() => {
    process.env.NODE_ENV = prev.NODE_ENV;
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("production without platform public key throws", async () => {
    process.env.NODE_ENV = "production";
    // getWechatConfig may fail on invalid private key — stub via dynamic import of function
    // and only assert the production key gate when config exists.
    const mod = await import("@/server/services/payment/wechat-pay");
    // If config invalid, still assert message path by calling with headers after mocking getWechatConfig is hard;
    // instead re-implement the gate check through the exported function and catch either config or key error.
    expect(() =>
      mod.verifyAndParseWechatNotify(
        {
          "Wechatpay-Timestamp": "1",
          "Wechatpay-Nonce": "n",
          "Wechatpay-Signature": "s",
          "Wechatpay-Serial": "ser",
        },
        "{}",
      ),
    ).toThrow(/WECHAT_PAY_PLATFORM_PUBLIC_KEY/);
  });
});

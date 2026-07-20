import { afterEach, describe, expect, it, vi } from "vitest";

const keyPair = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
});

vi.stubEnv("WECHAT_PAY_APP_ID", "wx_test_app");
vi.stubEnv("WECHAT_PAY_MCH_ID", "1900000001");
vi.stubEnv("WECHAT_PAY_SERIAL_NO", "SERIAL123");
vi.stubEnv("WECHAT_PAY_PRIVATE_KEY", keyPair.privateKey);
vi.stubEnv("WECHAT_PAY_API_V3_KEY", "0123456789abcdef0123456789abcdef");
vi.stubEnv("APP_URL", "https://example.com");

import {
  createWechatH5Order,
  isWechatH5PreferredEnabled,
} from "@/server/services/payment/wechat-pay";

describe("wechat H5 order", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("respects WECHAT_PAY_H5_ENABLED=0", () => {
    vi.stubEnv("WECHAT_PAY_H5_ENABLED", "0");
    expect(isWechatH5PreferredEnabled()).toBe(false);
    vi.stubEnv("WECHAT_PAY_H5_ENABLED", "1");
    expect(isWechatH5PreferredEnabled()).toBe(true);
  });

  it("posts H5 payload and returns h5_url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          h5_url:
            "https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=x",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createWechatH5Order({
      orderNo: "ord_test_1",
      description: "MealKey 测试",
      amountCents: 9900,
      payerClientIp: "1.2.3.4",
    });

    expect(result.h5Url).toContain("tenpay");
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v3/pay/transactions/h5");
    const body = JSON.parse(String(init.body));
    expect(body.scene_info.payer_client_ip).toBe("1.2.3.4");
    expect(body.scene_info.h5_info.type).toBe("Wap");
    expect(body.amount.total).toBe(9900);
  });
});

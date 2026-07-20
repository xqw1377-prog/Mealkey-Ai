import { describe, expect, it } from "vitest";
import {
  isWeChatBrowser,
  shouldGuideOpenInBrowserForWechatPay,
  wechatPayOpenInBrowserSteps,
} from "@/lib/wechat-browser";

describe("wechat browser detect", () => {
  it("识别微信 UA", () => {
    expect(
      isWeChatBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40",
      ),
    ).toBe(true);
  });

  it("普通 Safari 不识别为微信", () => {
    expect(
      isWeChatBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });

  it("微信内应引导浏览器打开再扫码", () => {
    expect(
      shouldGuideOpenInBrowserForWechatPay(
        "Mozilla/5.0 MicroMessenger/8.0.40",
      ),
    ).toBe(true);
  });

  it("支付三步文案齐全", () => {
    const steps = wechatPayOpenInBrowserSteps();
    expect(steps).toHaveLength(3);
    expect(steps.join("")).toMatch(/浏览器|扫一扫/);
  });
});

import { describe, expect, it } from "vitest";
import { isMPntProductIntent } from "../src/server/services/m-pnt.service";

describe("M-PNT product intent routing", () => {
  it("routes branding / positioning messages to M-PNT", () => {
    expect(isMPntProductIntent("帮我做品牌定位")).toBe(true);
    expect(isMPntProductIntent("目标客群画像怎么定")).toBe(true);
    expect(isMPntProductIntent("差异化策略是什么")).toBe(true);
    expect(isMPntProductIntent("价格带怎么选")).toBe(true);
  });

  it("respects force flag", () => {
    expect(isMPntProductIntent("随便聊聊", true)).toBe(true);
  });

  it("does not force non-positioning casually without force", () => {
    // may still false for pure non-positioning
    expect(isMPntProductIntent("今天天气怎么样")).toBe(false);
  });
});

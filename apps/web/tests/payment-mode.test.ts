import { describe, expect, it } from "vitest";
import { getPaymentMode } from "@/server/services/payment.service";

describe("payment mode", () => {
  it("非生产默认走 sandbox", () => {
    const previous = process.env.PAYMENT_MODE;
    delete process.env.PAYMENT_MODE;
    expect(getPaymentMode()).toBe("sandbox");
    if (previous === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = previous;
  });

  it("PAYMENT_MODE=sandbox 强制沙箱", () => {
    const previous = process.env.PAYMENT_MODE;
    process.env.PAYMENT_MODE = "sandbox";
    expect(getPaymentMode()).toBe("sandbox");
    if (previous === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = previous;
  });
});

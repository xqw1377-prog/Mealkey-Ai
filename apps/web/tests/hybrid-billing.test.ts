import { describe, expect, it } from "vitest";
import { getPlanCommercialMeta } from "@/server/services/billing.service";
import { getPaymentMode } from "@/server/services/payment.service";

describe("hybrid billing meta", () => {
  it("解析平台套餐的 Agent 清单与超额单价", () => {
    const meta = getPlanCommercialMeta({
      metadata: JSON.stringify({
        kind: "platform",
        includedAgents: ["chief", "m-mkt"],
        overageRunCents: 49,
      }),
    });
    expect(meta.kind).toBe("platform");
    expect(meta.includedAgents).toEqual(["chief", "m-mkt"]);
    expect(meta.overageRunCents).toBe(49);
  });

  it("解析 Agent 独立能力包", () => {
    const meta = getPlanCommercialMeta({
      metadata: JSON.stringify({
        kind: "agent_addon",
        includedAgents: ["m-pnt"],
        agentCode: "m-pnt",
        overageRunCents: 99,
      }),
    });
    // getPlanCommercialMeta normalizes agent_addon -> specialty_pack internally
    expect(meta.kind).toBe("specialty_pack");
    expect(meta.agentCode).toBe("m-pnt");
  });
});

describe("payment mode", () => {
  it("非生产默认 sandbox", () => {
    const previous = process.env.PAYMENT_MODE;
    delete process.env.PAYMENT_MODE;
    expect(getPaymentMode()).toBe("sandbox");
    if (previous === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = previous;
  });
});

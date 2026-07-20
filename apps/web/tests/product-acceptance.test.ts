import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/engine-health.service", () => ({
  getConsultingEngineHealth: vi.fn(),
}));

vi.mock("@/server/services/payment/wechat-pay", () => ({
  isWechatPayConfigured: vi.fn(() => true),
  isWechatH5PreferredEnabled: vi.fn(() => true),
}));

vi.mock("@/server/services/payment/alipay", () => ({
  isAlipayConfigured: vi.fn(() => false),
}));

vi.mock("@/server/services/payment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/services/payment.service")
  >("@/server/services/payment.service");
  return {
    ...actual,
    getPaymentMode: vi.fn(() => "sandbox"),
  };
});

import { getConsultingEngineHealth } from "@/server/services/engine-health.service";
import { buildProductAcceptanceReport } from "@/server/services/product-acceptance.service";

describe("product acceptance readiness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("reports fail when engines are down", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DASHSCOPE_API_KEY", "sk-test");
    vi.mocked(getConsultingEngineHealth).mockResolvedValue({
      checkedAt: new Date().toISOString(),
      allOk: false,
      engines: [
        {
          id: "m-biz",
          label: "M-BIZ",
          ok: false,
          latencyMs: 0,
          detail: "down",
        },
        {
          id: "m-mkt",
          label: "M-MKT",
          ok: true,
          latencyMs: 10,
          detail: "ok",
        },
        {
          id: "m-ed",
          label: "M-ED",
          ok: true,
          latencyMs: 12,
          detail: "ok",
        },
      ],
    });

    const report = await buildProductAcceptanceReport();
    expect(report.failCount).toBeGreaterThan(0);
    expect(report.readyForDemo).toBe(false);
    expect(report.checks.some((c) => c.id === "engine.m-biz" && c.status === "fail")).toBe(
      true,
    );
    expect(report.checks.some((c) => c.bossVerify)).toBe(true);
  });

  it("demo-ready when engines + ASR ok in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DASHSCOPE_API_KEY", "sk-test");
    vi.stubEnv("FOUNDER_ALLOW_DEGRADED_MEETING", "");
    vi.stubEnv("HEURISTIC_ONLY", "false");
    vi.mocked(getConsultingEngineHealth).mockResolvedValue({
      checkedAt: new Date().toISOString(),
      allOk: true,
      engines: [
        { id: "m-biz", label: "M-BIZ", ok: true, latencyMs: 8, detail: "ok" },
        { id: "m-mkt", label: "M-MKT", ok: true, latencyMs: 9, detail: "ok" },
        { id: "m-ed", label: "M-ED", ok: true, latencyMs: 11, detail: "ok" },
      ],
    });

    const report = await buildProductAcceptanceReport();
    expect(report.failCount).toBe(0);
    expect(report.readyForDemo).toBe(true);
    expect(report.summary).toMatch(/演示就绪|警告/);
  });
});

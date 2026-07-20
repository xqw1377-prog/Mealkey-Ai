import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/engine-health.service", () => ({
  getConsultingEngineHealth: vi.fn(),
}));

import { getConsultingEngineHealth } from "@/server/services/engine-health.service";
import {
  countDegradedOpinions,
  evaluateEngineMeetingGate,
  isCouncilStubAllowedByEnv,
  isDegradedMeetingAllowed,
} from "@/server/services/engine-meeting-gate";

describe("engine-meeting-gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("counts degraded opinions", () => {
    expect(
      countDegradedOpinions([
        { degraded: true },
        { degraded: false },
        { degraded: true },
      ]),
    ).toBe(2);
  });

  it("production blocks council stub unless ALLOW_COUNCIL_STUB=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_COUNCIL_STUB", "");
    expect(isCouncilStubAllowedByEnv()).toBe(false);
    vi.stubEnv("ALLOW_COUNCIL_STUB", "1");
    expect(isCouncilStubAllowedByEnv()).toBe(true);
  });

  it("dev allows council stub by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ALLOW_COUNCIL_STUB", "");
    expect(isCouncilStubAllowedByEnv()).toBe(true);
  });

  it("production blocks when required engines are down", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FOUNDER_ALLOW_DEGRADED_MEETING", "");
    vi.stubEnv("HEURISTIC_ONLY", "false");
    vi.mocked(getConsultingEngineHealth).mockResolvedValue({
      checkedAt: new Date().toISOString(),
      allOk: false,
      engines: [
        {
          id: "m-biz",
          label: "M-BIZ",
          ok: false,
          latencyMs: 12,
          detail: "down",
        },
        {
          id: "m-mkt",
          label: "M-MKT",
          ok: true,
          latencyMs: 8,
          detail: "ok",
        },
        {
          id: "m-ed",
          label: "M-ED",
          ok: true,
          latencyMs: 9,
          detail: "ok",
        },
      ],
    });

    expect(isDegradedMeetingAllowed()).toBe(false);
    const gate = await evaluateEngineMeetingGate({
      agents: ["M-BIZ", "M-MKT"],
    });
    expect(gate.ok).toBe(false);
    expect(gate.allowDegraded).toBe(false);
    expect(gate.down.map((d) => d.id)).toContain("m-biz");
    expect(gate.note).toMatch(/阻止扣经营点/);
  });

  it("dev allows degraded meeting when engines down", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(getConsultingEngineHealth).mockResolvedValue({
      checkedAt: new Date().toISOString(),
      allOk: false,
      engines: [
        {
          id: "m-biz",
          label: "M-BIZ",
          ok: false,
          latencyMs: 1,
          detail: "down",
        },
        {
          id: "m-mkt",
          label: "M-MKT",
          ok: false,
          latencyMs: 1,
          detail: "down",
        },
        {
          id: "m-ed",
          label: "M-ED",
          ok: false,
          latencyMs: 1,
          detail: "down",
        },
      ],
    });

    const gate = await evaluateEngineMeetingGate();
    expect(gate.ok).toBe(false);
    expect(gate.allowDegraded).toBe(true);
    expect(gate.note).toMatch(/演示模式/);
  });
});

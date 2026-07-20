import { describe, expect, it, vi } from "vitest";
import { seedDecisionArtifactsFromMeeting } from "@/server/founder-layer/capability/decision/seed-from-meeting";

describe("seedDecisionArtifactsFromMeeting", () => {
  it("有 expertOpinions 时按席位写入", async () => {
    const opinions: unknown[] = [];
    const evidence: unknown[] = [];
    const prisma = {
      decision: {
        findFirst: vi.fn().mockResolvedValue({
          id: "clxyz0123456789abcdef",
          projectId: "proj_1",
          outcome: "{}",
          evidence: "[]",
        }),
        update: vi.fn().mockImplementation(async ({ data }: { data: { outcome?: string; evidence?: string } }) => {
          if (data.outcome) {
            const o = JSON.parse(data.outcome) as { opinions?: unknown[] };
            if (o.opinions) opinions.push(...o.opinions);
          }
          if (data.evidence) {
            const e = JSON.parse(data.evidence) as unknown[];
            evidence.push(...e);
          }
          return {};
        }),
      },
      decisionEvent: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await seedDecisionArtifactsFromMeeting(prisma as never, {
      decisionId: "clxyz0123456789abcdef",
      projectId: "proj_1",
      supportClaims: ["定位清晰"],
      opposeClaims: ["现金流紧"],
      expertOpinions: [
        {
          expert: "M-PNT",
          position: "support",
          reason: "年轻化湘菜定位成立",
          confidence: 0.8,
        },
        {
          expert: "M-BIZ",
          position: "oppose",
          reason: "模型现金流承压",
          confidence: 0.75,
        },
      ],
    });

    expect(result.opinionCount).toBe(2);
    expect(result.evidenceCount).toBe(2);
    expect(prisma.decision.update).toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  assembleContextPackage,
  buildSignaturePayload,
  signAgentRequest,
  validateAndProjectIngress,
  verifyAgentSignature,
  type RegisteredAgentV1,
} from "@/server/agent-platform-gateway";

const agent: RegisteredAgentV1 = {
  agentId: "partner.acme.diagnosis",
  clientSecret: "mk-sandbox-agent-secret",
  maxInsightLevel: 3,
  allowedScopes: ["basic", "facts", "review"],
  stage: "sandbox",
};

describe("agent-platform-gateway", () => {
  it("HMAC 签名可校验（对齐 SDK payload）", () => {
    const timestamp = String(Date.now());
    const path = "/v1/gateway/ingress";
    const body = JSON.stringify({ restaurantId: "r1", invokeId: "i1", items: [] });
    const signature = signAgentRequest(agent.clientSecret, {
      method: "POST",
      path,
      timestamp,
      body,
      agentId: agent.agentId,
    });
    process.env.MK_AGENT_SANDBOX_SECRET = agent.clientSecret;
    const resolved = verifyAgentSignature({
      method: "POST",
      path,
      body,
      agentId: agent.agentId,
      timestamp,
      signature,
    });
    expect(resolved.agentId).toBe(agent.agentId);
    expect(
      buildSignaturePayload({
        method: "POST",
        path,
        timestamp,
        body,
        agentId: agent.agentId,
      }),
    ).toContain(agent.agentId);
  });

  it("Context 按 scope 裁剪且不编造竞争家数", () => {
    const pkg = assembleContextPackage({
      restaurantId: "p1",
      requestedScopes: ["basic", "market", "dna"],
      agent: {
        ...agent,
        allowedScopes: ["basic", "facts", "review"],
      },
      project: {
        id: "p1",
        name: "湘味小馆",
        city: "长沙",
        district: "岳麓区",
        category: "湘菜",
        stage: "growth",
        profile: null,
      },
    });
    expect(pkg.scopesGranted).toContain("basic");
    expect(pkg.scopesDenied).toEqual(expect.arrayContaining(["market", "dna"]));
    expect(pkg.identity?.city).toBe("长沙");
    expect(JSON.stringify(pkg)).not.toMatch(/17家|竞争激烈/);
  });

  it("Ingress：无证据 Signal 拒收；合法 Signal 进 radar", () => {
    const bad = validateAndProjectIngress({
      batch: {
        agentId: agent.agentId,
        restaurantId: "p1",
        invokeId: "inv-1",
        items: [
          {
            port: "signal",
            level: 2,
            payload: {
              title: "服务风险",
              confidence: 0.8,
              evidence: [],
              impact: "复购",
              observation: "x",
              severity: "HIGH",
              type: "CUSTOMER",
            },
          },
        ],
      },
      agent,
    });
    expect(bad.rejected[0]?.code).toBe("NO_EVIDENCE");

    const good = validateAndProjectIngress({
      batch: {
        agentId: agent.agentId,
        restaurantId: "p1",
        invokeId: "inv-2",
        items: [
          {
            port: "signal",
            level: 2,
            payload: {
              title: "服务风险",
              confidence: 0.82,
              evidence: [{ source: "dianping", fact: "等待差评增多" }],
              evidenceChain: [
                { kind: "external_intel", claim: "等待相关负评上升" },
                { kind: "inference", claim: "高峰承载不足" },
              ],
              impact: "可能影响复购",
              observation: "近窗等待负评上升",
              severity: "HIGH",
              type: "CUSTOMER",
              watchHint: "关注高峰服务流程",
            },
          },
        ],
      },
      agent,
    });
    expect(good.ok).toBe(true);
    expect(good.accepted[0]?.projectedTo).toBe("radar");
  });

  it("Ingress：未认证不得 L4 / Work", () => {
    const l4 = validateAndProjectIngress({
      batch: {
        agentId: agent.agentId,
        restaurantId: "p1",
        invokeId: "inv-3",
        items: [
          {
            port: "insight",
            level: 4,
            payload: {
              topic: "运营",
              finding: "x",
              confidence: 0.8,
              evidence: [{ claim: "e" }],
              decisionTopic: "是否加人",
            },
          },
        ],
      },
      agent,
    });
    expect(l4.rejected[0]?.code).toBe("LEVEL_EXCEEDED");

    const work = validateAndProjectIngress({
      batch: {
        agentId: agent.agentId,
        restaurantId: "p1",
        invokeId: "inv-4",
        items: [
          {
            port: "work",
            level: 5,
            payload: { title: "排班", summary: "x", requiresDecisionId: "d1" },
          },
        ],
      },
      agent,
    });
    expect(work.rejected[0]?.code).toBe("LEVEL_EXCEEDED");
  });
});

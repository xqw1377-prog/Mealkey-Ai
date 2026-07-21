import { describe, expect, it, vi, afterEach } from "vitest";

describe("gateway production fail-closed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("production rejects default sandbox secret registry", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MK_AGENT_SANDBOX_SECRET", "mk-sandbox-agent-secret");
    vi.stubEnv("MK_AGENT_REGISTRY_JSON", "");
    const { loadAgentRegistry } = await import(
      "../src/server/agent-platform-gateway/registry"
    );
    expect(loadAgentRegistry()).toEqual([]);
  });

  it("production rejects sandbox bearer without allow flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MK_GATEWAY_ALLOW_SANDBOX_TOKEN", "");
    vi.stubEnv("MK_GATEWAY_USER_TOKENS", "listed-token");
    const { verifyUserAccessToken } = await import(
      "../src/server/agent-platform-gateway/auth"
    );
    expect(() => verifyUserAccessToken("Bearer sandbox")).toThrow(/禁用 sandbox/);
  });

  it("production ignores DEV_OPEN and rejects unknown bearer", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MK_GATEWAY_DEV_OPEN", "1");
    vi.stubEnv("MK_GATEWAY_USER_TOKENS", "listed-token");
    const { verifyUserAccessToken } = await import(
      "../src/server/agent-platform-gateway/auth"
    );
    expect(() => verifyUserAccessToken("Bearer anything")).toThrow(/无效/);
  });

  it("listed token can bind ownerId via token|ownerId", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MK_GATEWAY_USER_TOKENS", "tok_a|owner_1,tok_b");
    const { verifyUserAccessToken } = await import(
      "../src/server/agent-platform-gateway/auth"
    );
    const a = verifyUserAccessToken("Bearer tok_a");
    expect(a.mode).toBe("listed");
    expect(a.ownerId).toBe("owner_1");
    const b = verifyUserAccessToken("Bearer tok_b");
    expect(b.ownerId).toBeNull();
  });
});

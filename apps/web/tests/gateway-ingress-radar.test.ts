import { describe, expect, it } from "vitest";
import { collectGatewayIngressWorldChanges } from "@/server/agent-platform-gateway";

describe("collectGatewayIngressWorldChanges", () => {
  it("从 profile 侧车投影 Signal 到今日雷达", () => {
    const changes = collectGatewayIngressWorldChanges({
      projectId: "proj-1",
      profile: {
        agentGatewayIngress: [
          {
            invokeId: "inv-9",
            agentId: "restaurant-diagnosis",
            ack: {
              accepted: [
                { port: "signal", id: "sig-1", projectedTo: "radar" },
              ],
            },
            items: [
              {
                port: "signal",
                level: 2,
                payload: {
                  title: "服务体验风险",
                  observation: "近窗等待负评上升",
                  watchHint: "关注高峰服务流程",
                },
              },
            ],
          },
        ],
      },
    });
    expect(changes.length).toBe(1);
    expect(changes[0]!.title).toContain("服务");
    expect(changes[0]!.kind).toBe("alert");
    expect(changes[0]!.href).toBeTruthy();
  });

  it("无侧车时返回空", () => {
    expect(
      collectGatewayIngressWorldChanges({
        projectId: "p",
        profile: {},
      }),
    ).toEqual([]);
  });
});

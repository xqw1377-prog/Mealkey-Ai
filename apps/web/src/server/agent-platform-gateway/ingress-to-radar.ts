/**
 * 将 Gateway Ingress 侧车投影为今日雷达 WorldChange
 * 权威：MEALKEY_AGENT_EXTERNAL_INTERFACE_V1 · Platform Architecture
 */
import { decisionReadyPath } from "@/lib/decision-entry";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";

type IngressSideCar = {
  invokeId?: string;
  agentId?: string;
  at?: string;
  ack?: {
    accepted?: Array<{ port: string; id: string; projectedTo?: string }>;
  };
  items?: Array<{
    port: string;
    level?: number;
    payload?: Record<string, unknown>;
  }>;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 从 project.profile JSON 解析 Gateway 写入的侧车 */
export function collectGatewayIngressWorldChanges(input: {
  projectId: string;
  profile: unknown;
  /** 最多条数 */
  limit?: number;
}): WorldChangeV1[] {
  const limit = input.limit ?? 4;
  const profile =
    input.profile && typeof input.profile === "object"
      ? (input.profile as Record<string, unknown>)
      : {};
  const rows = Array.isArray(profile.agentGatewayIngress)
    ? (profile.agentGatewayIngress as IngressSideCar[])
    : [];

  const out: WorldChangeV1[] = [];
  // 新在后：倒序取最近
  for (const row of [...rows].reverse()) {
    if (out.length >= limit) break;
    const items = Array.isArray(row.items) ? row.items : [];
    const acceptedPorts = new Set(
      (row.ack?.accepted || [])
        .filter((a) => a.projectedTo === "radar" || a.port === "signal")
        .map((a) => a.port),
    );

    for (let i = 0; i < items.length; i++) {
      if (out.length >= limit) break;
      const item = items[i]!;
      if (item.port !== "signal") continue;
      // 若 ack 存在则要求 signal 被接受
      if (row.ack?.accepted && !acceptedPorts.has("signal") && !row.ack.accepted.some((a) => a.port === "signal")) {
        continue;
      }
      const p = asRecord(item.payload);
      const title = str(p.title) || "经营信号";
      const observation = str(p.observation) || str(p.meaning) || title;
      const topic =
        str(p.decisionTopic) ||
        str(p.watchHint) ||
        `${title}：下一步最该拍什么板？`;
      const id = `gw-ingress-${row.invokeId || "x"}-${i}`;
      out.push({
        id,
        kind: "alert",
        title: title.slice(0, 24),
        detail: observation.slice(0, 160),
        decisionTopic: topic.slice(0, 80),
        href: decisionReadyPath(input.projectId, topic),
      });
    }
  }
  return out;
}

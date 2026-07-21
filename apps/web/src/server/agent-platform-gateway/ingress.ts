import type { RegisteredAgentV1 } from "./types";
import type { IngressAckV1, IngressBatchV1, IngressItemV1 } from "./types";

const FORBIDDEN = /请批准|已决策|签字确认|全面升级|降本增效|赋能/;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function validateAndProjectIngress(input: {
  batch: IngressBatchV1;
  agent: RegisteredAgentV1;
  /** 已处理过的 invokeId → 幂等命中 */
  priorInvokeIds?: Set<string>;
}): IngressAckV1 {
  const { batch, agent } = input;
  if (input.priorInvokeIds?.has(batch.invokeId)) {
    return {
      ok: true,
      invokeId: batch.invokeId,
      accepted: [
        {
          port: "signal",
          id: `dedup-${batch.invokeId}`,
          projectedTo: "radar",
        },
      ],
      rejected: [],
    };
  }

  const accepted: IngressAckV1["accepted"] = [];
  const rejected: IngressAckV1["rejected"] = [];

  batch.items.forEach((item, index) => {
    const result = validateItem(item, agent, index);
    if (result.ok) accepted.push(result.accepted!);
    else rejected.push(result.rejected!);
  });

  return {
    ok: rejected.length === 0 && accepted.length > 0,
    invokeId: batch.invokeId,
    accepted,
    rejected,
  };
}

function validateItem(
  item: IngressItemV1,
  agent: RegisteredAgentV1,
  index: number,
): {
  ok: boolean;
  accepted?: IngressAckV1["accepted"][number];
  rejected?: IngressAckV1["rejected"][number];
} {
  const level = item.level ?? 1;
  const p = asRecord(item.payload);

  if (item.port !== "learning" && level > agent.maxInsightLevel) {
    return {
      ok: false,
      rejected: {
        index,
        code: "LEVEL_EXCEEDED",
        message: `level ${level} > maxInsightLevel ${agent.maxInsightLevel}`,
      },
    };
  }

  if (item.port === "signal") {
    const evidence = Array.isArray(p.evidence) ? p.evidence : [];
    const confidence = num(p.confidence);
    const watchHint = str(p.watchHint);
    const chain = Array.isArray(p.evidenceChain) ? p.evidenceChain : [];

    if (!evidence.length) {
      return {
        ok: false,
        rejected: {
          index,
          code: "NO_EVIDENCE",
          message: "signal.evidence required",
        },
      };
    }
    if (confidence == null || confidence < 0 || confidence > 1) {
      return {
        ok: false,
        rejected: {
          index,
          code: "SCHEMA_INVALID",
          message: "confidence 0–1 required",
        },
      };
    }
    if (FORBIDDEN.test(watchHint)) {
      return {
        ok: false,
        rejected: {
          index,
          code: "FORBIDDEN_DECISION",
          message: "watchHint 含拍板/战略禁词",
        },
      };
    }
    if (
      chain.length > 0 &&
      chain.every(
        (c) => asRecord(c).kind === "inference",
      )
    ) {
      return {
        ok: false,
        rejected: {
          index,
          code: "INFERENCE_ONLY",
          message: "evidenceChain 不得纯推理",
        },
      };
    }

    return {
      ok: true,
      accepted: {
        port: "signal",
        id: `sig-${batchId(index)}`,
        projectedTo: "radar",
      },
    };
  }

  if (item.port === "insight") {
    const evidence = Array.isArray(p.evidence) ? p.evidence : [];
    const confidence = num(p.confidence);
    const text = `${str(p.recommendation)} ${str(p.decisionTopic)}`;
    if (!evidence.length) {
      return {
        ok: false,
        rejected: {
          index,
          code: "NO_EVIDENCE",
          message: "insight.evidence required",
        },
      };
    }
    if (confidence == null || confidence < 0 || confidence > 1) {
      return {
        ok: false,
        rejected: {
          index,
          code: "SCHEMA_INVALID",
          message: "confidence 0–1 required",
        },
      };
    }
    if (FORBIDDEN.test(text)) {
      return {
        ok: false,
        rejected: {
          index,
          code: "FORBIDDEN_DECISION",
          message: "insight 含拍板禁词",
        },
      };
    }
    return {
      ok: true,
      accepted: {
        port: "insight",
        id: `ins-${batchId(index)}`,
        projectedTo: level >= 4 ? "room" : "radar",
      },
    };
  }

  if (item.port === "gap") {
    if (!str(p.field) || !str(p.reason)) {
      return {
        ok: false,
        rejected: {
          index,
          code: "SCHEMA_INVALID",
          message: "gap.field/reason required",
        },
      };
    }
    return {
      ok: true,
      accepted: {
        port: "gap",
        id: `gap-${batchId(index)}`,
        projectedTo: "gap_ui",
      },
    };
  }

  if (item.port === "work") {
    if (!str(p.requiresDecisionId)) {
      return {
        ok: false,
        rejected: {
          index,
          code: "WORK_NO_AUTH",
          message: "work.requiresDecisionId required",
        },
      };
    }
    if (agent.maxInsightLevel < 5) {
      return {
        ok: false,
        rejected: {
          index,
          code: "LEVEL_EXCEEDED",
          message: "work requires maxInsightLevel 5",
        },
      };
    }
    return {
      ok: true,
      accepted: {
        port: "work",
        id: `work-${batchId(index)}`,
        projectedTo: "exec",
      },
    };
  }

  if (item.port === "learning") {
    if (!str(p.summary)) {
      return {
        ok: false,
        rejected: {
          index,
          code: "SCHEMA_INVALID",
          message: "learning.summary required",
        },
      };
    }
    return {
      ok: true,
      accepted: {
        port: "learning",
        id: `learn-${batchId(index)}`,
        projectedTo: "learning_queue",
      },
    };
  }

  return {
    ok: false,
    rejected: {
      index,
      code: "SCHEMA_INVALID",
      message: `unknown port`,
    },
  };
}

function batchId(index: number): string {
  return `${Date.now().toString(36)}-${index}`;
}

/** 写入 profile 侧车（调用方负责 CAS/持久化） */
export function mergeIngressIntoProfile(
  profile: Record<string, unknown>,
  batch: IngressBatchV1,
  ack: IngressAckV1,
): Record<string, unknown> {
  const prev = Array.isArray(profile.agentGatewayIngress)
    ? (profile.agentGatewayIngress as unknown[])
    : [];
  const entry = {
    invokeId: batch.invokeId,
    agentId: batch.agentId,
    at: new Date().toISOString(),
    horizon: batch.horizon,
    ack,
    items: batch.items,
  };
  return {
    ...profile,
    agentGatewayIngress: [...prev.filter((e) => {
      const row = e as { invokeId?: string };
      return row.invokeId !== batch.invokeId;
    }), entry].slice(-50),
  };
}

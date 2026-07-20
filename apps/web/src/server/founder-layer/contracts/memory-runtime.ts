/**
 * Memory Runtime 映射 — 四层 + 价值分级（非学习顾问席）
 * 专篇：MEALKEY_MEMORY_RUNTIME_BACKEND_V1.md · M1
 */

import type {
  FounderMemoryWrite,
  FounderMemoryWriteType,
  MemoryLayer,
  MemoryValueLevel,
} from "./memory";

/** Prisma Memory.type 语义映射（V1） */
export type MemoryItemLogicalType =
  | "FOUNDER"
  | "COMPANY"
  | "PROJECT"
  | "INDUSTRY"
  | "DECISION"
  | "LESSON"
  | "RULE"
  | "MEETING"
  | "PREFERENCE"
  | "LEARNING";

export type ResolveMemoryLayerInput = {
  type: FounderMemoryWriteType;
  payload?: Record<string, unknown>;
  /** 显式覆盖（如运营确认的行业规律） */
  memoryLayer?: MemoryLayer;
};

/** M4：逻辑边（存 payload.links，不建物理表） */
export type MemoryLinkRelation =
  | "caused"
  | "supports"
  | "contradicts"
  | "derived_from";

export type MemoryLink = {
  fromMemory?: string;
  toMemory?: string;
  relation: MemoryLinkRelation;
  note?: string;
};

export type MemoryRecallBlock = {
  priorBlock: string;
  decisions: Array<{ summary: string; decisionId?: string; createdAt?: string }>;
  lessons: Array<{ summary: string; kind: string; createdAt?: string }>;
  preferences: Array<{ label: string; value: string }>;
  forbiddenReminders: string[];
  topic: string;
};

/**
 * write.type + payload → Memory Layer
 * 默认有 projectId 的决策/验证/学习落 PROJECT；公司事实落 COMPANY；偏好落 FOUNDER。
 */
export function resolveMemoryLayer(input: ResolveMemoryLayerInput): MemoryLayer {
  if (input.memoryLayer) return input.memoryLayer;

  const kind =
    typeof input.payload?.kind === "string" ? input.payload.kind : "";
  if (kind === "industry_rule" || kind === "industry") return "INDUSTRY";
  if (kind === "company_facts" || kind === "company") return "COMPANY";
  if (kind === "founder_profile" || kind === "capability_profile") {
    return "FOUNDER";
  }

  if (input.type === "preference") return "FOUNDER";
  if (input.type === "fact" && kind === "company_facts") return "COMPANY";
  if (input.type === "fact") return "PROJECT";
  if (input.type === "meeting") return "PROJECT";
  if (input.type === "decision") return "PROJECT";
  if (input.type === "learning") return "PROJECT";
  return "PROJECT";
}

export function resolveMemoryValueLevel(input: {
  type: FounderMemoryWriteType;
  payload?: Record<string, unknown>;
  valueLevel?: MemoryValueLevel;
}): MemoryValueLevel {
  if (input.valueLevel !== undefined) return input.valueLevel;
  const raw = input.payload?.valueLevel;
  if (raw === 0 || raw === 1 || raw === 2 || raw === 3) return raw;

  if (input.type === "fact") return 1;
  if (input.type === "preference") return 1;
  if (input.type === "meeting" || input.type === "decision") return 2;
  if (input.type === "learning") {
    // Level 3 须显式标记（复现/确认）；默认 Lesson 仍是 Level 2
    return 2;
  }
  return 1;
}

/** 逻辑 item type（写入 Prisma type 时的扩展语义） */
export function resolveMemoryItemLogicalType(
  type: FounderMemoryWriteType,
  layer: MemoryLayer,
): MemoryItemLogicalType {
  if (type === "decision") return "DECISION";
  if (type === "learning") return "LESSON";
  if (type === "meeting") return "MEETING";
  if (type === "preference") return "PREFERENCE";
  if (layer === "INDUSTRY") return "INDUSTRY";
  if (layer === "COMPANY") return "COMPANY";
  if (layer === "FOUNDER") return "FOUNDER";
  return "PROJECT";
}

/** 给 write 盖章 memoryLayer / valueLevel，并写入 payload.memoryLayer */
export function stampMemoryLayer(
  write: FounderMemoryWrite,
): FounderMemoryWrite {
  const memoryLayer = resolveMemoryLayer({
    type: write.type,
    payload: write.payload,
    memoryLayer: write.memoryLayer,
  });
  const valueLevel = resolveMemoryValueLevel({
    type: write.type,
    payload: write.payload,
    valueLevel: write.valueLevel,
  });
  return {
    ...write,
    memoryLayer,
    valueLevel,
    payload: {
      ...write.payload,
      memoryLayer,
      valueLevel,
    },
  };
}

export function stampMemoryLayers(
  writes: FounderMemoryWrite[],
): FounderMemoryWrite[] {
  return writes.map(stampMemoryLayer);
}

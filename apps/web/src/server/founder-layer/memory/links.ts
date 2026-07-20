/**
 * Memory Runtime M4 — payload.links 逻辑边
 */

import type { FounderMemoryWrite } from "../contracts/memory";
import type { MemoryLink } from "../contracts/memory-runtime";
import { stampMemoryLayer } from "../contracts/memory-runtime";

export function attachMemoryLinks(
  write: FounderMemoryWrite,
  links: MemoryLink[],
): FounderMemoryWrite {
  const existing = Array.isArray(write.payload.links)
    ? (write.payload.links as MemoryLink[])
    : [];
  return stampMemoryLayer({
    ...write,
    payload: {
      ...write.payload,
      links: [...existing, ...links].slice(0, 12),
    },
  });
}

/** 失败学习 → caused → 规则/禁区（文案节点 id） */
export function linkFailureToRule(input: {
  write: FounderMemoryWrite;
  failureId: string;
  ruleId: string;
  note?: string;
}): FounderMemoryWrite {
  return attachMemoryLinks(input.write, [
    {
      fromMemory: input.failureId,
      toMemory: input.ruleId,
      relation: "caused",
      note: input.note || "失败沉淀为禁区/规则",
    },
  ]);
}

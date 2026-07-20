import type { DnaLayer, DnaSource } from "../domain/types";

/** 对话 / 咨询 / 会议 → 提议写入 DNA */
export type DnaPatchPropose = {
  kind: "dna_patch_propose";
  projectId: string;
  layer: DnaLayer;
  key: string;
  value: unknown;
  confidence: number;
  source: DnaSource;
  evidenceIds?: string[];
  at: string;
};

export const DNA_MERGE_MIN_CONFIDENCE = 0.45;

export function shouldAcceptDnaPatch(patch: DnaPatchPropose): boolean {
  if (patch.confidence < DNA_MERGE_MIN_CONFIDENCE) return false;
  return true;
}

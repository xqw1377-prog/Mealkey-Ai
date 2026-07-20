/**
 * Memory Permission Protocol — 读/写/闸门
 */

import {
  DEFAULT_MEMORY_PERMISSIONS,
  type MemoryPermissionState,
} from "../contracts/intelligence-profile";

export function readMemoryPermissions(
  profile: Record<string, unknown>,
): MemoryPermissionState {
  const raw = profile.memoryPermissions;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_MEMORY_PERMISSIONS };
  }
  const o = raw as Record<string, unknown>;
  return {
    saveExperience:
      typeof o.saveExperience === "boolean"
        ? o.saveExperience
        : DEFAULT_MEMORY_PERMISSIONS.saveExperience,
    useForPersonalGrowth:
      typeof o.useForPersonalGrowth === "boolean"
        ? o.useForPersonalGrowth
        : DEFAULT_MEMORY_PERMISSIONS.useForPersonalGrowth,
    contributeToIndustryModel:
      typeof o.contributeToIndustryModel === "boolean"
        ? o.contributeToIndustryModel
        : DEFAULT_MEMORY_PERMISSIONS.contributeToIndustryModel,
    confirmedAt:
      typeof o.confirmedAt === "string" ? o.confirmedAt : undefined,
  };
}

export function writeMemoryPermissions(
  profile: Record<string, unknown>,
  patch: Partial<MemoryPermissionState>,
  now = new Date().toISOString(),
): Record<string, unknown> {
  const prev = readMemoryPermissions(profile);
  const next: MemoryPermissionState = {
    ...prev,
    ...patch,
    confirmedAt: now,
  };
  // 行业贡献必须显式 true；禁止 undefined 误开
  if (patch.contributeToIndustryModel !== true) {
    if (patch.contributeToIndustryModel === false) {
      next.contributeToIndustryModel = false;
    }
  }
  return {
    ...profile,
    memoryPermissions: next,
  };
}

export type MemoryWriteKind = "experience" | "growth" | "industry";

/** 是否允许该类记忆写入 */
export function canPersistMemoryKind(
  permissions: MemoryPermissionState,
  kind: MemoryWriteKind,
): boolean {
  if (kind === "industry") return permissions.contributeToIndustryModel === true;
  if (kind === "growth") return permissions.useForPersonalGrowth === true;
  return permissions.saveExperience === true;
}

/** Industry / 跨租户写入前必须调用 */
export function assertIndustryContributionAllowed(
  permissions: MemoryPermissionState,
): void {
  if (!permissions.contributeToIndustryModel) {
    throw new Error(
      "Memory Permission：未开启「用于行业模型」，禁止写入 Industry Memory",
    );
  }
}

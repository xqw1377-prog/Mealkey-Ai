/**
 * E1：打开驾驶舱时节流触发 RIP 日更（公开检索 + 差分入库）
 * 每天最多一次（Asia/Shanghai）；未确认画像不跑。
 */

import { prisma, parseJsonField } from "@/lib/prisma";
import type { BusinessIdentityV1 } from "@/server/founder-layer/contracts/business-identity";
import {
  getCurrentRipSnapshot,
  readRipStore,
  refreshRipDaily,
  PROFILE_RIP_DAILY_SCAN_AT,
} from "./profile-service";

export { PROFILE_RIP_DAILY_SCAN_AT };

function shanghaiDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function shouldRunDailyRipRefresh(
  profile: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!profile) return false;
  const store = readRipStore(profile);
  const current = getCurrentRipSnapshot(store);
  if (!current || current.status !== "confirmed") return false;

  const last = profile[PROFILE_RIP_DAILY_SCAN_AT];
  if (typeof last === "string" && last.trim()) {
    try {
      if (shanghaiDay(new Date(last)) === shanghaiDay(now)) return false;
    } catch {
      // 坏时间戳则允许重跑
    }
  }
  return true;
}

function identityFromProfile(
  profile: Record<string, unknown>,
): BusinessIdentityV1 | null {
  const raw = profile.businessIdentity;
  if (!raw || typeof raw !== "object") return null;
  return raw as BusinessIdentityV1;
}

export type EnsureDailyRipRefreshResult = {
  refreshed: boolean;
  profile: Record<string, unknown>;
};

/**
 * 若需要则执行 refreshRipDaily（含 live 外采 + lastDiff + 当日戳）。
 * 失败不抛——驾驶舱仍可用旧画像投影。
 */
export async function ensureDailyRipRefresh(input: {
  projectId: string;
  ownerId: string;
  profile: Record<string, unknown>;
  category?: string;
  skipLive?: boolean;
  /** 手动刷新：忽略当日戳 */
  force?: boolean;
}): Promise<EnsureDailyRipRefreshResult> {
  if (!input.force && !shouldRunDailyRipRefresh(input.profile)) {
    return { refreshed: false, profile: input.profile };
  }

  const identity = identityFromProfile(input.profile);
  if (!identity?.brandName) {
    return { refreshed: false, profile: input.profile };
  }

  // force 时若已确认才跑；未确认仍不日更（避免绕过确认门）
  if (input.force) {
    const store = readRipStore(input.profile);
    const current = getCurrentRipSnapshot(store);
    if (!current || current.status !== "confirmed") {
      return { refreshed: false, profile: input.profile };
    }
  }

  try {
    await refreshRipDaily({
      projectId: input.projectId,
      ownerId: input.ownerId,
      identity,
      category: input.category,
      skipLive: input.skipLive,
    });

    const row = await prisma.project.findFirst({
      where: { id: input.projectId },
      select: { profile: true },
    });
    const fresh =
      row?.profile != null
        ? (parseJsonField(row.profile) as Record<string, unknown>) ||
          input.profile
        : input.profile;

    return { refreshed: true, profile: fresh };
  } catch {
    return { refreshed: false, profile: input.profile };
  }
}

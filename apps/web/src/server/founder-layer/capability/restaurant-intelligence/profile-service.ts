/**
 * Restaurant Intelligence Profile — R1 Identity-only 生成 / 确认
 * 权威：docs/MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md
 *
 * 确认前不得把 Snapshot 当 Brain 事实写死。
 */

import { TRPCError } from "@trpc/server";
import {
  FOCUS_LABEL,
  type BusinessIdentityV1,
} from "@/server/founder-layer/contracts/business-identity";
import {
  PROFILE_RIP_KEY,
  type RestaurantIntelligenceProfileStoreV1,
  type RestaurantIntelligenceSnapshotV1,
  type RestaurantEvidenceV1,
  type RipBasicIdentityV1,
  type RipConfirmStatusV1,
} from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { updateProjectProfile } from "@/server/services/project-profile";
import {
  collectExternalIntelligence,
  collectExternalIntelligenceWithLive,
  type ExternalCollectResult,
} from "./external-collector";
import {
  alertsFromMarketEvidence,
  projectCustomerPerception,
} from "./customer-perception";
import {
  attachFounderClaim,
  buildCognitionGap,
  inferFounderClaimFromIdentity,
} from "./cognition-gap";
import {
  buildHabitSeedFromRip,
  mergeHabitSeedIntoProfile,
  readHabitFromProfile,
} from "./dna-seed";
import { diffRipSnapshots } from "./rip-diff";

function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid.slice(0, 12)}`;
}

export function emptyRipStore(): RestaurantIntelligenceProfileStoreV1 {
  return {
    schemaVersion: 1,
    currentSnapshotId: null,
    snapshots: [],
  };
}

export function readRipStore(
  profile: Record<string, unknown> | null | undefined,
): RestaurantIntelligenceProfileStoreV1 {
  const raw = profile?.[PROFILE_RIP_KEY];
  if (!raw || typeof raw !== "object") return emptyRipStore();
  const store = raw as Partial<RestaurantIntelligenceProfileStoreV1>;
  if (!Array.isArray(store.snapshots)) return emptyRipStore();
  return {
    schemaVersion: 1,
    currentSnapshotId:
      typeof store.currentSnapshotId === "string"
        ? store.currentSnapshotId
        : null,
    snapshots: store.snapshots as RestaurantIntelligenceSnapshotV1[],
  };
}

export function getCurrentRipSnapshot(
  store: RestaurantIntelligenceProfileStoreV1,
): RestaurantIntelligenceSnapshotV1 | null {
  if (!store.currentSnapshotId) return null;
  return (
    store.snapshots.find((s) => s.snapshotId === store.currentSnapshotId) ??
    null
  );
}

/** 未确认（含草稿 / 待确认 / 已修正 / 已拒绝未再确认）时需要门禁 */
export function needsRipConfirmGate(
  store: RestaurantIntelligenceProfileStoreV1,
): boolean {
  const current = getCurrentRipSnapshot(store);
  if (!current) return false;
  return (
    current.status === "draft" ||
    current.status === "pending_confirm" ||
    current.status === "revised" ||
    current.status === "rejected"
  );
}

export function stageLabelFromIdentity(identity: BusinessIdentityV1): string {
  const stores = identity.storeCountApprox;
  const problem = identity.biggestProblem || "";
  const expanding =
    identity.focus === "expansion" ||
    /第二|扩张|开店|加盟|复制|连锁/.test(problem);

  if (stores <= 1) {
    return expanding ? "单店 · 扩张酝酿期" : "单店增长期";
  }
  if (stores <= 5) {
    return expanding ? "多店 · 复制准备期" : "多店打磨期";
  }
  return "区域规模化期";
}

function alertLinesFromIdentity(identity: BusinessIdentityV1): string[] {
  const problem = identity.biggestProblem || "";
  const lines: string[] = [];
  const expanding =
    identity.focus === "expansion" ||
    /第二|扩张|开店|加盟|复制|连锁/.test(problem);

  if (expanding && identity.storeCountApprox <= 1) {
    lines.push(
      "你现在最重要的问题，未必是立刻开第二家，而是先证明第一家店具备可复制能力。",
    );
  } else if (problem) {
    lines.push(`你提到最困扰的是「${problem}」，我会先围绕这件事建立判断。`);
  }

  lines.push(
    `当前关注重点是「${FOCUS_LABEL[identity.focus]}」，画像会优先盯相关信号。`,
  );

  if (!identity.externalIntelReady) {
    lines.push("品牌或位置还不完整时，我不会假装已经看过外部评价。");
  } else {
    lines.push(
      "盈利模型、复购结构、店长独立能力若仍未知，复制决策应先补这些一手事实。",
    );
  }
  return lines.slice(0, 3);
}

function nextVersionLabel(store: RestaurantIntelligenceProfileStoreV1): string {
  const n = store.snapshots.length + 1;
  return `V1.${Math.max(0, n - 1)}`;
}

export type BuildRipSnapshotInput = {
  projectId: string;
  identity: BusinessIdentityV1;
  category?: string;
  versionLabel?: string;
  status?: RipConfirmStatusV1;
  /** R2：经 M-INTEL 采集结果；缺省则 Identity-only 降级 */
  external?: ExternalCollectResult;
  founderClaim?: string;
};

/** @deprecated 使用 buildRestaurantIntelligenceSnapshot */
export function buildIdentityOnlySnapshot(
  input: Omit<BuildRipSnapshotInput, "external">,
): RestaurantIntelligenceSnapshotV1 {
  return buildRestaurantIntelligenceSnapshot(input);
}

/** 纯函数：Identity +（可选）外部证据 → RIP Snapshot */
export function buildRestaurantIntelligenceSnapshot(
  input: BuildRipSnapshotInput,
): RestaurantIntelligenceSnapshotV1 {
  const { projectId, identity } = input;
  const now = new Date().toISOString();
  const stageLabel = stageLabelFromIdentity(identity);
  const evidenceId = newId("ev_id");
  const problem = identity.biggestProblem?.trim();

  const identityEvidence: RestaurantEvidenceV1 = {
    schemaVersion: 1,
    id: evidenceId,
    source: "经营身份",
    content: problem
      ? `老板自述困扰：${problem}`
      : `关注重点：${FOCUS_LABEL[identity.focus]}`,
    sentiment: "neutral",
    confidence: 0.72,
    observedAt: now,
  };

  const external = input.external;
  const marketEvidence = external?.evidences ?? [];
  const evidence = [identityEvidence, ...marketEvidence];

  const customer = projectCustomerPerception(evidence);
  const identityAlerts = alertLinesFromIdentity(identity).map((line) => ({
    line,
    evidenceIds: [evidenceId],
  }));
  const marketAlerts = alertsFromMarketEvidence(marketEvidence, 2);
  const alerts = [...marketAlerts, ...identityAlerts].slice(0, 3);

  const degradedNotes = [
    ...(external?.degradedNotes ?? []),
  ];
  if (!external) {
    degradedNotes.push("外部评价尚未接入，当前为经营身份速写画像");
  }
  if (!identity.externalIntelReady && !degradedNotes.some((n) => n.includes("品牌或位置"))) {
    degradedNotes.unshift("品牌或位置不完整，未宣称网络评价分析");
  }

  const reviewIntelReady = Boolean(external?.reviewIntelReady);
  const feedbackIntelReady = Boolean(external?.feedbackIntelReady);
  const marketScanReady = Boolean(external?.marketScanReady);

  const basic: RipBasicIdentityV1 = {
    brandName: identity.brandName,
    category: input.category?.trim() || undefined,
    city: identity.city || "位置待补",
    districtOrArea: identity.district || identity.address || undefined,
    stageLabel,
    avgTicketHint: "未知",
    competitionHint: identity.externalIntelReady
      ? marketScanReady
        ? `${identity.city || "当地"}竞争信号已挂载（证据级，非定论）`
        : `${identity.city || "当地"}同类餐饮竞争（待外部证据细化）`
      : "未知（缺锚点）",
  };

  const claim =
    input.founderClaim?.trim() ||
    (!customer.evidenceInsufficient
      ? inferFounderClaimFromIdentity(identity)
      : undefined);
  const cognitionGap = buildCognitionGap({
    founderClaim: claim,
    customer,
    evidence,
  });

  return {
    schemaVersion: 1,
    snapshotId: newId("rip"),
    projectId,
    versionLabel: input.versionLabel || "V1.0",
    status: input.status || "pending_confirm",
    createdAt: now,
    basic,
    customer,
    cognitionGap,
    alerts,
    evidence,
    source: "rip_intake_v1",
    collection: {
      identityReady: true,
      reviewIntelReady,
      feedbackIntelReady,
      marketScanReady,
      degradedNotes: [...new Set(degradedNotes)].slice(0, 6),
    },
  };
}

export type RipRevisePatch = {
  stageLabel?: string;
  category?: string;
  founderClaim?: string;
};

function applyRevisePatch(
  snapshot: RestaurantIntelligenceSnapshotV1,
  patch: RipRevisePatch,
): RestaurantIntelligenceSnapshotV1 {
  const next: RestaurantIntelligenceSnapshotV1 = {
    ...snapshot,
    basic: {
      ...snapshot.basic,
      ...(patch.stageLabel?.trim()
        ? { stageLabel: patch.stageLabel.trim() }
        : {}),
      ...(patch.category?.trim() ? { category: patch.category.trim() } : {}),
    },
    status: "revised",
  };

  const claim = patch.founderClaim?.trim();
  if (claim) {
    next.cognitionGap = buildCognitionGap({
      founderClaim: claim,
      customer: snapshot.customer,
      evidence: snapshot.evidence,
    });
  }

  return next;
}

export async function persistRipStore(
  projectId: string,
  ownerId: string,
  mutator: (
    store: RestaurantIntelligenceProfileStoreV1,
    profile: Record<string, unknown>,
  ) => RestaurantIntelligenceProfileStoreV1,
  extraProfile?: (profile: Record<string, unknown>) => Record<string, unknown>,
): Promise<RestaurantIntelligenceProfileStoreV1> {
  const result = await updateProjectProfile(
    projectId,
    (profile) => {
      const store = readRipStore(profile);
      const nextStore = mutator(store, profile);
      const base = {
        ...profile,
        [PROFILE_RIP_KEY]: nextStore,
      };
      return extraProfile ? extraProfile(base) : base;
    },
    { ownerId },
  );
  if (!result) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "经营画像写入失败",
    });
  }
  return readRipStore(result.profile);
}

export async function generateIdentityOnlyRip(input: {
  projectId: string;
  ownerId: string;
  identity: BusinessIdentityV1;
  category?: string;
  /** 已有待确认画像时是否强制重生 */
  force?: boolean;
  /** 测试注入；生产勿传假点评 */
  injectedEvidence?: RestaurantEvidenceV1[];
  /** 测试跳过公开检索 */
  skipLive?: boolean;
}): Promise<RestaurantIntelligenceSnapshotV1> {
  let created: RestaurantIntelligenceSnapshotV1 | null = null;

  // 先 live 采集（在 CAS 写之前），避免在同步 mutator 里 await
  const liveExternal = await collectExternalIntelligenceWithLive({
    identity: input.identity,
    profile: null,
    injectedEvidence: input.injectedEvidence,
    category: input.category,
    skipLive: input.skipLive,
  });

  await persistRipStore(
    input.projectId,
    input.ownerId,
    (store, profile) => {
      const current = getCurrentRipSnapshot(store);
      if (
        current &&
        !input.force &&
        (current.status === "pending_confirm" ||
          current.status === "draft" ||
          current.status === "revised")
      ) {
        created = current;
        return store;
      }
      if (current && current.status === "confirmed" && !input.force) {
        created = current;
        return store;
      }

      // 合并 profile 内种子/账本（live 结果已在 injected）
      const external = collectExternalIntelligence({
        identity: input.identity,
        profile,
        injectedEvidence: [
          ...(input.injectedEvidence || []),
          ...liveExternal.evidences,
        ],
      });
      const merged: ExternalCollectResult = {
        ...external,
        degradedNotes: [
          ...liveExternal.degradedNotes,
          ...external.degradedNotes,
        ].slice(0, 8),
        reviewIntelReady:
          external.reviewIntelReady || liveExternal.reviewIntelReady,
        feedbackIntelReady:
          external.feedbackIntelReady || liveExternal.feedbackIntelReady,
        marketScanReady:
          external.marketScanReady || liveExternal.marketScanReady,
      };

      const snapshot = buildRestaurantIntelligenceSnapshot({
        projectId: input.projectId,
        identity: input.identity,
        category: input.category,
        versionLabel: nextVersionLabel(store),
        status: "pending_confirm",
        external: merged,
      });
      created = snapshot;
      return {
        schemaVersion: 1,
        currentSnapshotId: snapshot.snapshotId,
        snapshots: [...store.snapshots, snapshot],
      };
    },
    (profile) => ({
      ...profile,
      nextSuggestedRoute: `/projects/${input.projectId}/restaurant-intelligence`,
    }),
  );

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "经营画像生成失败",
    });
  }
  return created;
}

export type ConfirmRipAction = "confirm" | "revise" | "reject";

export async function confirmRipSnapshot(input: {
  projectId: string;
  ownerId: string;
  snapshotId: string;
  action: ConfirmRipAction;
  revise?: RipRevisePatch;
  /** 确认时可附带自认优势（写入认知差距） */
  founderClaim?: string;
}): Promise<{
  snapshot: RestaurantIntelligenceSnapshotV1;
  redirectTo: string;
  habitSeeded: boolean;
}> {
  let updated: RestaurantIntelligenceSnapshotV1 | null = null;
  let habitSeeded = false;

  await persistRipStore(
    input.projectId,
    input.ownerId,
    (store) => {
      const idx = store.snapshots.findIndex(
        (s) => s.snapshotId === input.snapshotId,
      );
      if (idx < 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "经营画像不存在",
        });
      }
      const current = store.snapshots[idx]!;
      let next = { ...current };

      if (input.action === "confirm") {
        const gap = attachFounderClaim(
          next,
          input.founderClaim || input.revise?.founderClaim,
        );
        next = {
          ...next,
          cognitionGap: gap,
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
        };
      } else if (input.action === "reject") {
        next = {
          ...next,
          status: "rejected",
        };
      } else {
        next = applyRevisePatch(next, input.revise || {});
      }

      const snapshots = [...store.snapshots];
      snapshots[idx] = next;
      updated = next;
      return {
        ...store,
        currentSnapshotId: next.snapshotId,
        snapshots,
      };
    },
    (profile) => {
      if (input.action === "confirm" && updated) {
        const habit = buildHabitSeedFromRip({
          projectId: input.projectId,
          snapshot: updated,
          previous: readHabitFromProfile(profile),
          confirmedAction: "confirm",
        });
        habitSeeded = true;
        return mergeHabitSeedIntoProfile(
          {
            ...profile,
            nextSuggestedRoute: "/dashboard",
          },
          habit,
        );
      }
      if (input.action === "reject") {
        // 不符合 ≠ 跳过：仍引导回画像修正，不得静默进驾驶舱
        return {
          ...profile,
          nextSuggestedRoute: ripPagePath(input.projectId),
        };
      }
      return profile;
    },
  );

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "经营画像确认失败",
    });
  }

  const redirectTo =
    input.action === "confirm"
      ? "/dashboard"
      : ripPagePath(input.projectId);

  return { snapshot: updated, redirectTo, habitSeeded };
}

export function ripPagePath(projectId: string): string {
  return `/projects/${projectId}/restaurant-intelligence`;
}

export const PROFILE_RIP_LAST_DIFF_KEY = "restaurantIntelligenceLastDiff" as const;
/** 当日经营扫描戳（Asia/Shanghai 日切） */
export const PROFILE_RIP_DAILY_SCAN_AT =
  "restaurantIntelligenceDailyScanAt" as const;

/**
 * R4 日更：重采证据 → 新 Snapshot → 差分（不新建 Prisma Decision）
 * 若上一版已确认，新版直接 confirmed，避免每日挡驾驶舱。
 */
export async function refreshRipDaily(input: {
  projectId: string;
  ownerId: string;
  identity: BusinessIdentityV1;
  category?: string;
  injectedEvidence?: RestaurantEvidenceV1[];
  skipLive?: boolean;
}): Promise<{
  snapshot: RestaurantIntelligenceSnapshotV1;
  previous: RestaurantIntelligenceSnapshotV1 | null;
}> {
  let created: RestaurantIntelligenceSnapshotV1 | null = null;
  let previous: RestaurantIntelligenceSnapshotV1 | null = null;

  const liveExternal = await collectExternalIntelligenceWithLive({
    identity: input.identity,
    profile: null,
    injectedEvidence: input.injectedEvidence,
    category: input.category,
    skipLive: input.skipLive,
  });

  await persistRipStore(
    input.projectId,
    input.ownerId,
    (store, profile) => {
      previous = getCurrentRipSnapshot(store);
      const external = collectExternalIntelligence({
        identity: input.identity,
        profile,
        injectedEvidence: [
          ...(input.injectedEvidence || []),
          ...liveExternal.evidences,
        ],
      });
      const merged: ExternalCollectResult = {
        ...external,
        degradedNotes: [
          ...liveExternal.degradedNotes,
          ...external.degradedNotes,
        ].slice(0, 8),
        reviewIntelReady:
          external.reviewIntelReady || liveExternal.reviewIntelReady,
        feedbackIntelReady:
          external.feedbackIntelReady || liveExternal.feedbackIntelReady,
        marketScanReady:
          external.marketScanReady || liveExternal.marketScanReady,
      };
      const inheritConfirmed = previous?.status === "confirmed";
      const snapshot = buildRestaurantIntelligenceSnapshot({
        projectId: input.projectId,
        identity: input.identity,
        category: input.category || previous?.basic.category,
        versionLabel: nextVersionLabel(store),
        status: inheritConfirmed ? "confirmed" : "pending_confirm",
        external: merged,
        founderClaim: previous?.cognitionGap?.founderClaim,
      });
      if (inheritConfirmed) {
        snapshot.confirmedAt = new Date().toISOString();
      }
      created = snapshot;
      return {
        schemaVersion: 1,
        currentSnapshotId: snapshot.snapshotId,
        snapshots: [...store.snapshots, snapshot],
      };
    },
    (profile) => {
      if (!created) return profile;
      const diff = diffRipSnapshots(previous, created);
      return {
        ...profile,
        [PROFILE_RIP_LAST_DIFF_KEY]: diff,
        [PROFILE_RIP_DAILY_SCAN_AT]: new Date().toISOString(),
        nextSuggestedRoute:
          created.status === "pending_confirm"
            ? ripPagePath(input.projectId)
            : "/dashboard",
      };
    },
  );

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "经营画像日更失败",
    });
  }
  return { snapshot: created, previous };
}

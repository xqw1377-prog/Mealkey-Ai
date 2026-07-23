import {
  createMkClient,
  resolveGatewayEnv,
  requireInstalledContext,
  submitIngressGuarded,
  GatewayInstallError,
} from "./gateway-runtime";
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import type { DiagnosisLearning } from "@mealkey/m-ops-diag";
import { runRestaurantDiagnosisSkill } from "./skill";
import { buildContextFromProfile } from "./backend-collectors";
import type {
  RestaurantProfile,
  RestaurantRegistrationInput,
  RestaurantScanPlan,
  PaginatedResult,
  RestaurantFilter,
  BatchOperationResult,
  ExportFormat,
} from "./backend-types";
import {
  appendExternalScanHistory,
  applyRestaurantPatternLibrary,
  getExternalScanHistory,
  getLatestDiagnosisSnapshot,
  getRestaurantProfile,
  getRestaurantScanPlan,
  getRestaurantKnowledgeSummary,
  listDiagnosisCases,
  listDiagnosisLearnings,
  listDiagnosisRuns,
  listRegisteredRestaurantIds,
  listRestaurantProfiles,
  listRestaurantScanPlans,
  persistDiagnosisRun,
  persistEvolvedPatternLibrary,
  updateDiagnosisLearning,
  upsertRestaurantProfile,
  upsertRestaurantScanPlan,
  deleteRestaurantData,
  getRestaurantEvolution,
} from "./diagnosis-persistence";

import { createLogger } from "./logger";

const log = createLogger("backend-service");

// ─── 并发扫描锁 ──────────────────────────────────────────

const scanLocks = new Map<string, Promise<unknown>>();

function withScanLock<T>(restaurantId: string, fn: () => Promise<T>): Promise<T> {
  const existing = scanLocks.get(restaurantId);
  if (existing) {
    log("warn", `扫描已被锁定，跳过并发请求 restaurant=${restaurantId}`);
    return existing as Promise<T>;
  }
  const promise = fn().finally(() => {
    scanLocks.delete(restaurantId);
  });
  scanLocks.set(restaurantId, promise);
  return promise;
}

// ─── 内存缓存 ────────────────────────────────────────────

const cacheStore = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_CACHE_TTL_MS = 30_000; // 30s

function cacheGet<T>(key: string): T | undefined {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_CACHE_TTL_MS) {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function cacheInvalidate(pattern?: string) {
  if (!pattern) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(pattern)) cacheStore.delete(key);
  }
}

// ─── 辅助函数 ────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function nextRunAt(frequency: RestaurantScanPlan["frequency"]) {
  const now = new Date();
  const next = new Date(now);
  if (frequency === "weekly") next.setDate(now.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(now.getMonth() + 1);
  else next.setDate(now.getDate() + 1);
  return next.toISOString();
}

type BackendSyncResult =
  | {
      status: "synced";
      ack: Awaited<ReturnType<typeof submitIngressGuarded>>;
      todayUrl: string;
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      error: string;
    };

async function syncIngressToGateway(input: {
  restaurantId: string;
  ingressItems: ReturnType<typeof runRestaurantDiagnosisSkill>["ingressItems"];
}): Promise<BackendSyncResult> {
  if (!input.ingressItems.length) {
    return { status: "skipped", reason: "no_ingress_items" };
  }

  const env = resolveGatewayEnv();
  if (!env) {
    return { status: "skipped", reason: "gateway_not_configured" };
  }

  try {
    const mk = createMkClient(env);
    const ack = await submitIngressGuarded(mk, {
      restaurantId: input.restaurantId,
      userAccessToken: env.userAccessToken,
      items: input.ingressItems,
      invokeId: `backend-${Date.now()}`,
      horizon: "7d",
      mode: env.mode,
    });
    log("info", `Ingress 同步成功 restaurant=${input.restaurantId} accepted=${ack.accepted.length}`);
    return {
      status: "synced",
      ack,
      todayUrl: mk.handoff.today({ restaurantId: input.restaurantId }),
    };
  } catch (error) {
    if (error instanceof GatewayInstallError) {
      log("error", `Ingress 同步失败（未安装）restaurant=${input.restaurantId}`, error.message);
      return { status: "failed", error: error.message };
    }
    const msg = error instanceof Error ? error.message : String(error);
    log("error", `Ingress 同步异常 restaurant=${input.restaurantId}`, msg);
    return {
      status: "failed",
      error: msg,
    };
  }
}

/**
 * 优先租用 Gateway Context；未安装或未配置时回退本地画像（仅 sandbox）。
 * production 模式未安装直接失败，禁止静默本地冒充生产事实。
 */
async function resolveScanContext(input: {
  restaurantId: string;
  asOf?: string;
  contextOverride?: Partial<ContextPackageV1>;
}): Promise<ContextPackageV1> {
  const local = buildRestaurantContextPackage(input.restaurantId, {
    asOf: input.asOf || nowIso(),
    ...input.contextOverride,
  });

  const env = resolveGatewayEnv();
  if (!env) return local;

  try {
    const mk = createMkClient(env);
    const rented = await requireInstalledContext(mk, {
      restaurantId: input.restaurantId,
      userAccessToken: env.userAccessToken,
      mode: env.mode,
    });
    return {
      ...rented,
      ...input.contextOverride,
      identity: {
        ...rented.identity,
        ...local.identity,
        ...input.contextOverride?.identity,
      },
      facts: [
        ...(rented.facts || []),
        ...(local.facts || []),
        ...(input.contextOverride?.facts || []),
      ],
      evidence: [
        ...(rented.evidence || []),
        ...(input.contextOverride?.evidence || []),
      ],
      asOf: input.asOf || rented.asOf || local.asOf,
    };
  } catch (error) {
    if (env.mode === "production") {
      log("error", `生产模式 Context 租用失败 restaurant=${input.restaurantId}`, error);
      throw error;
    }
    log("warn", `Sandbox Context 回退到本地画像 restaurant=${input.restaurantId}`);
    return local;
  }
}

// ─── 公共 API ────────────────────────────────────────────

export function registerRestaurant(input: RestaurantRegistrationInput) {
  log("info", `注册餐厅 restaurantId=${input.restaurantId} brand=${input.brand}`);
  const profile = upsertRestaurantProfile(input);
  const scanPlan = upsertRestaurantScanPlan({
    restaurantId: input.restaurantId,
    enabled: input.scanPlan?.enabled ?? true,
    frequency: input.scanPlan?.frequency || "daily",
    sources: input.scanPlan?.sources || [
      "dianping",
      "xiaohongshu",
      "douyin",
      "map",
      "manual",
    ],
    nextRun: nextRunAt(input.scanPlan?.frequency || "daily"),
  });
  cacheInvalidate(`restaurants`);
  return { profile, scanPlan };
}

export function buildRestaurantContextPackage(
  restaurantId: string,
  override?: Partial<ContextPackageV1>,
) {
  const profile = getRestaurantProfile(restaurantId);
  if (!profile) {
    throw new Error(`restaurant profile not found: ${restaurantId}`);
  }
  const scanPlan = getRestaurantScanPlan(restaurantId);
  const ctx = buildContextFromProfile({
    profile,
    asOf: override?.asOf || nowIso(),
    sources: scanPlan?.sources,
  });
  return {
    ...ctx,
    ...override,
    identity: {
      ...ctx.identity,
      ...override?.identity,
    },
    facts: [...(ctx.facts || []), ...(override?.facts || [])],
    evidence: [...(ctx.evidence || []), ...(override?.evidence || [])],
  };
}

export async function runRestaurantBackendScan(input: {
  restaurantId: string;
  asOf?: string;
  contextOverride?: Partial<ContextPackageV1>;
  syncToGateway?: boolean;
}) {
  return withScanLock(input.restaurantId, async () => {
    log("info", `开始扫描 restaurant=${input.restaurantId} asOf=${input.asOf || "now"}`);
    const startTime = Date.now();
    const ctx = await resolveScanContext({
      restaurantId: input.restaurantId,
      asOf: input.asOf,
      contextOverride: input.contextOverride,
    });
    const previousSnapshot = getLatestDiagnosisSnapshot(input.restaurantId);
    const previousLearnings = listDiagnosisLearnings(input.restaurantId);
    applyRestaurantPatternLibrary(input.restaurantId);
    const { result, ingressItems } = runRestaurantDiagnosisSkill(ctx, {
      previousSnapshot,
      previousLearnings,
    });
    const runRecord = persistDiagnosisRun({
      restaurantId: input.restaurantId,
      result,
    });
    if (result.externalScan) {
      appendExternalScanHistory(input.restaurantId, result.externalScan);
    }
    upsertRestaurantScanPlan({
      restaurantId: input.restaurantId,
      lastRun: ctx.asOf,
      nextRun: nextRunAt(getRestaurantScanPlan(input.restaurantId)?.frequency || "daily"),
    });
    const sync =
      input.syncToGateway === false
        ? ({ status: "skipped", reason: "disabled_by_request" } as const)
        : await syncIngressToGateway({
            restaurantId: input.restaurantId,
            ingressItems,
          });
    const elapsed = Date.now() - startTime;
    log("info", `扫描完成 restaurant=${input.restaurantId} 耗时=${elapsed}ms signals=${result.signals.length}`);
    cacheInvalidate(`restaurant:${input.restaurantId}`);
    return {
      ctx,
      result,
      ingressItems,
      runRecord,
      sync,
      elapsed,
    };
  });
}

export function listBackendRestaurants(filter?: RestaurantFilter) {
  const ids = new Set([
    ...listRegisteredRestaurantIds(),
    ...listRestaurantProfiles().map((item) => item.restaurantId),
  ]);
  let items = Array.from(ids).map((restaurantId) => ({
    restaurantId,
    profile: getRestaurantProfile(restaurantId),
    scanPlan: getRestaurantScanPlan(restaurantId),
    summary: getRestaurantKnowledgeSummary(restaurantId),
  }));

  // 应用过滤
  if (filter) {
    items = items.filter((item) => {
      if (filter.query) {
        const q = filter.query.toLowerCase();
        const profile = item.profile;
        if (!profile) return false;
        if (
          !profile.brand.toLowerCase().includes(q) &&
          !profile.restaurantId.toLowerCase().includes(q) &&
          !profile.storeName?.toLowerCase().includes(q) &&
          !profile.category?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filter.city && item.profile?.city !== filter.city) return false;
      if (filter.category && item.profile?.category !== filter.category) return false;
      if (filter.stage && item.profile?.stage !== filter.stage) return false;
      if (filter.scanEnabled !== undefined && item.scanPlan?.enabled !== filter.scanEnabled) return false;
      if (filter.hasProfile !== undefined && Boolean(item.profile) !== filter.hasProfile) return false;
      if (filter.tags?.length && item.profile?.tags) {
        if (!filter.tags.some((t) => item.profile!.tags!.includes(t))) return false;
      }
      return true;
    });
  }

  return items;
}

export function listBackendRestaurantsPaginated(
  page = 1,
  pageSize = 20,
  filter?: RestaurantFilter,
): PaginatedResult<ReturnType<typeof listBackendRestaurants>[number]> {
  const all = listBackendRestaurants(filter);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return { items, total, page, pageSize, totalPages };
}

export function searchRestaurants(query: string) {
  if (!query.trim()) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  const items = listBackendRestaurants({ query });
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length || 20,
    totalPages: 1,
  };
}

export interface RestaurantBackendState {
  restaurantId: string;
  profile: RestaurantProfile | undefined;
  scanPlan: RestaurantScanPlan | undefined;
  summary: ReturnType<typeof getRestaurantKnowledgeSummary>;
  evolution: ReturnType<typeof getRestaurantEvolution>;
  runs: ReturnType<typeof listDiagnosisRuns>;
  cases: ReturnType<typeof listDiagnosisCases>;
  learnings: ReturnType<typeof listDiagnosisLearnings>;
  externalScanHistory: ReturnType<typeof getExternalScanHistory>;
}

export function getRestaurantBackendState(restaurantId: string): RestaurantBackendState {
  const cacheKey = `restaurant:${restaurantId}`;
  const cached = cacheGet<RestaurantBackendState>(cacheKey);
  if (cached) return cached;

  const state: RestaurantBackendState = {
    restaurantId,
    profile: getRestaurantProfile(restaurantId),
    scanPlan: getRestaurantScanPlan(restaurantId),
    summary: getRestaurantKnowledgeSummary(restaurantId),
    evolution: getRestaurantEvolution(restaurantId),
    runs: listDiagnosisRuns(restaurantId),
    cases: listDiagnosisCases(restaurantId),
    learnings: listDiagnosisLearnings(restaurantId),
    externalScanHistory: getExternalScanHistory(restaurantId),
  };
  cacheSet(cacheKey, state);
  return state;
}

export function getRestaurantDiagnosisHistory(
  restaurantId: string,
  page = 1,
  pageSize = 20,
): PaginatedResult<unknown> {
  const runs = listDiagnosisRuns(restaurantId);
  const total = runs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = runs
    .slice(start, start + pageSize)
    .map((run) => ({
      runId: run.runId,
      asOf: run.asOf,
      snapshot: run.snapshot,
      signals: run.result.signals?.map((s) => ({
        type: s.type,
        title: s.title,
        severity: s.severity,
        confidence: s.confidence,
      })),
      insights: run.result.insights?.slice(0, 3),
      gaps: run.result.gaps,
    }));
  return { items, total, page, pageSize, totalPages };
}

export function updateRestaurantLearning(input: {
  restaurantId: string;
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  actualOutcome?: string;
  lesson?: string;
}): DiagnosisLearning | undefined {
  const result = updateDiagnosisLearning(input);
  if (result) {
    log("info", `学习记录已更新 restaurant=${input.restaurantId} hypothesis=${input.hypothesis.slice(0, 30)}`);
    const learnings = listDiagnosisLearnings(input.restaurantId);
    persistEvolvedPatternLibrary(learnings);
    cacheInvalidate(`restaurant:${input.restaurantId}`);
  }
  return result;
}

export async function runDueRestaurantScans(): Promise<
  Array<{ restaurantId: string; ok: boolean; error?: string; elapsed?: number }>
> {
  const now = Date.now();
  const plans = listRestaurantScanPlans();
  log("info", `到期扫描检查: 共 ${plans.length} 个计划`);
  const executed: Array<{ restaurantId: string; ok: boolean; error?: string; elapsed?: number }> = [];
  for (const plan of plans) {
    if (!plan.enabled) continue;
    if (plan.nextRun && new Date(plan.nextRun).getTime() > now) continue;
    const startTime = Date.now();
    try {
      await runRestaurantBackendScan({
        restaurantId: plan.restaurantId,
      });
      executed.push({ restaurantId: plan.restaurantId, ok: true, elapsed: Date.now() - startTime });
    } catch (error) {
      executed.push({
        restaurantId: plan.restaurantId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        elapsed: Date.now() - startTime,
      });
    }
  }
  if (executed.length) {
    log("info", `到期扫描完成: ${executed.filter((e) => e.ok).length}/${executed.length} 成功`);
  }
  return executed;
}

export async function batchRunScans(
  restaurantIds: string[],
): Promise<BatchOperationResult> {
  const result: BatchOperationResult = { succeeded: 0, failed: 0, errors: [] };
  for (const id of restaurantIds) {
    try {
      await runRestaurantBackendScan({ restaurantId: id });
      result.succeeded++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  log("info", `批量扫描: ${result.succeeded} 成功, ${result.failed} 失败`);
  return result;
}

export function deleteRestaurant(restaurantId: string): boolean {
  const profile = getRestaurantProfile(restaurantId);
  if (!profile) return false;
  deleteRestaurantData(restaurantId);
  cacheInvalidate(`restaurant:${restaurantId}`);
  cacheInvalidate(`restaurants`);
  log("info", `餐厅已删除 restaurantId=${restaurantId}`);
  return true;
}

export function exportRestaurantData(
  restaurantId: string,
  format: ExportFormat = "json",
): string | undefined {
  const state = getRestaurantBackendState(restaurantId);
  if (!state.profile) return undefined;

  if (format === "csv") {
    return exportToCsv(state);
  }
  return JSON.stringify(state, null, 2);
}

function exportToCsv(state: RestaurantBackendState): string {
  const lines: string[] = [];
  // 基本信息
  lines.push("=== 餐厅基本信息 ===");
  lines.push("字段,值");
  if (state.profile) {
    lines.push(`restaurantId,${state.profile.restaurantId}`);
    lines.push(`brand,${state.profile.brand}`);
    lines.push(`storeName,${state.profile.storeName || ""}`);
    lines.push(`city,${state.profile.city || ""}`);
    lines.push(`category,${state.profile.category || ""}`);
    lines.push(`stage,${state.profile.stage || ""}`);
  }
  // 诊断记录
  lines.push("");
  lines.push("=== 诊断记录 ===");
  lines.push("runId,asOf,signalCount,insightCount");
  for (const run of state.runs) {
    lines.push(
      `${run.runId},${run.asOf},${run.result.signals?.length || 0},${run.result.insights?.length || 0}`,
    );
  }
  // 学习记录
  lines.push("");
  lines.push("=== 学习记录 ===");
  lines.push("diagnosisId,hypothesis,action,actualOutcome,lesson");
  for (const learning of state.learnings) {
    lines.push(
      `"${learning.diagnosisId}","${(learning.hypothesis || "").replace(/"/g, '""')}","${(learning.action || "").replace(/"/g, '""')}","${(learning.actualOutcome || "").replace(/"/g, '""')}","${(learning.lesson || "").replace(/"/g, '""')}"`,
    );
  }
  return lines.join("\n");
}

export interface ScanStats {
  totalRestaurants: number;
  enabledScans: number;
  disabledScans: number;
  dailyScans: number;
  weeklyScans: number;
  monthlyScans: number;
  dueNow: number;
}

export function getScanStats(): ScanStats {
  const cacheKey = "scan-stats";
  const cached = cacheGet<ScanStats>(cacheKey);
  if (cached) return cached;

  const plans = listRestaurantScanPlans();
  const stats: ScanStats = {
    totalRestaurants: listRegisteredRestaurantIds().length,
    enabledScans: plans.filter((p) => p.enabled).length,
    disabledScans: plans.filter((p) => !p.enabled).length,
    dailyScans: plans.filter((p) => p.frequency === "daily").length,
    weeklyScans: plans.filter((p) => p.frequency === "weekly").length,
    monthlyScans: plans.filter((p) => p.frequency === "monthly").length,
    dueNow: plans.filter((p) => {
      if (!p.enabled) return false;
      if (!p.nextRun) return true;
      return new Date(p.nextRun).getTime() <= Date.now();
    }).length,
  };
  cacheSet(cacheKey, stats, 10_000);
  return stats;
}

export function seedSampleRestaurants() {
  const existing = listRestaurantProfiles();
  if (existing.length) {
    log("info", `种子数据已存在，跳过 seeding (已有 ${existing.length} 条)`);
    return existing;
  }
  const samples: RestaurantRegistrationInput[] = [
    {
      restaurantId: "changsha-xiangwei-a",
      brand: "等里长沙",
      storeName: "岳麓店",
      city: "长沙",
      district: "岳麓区",
      category: "炭火湘菜",
      address: "岳麓区麓山南路",
      priceRange: "80",
      stage: "single_store",
      tags: ["炭火", "湘菜", "社区店"],
      manualFacts: [
        { kind: "seat_count", claim: "220㎡ 社区型炭火湘菜馆" },
        { kind: "owner_focus", claim: "老板近期关注晚高峰等待和新客不足" },
      ],
    },
    {
      restaurantId: "changsha-nanmen-b",
      brand: "南门湘菜馆",
      storeName: "南门店",
      city: "长沙",
      district: "天心区",
      category: "湘菜",
      address: "天心区南门口商圈",
      priceRange: "68",
      stage: "growth",
      tags: ["湘菜", "商圈店"],
      manualFacts: [
        { kind: "owner_focus", claim: "老板近期关注复购和服务体验" },
      ],
    },
  ];
  const created = samples.map((item) => registerRestaurant(item).profile);
  log("info", `种子数据创建完成: ${created.length} 条`);
  return created;
}

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type {
  ExternalScanJob,
  RestaurantDiagnosisResult,
  RestaurantEvolutionState,
  SerializablePatternRule,
} from "@mealkey/m-ops-diag";
import {
  advanceDiagnosisCase,
  applyEvolvedPatternLibrary,
  buildEvolutionState,
  enrichLearning,
  evolvePatternLibraryFromLearnings,
  hydratePatternLibrary,
  serializePatternLibrary,
  setPatternLibrary,
} from "@mealkey/m-ops-diag";
import type {
  DiagnosisRepository,
  DiagnosisRunRecord,
} from "./diagnosis-repository";
import type {
  DiagnosisCase,
  DiagnosisLearning,
  RestaurantHealthSnapshot,
} from "@mealkey/m-ops-diag";
import type {
  RestaurantProfile,
  RestaurantScanPlan,
} from "./backend-types";
import { createLogger } from "./logger";

const log = createLogger("diagnosis-store");

type RestaurantDiagnosisStore = {
  version: 2;
  restaurants: Record<
    string,
    {
      latestSnapshot?: RestaurantHealthSnapshot;
      runs: DiagnosisRunRecord[];
      cases: DiagnosisCase[];
      learnings: DiagnosisLearning[];
      evolution?: RestaurantEvolutionState;
      profile?: RestaurantProfile;
      scanPlan?: RestaurantScanPlan;
      externalScanHistory?: ExternalScanJob[];
      /** 每店独立进化的模式库（回填越多，越贴合本店语料） */
      patternLibrary?: SerializablePatternRule[];
    }
  >;
};

const STORE_PATH =
  process.env.M_OPS_DIAG_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".mops-data", "diagnosis-store.json");

const PATTERN_LIBRARY_PATH =
  process.env.M_OPS_PATTERN_LIBRARY_PATH?.trim() ||
  path.join(process.cwd(), ".mops-data", "pattern-library.json");

/** 进程内读写均同步；原子 rename 防止半写损坏 */
function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function emptyStore(): RestaurantDiagnosisStore {
  return {
    version: 2,
    restaurants: {},
  };
}

function loadStore(): RestaurantDiagnosisStore {
  ensureStoreDir();
  if (!existsSync(STORE_PATH)) {
    return emptyStore();
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    if (!raw.trim()) return emptyStore();
    const parsed = JSON.parse(raw) as RestaurantDiagnosisStore;
    if (!parsed || parsed.version !== 2 || typeof parsed.restaurants !== "object") {
      log("error", "存储结构无效，已回退空库（原文件保留）", STORE_PATH);
      return emptyStore();
    }
    return parsed;
  } catch (error) {
    log(
      "error",
      "存储解析失败，已回退空库（原文件保留）",
      error instanceof Error ? error.message : String(error),
    );
    return emptyStore();
  }
}

function saveStoreAtomic(store: RestaurantDiagnosisStore) {
  ensureStoreDir();
  const tmpPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmpPath, STORE_PATH);
}

function saveStore(store: RestaurantDiagnosisStore) {
  saveStoreAtomic(store);
}

function withStoreMutate<T>(fn: (store: RestaurantDiagnosisStore) => T): T {
  const store = loadStore();
  const result = fn(store);
  saveStore(store);
  return result;
}

export function getLatestDiagnosisSnapshot(
  restaurantId: string,
): RestaurantHealthSnapshot | undefined {
  const store = loadStore();
  return store.restaurants[restaurantId]?.latestSnapshot;
}

export function listDiagnosisRuns(restaurantId: string): DiagnosisRunRecord[] {
  const store = loadStore();
  return store.restaurants[restaurantId]?.runs || [];
}

export function listDiagnosisCases(restaurantId: string): DiagnosisCase[] {
  const store = loadStore();
  return store.restaurants[restaurantId]?.cases || [];
}

export function listDiagnosisLearnings(
  restaurantId: string,
): DiagnosisLearning[] {
  const store = loadStore();
  return store.restaurants[restaurantId]?.learnings || [];
}

export function getRestaurantKnowledgeSummary(restaurantId: string) {
  const store = loadStore();
  const bucket = store.restaurants[restaurantId];
  if (!bucket) {
    return {
      restaurantId,
      runCount: 0,
      caseCount: 0,
      learningCount: 0,
      verifiedLearningCount: 0,
      latestSnapshot: undefined,
    };
  }
  const evolution =
    bucket.evolution || buildEvolutionState(bucket.learnings, restaurantId);
  return {
    restaurantId,
    runCount: bucket.runs.length,
    caseCount: bucket.cases.length,
    learningCount: bucket.learnings.length,
    verifiedLearningCount: evolution.verifiedCount,
    evolutionStage: evolution.stage,
    maturityScore: evolution.maturityScore,
    evolutionSummary: evolution.summary,
    latestSnapshot: bucket.latestSnapshot,
  };
}

export function getRestaurantEvolution(
  restaurantId: string,
): RestaurantEvolutionState {
  const store = loadStore();
  const bucket = store.restaurants[restaurantId];
  if (bucket?.evolution) return bucket.evolution;
  return buildEvolutionState(bucket?.learnings || [], restaurantId);
}

function savePatternLibraryFile(rules: SerializablePatternRule[]) {
  ensureStoreDir();
  const tmp = `${PATTERN_LIBRARY_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify({ version: 1, rules }, null, 2), "utf8");
  renameSync(tmp, PATTERN_LIBRARY_PATH);
}

export function loadPersistedPatternLibrary(): boolean {
  if (!existsSync(PATTERN_LIBRARY_PATH)) return false;
  try {
    const raw = readFileSync(PATTERN_LIBRARY_PATH, "utf8");
    const parsed = JSON.parse(raw) as { version?: number; rules?: SerializablePatternRule[] };
    if (!parsed.rules?.length) return false;
    setPatternLibrary(hydratePatternLibrary(parsed.rules));
    log("info", `已加载进化模式库 rules=${parsed.rules.length}`);
    return true;
  } catch (error) {
    log(
      "error",
      `模式库加载失败: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

export function persistEvolvedPatternLibrary(learnings: DiagnosisLearning[]) {
  applyEvolvedPatternLibrary(learnings);
  savePatternLibraryFile(serializePatternLibrary());
}

/** 读取某餐厅的独立模式库（若存在） */
export function loadRestaurantPatternLibrary(
  restaurantId: string,
): SerializablePatternRule[] | undefined {
  const store = loadStore();
  return store.restaurants[restaurantId]?.patternLibrary;
}

/** 写入某餐厅的独立模式库 */
export function saveRestaurantPatternLibrary(
  restaurantId: string,
  rules: SerializablePatternRule[],
) {
  return withStoreMutate((store) => {
    const bucket =
      store.restaurants[restaurantId] ||
      (store.restaurants[restaurantId] = {
        latestSnapshot: undefined,
        runs: [],
        cases: [],
        learnings: [],
      });
    bucket.patternLibrary = rules;
    return rules;
  });
}

/** 供扫描前调用：优先加载本店独立模式库；无则按本店历史学习临时演化（不落盘） */
export function applyRestaurantPatternLibrary(restaurantId: string): boolean {
  const store = loadStore();
  const bucket = store.restaurants[restaurantId];
  if (bucket?.patternLibrary?.length) {
    setPatternLibrary(hydratePatternLibrary(bucket.patternLibrary));
    return true;
  }
  applyEvolvedPatternLibrary(bucket?.learnings || []);
  return false;
}

/** 获取某餐厅模式库（若无独立库，回退为按历史学习演化后的临时结果，仅用于展示，不落盘） */
export function getRestaurantPatternLibrary(
  restaurantId: string,
): SerializablePatternRule[] {
  const store = loadStore();
  const bucket = store.restaurants[restaurantId];
  if (bucket?.patternLibrary?.length) return bucket.patternLibrary;
  return serializePatternLibrary(
    evolvePatternLibraryFromLearnings(bucket?.learnings || []),
  );
}

export function getDiagnosisStorePath() {
  return STORE_PATH;
}

export function getPatternLibraryPath() {
  return PATTERN_LIBRARY_PATH;
}

export function updateDiagnosisLearning(input: {
  restaurantId: string;
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  actualOutcome?: string;
  lesson?: string;
}) {
  return withStoreMutate((store) => {
    const bucket = store.restaurants[input.restaurantId];
    if (!bucket) return undefined;

    const existing = bucket.learnings.find(
      (item) =>
        item.diagnosisId === input.diagnosisId &&
        item.hypothesis === input.hypothesis,
    );
    if (!existing) return undefined;

    existing.action = input.action ?? existing.action;
    existing.actualOutcome = input.actualOutcome ?? existing.actualOutcome;
    existing.lesson = input.lesson ?? existing.lesson;
    const enriched = enrichLearning(existing);
    Object.assign(existing, enriched);

    // 同步 runs 内 draft
    for (const run of bucket.runs) {
      if (!run.learningDraft) continue;
      for (let i = 0; i < run.learningDraft.length; i++) {
        const item = run.learningDraft[i]!;
        if (
          item.diagnosisId === input.diagnosisId &&
          item.hypothesis === input.hypothesis
        ) {
          run.learningDraft[i] = { ...item, ...enriched };
        }
      }
    }

    const hasFeedback = Boolean(existing.actualOutcome || existing.lesson);
    if (hasFeedback) {
      bucket.cases = bucket.cases.map((item) =>
        item.id === input.diagnosisId
          ? advanceDiagnosisCase(item, "LEARNED")
          : item,
      );
      for (const run of bucket.runs) {
        if (run.caseRecord?.id === input.diagnosisId) {
          run.caseRecord = advanceDiagnosisCase(run.caseRecord, "LEARNED");
          if (run.result.caseRecord) {
            run.result.caseRecord = advanceDiagnosisCase(
              run.result.caseRecord,
              "LEARNED",
            );
          }
        }
      }
    }

    bucket.evolution = buildEvolutionState(bucket.learnings, input.restaurantId);

    const base = bucket.patternLibrary?.length
      ? hydratePatternLibrary(bucket.patternLibrary)
      : undefined;
    const evolved = evolvePatternLibraryFromLearnings(bucket.learnings, base);
    bucket.patternLibrary = serializePatternLibrary(evolved);

    return existing;
  });
}


export function persistDiagnosisRun(input: {
  restaurantId: string;
  result: RestaurantDiagnosisResult;
}) {
  return withStoreMutate((store) => {
    const bucket =
      store.restaurants[input.restaurantId] ||
      (store.restaurants[input.restaurantId] = {
        latestSnapshot: undefined,
        runs: [],
        cases: [],
        learnings: [],
      });

    const runRecord: DiagnosisRunRecord = {
      runId: `diag-run-${Date.now()}`,
      restaurantId: input.restaurantId,
      asOf: input.result.asOf || new Date().toISOString(),
      snapshot: input.result.health?.snapshot,
      result: input.result,
      caseRecord: input.result.caseRecord,
      learningDraft: input.result.learningDraft,
    };

    bucket.runs.push(runRecord);
    bucket.latestSnapshot = input.result.health?.snapshot || bucket.latestSnapshot;

    if (input.result.caseRecord) {
      bucket.cases = [
        ...bucket.cases.filter((item) => item.id !== input.result.caseRecord?.id),
        input.result.caseRecord,
      ];
    }

    if (input.result.learningDraft?.length) {
      const incoming = input.result.learningDraft;
      for (const draft of incoming) {
        const idx = bucket.learnings.findIndex(
          (item) =>
            item.diagnosisId === draft.diagnosisId &&
            item.hypothesis === draft.hypothesis,
        );
        if (idx >= 0) {
          const prev = bucket.learnings[idx]!;
          bucket.learnings[idx] = {
            ...prev,
            ...draft,
            action: draft.action ?? prev.action,
            actualOutcome: draft.actualOutcome ?? prev.actualOutcome,
            lesson: draft.lesson ?? prev.lesson,
            polarity: draft.polarity ?? prev.polarity,
            themes: draft.themes ?? prev.themes,
            verifiedAt: draft.verifiedAt ?? prev.verifiedAt,
          };
        } else {
          bucket.learnings.push(draft);
        }
      }
      bucket.evolution = buildEvolutionState(bucket.learnings, input.restaurantId);
    }

    if (input.result.evolution) {
      bucket.evolution = input.result.evolution;
    }

    return runRecord;
  });
}

export function clearDiagnosisStore() {
  saveStore(emptyStore());
}

export function upsertRestaurantProfile(
  input: Omit<RestaurantProfile, "createdAt" | "updatedAt">,
): RestaurantProfile {
  return withStoreMutate((store) => {
    const bucket =
      store.restaurants[input.restaurantId] ||
      (store.restaurants[input.restaurantId] = {
        latestSnapshot: undefined,
        runs: [],
        cases: [],
        learnings: [],
        externalScanHistory: [],
      });
    const now = new Date().toISOString();
    const profile: RestaurantProfile = {
      ...bucket.profile,
      ...input,
      createdAt: bucket.profile?.createdAt || now,
      updatedAt: now,
    };
    bucket.profile = profile;
    return profile;
  });
}

export function getRestaurantProfile(restaurantId: string) {
  const store = loadStore();
  return store.restaurants[restaurantId]?.profile;
}

export function listRestaurantProfiles(): RestaurantProfile[] {
  const store = loadStore();
  return Object.values(store.restaurants)
    .map((item) => item.profile)
    .filter(Boolean) as RestaurantProfile[];
}

export function upsertRestaurantScanPlan(input: {
  restaurantId: string;
  enabled?: boolean;
  frequency?: RestaurantScanPlan["frequency"];
  sources?: RestaurantScanPlan["sources"];
  lastRun?: string;
  nextRun?: string;
}) {
  return withStoreMutate((store) => {
    const bucket =
      store.restaurants[input.restaurantId] ||
      (store.restaurants[input.restaurantId] = {
        latestSnapshot: undefined,
        runs: [],
        cases: [],
        learnings: [],
        externalScanHistory: [],
      });
    const now = new Date().toISOString();
    const plan: RestaurantScanPlan = {
      restaurantId: input.restaurantId,
      enabled: input.enabled ?? bucket.scanPlan?.enabled ?? true,
      frequency: input.frequency || bucket.scanPlan?.frequency || "daily",
      sources:
        input.sources ||
        bucket.scanPlan?.sources || ["dianping", "xiaohongshu", "douyin", "map"],
      lastRun: input.lastRun ?? bucket.scanPlan?.lastRun,
      nextRun: input.nextRun ?? bucket.scanPlan?.nextRun,
      updatedAt: now,
    };
    bucket.scanPlan = plan;
    return plan;
  });
}

export function getRestaurantScanPlan(restaurantId: string) {
  const store = loadStore();
  return store.restaurants[restaurantId]?.scanPlan;
}

export function listRestaurantScanPlans(): RestaurantScanPlan[] {
  const store = loadStore();
  return Object.values(store.restaurants)
    .map((item) => item.scanPlan)
    .filter(Boolean) as RestaurantScanPlan[];
}

export function appendExternalScanHistory(
  restaurantId: string,
  scanJob: ExternalScanJob,
) {
  withStoreMutate((store) => {
    const bucket =
      store.restaurants[restaurantId] ||
      (store.restaurants[restaurantId] = {
        latestSnapshot: undefined,
        runs: [],
        cases: [],
        learnings: [],
        externalScanHistory: [],
      });
    bucket.externalScanHistory = [...(bucket.externalScanHistory || []), scanJob].slice(
      -30,
    );
  });
}

export function getExternalScanHistory(restaurantId: string): ExternalScanJob[] {
  const store = loadStore();
  return store.restaurants[restaurantId]?.externalScanHistory || [];
}

export function listRegisteredRestaurantIds(): string[] {
  const store = loadStore();
  return Object.keys(store.restaurants).filter((restaurantId) => {
    const bucket = store.restaurants[restaurantId];
    return Boolean(bucket?.profile || bucket?.runs.length || bucket?.scanPlan);
  });
}

/** 删除餐厅全部数据 */
export function deleteRestaurantData(restaurantId: string): boolean {
  return withStoreMutate((store) => {
    if (!store.restaurants[restaurantId]) return false;
    delete store.restaurants[restaurantId];
    return true;
  });
}

/** 获取存储统计信息 */
export function getStoreStats() {
  const store = loadStore();
  const restaurantCount = Object.keys(store.restaurants).length;
  let totalRuns = 0;
  let totalCases = 0;
  let totalLearnings = 0;
  for (const bucket of Object.values(store.restaurants)) {
    totalRuns += bucket.runs.length;
    totalCases += bucket.cases.length;
    totalLearnings += bucket.learnings.length;
  }
  return {
    version: store.version,
    restaurantCount,
    totalRuns,
    totalCases,
    totalLearnings,
    storePath: STORE_PATH,
  };
}

/** 存储健康检查 */
export function verifyStoreIntegrity(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8");
      if (raw.trim()) {
        JSON.parse(raw);
      }
    }
    const store = loadStore();
    for (const [id, bucket] of Object.entries(store.restaurants)) {
      if (bucket.profile && bucket.profile.restaurantId !== id) {
        issues.push(`餐厅 ${id}: profile.restaurantId 不匹配`);
      }
      if (bucket.scanPlan && bucket.scanPlan.restaurantId !== id) {
        issues.push(`餐厅 ${id}: scanPlan.restaurantId 不匹配`);
      }
      for (const run of bucket.runs) {
        if (run.restaurantId !== id) {
          issues.push(`餐厅 ${id}: 诊断记录 ${run.runId} restaurantId 不匹配`);
        }
      }
      for (const c of bucket.cases) {
        if (c.restaurantId !== id) {
          issues.push(`餐厅 ${id}: 案例 ${c.id} restaurantId 不匹配`);
        }
      }
    }
    return { ok: issues.length === 0, issues };
  } catch (error) {
    return {
      ok: false,
      issues: [`存储加载失败: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export const nodeDiagnosisRepository: DiagnosisRepository = {
  getLatestSnapshot: getLatestDiagnosisSnapshot,
  listRuns: listDiagnosisRuns,
  listCases: listDiagnosisCases,
  listLearnings: listDiagnosisLearnings,
  getKnowledgeSummary: getRestaurantKnowledgeSummary,
  persistRun: persistDiagnosisRun,
  updateLearning: updateDiagnosisLearning,
  clear: clearDiagnosisStore,
};

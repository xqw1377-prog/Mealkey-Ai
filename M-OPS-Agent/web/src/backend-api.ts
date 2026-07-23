import type { DiagnosisArchiveEntry } from "./archive";
import type { IngressItemV1 } from "@mealkey/agent-sdk/platform";
import type {
  DiagnosisCase,
  DiagnosisLearning,
  RestaurantDiagnosisResult,
  RestaurantHealthSnapshot,
} from "@mealkey/m-ops-diag";

export type BackendRestaurantProfile = {
  restaurantId: string;
  brand: string;
  storeName?: string;
  city?: string;
  district?: string;
  category?: string;
  address?: string;
  priceRange?: string;
  stage?: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendRestaurantSummary = {
  restaurantId: string;
  runCount: number;
  caseCount: number;
  learningCount: number;
  verifiedLearningCount?: number;
  evolutionStage?: string;
  maturityScore?: number;
  evolutionSummary?: string;
  latestSnapshot?: RestaurantHealthSnapshot;
};

export type BackendRestaurantListItem = {
  restaurantId: string;
  profile?: BackendRestaurantProfile;
  summary: BackendRestaurantSummary;
  scanPlan?: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    nextRun?: string;
    lastRun?: string;
  };
};

export type BackendRestaurantState = {
  restaurantId: string;
  profile?: BackendRestaurantProfile;
  summary: BackendRestaurantSummary;
  evolution?: {
    stage: string;
    maturityScore: number;
    verifiedCount: number;
    confirmedCount: number;
    rejectedCount: number;
    summary: string;
    topLessons: string[];
    themeWeights: Array<{ theme: string; weight: number; confirmed: number; rejected: number }>;
  };
  runs: Array<{
    runId: string;
    asOf: string;
    result: RestaurantDiagnosisResult;
    caseRecord?: DiagnosisCase;
    learningDraft?: DiagnosisLearning[];
  }>;
  cases: DiagnosisCase[];
  learnings: DiagnosisLearning[];
  scanPlan?: BackendRestaurantListItem["scanPlan"];
};

export type BackendSyncResult =
  | {
      status: "synced";
      ack: {
        accepted: Array<{ port: string; id: string; projectedTo?: string }>;
        rejected: Array<{ index: number; code: string; message: string }>;
      };
      todayUrl: string;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: Record<string, unknown>;
};

function baseUrl() {
  return (
    (import.meta as { env?: { VITE_BACKEND_URL?: string } }).env?.VITE_BACKEND_URL ||
    "http://localhost:8787"
  ).replace(/\/$/, "");
}

function backendToken() {
  return (
    (import.meta as { env?: { VITE_BACKEND_TOKEN?: string } }).env?.VITE_BACKEND_TOKEN ||
    ""
  ).trim();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = backendToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`backend request failed: ${res.status} (invalid JSON)`);
  }
  if (!res.ok || !json.ok) {
    throw new Error(
      json.error || `backend request failed: ${res.status}${json.code ? ` [${json.code}]` : ""}`,
    );
  }
  return json.data as T;
}

export async function getBackendHealth() {
  return request<{
    service: string;
    uptime: number;
    timestamp: string;
    version: string;
  }>("/health");
}

export async function seedBackendRestaurants() {
  return request<{ seeded: BackendRestaurantProfile[]; count: number }>("/api/seed", {
    method: "POST",
  });
}

export async function listBackendRestaurants() {
  const data = await request<{
    items: BackendRestaurantListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>("/api/restaurants");
  return data.items;
}

export async function getBackendRestaurantState(restaurantId: string) {
  return request<BackendRestaurantState>(
    `/api/restaurants/${encodeURIComponent(restaurantId)}`,
  );
}

export async function registerBackendRestaurant(input: {
  restaurantId: string;
  brand: string;
  storeName?: string;
  city?: string;
  district?: string;
  category?: string;
  address?: string;
  priceRange?: string;
  stage?: string;
  tags?: string[];
  manualFacts?: Array<{ kind: string; claim: string; asOf?: string }>;
  manualEvidence?: Array<{
    id?: string;
    source: string;
    claim: string;
    sentiment?: "positive" | "neutral" | "negative";
    theme?: string;
    observedAt?: string;
  }>;
  scanPlan?: {
    enabled?: boolean;
    frequency?: "daily" | "weekly" | "monthly";
    sources?: Array<"dianping" | "meituan" | "xiaohongshu" | "douyin" | "map" | "manual">;
  };
}) {
  const data = await request<{
    profile: BackendRestaurantProfile;
    scanPlan?: BackendRestaurantListItem["scanPlan"];
  }>("/api/restaurants", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.profile;
}

export async function triggerBackendScan(restaurantId: string, asOf?: string) {
  return request<{
    ctx: unknown;
    result: RestaurantDiagnosisResult;
    ingressItems: IngressItemV1[];
    sync: BackendSyncResult;
  }>(`/api/restaurants/${encodeURIComponent(restaurantId)}/scan`, {
    method: "POST",
    body: JSON.stringify({ asOf, syncToGateway: true }),
  });
}

export async function runDueBackendScans() {
  const data = await request<{
    results: Array<{ restaurantId: string; ok: boolean; error?: string }>;
    count: number;
  }>("/api/scan/run-due", {
    method: "POST",
  });
  return data.results;
}

export async function updateBackendLearning(input: {
  restaurantId: string;
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  actualOutcome?: string;
  lesson?: string;
}) {
  return request<DiagnosisLearning>(
    `/api/restaurants/${encodeURIComponent(input.restaurantId)}/learning`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function backendStateToArchive(
  state: BackendRestaurantState | null | undefined,
): DiagnosisArchiveEntry[] {
  if (!state) return [];
  return state.runs.map((run) => ({
    asOf: run.asOf,
    result: run.result,
  }));
}

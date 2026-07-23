import {
  advanceDiagnosisCase,
  applyEvolvedPatternLibrary,
  buildEvolutionState,
  enrichLearning,
  type DiagnosisCase,
  type DiagnosisLearning,
  type RestaurantDiagnosisResult,
  type RestaurantEvolutionState,
  type RestaurantHealthSnapshot,
} from "@mealkey/m-ops-diag";

export type DiagnosisArchiveEntry = {
  asOf: string;
  result: RestaurantDiagnosisResult;
};

type DiagnosisRunRecord = {
  runId: string;
  restaurantId: string;
  asOf: string;
  snapshot?: RestaurantHealthSnapshot;
  result: RestaurantDiagnosisResult;
  caseRecord?: DiagnosisCase;
  learningDraft?: DiagnosisLearning[];
};

type DiagnosisRepository = {
  getLatestSnapshot(restaurantId: string): RestaurantHealthSnapshot | undefined;
  listRuns(restaurantId: string): DiagnosisRunRecord[];
  listCases(restaurantId: string): DiagnosisCase[];
  listLearnings(restaurantId: string): DiagnosisLearning[];
  getKnowledgeSummary(restaurantId: string): {
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
  getEvolution(restaurantId: string): RestaurantEvolutionState;
  persistRun(input: {
    restaurantId: string;
    result: RestaurantDiagnosisResult;
  }): DiagnosisRunRecord;
  updateLearning(input: {
    restaurantId: string;
    diagnosisId: string;
    hypothesis: string;
    action?: string;
    actualOutcome?: string;
    lesson?: string;
  }): DiagnosisLearning | undefined;
  clear(): void;
};

function archiveKey(restaurantId: string) {
  return `mops-archive:${restaurantId}`;
}

/** 把门店标识压成稳定 id，供本地归档与后端注册共用 */
export function slugifyRestaurant(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || `store-${Date.now()}`;
}

export function loadArchive(restaurantId: string): DiagnosisArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(archiveKey(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiagnosisArchiveEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArchive(restaurantId: string, entries: DiagnosisArchiveEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(archiveKey(restaurantId), JSON.stringify(entries));
}

function toRunRecord(
  restaurantId: string,
  entry: DiagnosisArchiveEntry,
  index: number,
): DiagnosisRunRecord {
  return {
    runId: `browser-run-${index}`,
    restaurantId,
    asOf: entry.asOf,
    snapshot: entry.result.health?.snapshot,
    result: entry.result,
    caseRecord: entry.result.caseRecord,
    learningDraft: entry.result.learningDraft,
  };
}

export const browserDiagnosisRepository: DiagnosisRepository = {
  getLatestSnapshot(restaurantId: string): RestaurantHealthSnapshot | undefined {
    const archive = loadArchive(restaurantId);
    return archive[archive.length - 1]?.result.health?.snapshot;
  },
  listRuns(restaurantId: string): DiagnosisRunRecord[] {
    return loadArchive(restaurantId).map((entry, index) =>
      toRunRecord(restaurantId, entry, index),
    );
  },
  listCases(restaurantId: string): DiagnosisCase[] {
    return loadArchive(restaurantId)
      .map((entry) => entry.result.caseRecord)
      .filter(Boolean) as DiagnosisCase[];
  },
  listLearnings(restaurantId: string): DiagnosisLearning[] {
    return loadArchive(restaurantId).flatMap(
      (entry) => entry.result.learningDraft || [],
    );
  },
  getKnowledgeSummary(restaurantId: string) {
    const archive = loadArchive(restaurantId);
    const learnings = browserDiagnosisRepository.listLearnings(restaurantId);
    const evolution = buildEvolutionState(learnings, restaurantId);
    return {
      restaurantId,
      runCount: archive.length,
      caseCount: archive.filter((entry) => entry.result.caseRecord).length,
      learningCount: archive.reduce(
        (sum, entry) => sum + (entry.result.learningDraft?.length || 0),
        0,
      ),
      verifiedLearningCount: evolution.verifiedCount,
      evolutionStage: evolution.stage,
      maturityScore: evolution.maturityScore,
      evolutionSummary: evolution.summary,
      latestSnapshot: archive[archive.length - 1]?.result.health?.snapshot,
    };
  },
  getEvolution(restaurantId: string) {
    return buildEvolutionState(
      browserDiagnosisRepository.listLearnings(restaurantId),
      restaurantId,
    );
  },
  persistRun(input: {
    restaurantId: string;
    result: RestaurantDiagnosisResult;
  }): DiagnosisRunRecord {
    const archive = loadArchive(input.restaurantId);
    const nextArchive = [
      ...archive,
      {
        asOf: input.result.asOf || new Date().toISOString(),
        result: input.result,
      },
    ].slice(-12);
    saveArchive(input.restaurantId, nextArchive);
    return toRunRecord(
      input.restaurantId,
      nextArchive[nextArchive.length - 1]!,
      nextArchive.length - 1,
    );
  },
  updateLearning(input: {
    restaurantId: string;
    diagnosisId: string;
    hypothesis: string;
    action?: string;
    actualOutcome?: string;
    lesson?: string;
  }) {
    const archive = loadArchive(input.restaurantId);
    let updated: DiagnosisLearning | undefined;

    const nextArchive = archive.map((entry) => {
      const learnings = (entry.result.learningDraft || []).map((item) => {
        if (
          item.diagnosisId === input.diagnosisId &&
          item.hypothesis === input.hypothesis
        ) {
          updated = enrichLearning({
            ...item,
            action: input.action ?? item.action,
            actualOutcome: input.actualOutcome ?? item.actualOutcome,
            lesson: input.lesson ?? item.lesson,
          });
          return updated;
        }
        return item;
      });

      let caseRecord = entry.result.caseRecord;
      if (
        caseRecord &&
        caseRecord.id === input.diagnosisId &&
        updated &&
        (updated.actualOutcome || updated.lesson)
      ) {
        caseRecord = advanceDiagnosisCase(caseRecord, "LEARNED");
      }

      return {
        ...entry,
        result: {
          ...entry.result,
          learningDraft: learnings,
          caseRecord,
        },
      };
    });

    saveArchive(input.restaurantId, nextArchive);
    if (updated) {
      applyEvolvedPatternLibrary(
        browserDiagnosisRepository.listLearnings(input.restaurantId),
      );
    }
    return updated;
  },
  clear() {
    if (typeof window === "undefined") return;
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("mops-archive:"),
    );
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  },
};

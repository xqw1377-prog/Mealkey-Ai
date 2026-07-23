/**
 * Web · 诊断会话轻量门面（从 App 上帝组件拆出的可复用状态骨架）
 * 完整旅程仍由 App.tsx 编排；此 hook 收敛「结果 / 后端档案 / 繁忙」三态。
 */
import { useCallback, useState } from "react";
import type { RestaurantDiagnosisResult } from "@mealkey/m-ops-diag";
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import type {
  BackendRestaurantListItem,
  BackendRestaurantState,
  BackendSyncResult,
} from "../backend-api";
import type { DiagnosisArchiveEntry } from "../archive";
import type { FormState, Step } from "../app-types";
import { DEFAULT_FORM } from "../app-types";
import type { JourneyStage } from "../journey";
import type { IntakePhase } from "../intake";

export type DiagnosisSessionState = {
  step: Step;
  form: FormState;
  intakePhase: IntakePhase;
  result: RestaurantDiagnosisResult | null;
  ctx: ContextPackageV1 | null;
  archive: DiagnosisArchiveEntry[];
  activeTab: JourneyStage;
  busy: boolean;
  backendReady: boolean;
  backendRestaurants: BackendRestaurantListItem[];
  backendState: BackendRestaurantState | null;
  lastSync: BackendSyncResult | null;
};

export function useDiagnosisSession() {
  const [step, setStep] = useState<Step>("onboarding");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [intakePhase, setIntakePhase] = useState<IntakePhase>("identity");
  const [result, setResult] = useState<RestaurantDiagnosisResult | null>(null);
  const [ctx, setCtx] = useState<ContextPackageV1 | null>(null);
  const [archive, setArchive] = useState<DiagnosisArchiveEntry[]>([]);
  const [activeTab, setActiveTab] = useState<JourneyStage>("portrait");
  const [busy, setBusy] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendRestaurants, setBackendRestaurants] = useState<
    BackendRestaurantListItem[]
  >([]);
  const [backendState, setBackendState] = useState<BackendRestaurantState | null>(
    null,
  );
  const [lastSync, setLastSync] = useState<BackendSyncResult | null>(null);

  const journeyStage: JourneyStage =
    step === "onboarding"
      ? "intake"
      : step === "working"
        ? "recognizing"
        : activeTab;

  const resetSession = useCallback(() => {
    setStep("onboarding");
    setForm(DEFAULT_FORM);
    setIntakePhase("identity");
    setResult(null);
    setCtx(null);
    setActiveTab("portrait");
    setBusy(false);
  }, []);

  return {
    step,
    setStep,
    form,
    setForm,
    intakePhase,
    setIntakePhase,
    result,
    setResult,
    ctx,
    setCtx,
    archive,
    setArchive,
    activeTab,
    setActiveTab,
    busy,
    setBusy,
    backendReady,
    setBackendReady,
    backendRestaurants,
    setBackendRestaurants,
    backendState,
    setBackendState,
    lastSync,
    setLastSync,
    journeyStage,
    resetSession,
  };
}

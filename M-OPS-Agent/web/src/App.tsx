import {
  AgentBrandLockup,
  HOST_BRAND,
} from "./brand";
import {
  BRAIN_CTA,
  appDownloadUrl,
  brainUrl,
} from "./shell/os-bridge";
import { useDiagnosisSession } from "./shell/useDiagnosisSession";
import { useEffect, useMemo, useState } from "react";
import {
  createAgentClient,
  type ContextPackageV1,
} from "@mealkey/agent-sdk/platform";
import { runRestaurantDiagnosisSkill } from "@agent/skill";
import {
  applyEvolvedPatternLibrary,
  M_OPS_DIAG_AGENT_ID,
  type RestaurantDiagnosisResult,
} from "@mealkey/m-ops-diag";
import {
  loadArchive,
  browserDiagnosisRepository,
  slugifyRestaurant,
  type DiagnosisArchiveEntry,
} from "./archive";
import {
  backendStateToArchive,
  getBackendHealth,
  getBackendRestaurantState,
  listBackendRestaurants,
  registerBackendRestaurant,
  runDueBackendScans,
  seedBackendRestaurants,
  triggerBackendScan,
  updateBackendLearning,
  type BackendRestaurantListItem,
  type BackendRestaurantState,
  type BackendSyncResult,
} from "./backend-api";
import {
  CasesView,
  LearningView,
  PortraitView,
  TodayScanView,
  VoicesView,
  type VoiceQuote,
} from "./views";
import { DEFAULT_FORM, type FormState, type Step } from "./app-types";
import {
  type IntakePhase,
  buildOwnerEvidence,
  buildOwnerFacts,
  mapFormToRegistration,
  nextIntakePhase,
  prevIntakePhase,
  validateIntakePhase,
} from "./intake";
import { IntakeBrief } from "./IntakeBrief";
import { DEMO_EVIDENCE } from "./demo-evidence";
import {
  clearLastBackendRestaurantId,
  loadLastBackendRestaurantId,
  mergeFormWithProfile,
  saveLastBackendRestaurantId,
  sleep,
} from "./backend-session";
import { dimensionLabel, levelStars } from "./labels";
import { JourneyRail, StickyCta } from "./JourneyChrome";
import type { JourneyStage } from "./journey";
import { CouncilReportView } from "./CouncilReportView";

export function App() {
  const {
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
  } = useDiagnosisSession();
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [workLines, setWorkLines] = useState<
    Array<{ ok: boolean; text: string }>
  >([]);
  const [syncNote, setSyncNote] = useState("");
  const [backendChecking, setBackendChecking] = useState(true);
  const [dueScanNote, setDueScanNote] = useState("");
  const [recentRestaurantId, setRecentRestaurantId] = useState(() =>
    loadLastBackendRestaurantId(),
  );

  const hero = useMemo(() => {
    if (!result) return "";
    const like = result.customerLens?.theyThink?.[0];
    const risk = result.customerLens?.biggestRisk || result.signals[0]?.title;
    if (like && risk) {
      return `顾客认可「${like}」，同时「${risk}」正在成为体验瓶颈。`;
    }
    if (result.findings[0]?.meaning) return result.findings[0].meaning;
    return "已根据现有证据形成初步经营认知；更多公开评价将提升完整度。";
  }, [result]);

  const pulseSummary = useMemo(() => {
    if (!result?.health?.snapshot) return null;
    const dims = result.health.snapshot.dimensions;
    const topRisk = dims
      .filter((item) => item.level === "risk" || item.level === "attention")
      .sort((a, b) => b.confidence - a.confidence)[0];
    const topOpportunity = dims
      .filter((item) => item.dimension === "growth" || item.dimension === "product")
      .sort((a, b) => b.confidence - a.confidence)[0];
    const stable = dims
      .filter(
        (item) =>
          (item.level === "healthy" || item.level === "observe") &&
          item.dimension !== topRisk?.dimension &&
          item.dimension !== topOpportunity?.dimension,
      )
      .sort((a, b) => b.confidence - a.confidence)[0];

    return { topRisk, topOpportunity, stable };
  }, [result]);

  const pulseHealthText = useMemo(() => {
    const topRisk = pulseSummary?.topRisk;
    if (!topRisk) return "稳定";
    return topRisk.level === "risk" ? "注意" : "观察";
  }, [pulseSummary]);

  const knowledgeSummary = useMemo(() => {
    return backendState?.summary
      ? backendState.summary
      : result?.restaurantContext?.restaurantId
      ? browserDiagnosisRepository.getKnowledgeSummary(result.restaurantContext.restaurantId)
      : {
          restaurantId: "",
          runCount: archive.length,
          caseCount: archive.filter((item) => item.result.caseRecord).length,
          learningCount: archive.reduce(
            (sum, item) => sum + (item.result.learningDraft?.length || 0),
            0,
          ),
          verifiedLearningCount: 0,
          latestSnapshot: undefined,
        };
  }, [archive, backendState, result]);

  const profileFacts = useMemo(() => {
    const profile = backendState?.profile;
    return [
      { label: "品牌", value: profile?.brand || form.name },
      { label: "城市", value: profile?.city || form.city },
      { label: "区域", value: profile?.district || form.district || form.address || "待补充" },
      { label: "品类", value: profile?.category || form.category },
      {
        label: "客单",
        value: form.priceRange || profile?.priceRange
          ? `约 ${form.priceRange || profile?.priceRange} 元`
          : "待补充",
      },
      { label: "客群", value: form.mainGuests || "待补充" },
      { label: "当前焦点", value: form.focus },
    ];
  }, [backendState, form]);

  const voiceSummary = useMemo(() => {
    if (!result) return "";
    return (
      result.customerLens?.biggestRisk ||
      result.signals[0]?.observation ||
      "顾客认可你的基础体验，但仍有期待差距值得继续听。"
    );
  }, [result]);

  const completenessStars = useMemo(() => {
    const dims = result?.health?.snapshot?.dimensions || [];
    if (!dims.length) return "★★★☆☆";
    const avg =
      dims.reduce((sum, d) => {
        const map: Record<string, number> = {
          healthy: 5,
          observe: 4,
          attention: 3,
          risk: 2,
          critical: 1,
        };
        return sum + (map[d.level] || 3);
      }, 0) / dims.length;
    if (avg >= 4.5) return "★★★★★";
    if (avg >= 3.5) return "★★★★☆";
    if (avg >= 2.5) return "★★★☆☆";
    if (avg >= 1.5) return "★★☆☆☆";
    return "★☆☆☆☆";
  }, [result]);

  const visibleBackendRestaurants = useMemo(
    () => backendRestaurants.filter((item) => item.profile?.brand),
    [backendRestaurants],
  );

  const recentRestaurant = useMemo(
    () => visibleBackendRestaurants.find((item) => item.restaurantId === recentRestaurantId) || null,
    [visibleBackendRestaurants, recentRestaurantId],
  );

  const shouldHoldOnboarding = step === "onboarding" && backendChecking && !!recentRestaurantId;


  const trendItems = useMemo(() => {
    return archive
      .slice()
      .reverse()
      .slice(0, 5)
      .map((entry, index) => {
        const snapshot = entry.result.health?.snapshot;
        const topSignal = entry.result.signals[0];
        return {
          id: `${entry.asOf}-${index}`,
          asOf: entry.asOf,
          summary: snapshot?.summary || topSignal?.title || "完成一次经营扫描",
          risk: topSignal?.title || entry.result.customerLens?.biggestRisk || "暂无强风险",
          dimension: snapshot?.topRiskDimension,
        };
      });
  }, [archive]);

  const caseItems = useMemo(() => {
    return archive
      .slice()
      .reverse()
      .map((entry) => ({
        id: entry.result.caseRecord?.id || entry.asOf,
        status: entry.result.caseRecord?.status || "DISCOVERED",
        trigger: entry.result.caseRecord?.trigger || entry.result.signals[0]?.title || "initial_scan",
        impactScore:
          entry.result.caseRecord?.impactScore ||
          entry.result.signals[0]?.impactScore ||
          0,
        title: entry.result.signals[0]?.title || entry.result.findings[0]?.observation || "经营异常观察",
        createdAt: entry.asOf,
        observation:
          entry.result.findings[0]?.observation ||
          entry.result.signals[0]?.observation,
        pattern: entry.result.findings[0]?.pattern || entry.result.signals[0]?.pattern,
        meaning: entry.result.findings[0]?.meaning || entry.result.signals[0]?.meaning,
        decisionTopic: entry.result.signals[0]?.decisionTopic,
        evidence: entry.result.signals[0]?.evidence || [],
        observations: (entry.result.evidenceLedger || [])
          .slice(0, 4)
          .map((item) => ({
            statement: item.statement,
            confidence: item.confidence,
          })),
        patterns: (entry.result.patterns || []).slice(0, 4).map((item) => ({
          name: item.name,
          confidence: item.confidence,
        })),
        hypotheses: (entry.result.signals[0]?.hypotheses || []).slice(0, 4).map((item) => ({
          statement: item.statement,
          probability: item.probability,
          validationPlan: item.validationPlan,
        })),
        validations: entry.result.signals[0]?.recommendedValidation || [],
      }))
      .slice(0, 4);
  }, [archive]);

  const learningItems = useMemo(() => {
    return archive
      .slice()
      .reverse()
      .flatMap((entry) =>
        (entry.result.learningDraft || []).map((item, index) => ({
          id: `${entry.asOf}-${index}`,
          diagnosisId: item.diagnosisId,
          hypothesis: item.hypothesis,
          action: item.action,
          expectedOutcome: item.expectedOutcome,
          actualOutcome: item.actualOutcome,
          lesson: item.lesson,
        })),
      )
      .slice(0, 6);
  }, [archive]);

  const evolutionState = useMemo(() => {
    if (backendState?.evolution) return backendState.evolution;
    const restaurantId =
      backendState?.restaurantId ||
      ctx?.restaurantId ||
      result?.restaurantContext?.restaurantId;
    if (!restaurantId) return undefined;
    return browserDiagnosisRepository.getEvolution(restaurantId);
  }, [backendState, ctx, result, archive]);

  const voiceBuckets = useMemo(() => {
    const likes: VoiceQuote[] = [];
    const hesitates: VoiceQuote[] = [];
    const leaves: VoiceQuote[] = [];

    for (const item of ctx?.evidence || []) {
      const quote = { text: item.claim, source: item.source };
      if (item.sentiment === "positive") likes.push(quote);
      else if (item.sentiment === "negative") leaves.push(quote);
      else hesitates.push(quote);
    }

    if (!likes.length && result?.customerLens?.theyThink?.length) {
      likes.push(
        ...result.customerLens.theyThink.slice(0, 3).map((text) => ({
          text,
          source: "经营画像",
        })),
      );
    }
    if (!leaves.length && result?.signals?.length) {
      leaves.push(
        ...result.signals
          .flatMap((item) => item.evidence || [])
          .slice(0, 3)
          .map((item) => ({
            text: item.fact,
            source: item.source,
          })),
      );
    }
    if (!hesitates.length && result?.findings?.length) {
      hesitates.push(
        ...result.findings.slice(0, 2).map((item) => ({
          text: item.pattern,
          source: "诊断观察",
        })),
      );
    }

    return { likes, hesitates, leaves };
  }, [ctx, result]);

  function refreshArchive(restaurantId: string) {
    setArchive(loadArchive(restaurantId));
  }

  useEffect(() => {
    void (async () => {
      setBackendChecking(true);
      try {
        await getBackendHealth();
        setBackendReady(true);
        await seedBackendRestaurants();
        const restaurants = await listBackendRestaurants();
        setBackendRestaurants(restaurants);
        const lastRestaurantId = loadLastBackendRestaurantId();
        setRecentRestaurantId(lastRestaurantId);
        const lastRestaurant = restaurants.find((item) => item.restaurantId === lastRestaurantId);
        if (lastRestaurant?.profile) {
          setForm((prev) => mergeFormWithProfile(prev, lastRestaurant.profile));
        }
        if (lastRestaurantId && restaurants.some((item) => item.restaurantId === lastRestaurantId)) {
          await openBackendRestaurant(lastRestaurantId);
        }
      } catch {
        setBackendReady(false);
      } finally {
        setBackendChecking(false);
      }
    })();
  }, []);

  function applyBackendState(state: BackendRestaurantState) {
    saveLastBackendRestaurantId(state.restaurantId);
    setRecentRestaurantId(state.restaurantId);
    setBackendState(state);
    setArchive(backendStateToArchive(state));
    setResult(state.runs[state.runs.length - 1]?.result || null);
    setCtx({
      restaurantId: state.restaurantId,
      asOf: state.runs[state.runs.length - 1]?.asOf || new Date().toISOString(),
      scopesGranted: ["basic", "review", "market"],
      scopesDenied: [],
      identity: {
        brand: state.profile?.brand,
        storeName: state.profile?.storeName,
        city: state.profile?.city,
        district: state.profile?.district,
        category: state.profile?.category,
      },
      evidence: [],
      facts: [],
    });
    setForm((prev) => mergeFormWithProfile(prev, state.profile));
  }

  async function refreshBackendRestaurants() {
    if (!backendReady) return;
    const restaurants = await listBackendRestaurants();
    setBackendRestaurants(restaurants);
  }

  async function openBackendRestaurant(restaurantId: string) {
    setBusy(true);
    try {
      const state = await getBackendRestaurantState(restaurantId);
      applyBackendState(state);
      setActiveTab("portrait");
      setSyncNote("已从后端经营档案加载最新状态。");
      setStep("portrait");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCurrentRestaurant() {
    const restaurantId = backendState?.restaurantId;
    if (!restaurantId || !backendReady) return;
    setBusy(true);
    try {
      const state = await getBackendRestaurantState(restaurantId);
      applyBackendState(state);
      setSyncNote("已从后端刷新经营档案。");
    } finally {
      setBusy(false);
    }
  }

  async function scanCurrentRestaurant() {
    const restaurantId = backendState?.restaurantId;
    if (!restaurantId || !backendReady) return;
    setBusy(true);
    try {
      const scan = await triggerBackendScan(restaurantId, new Date().toISOString());
      const state = await getBackendRestaurantState(restaurantId);
      applyBackendState(state);
      setLastSync(scan.sync);
      if (scan.sync.status === "synced") {
        setSyncNote(
          `已重新扫描，生成 ${scan.result.signals.length} 条信号，并同步 ${scan.sync.ack.accepted.length} 项到 MealKey。`,
        );
      } else if (scan.sync.status === "failed") {
        setSyncNote(
          `已重新扫描，生成 ${scan.result.signals.length} 条信号；Gateway 同步失败：${scan.sync.error}`,
        );
      } else {
        setSyncNote(
          `已重新扫描，生成 ${scan.result.signals.length} 条信号；本次未同步到 MealKey（${scan.sync.reason}）。`,
        );
      }
      await refreshBackendRestaurants();
    } finally {
      setBusy(false);
    }
  }

  async function runDueScansNow() {
    if (!backendReady) return;
    setBusy(true);
    try {
      const results = await runDueBackendScans();
      const okCount = results.filter((item) => item.ok).length;
      setDueScanNote(`已运行到期扫描 ${results.length} 家，其中成功 ${okCount} 家。`);
      await refreshBackendRestaurants();
      if (backendState?.restaurantId) {
        const state = await getBackendRestaurantState(backendState.restaurantId);
        applyBackendState(state);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleLearningUpdate(input: {
    diagnosisId: string;
    hypothesis: string;
    action?: string;
    actualOutcome?: string;
    lesson?: string;
  }) {
    const restaurantId = backendState?.restaurantId || ctx?.restaurantId;
    if (!restaurantId) return;
    void (async () => {
      if (backendReady && backendState?.restaurantId) {
        await updateBackendLearning({
          restaurantId,
          diagnosisId: input.diagnosisId,
          hypothesis: input.hypothesis,
          action: input.action,
          actualOutcome: input.actualOutcome,
          lesson: input.lesson,
        });
        const state = await getBackendRestaurantState(restaurantId);
        applyBackendState(state);
        return;
      }
      browserDiagnosisRepository.updateLearning({
        restaurantId,
        diagnosisId: input.diagnosisId,
        hypothesis: input.hypothesis,
        action: input.action,
        actualOutcome: input.actualOutcome,
        lesson: input.lesson,
      });
      refreshArchive(restaurantId);
    })();
  }

  function advanceIntake() {
    const err = validateIntakePhase(intakePhase, form);
    if (err) {
      setIntakeError(err);
      return;
    }
    setIntakeError(null);
    const next = nextIntakePhase(intakePhase);
    if (next) {
      setIntakePhase(next);
      return;
    }
    void startDiagnosis();
  }

  function backIntake() {
    setIntakeError(null);
    const prev = prevIntakePhase(intakePhase);
    if (prev) setIntakePhase(prev);
  }

  function resetToIntake() {
    clearLastBackendRestaurantId();
    setRecentRestaurantId("");
    setStep("onboarding");
    setIntakePhase("identity");
    setIntakeError(null);
    setResult(null);
    setBackendState(null);
    setLastSync(null);
    setDueScanNote("");
    setWorkLines([]);
    setArchive([]);
  }

  async function startDiagnosis() {
    const err = validateIntakePhase("focus", form);
    if (err) {
      setIntakePhase("focus");
      setIntakeError(err);
      return;
    }
    setBusy(true);
    setStep("working");
    setWorkLines([]);
    setSyncNote("");
    setIntakeError(null);

    const wants = form.evidenceSources;
    const lines = [
      { ok: true, text: `品牌：${form.name} · ${form.category} · 人均约 ${form.priceRange} 元` },
      {
        ok: true,
        text: `客群：${form.mainGuests || "待补充"} · 高峰：${form.peakScene || "待补充"}`,
      },
      {
        ok: true,
        text: form.knownPain
          ? `老板点名痛点：${form.knownPain.slice(0, 36)}${form.knownPain.length > 36 ? "…" : ""}`
          : `招牌记忆：${form.signature || form.category}`,
      },
      {
        ok: wants.includes("dianping"),
        text: wants.includes("dianping")
          ? "对照点评评价与老板补充"
          : "未选点评源，跳过点评对照",
      },
      {
        ok: wants.includes("xiaohongshu"),
        text: wants.includes("xiaohongshu")
          ? "观察小红书用户印象"
          : "未选小红书，跳过种草对照",
      },
      {
        ok: wants.includes("map"),
        text: wants.includes("map")
          ? "对照周边同类竞争与客单档位"
          : "未选地图源，跳过竞争密度",
      },
      {
        ok: wants.includes("manual"),
        text: wants.includes("manual")
          ? "写入老板补充事实与证据"
          : "未勾选店内事实源",
      },
      { ok: true, text: `正在回答：${form.focus}` },
    ];

    for (const line of lines) {
      await sleep(320);
      setWorkLines((prev) => [...prev, line]);
    }

    const restaurantId = slugifyRestaurant(
      `${form.city}-${form.district}-${form.category}-${form.name}`,
    );
    const registration = mapFormToRegistration(form, restaurantId);
    if (backendReady) {
      await registerBackendRestaurant(registration);
      const scan = await triggerBackendScan(restaurantId, new Date().toISOString());
      const state = await getBackendRestaurantState(restaurantId);
      applyBackendState(state);
      setLastSync(scan.sync);
      setActiveTab("portrait");
      if (scan.sync.status === "synced") {
        setSyncNote(
          `已通过后端完成扫描并写入经营档案，生成 ${scan.result.signals.length} 条重点信号，并同步 ${scan.sync.ack.accepted.length} 项。`,
        );
      } else if (scan.sync.status === "failed") {
        setSyncNote(
          `后端扫描已完成，生成 ${scan.result.signals.length} 条重点信号；Gateway 同步失败：${scan.sync.error}`,
        );
      } else {
        setSyncNote(
          `后端扫描已完成，生成 ${scan.result.signals.length} 条重点信号；未同步到 MealKey（${scan.sync.reason}）。`,
        );
      }
      await refreshBackendRestaurants();
    } else {
      const existingArchive = loadArchive(restaurantId);
      setArchive(existingArchive);
      const previousSnapshot =
        existingArchive[existingArchive.length - 1]?.result.health?.snapshot;
      const previousLearnings =
        browserDiagnosisRepository.listLearnings(restaurantId);
      applyEvolvedPatternLibrary(previousLearnings);

      const packageCtx: ContextPackageV1 = {
        restaurantId,
        asOf: new Date().toISOString(),
        scopesGranted: ["basic", "facts", "review"],
        scopesDenied: ["market"],
        identity: {
          brand: form.name,
          storeName: form.name,
          city: form.city,
          district: form.district,
          category: form.category,
        },
        facts: buildOwnerFacts(form),
        evidence: [...(buildOwnerEvidence(form) ?? []), ...DEMO_EVIDENCE],
      };

      const skill = runRestaurantDiagnosisSkill(packageCtx, {
        previousSnapshot,
        previousLearnings,
      });
      setCtx(packageCtx);
      setResult(skill.result);
      setActiveTab("portrait");
      browserDiagnosisRepository.persistRun({
        restaurantId,
        result: skill.result,
      });
      const nextArchive = loadArchive(restaurantId);
      setArchive(nextArchive);

      try {
        const viteEnv = (import.meta as {
          env?: {
            VITE_MK_AGENT_SECRET?: string;
            VITE_MK_GATEWAY_URL?: string;
            VITE_MK_GATEWAY_MODE?: string;
            VITE_MK_USER_ACCESS_TOKEN?: string;
            VITE_MK_USE_GATEWAY_CONTEXT?: string;
          };
        }).env;
        const mkSecret = viteEnv?.VITE_MK_AGENT_SECRET?.trim();
        if (!mkSecret) {
          setSyncNote("未配置 VITE_MK_AGENT_SECRET，已跳过 Gateway 同步（仅本地诊断）。");
        } else {
        const mode =
          viteEnv?.VITE_MK_GATEWAY_MODE === "production"
            ? "production"
            : "sandbox";
        const mk = createAgentClient({
          agentId: M_OPS_DIAG_AGENT_ID,
          clientSecret: mkSecret,
          baseUrl: viteEnv?.VITE_MK_GATEWAY_URL || "/api",
          env: mode,
        });
        const userAccessToken =
          viteEnv?.VITE_MK_USER_ACCESS_TOKEN || "sandbox";

        if (viteEnv?.VITE_MK_USE_GATEWAY_CONTEXT === "1") {
          const install = await mk.auth.getInstallStatus(
            packageCtx.restaurantId,
            userAccessToken,
          );
          if (!install.installed) {
            setSyncNote(
              "未安装到该餐厅：本地诊断已完成，但禁止租用生产 Context / 写入 Gateway。请先在 MealKey Store 安装。",
            );
          } else {
            const rented = await mk.getRestaurantContext(
              packageCtx.restaurantId,
              {
                scopes: ["basic", "facts", "review", "operation", "market"],
                userAccessToken,
                purpose: "radar",
              },
            );
            const skillFromGateway = runRestaurantDiagnosisSkill(rented, {
              previousSnapshot,
              previousLearnings,
            });
            setCtx(rented);
            setResult(skillFromGateway.result);
            browserDiagnosisRepository.persistRun({
              restaurantId: rented.restaurantId,
              result: skillFromGateway.result,
            });
            if (skillFromGateway.ingressItems.length) {
              if (mode === "production" && !install.installed) {
                setSyncNote("未安装：禁止提交生产 Ingress");
              } else {
                const ack = await mk.submitIngress({
                  restaurantId: rented.restaurantId,
                  invokeId: `web-${Date.now()}`,
                  userAccessToken,
                  horizon: "7d",
                  items: skillFromGateway.ingressItems,
                });
                setSyncNote(
                  ack.accepted.length
                    ? `已同步 ${ack.accepted.length} 条信号到 MealKey Gateway（可回今日查看）`
                    : `Gateway 已响应，但未接受信号（${ack.rejected[0]?.code || "unknown"}）`,
                );
              }
            }
          }
        } else if (skill.ingressItems.length) {
          if (mode === "production") {
            const install = await mk.auth.getInstallStatus(
              packageCtx.restaurantId,
              userAccessToken,
            );
            if (!install.installed) {
              setSyncNote(
                "未安装到该餐厅：本地诊断已完成，禁止提交生产 Ingress。",
              );
            } else {
              const ack = await mk.submitIngress({
                restaurantId: packageCtx.restaurantId,
                invokeId: `web-${Date.now()}`,
                userAccessToken,
                horizon: "7d",
                items: skill.ingressItems,
              });
              setSyncNote(
                ack.accepted.length
                  ? `已同步 ${ack.accepted.length} 条信号到 MealKey Gateway（可回今日查看）`
                  : `Gateway 已响应，但未接受信号（${ack.rejected[0]?.code || "unknown"}）`,
              );
            }
          } else {
            const ack = await mk.submitIngress({
              restaurantId: packageCtx.restaurantId,
              invokeId: `web-${Date.now()}`,
              userAccessToken,
              horizon: "7d",
              items: skill.ingressItems,
            });
            setSyncNote(
              ack.accepted.length
                ? `已同步 ${ack.accepted.length} 条信号到 MealKey Gateway（可回今日查看）`
                : `Gateway 已响应，但未接受信号（${ack.rejected[0]?.code || "unknown"}）`,
            );
          }
        }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setSyncNote(
          msg.includes("未安装") || msg.includes("NOT_INSTALLED")
            ? msg
            : "本地诊断已完成；Gateway 未连接时不会写入今日。启动 MealKey Web 后可自动同步。",
        );
      }
    }

    await sleep(400);
    setStep("portrait");
    setBusy(false);
  }

  const sticky = (() => {
    if (journeyStage === "intake") {
      const isLast = intakePhase === "focus";
      const canBack = !!prevIntakePhase(intakePhase);
      return {
        title: isLast
          ? "简报齐了，再去听外面的声音"
          : "只有老板知道的事补上，体检才有价值",
        primaryLabel: isLast ? "开始认识我的店" : "下一步",
        primaryDisabled: busy,
        onPrimary: () => advanceIntake(),
        secondaryLabel: canBack ? "上一步" : undefined,
        onSecondary: canBack ? () => backIntake() : undefined,
        done: false,
      };
    }
    if (journeyStage === "recognizing") {
      return {
        title: "正在认识你的餐厅——先听过程，再看画像",
        primaryLabel: "认识中…",
        primaryDisabled: true,
        onPrimary: () => undefined,
        done: false,
      };
    }
    if (journeyStage === "portrait") {
      return {
        title: "先停在这一句认识上，再听顾客怎么说",
        primaryLabel: "看看顾客怎么说",
        onPrimary: () => setActiveTab("voices"),
        secondaryLabel: backendReady ? "立即扫描" : undefined,
        onSecondary: backendReady ? () => void scanCurrentRestaurant() : undefined,
        primaryDisabled: busy,
        done: false,
      };
    }
    if (journeyStage === "voices") {
      return {
        title: "听完声音，再看今天发生了什么",
        primaryLabel: "看今日扫描",
        onPrimary: () => setActiveTab("today"),
        primaryDisabled: busy,
        done: false,
      };
    }
    if (journeyStage === "today") {
      return {
        title: "看完今日扫描，出具会审汇总结论",
        primaryLabel: "打开会审报告",
        onPrimary: () => setActiveTab("report"),
        secondaryLabel:
          lastSync?.status === "synced" ? "打开经营大脑 Today" : "进入 MealKey 经营大脑",
        onSecondary: () => {
          const url = brainUrl({
            todayUrl: lastSync?.status === "synced" ? lastSync.todayUrl : null,
          });
          window.open(url, "_blank", "noreferrer");
        },
        done: false,
      };
    }
    if (journeyStage === "report") {
      return {
        title: "会审汇总结论已出具——各方观点可在讨论记录中追溯",
        primaryLabel: "病例与学习",
        onPrimary: () => setActiveTab("deeper"),
        secondaryLabel: "回到经营画像",
        onSecondary: () => setActiveTab("portrait"),
        done: true,
      };
    }
    return {
      title: "回填结果后，系统会越来越懂你的店",
      primaryLabel: "打开会审报告",
      onPrimary: () => setActiveTab("report"),
      secondaryLabel: backendReady ? "再扫一次" : "再认识一家店",
      onSecondary: () => {
        if (backendReady) void scanCurrentRestaurant();
        else {
          resetToIntake();
          setActiveTab("portrait");
        }
      },
      done: true,
    };
  })();

  return (
    <div className="mops-atelier">
      <AgentBrandLockup
        pulse={journeyStage === "report"}
        compact={step === "portrait" || step === "working"}
      />

      <aside className="mk-together-banner mops-rise" aria-label="MealKey 经营大脑">
        <p className="mk-together-title">{BRAIN_CTA.title}</p>
        <p className="mk-together-body">{BRAIN_CTA.body}</p>
        <a
          className="mk-together-link"
          href={brainUrl()}
          target="_blank"
          rel="noreferrer"
        >
          {BRAIN_CTA.primaryLabel}
        </a>
        <a
          className="mk-together-link mk-together-link-secondary"
          href={appDownloadUrl()}
          target="_blank"
          rel="noreferrer"
        >
          {BRAIN_CTA.secondaryLabel}
        </a>
      </aside>

      {syncNote && step === "portrait" ? (
        <p className="sync-whisper mops-rise">{syncNote}</p>
      ) : null}

      <JourneyRail
        current={journeyStage}
        unlocked={step === "portrait" && !!result}
        onSelect={(stage) => {
          if (stage === "intake" || stage === "recognizing") return;
          setActiveTab(stage);
        }}
      />

      <StickyCta
        title={sticky.title}
        primaryLabel={sticky.primaryLabel}
        primaryDisabled={sticky.primaryDisabled}
        onPrimary={sticky.onPrimary}
        secondaryLabel={sticky.secondaryLabel}
        onSecondary={sticky.onSecondary}
        done={sticky.done}
        showArrow={journeyStage !== "recognizing"}
      />

      {step === "onboarding" && shouldHoldOnboarding && (
        <section className="mops-panel mops-rise">
          <p className="eyebrow">恢复档案</p>
          <h2 className="mops-serif-title">正在把你上次打开的店接回来。</h2>
          <p className="muted">先检查后端档案、扫描计划和最近一次经营状态。</p>
        </section>
      )}

      {step === "onboarding" && !shouldHoldOnboarding && (
        <section className="page-stack">
          {recentRestaurant ? (
            <div className="mops-panel mops-rise">
              <div className="recent-restaurant-banner">
                <div>
                  <p className="eyebrow">最近打开</p>
                  <strong>{recentRestaurant.profile?.brand || recentRestaurant.restaurantId}</strong>
                  <p className="muted">
                    {recentRestaurant.profile?.city || "未标注城市"}
                    {recentRestaurant.profile?.district
                      ? ` · ${recentRestaurant.profile.district}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void openBackendRestaurant(recentRestaurant.restaurantId)}
                >
                  继续查看
                </button>
              </div>
            </div>
          ) : null}

          <IntakeBrief
            phase={intakePhase}
            form={form}
            error={intakeError}
            onChange={(next) => {
              setIntakeError(null);
              setForm(next);
            }}
          />

          {backendReady && visibleBackendRestaurants.length > 0 ? (
            <div className="mops-panel mops-rise mops-rise-delay-1">
              <p className="eyebrow">继续已有经营档案</p>
              <div className="restaurant-list">
                {visibleBackendRestaurants.map((item) => (
                  <button
                    key={item.restaurantId}
                    type="button"
                    className="restaurant-row"
                    onClick={() => void openBackendRestaurant(item.restaurantId)}
                  >
                    <div>
                      <strong>{item.profile?.brand || item.restaurantId}</strong>
                      <p className="muted">
                        {item.profile?.city || "未标注城市"}
                        {item.profile?.district ? ` · ${item.profile.district}` : ""}
                      </p>
                    </div>
                    <span className="meta-chip">扫描 {item.summary.runCount}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {step === "working" && (
        <section className="page-stack">
          <div className="mops-panel mops-doc mops-rise">
            <p className="eyebrow">02 · 认识中</p>
            <h2 className="mops-serif-title">正在认识你的餐厅</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              过程本身即价值——诚实勾选，无源不假勾。
            </p>
            <div className="progress-track" style={{ marginTop: 16 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((workLines.length / 8) * 100))}%`,
                }}
              />
            </div>
            <div className="basics-block">
              <p className="eyebrow">已吃进经营简报</p>
              <ul className="checklist">
                <li>
                  <span className="mark-ok">✓</span>
                  <span>
                    {form.name} · {form.category} · {form.city}
                    {form.district} · 人均约 {form.priceRange || "—"} 元
                  </span>
                </li>
                <li>
                  <span className="mark-ok">✓</span>
                  <span>
                    {form.mainGuests || "客群待补"} · {form.peakScene || "高峰待补"}
                    {form.signature ? ` · 记忆点「${form.signature}」` : ""}
                  </span>
                </li>
                <li>
                  <span className="mark-ok">✓</span>
                  <span>这次焦点：{form.focus}</span>
                </li>
              </ul>
            </div>
            <div className="progress-head">
              <div>
                <p className="eyebrow">正在观察外部世界</p>
              </div>
              <span className="meta-chip">识别中</span>
            </div>
            <ul className="checklist">
              {workLines
                .filter((_, i) => i >= 3)
                .map((l, i) => (
                  <li key={i} style={{ animationDelay: `${i * 0.04}s` }}>
                    <span className={l.ok ? "mark-ok" : "mark-gap"}>{l.ok ? "✓" : "!"}</span>
                    <span>{l.text}</span>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      {step === "portrait" && result && ctx && (
        <section className="page-stack stage-panel" key={activeTab}>
          {activeTab === "portrait" && (
            <PortraitView
              name={form.name}
              city={form.city}
              district={form.district}
              category={form.category}
              hero={hero}
              completeness={completenessStars}
              updatedAt={
                backendState?.scanPlan?.lastRun
                  ? new Date(backendState.scanPlan.lastRun).toLocaleString()
                  : undefined
              }
              profileFacts={profileFacts}
              result={result}
              dimensionLabel={dimensionLabel}
              levelStars={levelStars}
            />
          )}

          {activeTab === "voices" && (
            <VoicesView voiceBuckets={voiceBuckets} summary={voiceSummary} />
          )}

          {activeTab === "today" && (
            <TodayScanView
              name={form.name}
              pulseHealthText={pulseHealthText}
              pulseSummary={pulseSummary}
              result={result}
            />
          )}

          {activeTab === "report" && result.consultation ? (
            <CouncilReportView
              report={result.consultation}
              levelStars={levelStars}
            />
          ) : null}

          {activeTab === "report" && !result.consultation ? (
            <div className="mops-panel mops-doc mops-rise">
              <p className="eyebrow">会审报告</p>
              <h2 className="mops-serif-title">会审报告尚未生成</h2>
              <p className="muted">请重新完成一次诊断，以出具四官会审咨询报告。</p>
            </div>
          ) : null}

          {activeTab === "deeper" && (
            <>
              <CasesView trendItems={trendItems} caseItems={caseItems} />
              <LearningView
                learningItems={learningItems}
                evolutionSummary={
                  evolutionState?.summary || knowledgeSummary.evolutionSummary
                }
                maturityScore={
                  evolutionState?.maturityScore ?? knowledgeSummary.maturityScore
                }
                evolutionStage={
                  evolutionState?.stage || knowledgeSummary.evolutionStage
                }
                topLessons={evolutionState?.topLessons}
                onUpdateLearning={handleLearningUpdate}
                onRescan={backendReady ? () => void scanCurrentRestaurant() : undefined}
                rescanBusy={busy}
              />
              {dueScanNote ? <p className="handoff-note">{dueScanNote}</p> : null}
              <div className="mops-panel mops-rise" style={{ marginTop: 14 }}>
                <p className="eyebrow">同步与回跳 · {HOST_BRAND.nameZh}</p>
                <p className="muted">{syncNote || "诊断页不拍板；需要决策时回餐启。"}</p>
                <div className="actions" style={{ marginTop: 12 }}>
                  {backendReady ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => void refreshCurrentRestaurant()}
                      >
                        刷新档案
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => void runDueScansNow()}
                      >
                        运行到期扫描
                      </button>
                    </>
                  ) : null}
                  <a
                    className="btn btn-ghost"
                    href={brainUrl()}
                    style={{ textDecoration: "none" }}
                  >
                    进入经营大脑 / 决策室
                  </a>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

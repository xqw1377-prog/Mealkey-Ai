/**
 * 品牌定位 · 信息收集清单（权威门禁）
 *
 * 三源：
 *  A. fixed     — 基础档案（固定 must）
 *  B. adaptive  — 动态追问（按缺口生成）
 *  C. market_tool — 市场调研工具采集（区域/竞对/用户门店，须联网抓取）
 *
 * 原则：清单未齐 → 不得进入下一步（调研确认 / 顾问会）。
 */
import type { BrandStrategyProject, EvidenceLedger, PrimaryFact } from "./types";
import type { MarketResearchPack } from "./journey-types";
import { isVerifiedPrimaryFact } from "./evidence-ledger-engine";
import { BRAND_BASICS_FIELDS } from "./brand-basics-engine";

export type IntakeSource = "fixed" | "adaptive" | "market_tool";

export type IntakeChecklistItem = {
  id: string;
  label: string;
  source: IntakeSource;
  /** 为何必须有 */
  why: string;
  required: boolean;
  ok: boolean;
  detail: string;
};

export type PositioningIntakeChecklist = {
  items: IntakeChecklistItem[];
  /** Round A+B 齐 → 可开始工具调研 */
  canRunMarketResearch: boolean;
  /** 工具调研充分 → 可确认并开顾问会 */
  canConfirmMarketResearch: boolean;
  missingRequired: string[];
  summary: string;
};

function parseCityHint(region?: string, projectCity?: string): string {
  const r = (region || "").trim();
  if (!r && projectCity) return projectCity;
  const m = r.match(/^([\u4e00-\u9fa5]{2,8}(?:市|州|县|区)?)/);
  if (m?.[1]) return m[1];
  const first = r.split(/[·・/\s,，]/)[0]?.trim();
  return first || projectCity || "";
}

export function resolveResearchCity(
  project: BrandStrategyProject,
  projectCity?: string,
): string {
  const fromBasics = parseCityHint(
    project.assets.brandBasics?.values?.region,
    projectCity,
  );
  if (fromBasics && fromBasics !== "目标城市") return fromBasics;
  if (projectCity && projectCity !== "目标城市") return projectCity;
  return fromBasics || "目标城市";
}

function countLiveSources(pack?: MarketResearchPack | null): {
  total: number;
  region: number;
  competitor: number;
  consumer: number;
} {
  const sources = pack?.sources || [];
  const total = sources.length;
  let region = 0;
  let competitor = 0;
  let consumer = 0;
  for (const s of sources) {
    const q = `${s.query || ""} ${s.title || ""} ${s.snippet || ""}`;
    if (/区域|商圈|城市|市场|消费|客流|人均|gdp|人口/i.test(q)) region += 1;
    if (/竞|对手|品牌|门店|点评|美团|大众/i.test(q)) competitor += 1;
    if (/用户|客人|评价|口碑|需求|场景/i.test(q)) consumer += 1;
  }
  // 若无法从 query 分类，按篇幅均分信号（至少承认有 live）
  if (total > 0 && region + competitor + consumer === 0) {
    region = Math.min(total, 1);
    competitor = Math.min(Math.max(total - 1, 0), 1);
    consumer = Math.min(Math.max(total - 2, 0), 1);
  }
  return { total, region, competitor, consumer };
}

function liveModeOk(pack?: MarketResearchPack | null): boolean {
  if (!pack) return false;
  return (
    pack.collectionMode === "live_crawl" || pack.collectionMode === "hybrid"
  );
}

function factsByStage(
  ledger: EvidenceLedger | undefined,
  stage: PrimaryFact["relatedStage"],
): number {
  return (ledger?.facts || []).filter(
    (f) => f.relatedStage === stage && isVerifiedPrimaryFact(f),
  ).length;
}

function marketToolFacts(ledger: EvidenceLedger | undefined): number {
  return (ledger?.facts || []).filter(
    (f) =>
      isVerifiedPrimaryFact(f) &&
      (f.tags?.includes("market_crawl") ||
        f.tags?.includes("market_tool") ||
        f.sourceType === "competitor_note" ||
        f.sourceType === "store_observation"),
  ).length;
}

/**
 * 评估定位模块信息收集清单。
 */
export function evaluatePositioningIntakeChecklist(
  project: BrandStrategyProject,
): PositioningIntakeChecklist {
  const basics = project.assets.brandBasics;
  const followups = project.assets.adaptiveFollowups;
  const brief = project.assets.brandBrief;
  const pack = project.assets.journey?.marketResearch;
  const ledger = project.assets.evidenceLedger;
  const items: IntakeChecklistItem[] = [];

  // —— A. 固定基础档案 ——
  for (const field of BRAND_BASICS_FIELDS.filter((f) => f.requirement === "must")) {
    const val = (basics?.values?.[field.key] || "").trim();
    const ok = Boolean(basics?.status === "complete"
      ? !basics.missingMust.includes(field.key)
      : val.length >= field.minLength && val !== "无" && val !== "没有");
    items.push({
      id: `fixed.${field.key}`,
      label: `基础档案 · ${field.label}`,
      source: "fixed",
      why: "定位差异化依赖真实经营事实，不能用默认值代替。",
      required: true,
      ok,
      detail: ok ? "已采集" : `未采集：${field.prompt}`,
    });
  }

  // —— B. 动态追问 ——
  const mustFollowups = followups?.questions.filter((q) => q.priority === "must") || [];
  if (!followups || mustFollowups.length === 0) {
    items.push({
      id: "adaptive.session",
      label: "动态追问会话",
      source: "adaptive",
      why: "基础档案收齐后，须按缺口生成定位专属追问。",
      required: true,
      ok: Boolean(brief?.status === "complete"),
      detail: brief?.status === "complete"
        ? "简报已编译（历史路径）"
        : "尚未生成自适应追问",
    });
  } else {
    for (const q of mustFollowups) {
      const answered = Boolean(followups.answers[q.id]?.trim());
      items.push({
        id: `adaptive.${q.id}`,
        label: `动态追问 · ${q.prompt.slice(0, 28)}${q.prompt.length > 28 ? "…" : ""}`,
        source: "adaptive",
        why: q.whyNeeded,
        required: true,
        ok: answered,
        detail: answered ? "已答" : "待答",
      });
    }
  }

  items.push({
    id: "adaptive.brief_compiled",
    label: "品牌简报已编译（无假默认）",
    source: "adaptive",
    why: "简报是调研 scope 与后续分析的合同输入。",
    required: true,
    ok: brief?.status === "complete",
    detail:
      brief?.status === "complete"
        ? "complete"
        : `draft，缺口：${(brief?.gaps || []).slice(0, 4).join("、") || "未编译"}`,
  });

  // —— C. 市场调研工具采集（三柱） ——
  const live = countLiveSources(pack);
  const modeOk = liveModeOk(pack);
  const pillars = pack?.pillarCoverage?.pillars;
  const pillarOk = (id: "region" | "competitor" | "store_user") =>
    pillars?.find((p) => p.id === id)?.ok === true;

  // 有 pillarCoverage 时以三柱评估为准，禁止用弱 OR 绕过；无支柱时才回退启发式
  const hasPillars = Boolean(pillars && pillars.length > 0);

  items.push({
    id: "market.region_live",
    label: "区域市场分析（工具抓取）",
    source: "market_tool",
    why: "区域供需、客流与品类格局只能来自外部数据，不能靠模型编造。",
    required: true,
    ok: hasPillars
      ? pillarOk("region")
      : modeOk && live.total >= 3 && (live.region >= 1 || live.total >= 5),
    detail: !pack
      ? "尚未运行联网调研"
      : pillars?.find((p) => p.id === "region")?.detail ||
        (!modeOk
          ? `当前模式 ${pack.collectionMode || "unknown"}（须 live_crawl / hybrid）`
          : `来源 ${live.total} 条 · 区域信号 ${live.region}`),
  });

  items.push({
    id: "market.competitor_live",
    label: "竞对分析（工具抓取）",
    source: "market_tool",
    why: "对手心智与证据句须有可追溯 URL/snippet，禁止「周边同类馆」占位。",
    required: true,
    ok: hasPillars
      ? pillarOk("competitor")
      : modeOk &&
        live.total >= 3 &&
        ((pack?.competitorBriefs || []).some(
          (c) =>
            c.dataQuality === "live" ||
            c.dataQuality === "store_visit",
        ) ||
          live.competitor >= 1),
    detail: !pack
      ? "尚未运行联网调研"
      : pillars?.find((p) => p.id === "competitor")?.detail ||
        `竞对条目 ${(pack.competitorBriefs || []).length} · 竞对信号 ${live.competitor}`,
  });

  items.push({
    id: "market.consumer_store",
    label: "用户/门店侧信号（抓取或店访）",
    source: "market_tool",
    why: "用户场景与门店观察支撑洞察；纯推断不得确认调研。",
    required: true,
    ok: hasPillars
      ? pillarOk("store_user")
      : modeOk &&
        (live.consumer >= 1 ||
          factsByStage(ledger, "CONSUMER_INSIGHT") >= 1 ||
          (pack?.storeVisitPlan?.tasks || []).some((t) => t.status === "filled")),
    detail: !pack
      ? "尚未运行联网调研"
      : pillars?.find((p) => p.id === "store_user")?.detail ||
        (live.consumer >= 1
          ? `用户侧来源信号 ${live.consumer}`
          : (pack.storeVisitPlan?.tasks || []).some((t) => t.status === "filled")
            ? "已有店访回填"
            : factsByStage(ledger, "CONSUMER_INSIGHT") >= 1
              ? "账本已有用户侧核实事实"
              : "缺用户/门店侧可追溯信号（可店访补）"),
  });

  items.push({
    id: "market.ledger_seeded",
    label: "调研结果已写入证据账本",
    source: "market_tool",
    why: "顾问会与定位合同只能引用账本事实，不能引用「看起来像调研」的草稿。",
    required: true,
    ok: marketToolFacts(ledger) >= 2,
    detail:
      marketToolFacts(ledger) >= 2
        ? `工具/观察类核实事实 ${marketToolFacts(ledger)} 条`
        : "请先成功运行联网调研（系统会自动写入）或补店访",
  });

  const missingRequired = items
    .filter((i) => i.required && !i.ok)
    .map((i) => i.label);

  const fixedOk = items
    .filter((i) => i.source === "fixed" && i.required)
    .every((i) => i.ok);
  const adaptiveOk = items
    .filter((i) => i.source === "adaptive" && i.required)
    .every((i) => i.ok);
  const marketOk = items
    .filter((i) => i.source === "market_tool" && i.required)
    .every((i) => i.ok);

  const canRunMarketResearch = fixedOk && adaptiveOk;
  const canConfirmMarketResearch = canRunMarketResearch && marketOk;

  const summary = canConfirmMarketResearch
    ? "信息收集清单已齐，可确认调研并进入顾问会。"
    : `信息未齐，仍缺 ${missingRequired.length} 项：${missingRequired.slice(0, 3).join("；")}${
        missingRequired.length > 3 ? "…" : ""
      }`;

  return {
    items,
    canRunMarketResearch,
    canConfirmMarketResearch,
    missingRequired,
    summary,
  };
}

export function assertCanRunMarketResearch(project: BrandStrategyProject): void {
  const c = evaluatePositioningIntakeChecklist(project);
  if (!c.canRunMarketResearch) {
    const miss = c.items
      .filter(
        (i) =>
          i.required &&
          !i.ok &&
          (i.source === "fixed" || i.source === "adaptive"),
      )
      .map((i) => i.label)
      .slice(0, 6);
    throw new Error(
      `信息采集未完成，不能开始市场调研。仍缺：${miss.join("、")}`,
    );
  }
}

export function assertCanConfirmMarketResearch(
  project: BrandStrategyProject,
): void {
  const c = evaluatePositioningIntakeChecklist(project);
  if (!c.canConfirmMarketResearch) {
    const miss = c.items
      .filter((i) => i.required && !i.ok)
      .map((i) => i.label)
      .slice(0, 8);
    throw new Error(
      `信息收集清单未齐，不能确认调研/开顾问会。仍缺：${miss.join("、")}`,
    );
  }
}

/**
 * 将联网调研来源写入证据账本（verified + market_crawl）。
 */
export function seedFactsFromMarketResearchPack(
  ledger: EvidenceLedger | undefined,
  pack: MarketResearchPack,
  addFact: (
    ledger: EvidenceLedger | undefined,
    input: {
      claim: string;
      sourceType:
        | "founder_interview"
        | "customer_quote"
        | "store_observation"
        | "sales_note"
        | "competitor_note"
        | "other";
      relatedStage:
        | "DISCOVERY"
        | "BRAND_BRIEF"
        | "CATEGORY_ANALYSIS"
        | "CONSUMER_INSIGHT"
        | "COMPETITIVE_MAPPING"
        | "POSITIONING_DESIGN";
      strength?: "strong" | "moderate" | "weak";
      tags?: string[];
      verificationStatus?: "unverified" | "verified";
    },
  ) => EvidenceLedger,
): EvidenceLedger {
  let next = ledger;
  const tags = ["market_crawl", "market_tool"];
  const city = pack.scope?.city || "";
  const sources = pack.sources || [];

  const regionish = sources.filter((s) =>
    /区域|商圈|城市|市场|格局|消费|客流/i.test(
      `${s.query || ""} ${s.title || ""}`,
    ),
  );
  const rivalish = sources.filter((s) =>
    /竞|对手|点评|美团|门店|品牌/i.test(`${s.query || ""} ${s.title || ""}`),
  );
  const userish = sources.filter((s) =>
    /用户|客人|评价|口碑|需求|场景/i.test(`${s.query || ""} ${s.title || ""}`),
  );

  const pick = (arr: typeof sources, fallback: typeof sources) =>
    (arr.length ? arr : fallback).slice(0, 2);

  for (const s of pick(regionish, sources)) {
    const claim =
      `【联网·区域】${city}${s.title || "市场信号"}：${(s.snippet || "").slice(0, 120)}`.trim();
    if (claim.length >= 8) {
      next = addFact(next, {
        claim,
        sourceType: "store_observation",
        relatedStage: "CATEGORY_ANALYSIS",
        strength: "moderate",
        tags,
        verificationStatus: "verified",
      });
    }
  }

  for (const s of pick(rivalish, sources.slice(1))) {
    const claim =
      `【联网·竞对】${(s.title || "竞品信号").slice(0, 40)}：${(s.snippet || "").slice(0, 120)}`.trim();
    if (claim.length >= 8) {
      next = addFact(next, {
        claim,
        sourceType: "competitor_note",
        relatedStage: "COMPETITIVE_MAPPING",
        strength: "moderate",
        tags,
        verificationStatus: "verified",
      });
    }
  }

  for (const s of pick(userish, sources.slice(2))) {
    const claim =
      `【联网·用户】${(s.title || "用户信号").slice(0, 40)}：${(s.snippet || "").slice(0, 120)}`.trim();
    if (claim.length >= 8) {
      next = addFact(next, {
        claim,
        sourceType: "customer_quote",
        relatedStage: "CONSUMER_INSIGHT",
        strength: "moderate",
        tags,
        verificationStatus: "verified",
      });
    }
  }

  // 竞对三联中有 live 证据句时补一条
  for (const c of (pack.competitorBriefs || []).slice(0, 3)) {
    if (
      c.evidenceSentence &&
      (c.dataQuality === "live" || c.dataQuality === "hybrid")
    ) {
      next = addFact(next, {
        claim: `【联网·竞对心智】${c.name}：${c.evidenceSentence}`.slice(0, 200),
        sourceType: "competitor_note",
        relatedStage: "COMPETITIVE_MAPPING",
        strength: "moderate",
        tags,
        verificationStatus: "verified",
      });
    }
  }

  return next || {
    ledgerId: `led_empty_${Date.now().toString(36)}`,
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

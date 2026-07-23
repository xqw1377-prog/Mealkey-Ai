import type {
  ConsultationReport,
  DiagnosisGap,
  DiagnosisSignal,
  ExamScorecardRow,
  ExpertOpinion,
  ExpertRole,
  HealthLevel,
  ReportModule,
  RestaurantDiagnosisRequest,
  RestaurantExamReport,
  RestaurantHealthModelResult,
} from "../contracts";
import { assessDataReadiness } from "../data-catalog";
import type { RestaurantContextRecord } from "../knowledge";
import {
  stageLabel,
  type RestaurantEvolutionState,
} from "../reasoning/evolution";
import {
  runExperienceOfficer,
  runFinanceOfficer,
  runMarketingOfficer,
  runProductOfficer,
  type ExpertCapabilityResult,
} from "./expert-capabilities";

const LEVEL_RANK: Record<HealthLevel, number> = {
  healthy: 0,
  observe: 1,
  attention: 2,
  risk: 3,
  critical: 4,
};

function worse(a: HealthLevel, b: HealthLevel): HealthLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

function levelLabel(level: HealthLevel): string {
  const map: Record<HealthLevel, string> = {
    healthy: "稳定",
    observe: "观察",
    attention: "关注",
    risk: "风险",
    critical: "危急",
  };
  return map[level];
}

/** 规则模板：老板可读的一句话主因（无 LLM） */
export function buildBossBrief(input: {
  restaurantName: string;
  overallLevel: HealthLevel;
  consensus: string;
  priorities: string[];
  causalLines?: string[];
}): string {
  const rawCause =
    (input.causalLines || []).find((l) => l.startsWith("主因链")) ||
    (input.consensus.includes("主因链")
      ? input.consensus.replace(/^汇总结论[^：]*：\s*/, "")
      : input.consensus);
  // 只取箭头链本体，丢掉尾部行动句，避免与「建议先做」重复
  let causeShort = rawCause
    .replace(/^主因链：/, "")
    .replace(/（[^）]*）/g, "")
    .split(/。|；/)[0] || rawCause;
  causeShort = causeShort.replace(/\s+/g, "").slice(0, 56);

  const causeKey = causeShort.replace(/[←→\s]/g, "").slice(0, 10);
  const nextCandidate =
    input.priorities.find((p) => {
      const compact = p.replace(/[←→\s]/g, "");
      return !compact.includes(causeKey) && !p.startsWith("验证/处置");
    }) ||
    input.priorities.find((p) => !p.startsWith("验证/处置")) ||
    "按行动清单逐项验证并回填学习";
  const next = nextCandidate
    .replace(/^DNA 加权（[^）]*）：/, "")
    .replace(/（盯 #[^）]+）/g, "")
    .slice(0, 42);

  return `${input.restaurantName}本轮判定「${levelLabel(input.overallLevel)}」。主因：${causeShort}。建议先做：${next}。`;
}

function toOpinion(result: ExpertCapabilityResult): ExpertOpinion {
  return {
    role: result.role,
    title: result.title,
    seat: result.seat,
    level: result.level,
    capabilities: result.capabilities,
    verdict: result.verdict,
    analyses: result.analyses,
    observations: result.observations,
    risks: result.risks,
    counsel: result.counsel,
    confidence: result.confidence,
    refused: result.refused,
    refuseReason: result.refuseReason,
    signals: result.signals,
  };
}

function ownerForAxis(axis: string): ExpertRole {
  if (axis === "business") return "finance";
  if (axis === "experience" || axis === "operations") return "experience";
  return "marketing";
}

function hasSignal(experts: ExpertOpinion[], id: string) {
  return experts.some((e) => e.signals?.some((s) => s.id === id));
}

function signalStatement(experts: ExpertOpinion[], id: string) {
  for (const e of experts) {
    const hit = e.signals?.find((s) => s.id === id);
    if (hit) return hit.statement;
  }
  return "";
}

/** 跨官因果合成：把分散观点收成可验证的主因链 */
function synthesizeCausalFindings(
  experts: ExpertOpinion[],
  signals?: DiagnosisSignal[],
): string[] {
  const chains: string[] = [];
  const finance = experts.find((e) => e.role === "finance");
  const marketing = experts.find((e) => e.role === "marketing");

  if (hasSignal(experts, "rev_down") && hasSignal(experts, "traffic_down")) {
    if (hasSignal(experts, "peak_wait_injury")) {
      chains.push(
        `主因链：营收承压 ← 客流下行 ← 高峰等待伤客（${signalStatement(experts, "peak_wait_injury")}）。优先止血体验，再谈投放。`,
      );
    } else if (hasSignal(experts, "positioning_mismatch")) {
      chains.push(
        "主因链：营收/客流承压 ← 定位叙事与真实最旺餐段错配。先对齐场次与话术，再扩投放。",
      );
    } else {
      chains.push(
        `主因链：营收承压与客流下行同向（${signalStatement(experts, "rev_down")}）。需用营收分解确认是否客流主导。`,
      );
    }
  } else if (hasSignal(experts, "rev_down")) {
    const decomp = finance?.analyses.find((a) => a.metricId === "rev_decomposition");
    if (decomp?.value.includes("客单主导")) {
      chains.push(
        `主因链：营收变动偏客单主导${hasSignal(experts, "low_margin_hero") ? "，且存在高流水低毛利菜" : ""}。优先复盘菜单结构/定价，而非盲目拉新。`,
      );
    } else if (decomp?.value.includes("客流主导")) {
      chains.push("主因链：营收变动偏客流主导。优先查获客、复购与高峰体验。");
    } else {
      chains.push(`指标→因果：营收承压（${signalStatement(experts, "rev_down")}），驱动尚未收敛，下一步补足分解样本。`);
    }
  }

  if (hasSignal(experts, "low_margin_hero") && hasSignal(experts, "thin_margin")) {
    chains.push(
      "主因链：利润偏紧 ← 头部菜高流水低毛利。改造 A 类现金流菜的配方/份量/搭售。",
    );
  }

  if (hasSignal(experts, "price_value_gap") && hasSignal(experts, "rev_down")) {
    const ticketLed = finance?.analyses
      .find((a) => a.metricId === "rev_decomposition")
      ?.value.includes("客单主导");
    if (ticketLed) {
      chains.push("主因链：客单承压与价格不值感同现，调价需谨慎，优先调结构与预期管理。");
    }
  }

  if (hasSignal(experts, "narrow_a")) {
    chains.push(
      `结构风险：${signalStatement(experts, "narrow_a")} — A 类过窄会放大断货与出品波动对营收的冲击。`,
    );
  }

  // 冲突：不直接 worse 抹平，写入争议
  const financeOk =
    finance &&
    !finance.refused &&
    (finance.level === "healthy" || finance.level === "observe");
  const experience = experts.find((e) => e.role === "experience");
  if (
    financeOk &&
    experience &&
    !experience.refused &&
    (experience.level === "risk" || experience.level === "critical")
  ) {
    chains.push(
      "争议：财务读数尚可，但体验侧已偏风险——短期账好看可能掩盖客诉/等待对复购的滞后损伤，需对照高峰日明细验证。",
    );
  }

  if (hasSignal(experts, "traffic_down") && !hasSignal(experts, "rev_down")) {
    chains.push(
      "争议：客流下行但营收未同向承压——可能靠客单撑盘；需验证是否可持续，避免虚假安全感。",
    );
  }

  if (hasSignal(experts, "meal_concentration")) {
    chains.push(
      `结构风险：${signalStatement(experts, "meal_concentration")} — 单餐段扛主营收，一旦该场次客流或体验波动，整体营收会被放大冲击。建议优先扶持第二餐段。`,
    );
  }

  const buzzVsTraffic = marketing?.analyses.find((a) => a.metricId === "buzz_vs_traffic");
  if (buzzVsTraffic?.note?.includes("虚火")) {
    chains.push(
      `主因链：营销「虚火」——${buzzVsTraffic.value}。内容声量未转化为到店客流，扩投放前需先补到店转化闭环。`,
    );
  }

  const financeGap = hasSignal(experts, "finance_data_gap");
  const productGap = hasSignal(experts, "product_data_gap");
  if (financeGap || productGap) {
    const gapWhich = [financeGap ? "财务" : null, productGap ? "产品" : null]
      .filter(Boolean)
      .join("与");
    chains.push(
      `数据级联：${gapWhich}硬门槛缺失会连带削弱营销/体验判断的经营锚点（无法对照真实营收/结构）。建议先补齐日×餐段与菜品销售，再复核其余席位结论。`,
    );
  }

  const competitionSignal = signals?.find(
    (s) => s.category === "competition" || s.type === "COMPETITION",
  );
  if (competitionSignal && hasSignal(experts, "traffic_down")) {
    chains.push(
      `主因链：客流下行与竞争信号并现（${competitionSignal.title}）——需要分清是市场分流还是自身体验/定位问题，避免误判为自身独有问题。`,
    );
  }

  if (!chains.length) {
    const active = experts.filter((e) => !e.refused);
    if (active.every((e) => e.level === "healthy" || e.level === "observe")) {
      chains.push("交叉验证：财务/产品/营销/体验暂未形成同向风险链；维持月度指标复检。");
    } else {
      chains.push("交叉验证：各席有局部警示，但尚未收敛为单一主因；按行动优先级并行验证。");
    }
  }

  const lowConf = experts.filter((e) => !e.refused && e.confidence < 0.45);
  if (lowConf.length) {
    chains.push(
      `置信提示：${lowConf.map((e) => `${e.title} ${(e.confidence * 100).toFixed(0)}%`).join("、")} 样本偏弱，结论宜降权。`,
    );
  }

  return chains;
}

/** 把四官分析收成一份汇总结论（报告正文） */
function buildUnifiedFindings(
  experts: ExpertOpinion[],
  signals?: DiagnosisSignal[],
): {
  summary: string;
  bullets: string[];
} {
  const refused = experts.filter((e) => e.refused);
  const causal = synthesizeCausalFindings(experts, signals);
  const active = experts.filter((e) => !e.refused);

  const keyMetrics: string[] = [];
  for (const expert of active) {
    for (const cell of expert.analyses.filter((a) => a.metricId).slice(0, 2)) {
      keyMetrics.push(
        `[${expert.title}] ${cell.label}：${cell.value}${cell.metricId ? `（#${cell.metricId}）` : ""}`,
      );
    }
  }

  return {
    summary: causal[0] || "综合体检已完成交叉验证。",
    bullets: [
      ...causal,
      ...keyMetrics.slice(0, 6),
      ...(refused.length
        ? refused.map((e) => `${e.title}拒签：${e.refuseReason || "数据不足"}`)
        : []),
    ],
  };
}

function buildUnifiedConclusion(input: {
  overallLevel: HealthLevel;
  experts: ExpertOpinion[];
  alertExperts: ExpertOpinion[];
  refused: ExpertOpinion[];
  customerRisk?: string;
  signals?: DiagnosisSignal[];
}): { summary: string; bullets: string[] } {
  const causal = synthesizeCausalFindings(input.experts, input.signals);
  const counsel = Array.from(
    new Set(
      input.experts
        .filter((e) => !e.refused)
        .sort((a, b) => b.confidence - a.confidence)
        .flatMap((e) => e.counsel.slice(0, 1)),
    ),
  ).slice(0, 4);

  const avgConf =
    input.experts.filter((e) => !e.refused).reduce((s, e) => s + e.confidence, 0) /
    Math.max(1, input.experts.filter((e) => !e.refused).length);

  const summary = input.alertExperts.length
    ? `汇总结论（${levelLabel(input.overallLevel)} / 置信约 ${(avgConf * 100).toFixed(0)}%）：${causal[0]}`
    : `汇总结论（${levelLabel(input.overallLevel)} / 置信约 ${(avgConf * 100).toFixed(0)}%）：未形成同向风险链，维持复检节奏`;

  return {
    summary,
    bullets: [
      `综合判定：${levelLabel(input.overallLevel)}`,
      input.refused.length
        ? `数据限制：${input.refused.map((e) => e.title).join("、")} 未完整参审`
        : "四席数据条件满足或仅部分降权",
      ...causal.slice(0, 2),
      input.customerRisk ? `顾客风险对照：${input.customerRisk}` : "顾客风险对照：样本有限",
      ...counsel.map((c) => `下一步：${c}`),
    ],
  };
}

/** 生成会审咨询报告：正文汇总结论；四官观点仅作会议讨论记录 */
export function buildConsultationReport(input: {
  request: RestaurantDiagnosisRequest;
  restaurantContext?: RestaurantContextRecord;
  exam?: RestaurantExamReport;
  health?: RestaurantHealthModelResult;
  signals: DiagnosisSignal[];
  gaps: DiagnosisGap[];
  customerLens?: { theyThink: string[]; biggestOpportunity?: string; biggestRisk?: string };
  evolution?: RestaurantEvolutionState;
  asOf?: string;
}): ConsultationReport {
  const facts = input.request.facts;
  const evidence = input.request.evidence || [];
  const readiness = assessDataReadiness({
    facts,
    evidenceCount: evidence.length,
    context: {
      brand: input.restaurantContext?.brand || input.request.restaurantContext.brandName,
      city: input.request.restaurantContext.city,
      category: input.request.restaurantContext.category,
    },
  });
  const evolution = input.evolution;
  const evolutionNote =
    evolution && evolution.verifiedCount > 0
      ? `${evolution.summary}${
          evolution.topLessons[0] ? `；近期教训：${evolution.topLessons[0]}` : ""
        }`
      : "尚无足够回填，本轮按通用模式会审；回填结果后将形成门店 DNA。";

  const category = input.request.restaurantContext.category;
  const experts: ExpertOpinion[] = [
    toOpinion(runFinanceOfficer({ facts })),
    toOpinion(runProductOfficer({ facts, evidence, category })),
    toOpinion(
      runMarketingOfficer({
        facts,
        evidence,
        signals: input.signals,
        category,
      }),
    ),
    toOpinion(runExperienceOfficer({ facts, evidence })),
  ];

  const overallLevel = experts.reduce(
    (acc, expert) => worse(acc, expert.level),
    "healthy" as HealthLevel,
  );

  const restaurantName =
    input.restaurantContext?.brand ||
    input.request.restaurantContext.brandName ||
    input.request.restaurantContext.storeName ||
    "未命名门店";

  const scorecard: ExamScorecardRow[] = [];
  for (const axis of input.exam?.axes || []) {
    for (const metric of axis.metrics.filter((m) => m.source !== "missing").slice(0, 4)) {
      scorecard.push({
        domain: axis.title,
        item: metric.label,
        reading: metric.reading,
        level: axis.level,
        owner: ownerForAxis(axis.axis),
      });
    }
  }
  scorecard.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);

  const refused = experts.filter((e) => e.refused);
  const alertExperts = experts.filter(
    (e) => e.level === "risk" || e.level === "attention" || e.level === "critical",
  );

  const unified = buildUnifiedFindings(experts, input.signals);
  const conclusion = buildUnifiedConclusion({
    overallLevel,
    experts,
    alertExperts,
    refused,
    customerRisk: input.customerLens?.biggestRisk,
    signals: input.signals,
  });

  const causalForAction = synthesizeCausalFindings(experts, input.signals).filter(
    (line) => line.startsWith("主因链") || line.startsWith("结构风险"),
  );
  const dnaPriorities =
    evolution?.themeWeights
      .filter((t) => t.weight >= 1.08 || t.confirmed >= 1)
      .slice(0, 2)
      .map((t) => {
        const lesson = evolution.topLessons.find((l) =>
          new RegExp(t.theme === "wait" ? "等|服务|高峰" : t.theme, "i").test(l),
        );
        return `DNA 加权（${t.theme}×${t.weight.toFixed(2)}）：${
          lesson || `持续验证「${t.theme}」主题假设`
        }`;
      }) || [];

  const priorities = Array.from(
    new Set([
      ...dnaPriorities,
      ...causalForAction.map((line) => `验证/处置：${line.replace(/^主因链：|^结构风险：/, "")}`),
      ...experts
        .filter((e) => !e.refused)
        .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.confidence - a.confidence)
        .flatMap((e) => {
          const metricHint = e.analyses.find((a) => a.metricId)?.metricId;
          return e.counsel
            .slice(0, 1)
            .map((c) => (metricHint ? `${c}（盯 #${metricHint}）` : c));
        }),
    ]),
  ).slice(0, 6);

  const openQuestions = [
    ...readiness.hardMissing.map((f) => `硬门槛缺失 · ${f.label}：${f.why}`),
    ...input.gaps
      .filter((g) => g.severity !== "low")
      .slice(0, 6)
      .map((g) => `${g.field}：${g.reason}`),
    ...readiness.strongMissing.slice(0, 4).map((f) => `建议补齐 · ${f.label}：${f.why}`),
  ].slice(0, 10);

  const modules: ReportModule[] = [
    {
      id: "cover",
      no: "01",
      title: "报告封面",
      level: overallLevel,
      summary: `${restaurantName} · 综合判定「${levelLabel(overallLevel)}」`,
      bullets: [
        `出具时间：${new Date(input.asOf || Date.now()).toLocaleString()}`,
        "会审机制：财务官 / 产品官 / 营销官 / 体验官 讨论后汇总成一份结论",
        readiness.summary,
        evolution && evolution.verifiedCount > 0
          ? `门店 DNA：${stageLabel(evolution.stage)} · 成熟度 ${evolution.maturityScore}`
          : "门店 DNA：种子期（等待学习回填）",
      ],
    },
    {
      id: "evolution",
      no: "01b",
      title: "学习进化影响",
      level: evolution && evolution.stage !== "seed" ? "observe" : "healthy",
      summary: evolutionNote,
      bullets:
        evolution && evolution.verifiedCount > 0
          ? [
              `已验证 ${evolution.verifiedCount} 条 · 确认 ${evolution.confirmedCount} / 否定 ${evolution.rejectedCount}`,
              ...evolution.themeWeights.slice(0, 3).map(
                (t) =>
                  `主题「${t.theme}」权重 ×${t.weight.toFixed(2)}（确认 ${t.confirmed} / 否定 ${t.rejected}）`,
              ),
              ...evolution.hypothesisPriors.slice(0, 2).map(
                (p) =>
                  `先验「${p.statement.slice(0, 28)}${p.statement.length > 28 ? "…" : ""}」Δ${
                    p.priorDelta >= 0 ? "+" : ""
                  }${p.priorDelta.toFixed(2)}`,
              ),
            ]
          : ["回填「成立/不成立」后，下一轮假设排序与行动优先级将自动加权"],
    },
    {
      id: "data_readiness",
      no: "02",
      title: "数据采集与就绪度",
      level: readiness.hardReady ? "observe" : "critical",
      summary: readiness.summary,
      bullets: [
        `就绪分：${readiness.score}%`,
        readiness.hardMissing.length
          ? `硬门槛缺失：${readiness.hardMissing.map((f) => f.label).join("、")}`
          : "硬门槛已齐：日×餐段、菜品销售、菜单等可支撑会审",
        readiness.strongMissing.length
          ? `强建议补齐：${readiness.strongMissing
              .slice(0, 6)
              .map((f) => f.label)
              .join("、")}`
          : "强建议项较完整，分析深度可用",
      ],
    },
    {
      id: "findings",
      no: "03",
      title: "综合发现",
      level: overallLevel,
      summary: unified.summary,
      bullets: unified.bullets.slice(0, 10),
    },
    {
      id: "scorecard",
      no: "04",
      title: "体检结果表",
      summary: input.exam?.summary || "经营 / 体验 / 运营 关键指标对照",
      bullets: scorecard.slice(0, 8).map(
        (row) => `${row.domain} · ${row.item}：${row.reading}（${levelLabel(row.level)}）`,
      ),
      tables: [
        {
          headers: ["域", "指标", "读数", "等级"],
          rows: scorecard
            .slice(0, 12)
            .map((row) => [row.domain, row.item, row.reading, levelLabel(row.level)]),
        },
      ],
    },
    {
      id: "conclusion",
      no: "05",
      title: "汇总结论",
      level: overallLevel,
      summary: conclusion.summary,
      bullets: conclusion.bullets,
    },
    {
      id: "action_plan",
      no: "06",
      title: "行动优先级",
      summary: "由会审讨论收敛后的统一下一步",
      bullets: priorities.length
        ? priorities
        : ["维持月度复检：日明细、菜品销售与体验样本"],
    },
    {
      id: "open_issues",
      no: "07",
      title: "待补数据与未决问题",
      summary: openQuestions.length
        ? "下列问题不补齐，会持续削弱报告可信度"
        : "暂无高优先级缺口",
      bullets: openQuestions.length
        ? openQuestions
        : ["建议下个周期继续追加日明细与菜品销售行数"],
    },
    {
      id: "discussion",
      no: "附",
      title: "会审讨论记录（各方观点）",
      summary: "以下不作为分报告，仅保留会议中各方立场，供追溯",
      bullets: experts.map((e) => {
        const stance = e.refused
          ? `拒签：${e.refuseReason || "数据不足"}`
          : e.verdict;
        const risk = e.risks[0] ? `；关切：${e.risks[0]}` : "";
        return `${e.title}（${e.seat}）：${stance}${risk}`;
      }),
    },
  ];

  const finalPriorities = priorities.length
    ? priorities
    : ["维持月度复检：日明细、菜品销售与体验样本"];
  const bossBrief = buildBossBrief({
    restaurantName,
    overallLevel,
    consensus: conclusion.summary,
    priorities: finalPriorities,
    causalLines: causalForAction,
  });

  return {
    title: "餐厅经营体检 · 会审咨询报告",
    subtitle: "一份汇总结论 · 四官讨论纪要附后",
    asOf: input.asOf || new Date().toISOString(),
    restaurantName,
    overallLevel,
    overallVerdict: `综合判定：${levelLabel(overallLevel)}`,
    dataReadinessScore: readiness.score,
    executiveSummary: [
      bossBrief,
      `${restaurantName} 完成本次经营体检，综合判定为「${levelLabel(overallLevel)}」。`,
      readiness.summary,
      evolutionNote,
      conclusion.summary,
      input.exam?.summary || input.health?.snapshot.summary || "已形成统一会审结论。",
    ],
    modules,
    scorecard: scorecard.slice(0, 12),
    experts,
    consensus: conclusion.summary,
    priorities: finalPriorities,
    openQuestions: openQuestions.length
      ? openQuestions
      : ["暂无高优先级缺口；建议下月继续导入日明细与销售结构。"],
    disclaimer:
      "本报告正文为四官会审后的汇总结论；各方观点仅见于「会审讨论记录」。数据越细结论越稳；缺硬门槛时相关席位拒签并写入讨论纪要。属经营咨询意见，不构成财务审计或投资建议。学习回填会沉淀为门店 DNA 并反哺下一轮。",
    evolutionNote,
    bossBrief,
  };
}

/**
 * Goal Compiler 启发式引擎 — Mobile Phase 1 竖切
 * 不直出终局 Decision；未知槽位显式 unknown。
 */
import {
  newAssetId,
  newGoalId,
  type BusinessAssetV1,
  type CompileInputV1,
  type CompileOutputV1,
  type GoalObjectV1,
  type IntentExtractionV1,
  type IntentFamily,
  type MobileAgentStateV1,
  type TaskGraphV1,
  type TaskNodeV1,
} from "../contracts/goal-compiler";
import {
  extractFileSignals,
  type FileSignalV1,
} from "./file-signals";
import {
  memoryPreface,
  type KnownCompileContext,
} from "./known-context";
import {
  buildCausalSectionMarkdown,
  detectCausalIntent,
  isRevenueDeclineUtterance,
} from "../restaurant-intelligence";
import { buildInteractionHints } from "./interaction-hints";
import { renderJudgmentBlock } from "./judgment-block";

function nowIso() {
  return new Date().toISOString();
}

/** 交互宪法 P1：模糊经营抱怨 → 先框定目标域 */
export function isVagueBusinessPain(utterance: string): boolean {
  return /生意不好|生意差|越来越难|经营困难|不好做|不景气|最近很差|赚钱越来越难/.test(
    utterance.trim(),
  );
}

export function extractIntent(utterance: string, hasFile: boolean): IntentExtractionV1 {
  const t = utterance.trim();
  const lower = t.toLowerCase();

  const revenueDecline = isRevenueDeclineUtterance(t);
  const vaguePain = isVagueBusinessPain(t);
  const menu =
    /菜单|菜品结构|SKU|爆品|毛利分析|优化菜单|菜单怎么/.test(t) &&
    !/开店|创业/.test(t);
  const profit =
    revenueDecline ||
    vaguePain ||
    /利润|赚钱|毛利|亏|累|人效|成本|营业额|客流|不赚钱|没钱/.test(t) ||
    /profit|margin/.test(lower);
  const launch = /开店|开一家|首店|筹备|创业|新店/.test(t);
  const expand = /第二家|扩店|连锁|开到\d+家|开100家|开一百家/.test(t);
  const positioning = /定位|品类|客群|品牌/.test(t) && !launch && !menu;

  let intentFamily: IntentFamily = "other_operating";
  let confidence = 0.45;

  if (menu) {
    intentFamily = "menu_optimize";
    confidence = 0.84;
  } else if (profit) {
    // 营业额下降 / 模糊抱怨 / 诊断词 → 强制诊断（先定位问题）
    intentFamily =
      revenueDecline ||
      vaguePain ||
      /为什么|诊断|分析|怎么回事|怎么办/.test(t)
        ? "diagnose_performance"
        : "improve_profit";
    confidence = revenueDecline || vaguePain ? 0.9 : 0.82;
  } else if (expand) {
    intentFamily = "expand_store";
    confidence = 0.78;
  } else if (launch) {
    intentFamily = "launch_store";
    confidence = 0.8;
  } else if (positioning) {
    intentFamily = "positioning";
    confidence = 0.7;
  } else if (hasFile) {
    intentFamily = "improve_profit";
    confidence = 0.65;
  }

  return {
    intentFamily,
    confidence,
    rawSummary: t.slice(0, 120) || (hasFile ? "上传了经营资料" : "经营意图"),
    derivedFromFile: hasFile && !t,
    needsClarify: confidence < 0.55 && !hasFile,
  };
}

function titleFor(family: IntentFamily, raw: string): string {
  switch (family) {
    case "improve_profit":
      return "提升门店利润表现";
    case "diagnose_performance":
      return "门店经营表现诊断";
    case "launch_store":
      return "打造餐饮首店";
    case "expand_store":
      return "门店扩张筹备";
    case "positioning":
      return "品牌定位澄清";
    case "menu_optimize":
      return "菜单结构优化";
    default:
      return raw.slice(0, 24) || "经营目标";
  }
}

function buildTaskGraph(
  goalId: string,
  family: IntentFamily,
  utterance = "",
): TaskGraphV1 {
  const mk = (
    id: string,
    title: string,
    purpose: string,
    hints: string[],
    dependsOn: string[] = [],
    decisionRequired = false,
  ): TaskNodeV1 => ({
    id,
    title,
    purpose,
    dependsOn,
    status: dependsOn.length === 0 ? "active" : "pending",
    capabilityHints: hints,
    decisionRequired,
    artifactTypes: ["report"],
  });

  if (family === "launch_store" || family === "expand_store") {
    const nodes = [
      mk("n1", "品牌定位", "明确客群与品类差异", ["m-pnt"], [], true),
      mk("n2", "商业模型", "投资与回本假设", ["m-biz"], ["n1"], true),
      mk("n3", "选址模型", "商圈与租金约束", ["m-mkt"], ["n2"]),
      mk("n4", "菜单模型", "SKU 与价格带", ["m-pnt", "m-biz"], ["n1"]),
      mk("n5", "开业计划", "团队与节奏", ["workflow"], ["n3", "n4"]),
    ];
    return { goalId, nodes, entryNodeId: "n1" };
  }

  if (family === "menu_optimize") {
    const nodes = [
      mk("n1", "菜单盘点", "SKU/引流/利润/形象结构", ["m-pnt", "restaurant-intelligence"], []),
      mk("n2", "毛利与复杂度", "毛利带与厨房压力", ["m-biz"], ["n1"]),
      mk("n3", "优化方案", "加减品与价格带建议", ["m-pnt", "m-biz"], ["n2"], true),
      mk("n4", "验证", "试销与复购观察", ["workflow"], ["n3"]),
    ];
    return { goalId, nodes, entryNodeId: "n1" };
  }

  const causal = detectCausalIntent(utterance);
  if (family === "diagnose_performance" || causal === "revenue_decline") {
    const nodes = [
      mk("n1", "变量拆解", "客流×转化×客单×复购 / 利润成本项", ["m-biz", "restaurant-intelligence"], []),
      mk("n2", "因果假设", "锁定哪条变量在变", ["m-biz", "restaurant-intelligence"], ["n1"]),
      mk("n3", "制定改善方案", "可执行动作包（确认主杠杆后）", ["m-biz", "m-mkt"], ["n2"], true),
      mk("n4", "验证效果", "设定观察指标", ["workflow"], ["n3"]),
    ];
    return { goalId, nodes, entryNodeId: "n1" };
  }

  const nodes = [
    mk("n1", "诊断问题", "收入/成本/人效三向排查", ["m-biz"], []),
    mk("n2", "找到关键变量", "锁定杠杆点", ["m-biz"], ["n1"]),
    mk("n3", "制定改善方案", "可执行动作包", ["m-biz", "m-mkt"], ["n2"], true),
    mk("n4", "验证效果", "设定观察指标", ["workflow"], ["n3"]),
  ];
  return { goalId, nodes, entryNodeId: "n1" };
}

function questionsFor(
  family: IntentFamily,
  slots: Record<string, string | number | boolean | "unknown">,
  hasFile: boolean,
  utterance = "",
): Array<{ slot: string; prompt: string }> {
  const q: Array<{ slot: string; prompt: string }> = [];
  const need = (slot: string, prompt: string) => {
    if (slots[slot] === undefined || slots[slot] === "unknown") {
      q.push({ slot, prompt });
    }
  };

  if (family === "launch_store" || family === "expand_store") {
    need("ambition", "你希望做单店盈利，还是为品牌扩张打样？");
    need("city", "开在哪个城市？");
    need("investment", "总投资预算大概多少？");
    need("category", "主打什么品类（如社区湘菜）？");
  } else if (family === "menu_optimize") {
    if (!hasFile) {
      need("menu_focus", "这次更想解决：提高毛利、减少SKU、做出爆品，还是对齐客群？");
      need("sku_count", "现在大概有多少道菜（SKU）？");
      need("avg_ticket", "客单价大概在哪个区间？");
    }
  } else if (isRevenueDeclineUtterance(utterance)) {
    if (!hasFile) {
      need("which_variable", "你觉得更像哪边在变：客流变少、转化变差、客单下降，还是复购变少？");
      need("monthly_revenue", "最近一个月营业额大概多少？（有区间也行）");
      need("compare_baseline", "和上个月或去年同期比，大概差多少？");
    }
  } else if (family === "diagnose_performance" || isVagueBusinessPain(utterance)) {
    if (!hasFile) {
      need(
        "problem_domain",
        "我理解你想改善门店经营。先确认主问题：收入、利润、客户，还是运营效率？",
      );
      need("monthly_revenue", "最近一个月营业额大概多少？（有区间也行）");
      need("main_pain", "你更倾向：收入不够、成本太高，还是人效偏低？");
    }
  } else {
    if (!hasFile) {
      need("monthly_revenue", "最近一个月营业额大概多少？");
      need("staff_count", "目前有多少名员工（含兼职折算）？");
      need("main_pain", "你觉得更像收入不够、成本太高，还是人太累效率低？");
    }
  }
  return q.slice(0, 3);
}

function progressFromGraph(graph: TaskGraphV1): number {
  if (graph.nodes.length === 0) return 0;
  const done = graph.nodes.filter((n) => n.status === "done").length;
  return Math.round((done / graph.nodes.length) * 100);
}

function currentStage(graph: TaskGraphV1): string {
  const active = graph.nodes.find((n) => n.status === "active");
  return active?.title ?? graph.nodes[0]?.title ?? "推进中";
}

function buildProfitReport(args: {
  restaurantRef: string;
  goalId: string;
  utterance: string;
  slots: Record<string, string | number | boolean | "unknown">;
  hasFile: boolean;
  fileLabel?: string;
  fileSignals?: FileSignalV1 | null;
}): BusinessAssetV1 {
  const revenue = args.slots.monthly_revenue;
  const staff = args.slots.staff_count;
  const pain = args.slots.main_pain;
  const whichVar = args.slots.which_variable;
  const baseline = args.slots.compare_baseline;
  const causalSignal = detectCausalIntent(args.utterance);
  const revenueDecline =
    causalSignal === "revenue_decline" || Boolean(whichVar && whichVar !== "unknown");
  const causalSection = buildCausalSectionMarkdown(
    args.utterance || (revenueDecline ? "营业额下降怎么办" : "利润诊断"),
  );

  const findings: string[] = [];
  if (args.fileSignals?.bullets.length) {
    findings.push(...args.fileSignals.bullets);
  } else if (args.hasFile) {
    findings.push(
      `已接收经营资料${args.fileLabel ? `（${args.fileLabel}）` : ""}，文本信号较弱，以下为框架诊断。`,
    );
  }
  if (revenue !== undefined && revenue !== "unknown") {
    findings.push(`营业额参考：${String(revenue)}。需对照租金与人力占比再校准。`);
  } else if (!args.fileSignals?.suggestedSlots.monthly_revenue) {
    findings.push("收入侧：尚未确认月营业额，先按「客流 × 转化 × 客单 × 复购」拆解。");
  }
  if (whichVar !== undefined && whichVar !== "unknown") {
    findings.push(`你标记的优先变量方向：${String(whichVar)}。`);
  }
  if (baseline !== undefined && baseline !== "unknown") {
    findings.push(`对比基线：${String(baseline)}。`);
  }
  if (staff !== undefined && staff !== "unknown") {
    findings.push(`人员规模参考：${String(staff)} 人。请核对人效（营业额/人数）。`);
  } else if (!args.fileSignals?.suggestedSlots.staff_count && !revenueDecline) {
    findings.push("人效侧：人员数量未知，这是「越累利润不涨」的常见盲区。");
  }
  if (pain !== undefined && pain !== "unknown") {
    findings.push(`你倾向的主因方向：${String(pain)}。`);
  } else if (!revenueDecline) {
    findings.push("请在收入、成本、人效中先标一个主方向，避免方案发散。");
  } else if (!whichVar || whichVar === "unknown") {
    findings.push("营业额下降：尚未锁定变量（客流/转化/客单/复购），不要先上营销动作。");
  }

  const evidenceBlock = args.fileSignals?.evidenceSnippet
    ? [
        "",
        "## 资料摘录（截断）",
        "```",
        args.fileSignals.evidenceSnippet.slice(0, 800),
        "```",
      ]
    : [];

  const domain = args.slots.problem_domain;
  const title = revenueDecline
    ? "营业额下降 · 因果诊断报告 V1"
    : "经营诊断报告 V1";

  const judgment = renderJudgmentBlock({
    judgment: revenueDecline
      ? whichVar && whichVar !== "unknown"
        ? `优先验证「${String(whichVar)}」是否为营业额下滑主因，再谈动作。`
        : "暂不建议直接上营销；须先锁定客流/转化/客单/复购哪条在变。"
      : domain && domain !== "unknown"
        ? `当前应优先按「${String(domain)}」问题域深挖，避免同时改营销、产品、排班导致失焦。`
        : "先分清收入、成本、人效主方向，再给改善包。",
    reasons: findings.slice(0, 3),
    path: revenueDecline
      ? [
          "确认变量与对比基线（可分时段/渠道）",
          "只对锁定变量设计动作（引流/转化/客单/复购）",
          "在决策室确认主杠杆后执行并设观察指标",
        ]
      : [
          "确认问题域与关键数字",
          "生成 14 天可执行改善清单",
          "关键选择进决策室确认",
        ],
    risks: [
      "未锁定变量就做活动，可能拉高成本而利润更差",
      "同时改多个杠杆会导致无法归因",
    ],
    unknowns: [
      revenue === "unknown" || revenue === undefined ? "月营业额口径未确认" : "",
      !whichVar || whichVar === "unknown" ? "优先变动变量未确认" : "",
    ].filter(Boolean),
  });

  const body = [
    `# ${title}`,
    "",
    `> 基于你的表述：「${args.utterance || "（资料上传）"}」`,
    "",
    causalSection ||
      [
        "## 诊断框架",
        "先定位问题域，再拆变量：",
        "`营业额 ≈ 客流 × 转化率 × 客单价 × 复购效应`",
      ].join("\n"),
    "",
    "## 当前发现",
    ...findings.map((f, i) => `${i + 1}. ${f}`),
    ...evidenceBlock,
    "",
    judgment,
  ].join("\n");

  return {
    assetId: newAssetId(),
    restaurantRef: args.restaurantRef,
    goalId: args.goalId,
    type: "report",
    title,
    version: "v1",
    body,
    status: "draft",
    createdAt: nowIso(),
  };
}

function buildLaunchBrief(args: {
  restaurantRef: string;
  goalId: string;
  utterance: string;
  slots: Record<string, string | number | boolean | "unknown">;
  expand?: boolean;
}): BusinessAssetV1 {
  const city = args.slots.city;
  const area = args.slots.area_sqm;
  const investment = args.slots.investment;
  const category = args.slots.category;
  const ambition = args.slots.ambition;
  const areaNum =
    typeof area === "number"
      ? area
      : typeof area === "string"
        ? Number(String(area).replace(/[^\d.]/g, ""))
        : NaN;
  const largeFirstStore = Number.isFinite(areaNum) && areaNum >= 400;

  const judgment = renderJudgmentBlock({
    judgment: args.expand
      ? "扩张前须先证明单店可复制：稳定盈利、人才与管理带宽到位，再谈多店。"
      : largeFirstStore
        ? "按常见冷启动规律，首店面积偏大时风险上升；建议先压模型验证再定面积。"
        : ambition === "品牌扩张"
          ? "若目标是连锁打样，首店应优先「可复制标准」而非最大坪效噱头。"
          : "优先把首店做成可盈利、可复盘的样板，再谈扩张。",
    reasons: [
      ambition && ambition !== "unknown"
        ? `你的野心设定：${String(ambition)}`
        : "开店目标类型尚未完全确认",
      category && category !== "unknown"
        ? `品类假设：${String(category)}`
        : "品类未确认，定位与菜单会失真",
      investment && investment !== "unknown"
        ? `投资预算参考：${String(investment)}`
        : "投资预算未知，回本模型无法校准",
    ],
    path: [
      "确认定位与客群（差异化一句话）",
      "完成投资/租金/人效假设并压力测试",
      "菜单与选址对齐后再进开业节奏",
    ],
    risks: [
      args.expand
        ? "单店模型未验证就加盟/多开，失败会放大"
        : "面积/投资与经验不匹配导致现金流断裂",
      "把「网红流量」当成商业成功指标",
    ],
    unknowns: [
      city === "unknown" || city === undefined ? "城市未确认" : "",
      area === "unknown" || area === undefined ? "面积未确认" : "",
    ].filter(Boolean),
  });

  const body = [
    args.expand ? "# 扩张目标模型 V1" : "# 开店目标模型 V1",
    "",
    `> 「${args.utterance}」`,
    "",
    "## 已编译参数",
    `- 目标类型：${ambition === "unknown" || ambition === undefined ? "待确认" : String(ambition)}`,
    `- 城市：${city === "unknown" || city === undefined ? "待确认" : String(city)}`,
    `- 面积：${area === "unknown" || area === undefined ? "待确认" : String(area)}`,
    `- 投资：${investment === "unknown" || investment === undefined ? "待确认" : String(investment)}`,
    `- 品类：${category === "unknown" || category === undefined ? "待确认" : String(category)}`,
    "",
    "## 动态工作流",
    "定位 → 商业模型 → 选址 → 菜单 → 开业计划",
    "",
    judgment,
  ].join("\n");

  return {
    assetId: newAssetId(),
    restaurantRef: args.restaurantRef,
    goalId: args.goalId,
    type: "plan",
    title: args.expand ? "扩张目标模型 V1" : "开店目标模型 V1",
    version: "v1",
    body,
    status: "draft",
    createdAt: nowIso(),
  };
}

function buildMenuReport(args: {
  restaurantRef: string;
  goalId: string;
  utterance: string;
  slots: Record<string, string | number | boolean | "unknown">;
}): BusinessAssetV1 {
  const focus = args.slots.menu_focus;
  const sku = args.slots.sku_count;
  const ticket = args.slots.avg_ticket;
  const skuNum =
    typeof sku === "number"
      ? sku
      : typeof sku === "string"
        ? Number(String(sku).replace(/[^\d.]/g, ""))
        : NaN;
  const skuHeavy = Number.isFinite(skuNum) && skuNum > 80;

  const judgment = renderJudgmentBlock({
    judgment: skuHeavy
      ? "SKU 偏多时，优先做减法控复杂度，再谈爆品与毛利结构。"
      : focus && focus !== "unknown"
        ? `本轮菜单优化优先目标：${String(focus)}；先对齐结构再改单品。`
        : "先明确优化目标（毛利/SKU/爆品/客群），避免同时改菜单与价格。",
    reasons: [
      sku && sku !== "unknown" ? `当前 SKU 参考：${String(sku)}` : "SKU 数量未知",
      ticket && ticket !== "unknown"
        ? `客单价参考：${String(ticket)}`
        : "客单价未知，价格带难定",
      "菜单结构应区分引流品 / 利润品 / 形象品",
    ],
    path: [
      "盘点：引流 / 利润 / 形象三类占比",
      skuHeavy ? "砍低销高复杂度品项，降低备料与出品风险" : "补强利润品与搭配组合",
      "小流量试销 2 周，看复购与出品稳定性",
    ],
    risks: [
      "SKU 膨胀 → 备料↑损耗↑厨房复杂度↑ → 出品与复购下降",
      "只加爆款不加结构，容易稀释毛利",
    ],
  });

  const body = [
    "# 菜单优化诊断 V1",
    "",
    `> 「${args.utterance}」`,
    "",
    "## 菜单结构框架",
    "- 引流品：带客流，可低毛利",
    "- 利润品：贡献毛利主仓",
    "- 形象品：品牌与分享",
    "",
    judgment,
  ].join("\n");

  return {
    assetId: newAssetId(),
    restaurantRef: args.restaurantRef,
    goalId: args.goalId,
    type: "menu_model",
    title: "菜单优化诊断 V1",
    version: "v1",
    body,
    status: "draft",
    createdAt: nowIso(),
  };
}

function mergeSlots(
  base: Record<string, string | number | boolean | "unknown">,
  patches?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean | "unknown"> {
  const next = { ...base };
  if (!patches) return next;
  for (const [k, v] of Object.entries(patches)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      next[k] = v;
    }
  }
  return next;
}

function advanceGraph(graph: TaskGraphV1, markFirstDone: boolean): TaskGraphV1 {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  if (markFirstDone) {
    const activeIdx = nodes.findIndex((n) => n.status === "active");
    if (activeIdx >= 0) {
      nodes[activeIdx] = { ...nodes[activeIdx]!, status: "done" };
      const next = nodes.find(
        (n) =>
          n.status === "pending" &&
          n.dependsOn.every((d) => nodes.find((x) => x.id === d)?.status === "done"),
      );
      if (next) {
        const i = nodes.findIndex((n) => n.id === next.id);
        if (i >= 0) nodes[i] = { ...nodes[i]!, status: "active" };
      }
    }
  }
  return { ...graph, nodes };
}

export type CompileContext = {
  state: MobileAgentStateV1;
  ownerName?: string;
  /** 上传资料已提取文本 */
  fileText?: string;
  known?: KnownCompileContext;
};

/**
 * 单回合编译（可纯函数测试）
 */
export function compileGoalTurn(
  input: CompileInputV1,
  ctx: CompileContext,
): CompileOutputV1 {
  const utterance = (input.utterance ?? "").trim();
  const hasFileRefs = Boolean(input.fileRefs?.length);
  const hasFileText = Boolean(ctx.fileText?.trim());
  const hasFile = hasFileRefs || hasFileText;
  const fileLabel = input.fileRefs?.[0]?.label;
  const fileSignals = hasFileText
    ? extractFileSignals(ctx.fileText!, fileLabel)
    : null;
  const known = ctx.known;
  const preface = known ? memoryPreface(known) : "";

  const intent = extractIntent(
    utterance ||
      (input.trigger === "observe" ? "经营动态里有一条值得跟进" : ""),
    hasFileText,
  );
  const existing =
    (input.goalId &&
      ctx.state.activeGoal?.goalId === input.goalId &&
      ctx.state.activeGoal) ||
    (input.trigger === "continue" ||
    input.trigger === "confirm_slot" ||
    input.trigger === "observe"
      ? ctx.state.activeGoal
      : null);

  const ts = nowIso();
  let goal: GoalObjectV1;
  let graph: TaskGraphV1;
  let mode: CompileOutputV1["trace"]["mode"] = "compile";

  if (
    existing &&
    (input.trigger === "continue" ||
      input.trigger === "confirm_slot" ||
      input.trigger === "utterance" ||
      input.trigger === "file" ||
      input.trigger === "observe")
  ) {
    const fromFile = fileSignals?.suggestedSlots ?? {};
    goal = {
      ...existing,
      intentRaw: utterance || existing.intentRaw,
      slots: mergeSlots(
        mergeSlots(
          mergeSlots(existing.slots, (known?.rememberedSlots ?? {}) as Record<string, string | number | boolean>),
          fromFile,
        ),
        input.slotPatches,
      ),
      updatedAt: ts,
      status: "active",
    };
    graph =
      ctx.state.taskGraph ??
      buildTaskGraph(goal.goalId, goal.goalType, goal.intentRaw);
    mode = input.trigger === "continue" ? "continue" : "compile";
  } else if (intent.needsClarify && !hasFile) {
    const goalId = newGoalId();
    goal = {
      goalId,
      intentRaw: utterance,
      goalType: intent.intentFamily,
      title: titleFor(intent.intentFamily, utterance),
      slots: {},
      status: "draft",
      progress: 0,
      currentStage: "明确目标",
      restaurantRef: input.restaurantRef,
      createdAt: ts,
      updatedAt: ts,
    };
    graph = buildTaskGraph(goalId, intent.intentFamily, utterance);
    mode = "clarify";
  } else {
    const family = intent.intentFamily;
    const goalId = existing?.goalId ?? newGoalId();
    const baseSlots = existing?.slots ?? {
      city: "unknown",
      area_sqm: "unknown",
      investment: "unknown",
      category: "unknown",
      monthly_revenue: "unknown",
      staff_count: "unknown",
      main_pain: "unknown",
      which_variable: "unknown",
      compare_baseline: "unknown",
      problem_domain: "unknown",
      ambition: "unknown",
      menu_focus: "unknown",
      sku_count: "unknown",
      avg_ticket: "unknown",
    };
    const remembered = known?.rememberedSlots ?? {};
    const fromFile = fileSignals?.suggestedSlots ?? {};
    goal = {
      goalId,
      intentRaw: utterance || existing?.intentRaw || "经营目标",
      goalType: family,
      title: titleFor(family, utterance || existing?.title || ""),
      successCriteria:
        family === "diagnose_performance"
          ? "完成变量拆解（客流/转化/客单/复购或成本项），锁定主因果后再谈动作"
          : family === "improve_profit"
            ? "看清收入/成本/人效主杠杆，并形成可执行改善方向"
            : family === "menu_optimize"
              ? "完成菜单结构诊断并给出可验证的加减品方向"
              : "参数齐备并完成首版经营模型",
      slots: mergeSlots(
        mergeSlots(mergeSlots(baseSlots, remembered as Record<string, string | number | boolean>), fromFile),
        input.slotPatches,
      ),
      status: "active",
      progress: existing?.progress ?? 0,
      restaurantRef: input.restaurantRef,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    graph = existing && ctx.state.taskGraph?.goalId === goalId
      ? ctx.state.taskGraph
      : buildTaskGraph(goalId, family, goal.intentRaw);
  }

  const questions = [
    ...questionsFor(goal.goalType, goal.slots, hasFileText, goal.intentRaw),
  ];
  const causalUsed = Boolean(detectCausalIntent(goal.intentRaw));
  // 仅「有可读文件正文」可跳过追问；空文件不装懂
  let enoughForReport =
    hasFileText ||
    questions.length === 0 ||
    (goal.goalType === "improve_profit" ||
    goal.goalType === "diagnose_performance" ||
    goal.goalType === "menu_optimize"
      ? Object.values(goal.slots).filter((v) => v !== "unknown").length >= 2
      : Object.entries(goal.slots)
          .filter(([k]) =>
            ["city", "category", "investment", "ambition", "area_sqm"].includes(k),
          )
          .filter(([, v]) => v !== "unknown").length >= 2);

  if (hasFileRefs && !hasFileText && !questions.some((q) => q.slot === "file_note")) {
    questions.unshift({
      slot: "file_note",
      prompt: `文件「${fileLabel || "资料"}」未能读出文字，请用一句话说明里面是什么（或改传 CSV/xlsx）`,
    });
    enoughForReport = false;
  }

  const artifacts: BusinessAssetV1[] = [];
  let pendingDecisions: CompileOutputV1["pendingDecisions"] = [];
  let bossSummary: string;
  let nextAction: CompileOutputV1["nextAction"];

  if (mode === "clarify") {
    bossSummary = [preface, "我先帮你明确目标。你希望解决的是开店、提升利润，还是别的经营问题？用一句话说也可以。"]
      .filter(Boolean)
      .join("\n\n");
    nextAction = { kind: "ask_slot", label: "告诉我你的经营问题" };
    goal.status = "draft";
  } else if (
    input.trigger === "observe" &&
    !existing &&
    utterance &&
    questions.length > 0 &&
    !enoughForReport
  ) {
    // 雷达信号起目标：先理解并追问，不装已诊断完
    goal.status = "blocked";
    bossSummary = [
      preface,
      `我看到经营动态里有一条值得跟进：${utterance.slice(0, 120)}。`,
      "我先帮你判断它和收入、成本、人效哪一侧更相关。",
      `请补充：\n${questions.map((q) => q.prompt).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    nextAction = { kind: "ask_slot", label: "补充后继续" };
  } else if (questions.length > 0 && !enoughForReport) {
    goal.status = "blocked";
    const lines = questions.map((q) => q.prompt).join("\n");
    const knownSkip =
      known && Object.keys(known.rememberedSlots).length
        ? "（已记住的信息我不会再问）"
        : "";
    if (goal.goalType === "expand_store") {
      bossSummary = [
        preface,
        "扩张不是步骤清单。我先挑战一句：第一家店模型是否已验证（盈利稳定、人才、管理、现金流）？",
        `若还没有，我建议先完成单店复制验证。${knownSkip}`,
        `同时确认：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (goal.goalType === "launch_store") {
      bossSummary = [
        preface,
        `我理解你的目标是建立开店模型，不是先甩开店步骤。${knownSkip}`,
        "我先确认野心与关键约束，再编制定位→投资→选址→菜单。",
        `请选择/补充：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (goal.goalType === "menu_optimize") {
      bossSummary = [
        preface,
        "菜单优化我会先定目标（毛利/SKU/爆品/客群），再谈加减品——不会直接给一份菜名清单。",
        `请确认：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (isRevenueDeclineUtterance(goal.intentRaw)) {
      bossSummary = [
        preface,
        "营业额下降时，我不会先甩营销建议。先拆变量：",
        "`营业额 ≈ 客流 × 转化率 × 客单价 × 复购`",
        `请补充：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (
      isVagueBusinessPain(goal.intentRaw) ||
      goal.goalType === "diagnose_performance"
    ) {
      bossSummary = [
        preface,
        "我理解你想解决的是门店经营改善——不是马上做营销。",
        "先判断问题来自：收入、利润、客户，还是运营效率。",
        `请选择：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else {
      bossSummary = [
        preface,
        `我先帮你判断一下。问题可能来自三个方向：收入、成本、人效。${knownSkip}`,
        "收入侧会按「客流 × 转化 × 客单 × 复购」拆开看。",
        `请补充：\n${lines}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    nextAction = { kind: "ask_slot", label: "补充关键信息" };
  } else {
    // 产出资产（聊天是过程，资产是结果）
    if (goal.goalType === "menu_optimize") {
      const report = buildMenuReport({
        restaurantRef: input.restaurantRef,
        goalId: goal.goalId,
        utterance: goal.intentRaw,
        slots: goal.slots,
      });
      artifacts.push(report);
      graph = advanceGraph(graph, true);
      pendingDecisions = [
        {
          title: "是否按该菜单优化方向试销",
          reason: "加减品影响出品与客单，建议确认后再执行",
        },
      ];
      bossSummary = [
        preface,
        `已生成经营资产《${report.title}》。`,
        "请先看判断与路径，再决定试销范围。需要的话可以继续练诊断追问。",
      ]
        .filter(Boolean)
        .join("\n\n");
      nextAction = { kind: "review_artifact", label: "查看菜单资产" };
    } else if (
      goal.goalType === "improve_profit" ||
      goal.goalType === "diagnose_performance" ||
      hasFile
    ) {
      const report = buildProfitReport({
        restaurantRef: input.restaurantRef,
        goalId: goal.goalId,
        utterance: goal.intentRaw,
        slots: goal.slots,
        hasFile,
        fileLabel,
        fileSignals,
      });
      artifacts.push(report);
      graph = advanceGraph(graph, true);
      pendingDecisions = [
        {
          title: isRevenueDeclineUtterance(goal.intentRaw)
            ? "是否确认优先变动变量（客流/转化/客单/复购）"
            : "是否进入改善方案（选主杠杆）",
          reason: "诊断资产已出，需你确认优先方向（终局在决策室）",
        },
      ];
      bossSummary = [
        preface,
        `已生成经营资产《${report.title}》。`,
        fileSignals?.bullets[0] ? `资料信号：${fileSignals.bullets[0]}` : "",
        "报告含「我的判断 / 原因 / 路径 / 风险」。可查看资产，或去做一轮诊断追问练习。",
      ]
        .filter(Boolean)
        .join("\n\n");
      nextAction = { kind: "review_artifact", label: "查看诊断资产" };
    } else {
      const brief = buildLaunchBrief({
        restaurantRef: input.restaurantRef,
        goalId: goal.goalId,
        utterance: goal.intentRaw,
        slots: goal.slots,
        expand: goal.goalType === "expand_store",
      });
      artifacts.push(brief);
      graph = advanceGraph(graph, true);
      pendingDecisions = [
        {
          title:
            goal.goalType === "expand_store"
              ? "是否先完成单店复制验证再扩张"
              : "首店定位方向是否确认",
          reason: "影响后续选址与菜单，建议在决策室确认",
        },
      ];
      bossSummary = [
        preface,
        `已生成经营资产《${brief.title}》。`,
        goal.goalType === "expand_store"
          ? "我已写入扩张挑战条件：单店未验证前不建议铺开。"
          : `下一步建议推进「${currentStage(graph)}」。`,
      ]
        .filter(Boolean)
        .join("\n\n");
      nextAction = { kind: "continue_stage", label: "继续推进" };
    }
    goal.status = "active";
  }

  goal.progress = Math.max(goal.progress, progressFromGraph(graph));
  if (artifacts.length && goal.progress < 25) goal.progress = 25;
  goal.currentStage = currentStage(graph);
  if (questions.length && goal.status === "blocked") {
    goal.currentStage = "补充关键信息";
  }

  const baseOutput: Omit<CompileOutputV1, "interactionHints"> = {
    goal,
    taskGraph: graph,
    bossSummary,
    artifacts,
    pendingDecisions,
    questions,
    nextAction,
    trace: {
      intentConfidence: intent.confidence,
      providersUsed: [
        "goal-compiler.heuristic",
        ...(causalUsed ? ["restaurant-intelligence.causal"] : []),
      ],
      degraded: true,
      mode,
    },
  };

  return {
    ...baseOutput,
    interactionHints: buildInteractionHints(baseOutput, goal.intentRaw),
  };
}

export function focusHintsFromGoal(goal: GoalObjectV1): string[] {
  const hints: string[] = [];
  if (
    goal.goalType === "improve_profit" ||
    goal.goalType === "diagnose_performance"
  ) {
    hints.push("利润", "人效");
  }
  if (goal.goalType === "launch_store" || goal.goalType === "expand_store") {
    hints.push("开店", "定位");
  }
  if (goal.goalType === "menu_optimize") hints.push("菜单", "产品");
  const pain = goal.slots.main_pain;
  if (typeof pain === "string" && pain !== "unknown") hints.push(String(pain));
  return [...new Set(hints)].slice(0, 6);
}

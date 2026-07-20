/**

 * World Sense — 环境 / 行业外变量认知

 * 不接假外部 API：无市场事实时只标「不足」，不得冒充可执行世界判断。

 */



import type { CapabilityRequest, CognitionInsight } from "../../contracts/capability";

import type { FounderMemorySnapshot } from "../../contracts/mission";



function buildId(prefix: string) {

  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"

    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`

    : `${prefix}_${Date.now().toString(36)}`;

}



function clip(text: string, max = 120) {

  const t = text.replace(/\s+/g, " ").trim();

  if (!t) return "";

  return t.length > max ? `${t.slice(0, max - 1)}…` : t;

}



function detectExternalPressures(question: string): string[] {

  const pressures: string[] = [];

  if (/加盟|开放加盟|招商/.test(question)) {

    pressures.push("加盟供给与品牌稀释风险上升");

  }

  if (/开店|扩张|多店|复制|20家|十家/.test(question)) {

    pressures.push("本地供给密度与人效能否支撑扩张节奏");

  }

  if (/融资|股权|稀释|投资人/.test(question)) {

    pressures.push("资本成本与控制权边界变化");

  }

  if (/涨价|客单|降价|补贴|流量/.test(question)) {

    pressures.push("获客成本与价格敏感度变化");

  }

  if (/外卖|线上|私域|抖音|小红书/.test(question)) {

    pressures.push("渠道结构与数字化获客效率");

  }

  return pressures.slice(0, 3);

}



/**

 * 从公司上下文 + Memory 事实生成世界信号洞察。

 * 无市场事实时 provider=insufficient，置信度压低。

 */

export function buildWorldInsight(

  request: CapabilityRequest,

  memory?: FounderMemorySnapshot | null,

): CognitionInsight {

  const industry = request.companyContext.basicInfo.industry || "餐饮";

  const city = request.companyContext.basicInfo.city || "目标城市";

  const stage = request.companyContext.basicInfo.stage || "经营中";

  const scale = request.companyContext.business?.scale || "规模待校准";

  const brandName = request.companyContext.brand?.name || request.companyContext.basicInfo.name;

  const positioning = request.companyContext.brand?.positioning;

  const goals = (request.companyContext.goals || []).slice(0, 2);

  const pressures = detectExternalPressures(request.mission.question);



  const marketFacts = (memory?.facts || [])

    .filter((f) => /市场|商圈|竞品|客流|城市|行业|品牌/.test(`${f.label}${f.value}`))

    .slice(0, 2);



  const insufficient = marketFacts.length === 0;



  const factClause = marketFacts.length

    ? `已记录事实：${marketFacts.map((f) => `${f.label}=${f.value}`).join("；")}。`

    : "企业记忆里还缺少可引用的市场/竞品事实——本条仅为待核实外因清单，不是结论。";



  const brandClause = positioning

    ? `当前品牌「${brandName}」主张「${positioning}」，`

    : `当前品牌「${brandName}」定位仍偏薄，`;



  const goalClause = goals.length

    ? `目标偏向「${goals.join(" / ")}」，`

    : "";



  const pressureClause =

    pressures.length > 0

      ? `议题相关外因线索：${pressures.join("、")}。`

      : "议题未点明具体外因，禁止套用宏观叙事。";



  const statement = clip(

    insufficient

      ? `${industry}·${city}：世界判断证据不足。${factClause}${pressureClause}`

      : `${industry}·${city}（${stage} / ${scale}）：${brandClause}${goalClause}${pressureClause}${factClause}`,

    180,

  );



  const confidence = insufficient

    ? 0.38

    : Math.min(

        0.72,

        0.5 +

          Math.min(marketFacts.length, 2) * 0.08 +

          (city !== "目标城市" ? 0.05 : 0) +

          (pressures.length >= 1 ? 0.04 : 0),

      );



  return {

    insightId: buildId("ins-world"),

    plugin: "world",

    title: insufficient ? "世界信号（证据不足）" : "世界信号",

    statement,

    why: clip(

      insufficient

        ? "无市场事实时不得输出可执行世界判断；先录入本地样本再解释外因。"

        : "经营者要把行业外变量纳入认知：先标出对本业务真正敏感的外因，再用本地样本验证。",

      120,

    ),

    risks: [

      "把宏观趋势误当成可执行机会",

      "忽略本地供给、客单与人效验证",

      insufficient ? "缺少可引用的市场事实，判断易空转" : "事实过时而未复检",

    ].slice(0, 3),

    conditions: [

      `在${city}用 1–2 个本地样本验证上述外因`,

      "每个外因写清：影响路径 → 可观察指标 → 停止线",

      goals[0] ? `外因判断必须服务目标「${goals[0]}」` : "先对齐一年目标再解释外因",

    ].slice(0, 3),

    confidence,

    provider: insufficient ? "insufficient" : "world_sense",

  };

}



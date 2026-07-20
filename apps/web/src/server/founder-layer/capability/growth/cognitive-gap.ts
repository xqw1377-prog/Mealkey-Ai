/**
 * 认知差距检测 — 从验证结果推断「表象归因 vs 根因」
 */

import type {
  CognitiveGap,
  CognitiveGapKind,
} from "../../contracts/growth-runtime";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const TRAFFIC = /流量|获客|投放|推广|曝光|来客|客流/;
const PRICE = /降价|低价|折扣|客单|价格|促销/;
const OPS = /执行|落地|店员|排班|运营|SOP|培训/;
const POSITION = /定位|心智|品类|品牌|客群|主张/;
const MODEL = /模式|毛利|利润|加盟|扩张|现金流/;

/**
 * 当验证未过 / 部分成立时，对比假设文案与结果摘要，给出认知差距。
 * 验证通过时一般不报差距（返回 null），除非摘要自相矛盾。
 */
export function detectCognitiveGap(input: {
  result: "aligned" | "partial" | "off";
  hypothesis?: string;
  summary: string;
  judgement?: string;
}): CognitiveGap | null {
  if (input.result === "aligned") return null;

  const hypo = `${input.hypothesis || ""} ${input.judgement || ""}`;
  const actual = input.summary || "";
  const blob = `${hypo} ${actual}`;

  let kind: CognitiveGapKind = "unknown";
  let believedCause = "经营结果未达预期";
  let likelyRootCause = "关键假设未被证实，需委员会复核判断链";
  let suggestCommittee: CognitiveGap["suggestCommittee"] = "council";

  if (TRAFFIC.test(hypo) || TRAFFIC.test(actual)) {
    if (POSITION.test(actual) || input.result === "off") {
      kind = "traffic_vs_positioning";
      believedCause = "流量 / 获客不足";
      likelyRootCause = "更可能是定位或客群匹配问题，流量只是表象";
      suggestCommittee = "brand";
    }
  } else if (PRICE.test(hypo) || PRICE.test(actual)) {
    kind = "price_vs_model";
    believedCause = "价格策略能换来健康增长";
    likelyRootCause = "价格变动可能伤利润结构；需用商业模式视角复盘";
    suggestCommittee = "business";
  } else if (OPS.test(hypo) && (POSITION.test(blob) || MODEL.test(blob))) {
    kind = "ops_vs_strategy";
    believedCause = "执行不到位";
    likelyRootCause = "战略假设本身可能有误，不宜只加压执行";
    suggestCommittee = "council";
  } else if (OPS.test(actual) && input.result === "off") {
    kind = "execution_vs_judgement";
    believedCause = "判断没问题，是落地慢了";
    likelyRootCause = "需区分：是执行纪律问题，还是判断未被市场接受";
    suggestCommittee = "council";
  } else if (input.result === "off") {
    kind = "ops_vs_strategy";
    believedCause = clip(hypo, 40) || "原假设仍成立";
    likelyRootCause = "结果已证伪或严重偏离，应回到判断层而非加码执行";
    suggestCommittee = "council";
  } else {
    // partial
    kind = "execution_vs_judgement";
    believedCause = "方向大体正确";
    likelyRootCause = "边界未收窄：保留有效部分，改写下一次可证伪假设";
    suggestCommittee = "council";
  }

  const summary =
    kind === "traffic_vs_positioning"
      ? "认知偏差：战略/定位问题被误认为运营流量问题"
      : kind === "price_vs_model"
        ? "认知偏差：用价格动作掩盖模式与利润结构问题"
        : kind === "ops_vs_strategy"
          ? "认知偏差：战略问题被误认为运营执行问题"
          : "认知偏差：需分清判断失误与执行纪律";

  return {
    gapId: buildId("cg"),
    kind,
    believedCause: clip(believedCause, 80),
    likelyRootCause: clip(likelyRootCause, 120),
    summary,
    suggestCommittee,
    createdAt: new Date().toISOString(),
  };
}

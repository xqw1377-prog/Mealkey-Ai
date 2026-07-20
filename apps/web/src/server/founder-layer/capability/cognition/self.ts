/**
 * Self Sense — 经营者自我认知
 * 从 Memory 偏好 / 成败模式 / 决策摘要推断决策风格与盲区。
 */

import type {
  CapabilityRequest,
  CognitionInsight,
  OsKernelContext,
} from "../../contracts/capability";

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

function inferTempo(question: string, prefValues: string[]): "fast" | "steady" | "cautious" {
  const prefText = prefValues.join(" ");
  if (/快速增长|机会|扩张|马上|立刻/.test(`${question} ${prefText}`)) return "fast";
  if (/稳健|利润|控制|验证|暂缓/.test(`${question} ${prefText}`)) return "cautious";
  if (/品牌|长期|心智/.test(prefText)) return "steady";
  if (/扩张|加盟|马上|快速|开到/.test(question)) return "fast";
  return "steady";
}

const TEMPO_LABEL = {
  fast: "偏机会捕捉、节奏偏快",
  steady: "偏目标对齐、节奏适中",
  cautious: "偏证据优先、节奏克制",
} as const;

/**
 * 从 Memory 与议题生成自我认知洞察。
 */
export function buildSelfInsight(
  request: CapabilityRequest,
  kernel: OsKernelContext,
): CognitionInsight {
  const memory = kernel.memory;
  const preferences = memory?.preferences ?? [];
  const patterns = memory?.patterns ?? [];
  const decisions = memory?.decisions ?? [];

  const prefValues = preferences.map((p) => p.value).filter(Boolean);
  const prefLabels = preferences
    .slice(0, 3)
    .map((p) => (p.label ? `${p.label}：${p.value}` : p.value));

  const failures = patterns.filter((p) => p.kind === "failure");
  const successes = patterns.filter((p) => p.kind === "success");
  const partials = patterns.filter((p) => p.kind === "partial");

  const tempo = inferTempo(request.mission.question, prefValues);
  const style = TEMPO_LABEL[tempo];

  const prefClause = prefLabels.length
    ? `已观察偏好：${prefLabels.join("；")}。`
    : "偏好样本仍少。";

  const patternClause =
    failures[0]
      ? `需警惕：${clip(failures[0].summary, 56)}。`
      : successes[0]
        ? `可复用：${clip(successes[0].summary, 56)}。`
        : decisions[0]
          ? `近期决策：${clip(decisions[0].summary, 56)}。`
          : "成败模式尚未形成。";

  const blindSpot =
    tempo === "fast"
      ? "验证不足时容易放大动作"
      : tempo === "cautious"
        ? "过度等待证据可能错过窗口"
        : "目标对齐后仍可能低估组织承接成本";

  const statement = clip(
    `决策特点：${style}。${prefClause}${patternClause}优势是抓重点与推进；盲区是${blindSpot}。`,
    180,
  );

  const sampleDensity =
    preferences.length + patterns.length + Math.min(decisions.length, 3);
  const confidence = Math.min(
    0.85,
    0.48 + sampleDensity * 0.05 + (failures.length || successes.length ? 0.08 : 0),
  );

  const whyParts = [
    failures[0] ? `失败模式：${clip(failures[0].summary, 70)}` : null,
    successes[0] ? `成功模式：${clip(successes[0].summary, 70)}` : null,
    partials[0] ? `部分成立：${clip(partials[0].summary, 70)}` : null,
    !failures[0] && !successes[0]
      ? "尚无足够成败样本，本轮决策将用于校准画像。"
      : null,
  ].filter(Boolean) as string[];

  return {
    insightId: buildId("ins-self"),
    plugin: "self",
    title: "自我认知",
    statement,
    why: whyParts[0],
    risks: [
      "用直觉替代证据",
      "把偏好当成市场事实",
      failures.length > 0 ? "重复已知失败模式" : "在无样本时过度自信",
    ].slice(0, 3),
    conditions: [
      "每个重大动作绑定验证任务与停止线",
      "高冲突议题强制委员会压力测试",
      tempo === "fast"
        ? "扩张类决策先做小样本验证再放大"
        : "把「暂缓」写成可复盘条件，避免无限推迟",
    ].slice(0, 3),
    confidence,
    provider: "self_sense",
  };
}

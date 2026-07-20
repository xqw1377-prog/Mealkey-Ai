/**
 * M-BIZ 厚体检 — 商业模式扫描（规则·评分·主矛盾 + 完整 Markdown）
 */
import {
  createId,
  nowIso,
  type ResearchPack,
} from "../../consulting-os/types";
import type { BusinessScanScope } from "./types";

function clip(s: string, n: number) {
  const t = (s || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function resolveBizScope(
  answers: Record<string, string>,
): BusinessScanScope {
  return {
    stage: answers.stage || "当前阶段",
    pain: answers.pain || "模式痛点未声明",
    priority: answers.priority || "先把一件事做穿",
    resource: answers.resource || "资源偏紧",
  };
}

/** 九维启发式评分（无引擎时） */
function heuristicScores(scope: BusinessScanScope): Array<{
  dim: string;
  score: number;
  note: string;
}> {
  const profitBias = scope.priority.includes("利润");
  const growthBias = scope.priority.includes("增长") || scope.priority.includes("规模");
  const copyPain = scope.pain.includes("复制");
  const cashTight = scope.resource.includes("现金");
  return [
    { dim: "价值主张清晰度", score: 68, note: "客人能否一句话说清为何选你" },
    {
      dim: "单位经济",
      score: profitBias ? 62 : cashTight ? 55 : 64,
      note: "贡献毛利与人效是否可周报",
    },
    {
      dim: "产品证明力",
      score: 60,
      note: "主推品是否证明模式，而非满菜单",
    },
    {
      dim: "复购结构",
      score: scope.pain.includes("不稳") ? 52 : 66,
      note: clip(scope.pain, 28),
    },
    {
      dim: "可复制性",
      score: copyPain ? 48 : scope.stage.includes("扩张") ? 58 : 70,
      note: copyPain ? "复制走样是主雷" : "流程是否可交接",
    },
    {
      dim: "增长效率",
      score: growthBias ? 58 : 65,
      note: growthBias ? "增长贵时需先锁转化" : "规模不是当前唯一北极星",
    },
    { dim: "组织注意力", score: scope.resource.includes("时间") ? 50 : 68, note: clip(scope.resource, 28) },
    { dim: "现金跑道", score: cashTight ? 45 : 72, note: cashTight ? "现金紧必须缩短验证" : "跑道尚可" },
    {
      dim: "主航道唯一性",
      score: 40,
      note: `老板口头优先「${clip(scope.priority, 20)}」，尚未冻结为唯一北极星`,
    },
  ];
}

export function thickenBusinessScan(
  pack: ResearchPack,
  answers: Record<string, string>,
  ctx?: { name?: string; collectionMode?: ResearchPack["collectionMode"] },
): ResearchPack {
  const scope = resolveBizScope(answers);
  const scores = heuristicScores(scope);
  const avg = Math.round(
    scores.reduce((a, s) => a + s.score, 0) / scores.length,
  );
  const weakest = [...scores].sort((a, b) => a.score - b.score).slice(0, 3);

  const core = pack.sections.filter(
    (s) => s.title !== "本轮唯一问题" && s.title !== "所以呢（决策含义）",
  );
  const byTitle = new Map(core.map((s) => [s.title, s.body]));

  const sections: ResearchPack["sections"] = [
    {
      title: "模式现状",
      body:
        byTitle.get("模式现状") ||
        `处于「${scope.stage}」。主矛盾：「${scope.pain}」。资源约束：「${scope.resource}」。`,
    },
    {
      title: "规则扫描",
      body:
        byTitle.get("规则扫描") ||
        `常见失分：SKU 过宽、人效不透明、复购未被产品结构证明、三线并行。`,
    },
    {
      title: "主矛盾",
      body: byTitle.get("主矛盾") || scope.pain,
    },
    {
      title: "优先路径暗示",
      body:
        byTitle.get("优先路径暗示") ||
        `老板倾向「${scope.priority}」；若 90 天不冻结唯一北极星，主矛盾会继续消耗注意力。`,
    },
    {
      title: "九维评分",
      body: scores
        .map((s) => `${s.dim} ${s.score}｜${s.note}`)
        .join("\n"),
    },
    {
      title: "最弱三项",
      body: weakest.map((s) => `${s.dim}（${s.score}）：${s.note}`).join("；"),
    },
    {
      title: "体检结论",
      body:
        pack.headline ||
        `综合 ${avg} 分。主矛盾「${scope.pain}」必须被唯一北极星对上。`,
    },
  ];

  const extras = core.filter((s) => !sections.some((x) => x.title === s.title));
  const fullMarkdown = composeBizScanMarkdown({
    scope,
    headline: pack.headline,
    sections: [...sections, ...extras],
    scores,
    avg,
    risks: pack.risks,
    projectName: ctx?.name || "本项目",
  });

  return {
    ...pack,
    scope: {
      city: scope.stage,
      category: scope.pain,
      intent: scope.priority,
      constraint: scope.resource,
    },
    fullMarkdown,
    collectionMode: ctx?.collectionMode || pack.collectionMode || "heuristic",
    sources: pack.sources?.length
      ? pack.sources
      : [
          "采集信号（阶段/痛点/优先级/资源）",
          pack.collectionMode === "engine"
            ? "一枪商业引擎投影"
            : "启发式商业体检骨架",
        ],
    sections: [...sections, ...extras],
    risks: Array.from(
      new Set([
        ...pack.risks,
        "没有北极星的模式讨论 = 会议空转",
        "同时追利润、增长、品牌会三线失血",
      ]),
    ).slice(0, 6),
  };
}

function composeBizScanMarkdown(input: {
  scope: BusinessScanScope;
  headline: string;
  sections: ResearchPack["sections"];
  scores: Array<{ dim: string; score: number; note: string }>;
  avg: number;
  risks: string[];
  projectName: string;
}): string {
  const { scope, headline, sections, scores, avg, risks, projectName } = input;
  return [
    `# 商业模式体检报告`,
    ``,
    `> ${projectName} · ${scope.stage}`,
    `> 主矛盾「${clip(scope.pain, 36)}」｜优先「${clip(scope.priority, 24)}」｜资源「${clip(scope.resource, 20)}」`,
    `> 综合评分：${avg}/100 · 待确认`,
    ``,
    `## 0. 一句话结论`,
    ``,
    headline,
    ``,
    `## 1. 体检范围卡`,
    ``,
    `| 项 | 内容 |`,
    `| --- | --- |`,
    `| 阶段 | ${scope.stage} |`,
    `| 主矛盾 | ${scope.pain} |`,
    `| 90 天优先 | ${scope.priority} |`,
    `| 最紧资源 | ${scope.resource} |`,
    ``,
    `## 2. 模式与规则`,
    ``,
    sections.find((s) => s.title === "模式现状")?.body || "",
    ``,
    sections.find((s) => s.title === "规则扫描")?.body || "",
    ``,
    `## 3. 九维评分`,
    ``,
    `| 维度 | 分 | 备注 |`,
    `| --- | --- | --- |`,
    ...scores.map((s) => `| ${s.dim} | ${s.score} | ${s.note} |`),
    ``,
    `## 4. 主矛盾与优先暗示`,
    ``,
    sections.find((s) => s.title === "主矛盾")?.body || "",
    ``,
    sections.find((s) => s.title === "优先路径暗示")?.body || "",
    ``,
    `## 5. 风险`,
    ``,
    ...risks.map((r) => `- ${r}`),
    ``,
    `## 6. 对四官会的含义`,
    ``,
    `下一席四官将分别从「主航道 / 产品证明 / 单位经济 / 可复制」出互斥方案，不得三线并行。`,
    ``,
    `*MealKey M-BIZ 商业顾问委员会 · 体检组*`,
    ``,
  ].join("\n");
}

export function buildHeuristicBusinessScan(
  answers: Record<string, string>,
  ctx?: { name?: string },
): ResearchPack {
  const scope = resolveBizScope(answers);
  const base: ResearchPack = {
    packId: createId("mrp"),
    status: "ready",
    headline: `商业体检：${scope.stage}下，主矛盾是「${scope.pain}」`,
    sections: [],
    risks: [
      "同时追利润、增长、品牌，会三线失血",
      "未验证就复制，会把单店偶然性放大成系统性风险",
    ],
    generatedAt: nowIso(),
    collectionMode: "heuristic",
  };
  return thickenBusinessScan(base, answers, {
    name: ctx?.name,
    collectionMode: "heuristic",
  });
}

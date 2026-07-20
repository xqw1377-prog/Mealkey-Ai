/**
 * M-ED 厚扫描 — 股权结构与风险体检
 */
import {
  createId,
  nowIso,
  type ResearchPack,
} from "../../consulting-os/types";
import type { EquityScanScope } from "./types";

function clip(s: string, n: number) {
  const t = (s || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function resolveEquityScope(
  answers: Record<string, string>,
): EquityScanScope {
  return {
    stage: answers.stage || "阶段未标明",
    topic: answers.topic || "股权议题未声明",
    control: answers.control || "控制权底线未声明",
    team: answers.team || "团队现状待补",
  };
}

function heuristicScores(scope: EquityScanScope) {
  const mustHold = scope.control.includes("必须控股");
  const financing = scope.topic.includes("融资") || scope.stage.includes("融资");
  const incentive = scope.topic.includes("激励") || scope.topic.includes("骨干");
  const partner = scope.topic.includes("合伙");
  return [
    {
      dim: "控制权清晰度",
      score: mustHold ? 70 : scope.control.includes("否决") ? 68 : 55,
      note: clip(scope.control, 32),
    },
    {
      dim: "协议完备度",
      score: 48,
      note: "口头承诺未落协议是高频雷",
    },
    {
      dim: "融资缓冲",
      score: financing ? 58 : 72,
      note: financing ? "本轮在谈融资，稀释风险升高" : "融资非本轮主议题",
    },
    {
      dim: "激励对齐",
      score: incentive ? 60 : scope.team.includes("经理人") ? 58 : 70,
      note: clip(scope.team, 28),
    },
    {
      dim: "退出机制",
      score: partner ? 45 : 62,
      note: partner ? "合伙公平议题下退出条款必须先补" : "退出条款仍建议成文",
    },
    {
      dim: "治理例会",
      score: 50,
      note: "重大事项清单是否进章程",
    },
    {
      dim: "Cap table 可讲清",
      score: 55,
      note: "当前 vs 目标结构是否有一页图",
    },
    {
      dim: "议题聚焦",
      score: 65,
      note: clip(scope.topic, 32),
    },
  ];
}

export function thickenEquityScan(
  pack: ResearchPack,
  answers: Record<string, string>,
  ctx?: { name?: string; collectionMode?: ResearchPack["collectionMode"] },
): ResearchPack {
  const scope = resolveEquityScope(answers);
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
      title: "结构现状",
      body:
        byTitle.get("结构现状") ||
        `阶段：${scope.stage}。团队：${scope.team}。议题：${scope.topic}。`,
    },
    {
      title: "控制权",
      body: byTitle.get("控制权") || scope.control,
    },
    {
      title: "激励与公平",
      body:
        byTitle.get("激励与公平") ||
        "若只谈融资不谈 vesting/贡献，后续争议概率高。",
    },
    {
      title: "风险焦点",
      body: byTitle.get("风险焦点") || `本轮优先处理：${scope.topic}。`,
    },
    {
      title: "必须落签清单",
      body: "章程 · 股东/合伙协议 · vesting 条款 ·（若融资）条款清单与稀释测算",
    },
    {
      title: "结构评分",
      body: scores.map((s) => `${s.dim} ${s.score}｜${s.note}`).join("\n"),
    },
    {
      title: "最弱三项",
      body: weakest.map((s) => `${s.dim}（${s.score}）：${s.note}`).join("；"),
    },
    {
      title: "扫描结论",
      body:
        pack.headline ||
        `综合 ${avg} 分。控制权底线与必须落签文件未冻结前，不宜推进稀释性动作。`,
    },
  ];

  const extras = core.filter((s) => !sections.some((x) => x.title === s.title));
  const fullMarkdown = [
    `# 股权结构扫描报告`,
    ``,
    `> ${ctx?.name || "股权项目"} · ${scope.stage}`,
    `> 议题「${clip(scope.topic, 36)}」｜底线「${clip(scope.control, 28)}」`,
    `> 综合评分：${avg}/100 · 待确认`,
    ``,
    `## 0. 一句话结论`,
    ``,
    pack.headline,
    ``,
    `## 1. 扫描范围卡`,
    ``,
    `| 项 | 内容 |`,
    `| --- | --- |`,
    `| 阶段 | ${scope.stage} |`,
    `| 议题 | ${scope.topic} |`,
    `| 控制权底线 | ${scope.control} |`,
    `| 团队 | ${scope.team} |`,
    ``,
    `## 2. 结构与控制权`,
    ``,
    sections.find((s) => s.title === "结构现状")?.body || "",
    ``,
    sections.find((s) => s.title === "控制权")?.body || "",
    ``,
    `## 3. 评分`,
    ``,
    `| 维度 | 分 | 备注 |`,
    `| --- | --- | --- |`,
    ...scores.map((s) => `| ${s.dim} | ${s.score} | ${s.note} |`),
    ``,
    `## 4. 必须落签`,
    ``,
    sections.find((s) => s.title === "必须落签清单")?.body || "",
    ``,
    `## 5. 风险`,
    ``,
    ...pack.risks.map((r) => `- ${r}`),
    `- 没有否决条款的股权安排 = 定时炸弹`,
    ``,
    `## 6. 对治理会的含义`,
    ``,
    `下一席四方将分别从「融资缓冲 / 控制权 / 协议退出 / 激励池」出互斥方案，先锁一条再谈其余。`,
    ``,
    `*MealKey M-ED 股权治理委员会 · 扫描组*`,
    ``,
  ].join("\n");

  return {
    ...pack,
    scope: {
      city: scope.stage,
      category: scope.topic,
      intent: scope.control,
      constraint: scope.team,
    },
    fullMarkdown,
    collectionMode: ctx?.collectionMode || pack.collectionMode || "heuristic",
    sources: pack.sources?.length
      ? pack.sources
      : [
          "采集信号（阶段/议题/控制权/团队）",
          pack.collectionMode === "engine"
            ? "一枪股权引擎投影"
            : "启发式股权扫描骨架",
        ],
    sections: [...sections, ...extras],
    risks: Array.from(
      new Set([
        ...pack.risks,
        "口头承诺未落协议",
        "没有否决条款的股权安排 = 定时炸弹",
      ]),
    ).slice(0, 6),
  };
}

export function buildHeuristicEquityScan(
  answers: Record<string, string>,
  ctx?: { name?: string },
): ResearchPack {
  const scope = resolveEquityScope(answers);
  const base: ResearchPack = {
    packId: createId("mrp"),
    status: "ready",
    headline: `股权扫描：当前议题「${scope.topic}」，控制权底线需先冻结`,
    sections: [],
    risks: [
      "口头承诺未落协议",
      "融资条款与控制权底线冲突",
      "激励池过小或过大都会伤团队",
    ],
    generatedAt: nowIso(),
    collectionMode: "heuristic",
  };
  return thickenEquityScan(base, answers, {
    name: ctx?.name,
    collectionMode: "heuristic",
  });
}

/**
 * M-MKT 《市场机会战略报告》— 对标 positioning-strategy-report 章节厚度
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ResearchPack,
  WarRoomConsensus,
} from "../../consulting-os/types";
import type { EntryDeliveryPack } from "./types";

export function buildOpportunityStrategyReport(input: {
  projectName?: string;
  city?: string;
  answers: Record<string, string>;
  research?: ResearchPack;
  advisors?: AdvisorStrategySet;
  warRoom: WarRoomConsensus;
  decision?: DecisionArtifact;
  entryPack?: EntryDeliveryPack;
  advisorName: (id: string) => string;
}): string {
  const {
    projectName,
    city,
    answers,
    research,
    advisors,
    warRoom,
    decision,
    entryPack,
    advisorName,
  } = input;
  const line = warRoom.consensusOneLiner || decision?.recommendation || "（待确认）";

  const lines: string[] = [
    `# 市场机会战略报告`,
    ``,
    `> ${projectName || "市场项目"} · ${city || answers.city || "目标城市"}`,
    `> MealKey 市场战略委员会 · 决策包（非宣传稿）`,
    `> 状态：待创始人确认`,
    ``,
    `## 0. 本轮唯一问题`,
    ``,
    decision?.governingQuestion ||
      `在「${answers.city || city || "目标城市"} · ${answers.category || "目标品类"}」下，我们是否进入、以及用哪一种进入方式？`,
    ``,
    `## 1. 建议（一句话）`,
    ``,
    `**${line}**`,
    ``,
    `### 取舍`,
    ``,
    decision?.tradeoffAccepted || warRoom.blendNote || "接受会议冻结方向，放弃三线并行",
    ``,
    `### 为什么是这个`,
    ``,
    ...(decision?.whyThis || warRoom.consensusBullets || []).map((w) => `- ${w}`),
    ``,
    `### 明确不做`,
    ``,
    ...(decision?.whatWeWontDo || [warRoom.decisionCard?.options?.[0]?.sacrifice || "不做多场景并行"]).map(
      (w) => `- ${w}`,
    ),
    ``,
    `## 2. 否决条件（认错停手）`,
    ``,
    ...(decision?.killCriteria || [
      "试点 8 周内主推场景复购无提升 → 换切口或止损",
      "人效/毛利连续 4 周不达门槛 → 停止放量",
    ]).map((k, i) => `${i + 1}. ${k}`),
    ``,
    `## 3. 本周动作`,
    ``,
    ...(decision?.mondayMoves || [
      "写一页《进入作战卡》",
      "选定唯一试点店",
      "定义杀出线数字",
    ]).map((m, i) => `${i + 1}. ${m}`),
    ``,
  ];

  if (research) {
    lines.push(
      `## 4. 市场扫描摘要`,
      ``,
      research.headline,
      ``,
    );
    if (research.scope) {
      lines.push(
        `| 项 | 内容 |`,
        `| --- | --- |`,
        `| 城市 | ${research.scope.city} |`,
        `| 品类 | ${research.scope.category} |`,
        `| 意图 | ${research.scope.intent} |`,
        `| 约束 | ${research.scope.constraint} |`,
        ``,
      );
    }
    for (const s of research.sections.slice(0, 6)) {
      lines.push(`### ${s.title}`, ``, s.body, ``);
    }
  }

  if (advisors?.strategies.length) {
    lines.push(`## 5. 三席进入方案对照（互斥）`, ``);
    lines.push(
      `| 席位 | 主策 | 牺牲 | 本周证明 | 杀出线 |`,
      `| --- | --- | --- | --- | --- |`,
    );
    for (const s of advisors.strategies) {
      const es = s.entryScheme;
      lines.push(
        `| ${advisorName(s.advisorId)} | ${s.oneLiner} | ${s.doNotDo} | ${es?.weekProof || s.proof} | ${es?.killLine || s.risk} |`,
      );
    }
    lines.push(``);
    for (const s of advisors.strategies) {
      const es = s.entryScheme;
      lines.push(
        `### ${advisorName(s.advisorId)}`,
        `- 主策：${s.oneLiner}`,
        es ? `- 场景切口：${es.sceneCut}` : "",
        es ? `- 主推：${es.menuPilot.join("；")}` : `- 证明：${s.proof}`,
        `- 不做：${s.doNotDo}`,
        `- 风险：${s.risk}`,
        s.crossFireNote ? `- 交火：${s.crossFireNote}` : "",
        ``,
      );
    }
  }

  if (warRoom.decisionCard) {
    const card = warRoom.decisionCard;
    lines.push(
      `## 6. 会议室决策卡`,
      ``,
      `**${card.title}** — ${card.question}`,
      ``,
      ...card.options.map(
        (o) =>
          `- **${o.seatName}**：${o.oneLiner}｜牺牲：${o.sacrifice}｜不选代价：${o.ifNot || "主轴旁落"}`,
      ),
      ``,
    );
  }

  if (entryPack) {
    lines.push(
      `## 7. 进入作战卡（可贴店）`,
      ``,
      entryPack.markdown,
      ``,
    );
  }

  lines.push(
    `## 8. 确认声明`,
    ``,
    `本人确认：以上进入主轴、取舍、否决条件与本周动作，作为当前阶段决策依据；未达否决条件前按此执行，触发否决条件则停手重开委员会。`,
    ``,
    `*MealKey M-MKT 市场战略委员会*`,
    ``,
  );

  return lines.filter((l) => l !== undefined).join("\n");
}

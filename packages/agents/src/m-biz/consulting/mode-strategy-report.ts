/**
 * M-BIZ 《商业模式战略报告》— 章节化决策包
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ResearchPack,
  WarRoomConsensus,
} from "../../consulting-os/types";
import type { ModeDeliveryPack } from "./types";

export function buildModeStrategyReport(input: {
  projectName?: string;
  answers: Record<string, string>;
  research?: ResearchPack;
  advisors?: AdvisorStrategySet;
  warRoom: WarRoomConsensus;
  decision?: DecisionArtifact;
  modePack?: ModeDeliveryPack | { markdown: string; wallCard?: string };
  advisorName: (id: string) => string;
}): string {
  const {
    projectName,
    answers,
    research,
    advisors,
    warRoom,
    decision,
    modePack,
    advisorName,
  } = input;
  const line = warRoom.consensusOneLiner || decision?.recommendation || "（待确认）";

  const lines: string[] = [
    `# 商业模式战略报告`,
    ``,
    `> ${projectName || "商业项目"} · ${answers.stage || "当前阶段"}`,
    `> MealKey 商业顾问委员会 · 决策包（非宣传稿）`,
    `> 状态：待创始人确认`,
    ``,
    `## 0. 本轮唯一问题`,
    ``,
    decision?.governingQuestion ||
      `未来 90 天，商业模式主航道到底押「${answers.priority || "利润/增长/品牌之一"}」，还是继续三线并行？`,
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
    ...(decision?.whatWeWontDo || ["不做三线并行"]).map((w) => `- ${w}`),
    ``,
    `## 2. 否决条件`,
    ``,
    ...(decision?.killCriteria || [
      "北极星指标连续 4 周无改善 → 回委员会改航道",
      "主推品无法证明模式 → 砍菜单宽度重做",
      "复制到第二点即走样 → 停止扩张",
    ]).map((k, i) => `${i + 1}. ${k}`),
    ``,
    `## 3. 本周动作`,
    ``,
    ...(decision?.mondayMoves || [
      "全员对齐唯一北极星",
      "砍掉冲突会议/活动",
      "拉出毛利·人效·主推品三张表",
    ]).map((m, i) => `${i + 1}. ${m}`),
    ``,
  ];

  if (research) {
    lines.push(`## 4. 商业体检摘要`, ``, research.headline, ``);
    if (research.scope) {
      lines.push(
        `| 项 | 内容 |`,
        `| --- | --- |`,
        `| 阶段 | ${answers.stage || research.scope.city} |`,
        `| 主矛盾 | ${answers.pain || research.scope.category} |`,
        `| 优先 | ${answers.priority || research.scope.intent} |`,
        `| 资源 | ${answers.resource || research.scope.constraint} |`,
        ``,
      );
    }
    for (const s of research.sections.slice(0, 7)) {
      lines.push(`### ${s.title}`, ``, s.body, ``);
    }
  }

  if (advisors?.strategies.length) {
    lines.push(`## 5. 四官模式方案对照（互斥）`, ``);
    lines.push(
      `| 官 | 主策 | 牺牲 | 本周证明 | 杀出线 |`,
      `| --- | --- | --- | --- | --- |`,
    );
    for (const s of advisors.strategies) {
      const ms = s.modeScheme;
      lines.push(
        `| ${advisorName(s.advisorId)} | ${s.oneLiner} | ${s.doNotDo} | ${ms?.weekProof || s.proof} | ${ms?.killLine || s.risk} |`,
      );
    }
    lines.push(``);
    for (const s of advisors.strategies) {
      const ms = s.modeScheme;
      lines.push(
        `### ${advisorName(s.advisorId)}`,
        `- 主策：${s.oneLiner}`,
        ms ? `- 证明计划：${ms.proofPlan.join("；")}` : `- 证明：${s.proof}`,
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
          `- **${o.seatName}**：${o.oneLiner}｜牺牲：${o.sacrifice}${o.ifNot ? `｜不选：${o.ifNot}` : ""}`,
      ),
      ``,
    );
  }

  if (modePack) {
    lines.push(
      `## 7. 模式作战卡（可贴周会）`,
      ``,
      "markdown" in modePack ? modePack.markdown : "",
      ``,
    );
  }

  lines.push(
    `## 8. 确认声明`,
    ``,
    `本人确认：以上商业主航道、取舍、否决条件与本周动作，作为当前 90 天决策依据；触发否决条件则停手重开委员会。`,
    ``,
    `*MealKey M-BIZ 商业顾问委员会*`,
    ``,
  );

  return lines.filter((l) => l !== undefined && l !== "").join("\n");
}

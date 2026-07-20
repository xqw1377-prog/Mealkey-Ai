/**
 * M-ED 《股权战略设计报告》
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ResearchPack,
  WarRoomConsensus,
} from "../../consulting-os/types";

export function buildEquityStrategyReport(input: {
  projectName?: string;
  answers: Record<string, string>;
  research?: ResearchPack;
  advisors?: AdvisorStrategySet;
  warRoom: WarRoomConsensus;
  decision?: DecisionArtifact;
  governancePack?: { markdown: string; wallCard?: string };
  advisorName: (id: string) => string;
}): string {
  const {
    projectName,
    answers,
    research,
    advisors,
    warRoom,
    decision,
    governancePack,
    advisorName,
  } = input;
  const line = warRoom.consensusOneLiner || decision?.recommendation || "（待确认）";

  const lines: string[] = [
    `# 股权战略设计报告`,
    ``,
    `> ${projectName || "股权项目"} · ${answers.stage || "当前阶段"}`,
    `> MealKey 股权治理委员会 · 决策包（非宣传稿）`,
    `> 状态：待创始人确认`,
    ``,
    `## 0. 本轮唯一问题`,
    ``,
    decision?.governingQuestion ||
      `针对「${answers.topic || "股权议题"}」，控制权、融资与激励三者，哪一条必须先锁死？`,
    ``,
    `## 1. 建议（一句话）`,
    ``,
    `**${line}**`,
    ``,
    `### 取舍`,
    ``,
    decision?.tradeoffAccepted || warRoom.blendNote || "接受会议冻结方向",
    ``,
    `### 为什么是这个`,
    ``,
    ...(decision?.whyThis || warRoom.consensusBullets || []).map((w) => `- ${w}`),
    ``,
    `### 明确不做`,
    ``,
    ...(decision?.whatWeWontDo || ["不做口头股权承诺"]).map((w) => `- ${w}`),
    ``,
    `## 2. 否决条件`,
    ``,
    ...(decision?.killCriteria || [
      "关键协议 30 天仍未落签 → 冻结融资/扩伙动作",
      "控制权条款被稀释突破底线 → 否决本轮交易",
      "激励池与贡献脱钩引发核心人出走风险 → 重开治理会",
    ]).map((k, i) => `${i + 1}. ${k}`),
    ``,
    `## 3. 本周动作`,
    ``,
    ...(decision?.mondayMoves || [
      "列出必须落签的 3 份文件",
      "写清控制权底线与否决事项",
      "画出当前 vs 目标股权结构一页图",
    ]).map((m, i) => `${i + 1}. ${m}`),
    ``,
    `## 4. 控制权底线表`,
    ``,
    `| 项 | 内容 |`,
    `| --- | --- |`,
    `| 控制权底线 | ${answers.control || "（待补）"} |`,
    `| 本轮议题 | ${answers.topic || "（待补）"} |`,
    `| 团队 | ${answers.team || "（待补）"} |`,
    `| 必须落签 | 章程 · 股东/合伙协议 · vesting |`,
    `| 否决事项 | 突破控制权底线的融资或扩伙条款 |`,
    ``,
  ];

  if (research) {
    lines.push(`## 5. 结构扫描摘要`, ``, research.headline, ``);
    for (const s of research.sections.slice(0, 7)) {
      lines.push(`### ${s.title}`, ``, s.body, ``);
    }
  }

  if (advisors?.strategies.length) {
    lines.push(`## 6. 四方治理方案对照（互斥）`, ``);
    lines.push(
      `| 席位 | 先锁什么 | 牺牲 | 本周证明 | 杀出线 |`,
      `| --- | --- | --- | --- | --- |`,
    );
    for (const s of advisors.strategies) {
      const gs = s.governScheme;
      lines.push(
        `| ${advisorName(s.advisorId)} | ${s.oneLiner} | ${s.doNotDo} | ${gs?.weekProof || s.proof} | ${gs?.killLine || s.risk} |`,
      );
    }
    lines.push(``);
    for (const s of advisors.strategies) {
      const gs = s.governScheme;
      lines.push(
        `### ${advisorName(s.advisorId)}`,
        `- 主策：${s.oneLiner}`,
        gs ? `- 必须落签：${gs.mustSign.join(" · ")}` : "",
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
      `## 7. 会议室决策卡`,
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

  if (governancePack) {
    lines.push(
      `## 8. 协议清单包（可交律师）`,
      ``,
      governancePack.markdown,
      ``,
    );
  }

  lines.push(
    `## 9. 确认声明`,
    ``,
    `本人确认：以上股权与治理主轴为当前决策依据，后续法律文件据此起草；触发否决条件则停手重开委员会。`,
    ``,
    `*MealKey M-ED 股权治理委员会*`,
    ``,
  );

  return lines.filter((l) => l !== undefined && l !== "").join("\n");
}

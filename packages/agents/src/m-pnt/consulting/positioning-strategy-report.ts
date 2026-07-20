/**
 * 步 5：定位策略报告 — 对齐顶级咨询交付骨架
 * 必须含：词权 / 品类定义 / 竞争框架 / RTB 证据 / 牺牲与不做 / 证明计划 / 战略取舍
 */
import type { BrandStrategyProject } from "./types";
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  MarketResearchPack,
  WarRoomConsensus,
} from "./journey-types";
import { ADVISOR_META } from "./journey-types";
import { buildStaffDeliveryPack } from "./execution-roadmap-engine";
import { ensureProofPlan } from "./strategy-meeting-engine";
import { formatMasterSchemeMarkdown } from "./master-scheme-engine";

function resolvePrimaryCard(
  war: WarRoomConsensus,
  advisors?: AdvisorStrategySet | null,
): AdvisorStrategyCard | undefined {
  if (!advisors?.strategies?.length) return undefined;
  if (war.userPreference && war.userPreference !== "blend") {
    return (
      advisors.strategies.find((s) => s.advisorId === war.userPreference) ||
      advisors.strategies[0]
    );
  }
  // 折中：以心智官为壳，用共识六段覆盖核心字段
  const ries = advisors.strategies.find((s) => s.advisorId === "ries");
  const trout = advisors.strategies.find((s) => s.advisorId === "trout");
  const ye = advisors.strategies.find((s) => s.advisorId === "ye");
  const base = ries || advisors.strategies[0]!;
  const stmt = war.consensusStatement;
  return {
    ...base,
    oneLiner: war.consensusOneLiner || base.oneLiner,
    forWhom: stmt?.forAudience || base.forWhom,
    jobToBeDone: stmt?.whoNeed || base.jobToBeDone,
    frameOfReference: stmt?.ourBrandIs || base.frameOfReference,
    proof: stmt?.because || base.proof,
    doNotDo: [base.doNotDo, trout?.doNotDo].filter(Boolean).join("；"),
    sacrifice: [base.sacrifice, trout?.sacrifice, ye?.sacrifice]
      .filter(Boolean)
      .slice(0, 2)
      .join("；"),
    proofPlan: {
      menu: ensureProofPlan(base).menu,
      script: ensureProofPlan(trout || base).script,
      scene: ensureProofPlan(ye || base).scene,
    },
  };
}

export function buildPositioningStrategyReportMarkdown(input: {
  projectName?: string;
  city?: string;
  research?: MarketResearchPack | null;
  advisors?: AdvisorStrategySet | null;
  warRoom: WarRoomConsensus;
}): string {
  const war = input.warRoom;
  const line = war.consensusOneLiner || "（待确认）";
  const stmt = war.consensusStatement;
  const pref =
    war.userPreference === "blend"
      ? "折中（有主辅）"
      : war.userPreference
        ? ADVISOR_META[war.userPreference].name
        : "会议";

  const primary = resolvePrimaryCard(war, input.advisors);
  const ries = input.advisors?.strategies.find((s) => s.advisorId === "ries");
  const trout = input.advisors?.strategies.find((s) => s.advisorId === "trout");
  const ye = input.advisors?.strategies.find((s) => s.advisorId === "ye");
  const ownedWord =
    war.ownedWord || ries?.battlefield || primary?.battlefield || "主定位";

  const lines: string[] = [
    `# 品牌定位策略报告`,
    ``,
    `| 项目 | 内容 |`,
    `| --- | --- |`,
    `| 品牌/项目 | ${input.projectName || "品牌项目"} |`,
    `| 城市 | ${input.city || "目标城市"} |`,
    `| 拍板 | ${pref} |`,
    `| 词权 | ${ownedWord} |`,
    `| 状态 | 待创始人确认 |`,
    ``,
    `---`,
    ``,
    `## 一、定位策略（核心页）`,
    ``,
  ];

  if (war.decisionCard?.markdown) {
    lines.push(
      `### 1.0 拍板依据（一页纸决策卡）`,
      ``,
      war.decisionCard.markdown,
      ``,
    );
  }

  lines.push(
    `### 1.1 一句话定位`,
    ``,
    `> **${line}**`,
    ``,
    war.blendNote ? `取舍说明：${war.blendNote}` : "",
    ``,
    `### 1.2 标准定位陈述（For / Who need / Our brand is / That / Because / Unlike）`,
    ``,
  );

  if (stmt) {
    lines.push(
      `| 结构 | 内容 |`,
      `| --- | --- |`,
      `| For（给谁） | ${stmt.forAudience} |`,
      `| Who need（要解决什么） | ${stmt.whoNeed} |`,
      `| Our brand is（我们是谁/参照系） | ${stmt.ourBrandIs} |`,
      `| That（核心利益） | ${stmt.thatValue} |`,
      `| Because（可信理由 · RTB） | ${stmt.because} |`,
      `| Unlike（不像谁） | ${stmt.unlike} |`,
      ``,
    );
  } else {
    lines.push(`（会议尚未形成结构化陈述——须先完成老板拍板）`, ``);
  }

  lines.push(
    `### 1.3 词权（Word Ownership）`,
    ``,
    `> 对外只拥有一个词：**「${ownedWord}」**`,
    ``,
    `- 菜单、话术、门头、投放不得并行第二主卖点`,
    `- 检验标准：路人能否用「${ownedWord}」复述本店`,
    ``,
  );

  if (primary) {
    lines.push(
      `### 1.4 牺牲与不做`,
      ``,
      `| 项 | 内容 |`,
      `| --- | --- |`,
      `| 必须牺牲 | ${primary.sacrifice} |`,
      `| 明确不做 | ${primary.doNotDo} |`,
      `| 主要风险 | ${primary.risk} |`,
      ``,
      `### 1.5 证明计划（本周可验）`,
      ``,
      `| 触点 | 动作 |`,
      `| --- | --- |`,
      `| 菜单 | ${primary.proofPlan?.menu || "待补全"} |`,
      `| 话术 | ${primary.proofPlan?.script || "待补全"} |`,
      `| 场景 | ${primary.proofPlan?.scene || "待补全"} |`,
      ``,
    );
  }

  if (war.minorityConstraints?.length) {
    lines.push(
      `### 1.6 三席并入终稿的强制约束`,
      ``,
      ...war.minorityConstraints.map((c) => `- ${c}`),
      ``,
    );
  }

  if (primary?.masterScheme) {
    lines.push(
      `### 1.7 拍板席完整方案（含话术）`,
      ``,
      formatMasterSchemeMarkdown(
        primary.masterScheme,
        ADVISOR_META[primary.advisorId].name,
      ),
      ``,
    );
  }

  // —— 战略骨架（顶级咨询报告必备）——
  lines.push(`## 二、战略诊断骨架`, ``);

  lines.push(
    `### 2.1 品类定义`,
    ``,
    `- 品类叙事：${input.research?.categoryTrend || primary?.frameOfReference || "（待补）"}`,
    `- 参照系：${stmt?.ourBrandIs || primary?.frameOfReference || "（待补）"}`,
    `- 我们要成为的第一：在「${ownedWord}」上成为目标客人的第一联想`,
    ``,
    `### 2.2 竞争框架`,
    ``,
  );

  if (input.research?.competitorBriefs?.length) {
    lines.push(`| 竞对 | 心智位 | 证据/威胁 |`);
    lines.push(`| --- | --- | --- |`);
    for (const b of input.research.competitorBriefs.slice(0, 6)) {
      lines.push(
        `| ${b.name} | ${b.mentalPosition || "—"} | ${(b.evidenceSentence || b.threatToWhitespace || b.summary || "—").slice(0, 60)} |`,
      );
    }
    lines.push(``);
  } else {
    lines.push(
      `- 竞争景观：${input.research?.competitiveLandscape || trout?.frameOfReference || "（待补竞对地图）"}`,
      `- 主要对照：${trout?.battlefield || "（空位官案）"}`,
      ``,
    );
  }

  lines.push(
    `### 2.3 Reason-to-Believe（证据链）`,
    ``,
    `- 主 RTB：${stmt?.because || primary?.proof || "（缺证据——不可签字当完成）"}`,
    ``,
  );
  if (input.research?.sources?.length) {
    lines.push(`| # | 来源摘要 |`);
    lines.push(`| --- | --- |`);
    input.research.sources.slice(0, 6).forEach((s, i) => {
      lines.push(
        `| ${i + 1} | ${(s.snippet || s.title || s.url || "").slice(0, 80)} |`,
      );
    });
    lines.push(``);
  } else if (input.research?.evidenceNotes?.length) {
    for (const n of input.research.evidenceNotes.slice(0, 5)) {
      lines.push(`- ${n}`);
    }
    lines.push(``);
  }

  lines.push(
    `### 2.4 为何不选其他席`,
    ``,
  );
  if (input.advisors?.strategies?.length) {
    for (const s of input.advisors.strategies) {
      const chosen =
        war.userPreference === "blend" ||
        war.userPreference === s.advisorId;
      const meta = ADVISOR_META[s.advisorId];
      lines.push(
        chosen
          ? `- **${meta.name}（采纳/并入）**：${s.oneLiner}`
          : `- **${meta.name}（降为约束，非主航道）**：${s.oneLiner} —— 风险：${s.risk}`,
      );
    }
    lines.push(``);
    if (input.advisors.synthesisNote) {
      lines.push(`合成备注：${input.advisors.synthesisNote}`, ``);
    }
  }

  if (input.research) {
    lines.push(
      `## 三、市场依据（摘要）`,
      ``,
      input.research.headline,
      ``,
      `- 空位：${input.research.whitespace}`,
      `- 品类：${input.research.categoryTrend}`,
      `- 客人：${input.research.consumerShift}`,
      `- 竞争：${input.research.competitiveLandscape}`,
      ``,
    );
  }

  if (input.advisors?.strategies?.length) {
    lines.push(`## 四、三席各出方案（互不合并）`, ``);
    lines.push(
      `> 心智官 / 空位官 / 冲突官各用各的框架。拍板后只执行一条主航道；落选席降为强制约束。`,
      ``,
    );
    for (const s of input.advisors.strategies) {
      const meta = ADVISOR_META[s.advisorId];
      if (s.masterScheme) {
        lines.push(
          formatMasterSchemeMarkdown(s.masterScheme, meta.name),
          ``,
        );
      } else {
        lines.push(
          `### ${meta.name}`,
          ``,
          `- 主轴：${s.oneLiner}`,
          `- 参照系：${s.frameOfReference}`,
          `- 差异：${s.pointOfDifference}`,
          `- RTB：${s.proof}`,
          `- 牺牲：${s.sacrifice}`,
          `- 话术：${s.proofPlan?.script || "待补全"}`,
          ``,
        );
      }
    }
    lines.push(`冲突纪要：${input.advisors.conflictSummary}`, ``);

    lines.push(`## 四附、顾问原策速览表`, ``);
    lines.push(`| 顾问 | 主轴 | 参照系 | 差异 | RTB | 牺牲 |`);
    lines.push(`| --- | --- | --- | --- | --- | --- |`);
    for (const s of input.advisors.strategies) {
      const meta = ADVISOR_META[s.advisorId];
      lines.push(
        `| ${meta.name} | ${s.oneLiner} | ${s.frameOfReference} | ${s.pointOfDifference} | ${(s.proof || "").slice(0, 36)} | ${s.sacrifice} |`,
      );
    }
    lines.push(``);
  }

  const challenges = (war.turns || []).filter((t) => t.kind === "challenge");
  const rebuttals = (war.turns || []).filter((t) => t.kind === "rebuttal");
  const revises = (war.turns || []).filter((t) => t.kind === "revise");
  if (challenges.length || rebuttals.length || revises.length) {
    lines.push(`## 五、会议室辩论纪要（质询→反驳→改策）`, ``);
    if (war.debateRoundCompleted) {
      lines.push(`- 本轮已完成至少一轮策略表修正（拍板依据修正后案卷）。`, ``);
    }
    for (const t of challenges) {
      lines.push(`- **质询** ${t.text.replace(/\n/g, " / ")}`);
    }
    for (const t of rebuttals) {
      lines.push(`- **反驳** ${t.text.replace(/\n/g, " / ")}`);
    }
    for (const t of revises) {
      lines.push(`- **改策** ${t.text.replace(/\n/g, " / ")}`);
    }
    lines.push(``);
  }

  lines.push(
    `## 六、确认声明`,
    ``,
    `本人确认：以上定位陈述、词权「${ownedWord}」、牺牲清单与证明计划，为当前阶段唯一主航道；菜单、话术、传播不得另起第二套主卖点。触发否决或需改主轴时，须重新召开品牌战略委员会。`,
    ``,
  );

  if (primary) {
    const ms = primary.masterScheme?.scripts;
    const staff = buildStaffDeliveryPack({
      oneLiner: line,
      proofPlan: ensureProofPlan(primary),
      doNotDo: primary.doNotDo,
      sacrifice: primary.sacrifice,
      forWhom: primary.forWhom,
      seatName: ADVISOR_META[primary.advisorId].name,
      masterScripts: ms
        ? {
            greeting: ms.greeting,
            counter: ms.counter,
            storefront: ms.storefront,
            forbidden: ms.forbidden,
          }
        : undefined,
    });
    lines.push(`---`, ``, staff.markdown);
  }

  lines.push(
    `---`,
    ``,
    `*MealKey M-PNT 品牌战略委员会 · 定位策略报告*`,
  );

  return lines.filter((l) => l !== undefined && l !== "").join("\n");
}

export function attachStrategyReportToProject(
  project: BrandStrategyProject,
  markdown: string,
): BrandStrategyProject {
  return {
    ...project,
    assets: {
      ...project.assets,
      journey: {
        ...project.assets.journey,
        strategyReportMarkdown: markdown,
        strategyConfirmedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

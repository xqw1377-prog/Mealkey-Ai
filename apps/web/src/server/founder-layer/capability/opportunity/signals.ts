/**
 * Opportunity O3 — Signal → Candidate（规则投影，非全网爬虫）
 */

import type { FounderMemorySnapshot } from "../../contracts";
import {
  buildOpportunity,
  type Opportunity,
} from "../../contracts/opportunity-runtime";
import { scoreCompanyFit } from "./fit";
import { applyOpportunityFailureDownweight } from "./memory-weight";

function stableOppId(parts: string[]): string {
  const raw = parts.join("|").slice(0, 120);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 33 + raw.charCodeAt(i)) | 0;
  return `opp_${Math.abs(h).toString(36)}`;
}

export function projectOpportunitiesFromSignals(input: {
  ownerId: string;
  projectId: string;
  memory?: FounderMemorySnapshot | null;
  validationSurprise?: {
    result: "aligned" | "partial" | "off";
    summary: string;
    hypothesis?: string;
  } | null;
  weakestScore?: number;
  failureLessons?: string[];
}): Opportunity[] {
  const out: Opportunity[] = [];
  const lessons = input.failureLessons || [];

  const push = (opp: Opportunity) => {
    const weighted = applyOpportunityFailureDownweight(opp, lessons);
    if (weighted.score >= 18) out.push(weighted);
  };

  // 规则 1：验证超预期
  const surprise = input.validationSurprise;
  if (
    surprise?.result === "aligned" &&
    /超预期|高于|增长|复购|客流|转化|验证通过/.test(surprise.summary)
  ) {
    const topic = surprise.hypothesis || surprise.summary;
    const companyFit = scoreCompanyFit({
      baseFit: 0.75,
      memory: input.memory,
      topic,
      weakestScore: input.weakestScore,
    });
    push(
      buildOpportunity({
        id: stableOppId([input.projectId, "val_aligned", topic.slice(0, 40)]),
        ownerId: input.ownerId,
        projectId: input.projectId,
        title: "验证超预期窗口",
        description: surprise.summary.slice(0, 200),
        type: "market",
        source: "user",
        factors: {
          marketAttractive: 0.82,
          companyFit,
          executionCapability: 0.72,
          timing: 0.88,
        },
        suggestExpert: "M-MKT",
        suggestedTopic: `放大已验证窗口：${topic.slice(0, 48)}`,
        confidence: 0.72,
      }),
    );
  }

  // 规则 1b：partial 但有正向信号 → 谨慎探索
  if (
    surprise?.result === "partial" &&
    /增长|改善|回升|复购|客单/.test(surprise.summary)
  ) {
    const topic = surprise.hypothesis || surprise.summary;
    const companyFit = scoreCompanyFit({
      baseFit: 0.65,
      memory: input.memory,
      topic,
      weakestScore: input.weakestScore,
    });
    push(
      buildOpportunity({
        id: stableOppId([input.projectId, "val_partial", topic.slice(0, 40)]),
        ownerId: input.ownerId,
        projectId: input.projectId,
        title: "部分验证的增长苗头",
        description: surprise.summary.slice(0, 200),
        type: "channel",
        source: "user",
        factors: {
          marketAttractive: 0.65,
          companyFit,
          executionCapability: 0.6,
          timing: 0.7,
        },
        suggestExpert: "M-BIZ",
        suggestedTopic: `小步放大部分验证：${topic.slice(0, 48)}`,
        confidence: 0.55,
      }),
    );
  }

  // 规则 2：Memory 成功模式
  const success = (input.memory?.patterns || []).find((p) => p.kind === "success");
  if (success) {
    const companyFit = scoreCompanyFit({
      baseFit: 0.8,
      memory: input.memory,
      topic: success.summary,
      weakestScore: input.weakestScore,
    });
    push(
      buildOpportunity({
        id: stableOppId([
          input.projectId,
          "mem_success",
          success.summary.slice(0, 40),
        ]),
        ownerId: input.ownerId,
        projectId: input.projectId,
        title: "成功模式可复制窗口",
        description: success.summary.slice(0, 200),
        type: "business_model",
        source: "memory",
        factors: {
          marketAttractive: 0.7,
          companyFit,
          executionCapability: 0.75,
          timing: 0.7,
        },
        suggestExpert: "M-BIZ",
        suggestedTopic: `是否放大成功模式：${success.summary.slice(0, 40)}`,
        confidence: 0.65,
      }),
    );
  }

  // 规则 3：能力短板窗口（Founder Growth Opportunity）— 非上课，是经营议题
  if (
    typeof input.weakestScore === "number" &&
    input.weakestScore < 45 &&
    success
  ) {
    const companyFit = scoreCompanyFit({
      baseFit: 0.55,
      memory: input.memory,
      topic: "能力补强后的扩张窗口",
      weakestScore: input.weakestScore,
      hasCapabilityGap: true,
    });
    push(
      buildOpportunity({
        id: stableOppId([input.projectId, "growth_window", String(input.weakestScore)]),
        ownerId: input.ownerId,
        projectId: input.projectId,
        title: "能力补强后的扩张窗口",
        description:
          `当前短板分 ${input.weakestScore}；若用一次决策验证补强，可承接已验证成功模式。`.slice(
            0,
            200,
          ),
        type: "product",
        source: "agent",
        factors: {
          marketAttractive: 0.6,
          companyFit,
          executionCapability: Math.max(0.35, input.weakestScore / 100),
          timing: 0.65,
        },
        suggestExpert: "M-ED",
        suggestedTopic: "能力短板补强后，是否具备下一阶段扩张条件",
        confidence: 0.5,
      }),
    );
  }

  // 规则 4：品类/定位空白线索（来自失败禁区的反向——市场有但我们规避过的邻近机会慎推）
  const categoryHint = (input.memory?.facts || []).find((f) =>
    /定位|品类|客群|心智/.test(`${f.label}${f.value}`),
  );
  if (categoryHint && surprise?.result === "aligned") {
    const topic = `${categoryHint.label}:${categoryHint.value}`;
    const companyFit = scoreCompanyFit({
      baseFit: 0.7,
      memory: input.memory,
      topic,
      weakestScore: input.weakestScore,
    });
    push(
      buildOpportunity({
        id: stableOppId([input.projectId, "category", topic.slice(0, 40)]),
        ownerId: input.ownerId,
        projectId: input.projectId,
        title: "品类心智可延伸窗口",
        description: topic.slice(0, 200),
        type: "category",
        source: "memory",
        factors: {
          marketAttractive: 0.68,
          companyFit,
          executionCapability: 0.65,
          timing: 0.7,
        },
        suggestExpert: "M-PNT",
        suggestedTopic: `定位延伸是否成立：${topic.slice(0, 40)}`,
        confidence: 0.58,
      }),
    );
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

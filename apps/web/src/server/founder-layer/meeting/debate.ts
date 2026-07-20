/**
 * Round 2/3 真辩论生成：有 Key 时 LLM 产出互挑战/收口发言；
 * 无 Key 或失败时回退到 meeting-runtime 投影。
 */

import {
  projectRuntimeRound2,
  projectRuntimeRound3,
} from "@/lib/meeting-runtime-deliberation";
import type {
  ConsensusDraft,
  ExpertStatement,
  MeetingConflict,
} from "@/lib/meeting";
import type { DeliberationResult } from "@/lib/meeting-deliberation";
import {
  resolveLlmModel,
  resolveLlmProvider,
  tryCreateSharedLlmAdapter,
} from "@/server/services/llm-polish";

const SEAT_LABEL: Record<string, { roleId: string; displayName: string }> = {
  "M-MKT": { roleId: "founder.M-MKT", displayName: "市场顾问" },
  "M-PNT": { roleId: "founder.M-PNT", displayName: "品牌顾问" },
  "M-BIZ": { roleId: "founder.M-BIZ", displayName: "商业顾问" },
  "M-ED": { roleId: "founder.M-ED", displayName: "组织顾问" },
  CHIEF: { roleId: "founder.CHIEF", displayName: "主持人" },
};

export type DebateRuntimeLike = {
  meeting: {
    recommendation?: string;
    conflicts: Array<{
      conflictId: string;
      summary: string;
      sideA: string;
      sideB: string;
      dimension: string;
      agents: readonly string[];
      drivingEvidenceIds?: string[];
    }>;
    rounds: Array<{
      round: number;
      title: string;
      items: Array<{
        agent: string;
        summary: string;
        stance?: string;
        challengeTo?: string;
        challengeEvidenceId?: string;
      }>;
    }>;
    conflictMatrix?: {
      rows?: Array<{
        topic: string;
        cells: Record<string, string>;
        summary: string;
        drivingEvidenceIds?: string[];
      }>;
      primary?: {
        topic: string;
        sideA: { agents: string[]; claim: string };
        sideB: { agents: string[]; claim: string };
        drivingEvidenceIds?: string[];
        question?: string;
      } | null;
      tradeoffs?: Array<{ keep: string; giveUp: string; why: string }>;
    };
  };
  decisions: Array<{
    decisionId: string;
    sourceAgent: string;
    judgement: string;
    stance?: string;
    risks: string[];
    nextSteps: string[];
    evidence?: Array<{
      evidenceId?: string;
      label?: string;
      content?: string;
    }>;
    evidenceGap?: string[];
  }>;
  finalDecision: {
    chosen: string;
    problem: string;
    reason: string[];
    validationPlan: string[];
  };
};

export type GenerateDebateRoundInput = {
  round: 2 | 3;
  topic: string;
  focusChoice?: string | null;
  previous: ExpertStatement[];
  runtime: DebateRuntimeLike;
};

export type GenerateDebateRoundResult = DeliberationResult & {
  source: "llm" | "projection";
};

type LlmStatement = {
  agent?: string;
  stance?: string;
  claim?: string;
  reasons?: string[];
  challengeTo?: string;
  challengeEvidenceId?: string;
};

type LlmDebatePayload = {
  statements?: LlmStatement[];
  conflict?: {
    issue?: string;
    positionA?: string;
    positionB?: string;
    conflictLabel?: string;
  } | null;
  consensus?: {
    summary?: string;
    proposedDecision?: string;
    coreReasons?: string[];
    nextActions?: string[];
    validationPlan?: string;
  } | null;
};

function seatOf(agent: string) {
  return SEAT_LABEL[agent] || SEAT_LABEL.CHIEF;
}

function normalizeStance(value: unknown): ExpertStatement["stance"] {
  if (value === "support" || value === "oppose" || value === "conditional" || value === "neutral") {
    return value;
  }
  return "conditional";
}

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "本轮仍需更多事实支撑。";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function projectFallback(input: GenerateDebateRoundInput): GenerateDebateRoundResult {
  const runtime = input.runtime as Parameters<typeof projectRuntimeRound2>[0]["runtime"];
  const base =
    input.round === 2
      ? projectRuntimeRound2({
          runtime,
          previous: input.previous,
          topic: input.topic,
        })
      : projectRuntimeRound3({
          runtime,
          previous: input.previous,
          topic: input.topic,
          focusChoice: input.focusChoice,
        });
  return { ...base, source: "projection" };
}

function parseDebateJson(content: string): LlmDebatePayload | null {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as LlmDebatePayload;
  } catch {
    return null;
  }
}

function mapLlmStatements(
  round: 2 | 3,
  payload: LlmDebatePayload,
  runtime: DebateRuntimeLike,
): ExpertStatement[] {
  const byAgent = new Map(
    (payload.statements ?? [])
      .filter((item) => typeof item.agent === "string" && item.agent)
      .map((item) => [String(item.agent), item]),
  );

  return runtime.decisions.map((decision) => {
    const draft = byAgent.get(decision.sourceAgent);
    const seat = seatOf(decision.sourceAgent);
    const claim =
      (typeof draft?.claim === "string" && draft.claim.trim()) ||
      (round === 2
        ? decision.risks[0] || decision.judgement
        : decision.nextSteps[0] || runtime.finalDecision.validationPlan[0] || decision.judgement);
    const reasons =
      Array.isArray(draft?.reasons) && draft.reasons.length > 0
        ? draft.reasons.map((item) => clip(String(item), 100)).slice(0, 3)
        : [clip(decision.judgement, 100)];

    return {
      id: `r${round}-llm-${decision.decisionId}`,
      roleId: seat.roleId,
      displayName: seat.displayName,
      round,
      stance: normalizeStance(draft?.stance ?? decision.stance),
      claim: clip(claim, 72),
      reasons,
      challengeTo:
        round === 2 && typeof draft?.challengeTo === "string" && draft.challengeTo.trim()
          ? draft.challengeTo.trim()
          : undefined,
      challengeEvidenceId:
        round === 2 &&
        typeof draft?.challengeEvidenceId === "string" &&
        draft.challengeEvidenceId.trim()
          ? draft.challengeEvidenceId.trim()
          : undefined,
    };
  });
}

function mapConflict(
  payload: LlmDebatePayload,
  runtime: DebateRuntimeLike,
): MeetingConflict | null {
  if (payload.conflict?.issue) {
    return {
      id: runtime.meeting.conflicts[0]?.conflictId || `conflict-${Date.now()}`,
      issue: clip(payload.conflict.issue, 120),
      positionA: clip(payload.conflict.positionA || runtime.meeting.conflicts[0]?.sideA || "一方主张谨慎", 100),
      positionB: clip(payload.conflict.positionB || runtime.meeting.conflicts[0]?.sideB || "一方主张推进", 100),
      conflictLabel: payload.conflict.conflictLabel || runtime.meeting.conflicts[0]?.dimension || "综合判断",
    };
  }
  const first = runtime.meeting.conflicts[0];
  if (!first) return null;
  return {
    id: first.conflictId,
    issue: first.summary,
    positionA: first.sideA,
    positionB: first.sideB,
    conflictLabel: first.dimension,
  };
}

function mapConsensus(
  payload: LlmDebatePayload,
  runtime: DebateRuntimeLike,
  topic: string,
  focusChoice?: string | null,
): ConsensusDraft {
  const fallbackJudgement =
    runtime.finalDecision.reason[0] ||
    runtime.meeting.recommendation ||
    `${runtime.finalDecision.chosen}：${runtime.finalDecision.problem}`;

  const consensus: ConsensusDraft = {
    summary: clip(
      (payload.consensus?.summary && payload.consensus.summary.trim()) ||
        `${topic}：${fallbackJudgement}`,
      120,
    ),
    proposedDecision: clip(
      (payload.consensus?.proposedDecision && payload.consensus.proposedDecision.trim()) ||
        runtime.meeting.recommendation ||
        fallbackJudgement,
      100,
    ),
    coreReasons:
      Array.isArray(payload.consensus?.coreReasons) && payload.consensus.coreReasons.length > 0
        ? payload.consensus.coreReasons.map((item) => String(item)).slice(0, 4)
        : runtime.finalDecision.reason.slice(0, 4),
    nextActions:
      Array.isArray(payload.consensus?.nextActions) && payload.consensus.nextActions.length > 0
        ? payload.consensus.nextActions.map((item) => String(item)).slice(0, 4)
        : [
            ...runtime.finalDecision.validationPlan,
            ...runtime.decisions.flatMap((d) => d.nextSteps),
          ]
            .filter(Boolean)
            .slice(0, 4),
    validationPlan:
      (payload.consensus?.validationPlan && payload.consensus.validationPlan.trim()) ||
      runtime.finalDecision.validationPlan.join("；") ||
      undefined,
  };

  if (focusChoice) {
    consensus.coreReasons = [`创始人关注：${focusChoice}`, ...consensus.coreReasons].slice(0, 4);
  }
  return consensus;
}

function optionsFromRuntime(runtime: DebateRuntimeLike) {
  const plan = runtime.finalDecision.validationPlan;
  return [
    {
      id: "opt-continue",
      label: "带条件推进",
      summary: runtime.meeting.recommendation || runtime.finalDecision.reason[0] || "按共识推进",
      tradeoff: plan[0] || "先完成关键验证再放大投入",
    },
    {
      id: "opt-hold",
      label: "暂缓决策",
      summary: "先补齐分歧点对应的事实与验证",
      tradeoff: plan[1] || runtime.finalDecision.reason[1] || "避免在分歧未解时放大动作",
    },
  ];
}

async function tryLlmDebate(input: GenerateDebateRoundInput): Promise<GenerateDebateRoundResult | null> {
  if (process.env.HEURISTIC_ONLY === "true") return null;

  const provider = resolveLlmProvider();
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") return null;

  const model = resolveLlmModel(provider);
  const roundLabel = input.round === 2 ? "挑战辩论" : "综合收口";
  const system =
    input.round === 2
      ? `你是餐饮创业战略会议的辩论导演。Round2 必须是观点冲突，不是轮流补充。每位顾问必须：1) 明确挑战另一席；2) 引用对方证据ID或指出证据缺口；3) 回答「为什么我的判断更重要」。只返回 JSON：{"statements":[{"agent":"M-MKT|M-PNT|M-BIZ|M-ED","stance":"support|oppose|conditional|neutral","claim":"不超过40字","reasons":["挑战对方证据或缺口","我的依据"],"challengeTo":"founder.M-BIZ","challengeEvidenceId":"E-xxx或空"}],"conflict":{"issue":"...","positionA":"...","positionB":"...","conflictLabel":"议题名"}}。不要编造未给出的数据。`
      : `你是餐饮创业战略会议的主持人助手。Round3 必须形成 Decision Trade-off（保留什么/放弃什么）。只返回 JSON：{"statements":[{"agent":"M-MKT|M-PNT|M-BIZ|M-ED","stance":"support|oppose|conditional|neutral","claim":"不超过40字","reasons":["..."]}],"consensus":{"summary":"...","proposedDecision":"...","coreReasons":["取舍：保留…/放弃…"],"nextActions":["..."],"validationPlan":"..."}}。不要编造未给出的数据。`;

  try {
    const response = await llm.chat({
      model,
      temperature: 0.4,
      maxTokens: 1200,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            topic: input.topic.slice(0, 300),
            focusChoice: input.focusChoice || null,
            decisions: input.runtime.decisions.map((d) => ({
              agent: d.sourceAgent,
              judgement: d.judgement,
              stance: d.stance,
              risks: d.risks.slice(0, 2),
              nextSteps: d.nextSteps.slice(0, 2),
              evidence: (
                "evidence" in d && Array.isArray((d as { evidence?: unknown[] }).evidence)
                  ? (d as { evidence: Array<{ evidenceId?: string; content?: string }> }).evidence
                  : []
              )
                .slice(0, 3)
                .map((e) => ({
                  evidenceId: e.evidenceId,
                  content: e.content,
                })),
            })),
            conflicts: input.runtime.meeting.conflicts.slice(0, 2),
            recommendation: input.runtime.meeting.recommendation,
            finalDecision: input.runtime.finalDecision,
            previousClaims: input.previous
              .filter((s) => s.round === 1 || s.round === 2)
              .map((s) => ({
                seat: s.displayName,
                round: s.round,
                claim: s.claim,
                stance: s.stance,
                evidence: s.evidence?.slice(0, 2),
              })),
          }),
        },
      ],
    });

    const parsed = parseDebateJson(response.content || "");
    if (!parsed?.statements?.length) return null;

    const roundStatements = mapLlmStatements(input.round, parsed, input.runtime);
    if (roundStatements.length === 0) return null;

    const previousKept =
      input.round === 2
        ? input.previous.filter((s) => s.round === 1)
        : input.previous.filter((s) => s.round === 1 || s.round === 2);

    return {
      round: input.round,
      statements: previousKept.concat(roundStatements),
      conflict: mapConflict(parsed, input.runtime),
      consensus:
        input.round === 3
          ? mapConsensus(parsed, input.runtime, input.topic, input.focusChoice)
          : null,
      options: optionsFromRuntime(input.runtime),
      source: "llm",
    };
  } catch {
    return null;
  }
}

/** 生成 Round2 挑战或 Round3 收口；失败自动投影降级 */
export async function generateDebateRound(
  input: GenerateDebateRoundInput,
): Promise<GenerateDebateRoundResult> {
  const llmResult = await tryLlmDebate(input);
  if (llmResult) return llmResult;
  return projectFallback(input);
}

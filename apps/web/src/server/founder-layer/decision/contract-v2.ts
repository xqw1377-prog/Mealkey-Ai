import type { FounderMission, FounderMissionType } from "../contracts/mission";
import type {
  CommitteeId,
  DecisionGateResult,
  DecisionIntent,
  DecisionStatus,
  DecisionTension,
  FounderDecisionContract,
} from "../contracts/decision-v2";
import type { FounderDecision } from "../contracts/decision";
import type { FounderMeeting } from "../contracts/meeting";
import type { Claim } from "../contracts/claim";
import type { ConflictMatrix } from "../contracts/debate";

const REQUIRED_DOMAINS: Record<DecisionIntent, CommitteeId[]> = {
  ENTER_MARKET: ["market", "brand", "business", "capital"],
  POSITION_BRAND: ["brand", "market"],
  BUILD_MODEL: ["business", "market"],
  RAISE_CAPITAL: ["capital", "business"],
  EXPAND: ["business", "market", "capital"],
  OPTIMIZE: ["business"],
  STOP: ["business", "capital"],
};

export function missionTypeToIntent(missionType: FounderMissionType): DecisionIntent {
  switch (missionType) {
    case "market_entry":
      return "ENTER_MARKET";
    case "positioning_review":
      return "POSITION_BRAND";
    case "business_diagnosis":
      return "BUILD_MODEL";
    case "organization_review":
      return "RAISE_CAPITAL";
    case "expansion_review":
      return "EXPAND";
    default:
      return "OPTIMIZE";
  }
}

export function agentToCommittee(agent: string): CommitteeId {
  if (agent === "M-MKT") return "market";
  if (agent === "M-PNT") return "brand";
  if (agent === "M-BIZ") return "business";
  return "capital";
}

function buildId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

function clip(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Decision Gate：证据 / 冲突 / 风险 → 是否可批准 */
export function runDecisionGate(input: {
  intent: DecisionIntent;
  seatDecisions: FounderDecision[];
  tensions: DecisionTension[];
  evidenceStatus?: "sufficient" | "insufficient";
}): DecisionGateResult {
  const required = REQUIRED_DOMAINS[input.intent];
  const present = new Set(
    input.seatDecisions.map((d) => agentToCommittee(d.sourceAgent)),
  );
  const missing = required.filter((domain) => !present.has(domain));

  const hardGaps = input.seatDecisions.flatMap((d) => d.evidenceGap ?? []);
  const insufficient =
    input.evidenceStatus === "insufficient" ||
    input.seatDecisions.some((d) => d.evidenceSufficient === false) ||
    hardGaps.length >= 2;

  const highTension = input.tensions.some((t) => t.opponents.length > 0 && t.supporters.length > 0);
  const capitalOppose = input.seatDecisions.some(
    (d) => d.sourceAgent === "M-ED" && d.stance === "oppose",
  );
  const bizOppose = input.seatDecisions.some(
    (d) => d.sourceAgent === "M-BIZ" && d.stance === "oppose",
  );

  if (missing.length > 0) {
    return {
      ready: false,
      status: "VALIDATION_REQUIRED",
      reason: `缺少必要委员会输入：${missing.join("、")}`,
      missingEvidenceDomains: missing,
      tensions: input.tensions,
    };
  }

  if (insufficient || capitalOppose || (input.intent === "EXPAND" && bizOppose)) {
    return {
      ready: false,
      status: "VALIDATION_REQUIRED",
      reason: insufficient
        ? hardGaps[0]
          ? `证据不足：${hardGaps[0]}`
          : "关键证据不足，需先验证再批准执行"
        : capitalOppose
          ? "资本委员会反对：资金/控制权约束未解除"
          : "商业委员会反对：复制/盈利模型未就绪",
      missingEvidenceDomains: insufficient ? ["market", "business"] : capitalOppose ? ["capital"] : ["business"],
      tensions: input.tensions,
    };
  }

  if (highTension) {
    return {
      ready: true,
      status: "READY_FOR_APPROVAL",
      reason: "存在顾问分歧，可带条件批准，但必须绑定验证任务",
      tensions: input.tensions,
    };
  }

  return {
    ready: true,
    status: "READY_FOR_APPROVAL",
    reason: "证据与委员会观点足以进入确认",
    tensions: input.tensions,
  };
}

export function buildClaimsFromSeatDecisions(input: {
  projectId: string;
  missionId: string;
  seatDecisions: FounderDecision[];
}): Claim[] {
  const now = new Date().toISOString();
  return input.seatDecisions.map((seat) => ({
    claimId: buildId("C"),
    projectId: input.projectId,
    missionId: input.missionId,
    statement: clip(seat.judgement, 160),
    domain: agentToCommittee(seat.sourceAgent) === "market"
      ? "market"
      : agentToCommittee(seat.sourceAgent) === "brand"
        ? "brand"
        : agentToCommittee(seat.sourceAgent) === "business"
          ? "business"
          : "capital",
    evidenceRefs: seat.evidence
      .map((e) => e.evidenceId)
      .filter((id): id is string => Boolean(id))
      .slice(0, 6),
    confidence: seat.confidence,
    sourceAgent: seat.sourceAgent,
    status: seat.evidenceSufficient === false ? "contested" : "supported",
    createdAt: now,
  }));
}

export function buildTensionsFromMatrix(
  matrix: ConflictMatrix | undefined,
): DecisionTension[] {
  if (!matrix?.primary) {
    return (matrix?.rows ?? [])
      .filter((row) => {
        const vals = Object.values(row.cells);
        return vals.includes("+") && (vals.includes("-") || vals.includes("--"));
      })
      .slice(0, 3)
      .map((row) => ({
        topic: row.topic,
        supporters: Object.entries(row.cells)
          .filter(([, c]) => c === "+")
          .map(([a]) => a),
        opponents: Object.entries(row.cells)
          .filter(([, c]) => c === "-" || c === "--")
          .map(([a]) => a),
        criticalEvidence: row.drivingEvidenceIds,
      }));
  }

  const p = matrix.primary;
  return [
    {
      topic: p.topic,
      supporters: p.sideA.agents,
      opponents: p.sideB.agents,
      criticalEvidence: p.drivingEvidenceIds,
      question: p.question,
    },
  ];
}

export function assembleFounderDecisionContract(input: {
  projectId: string;
  mission: FounderMission;
  meeting: FounderMeeting;
  seatDecisions: FounderDecision[];
  chosen: string;
  evidenceStatus?: "sufficient" | "insufficient";
  evidenceIds?: string[];
}): FounderDecisionContract {
  const now = new Date().toISOString();
  const intent = missionTypeToIntent(input.mission.missionType);
  const claims = buildClaimsFromSeatDecisions({
    projectId: input.projectId,
    missionId: input.mission.missionId,
    seatDecisions: input.seatDecisions,
  });
  const claimByAgent = new Map(
    claims.map((claim) => [claim.sourceAgent, claim] as const),
  );

  const committeeViews = input.seatDecisions.map((seat) => {
    const claim = claimByAgent.get(seat.sourceAgent);
    return {
      committee: agentToCommittee(seat.sourceAgent),
      agent: seat.sourceAgent,
      claimRefs: claim ? [claim.claimId] : [],
      position:
        seat.stance === "support" ||
        seat.stance === "oppose" ||
        seat.stance === "conditional"
          ? seat.stance
          : ("neutral" as const),
      reason: clip(seat.reasoning || seat.judgement, 160),
      evidenceRefs: seat.evidence
        .map((e) => e.evidenceId)
        .filter((id): id is string => Boolean(id))
        .slice(0, 4),
    };
  });

  const tensions = buildTensionsFromMatrix(input.meeting.conflictMatrix);
  const gate = runDecisionGate({
    intent,
    seatDecisions: input.seatDecisions,
    tensions,
    evidenceStatus: input.evidenceStatus,
  });

  const evidenceRefs = (input.evidenceIds ?? [])
    .slice(0, 16)
    .map((evidenceId) => ({
      evidenceId,
      role: "supports" as const,
    }));

  const risks = input.seatDecisions.flatMap((seat, seatIndex) =>
    seat.risks.slice(0, 2).map((statement, index) => ({
      riskId: `R-${seat.sourceAgent}-${index}`,
      statement: clip(statement, 120),
      severity:
        seat.stance === "oppose" ? ("high" as const) : ("medium" as const),
      ownerCommittee: agentToCommittee(seat.sourceAgent),
      mitigation: seat.nextSteps[0],
      evidenceRefs: seat.evidence
        .map((e) => e.evidenceId)
        .filter((id): id is string => Boolean(id))
        .slice(0, 2),
    })),
  ).slice(0, 8);

  const actions = [
    ...new Set(input.seatDecisions.flatMap((d) => d.nextSteps).filter(Boolean)),
  ]
    .slice(0, 4)
    .map((statement, index) => ({
      actionId: `A-${index + 1}`,
      statement: clip(statement, 100),
      owner: "老板",
      dueInDays: 90,
    }));

  const primaryMetric =
    intent === "EXPAND"
      ? ["开店周期", "坪效", "培训周期", "利润率"]
      : intent === "ENTER_MARKET"
        ? ["预约数量", "成交率", "复购率"]
        : intent === "POSITION_BRAND"
          ? ["品类词提及率", "一句话可复述率"]
          : ["关键指标达标", "风险未触发"];

  const validationGoal =
    input.meeting.recommendation ||
    input.seatDecisions.find((d) => d.validation)?.validation ||
    `验证「${input.chosen}」是否成立`;

  const decisionText =
    gate.status === "VALIDATION_REQUIRED"
      ? `暂不直接执行「${input.chosen}」，先完成验证：${clip(validationGoal, 60)}`
      : clip(
          input.meeting.recommendation ||
            `${input.chosen}：${input.mission.question}`,
          160,
        );

  const confidence =
    input.seatDecisions.length > 0
      ? input.seatDecisions.reduce((sum, d) => sum + d.confidence, 0) /
        input.seatDecisions.length
      : 0.5;

  return {
    decisionId: buildId("D"),
    projectId: input.projectId,
    missionId: input.mission.missionId,
    intent,
    claimRefs: claims.map((c) => c.claimId),
    decision: decisionText,
    evidenceRefs,
    confidence: Math.round(confidence * 100) / 100,
    claims,
    committeeViews,
    tensions,
    risks,
    actions:
      actions.length > 0
        ? actions
        : [
            {
              actionId: "A-1",
              statement: clip(validationGoal, 100),
              owner: "老板",
              dueInDays: 90,
            },
          ],
    validationPlan: {
      goal: clip(validationGoal, 120),
      hypothesis: clip(
        claims[0]?.statement || `「${input.chosen}」在当前约束下可成立`,
        120,
      ),
      metrics: primaryMetric,
      period: "90days",
      successCriteria:
        intent === "ENTER_MARKET"
          ? "成交率>20%"
          : intent === "EXPAND"
            ? "单店复制指标达基线"
            : "验证指标达预设门槛",
      killCriteria: risks[0]?.statement
        ? `若出现：${clip(risks[0].statement, 60)}，则停止放大`
        : "关键风险触发则停止放大",
    },
    memo: {
      title: "董事会决策备忘录",
      decision: decisionText,
      whyNow: clip(
        tensions[0]
          ? `核心冲突：${tensions[0].topic}`
          : gate.reason || "窗口与能力需要当场对齐",
        140,
      ),
      tradeoffs: tensions.slice(0, 2).map((t) =>
        clip(`${t.topic}：支持方与反对方并存`, 80),
      ).concat(
        risks.slice(0, 1).map((r) => clip(`接受风险：${r.statement}`, 80)),
      ).slice(0, 3),
      conditions: (actions.length ? actions : [{ statement: validationGoal }]).map((a) =>
        clip(("statement" in a ? a.statement : validationGoal) as string, 80),
      ).slice(0, 3),
      validation: clip(validationGoal, 100),
      killCriteria: risks[0]?.statement
        ? `若出现：${clip(risks[0].statement, 50)}，则停止放大`
        : "关键验证失败则停止放大",
      stopLine: "验证未过不开放加盟 / 不跨城复制",
      evidenceIds: evidenceRefs.map((e) => e.evidenceId).slice(0, 8),
    },
    status: gate.status,
    gate,
    problem: input.mission.question,
    createdAt: now,
    updatedAt: now,
  };
}

export function approveDecisionContract(
  contract: FounderDecisionContract,
  validationTaskId?: string,
): FounderDecisionContract {
  const nextStatus: DecisionStatus =
    contract.gate.status === "VALIDATION_REQUIRED" || !contract.gate.ready
      ? "EXECUTING"
      : "APPROVED";

  return {
    ...contract,
    status: nextStatus === "APPROVED" ? "APPROVED" : "EXECUTING",
    validationPlan: {
      ...contract.validationPlan,
      taskId: validationTaskId ?? contract.validationPlan.taskId,
    },
    updatedAt: new Date().toISOString(),
  };
}

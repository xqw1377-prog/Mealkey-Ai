/**
 * 决策室启发式意见 — 无 LLM 时也能跑通「真正开会」流程。
 * 立场按人格天然偏向制造冲突，供 UI / 单测 / 降级路径使用。
 * V2.1 升级：增强差异化 — 每位常委的 judgment/proposal/risks 基于其角色认知模型生成，
 * 不再是模板化拼接，而是结构化角色知识驱动。
 */

import { getRoleContract } from "./catalog";
import { getPersonaV2 } from "./persona-v2";
import type {
  CouncilOpinion,
  CouncilPosition,
  CouncilRoleId,
  EvidencePacket,
  ExpertEngineId,
  ExpertReport,
} from "./types";

const DEFAULT_STANCE: Record<CouncilRoleId, CouncilPosition> = {
  CSO: "support",
  CMO: "support",
  CBO: "conditional",
  BMO: "conditional",
  CFO: "oppose",
  COO: "conditional",
  CRO: "oppose",
};

/**
 * 为每位常委生成差异化的启发式判断。
 * 基于常委的：natural_bias + worldview + decision_model + veto_protocol + fear_function
 * 生成独特的 judgment / proposal / risks / needs_validation
 */
function buildRoleSpecificJudgment(
  member: CouncilRoleId,
  topic: string,
  position: CouncilPosition,
): {
  judgment: string;
  proposal: string;
  top_risk: string;
  needs_validation: string;
  reasoning: string[];
  risks: string[];
  conditions: string[];
} {
  const persona = getPersonaV2(member);
  const role = getRoleContract(member);
  const bias = persona.natural_bias;
  const worldview = persona.world_view;

  // 从判断模型第一步生成核心问题
  const firstStep = persona.decision_model.steps[0]?.ask || role.core_question;
  const secondStep = persona.decision_model.steps[1]?.ask || "";
  const fear1 = role.fear_function[0] || "";

  // 基于角色生成差异化的判断内容
  const memberJudgments: Record<CouncilRoleId, {
    support: string;
    oppose: string;
    conditional: string;
  }> = {
    CSO: {
      support: `从战略角度看，「${topic}」符合长期主航道方向。市场机会×竞争优势×组织能力三角评估为正，且时间窗口当前有利。建议推进并配置核心资源。`,
      oppose: `从战略角度看，「${topic}」存在战略漂移风险。当前资源承载能力不足，且该方向与主航道关联度不够。建议暂缓，聚焦现有优势阵地。`,
      conditional: `从战略角度看，「${topic}」方向可接受，但须满足：资源匹配到位、不削弱主航道竞争优势、窗口期成本可控。建议分阶段验证后决定。`,
    },
    CMO: {
      support: `从市场角度看，「${topic}」有真实需求支撑。用户痛点明确，替代方案不足，且需求规模与增长趋势支持进入。建议推进。`,
      oppose: `从市场角度看，「${topic}」的需求证据不足。核心问题：谁真的需要？用户现在怎么解决？没有替代方案可能是假需求。建议暂缓。`,
      conditional: `从市场角度看，「${topic}」有机会但需求证据密度不够。必须先完成最小的需求验证实验，确认支付意愿与频次。`,
    },
    CBO: {
      support: `从品牌角度看，「${topic}」不稀释现有品牌资产，且有潜力建立清晰的心智占位。差异化可一句话说明白。建议推进。`,
      oppose: `从品牌角度看，「${topic}」会稀释品牌认知。删掉品牌名后无法说出差异化印象，是产品描述而非品牌定位。建议放弃。`,
      conditional: `从品牌角度看，「${topic}」方向可行，但定位需收紧。必须能够回答：消费者为什么记住你？差异化一句话是什么？`,
    },
    BMO: {
      support: `从商业模式角度看，「${topic}」单位经济成立，利润来源清晰，且有复制能力。建议推进并设定关键利润变量的监控阈值。`,
      oppose: `从商业模式角度看，「${topic}」单位经济不成立。单店/单客层面亏损，靠规模掩盖而非解决。建议暂停。`,
      conditional: `从商业模式角度看，「${topic}」方向有潜力，但需验证单位经济。必须先跑通最小经济单元，确认每获得一个客户赚多少钱。`,
    },
    CFO: {
      support: `从资本角度看，「${topic}」投资回报可接受，现金跑道安全，回本周期的风险可控。建议在资金约束内推进。`,
      oppose: `从资本角度看，「${topic}」面临现金流断裂风险。若不依赖外部融资，模型无法存活。建议红线否决，直至资金约束被严格证明。`,
      conditional: `从资本角度看，「${topic}」须先明确：最大的现金黑洞在哪里？最坏情况下现金能否撑过验证期？满足后才可推进。`,
    },
    COO: {
      support: `从运营角度看，「${topic}」具备可执行性。关键流程已标准化，组织带宽可承载，且不依赖个别高手。建议推进。`,
      oppose: `从运营角度看，「${topic}」依赖个人能力，无标准化流程。第10家店会走样，新人无法上岗。建议红线否决。`,
      conditional: `从运营角度看，「${topic}」须先建立 SOP 并补齐关键编制。必须是普通人能执行的模式，而不是靠高手。`,
    },
    CRO: {
      support: `从风险角度看，「${topic}」的风险可识别、可缓释、有停损信号。最坏情况已设有安全边界。建议在缓释方案到位后推进。`,
      oppose: `从风险角度看，「${topic}」存在法律/合规/声誉硬伤，且无有效缓释方案。最坏情况不可承受。建议红线否决。`,
      conditional: `从风险角度看，「${topic}」须先完成风险分级并确认缓释方案可执行。谁按停止键？阈值是什么？必须明确。`,
    },
  };

  const selected = memberJudgments[member];
  const judgmentText = selected[position];
  const vetoHard = persona.veto_protocol.hard[0] || fear1;

  // 差异化的提案
  let proposal: string;
  if (position === "oppose") {
    proposal = `暂缓并验证「${firstStep}」；若验证通过则可重新审议。替代方案：${role.change_mind_if[0] || "缩小范围试点"}`;
  } else if (position === "conditional") {
    proposal = `先验证「${firstStep}」，再验证「${secondStep}」。满足条件后进入执行，设定 90 天验证周期与停损信号。`;
  } else {
    proposal = `执行并设定验证周期与 kill metric。重点监控「${fear1}」，在 90 天内检验核心假设。`;
  }

  // 差异化的风险
  const risks = [
    vetoHard,
    ...role.fear_function.slice(0, 2),
    `若忽视「${bias}」视角的警告，可能导致${fear1 || "不可逆损失"}`,
  ].filter(Boolean);

  // 差异化的需要验证
  const needs_validation = (position === "oppose" || position === "conditional")
    ? `首要验证「${firstStep}」。同时补齐证据：${role.evidence_preference.slice(0, 2).join("、")}。`
    : `监控核心变量：${role.evidence_preference.slice(0, 2).join("、")}。设定 kill metric 与 90 天复盘节点。`;

  const reasoning = [
    `【${persona.role_id}·${bias}】${worldview.slice(0, 60)}`,
    `判断模型第一步：${firstStep}`,
    position === "oppose" || position === "conditional"
      ? `恐惧驱动：${fear1}`
      : `依据：当前信息支持推进，但须持续验证`,
    `否决触发条件：${vetoHard}`,
  ];

  const conditions: string[] = [];
  if (position === "conditional") {
    conditions.push(`必须先验证：${firstStep}`);
    conditions.push(`同步验证：${secondStep}`);
  } else if (position === "oppose") {
    conditions.push(`须改判条件之一成立：${role.change_mind_if.slice(0, 2).join(" 或 ")}`);
  }
  if (persona.veto_protocol.hard.length > 0) {
    conditions.push(`红线⚡：${vetoHard} — 触发时自动否决`);
  }

  return {
    judgment: judgmentText,
    proposal,
    top_risk: vetoHard,
    needs_validation,
    reasoning,
    risks,
    conditions,
  };
}

function pickEvidence(
  roleId: CouncilRoleId,
  packet?: EvidencePacket,
  reports?: ExpertReport[],
): string[] {
  const engineHint =
    roleId === "CMO"
      ? "M-MKT"
      : roleId === "CBO"
        ? "M-PNT"
        : roleId === "BMO"
          ? "M-BIZ"
          : roleId === "CFO" || roleId === "CRO"
            ? "M-ED"
            : undefined;

  const items = packet?.items ?? [];
  const strengthRank = (s?: string) =>
    s === "strong" ? 3 : s === "medium" ? 2 : 1;

  const byEngine = items
    .filter((i) => engineHint && i.sourceAgent === engineHint)
    .sort((a, b) => strengthRank(b.strength) - strengthRank(a.strength))
    .slice(0, 2)
    .map((i) => i.evidenceId);
  if (byEngine.length) return byEngine;

  // 世界变化 / Brain / 强证：无席位引擎匹配时仍须引用真实证据，禁止空引用
  const contextual = items
    .filter(
      (i) =>
        i.sourceAgent === "WORLD" ||
        i.sourceAgent === "BRAIN" ||
        i.evidenceId.startsWith("WC-") ||
        i.evidenceId.startsWith("BR-") ||
        i.strength === "strong" ||
        i.category === "world_change" ||
        i.category === "brain_fact",
    )
    .sort((a, b) => strengthRank(b.strength) - strengthRank(a.strength))
    .slice(0, 2)
    .map((i) => i.evidenceId);
  if (contextual.length) return contextual;

  const any = [...items]
    .sort((a, b) => strengthRank(b.strength) - strengthRank(a.strength))
    .slice(0, 2)
    .map((i) => i.evidenceId);
  if (any.length) return any;

  // 无证据包时不得编造假 ID；允许用引擎 headline 标记但须可识别为 stub
  const fromReports = (reports ?? [])
    .filter((r) => !engineHint || r.engineId === engineHint)
    .slice(0, 1)
    .map((r) => `${r.engineId}-HEAD`);
  return fromReports;
}

function claimForEvidenceIds(
  ids: string[],
  packet?: EvidencePacket,
): string | undefined {
  if (!ids.length || !packet?.items?.length) return undefined;
  for (const id of ids) {
    const hit = packet.items.find((i) => i.evidenceId === id);
    if (hit?.claim) return hit.claim.slice(0, 72);
  }
  return undefined;
}

/** 启发式互质询：对立席位引用对方证据 ID，避免空挑战 */
function attachHeuristicChallenges(
  opinions: CouncilOpinion[],
  packet?: EvidencePacket,
): CouncilOpinion[] {
  const byMember = new Map(opinions.map((o) => [o.member, o]));
  const pairs: Array<[CouncilRoleId, CouncilRoleId]> = [
    ["CFO", "CSO"],
    ["CRO", "CMO"],
    ["COO", "BMO"],
    ["CBO", "CMO"],
    ["BMO", "CFO"],
    ["CSO", "CRO"],
  ];

  return opinions.map((op) => {
    const challenges: string[] = [...(op.challenge_to_others || [])];
    for (const [from, to] of pairs) {
      if (from !== op.member) continue;
      const target = byMember.get(to);
      if (!target) continue;
      if (target.position === op.position && op.position === "support") continue;
      const ev =
        target.evidence_used?.[0] ||
        op.evidence_used?.[0] ||
        packet?.items?.[0]?.evidenceId ||
        "（尚无证据ID）";
      const claim = claimForEvidenceIds(
        [target.evidence_used?.[0] || "", op.evidence_used?.[0] || ""].filter(
          Boolean,
        ),
        packet,
      );
      challenges.push(
        `→${to}：你方立场「${target.position}」依据 ${ev}${
          claim ? `（${claim}）` : ""
        } 是否经得起「${op.member}」视角的压力测试？`,
      );
    }
    // 证据缺口时自挑战
    if ((packet?.gaps?.length || 0) > 0 && challenges.length < 2) {
      challenges.push(
        `自检：证据缺口「${packet!.gaps![0]}」未关闭前，不可把条件支持说成强支持。`,
      );
    }
    return {
      ...op,
      challenge_to_others: challenges.slice(0, 3),
    };
  });
}

/** 校验并清洗意见中的 evidence_used，非法 ID 剔除并降权 */
export function sanitizeOpinionEvidence(
  opinion: CouncilOpinion,
  packet?: EvidencePacket,
): CouncilOpinion {
  const allowed = new Set((packet?.items ?? []).map((i) => i.evidenceId));
  // 允许引擎 HEAD 占位仅在无 packet 时；有 packet 时必须 ⊆ packet
  const used = (opinion.evidence_used ?? []).filter((id) => {
    if (!packet?.items?.length) {
      return id.endsWith("-HEAD") || id.startsWith("E-");
    }
    return allowed.has(id);
  });

  const missingHardEvidence = Boolean(packet?.items?.length) && used.length === 0;
  const inventedCleared =
    (opinion.evidence_used?.length ?? 0) > 0 &&
    used.length < (opinion.evidence_used?.length ?? 0);

  let position = opinion.position;
  let confidence = opinion.confidence;
  const conditions = [...(opinion.conditions ?? [])];
  const risks = [...(opinion.risks ?? [])];

  if (inventedCleared) {
    risks.unshift("已剔除不在证据包内的引用");
  }

  // 仅当有效引用为空时，禁止强支持
  if (missingHardEvidence) {
    if (position === "support") position = "conditional";
    confidence = Math.min(confidence, 58);
    if (!conditions.some((c) => c.includes("证据"))) {
      conditions.unshift("须引用证据包内有效 Evidence ID 后方可强支持");
    }
  }

  if (!packet?.items?.length && used.length === 0) {
    if (position === "support") position = "conditional";
    confidence = Math.min(confidence, 55);
    if (!conditions.some((c) => c.includes("证据包"))) {
      conditions.unshift("尚无证据包：本意见仅为启发式，须补证据后再表决");
    }
  }

  return {
    ...opinion,
    position,
    confidence,
    evidence_used: used,
    conditions: conditions.slice(0, 4),
    risks: risks.slice(0, 4),
    needs_validation:
      opinion.needs_validation ||
      (missingHardEvidence ? "补齐可核验证据后再确认立场" : opinion.needs_validation),
  };
}

/** 为花名册生成一轮可表决意见（含冲突）- V2.1 增强版 */
export function buildHeuristicOpinions(input: {
  roster: CouncilRoleId[];
  topic: string;
  evidencePacket?: EvidencePacket;
  expertReports?: ExpertReport[];
  /** 强制某席立场（专项会调试用） */
  forcePositions?: Partial<Record<CouncilRoleId, CouncilPosition>>;
}): CouncilOpinion[] {
  const topic = input.topic.trim() || "本议题";
  const base = input.roster.map((member) => {
    const persona = getPersonaV2(member);
    const role = getRoleContract(member);
    const position =
      input.forcePositions?.[member] ?? DEFAULT_STANCE[member];
    const evidence_used = pickEvidence(
      member,
      input.evidencePacket,
      input.expertReports,
    );
    const evidenceClaim = claimForEvidenceIds(
      evidence_used,
      input.evidencePacket,
    );

    // 使用差异化的角色驱动判断
    const spec = buildRoleSpecificJudgment(member, topic, position);
    const groundedJudgment = evidenceClaim
      ? `${spec.judgment} 依据：${evidenceClaim}`
      : spec.judgment;
    const groundedReasoning = evidenceClaim
      ? [...spec.reasoning.slice(0, 3), `证据锚点：${evidenceClaim}`]
      : spec.reasoning;

    const hasHardVeto =
      position === "oppose" && persona.veto_protocol.hard.length > 0;

    return {
      member,
      position,
      confidence: position === "support" ? 72 : position === "oppose" ? 78 : 66,
      summary: groundedJudgment.slice(0, 120),
      judgment: groundedJudgment.slice(0, 240),
      top_risk: spec.top_risk,
      proposal: spec.proposal.slice(0, 160),
      needs_validation: spec.needs_validation.slice(0, 120),
      reasoning: groundedReasoning.slice(0, 4),
      evidence_used,
      key_assumptions: [persona.world_view.slice(0, 80)],
      risks: spec.risks.slice(0, 3),
      conditions: spec.conditions.slice(0, 3),
      veto: hasHardVeto,
      veto_reason: hasHardVeto
        ? `红线⚡ ${spec.top_risk} — ${role.fear_function[0] || "触发否决条件"}`
        : undefined,
      minority_report: position === "oppose" || hasHardVeto,
    };
  }).map((op) => sanitizeOpinionEvidence(op, input.evidencePacket));

  return attachHeuristicChallenges(base, input.evidencePacket);
}

/** 按所需引擎生成占位 ExpertReport（无咨询资产时） */
export function buildStubExpertReports(input: {
  caseId: string;
  topic: string;
  engines: string[];
}): ExpertReport[] {
  const engines: ExpertEngineId[] = input.engines.length
    ? input.engines
        .filter(
          (engineId): engineId is ExpertEngineId =>
            engineId === "M-MKT" || engineId === "M-BIZ" || engineId === "M-PNT" || engineId === "M-ED",
        )
    : ["M-MKT", "M-BIZ", "M-PNT"];
  return engines.map((engineId) => ({
    engineId,
    caseId: input.caseId,
    headline: `${engineId} 对「${input.topic}」的初步专业意见（占位）`,
    stanceHint: "cautious" as const,
    sections: [
      {
        id: "summary",
        title: "摘要",
        content: `针对议题「${input.topic}」，${engineId} 建议常委会在证据不足处标注条件支持，而非无条件通过。`,
      },
    ],
    unknowns: ["完整咨询资产未挂载；本报告为决策室流程占位输入"],
  }));
}

export function buildStubEvidencePacket(input: {
  caseId: string;
  engines: string[];
}): EvidencePacket {
  const engines = input.engines.length ? input.engines : ["M-MKT", "M-BIZ"];
  return {
    caseId: input.caseId,
    generatedAt: new Date().toISOString(),
    items: engines.map((sourceAgent, i) => ({
      evidenceId: `E-${sourceAgent}-${String(i + 1).padStart(3, "0")}`,
      sourceAgent,
      claim: `${sourceAgent} 占位证据（待咨询室资产替换）`,
      strength: "medium" as const,
    })),
    gaps: ["尚未挂载完整 ExpertReport / 一手事实账本"],
  };
}

import type { DecisionEvidence, FounderDecision } from "../contracts/decision";
import type { FounderAgentName } from "../contracts/mission";
import type {
  EvidenceBindingResult,
  EvidenceDomain,
  EvidenceDraftItem,
  EvidenceNode,
  EvidenceSourceLevel,
} from "../contracts/evidence";
import {
  MIN_EVIDENCE_PER_JUDGEMENT,
  isHardEvidence,
} from "../contracts/evidence";
import type { EvidenceRegistry } from "./registry";

function domainForAgent(agent: FounderAgentName): EvidenceDomain {
  if (agent === "M-MKT") return "market";
  if (agent === "M-PNT") return "brand";
  if (agent === "M-BIZ") return "business";
  if (agent === "M-ED") return "capital";
  return "mixed";
}

function defaultSource(agent: FounderAgentName): string {
  if (agent === "M-MKT") return "市场引擎";
  if (agent === "M-PNT") return "品牌引擎";
  if (agent === "M-BIZ") return "商业引擎";
  if (agent === "M-ED") return "组织资本引擎";
  return "顾问引擎";
}

function clip(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toDraftsFromLegacy(evidence: DecisionEvidence[]): EvidenceDraftItem[] {
  return evidence
    .map((item) => ({
      label: item.label || "依据",
      content: item.content,
      confidence: item.confidence,
      type: "FACT" as const,
      sourceLevel: "engine_derived" as const,
    }))
    .filter((item) => item.content.trim());
}

/**
 * 将草案证据写入 Registry，并生成 Insight 节点与 DecisionEvidence 绑定。
 * 不足时用 ASSUMPTION 标缺口，但 ASSUMPTION 永不计入硬证据，sufficient 必须为 false。
 */
export function bindEvidenceToJudgement(input: {
  registry: EvidenceRegistry;
  projectId: string;
  missionId: string;
  agent: FounderAgentName;
  judgement: string;
  drafts: EvidenceDraftItem[];
  padFrom?: string[];
  reasoning?: string;
}): EvidenceBindingResult {
  const domain = domainForAgent(input.agent);
  const now = new Date().toISOString();
  const gaps: string[] = [];
  const drafts = [...input.drafts].filter((item) => item.content.trim());
  let paddedWithAssumptions = false;

  while (drafts.length < MIN_EVIDENCE_PER_JUDGEMENT) {
    paddedWithAssumptions = true;
    const pad = (input.padFrom ?? []).find(
      (item) => item.trim() && !drafts.some((d) => d.content.includes(item.slice(0, 16))),
    );
    if (pad) {
      drafts.push({
        label: "待验证假设",
        content: pad,
        type: "ASSUMPTION",
        source: "会议补齐",
        sourceLevel: "user_asserted",
        confidence: 0.35,
      });
      gaps.push(pad);
      continue;
    }
    const filler = `仍需补充可核验事实以支撑「${clip(input.judgement, 24)}」`;
    drafts.push({
      label: "证据缺口",
      content: filler,
      type: "ASSUMPTION",
      source: "Evidence Layer",
      sourceLevel: "user_asserted",
      confidence: 0.3,
    });
    gaps.push(filler);
  }

  const supportingNodes: EvidenceNode[] = drafts.slice(0, 5).map((draft) => {
    const type = draft.type ?? "FACT";
    const sourceLevel: EvidenceSourceLevel =
      draft.sourceLevel ?? (type === "ASSUMPTION" ? "user_asserted" : "engine_derived");
    const reliability =
      typeof draft.confidence === "number"
        ? Math.max(0.2, Math.min(1, draft.confidence))
        : sourceLevel === "engine_derived"
          ? 0.72
          : 0.45;

    return input.registry.ingest({
      id: input.registry.nextId(type === "SIGNAL" ? "S" : "E"),
      projectId: input.projectId,
      missionId: input.missionId,
      type,
      content: clip(draft.content, 160),
      source: draft.source || defaultSource(input.agent),
      sourceLevel,
      reliability,
      domain,
      agent: input.agent,
      createdAt: now,
      status: type === "ASSUMPTION" ? "draft" : "accepted",
    });
  });

  const hardNodes = supportingNodes.filter((n) =>
    isHardEvidence({ type: n.type, sourceLevel: n.sourceLevel }),
  );

  // 信号只从硬证据派生；纯假设链不得合成 SIGNAL 冒充实据
  if (hardNodes.length >= 2) {
    const signal = input.registry.ingest({
      id: input.registry.nextId("S"),
      projectId: input.projectId,
      missionId: input.missionId,
      type: "SIGNAL",
      content: clip(
        `${defaultSource(input.agent)}信号：${hardNodes
          .slice(0, 2)
          .map((n) => n.content)
          .join("；")}`,
        160,
      ),
      source: defaultSource(input.agent),
      sourceLevel: "engine_derived",
      reliability: 0.7,
      domain,
      agent: input.agent,
      createdAt: now,
      status: "accepted",
    });
    for (const node of hardNodes) {
      input.registry.link({
        fromId: node.id,
        toId: signal.id,
        relationType: "derived_from",
      });
    }
    supportingNodes.push(signal);
  }

  const insightReliability =
    hardNodes.length > 0
      ? Math.min(
          0.92,
          hardNodes.reduce((sum, n) => sum + n.reliability, 0) / hardNodes.length,
        )
      : 0.35;

  const insight = input.registry.ingest({
    id: input.registry.nextId("I"),
    projectId: input.projectId,
    missionId: input.missionId,
    type: "INSIGHT",
    content: clip(input.judgement, 160),
    source: defaultSource(input.agent),
    sourceLevel: "engine_derived",
    reliability: insightReliability,
    domain,
    agent: input.agent,
    createdAt: now,
    status: hardNodes.length >= 2 ? "accepted" : "draft",
  });

  for (const node of supportingNodes) {
    input.registry.link({
      fromId: node.id,
      toId: insight.id,
      relationType: "supports",
    });
  }

  const evidence: DecisionEvidence[] = supportingNodes
    .filter((node) => node.type !== "SIGNAL")
    .slice(0, MIN_EVIDENCE_PER_JUDGEMENT)
    .map((node, index) => {
      const draft = drafts[index];
      return {
        evidenceId: node.id,
        label: draft?.label || (node.type === "ASSUMPTION" ? "待验证假设" : "依据"),
        content: node.content,
        confidence: node.reliability,
        role: "supports" as const,
        source: node.source,
        sourceLevel: node.sourceLevel,
        type: node.type,
      };
    });

  const hardCount = evidence.filter((item) =>
    isHardEvidence({
      type: item.type ?? "FACT",
      sourceLevel: item.sourceLevel ?? "engine_derived",
    }),
  ).length;

  // 硬门禁：≥2 条硬证据，且不得靠假设填充冒充充分
  const sufficient =
    hardCount >= 2 &&
    !paddedWithAssumptions &&
    evidence.length >= MIN_EVIDENCE_PER_JUDGEMENT;

  if (!sufficient && gaps.length === 0) {
    gaps.push("硬证据不足，当前判断须标记为待验证");
  }

  const reasoning =
    input.reasoning ||
    (sufficient
      ? `基于 ${evidence.map((e) => e.evidenceId).join("、")} 形成判断`
      : `证据尚不充分（硬证据 ${hardCount}/2，假设填充=${paddedWithAssumptions ? "是" : "否"}），不得作为正式推进依据`);

  return {
    evidence,
    insightId: insight.id,
    gaps: [...new Set(gaps)].slice(0, 4),
    sufficient,
    reasoning,
  };
}

/** 给已有 FounderDecision 批量挂上 Evidence Layer */
export function attachEvidenceToDecisions(input: {
  registry: EvidenceRegistry;
  projectId: string;
  missionId: string;
  decisions: FounderDecision[];
  assetContextBlock?: string;
}): FounderDecision[] {
  const assetLines = (input.assetContextBlock || "")
    .split("\n")
    .map((line) => line.replace(/^[-•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 6)
    .slice(0, 4);

  return input.decisions.map((decision) => {
    const drafts = toDraftsFromLegacy(decision.evidence);
    if (assetLines[0] && drafts.length < MIN_EVIDENCE_PER_JUDGEMENT) {
      drafts.unshift({
        label: "企业资料",
        content: assetLines[0]!,
        type: "USER_INPUT",
        source: "用户资料",
        sourceLevel: "company_asset",
        confidence: 0.75,
      });
    }

    const bound = bindEvidenceToJudgement({
      registry: input.registry,
      projectId: input.projectId,
      missionId: input.missionId,
      agent: decision.sourceAgent,
      judgement: decision.judgement,
      drafts,
      padFrom: [...decision.risks, ...decision.nextSteps, ...assetLines.slice(1)],
      reasoning: decision.reasoning,
    });

    // 席位门禁：证据不足或启发式降级，不得强支持
    const isHeuristic = decision.metadata?.provider === "heuristic";
    const stance =
      (decision.stance === "support" && (!bound.sufficient || isHeuristic))
        ? ("conditional" as const)
        : decision.stance;

    const gaps = bound.gaps.length
      ? bound.gaps
      : decision.stance === "support" && !bound.sufficient
        ? ["证据不足硬事实，已降为有条件支持"]
        : bound.gaps;

    if (isHeuristic && !gaps.includes("启发式输出：不可作为正式推进依据")) {
      gaps.push("启发式输出：不可作为正式推进依据");
    }

    return {
      ...decision,
      stance,
      evidence: bound.evidence,
      reasoning: bound.reasoning,
      assumptions: bound.gaps.length ? bound.gaps : decision.assumptions,
      evidenceGap: gaps,
      evidenceSufficient: isHeuristic ? false : bound.sufficient,
      confidence: Math.min(
        decision.confidence,
        isHeuristic ? 0.5 : !bound.sufficient ? 0.55 : decision.confidence,
      ),
      validation:
        decision.validation ||
        decision.nextSteps[0] ||
        "先验证关键假设，再放大动作",
      metadata: {
        ...decision.metadata,
        missionId: decision.metadata?.missionId ?? input.missionId,
        producedAt: decision.metadata?.producedAt ?? new Date().toISOString(),
        insightId: bound.insightId,
        validationRequired: !bound.sufficient || isHeuristic,
      },
    };
  });
}

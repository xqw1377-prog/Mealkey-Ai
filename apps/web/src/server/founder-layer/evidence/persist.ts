/**

 * Founder 证据账本投影 — 把 Loop 内 EvidencePack 写入 profile.evidenceLedger

 * 注意：此处写入的是会议/引擎级证据，绝不是 validated_outcome（仅 Validation OS complete 可写）

 */



import type { EvidencePack, EvidenceRelation } from "../contracts/evidence";

import { isHardEvidence } from "../contracts/evidence";

import type { FounderDecision } from "../contracts/decision";

import type { EvidenceRegistry } from "./registry";



export type ProfileEvidenceLedgerRow = {

  id: string;

  type: string;

  content: string;

  source: string;

  sourceLevel: string;

  reliability: number;

  domain?: string;

  agent?: string;

  missionId?: string;

  status?: string;

  createdAt: string;

  origin: "founder_loop" | "validation_os" | "meeting_confirm";

};



export type LastEvidencePackSnapshot = {

  missionId?: string;

  nodeCount: number;

  relationCount: number;

  nodes: Array<{

    id: string;

    type: string;

    content: string;

    sourceLevel: string;

    agent?: string;

  }>;

  relations: EvidenceRelation[];

  projectedAt: string;

};



const LEDGER_MAX = 80;



function asLedger(raw: unknown): ProfileEvidenceLedgerRow[] {

  if (!Array.isArray(raw)) return [];

  return raw.filter(

    (row): row is ProfileEvidenceLedgerRow =>

      Boolean(row && typeof row === "object" && "id" in row),

  ) as ProfileEvidenceLedgerRow[];

}



/** 将 EvidencePack 节点投影进 profile.evidenceLedger（去重 prepend） */

export function mergeEvidencePackIntoProfile(

  profile: Record<string, unknown>,

  pack: EvidencePack | null | undefined,

  opts?: { missionId?: string },

): Record<string, unknown> {

  if (!pack?.nodes?.length) return profile;



  const existing = asLedger(profile.evidenceLedger);

  const byId = new Map(existing.map((row) => [row.id, row]));



  for (const node of pack.nodes) {

    // 禁止引擎路径冒充验证结果

    const sourceLevel =

      node.sourceLevel === "validated_outcome"

        ? "engine_derived"

        : node.sourceLevel;

    byId.set(node.id, {

      id: node.id,

      type: node.type,

      content: node.content,

      source: node.source,

      sourceLevel,

      reliability: node.reliability,

      domain: node.domain,

      agent: node.agent,

      missionId: opts?.missionId || node.missionId,

      status: node.status,

      createdAt: node.createdAt,

      origin: "founder_loop",

    });

  }



  const merged = [...byId.values()]

    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

    .slice(0, LEDGER_MAX);



  const lastEvidencePack: LastEvidencePackSnapshot = {

    missionId: opts?.missionId,

    nodeCount: pack.nodes.length,

    relationCount: pack.relations.length,

    nodes: pack.nodes.slice(0, 24).map((n) => ({

      id: n.id,

      type: n.type,

      content: n.content,

      sourceLevel:

        n.sourceLevel === "validated_outcome" ? "engine_derived" : n.sourceLevel,

      agent: n.agent,

    })),

    relations: pack.relations.slice(0, 40),

    projectedAt: new Date().toISOString(),

  };



  return {

    ...profile,

    evidenceLedger: merged,

    lastEvidencePack,

  };

}



/** 统计 ledger 中已核实结果条数 */

export function countValidatedOutcomeRows(ledger: unknown): number {

  return asLedger(ledger).filter((row) => row.sourceLevel === "validated_outcome")

    .length;

}



/**

 * 席位对立 → contradicts 关系

 * oppose / conditional 的 Insight 对 support Insight 形成可审计冲突边

 */

export function linkSeatContradictions(

  registry: EvidenceRegistry,

  decisions: FounderDecision[],

): number {

  const supportInsights = decisions

    .filter((d) => d.stance === "support" && d.metadata?.insightId)

    .map((d) => String(d.metadata!.insightId));

  const challengeInsights = decisions

    .filter(

      (d) =>

        (d.stance === "oppose" || d.stance === "conditional") &&

        d.metadata?.insightId,

    )

    .map((d) => String(d.metadata!.insightId));



  let linked = 0;

  for (const fromId of challengeInsights) {

    for (const toId of supportInsights) {

      if (fromId === toId) continue;

      registry.link({

        fromId,

        toId,

        relationType: "contradicts",

      });

      linked += 1;

    }

  }

  return linked;

}



/**

 * 验证证伪 → 在 lastEvidencePack / 关系快照上追加 contradicts

 */

export function appendInvalidationContradicts(

  profile: Record<string, unknown>,

  input: {

    resultEvidenceId: string;

    parentEvidenceIds?: string[];

  },

): Record<string, unknown> {

  const parents = (input.parentEvidenceIds || []).filter(Boolean);

  if (!parents.length) return profile;



  const snapshot = (profile.lastEvidencePack || {}) as Partial<LastEvidencePackSnapshot>;

  const relations = Array.isArray(snapshot.relations)

    ? [...snapshot.relations]

    : [];



  for (const parentId of parents.slice(0, 12)) {

    const exists = relations.some(

      (r) =>

        r.fromId === input.resultEvidenceId &&

        r.toId === parentId &&

        r.relationType === "contradicts",

    );

    if (!exists) {

      relations.push({

        fromId: input.resultEvidenceId,

        toId: parentId,

        relationType: "contradicts",

      });

    }

  }



  return {

    ...profile,

    lastEvidencePack: {

      ...snapshot,

      nodeCount: snapshot.nodeCount ?? 0,

      relationCount: relations.length,

      nodes: snapshot.nodes ?? [],

      relations: relations.slice(0, 80),

      projectedAt: new Date().toISOString(),

    } satisfies LastEvidencePackSnapshot,

  };

}



/**

 * 会议确认硬门禁：正式确认需 ≥2 条 parentEvidenceIds，或显式允许「仅假设」

 */

export function assertMeetingConfirmEvidence(input: {

  parentEvidenceIds?: string[];

  evidenceSufficient?: boolean;

  allowInsufficientEvidence?: boolean;

}): {

  mode: "formal" | "hypothesis";

  evidenceIds: string[];

} {

  const evidenceIds = [...new Set((input.parentEvidenceIds || []).filter(Boolean))];

  const formal =

    input.evidenceSufficient === true || evidenceIds.length >= 2;



  if (!formal && !input.allowInsufficientEvidence) {

    throw new Error(

      "确认失败：正式归档至少需要 2 条证据 ID（或 evidenceSufficient=true）。若仅为假设推进，请传 allowInsufficientEvidence=true。",

    );

  }



  return {

    mode: formal ? "formal" : "hypothesis",

    evidenceIds,

  };

}



/** 从决策证据列表统计硬证据数（供调用方预检） */

export function countHardDecisionEvidence(

  evidence: Array<{ type?: string; sourceLevel?: string }>,

): number {

  return evidence.filter((item) =>

    isHardEvidence({

      type: (item.type as never) || "FACT",

      sourceLevel: (item.sourceLevel as never) || "engine_derived",

    }),

  ).length;

}



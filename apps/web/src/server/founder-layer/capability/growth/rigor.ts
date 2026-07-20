/**

 * 能力严谨性聚合 — 验证样本 / 证据充分度 / 启发式占比

 */



export type CapabilityRigor = {

  evidenceSufficiency: "sufficient" | "insufficient" | "unknown";

  validatedOutcomeCount: number;

  heuristicRatio: number;

  heuristicShareLabel: string;

  openValidationCount: number;

};



function asRows(raw: unknown): Array<Record<string, unknown>> {

  if (!Array.isArray(raw)) return [];

  return raw.filter(

    (row): row is Record<string, unknown> =>

      Boolean(row && typeof row === "object"),

  );

}



export function buildCapabilityRigor(

  profile: Record<string, unknown>,

): CapabilityRigor {

  const ledger = asRows(profile.evidenceLedger);

  const validatedOutcomeCount = ledger.filter(

    (row) => String(row.sourceLevel || "") === "validated_outcome",

  ).length;



  const lastPack = profile.lastDecisionPack as

    | { evidenceStatus?: string }

    | undefined;

  const evidenceStatus = String(lastPack?.evidenceStatus || "");

  const evidenceSufficiency =

    evidenceStatus === "sufficient"

      ? "sufficient"

      : evidenceStatus === "insufficient"

        ? "insufficient"

        : "unknown";



  const lastEvidence = profile.lastEvidencePack as

    | { nodes?: Array<Record<string, unknown>> }

    | undefined;

  const packNodes = Array.isArray(lastEvidence?.nodes)

    ? lastEvidence!.nodes!

    : [];



  const loopNodes = ledger.filter(

    (row) => String(row.origin || "") === "founder_loop",

  );

  const sample =

    packNodes.length > 0

      ? packNodes

      : loopNodes.slice(0, 24).map((row) => ({

          type: row.type,

          sourceLevel: row.sourceLevel,

          content: row.content,

        }));



  const heuristicCount = sample.filter((n) => {

    const type = String(n.type || "");

    const level = String(n.sourceLevel || "");

    const content = String(n.content || "");

    return (

      type === "ASSUMPTION" ||

      level === "user_asserted" ||

      content.includes("启发式") ||

      content.includes("待核实")

    );

  }).length;



  const heuristicRatio =

    sample.length > 0

      ? Math.round((heuristicCount / sample.length) * 100) / 100

      : 0;



  const validationTasks = asRows(profile.validationTasks);

  const openValidationCount = validationTasks.filter((t) => {

    const status = String(t.status || t.lifecycle || "");

    return !["done", "completed", "cancelled", "failed", "superseded"].includes(

      status,

    );

  }).length;



  return {

    evidenceSufficiency,

    validatedOutcomeCount,

    heuristicRatio,

    heuristicShareLabel:

      sample.length === 0

        ? "尚无会议证据样本"

        : `${heuristicCount}/${sample.length} 条偏假设/启发式`,

    openValidationCount,

  };

}



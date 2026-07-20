/**

 * 议题指纹与判断冲突检测 — 防止同题悄悄漂移

 */



import { createHash } from "crypto";



const OPEN_OUTCOME_STATUSES = new Set([

  "hypothesis",

  "validating",

  "executing",

]);



/** 归一化议题文本，便于同题匹配 */

export function normalizeProblem(problem: string): string {

  return problem

    .normalize("NFKC")

    .trim()

    .toLowerCase()

    .replace(/\s+/g, " ")

    .replace(/^[\s·\-—,:;：；，。！？!?]+|[\s·\-—,:;：；，。！？!?]+$/g, "");

}



/** brandId|hash — 不同品牌互不冲突 */

export function problemFingerprint(

  brandId: string | null | undefined,

  problem: string,

): string {

  const normalized = normalizeProblem(problem);

  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);

  return `${brandId || "nobrand"}|${hash}`;

}



function polarityBucket(text: string): "neg" | "pos" | "neutral" {

  const t = normalizeProblem(text);

  if (/不|否|停止|暂缓|不宜|反对|取消|别|勿/.test(t)) return "neg";

  if (/继续|推进|扩张|进入|开放|启动|批准|同意|扩大/.test(t)) return "pos";

  return "neutral";

}



/** 判断两句 judgement 是否实质冲突（需修订案） */

export function judgementsConflict(a: string, b: string): boolean {

  const na = normalizeProblem(a);

  const nb = normalizeProblem(b);

  if (!na || !nb) return false;

  if (na === nb) return false;

  // 一方包含另一方且长度接近 → 视为强化，不冲突

  if (na.includes(nb) || nb.includes(na)) {

    const ratio =

      Math.min(na.length, nb.length) / Math.max(na.length, nb.length);

    if (ratio >= 0.72) return false;

  }

  const pa = polarityBucket(a);

  const pb = polarityBucket(b);

  if (pa !== "neutral" && pb !== "neutral" && pa !== pb) return true;

  // 归一化后差异足够大视为冲突（需显式修订）

  return na.slice(0, 24) !== nb.slice(0, 24);

}



export function parseDecisionOutcome(

  raw: unknown,

): Record<string, unknown> | null {

  if (!raw) return null;

  if (typeof raw === "string") {

    try {

      const parsed = JSON.parse(raw) as unknown;

      return parsed && typeof parsed === "object"

        ? (parsed as Record<string, unknown>)

        : null;

    } catch {

      return null;

    }

  }

  if (typeof raw === "object") return raw as Record<string, unknown>;

  return null;

}



export function isOpenDecisionOutcome(outcome: unknown): boolean {

  const o = parseDecisionOutcome(outcome);

  if (!o) return true; // 无 outcome 视为开放

  const status = String(o.status || "");

  if (status === "superseded" || status === "validated" || status === "done") {

    return false;

  }

  if (OPEN_OUTCOME_STATUSES.has(status)) return true;

  // 有反馈但未验证完成仍算开放议题链上的活案

  if (String(o.evidenceGrade || "") === "user_feedback") return true;

  return !status || status === "executing" || status === "validating";

}



export type RelatedOpenDecision = {

  id: string;

  problem: string;

  judgement: string;

  fingerprint: string;

  brandId?: string | null;

};



/**

 * 在候选决策中找「同指纹 + 开放 + 判断冲突」的旧案

 */

export function findConflictingOpenDecision(input: {

  candidates: Array<{

    id: string;

    problem: string;

    judgement: string;

    outcome: unknown;

  }>;

  brandId?: string | null;

  problem: string;

  judgement: string;

}): RelatedOpenDecision | null {

  const fp = problemFingerprint(input.brandId, input.problem);

  for (const row of input.candidates) {

    if (!isOpenDecisionOutcome(row.outcome)) continue;

    const outcome = parseDecisionOutcome(row.outcome);

    const rowFp =

      (typeof outcome?.problemFingerprint === "string" &&

        outcome.problemFingerprint) ||

      problemFingerprint(

        (typeof outcome?.brandId === "string" && outcome.brandId) ||

          input.brandId,

        row.problem,

      );

    if (rowFp !== fp) continue;

    if (!judgementsConflict(input.judgement, row.judgement)) continue;

    return {

      id: row.id,

      problem: row.problem,

      judgement: row.judgement,

      fingerprint: rowFp,

      brandId:

        (typeof outcome?.brandId === "string" && outcome.brandId) ||

        input.brandId,

    };

  }

  return null;

}



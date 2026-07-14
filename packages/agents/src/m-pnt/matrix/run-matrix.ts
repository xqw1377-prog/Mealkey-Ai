import type { MKContext } from "@mealkey/agent-sdk";
import { buildMatrixInputPackage } from "./input-package";
import {
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runCrossFireAgent,
  runSynthesisAgent,
} from "./agents";
import type {
  MatrixInputPackage,
  PositionCandidate,
  TheoryMatrixResult,
  TheoryView,
  TheoryLLMAdapter,
} from "./types";

/**
 * 运行三理论 Agent 矩阵（并行）
 *
 *   candidates / Input Package
 *        │
 *        ├─► Ries Agent ──┐
 *        ├─► Trout Agent ─┼─► Cross-Fire Agent ─► Synthesis Agent
 *        └─► Ye Agent ────┘
 */
/**
 * 运行三理论 Agent 矩阵
 *
 * - opts.llm 传入 → hybrid 模式（LLM 优先，heuristic 降级）
 * - opts.llm 不传 → 纯 heuristic 模式（无需 API Key，可独立运行）
 */
export async function runTheoryMatrix(
  context: MKContext,
  opts: {
    previousSummary?: string;
    candidates?: PositionCandidate[];
    /** LLM adapter，传入则 LLM→heuristic hybrid，不传则纯 heuristic */
    llm?: TheoryLLMAdapter;
  } = {},
): Promise<TheoryMatrixResult> {
  const started = Date.now();
  const inputPackage = buildMatrixInputPackage(context, opts);
  const evalOpts = opts.llm ? { llm: opts.llm } : undefined;

  // 三个理论 Agent 并行（LLM 优先，heuristic 降级）
  const [ries, trout, ye_maozhong] = await Promise.all([
    riesAgent.evaluate(inputPackage, evalOpts),
    troutAgent.evaluate(inputPackage, evalOpts),
    yeMaozhongAgent.evaluate(inputPackage, evalOpts),
  ]);

  const views = { ries, trout, ye_maozhong };

  const crossFire = await runCrossFireAgent(inputPackage, [
    ries,
    trout,
    ye_maozhong,
  ]);

  const synthesis = await runSynthesisAgent(inputPackage, views, crossFire);

  return {
    inputPackage,
    views,
    crossFire,
    synthesis,
    elapsedMs: Date.now() - started,
  };
}

/** 仅跑某一个理论 Agent（调试 / 单视角） */
export async function runSingleTheoryAgent(
  agentId: "ries" | "trout" | "ye_maozhong",
  context: MKContext,
  opts: { previousSummary?: string; candidates?: PositionCandidate[] } = {},
): Promise<TheoryView> {
  const pkg = buildMatrixInputPackage(context, opts);
  const map = {
    ries: riesAgent,
    trout: troutAgent,
    ye_maozhong: yeMaozhongAgent,
  };
  return map[agentId].evaluate(pkg);
}

export type { MatrixInputPackage, TheoryMatrixResult };

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
export async function runTheoryMatrix(
  context: MKContext,
  opts: {
    previousSummary?: string;
    candidates?: PositionCandidate[];
  } = {},
): Promise<TheoryMatrixResult> {
  const started = Date.now();
  const inputPackage = buildMatrixInputPackage(context, opts);

  // 三个理论 Agent 并行
  const [ries, trout, ye_maozhong] = await Promise.all([
    riesAgent.evaluate(inputPackage),
    troutAgent.evaluate(inputPackage),
    yeMaozhongAgent.evaluate(inputPackage),
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

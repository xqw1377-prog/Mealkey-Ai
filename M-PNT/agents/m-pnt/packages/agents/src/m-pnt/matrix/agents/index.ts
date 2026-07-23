import type { TheoryAgent, TheoryAgentId } from "../types";
import { riesAgent } from "./ries";
import { troutAgent } from "./trout";
import { yeMaozhongAgent } from "./ye-maozhong";

/** 三理论 Agent 注册表 — 每一个理论对应一个 Agent */
export const theoryAgents: TheoryAgent[] = [
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
];

export const theoryAgentMap: Record<TheoryAgentId, TheoryAgent> = {
  ries: riesAgent,
  trout: troutAgent,
  ye_maozhong: yeMaozhongAgent,
};

export { riesAgent } from "./ries";
export { troutAgent } from "./trout";
export { yeMaozhongAgent } from "./ye-maozhong";
export { runCrossFireAgent } from "./cross-fire";
export { runSynthesisAgent } from "./synthesis";

export function getTheoryAgent(id: TheoryAgentId): TheoryAgent {
  return theoryAgentMap[id];
}

/**
 * 定位理论蒸馏 — M-PNT 领域知识引擎
 *
 * 蒸馏来源：
 * - 里斯 (Al Ries) & 特劳特 (Jack Trout) — 定位理论 (Positioning Theory)
 * - 叶茂中 — 冲突理论 (Conflict Theory)
 *
 * 五层架构：
 * Layer 1: FACT — 定位理论知识事实
 * Layer 2: RULE — 定位决策规则（30+）
 * Layer 3: CASE — 定位实战案例（40+）
 * Layer 4: MODEL — 定位分析模型
 * Layer 5: EXPERIENCE — 大师定位智慧
 */

export { POSITIONING_FACTS } from "./facts";
export { POSITIONING_RULES } from "./rules";
export { POSITIONING_CASES } from "./cases";
export { POSITIONING_MODELS } from "./models";
export { POSITIONING_EXPERIENCES } from "./experiences";
export {
  matchPositioningRules,
  findPositioningCases,
  queryPositioningWisdom,
  searchPositioningKnowledge,
} from "./utils";

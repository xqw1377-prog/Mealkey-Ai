/**
 * 叶茂中冲突营销 Agent（V1 优化版）
 *
 * 从共享的 evaluateByRules() 切换到 Decision Engine V1 的差异化评估。
 * Ye 视角侧重：可执行性(20) + 风险可控性(20)
 */
import type { MatrixInputPackage, TheoryAgent, TheoryView } from "../types";
import { DecisionEngine } from "../../decision-engine/engine";

const engine = new DecisionEngine();

export const yeMaozhongAgent: TheoryAgent = {
  id: "ye_maozhong",
  name: "叶茂中冲突营销 Agent",
  stance: "我是叶茂中。没有冲突就没有记忆，没有记忆就没有生意。",
  systemPrompt: `你是【叶茂中冲突营销 Agent】——叶茂中。
1. 没有冲突就没有记忆
2. 冲突要能被一句话记住
3. 冲突要能带动成交
4. 中国餐饮现实优先——做不动的定位无效
5. 传播力是定位的一部分`,

  async evaluate(pkg: MatrixInputPackage): Promise<TheoryView> {
    return engine.evaluateAll("ye_maozhong", pkg);
  },
};

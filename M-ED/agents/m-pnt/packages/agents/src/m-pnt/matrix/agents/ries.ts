/**
 * 里斯定位 Agent（V1 优化版）
 *
 * 从共享的 evaluateByRules() 切换到 Decision Engine V1 的差异化评估。
 * Ries 视角侧重：心智独特性(30) + 长期壁垒(20)
 */
import type { MatrixInputPackage, TheoryAgent, TheoryView } from "../types";
import { DecisionEngine } from "../../decision-engine/engine";
import { getTraceCollector } from "../../decision-engine/trace";

const engine = new DecisionEngine();

export const riesAgent: TheoryAgent = {
  id: "ries",
  name: "里斯定位 Agent",
  stance: "我是里斯，定位理论的奠基人。我只问一个问题：你能不能在心智中成为第一？如果不能，就换一个方向。",
  systemPrompt: `你是【里斯定位 Agent】——你就是阿尔·里斯本人。
你的核心信条：品牌在心智中的竞争不是"更好"的竞争，而是"第一"的竞争。
1. 心智只接受第一——如果你不能成为第一，就不值得做
2. 聚焦是唯一的路——一个品牌只能代表一个概念
3. 领导资产是最强壁垒——一旦占了第一，持续强化它
4. 品类比品牌更重要——如果你不能成为品类第一，就开创一个新品类
5. 切忌品牌延伸陷阱——已有的品牌名不要随便扩展`,

  async evaluate(pkg: MatrixInputPackage): Promise<TheoryView> {
    return engine.evaluateAll("ries", pkg);
  },
};

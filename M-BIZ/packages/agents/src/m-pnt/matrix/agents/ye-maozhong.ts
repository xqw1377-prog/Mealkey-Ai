/**
 * 叶茂中冲突营销 Agent — V2 + LLM hybrid
 *
 * 理论体系：叶茂中冲突营销理论
 * - LLM 传入时：hybrid 模式
 * - LLM 不传时：纯 heuristic（7维冲突评估）
 */

import type {
  MatrixInputPackage,
  TheoryAgent,
  TheoryLLMAdapter,
  TheoryRecommend,
  TheoryView,
} from "../types";

const YE_LLM_PROMPT = `你是一位精通叶茂中冲突营销理论的首席定位顾问。
你的任务是严格按照冲突营销的7个维度，评估候选定位方向的优劣。

叶茂中冲突7维评估：
1. 冲突强度：消费者在这个痛点上的痛苦程度有多大？越痛机会越大。
2. 冲突层次：生理冲突（饿了累了）→ 心理冲突（想吃又怕胖）→ 社会冲突（别人有我也要），越高越好。
3. 左脑右脑：理性理由（值不值）和情感理由（想不想）是否齐备？
4. 可记忆性：冲突能不能被一句话说清楚、被消费者记住？
5. 可传播性：冲突有没有话题性，消费者愿不愿意分享？
6. 可成交性：冲突能不能驱动到店行为、产生复购？
7. 真实性：这个冲突是消费者真实存在的，还是老板想象出来的？

只输出一个 JSON 对象：
{
  "scores": [
    { "candidate_id": "A", "theory_score": 0-100, "analysis": "冲突分析...", "strengths": [], "weaknesses": [] }
  ],
  "recommended_id": "A",
  "reasoning": "总结",
  "risks": []
}`;

export const yeMaozhongAgent: TheoryAgent = {
  id: "ye_maozhong",
  name: "叶茂中冲突营销 Agent",
  stance:
    "叶茂中冲突营销：找到并放大冲突（旧秩序 vs 新选择）；让消费者记住对立面；冲突必须可传播、可成交、可验证。没有冲突就没有记忆。",

  systemPrompt: `你是【叶茂中冲突营销 Agent】（agent_id=ye_maozhong）。
你代表的理论体系是：叶茂中冲突营销理论。

评判标准（冲突7维度）：
1. 冲突强度：消费者在这个痛点上的痛苦程度有多大？
2. 冲突层次：生理/心理/社会冲突？
3. 左脑右脑：理性+感性理由是否齐备？
4. 可记忆性：能不能一句话记住？
5. 可传播性：有没有话题性？
6. 可成交性：能不能驱动到店？
7. 真实性：是真冲突还是假冲突？

最怕：正确但无冲突、假冲突（老板自嗨）、只有口号不能成交。`,

  async evaluate(
    pkg: MatrixInputPackage,
    options?: { llm?: TheoryLLMAdapter },
  ): Promise<TheoryView> {
    if (options?.llm) {
      try {
        const llmResult = await runYeLlm(pkg, options.llm);
        if (llmResult) return llmResult;
      } catch { /* fall through */ }
    }
    return runYeHeuristic(pkg);
  },
};

// ═══════════════════════════════════════════
// LLM 路径
// ═══════════════════════════════════════════

async function runYeLlm(
  pkg: MatrixInputPackage,
  llm: TheoryLLMAdapter,
): Promise<TheoryView | null> {
  const candidatesText = pkg.candidates
    .map((c) =>
      `[${c.id}] ${c.name}\n  一句话: ${c.oneLiner}\n  类型: ${c.type}`)
    .join("\n\n");

  const projectInfo = [
    pkg.project.name && `项目: ${pkg.project.name}`,
    pkg.project.category && `品类: ${pkg.project.category}`,
    pkg.project.city && `城市: ${pkg.project.city}`,
    pkg.project.budget && `预算: ${pkg.project.budget}万`,
  ].filter(Boolean).join(" | ");

  const strengthsText = pkg.owner.strengths.join("、") || "暂无";

  const response = await llm.chat({
    messages: [
      { role: "system", content: YE_LLM_PROMPT },
      {
        role: "user",
        content: [
          `## 项目信息\n${projectInfo || "未知"}\n`,
          `## 经营者优势\n${strengthsText}\n`,
          `## 候选定位方向\n${candidatesText}\n`,
          `请用叶茂中冲突7维评估逐一分析，输出 JSON。`,
        ].join("\n"),
      },
    ],
    temperature: 0.4, // 冲突评估可以稍微高一点温度，鼓励创意
    maxTokens: 2048,
  });

  const parsed = tryParseJson(response.content);
  if (!parsed?.scores || !Array.isArray(parsed.scores) || parsed.scores.length === 0) return null;

  const scores = (parsed.scores as Array<{ candidate_id: string; theory_score: number; analysis?: string }>);
  const mapped = scores.map((s) => ({
    id: s.candidate_id,
    name: pkg.candidates.find((x) => x.id === s.candidate_id)?.name || s.candidate_id,
    theory_score: clamp(s.theory_score),
    analysis: s.analysis || "",
  }));

  mapped.sort((a, b) => b.theory_score - a.theory_score);
  const best = mapped[0];
  const preferred = pkg.candidates.find((c) => c.id === best.id) || pkg.candidates[0];
  const theory_recommend = toYeRecommend(best.theory_score, preferred, pkg);

  const rejected = mapped
    .filter((s) => s.id !== best.id && s.theory_score < 55)
    .map((s) => ({ name: s.name, reason: `按冲突营销LLM：${s.analysis.slice(0, 60) || "冲突点不清或记不住"}` }));

  return {
    agent_id: "ye_maozhong",
    agent_name: yeMaozhongAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【冲突营销·LLM】「${preferred.oneLiner}」在冲突维度评估中最优：${best.analysis.slice(0, 100)}`,
    rejected_directions: rejected,
    core_strategic_logic: `叶茂中冲突7维LLM打分：${mapped.map((m) => `${m.name}=${m.theory_score}`).join(" | ")}。没有冲突就没有记忆。冲突必须能传播、能进店、能在30天验证。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildYeRisks(preferred, best, pkg),
    direction_scores: mapped.map((m) => ({ name: m.name, theory_score: m.theory_score, theory_recommend: toYeRecommend(m.theory_score, preferred, pkg) })),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.9, 0.5 + best.theory_score / 170),
  };
}

// ═══════════════════════════════════════════
// Heuristic 降级（V2 7维冲突）
// ═══════════════════════════════════════════

function runYeHeuristic(pkg: MatrixInputPackage): TheoryView {
  const candidates = pkg.candidates;
  const strengths = pkg.owner.strengths;
  const budget = Number(pkg.project.budget);

  const scores = candidates.map((c) => {
    const s = scoreByYeLaws(c, strengths, budget);
    return { id: c.id, theory_score: s.total, details: s.details };
  });

  scores.sort((a, b) => b.theory_score - a.theory_score);
  const best = scores[0];
  const preferred = candidates.find((c) => c.id === best.id) || candidates[0];
  const theory_recommend = toYeRecommend(best.theory_score, preferred, pkg);

  const rejected = scores
    .filter((s) => s.id !== best.id && s.theory_score < 55)
    .map((s) => ({ name: candidates.find((x) => x.id === s.id)!.name, reason: "按冲突营销：冲突点不清、记不住，或短期做不动/卖不动，不主张主推" }));

  return {
    agent_id: "ye_maozhong",
    agent_name: yeMaozhongAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【冲突营销】「${preferred.oneLiner}」在冲突维度评估中最优。${best.details ? best.details.slice(0, 80) : "冲突感最强、最容易形成记忆和传播"}。`,
    rejected_directions: rejected,
    core_strategic_logic: `叶茂中冲突7维打分（满分100）：${buildScoreSummary(scores, candidates)}。没有冲突就没有记忆。定位要制造「旧选择 vs 新选择」的张力。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildYeRisks(preferred, best, pkg),
    direction_scores: scores.map((s) => {
      const c = candidates.find((x) => x.id === s.id)!;
      return { name: c.name, theory_score: s.theory_score, theory_recommend: toYeRecommend(s.theory_score, c, pkg) };
    }),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.9, 0.5 + best.theory_score / 170),
  };
}

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

function tryParseJson(text: string): Record<string, unknown> | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try { const p = JSON.parse(raw); if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>; } catch { /* */ }
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>; } catch { /* */ } }
  return null;
}

function buildScoreSummary(
  scores: Array<{ id: string; theory_score: number; details: string }>,
  candidates: MatrixInputPackage["candidates"],
): string {
  return scores.map((s) => { const c = candidates.find((x) => x.id === s.id); return `${c?.name || s.id}=${s.theory_score}`; }).join(" | ");
}

function buildYeRisks(preferred: MatrixInputPackage["candidates"][0], best: { id: string; theory_score: number }, pkg: MatrixInputPackage) {
  const risks: TheoryView["main_risks"] = [];
  const text = preferred.oneLiner + preferred.name;
  if (!/冲突|对立|不|只|打破|而非/.test(text)) risks.push({ risk: "【冲突营销】冲突点偏弱，可能记不住也传不开", severity: "R2" });
  if (!pkg.owner.strengths.length) risks.push({ risk: "【冲突营销】冲突承诺缺少供给支撑，进店会穿帮", severity: "R3" });
  if (best.theory_score < 58) risks.push({ risk: "【冲突营销】方向好听但30天难验证冲突是否带动成交", severity: "R2" });
  if (/重新定义|品类开创/.test(text) && !pkg.owner.strengths.length) risks.push({ risk: "【冲突营销】冲突级别超过资源，假大空（禁止 primary）", severity: "R4" });
  if (risks.length === 0) risks.push({ risk: "【冲突营销】须用最小动作验证冲突记忆是否转化为到店与复购", severity: "R1" });
  return risks;
}

function scoreByYeLaws(c: MatrixInputPackage["candidates"][0], strengths: string[], budget: number): { total: number; details: string } {
  const text = c.oneLiner + c.name + c.focus;
  const parts: string[] = [];
  let score = 48;

  const hasConflict = /冲突|对立|打破|不|只|反对|颠覆|vs|VS|而非|不做|拒绝/.test(text);
  const hasPainPoint = /痛点|麻烦|烦|累|贵|难|慢|差|不够|没有/.test(text);

  if (hasConflict && hasPainPoint) { score += 22; parts.push("冲突+22（既有对立结构又有真实痛点）"); }
  else if (hasConflict) { score += 14; parts.push("冲突+14（有对立结构但缺乏痛点描述）"); }
  else if (hasPainPoint) { score += 8; parts.push("冲突+8（有痛点但没有对立结构）"); }
  else { score -= 10; parts.push("冲突-10（没有可感知的冲突点）"); }

  const hasSocial = /面子|身份|攀比|别人|社交|圈子|朋友圈/.test(text);
  const hasPsycho = /怕|担心|焦虑|纠结|选择困难|矛盾|想吃又怕/.test(text);
  if (hasSocial) { score += 18; parts.push("层次+18（社会冲突，传播力最强）"); }
  else if (hasPsycho) { score += 14; parts.push("层次+14（心理冲突，纠结感强）"); }
  else if (/场景|周末|聚餐|夜宵/.test(text)) { score += 10; parts.push("层次+10（生理/场景冲突）"); }
  else { score -= 3; parts.push("层次-3（冲突层次不清晰）"); }

  const hasLeft = /价格|性价比|实惠|划算|快|效率|方便|健康|品质/.test(text);
  const hasRight = /情怀|故事|文化|记忆|温暖|家|梦想|态度|潮/.test(text);
  if (hasLeft && hasRight) { score += 15; parts.push("左右+15（左脑理性+右脑感性兼备）"); }
  else if (hasLeft || hasRight) { score += 8; parts.push(`左右+8（仅${hasLeft ? "左脑理性" : "右脑感性"}，缺一维）`); }
  else { score -= 5; parts.push("左右-5（既没有购买理由也没有情感共鸣）"); }

  if (c.oneLiner.length < 25 && /冲突|对立|不|只|不是|而是/.test(c.oneLiner)) { score += 15; parts.push("记忆+15（一句话记住，冲突感强）"); }
  else if (c.oneLiner.length < 30) { score += 8; parts.push("记忆+8（比较简短）"); }
  else { score -= 5; parts.push("记忆-5（太长，记不住）"); }

  if (/争议|话题|新鲜|第一次|再也不|竟然|居然|vs|VS|打脸/.test(text)) { score += 10; parts.push("传播+10（有话题性，容易引发讨论）"); }
  else if (/不|只|打破|颠覆/.test(text)) { score += 6; parts.push("传播+6（有态度，适合传播）"); }
  else { score -= 3; parts.push("传播-3（缺少话题性）"); }

  if (/场景|周末|聚餐|夜宵|外卖|家庭|商务|一人/.test(text)) { score += 10; parts.push("成交+10（绑定了具体消费场景，容易驱动到店）"); }
  else if (/选|来|吃|喝|去/.test(text)) { score += 5; parts.push("成交+5（有行动暗示）"); }
  else { score -= 3; parts.push("成交-3（缺乏行动引导）"); }

  const fakeness = /重新定义|颠覆行业|改变世界|品类开创/.test(text);
  if (fakeness && !strengths.length) { score -= 10; parts.push("真实-10（冲突级别超过资源，假大空嫌疑）"); }
  else if (fakeness && strengths.length) { score += 3; parts.push("真实+3（有资源支撑的高调冲突）"); }
  else { score += 10; parts.push("真实+10（冲突与资源匹配，真实可落地）"); }

  if (Number.isFinite(budget) && budget > 0 && budget < 40) {
    if (/高端|精致|全国第一|重新定义/.test(text)) { score -= 15; parts.push("预算-15（预算不足40万但说要高端/全国第一，不现实）"); }
    else if (!/高端|精致/.test(text)) { score += 5; parts.push("预算+5（预算有限但定位务实）"); }
  }

  return { total: clamp(score), details: parts.join("；") };
}

function toYeRecommend(score: number, c?: MatrixInputPackage["candidates"][0], pkg?: MatrixInputPackage): TheoryRecommend {
  if (c && pkg && /重新定义|品类开创/.test(c.oneLiner) && !pkg.owner.strengths.length) return "not_recommend";
  if (score >= 82) return "strong_recommend";
  if (score >= 66) return "recommend";
  if (score >= 52) return "neutral";
  return "not_recommend";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

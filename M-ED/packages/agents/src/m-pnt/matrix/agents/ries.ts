/**
 * 里斯定位 Agent — V2 深度优化 + LLM hybrid
 *
 * 理论体系：里斯（Al Ries）定位理论
 * - LLM 传入时：hybrid 模式（LLM 优先，解析失败降级到 heuristic）
 * - LLM 不传时：纯 heuristic（V2 10条商规打分）
 */

import type {
  MatrixInputPackage,
  TheoryAgent,
  TheoryLLMAdapter,
  TheoryRecommend,
  TheoryView,
} from "../types";

const RIES_LLM_PROMPT = `你是一位精通里斯（Al Ries）定位理论的首席定位顾问。
你的任务是严格按照里斯定位理论的10条商规，评估候选定位方向的优劣。

里斯定位10条商规：
1. 领先定律：该方向能否在目标心智中成为"第一"？
2. 品类定律：该方向是否代表一个新品类/子品类？还是只是在现有品类中竞争？
3. 聚焦定律：该方向是否聚焦在"一个词/一个概念"？说清楚了吗？
4. 专有定律：这个概念被竞争对手占据了吗？还能不能占？
5. 对立定律：该方向是否位于领导品牌的对立面？是攻击强势背后的弱点吗？
6. 牺牲定律：该方向放弃了什么？放弃得够多吗？
7. 延伸定律：这个方向会导致品牌延伸、稀释核心定位吗？
8. 心智定律：这个概念容易进入消费者心智吗？简单吗？好记吗？
9. 阶梯定律：目标品类的心智阶梯是什么状态？这个方向能到达第几层？
10. 二元定律：该市场是否在走向二元竞争？我们站在哪一边？

只输出一个 JSON 对象，不要输出其他内容：
{
  "scores": [
    { "candidate_id": "A", "theory_score": 数值0-100, "analysis": "此方向的商规分析...", "strengths": ["优势1"], "weaknesses": ["风险1"] },
    { "candidate_id": "B", ... }
  ],
  "recommended_id": "A",
  "reasoning": "推荐理由总结",
  "risks": ["风险1", "风险2"]
}`;

export const riesAgent: TheoryAgent = {
  id: "ries",
  name: "里斯定位 Agent",
  stance:
    "里斯定位理论：在顾客心智中抢占第一位置；聚焦单一概念；建立可长期强化的领导资产。用10条商规检验每个方向。",

  systemPrompt: `你是【里斯定位 Agent】（agent_id=ries）。
你代表的理论体系是：里斯（Al Ries）定位理论。

评判标准（10条商规）：
1. 领先定律：该方向能否在目标心智中成为"第一"？
2. 品类定律：该方向是否代表一个新品类/子品类？
3. 聚焦定律：该方向是否聚焦在"一个词/一个概念"？
4. 专有定律：这个概念被竞争对手占据了吗？
5. 对立定律：该方向是否位于领导品牌的对立面？
6. 牺牲定律：该方向放弃了什么？放弃得够多吗？
7. 延伸定律：这个方向会导致品牌延伸吗？
8. 心智定律：这个概念容易进入消费者心智吗？
9. 阶梯定律：目标品类的心智阶梯是什么状态？
10. 二元定律：该市场正在走向二元竞争吗？

最怕：不聚焦、假品类、无法成为心智第一、什么都想要。`,

  async evaluate(
    pkg: MatrixInputPackage,
    options?: { llm?: TheoryLLMAdapter },
  ): Promise<TheoryView> {
    // ─── LLM hybrid 路径 ───
    if (options?.llm) {
      try {
        const llmResult = await runRiesLlm(pkg, options.llm);
        if (llmResult) return llmResult;
      } catch {
        // LLM 失败，降级到 heuristic
      }
    }

    // ─── heuristic 降级路径（V2 10条商规打分）───
    return runRiesHeuristic(pkg);
  },
};

// ═══════════════════════════════════════════
// LLM 路径
// ═══════════════════════════════════════════

async function runRiesLlm(
  pkg: MatrixInputPackage,
  llm: TheoryLLMAdapter,
): Promise<TheoryView | null> {
  const candidatesText = pkg.candidates
    .map(
      (c) =>
        `[${c.id}] ${c.name}\n  一句话: ${c.oneLiner}\n  类型: ${c.type}  聚焦: ${c.focus}`,
    )
    .join("\n\n");

  const projectInfo = [
    `项目: ${pkg.project.name || pkg.project.category || "未知"}`,
    `城市: ${pkg.project.city || "未知"}`,
    `品类: ${pkg.project.category || "未知"}`,
    `预算: ${pkg.project.budget ?? "未知"}`,
  ].join(" | ");

  const ownerInfo = [
    `经营者经验: ${pkg.owner.experience || "未知"}`,
    `优势: ${pkg.owner.strengths.join("、") || "未知"}`,
    `盲区: ${pkg.owner.weaknesses.join("、") || "未知"}`,
  ].join(" | ");

  const response = await llm.chat({
    messages: [
      {
        role: "system",
        content: RIES_LLM_PROMPT,
      },
      {
        role: "user",
        content: [
          `## 项目信息\n${projectInfo}\n`,
          `## 经营者画像\n${ownerInfo}\n`,
          `## 候选定位方向（共 ${pkg.candidates.length} 个）\n${candidatesText}\n`,
          `请用里斯10条商规逐一评估，输出 JSON。`,
        ].join("\n"),
      },
    ],
    temperature: 0.3,
    maxTokens: 2048,
  });

  const parsed = tryParseLLMJson(response.content);
  if (!parsed?.scores || !Array.isArray(parsed.scores) || parsed.scores.length === 0) {
    return null;
  }

  const scores = parsed.scores as Array<{
    candidate_id: string;
    theory_score: number;
    analysis?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;

  const mapped = scores.map((s) => {
    const c = pkg.candidates.find((x) => x.id === s.candidate_id);
    return {
      id: s.candidate_id,
      name: c?.name || s.candidate_id,
      theory_score: clamp(s.theory_score),
      analysis: s.analysis || "",
    };
  });

  mapped.sort((a, b) => b.theory_score - a.theory_score);
  const best = mapped[0];
  const preferred = pkg.candidates.find((c) => c.id === best.id) || pkg.candidates[0];
  const theory_recommend = toRecommend(best.theory_score);

  const rejected = mapped
    .filter((s) => s.id !== best.id && s.theory_score < 55)
    .map((s) => ({
      name: s.name,
      reason: `按里斯定位LLM评估：${s.analysis.slice(0, 60) || "聚焦不足或无法占据心智第一"}`,
    }));

  return {
    agent_id: "ries",
    agent_name: riesAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【里斯定位·LLM】「${preferred.oneLiner}」经10条商规LLM评估最优：${best.analysis.slice(0, 100)}`,
    rejected_directions: rejected,
    core_strategic_logic: `里斯定位10商规LLM打分：${mapped.map((m) => `${m.name}=${m.theory_score}`).join(" | ")}。领先+聚焦+牺牲是最高权重维度。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildRisks(preferred, best, pkg),
    direction_scores: mapped.map((m) => ({
      name: m.name,
      theory_score: m.theory_score,
      theory_recommend: toRecommend(m.theory_score),
    })),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.92, 0.55 + best.theory_score / 200),
  };
}

// ═══════════════════════════════════════════
// Heuristic 降级路径（V2 10条商规打分）
// ═══════════════════════════════════════════

function runRiesHeuristic(pkg: MatrixInputPackage): TheoryView {
  const candidates = pkg.candidates;
  const category = pkg.project.category || "餐饮";
  const city = pkg.project.city || "目标城市";
  const strengths = pkg.owner.strengths;
  const experience = pkg.owner.experience || "";

  const scores = candidates.map((c) => {
    const s = scoreByRiesLaws(c, category, city, strengths, experience);
    return { id: c.id, theory_score: s.total, details: s.details };
  });

  scores.sort((a, b) => b.theory_score - a.theory_score);
  const best = scores[0];
  const preferred = candidates.find((c) => c.id === best.id) || candidates[0];
  const theory_recommend = toRecommend(best.theory_score);

  const rejected = scores
    .filter((s) => s.id !== best.id && s.theory_score < 55)
    .map((s) => {
      const c = candidates.find((x) => x.id === s.id)!;
      const detail = best.details || "";
      return {
        name: c.name,
        reason: `按里斯定位：${detail.includes("聚焦") ? "聚焦不足，无法占据单一概念" : "在心智阶梯上位置不清晰，难成第一"}`,
      };
    });

  return {
    agent_id: "ries",
    agent_name: riesAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【里斯定位】「${preferred.oneLiner}」通过了10条商规检验。${best.details ? best.details.slice(0, 80) : "在心智第一与战略聚焦维度上最优"}。`,
    rejected_directions: rejected,
    core_strategic_logic: `里斯定位10商规打分（满分100）：${buildScoreSummary(scores, candidates)}。领先+聚焦+牺牲是最高权重维度。宁占一个可强化的第一，不占多个模糊的第二。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildRisks(preferred, best, pkg),
    direction_scores: scores.map((s) => {
      const c = candidates.find((x) => x.id === s.id)!;
      return { name: c.name, theory_score: s.theory_score, theory_recommend: toRecommend(s.theory_score) };
    }),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.92, 0.55 + best.theory_score / 200),
  };
}

// ═══════════════════════════════════════════
// 共享工具函数
// ═══════════════════════════════════════════

function tryParseLLMJson(text: string): Record<string, unknown> | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch { /* ignore */ }
    }
  }
  return null;
}

function buildScoreSummary(
  scores: Array<{ id: string; theory_score: number; details: string }>,
  candidates: MatrixInputPackage["candidates"],
): string {
  return scores
    .map((s) => {
      const c = candidates.find((x) => x.id === s.id);
      return `${c?.name || s.id}=${s.theory_score}`;
    })
    .join(" | ");
}

function buildRisks(
  preferred: MatrixInputPackage["candidates"][0],
  best: { id: string; theory_score: number; details?: string },
  pkg: MatrixInputPackage,
) {
  const risks: TheoryView["main_risks"] = [];
  const text = preferred.oneLiner + preferred.name;
  if (best.theory_score < 60) {
    risks.push({ risk: "【里斯】最优方向仍未通过10条商规检验，聚焦或第一性不足", severity: "R3" });
  }
  if (/大而全|所有/.test(text)) {
    risks.push({ risk: "【里斯】表述过宽,犯了什么都想讲的聚焦大忌", severity: "R4" });
  }
  if (!/第一|首选|开创|品类/.test(text) && best.theory_score < 70) {
    risks.push({ risk: "【里斯】无第一潜力也无新品类定义，在心智中容易被忽视", severity: "R3" });
  }
  if (!pkg.owner.strengths.length) {
    risks.push({ risk: "【里斯】领导资产/占位能力未证明", severity: "R2" });
  }
  if (risks.length === 0) {
    risks.push({ risk: "【里斯】须用同一心智概念持续强化，防扩展冲淡第一", severity: "R1" });
  }
  return risks;
}

function scoreByRiesLaws(
  c: MatrixInputPackage["candidates"][0],
  category: string,
  city: string,
  strengths: string[],
  experience: string,
): { total: number; details: string } {
  const text = c.oneLiner + c.name + c.focus;
  const parts: string[] = [];
  let score = 50;

  if (/第一|首选|开创|首家|领先|开创者|第一个/.test(text)) {
    score += 15; parts.push("领先+15（有第一潜力）");
  } else if (/唯一|只此/.test(text)) {
    score += 10; parts.push("领先+10（有唯一性）");
  } else if (/更好|更优/.test(text)) {
    score -= 8; parts.push("领先-8(更好是陷阱,不能替代第一)");
  } else {
    score -= 5; parts.push("领先-5（没有第一潜力）");
  }

  if (/品类|新|开创|分化|细分|子品类/.test(text)) {
    score += 12; parts.push("品类+12（有新品类感）");
  } else if (c.type.includes("进攻") || c.focus.includes("竞争")) {
    score += 5; parts.push("品类+5（有竞争角度，但新品类不足）");
  } else {
    score -= 3; parts.push("品类-3（缺乏新品类定义）");
  }

  const focusWords = c.oneLiner.split(/[，,。.、]/).length;
  if (focusWords <= 1 && c.oneLiner.length < 20) {
    score += 15; parts.push("聚焦+15（一句话说清，极度聚焦）");
  } else if (focusWords <= 2) {
    score += 8; parts.push("聚焦+8（比较聚焦）");
  } else {
    score -= 10; parts.push("聚焦-10（一句话说了太多东西）");
  }
  if (/大而全|所有人|全能|又.*又|不仅|而且/.test(text)) {
    score -= 12; parts.push("聚焦-12（大而全，犯了聚焦大忌）");
  }

  if (/不|只|拒绝|不做|反对/.test(text)) {
    score += 10; parts.push("专有+10(不/只暗示了专有空间)");
  } else if (/独特|专属|自有的/.test(text)) {
    score += 5; parts.push("专有+5（有专有性）");
  } else {
    parts.push("专有0（需要确认这个词是否已被占据）");
  }

  if (/对立|反面|不同|不是.*而是|vs|VS|而非|打破/.test(text)) {
    score += 10; parts.push("对立+10（有明确的对立结构）");
  } else if (c.focus.includes("竞争") || c.type.includes("进攻")) {
    score += 6; parts.push("对立+6（有竞争意识但对立不够锋利）");
  } else {
    score -= 5; parts.push("对立-5（没有对立方向，可能被淹没）");
  }

  if (/只|专|聚焦|不做|拒绝|放弃|单一/.test(text)) {
    score += 10; parts.push("牺牲+10（明确了放弃什么）");
  } else if (/场景|特定|某一/.test(text)) {
    score += 5; parts.push("牺牲+5（有场景聚焦但牺牲不够极端）");
  } else {
    score -= 5; parts.push("牺牲-5（什么都要=什么都得不到）");
  }

  if (/场景|画面感|记得|一句话/.test(text) || c.oneLiner.length < 25) {
    score += 10; parts.push("心智+10（容易进入心智，好记）");
  } else if (c.oneLiner.length < 40) {
    score += 5; parts.push("心智+5（比较简洁）");
  } else {
    score -= 3; parts.push("心智-3（太复杂，心智不接受）");
  }

  if (/第一|首选|领导/.test(text)) {
    score += 8; parts.push("阶梯+8（瞄准第一阶梯）");
  } else if (/第二|挑战/.test(text)) {
    score += 4; parts.push("阶梯+4（瞄准第二阶梯）");
  } else {
    parts.push("阶梯0（阶梯位置不明确）");
  }

  if (/二元|两极|两大/.test(text) || (c.focus.includes("竞争") && score > 60)) {
    score += 5; parts.push("二元+5（有二元竞争意识）");
  } else {
    parts.push("二元0");
  }

  if (/又.*又|不仅|综合|全面|多元/.test(text)) {
    score -= 5; parts.push("延伸-5（有品牌延伸风险）");
  } else if (/只|专|聚焦/.test(text)) {
    score += 5; parts.push("延伸+5（聚焦单一，避免延伸）");
  } else {
    parts.push("延伸0");
  }

  if (/餐饮|连锁|品牌|门店/.test(experience)) {
    score += 5; parts.push("资源+5（经营者有餐饮经验）");
  }
  if (strengths.some((s) => /品牌|营销|战略/.test(s))) {
    score += 3; parts.push("资源+3（经营者有品牌能力）");
  }

  const total = clamp(score);
  const details = parts.join("；");
  return { total, details };
}

function toRecommend(score: number): TheoryRecommend {
  if (score >= 82) return "strong_recommend";
  if (score >= 68) return "recommend";
  if (score >= 55) return "neutral";
  return "not_recommend";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

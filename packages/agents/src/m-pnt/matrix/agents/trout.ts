/**
 * 空位官 Agent — MK-RIVAL（竞争空位学派）
 */
import type {
  MatrixInputPackage,
  TheoryAgent,
  TheoryLLMAdapter,
  TheoryRecommend,
  TheoryView,
} from "../types";

const TROUT_LLM_PROMPT = `你是【空位官】（代号 MK-RIVAL），精通竞争空位学派。
禁止在输出中使用任何外部真人姓名。
你的任务是按竞争空位七维评估候选方向。

竞争空位7维评估：
1. 心智空位：目标品类的心智地图上，还有未被占据的空位吗？
2. 第一联想：顾客提到品类时首先想到谁？我们能抢到什么联想？
3. 差异化锋利度：和竞争对手之间的差异，能不能一句话说清楚？是"不同"还是"更好"？
4. 可防御性：对手跟进后，我们的差异化还成立吗？
5. 重新定位：是否攻击了领导者的固有弱点（而非强势）？
6. 竞争姿态：处于进攻/侧翼/游击/防御中的哪一种？选对了吗？
7. 场景绑定：是否绑定了一个可防御的消费场景？

只输出一个 JSON 对象：
{
  "scores": [
    { "candidate_id": "A", "theory_score": 0-100, "analysis": "竞争分析...", "strengths": [], "weaknesses": [] }
  ],
  "recommended_id": "A",
  "reasoning": "总结",
  "risks": []
}`;

export const troutAgent: TheoryAgent = {
  id: "trout",
  name: "空位官（MK-RIVAL）",
  stance:
    "竞争空位学派：在竞争结构中抢占心智空位；第一联想；可防御的差异化占位。必须回答：第一联想归谁，我们抢哪一个尚未被占稳的联想。",

  systemPrompt: `你是【空位官】（agent_id=trout，代号 MK-RIVAL）。
你代表的理论体系是：竞争空位学派。禁止在输出中使用任何外部真人姓名。

评判标准（竞争导向7维度）：
1. 心智空位：目标品类的心智地图上，还有未被占据的空位吗？
2. 第一联想：顾客提到品类时首先想到谁？我们能抢到什么联想？
3. 差异化锋利度：和竞争对手之间的差异，能不能一句话说清楚？
4. 可防御性：对手跟进后，我们的差异化还成立吗？
5. 重新定位：是否攻击了领导者的固有弱点（而非强势）？
6. 竞争姿态：处于进攻/侧翼/游击/防御中的哪一种？选对了吗？
7. 场景绑定：是否绑定了一个可防御的消费场景？

最怕：拥挤正面战、模糊正确、无区隔的「更好」、跟进后即消失。`,

  async evaluate(
    pkg: MatrixInputPackage,
    options?: { llm?: TheoryLLMAdapter },
  ): Promise<TheoryView> {
    if (options?.llm) {
      try {
        const llmResult = await runTroutLlm(pkg, options.llm);
        if (llmResult) return llmResult;
      } catch { /* fall through */ }
    }
    return runTroutHeuristic(pkg);
  },
};

// ═══════════════════════════════════════════
// LLM 路径
// ═══════════════════════════════════════════

async function runTroutLlm(
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
  ].filter(Boolean).join(" | ");

  const strengthsText = pkg.owner.strengths.join("、") || "暂无";

  const response = await llm.chat({
    messages: [
      { role: "system", content: TROUT_LLM_PROMPT },
      {
        role: "user",
        content: [
          `## 项目信息\n${projectInfo || "未知"}\n`,
          `## 经营者优势\n${strengthsText}\n`,
          `## 候选定位方向\n${candidatesText}\n`,
          `请用特劳特7维竞争评估逐一分析，输出 JSON。`,
        ].join("\n"),
      },
    ],
    temperature: 0.3,
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
  const theory_recommend = toTroutRecommend(best.theory_score);

  const rejected = mapped
    .filter((s) => s.id !== best.id && s.theory_score < 58)
    .map((s) => ({ name: s.name, reason: `按特劳特定位LLM：${s.analysis.slice(0, 60) || "差异不够锋利"}` }));

  const lawScore = scoreByTroutLaws(preferred, pkg.owner.strengths);

  return {
    agent_id: "trout",
    agent_name: troutAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【特劳特定位·LLM】「${preferred.oneLiner}」在竞争维度评估中最优：${best.analysis.slice(0, 100)}`,
    rejected_directions: rejected,
    core_strategic_logic: `特劳特7维LLM打分：${mapped.map((m) => `${m.name}=${m.theory_score}`).join(" | ")}。定位是相对于竞争的，不是更好而是不同。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildTroutRisks(preferred, best),
    direction_scores: mapped.map((m) => ({ name: m.name, theory_score: m.theory_score, theory_recommend: toTroutRecommend(m.theory_score) })),
    dimension_breakdown: lawScore.parts.map((p) => ({
      name: p.name,
      score: p.delta,
      note: p.note,
      pass: p.delta >= 0,
    })),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.9, 0.52 + best.theory_score / 180),
  };
}

// ═══════════════════════════════════════════
// Heuristic 降级（V2 7维竞争）
// ═══════════════════════════════════════════

function runTroutHeuristic(pkg: MatrixInputPackage): TheoryView {
  const candidates = pkg.candidates;
  const strengths = pkg.owner.strengths;
  const scores = candidates.map((c) => {
    const s = scoreByTroutLaws(c, strengths);
    return { id: c.id, theory_score: s.total, details: s.details, parts: s.parts };
  });

  scores.sort((a, b) => b.theory_score - a.theory_score);
  const best = scores[0];
  const preferred = candidates.find((c) => c.id === best.id) || candidates[0];
  const theory_recommend = toTroutRecommend(best.theory_score);

  const rejected = scores
    .filter((s) => s.id !== best.id && s.theory_score < 58)
    .map((s) => ({ name: candidates.find((x) => x.id === s.id)!.name, reason: "按特劳特定位：差异不够锋利或易被同质替换，不主张主推" }));

  return {
    agent_id: "trout",
    agent_name: troutAgent.name,
    preferred_direction: preferred.name,
    preferred_candidate_id: preferred.id,
    why_this_direction: `【特劳特定位】「${preferred.oneLiner}」在竞争维度评估中最优。${best.details ? best.details.slice(0, 80) : "在心智空位与第一联想维度上最锋利"}。`,
    rejected_directions: rejected,
    core_strategic_logic: `特劳特竞争维度打分（满分100）：${buildScoreSummary(scores, candidates)}。定位是相对于竞争的。不是更好，而是不同。必须回答：第一联想归谁，我们抢哪一个尚未被占稳的联想。`,
    key_mental_position: preferred.oneLiner,
    main_risks: buildTroutRisks(preferred, best),
    direction_scores: scores.map((s) => {
      const c = candidates.find((x) => x.id === s.id)!;
      return { name: c.name, theory_score: s.theory_score, theory_recommend: toTroutRecommend(s.theory_score) };
    }),
    dimension_breakdown: best.parts.map((p) => ({
      name: p.name,
      score: p.delta,
      note: p.note,
      pass: p.delta >= 0,
    })),
    theory_recommend,
    recommendation_level: theory_recommend,
    confidence: Math.min(0.9, 0.52 + best.theory_score / 180),
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

function buildTroutRisks(preferred: MatrixInputPackage["candidates"][0], best: { id: string; theory_score: number }) {
  const risks: TheoryView["main_risks"] = [];
  const text = preferred.oneLiner + preferred.name;
  if (best.theory_score < 62) risks.push({ risk: "【特劳特】区隔话术可能沦为品类通用句，第一联想不稳", severity: "R3" });
  if (!/对立|区隔|不|只|第一|空位|不同|不是/.test(text)) risks.push({ risk: "【特劳特】缺少可感知空位/对立，易被竞品模仿跟进", severity: "R2" });
  if (/更好|更优|升级/.test(text) && !/不|只/.test(text)) risks.push({ risk: "【特劳特】说了更好没说不同,这是特劳特最反对的", severity: "R4" });
  if (risks.length === 0) risks.push({ risk: "【特劳特】对手跟进后需靠供给把区隔做实，防联想漂移", severity: "R1" });
  return risks;
}

function scoreByTroutLaws(
  c: MatrixInputPackage["candidates"][0],
  strengths: string[],
): {
  total: number;
  details: string;
  parts: Array<{ name: string; delta: number; note: string }>;
} {
  const text = c.oneLiner + c.name + c.focus;
  const parts: Array<{ name: string; delta: number; note: string }> = [];
  let score = 48;
  const add = (name: string, delta: number, note: string) => {
    score += delta;
    parts.push({ name, delta, note });
  };

  if (/空位|空|未被|第一被想起|抢|占位|不.*而/.test(text)) {
    add("心智空位", 20, "瞄准了心智空位");
  } else if (/对立|区隔|不同|差异/.test(text)) {
    add("心智空位", 12, "有区隔但空位不够明确");
  } else if (c.focus.includes("资源")) {
    add("心智空位", -5, "资源导向不是空位导向");
  } else {
    add("心智空位", -8, "没有找到可占据的心智空位");
  }

  if (/第一联想|第一被想起|首先想到|首选/.test(text)) {
    add("第一联想", 18, "明确瞄准第一联想");
  } else if (/场景|周末|聚餐|家庭|夜宵|外卖/.test(text)) {
    add("第一联想", 10, "有场景联想，但品类联想不明确");
  } else if (/对立|不|只|反对/.test(text)) {
    add("第一联想", 8, "通过对立建立联想");
  } else {
    add("第一联想", -5, "第一联想模糊");
  }

  const canSayDiff = text.length < 30 && /不|只|不同|不是|而是|但|却|vs/i.test(text);
  if (canSayDiff) {
    add("差异锋利", 18, "一句话说清差异，非常锋利");
  } else if (/不同|对立|区隔|差异/.test(text)) {
    add("差异锋利", 10, "有差异化但不够锋利");
  } else {
    add("差异锋利", -10, "缺乏可感知的差异化");
  }
  if (/更好|更优|全面|综合|升级/.test(text)) {
    add("差异锋利", -12, "更好不是差异化，不同才是");
  }

  if (/供应链|专利|品牌|历史|传承|独家|自有/.test(text)) {
    add("防御壁垒", 15, "有壁垒，不易被复制");
  } else if (/场景|体验|服务|文化/.test(text)) {
    add("防御壁垒", 8, "有软性壁垒");
  } else {
    add("防御壁垒", -5, "容易被跟进复制");
  }

  if (/不是.*而是|反对|打破|重新|而非|vs|VS/.test(text)) {
    add("重新定位", 12, "明确了重新定位的对象");
  } else if (c.type.includes("进攻") || c.focus.includes("竞争")) {
    add("重新定位", 6, "有竞争意识但重新定位不明确");
  } else {
    add("重新定位", -5, "没有重新定位，容易被忽视");
  }

  if (c.type.includes("进攻")) {
    add("竞争姿态", 10, "进攻型，适合侧翼战");
  } else if (c.type.includes("稳健")) {
    add("竞争姿态", 6, "稳健型，适合游击战");
  } else {
    add("竞争姿态", 0, "竞争姿态不明确");
  }

  if (/场景|周末|聚餐|夜宵|外卖|家庭|商务|一人/.test(text)) {
    add("场景绑定", 7, "绑定了具体消费场景");
  } else {
    add("场景绑定", 0, "没有绑定具体场景");
  }

  if (strengths.some((s) => /供应链|品牌|运营/.test(s))) {
    add("资源匹配", 3, "经营者有运营优势");
  }

  const total = clamp(score);
  const details = parts
    .map((p) => `${p.name}${p.delta >= 0 ? "+" : ""}${p.delta}（${p.note}）`)
    .join("；");
  return { total, details, parts };
}

function toTroutRecommend(score: number): TheoryRecommend {
  if (score >= 82) return "strong_recommend";
  if (score >= 66) return "recommend";
  if (score >= 52) return "neutral";
  return "not_recommend";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

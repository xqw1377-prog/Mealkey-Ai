/**
 * 七席共用：从调研事实包提炼可审计 RTB / 词权 / 对照句
 * 禁止把「创始人信念」单独当证明。
 */
import { clipWord, type ThinkingFactPack } from "./protocol";

export function ownedMentalWord(f: ThinkingFactPack): string {
  return clipWord(f.whitespace || f.category, 10) || "主定位";
}

/** 证据句：优先账本一手事实 → 调研来源/竞对 → 景观句 → edge */
export function evidenceBackedProof(
  f: ThinkingFactPack,
  angle: "mind" | "rival" | "clash" | "symbol" | "stp" | "growth" | "culture",
): string {
  const primary = (f.primaryFacts || []).filter((p) => p.claim.trim().length >= 8);
  const verified = primary.filter((p) => p.verified);
  const pickPrimary = () => {
    const pool = verified.length ? verified : primary;
    if (!pool.length) return null;
    const byStage = (stage: string) =>
      pool.find((p) => (p.relatedStage || "").includes(stage));
    if (angle === "rival") {
      return (
        byStage("COMPETITIVE") ||
        pool.find((p) => p.sourceType === "competitor_note") ||
        pool[0]
      );
    }
    if (angle === "clash" || angle === "culture") {
      return (
        byStage("CONSUMER") ||
        pool.find((p) => p.sourceType === "customer_quote") ||
        pool.find((p) => p.sourceType === "store_observation") ||
        pool[0]
      );
    }
    if (angle === "mind" || angle === "symbol") {
      return (
        byStage("CATEGORY") ||
        pool.find((p) => p.sourceType === "founder_interview") ||
        pool[0]
      );
    }
    return pool[0];
  };
  const pf = pickPrimary();
  if (pf) {
    const tag = pf.verified ? "已核实一手" : "一手（待核实）";
    return `${tag}：${pf.claim}`.slice(0, 140);
  }

  const snippets = (f.evidenceSnippets || []).filter((s) => s.trim().length >= 12);
  const briefs = f.competitorBriefs || [];
  const rival = f.rivals[0] || "同质馆";
  const word = ownedMentalWord(f);

  if (angle === "rival" && briefs[0]) {
    const b = briefs[0];
    const slot = b.mentalPosition || "默认心智";
    const ev = b.evidenceSentence || b.summary;
    return `对手「${b.name}」占「${slot}」：${ev.slice(0, 72)}；我们抢未占稳的「${word}」`.slice(
      0,
      140,
    );
  }

  if (angle === "symbol" && f.culturalCode) {
    return `文化母体「${f.culturalCode}」是${f.who}高频场景；用超级符号让品牌寄生其中`.slice(0, 140);
  }

  if (angle === "stp" && f.demographicTiers && f.demographicTiers.length > 0) {
    const t = f.demographicTiers[0];
    return `细分「${t.name}」规模${t.size}、增长${t.growth}；聚焦该细分建立不可替代位置`.slice(0, 140);
  }

  if (angle === "growth" && f.growthLevers && f.growthLevers.length > 0) {
    return `增长飞轮轴心选「${f.growthLevers[0]}」，带动${f.growthLevers.slice(1).join("、")}正循环`.slice(0, 140);
  }

  if (angle === "culture" && f.socialContradiction) {
    return `社会矛盾「${f.socialContradiction}」中，品牌文化叙事让消费者表达身份和立场`.slice(0, 140);
  }

  if (snippets[0]) {
    const head =
      angle === "clash"
        ? `场合可验：${snippets[0]}`
        : angle === "mind"
          ? `可追溯证据：${snippets[0]}`
          : `可用证据：${snippets[0]}`;
    return head.slice(0, 140);
  }

  if (f.competitiveLandscape && f.competitiveLandscape.length >= 16) {
    return `竞争景观：${f.competitiveLandscape.slice(0, 100)}`.slice(0, 140);
  }

  if (f.researchHeadline && f.researchHeadline.length >= 10) {
    return `调研结论：${f.researchHeadline.slice(0, 100)}`.slice(0, 140);
  }

  // 最后兜底：标明这是供给侧信念，不是市场证据
  const edge = (f.edge || "").trim();
  if (edge) {
    return `供给侧信念（待市场验证）：${edge}`.slice(0, 140);
  }
  return `待补一手证据：为何客人会把「${word}」记成我们，而不是${rival}`;
}

export function unlikeCompetitorLine(f: ThinkingFactPack): string {
  const rival = f.rivals[0] || "同质馆";
  const brief = (f.competitorBriefs || [])[0];
  if (brief) {
    const slot = brief.mentalPosition || "习惯位";
    return `不像「${brief.name}」占「${slot}」那套；我们不跟它拼同质卖点`.slice(
      0,
      120,
    );
  }
  return `不像「${rival}」大而全/同质打法，客人记不住差异`.slice(0, 120);
}

export function wordOwnershipClaim(f: ThinkingFactPack): string {
  const word = ownedMentalWord(f);
  return `对外只拥有一个词：「${word}」——菜单、话术、门头不得加第二卖点`;
}

export function rivalContrastLine(f: ThinkingFactPack): string {
  const rival = f.rivals[0] || "同质馆";
  const word = ownedMentalWord(f);
  const brief = (f.competitorBriefs || [])[0];
  if (brief?.threatToWhitespace) {
    return `对${brief.name}：${brief.threatToWhitespace.slice(0, 80)}；我们押「${word}」`.slice(
      0,
      120,
    );
  }
  return `相对${rival}，抢尚未被占稳的「${word}」空位`;
}

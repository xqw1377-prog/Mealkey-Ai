/**
 * 三席（M-MKT / M-BIZ / M-ED）领域深度对齐
 * 证据账本 + 强度评分 + primaryFacts 投影 —— 对标 M-PNT EvidenceLedger 路径。
 * 不扩专家席；把已有 ledger/strength 真正挂进确认流。
 */

import type {
  AgentConsultingProject,
  ConsultingAgentKind,
  ResearchPack,
} from "./types";
import {
  addMarketFact,
  createEmptyMarketLedger,
  seedMarketFactsFromScan,
  type MarketEvidenceLedger,
} from "../m-mkt/consulting/market-evidence-ledger";
import { computeMarketStrength } from "../m-mkt/consulting/market-strength-engine";
import {
  addBizFact,
  createEmptyBizLedger,
  seedBizFactsFromScan,
  type BizEvidenceLedger,
} from "../m-biz/consulting/biz-evidence-ledger";
import { computeBizStrength } from "../m-biz/consulting/biz-strength-engine";
import {
  addEquityFact,
  createEmptyEquityLedger,
  seedEquityFactsFromScan,
  type EquityEvidenceLedger,
} from "../m-ed/consulting/equity-evidence-ledger";
import { computeEquityStrength } from "../m-ed/consulting/equity-strength-engine";

export type DomainStrengthSnapshot = {
  overall: number;
  grade: "A" | "B" | "C" | "D";
  readyForCouncil: boolean;
  gaps: string[];
  summary: string;
  agentId: ConsultingAgentKind;
};

export type DomainLedgerBundle =
  | { kind: "m-mkt"; ledger: MarketEvidenceLedger }
  | { kind: "m-biz"; ledger: BizEvidenceLedger }
  | { kind: "m-ed"; ledger: EquityEvidenceLedger };

function asMarketLedger(raw: unknown): MarketEvidenceLedger | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Partial<MarketEvidenceLedger>;
  if (!Array.isArray(o.facts)) return undefined;
  return o as MarketEvidenceLedger;
}

function asBizLedger(raw: unknown): BizEvidenceLedger | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Partial<BizEvidenceLedger>;
  if (!Array.isArray(o.facts)) return undefined;
  return o as BizEvidenceLedger;
}

function asEquityLedger(raw: unknown): EquityEvidenceLedger | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Partial<EquityEvidenceLedger>;
  if (!Array.isArray(o.facts)) return undefined;
  return o as EquityEvidenceLedger;
}

/** 从 LIVE/hybrid 调研收割可核实事实（非 seed 弱线索） */
export function harvestVerifiedDomainFacts(
  agentId: ConsultingAgentKind,
  project: AgentConsultingProject,
): DomainLedgerBundle {
  const answers = project.intakeAnswers || {};
  const research = project.assets.research;
  const live =
    research?.collectionMode === "engine" ||
    research?.collectionMode === "hybrid";

  if (agentId === "m-mkt") {
    let ledger =
      asMarketLedger(project.assets.domainLedger) ||
      createEmptyMarketLedger();
    ledger = seedMarketFactsFromScan(ledger, {
      city: answers.city || research?.scope?.city,
      category: answers.category || research?.scope?.category,
      intent: answers.intent,
      scene: answers.scene || answers.targetCustomer,
      rivals: answers.rivals || answers.competitors,
    });
    if (live && research) {
      if (research.headline?.trim()) {
        ledger = addMarketFact(ledger, {
          claim: `市场扫描结论: ${research.headline.trim().slice(0, 160)}`,
          sourceType: "industry_report",
          relatedStage: "MARKET_SCAN",
          strength: "moderate",
          tags: ["from_research"],
          verificationStatus: "verified",
        });
      }
      for (const b of (research.competitorBriefs || []).slice(0, 5)) {
        const claim = `竞品「${b.name}」打法: ${(b.play || b.threat || "").slice(0, 120)}`;
        if (claim.length < 16) continue;
        ledger = addMarketFact(ledger, {
          claim,
          sourceType: "competitor_visit",
          relatedStage: "COMPETITOR_ANALYSIS",
          strength: "moderate",
          tags: ["from_research", "competitor"],
          verificationStatus: "verified",
        });
      }
      for (const src of (research.sources || []).slice(0, 4)) {
        if (src.trim().length < 10) continue;
        ledger = addMarketFact(ledger, {
          claim: `可追溯来源: ${src.trim().slice(0, 160)}`,
          sourceType: "channel_data",
          relatedStage: "CHANNEL_VERIFICATION",
          strength: "moderate",
          tags: ["from_research", "source"],
          verificationStatus: "verified",
        });
      }
      if (answers.targetCustomer || answers.scene) {
        ledger = addMarketFact(ledger, {
          claim: `目标客群/场景: ${(answers.targetCustomer || answers.scene || "").slice(0, 120)}`,
          sourceType: "founder_interview",
          relatedStage: "USER_RESEARCH",
          strength: "moderate",
          tags: ["from_intake"],
          verificationStatus: "verified",
        });
      }
    }
    return { kind: "m-mkt", ledger };
  }

  if (agentId === "m-biz") {
    let ledger =
      asBizLedger(project.assets.domainLedger) || createEmptyBizLedger();
    ledger = seedBizFactsFromScan(ledger, {
      stage: answers.stage || "",
      pain: answers.pain || answers.biggestProblem || "",
      priority: answers.priority || answers.focus || "",
      resource: answers.resource || answers.strength || "",
    });
    if (answers.avgTicket?.trim()) {
      ledger = addBizFact(ledger, {
        claim: `客单事实: ${answers.avgTicket.trim().slice(0, 80)}`,
        sourceType: "financial_data",
        relatedStage: "UNIT_ECONOMICS",
        strength: "strong",
        tags: ["from_intake"],
        verificationStatus: "verified",
      });
    }
    if (answers.unitEconomics?.trim()) {
      ledger = addBizFact(ledger, {
        claim: `单位经济: ${answers.unitEconomics.trim().slice(0, 160)}`,
        sourceType: "financial_data",
        relatedStage: "UNIT_ECONOMICS",
        strength: "strong",
        tags: ["from_intake"],
        verificationStatus: "verified",
      });
      ledger = addBizFact(ledger, {
        claim: `收入/成本结构线索: ${answers.unitEconomics.trim().slice(0, 120)}`,
        sourceType: "financial_data",
        relatedStage: "COST_STRUCTURE",
        strength: "moderate",
        tags: ["from_intake"],
        verificationStatus: "verified",
      });
      ledger = addBizFact(ledger, {
        claim: `收入模型线索: ${answers.unitEconomics.trim().slice(0, 120)}`,
        sourceType: "financial_data",
        relatedStage: "REVENUE_MODEL",
        strength: "moderate",
        tags: ["from_intake"],
        verificationStatus: "verified",
      });
    }
    if (live && research?.headline?.trim()) {
      ledger = addBizFact(ledger, {
        claim: `商业体检结论: ${research.headline.trim().slice(0, 160)}`,
        sourceType: "sales_note",
        relatedStage: "PROFIT_ANALYSIS",
        strength: "moderate",
        tags: ["from_research"],
        verificationStatus: "verified",
      });
    }
    return { kind: "m-biz", ledger };
  }

  // m-ed
  let ledger =
    asEquityLedger(project.assets.domainLedger) || createEmptyEquityLedger();
  ledger = seedEquityFactsFromScan(ledger, {
    stage: answers.stage || answers.round || "",
    topic: answers.topic || answers.intent || "",
    control: answers.control || answers.capTable || answers.equity || "",
    team: answers.team || answers.org || "",
  });
  if (answers.control?.trim() || answers.capTable?.trim()) {
    ledger = addEquityFact(ledger, {
      claim: `控制权/股权结构: ${(answers.control || answers.capTable || "").trim().slice(0, 160)}`,
      sourceType: "cap_table",
      relatedStage: "CONTROL_ANALYSIS",
      strength: "strong",
      tags: ["from_intake"],
      verificationStatus: "verified",
    });
  }
  if (answers.pool?.trim() || answers.optionPool?.trim()) {
    ledger = addEquityFact(ledger, {
      claim: `期权池/激励池: ${(answers.pool || answers.optionPool || "").trim().slice(0, 120)}`,
      sourceType: "contract_document",
      relatedStage: "TEAM_STRUCTURE",
      strength: "moderate",
      tags: ["from_intake"],
      verificationStatus: "verified",
    });
  }
  if (live && research?.headline?.trim()) {
    ledger = addEquityFact(ledger, {
      claim: `股权扫描结论: ${research.headline.trim().slice(0, 160)}`,
      sourceType: "legal_review",
      relatedStage: "EQUITY_SCAN",
      strength: "moderate",
      tags: ["from_research"],
      verificationStatus: "verified",
    });
  }
  if (answers.mustSign?.trim() || answers.docs?.trim()) {
    ledger = addEquityFact(ledger, {
      claim: `必须落签文件: ${(answers.mustSign || answers.docs || "").trim().slice(0, 160)}`,
      sourceType: "contract_document",
      relatedStage: "COMPLIANCE_CHECK",
      strength: "moderate",
      tags: ["from_intake"],
      verificationStatus: "verified",
    });
  }
  return { kind: "m-ed", ledger };
}

function domainFactsToPrimaryFacts(
  bundle: DomainLedgerBundle,
): NonNullable<AgentConsultingProject["assets"]["primaryFacts"]> {
  const now = new Date().toISOString();
  const facts =
    bundle.kind === "m-mkt"
      ? bundle.ledger.facts
      : bundle.kind === "m-biz"
        ? bundle.ledger.facts
        : bundle.ledger.facts;
  return facts
    .filter((f) => (f.claim || "").trim().length >= 8)
    .slice(0, 16)
    .map((f) => ({
      factId: f.factId,
      claim: f.claim.slice(0, 200),
      sourceRef: `${f.sourceType}·${f.relatedStage}`,
      related: "research" as const,
      capturedAt: f.capturedAt || now,
    }));
}

export function computeDomainStrengthSnapshot(
  agentId: ConsultingAgentKind,
  project: AgentConsultingProject,
  bundle?: DomainLedgerBundle,
): DomainStrengthSnapshot {
  if (agentId === "m-mkt") {
    const ledger =
      bundle?.kind === "m-mkt"
        ? bundle.ledger
        : asMarketLedger(project.assets.domainLedger);
    const score = computeMarketStrength(project, ledger);
    return {
      overall: score.overall,
      grade: score.grade,
      readyForCouncil: score.readyForCouncil,
      gaps: score.gaps,
      summary: `市场强度 ${score.overall}/100（${score.grade}）${score.readyForCouncil ? "·可进常委" : "·须补缺口"}`,
      agentId,
    };
  }
  if (agentId === "m-biz") {
    const ledger =
      bundle?.kind === "m-biz"
        ? bundle.ledger
        : asBizLedger(project.assets.domainLedger);
    const score = computeBizStrength(project, ledger);
    return {
      overall: score.overall,
      grade: score.grade,
      readyForCouncil: score.readyForCouncil,
      gaps: score.gaps,
      summary: `商业强度 ${score.overall}/100（${score.grade}）${score.readyForCouncil ? "·可进常委" : "·须补缺口"}`,
      agentId,
    };
  }
  const ledger =
    bundle?.kind === "m-ed"
      ? bundle.ledger
      : asEquityLedger(project.assets.domainLedger);
  const score = computeEquityStrength(project, ledger);
  return {
    overall: score.overall,
    grade: score.grade,
    readyForCouncil: score.readyForCouncil,
    gaps: score.gaps,
    summary: `股权强度 ${score.overall}/100（${score.grade}）${score.readyForCouncil ? "·可进常委" : "·须补缺口"}`,
    agentId,
  };
}

/**
 * 确认调研后：领域账本 + 强度 + 投影到 primaryFacts
 */
export function enrichConsultingWithDomainDepth(
  agentId: ConsultingAgentKind,
  project: AgentConsultingProject,
): AgentConsultingProject {
  const bundle = harvestVerifiedDomainFacts(agentId, project);
  const strength = computeDomainStrengthSnapshot(agentId, project, bundle);
  const harvested = domainFactsToPrimaryFacts(bundle);
  const existing = project.assets.primaryFacts || [];
  const seen = new Set(existing.map((f) => f.claim.slice(0, 24)));
  const merged = [
    ...existing,
    ...harvested.filter((f) => {
      const key = f.claim.slice(0, 24);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ].slice(0, 20);

  return {
    ...project,
    assets: {
      ...project.assets,
      domainLedger: bundle.ledger as unknown as Record<string, unknown>,
      domainStrength: strength,
      primaryFacts: merged.length >= 1 ? merged : project.assets.primaryFacts,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 策略确认前：强度过低则硬拦（对齐顶级咨询「证据不足不交付」）
 * 阈值：overall < 40 或 无任何一手事实
 */
export function assertDomainDepthForStrategy(
  agentId: ConsultingAgentKind,
  project: AgentConsultingProject,
  actionLabel = "确认策略",
): DomainStrengthSnapshot {
  const strength =
    (project.assets.domainStrength as DomainStrengthSnapshot | undefined) ||
    computeDomainStrengthSnapshot(agentId, project);

  const facts = project.assets.primaryFacts || [];
  if (facts.length < 2) {
    throw new Error(
      `不能${actionLabel}：一手事实不足 2 条。请先补调研证据或录入可引用经营事实。`,
    );
  }
  if (strength.overall < 40) {
    throw new Error(
      `不能${actionLabel}：${strength.summary}。缺口：${strength.gaps.slice(0, 3).join("；") || "证据过薄"}`,
    );
  }
  return strength;
}

/** Business Identity / 项目档案 → intake 先验（不覆盖用户已填） */
export function mergeIdentityPriorsIntoAnswers(
  answers: Record<string, string>,
  priors: {
    brandName?: string | null;
    city?: string | null;
    category?: string | null;
    district?: string | null;
    focusProblem?: string | null;
  },
): Record<string, string> {
  const next = { ...answers };
  const fill = (key: string, value?: string | null) => {
    if (!value?.trim()) return;
    if ((next[key] || "").trim()) return;
    next[key] = value.trim();
  };
  fill("brandName", priors.brandName);
  fill("city", priors.city);
  fill("category", priors.category);
  fill("district", priors.district);
  fill("biggestProblem", priors.focusProblem);
  fill("pain", priors.focusProblem);
  return next;
}

export function researchHasLiveEvidence(research?: ResearchPack | null): boolean {
  if (!research) return false;
  return (
    research.collectionMode === "engine" ||
    research.collectionMode === "hybrid"
  );
}

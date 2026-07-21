import {
  getCurrentRipSnapshot,
  readRipStore,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import type { RegisteredAgentV1 } from "./types";
import type { ContextPackageV1, ContextScope } from "./types";

const EVIDENCE_CAP = 200;

export type ProjectContextSource = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  stage?: string | null;
  profile?: string | null;
};

function parseProfile(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function assembleContextPackage(input: {
  restaurantId: string;
  requestedScopes: ContextScope[];
  agent: RegisteredAgentV1;
  project?: ProjectContextSource | null;
}): ContextPackageV1 {
  const scopesGranted: ContextScope[] = [];
  const scopesDenied: ContextScope[] = [];

  for (const s of input.requestedScopes) {
    if (input.agent.allowedScopes.includes(s)) scopesGranted.push(s);
    else scopesDenied.push(s);
  }

  const profile = parseProfile(input.project?.profile);
  const rip = getCurrentRipSnapshot(readRipStore(profile));
  const basic = rip?.basic;
  const asOf = new Date().toISOString();

  const pkg: ContextPackageV1 = {
    restaurantId: input.restaurantId,
    asOf,
    scopesGranted,
    scopesDenied,
  };

  if (scopesGranted.includes("basic")) {
    pkg.identity = {
      brand: basic?.brandName || input.project?.name,
      storeName: basic?.brandName || input.project?.name,
      city: basic?.city || input.project?.city || undefined,
      district: basic?.districtOrArea || input.project?.district || undefined,
      category: basic?.category || input.project?.category || undefined,
      priceRange: basic?.avgTicketHint || undefined,
    };
  }

  if (scopesGranted.includes("facts")) {
    const facts: NonNullable<ContextPackageV1["facts"]> = [];
    if (basic?.stageLabel || input.project?.stage) {
      facts.push({
        kind: "stage",
        claim: `经营阶段：${basic?.stageLabel || input.project?.stage}`,
        asOf,
      });
    }
    if (basic?.avgTicketHint) {
      facts.push({
        kind: "price",
        claim: `客单区间：${basic.avgTicketHint}`,
        asOf,
      });
    }
    const factBag = profile.businessFacts;
    if (Array.isArray(factBag)) {
      for (const f of factBag.slice(0, 20)) {
        if (f && typeof f === "object") {
          const row = f as { kind?: string; claim?: string };
          if (row.claim) {
            facts.push({
              kind: row.kind || "fact",
              claim: String(row.claim).slice(0, 200),
              asOf,
            });
          }
        }
      }
    }
    pkg.facts = facts;
  }

  if (scopesGranted.includes("review") || scopesGranted.includes("operation")) {
    const evidence: NonNullable<ContextPackageV1["evidence"]> = [];
    const ripEv = rip?.evidence || [];
    for (const e of ripEv.slice(0, EVIDENCE_CAP)) {
      evidence.push({
        id: e.id || `ev-${evidence.length}`,
        source: e.source || "rip",
        claim: (e.content || "").slice(0, 500),
        sentiment: e.sentiment as
          | "positive"
          | "neutral"
          | "negative"
          | undefined,
        theme: e.aspect || e.keyword,
        observedAt: e.observedAt,
      });
    }
    if (scopesGranted.includes("review") || scopesGranted.includes("operation")) {
      pkg.evidence = evidence.filter((e) => e.claim.trim());
    }
  }

  if (scopesGranted.includes("market")) {
    // V1：有则附 competition 摘要 claim；无则空（不编造家数）
    const marketNotes = profile.marketNotes;
    if (typeof marketNotes === "string" && marketNotes.trim()) {
      pkg.evidence = [
        ...(pkg.evidence || []),
        {
          id: "market-1",
          source: "brain.market",
          claim: marketNotes.slice(0, 500),
        },
      ].slice(0, EVIDENCE_CAP);
    }
  }

  // dna：高门槛 — 仅当 agent 允许且请求了才给极简摘要
  if (scopesGranted.includes("dna")) {
    const dna = profile.decisionDna;
    if (typeof dna === "string" && dna.trim()) {
      pkg.decisionContext = {
        currentQuestion: dna.slice(0, 200),
      };
    }
  }

  return pkg;
}

export const SANDBOX_FIXTURES: Record<string, ContextPackageV1> = {
  "changsha-xiangcai-a": {
    restaurantId: "fixture-changsha-xiangcai-a",
    asOf: "2026-07-21T00:00:00.000Z",
    scopesGranted: ["basic", "facts", "review", "operation"],
    scopesDenied: [],
    identity: {
      brand: "湘味小馆",
      storeName: "湘味小馆·岳麓店",
      city: "长沙",
      district: "岳麓区",
      category: "湘菜",
      priceRange: "80-100",
    },
    facts: [
      { kind: "stage", claim: "经营阶段：单店验证期" },
      { kind: "sales", claim: "近90天营业额区间：下降" },
      { kind: "ticket", claim: "客单：80-100元" },
    ],
    evidence: [
      {
        id: "fx-1",
        source: "dianping",
        claim: "菜很好吃，就是周末等位太久，上菜慢",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "fx-2",
        source: "dianping",
        claim: "环境适合朋友聚会，拍照好看",
        sentiment: "positive",
        theme: "environment",
      },
      {
        id: "fx-3",
        source: "dianping",
        claim: "等了四十分钟才上齐，服务跟不上",
        sentiment: "negative",
        theme: "wait",
      },
    ],
  },
};

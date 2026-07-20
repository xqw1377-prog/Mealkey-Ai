import {
  DEFAULT_LOCALE,
  type MealkeyLocale,
} from "../i18n/locales";
import { labelUnknownFields } from "../i18n/unknown-field-labels";
import type {
  BrandProfile,
  BusinessProfile,
  CapabilityProfile,
  FounderProfile,
  RestaurantBrainSnapshot,
  RestaurantProfile,
} from "./types";

function filled(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function ratio(ok: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((ok / total) * 100);
}

export function scoreRestaurantProfile(p: RestaurantProfile): number {
  const keys: unknown[] = [
    p.category,
    p.stage !== "unknown" ? p.stage : null,
    p.city,
    p.storeCount,
    p.priceRange,
  ];
  return ratio(keys.filter(filled).length, keys.length);
}

export function scoreBrand(b: BrandProfile): number {
  const keys = [
    b.positioning,
    b.targetCustomer,
    b.consumptionScene,
    b.brandPromise,
    b.competitiveAdvantage,
    b.brandRisk,
  ];
  return ratio(keys.filter(filled).length, keys.length);
}

export function scoreBusiness(b: BusinessProfile): number {
  const keys = [
    b.monthlyRevenue,
    b.grossMargin,
    b.netMargin,
    b.averageTicket,
    b.businessModel,
  ];
  return ratio(keys.filter(filled).length, keys.length);
}

export function scoreCapability(c: CapabilityProfile): number {
  if (c.confidence < 0.2) return 0;
  return Math.min(100, Math.round(c.confidence * 100));
}

export function scoreFounder(f: FounderProfile): number {
  const keys = [
    f.decisionStyle,
    f.riskPreference,
    f.strengths,
    f.weaknesses,
    f.blindSpots,
  ];
  return ratio(keys.filter(filled).length, keys.length);
}

export function computeDataCompleteness(snapshot: RestaurantBrainSnapshot): number {
  const parts = [
    scoreRestaurantProfile(snapshot.profile) * 0.15,
    scoreBrand(snapshot.brand) * 0.25,
    scoreBusiness(snapshot.business) * 0.2,
    scoreCapability(snapshot.capability) * 0.2,
    scoreFounder(snapshot.founder) * 0.2,
  ];
  return Math.round(parts.reduce((a, b) => a + b, 0));
}

/** 机器可读缺口键（稳定 ID，禁止直接渲染给用户） */
export function listUnknownKeys(snapshot: RestaurantBrainSnapshot): string[] {
  const u: string[] = [];
  if (!filled(snapshot.profile.category)) u.push("profile.category");
  if (snapshot.profile.stage === "unknown") u.push("profile.stage");
  if (!filled(snapshot.brand.positioning)) u.push("brand.positioning");
  if (!filled(snapshot.brand.targetCustomer)) u.push("brand.targetCustomer");
  if (snapshot.business.monthlyRevenue == null) u.push("business.monthlyRevenue");
  if (snapshot.capability.confidence < 0.2) u.push("capability");
  if (!filled(snapshot.founder.decisionStyle)) u.push("founder.decisionStyle");
  return u;
}

/**
 * 用户可见缺口文案。默认 zh-CN。
 * 内部仍用 listUnknownKeys；展示层必须走本函数或 labelUnknownField。
 */
export function listUnknowns(
  snapshot: RestaurantBrainSnapshot,
  locale: MealkeyLocale | string = DEFAULT_LOCALE,
): string[] {
  return labelUnknownFields(listUnknownKeys(snapshot), locale);
}

/** @deprecated 旧 DNA 完整度 API；转调 computeDataCompleteness */
export const LAYER_KEYS = {
  brand: ["positioning", "targetCustomer"],
  business: ["monthlyRevenue"],
  market: [],
  organization: [],
  founder: ["decisionStyle"],
};

export function computeCompleteness(
  _dna: unknown,
  _previousOverall = 0,
  _now?: string,
): {
  overall: number;
  byLayer: Record<string, number>;
  deltaToday: number;
  updatedAt: string;
} {
  return {
    overall: 0,
    byLayer: {
      brand: 0,
      business: 0,
      market: 0,
      organization: 0,
      founder: 0,
    },
    deltaToday: 0,
    updatedAt: _now ?? new Date().toISOString(),
  };
}

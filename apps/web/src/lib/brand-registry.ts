/**
 * 企业多品牌注册表（轻量）
 * 一 Project 可有多个品牌，模块统一读 activeBrand。
 */

export type BrandRecord = {
  id: string;
  brandName: string;
  category?: string;
  mentalPosition?: string;
  targetCustomers?: string;
  priceRange?: string;
  differentiation?: string;
  brandTonality?: string;
  oneLiner?: string;
  /** 最近一次被选为工作品牌 / 咨询写入的时间 */
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** 单品牌咨询卷宗快照（切换品牌时归档，切回可恢复） */
export type BrandConsultingArchive = {
  mPntBrandProject?: unknown;
  mPntBriefInterview?: unknown;
  mMktConsultingProject?: unknown;
  mBizConsultingProject?: unknown;
  mEdConsultingProject?: unknown;
  archivedAt: string;
};

export type BrandRegistryView = {
  brands: BrandRecord[];
  activeBrandId: string | null;
  activeBrand: BrandRecord | null;
};

const CONSULTING_SLOT_KEYS = [
  "mPntBrandProject",
  "mPntBriefInterview",
  "mMktConsultingProject",
  "mBizConsultingProject",
  "mEdConsultingProject",
] as const;

type ConsultingSlotKey = (typeof CONSULTING_SLOT_KEYS)[number];


function buildId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `br_${crypto.randomUUID().slice(0, 8)}`
    : `br_${Date.now().toString(36)}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nowIso() {
  return new Date().toISOString();
}

/** 从旧扁平字段迁移出默认品牌 */
export function brandFromLegacyProfile(
  profile: Record<string, unknown>,
  projectName?: string,
): BrandRecord {
  const mPnt = (profile.mPnt as Record<string, unknown> | undefined) || {};
  const bp = (mPnt.brandPositioning as Record<string, unknown> | undefined) || {};
  const stamp = nowIso();
  return {
    id: buildId(),
    brandName:
      asString(bp.brandName) ||
      asString(profile.brandName) ||
      projectName ||
      "未命名品牌",
    category: asString(bp.category) || asString(profile.category),
    mentalPosition:
      asString(bp.mentalPosition) || asString(profile.mentalPosition),
    targetCustomers:
      asString(bp.targetCustomers) || asString(profile.targetCustomers),
    priceRange: asString(bp.priceRange) || asString(profile.priceRange),
    differentiation:
      asString(bp.differentiation) || asString(profile.differentiation),
    brandTonality:
      asString(bp.brandTonality) || asString(profile.brandTonality),
    oneLiner: asString(mPnt.oneLiner) || asString(profile.strategicSummary),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function readBrandList(profile: Record<string, unknown>): BrandRecord[] {
  if (!Array.isArray(profile.brands)) return [];
  return (profile.brands as Array<Record<string, unknown>>).reduce<BrandRecord[]>((brands, raw) => {
      const brandName = asString(raw.brandName);
      if (!brandName) return brands;
      brands.push({
        id: asString(raw.id) || buildId(),
        brandName,
        category: asString(raw.category),
        mentalPosition: asString(raw.mentalPosition),
        targetCustomers: asString(raw.targetCustomers),
        priceRange: asString(raw.priceRange),
        differentiation: asString(raw.differentiation),
        brandTonality: asString(raw.brandTonality),
        oneLiner: asString(raw.oneLiner),
        lastActiveAt: asString(raw.lastActiveAt),
        createdAt: asString(raw.createdAt) || nowIso(),
        updatedAt: asString(raw.updatedAt) || nowIso(),
      });
      return brands;
    }, []);
}

/**
 * 确保 profile 有 brands[] + activeBrandId；旧数据自动迁移。
 */
export function ensureBrandRegistry(
  profile: Record<string, unknown>,
  projectName?: string,
): { profile: Record<string, unknown>; view: BrandRegistryView } {
  let brands = readBrandList(profile);
  if (brands.length === 0) {
    brands = [brandFromLegacyProfile(profile, projectName)];
  }

  let activeBrandId = asString(profile.activeBrandId);
  if (!activeBrandId || !brands.some((b) => b.id === activeBrandId)) {
    activeBrandId = brands[0]!.id;
  }

  const activeBrand = brands.find((b) => b.id === activeBrandId) || brands[0]!;
  const next = applyActiveBrandToFlatFields(
    {
      ...profile,
      brands,
      activeBrandId,
    },
    activeBrand,
  );

  return {
    profile: next,
    view: { brands, activeBrandId, activeBrand },
  };
}

/** 把当前品牌同步到扁平字段 + mPnt.brandPositioning，供旧读路径兼容 */
export function applyActiveBrandToFlatFields(
  profile: Record<string, unknown>,
  brand: BrandRecord,
): Record<string, unknown> {
  const mPnt = {
    ...((profile.mPnt as Record<string, unknown>) || {}),
    oneLiner: brand.oneLiner || (profile.mPnt as Record<string, unknown>)?.oneLiner,
    brandPositioning: {
      ...(((profile.mPnt as Record<string, unknown>)?.brandPositioning as
        | Record<string, unknown>
        | undefined) || {}),
      brandName: brand.brandName,
      category: brand.category,
      mentalPosition: brand.mentalPosition,
      targetCustomers: brand.targetCustomers,
      priceRange: brand.priceRange,
      differentiation: brand.differentiation,
      brandTonality: brand.brandTonality,
    },
  };

  return {
    ...profile,
    brandName: brand.brandName,
    category: brand.category ?? profile.category,
    mentalPosition: brand.mentalPosition ?? profile.mentalPosition,
    targetCustomers: brand.targetCustomers ?? profile.targetCustomers,
    priceRange: brand.priceRange ?? profile.priceRange,
    differentiation: brand.differentiation ?? profile.differentiation,
    brandTonality: brand.brandTonality ?? profile.brandTonality,
    strategicSummary:
      brand.oneLiner ||
      brand.mentalPosition ||
      asString(profile.strategicSummary),
    mPnt,
  };
}

export function upsertBrandInProfile(
  profile: Record<string, unknown>,
  input: Partial<BrandRecord> & { brandName: string },
  projectName?: string,
): { profile: Record<string, unknown>; brand: BrandRecord } {
  const ensured = ensureBrandRegistry(profile, projectName);
  const brands = [...ensured.view.brands];
  const stamp = nowIso();
  const existingIdx = input.id
    ? brands.findIndex((b) => b.id === input.id)
    : -1;

  let brand: BrandRecord;
  if (existingIdx >= 0) {
    brand = {
      ...brands[existingIdx]!,
      ...input,
      brandName: input.brandName.trim(),
      updatedAt: stamp,
    };
    brands[existingIdx] = brand;
  } else {
    brand = {
      id: input.id || buildId(),
      brandName: input.brandName.trim(),
      category: input.category,
      mentalPosition: input.mentalPosition,
      targetCustomers: input.targetCustomers,
      priceRange: input.priceRange,
      differentiation: input.differentiation,
      brandTonality: input.brandTonality,
      oneLiner: input.oneLiner,
      createdAt: stamp,
      updatedAt: stamp,
    };
    brands.push(brand);
  }

  const activeBrandId =
    ensured.view.activeBrandId && brands.some((b) => b.id === ensured.view.activeBrandId)
      ? ensured.view.activeBrandId
      : brand.id;
  const active =
    brands.find((b) => b.id === activeBrandId) || brand;

  return {
    brand,
    profile: applyActiveBrandToFlatFields(
      { ...ensured.profile, brands, activeBrandId },
      active,
    ),
  };
}

/**
 * 切换品牌时清除 M-PNT 定位咨询状态（active 槽位），避免旧品牌历史污染新品牌流程。
 * 真正的历史应先经 archive 保存。
 */
export function clearMPntConsultingStateFromProfile(
  profile: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...profile };
  delete next.mPntBrandProject;
  delete next.mPntBriefInterview;

  if (next.mPnt && typeof next.mPnt === "object" && !Array.isArray(next.mPnt)) {
    const mPnt = { ...(next.mPnt as Record<string, unknown>) };
    delete mPnt.positioningContract;
    delete mPnt.statementText;
    delete mPnt.brandSystem;
    delete mPnt.reportSigned;
    delete mPnt.reportVersion;
    delete mPnt.signedAt;
    if (mPnt.source === "m-pnt-consulting") {
      delete mPnt.oneLiner;
      delete mPnt.source;
      delete mPnt.updatedAt;
    }
    next.mPnt = mPnt;
  }

  next.mPntConsultingClearedAt = nowIso();
  next.mPntConsultingClearedReason = "brand_switch";
  return next;
}

/**
 * 切换品牌时清除 M-MKT / M-BIZ / M-ED 六步咨询卷宗（active 槽位）。
 */
export function clearAgentConsultingStateFromProfile(
  profile: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...profile };
  delete next.mMktConsultingProject;
  delete next.mBizConsultingProject;
  delete next.mEdConsultingProject;
  next.agentConsultingClearedAt = nowIso();
  next.agentConsultingClearedReason = "brand_switch";
  return next;
}

/** 换品牌时清空四席咨询 active 槽位 */
export function clearAllConsultingStateFromProfile(
  profile: Record<string, unknown>,
): Record<string, unknown> {
  return clearAgentConsultingStateFromProfile(
    clearMPntConsultingStateFromProfile(profile),
  );
}

export function readBrandConsultingArchives(
  profile: Record<string, unknown>,
): Record<string, BrandConsultingArchive> {
  const raw = profile.brandConsultingArchives;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, BrandConsultingArchive>) };
}

function hasAnyConsultingSlot(profile: Record<string, unknown>): boolean {
  return CONSULTING_SLOT_KEYS.some((k) => profile[k] != null);
}

/** 把当前 active 咨询槽位归档到指定品牌 */
export function archiveActiveConsultingForBrand(
  profile: Record<string, unknown>,
  brandId: string,
): Record<string, unknown> {
  if (!brandId || !hasAnyConsultingSlot(profile)) return profile;
  const archives = readBrandConsultingArchives(profile);
  const snap: BrandConsultingArchive = {
    archivedAt: nowIso(),
  };
  for (const key of CONSULTING_SLOT_KEYS) {
    if (profile[key] != null) {
      snap[key] = profile[key];
    }
  }
  return {
    ...profile,
    brandConsultingArchives: {
      ...archives,
      [brandId]: snap,
    },
  };
}

/** 从品牌归档恢复到 active 槽位（无归档则保持清空） */
export function restoreConsultingArchiveToActive(
  profile: Record<string, unknown>,
  brandId: string,
): Record<string, unknown> {
  const archives = readBrandConsultingArchives(profile);
  const snap = archives[brandId];
  if (!snap) return profile;
  const next: Record<string, unknown> = { ...profile };
  for (const key of CONSULTING_SLOT_KEYS) {
    if (snap[key] != null) next[key] = snap[key];
    else delete next[key];
  }
  return next;
}

/** 咨询写入时同步刷新当前品牌归档 + lastActiveAt */
export function touchBrandConsultingActivity(
  profile: Record<string, unknown>,
  brandId: string | null | undefined,
  projectName?: string,
): Record<string, unknown> {
  if (!brandId) return profile;
  let next = archiveActiveConsultingForBrand(profile, brandId);
  const ensured = ensureBrandRegistry(next, projectName);
  const stamp = nowIso();
  const brands = ensured.view.brands.map((b) =>
    b.id === brandId
      ? { ...b, lastActiveAt: stamp, updatedAt: stamp }
      : b,
  );
  return {
    ...ensured.profile,
    brands,
    activeBrandId: brandId,
  };
}

export function brandHasConsultingArchive(
  profile: Record<string, unknown>,
  brandId: string,
): boolean {
  const snap = readBrandConsultingArchives(profile)[brandId];
  if (!snap) return false;
  return CONSULTING_SLOT_KEYS.some((k) => snap[k] != null);
}

export function switchActiveBrandInProfile(
  profile: Record<string, unknown>,
  brandId: string,
  projectName?: string,
): { profile: Record<string, unknown>; view: BrandRegistryView } {
  const ensured = ensureBrandRegistry(profile, projectName);
  const brand = ensured.view.brands.find((b) => b.id === brandId);
  if (!brand) {
    throw new Error("品牌不存在");
  }
  const previousBrandId = ensured.view.activeBrandId;
  let next = ensured.profile;

  // 切换到不同品牌：先归档旧卷宗 → 清 active → 恢复目标品牌历史
  if (previousBrandId && previousBrandId !== brandId) {
    next = archiveActiveConsultingForBrand(next, previousBrandId);
    next = clearAllConsultingStateFromProfile(next);
    next = restoreConsultingArchiveToActive(next, brandId);
  }

  const stamp = nowIso();
  const brands = (readBrandList(next).length
    ? readBrandList(next)
    : ensured.view.brands
  ).map((b) =>
    b.id === brandId ? { ...b, lastActiveAt: stamp, updatedAt: stamp } : b,
  );

  next = applyActiveBrandToFlatFields(
    {
      ...next,
      brands,
      activeBrandId: brandId,
      brandSwitchedAt: stamp,
    },
    { ...brand, lastActiveAt: stamp, updatedAt: stamp },
  );

  return {
    profile: next,
    view: {
      brands,
      activeBrandId: brandId,
      activeBrand: brands.find((b) => b.id === brandId) || brand,
    },
  };
}

export function resolveActiveBrand(
  profile: Record<string, unknown>,
  projectName?: string,
): BrandRecord {
  return ensureBrandRegistry(profile, projectName).view.activeBrand!;
}

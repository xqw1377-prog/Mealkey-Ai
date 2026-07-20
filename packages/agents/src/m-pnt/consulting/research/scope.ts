/**
 * 定位调研范围：区域 × 品牌现状 × 业态 × 品类 × 竞对
 */
export type BrandStageLabel =
  | "筹备开业"
  | "单店经营"
  | "多店扩张"
  | "品牌升级"
  | "重新定位"
  | "未知";

export type BusinessFormatLabel =
  | "正餐"
  | "快餐"
  | "茶饮"
  | "火锅烧烤"
  | "社区餐饮"
  | "综合餐饮"
  | "未知";

export type ResearchScope = {
  city: string;
  district?: string;
  category: string;
  businessFormat: BusinessFormatLabel;
  brandName: string;
  brandStage: BrandStageLabel;
  brandStatusNote: string;
  who: string;
  need: string;
  rivals: string[];
  ambition?: string;
  edge?: string;
  constraints: string[];
};

export function inferBusinessFormat(category: string): BusinessFormatLabel {
  const c = category || "";
  if (/火锅|烧烤|烤鱼|冒菜/.test(c)) return "火锅烧烤";
  if (/茶|咖啡|奶茶|饮/.test(c)) return "茶饮";
  if (/快餐|粉|面|盖浇|简餐|小吃/.test(c)) return "快餐";
  if (/家常|社区|食堂|邻里/.test(c)) return "社区餐饮";
  if (/湘|川|粤|鲁|江浙|海鲜|宴|私房|正餐/.test(c)) return "正餐";
  if (c) return "综合餐饮";
  return "未知";
}

export function inferBrandStage(input: {
  stage?: string;
  businessContext?: string;
  ambition?: string;
}): BrandStageLabel {
  const t = `${input.stage || ""} ${input.businessContext || ""} ${input.ambition || ""}`;
  if (/重新定位|翻盘|转型|升级品牌/.test(t)) return "重新定位";
  if (/品牌升级|升级|高端化/.test(t)) return "品牌升级";
  if (/连锁|多店|扩张|第二家|开第二/.test(t)) return "多店扩张";
  if (/筹备|开业|选址|还未开|准备开/.test(t)) return "筹备开业";
  if (/单店|经营|翻台|生意/.test(t)) return "单店经营";
  return "未知";
}

export function buildResearchScope(input: {
  city?: string;
  district?: string;
  brandName?: string;
  category?: string;
  competitiveSet?: string[];
  targetCustomer?: string;
  customerNeed?: string;
  businessContext?: string;
  brandAmbition?: string;
  founderBelief?: string;
  projectStage?: string;
}): ResearchScope {
  const category = input.category || "本地餐饮";
  const rivals = (input.competitiveSet || []).filter(Boolean);
  return {
    city: input.city || "目标城市",
    district: input.district,
    category,
    businessFormat: inferBusinessFormat(category),
    brandName: input.brandName || "本品牌",
    brandStage: inferBrandStage({
      stage: input.projectStage,
      businessContext: input.businessContext,
      ambition: input.brandAmbition,
    }),
    brandStatusNote:
      input.businessContext?.trim() ||
      input.brandAmbition?.trim() ||
      "待补全经营现状",
    who: input.targetCustomer || "核心客人",
    need: input.customerNeed || "吃得放心、可预期",
    rivals: rivals.slice(0, 5),
    ambition: input.brandAmbition,
    edge: input.founderBelief,
    constraints: [
      `区域：${input.city || "目标城市"}${input.district ? `·${input.district}` : ""}`,
      `业态：${inferBusinessFormat(category)}`,
      `品类：${category}`,
    ],
  };
}

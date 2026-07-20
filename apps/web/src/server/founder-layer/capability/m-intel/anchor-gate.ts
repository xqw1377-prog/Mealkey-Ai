/**
 * M-INTEL 锚点门禁 — 无 brand+city 禁止区域结论
 * 权威：MEALKEY_M_INTEL_V1 · Experience Blueprint P5
 */
import { identityExternalReady } from "@/server/founder-layer/contracts/business-identity";
import type { DecisionDataGapV1 } from "@/server/founder-layer/contracts/decision-intel-data";

export type MintelAnchorInput = {
  brandName?: string | null;
  city?: string | null;
  storeName?: string | null;
  topic?: string;
};

/** 含区域量化/市场份额等「装懂外部」话术 */
const REGIONAL_METRIC_RE =
  /(\d{1,3}\s*%|百分之\s*\d+|市场份额|区域渗透|商圈饱和|客流占比|竞争密度指数|区域容量)/i;

export function hasMintelAnchors(input: MintelAnchorInput): boolean {
  return identityExternalReady({
    brandName: input.brandName?.trim() || "",
    city: input.city?.trim() || "",
  });
}

export function containsRegionalMetricClaim(text: string): boolean {
  return REGIONAL_METRIC_RE.test(text || "");
}

export type MintelRegionalQueryResult =
  | {
      ok: true;
      canClaimRegional: true;
      brandName: string;
      city: string;
      subjectLabel: string;
    }
  | {
      ok: false;
      canClaimRegional: false;
      reason: string;
      gaps: DecisionDataGapV1;
      missingAnchors: Array<"brandName" | "city">;
    };

/**
 * M-INTEL 区域查询入口：无锚点一律拒绝，只返回 gap。
 */
export function queryMintelRegional(
  input: MintelAnchorInput,
): MintelRegionalQueryResult {
  const brand = input.brandName?.trim() || "";
  const city = input.city?.trim() || "";
  const missingAnchors: Array<"brandName" | "city"> = [];
  if (!brand) missingAnchors.push("brandName");
  if (!city) missingAnchors.push("city");

  if (missingAnchors.length > 0) {
    const topic = input.topic?.trim() || "区域市场证据";
    return {
      ok: false,
      canClaimRegional: false,
      reason: "缺少品牌与城市锚点，M-INTEL 不产出区域结论",
      missingAnchors,
      gaps: {
        topic,
        gaps: [
          {
            gapId: "gap_mintel_brand",
            question: "你的品牌/店名是什么？",
            reason: "外部证据必须绑定到具体经营主体",
          },
          {
            gapId: "gap_mintel_city",
            question: "门店所在城市（及商圈/地址）是哪里？",
            reason: "无地理锚点时禁止声称区域竞争或客群结论",
          },
        ].filter((g) =>
          missingAnchors.includes(
            g.gapId === "gap_mintel_brand" ? "brandName" : "city",
          ),
        ),
      },
    };
  }

  const store = input.storeName?.trim();
  return {
    ok: true,
    canClaimRegional: true,
    brandName: brand,
    city,
    subjectLabel: store ? `${city}·${brand}（${store}）` : `${city}·${brand}`,
  };
}

/**
 * 无锚点时剔除带区域量化话术的证据；有锚点原样返回。
 */
export function filterEvidenceByAnchorGate<T extends { content: string }>(
  evidences: T[],
  canClaimRegional: boolean,
): { kept: T[]; rejected: T[] } {
  if (canClaimRegional) {
    return { kept: evidences, rejected: [] };
  }
  const kept: T[] = [];
  const rejected: T[] = [];
  for (const e of evidences) {
    if (containsRegionalMetricClaim(e.content)) rejected.push(e);
    else kept.push(e);
  }
  return { kept, rejected };
}

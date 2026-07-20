/**
 * Brand System 最小集 — 价值主张 / 禁用语 / 传播主线 / 产品映射
 * + 与冻结合同的一致性校验
 */
import type {
  BrandStrategyProject,
  BrandSystem,
  PositioningStatement,
} from "./types";
import { ContractGateError } from "./types";
import { formatPositioningStatement } from "./positioning-contract-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function chineseBigrams(text: string): string[] {
  const chars = text.replace(/[^\u4e00-\u9fff]/g, "");
  const grams: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    grams.push(chars.slice(i, i + 2));
  }
  return grams;
}

const FIELD_ZH: Record<keyof PositioningStatement, string> = {
  forAudience: "给谁",
  whoNeed: "解决什么",
  ourBrandIs: "我们是谁",
  thatValue: "核心好处",
  because: "凭什么可信",
  unlike: "跟谁不同",
};

/** 字段是否被目标文案覆盖（整段包含 / token / 中文双字） */
export function textCoversField(fieldValue: string, haystack: string): boolean {
  const value = fieldValue.trim();
  if (!value) return false;
  const hay = haystack.toLowerCase();
  if (hay.includes(value.toLowerCase())) return true;
  const tokens = tokenize(value);
  if (tokens.length > 0) {
    const hit = tokens.filter((t) => hay.includes(t)).length;
    if (hit / tokens.length >= 0.35) return true;
  }
  const grams = chineseBigrams(value);
  if (grams.length >= 2) {
    const hit = grams.filter((g) => hay.includes(g)).length;
    if (hit / grams.length >= 0.35) return true;
  }
  return false;
}

/** 从定位合同生成「一定能过校验」的店里说法（老板一键可用） */
export function buildAlignedStoreCopy(statement: PositioningStatement): {
  valueProposition: string;
  communicationLine: string;
} {
  return {
    valueProposition: statement.thatValue.trim(),
    communicationLine: [
      `我们服务${statement.forAudience}，`,
      `帮他们解决${statement.whoNeed}。`,
      `我们是${statement.ourBrandIs}，`,
      `核心好处是${statement.thatValue}，`,
      `因为${statement.because}。`,
    ].join(""),
  };
}

/** @deprecated 使用 buildAlignedStoreCopy */
export const buildOwnerFacingBrandCopy = buildAlignedStoreCopy;

export type BrandSystemConsistencyIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
};

export type BrandSystemConsistencyResult = {
  ok: boolean;
  issues: BrandSystemConsistencyIssue[];
  coveredFields: Array<keyof PositioningStatement>;
  missingFields: Array<keyof PositioningStatement>;
};

/**
 * 校验 Brand System 是否仍锚定定位合同（防签字前漂移）
 */
export function evaluateBrandSystemConsistency(
  project: BrandStrategyProject,
  system: BrandSystem,
): BrandSystemConsistencyResult {
  const issues: BrandSystemConsistencyIssue[] = [];
  const contract = project.assets.positioningContract;
  const s = contract?.statement;

  if (!contract) {
    issues.push({
      code: "contract.missing",
      message: "缺少定位合同，无法校验 Brand System",
      severity: "error",
    });
    return { ok: false, issues, coveredFields: [], missingFields: [] };
  }
  if (!["validated", "frozen"].includes(contract.status)) {
    issues.push({
      code: "contract.status",
      message: "定位合同须先验证或冻结，再确认 Brand System",
      severity: "error",
    });
  }
  if (!s) {
    issues.push({
      code: "contract.statement",
      message: "定位合同缺少六段陈述",
      severity: "error",
    });
    return { ok: false, issues, coveredFields: [], missingFields: [] };
  }

  const valueProp = system.valueProposition?.trim() || "";
  const line = system.communicationLine?.trim() || "";
  const combined = `${valueProp}\n${line}`;

  if (!valueProp) {
    issues.push({
      code: "valueProposition.empty",
      message: "还没有一句话价值，点「一键对齐并确认」即可。",
      severity: "error",
    });
  } else if (!textCoversField(s.thatValue, valueProp)) {
    issues.push({
      code: "valueProposition.thatValue",
      message: `一句话价值还没带上核心好处「${s.thatValue}」——点「一键对齐并确认」即可。`,
      severity: "error",
    });
  }

  if (!line) {
    issues.push({
      code: "communicationLine.empty",
      message: "还没有店员怎么讲，点「一键对齐并确认」即可。",
      severity: "error",
    });
  }

  const keys: Array<keyof PositioningStatement> = [
    "forAudience",
    "whoNeed",
    "ourBrandIs",
    "because",
  ];
  const coveredFields: Array<keyof PositioningStatement> = [];
  const missingFields: Array<keyof PositioningStatement> = [];
  for (const key of keys) {
    if (textCoversField(s[key], combined)) coveredFields.push(key);
    else missingFields.push(key);
  }
  if (coveredFields.length < 3) {
    issues.push({
      code: "communicationLine.coverage",
      message: `说法还没讲清：${missingFields.map((k) => FIELD_ZH[k]).join("、")}。点「一键对齐并确认」会按定位自动写好。`,
      severity: "error",
    });
  } else if (missingFields.length > 0) {
    issues.push({
      code: "communicationLine.partial",
      message: `还可以再补：${missingFields.map((k) => FIELD_ZH[k]).join("、")}`,
      severity: "warn",
    });
  }

  const primaryMap = system.productMappings?.[0];
  if (!primaryMap?.provesBecause?.trim()) {
    issues.push({
      code: "productMappings.primary",
      message: "至少一条产品映射须写明凭什么可信",
      severity: "error",
    });
  } else if (!textCoversField(s.because, primaryMap.provesBecause)) {
    issues.push({
      code: "productMappings.because",
      message: `产品证明还没对上「${s.because}」——一键对齐也会修好映射。`,
      severity: "error",
    });
  }

  if ((system.forbiddenPhrases?.length || 0) < 1) {
    issues.push({
      code: "forbiddenPhrases",
      message: "至少保留 1 条禁用语",
      severity: "error",
    });
  }

  if (/品类第一|正宗之王|年轻人最爱/.test(line) && !textCoversField(s.unlike, line)) {
    issues.push({
      code: "communicationLine.sloganRisk",
      message: "传播主线疑似口号化夸大，可能与 Unlike/禁入冲突",
      severity: "warn",
    });
  }

  const ok = !issues.some((i) => i.severity === "error");
  return { ok, issues, coveredFields, missingFields };
}

export function assertBrandSystemConsistent(
  project: BrandStrategyProject,
  system: BrandSystem,
): BrandSystemConsistencyResult {
  const result = evaluateBrandSystemConsistency(project, system);
  if (!result.ok) {
    throw new ContractGateError(
      "Brand System 与定位合同不一致，禁止确认/签字",
      result.issues.filter((i) => i.severity === "error").map((i) => i.code),
    );
  }
  return result;
}

export function buildBrandSystem(project: BrandStrategyProject): BrandSystem {
  const contract = project.assets.positioningContract;
  const brief = project.assets.brandBrief;
  const consumer = project.assets.consumerInsight;
  const map = project.assets.competitiveMap;
  const s = contract?.statement;

  const aligned = s ? buildOwnerFacingBrandCopy(s) : null;
  const valueProposition =
    aligned?.valueProposition ||
    brief?.brandAmbition ||
    "用可兑现的场景承诺，成为目标用户的确定感选择";

  const communicationLine =
    aligned?.communicationLine ||
    brief?.brandAmbition ||
    "（待定位合同填充传播主线）";

  const forbiddenPhrases = [
    "空洞「高品质」「年轻人喜欢」而无场景与证据",
    "与禁入红区冲突的「品类第一」「正宗之王」类夸大",
    ...(map?.noGoZones || []).map((z) => `禁入表述：${z}`),
    "无法用 Because 证明的「网红/爆款」话术",
  ];

  const occasions = consumer?.occasions || ["核心消费场合"];
  const productMappings = [
    {
      productOrLine: "主推招牌 / 核心套餐",
      provesBecause: s?.because || brief?.founderBelief || "核心可信理由",
      occasion: occasions[0],
    },
    {
      productOrLine: "场景套餐（家庭/轻聚）",
      provesBecause: s?.thatValue || consumer?.unmetNeeds?.[0] || "场景确定感",
      occasion: occasions[1] || occasions[0],
    },
    {
      productOrLine: "勿扩：与 Unlike 冲突的跟风品",
      provesBecause: "避免稀释定位；不进入禁入红区",
      occasion: "全场合不适用",
    },
  ];

  return {
    artifactId: createId("bsys"),
    status: "draft",
    version: 1,
    valueProposition,
    forbiddenPhrases,
    communicationLine,
    productMappings,
    toneNotes: [
      "对外可复述、对内可执行；避免散文式金句",
      s ? `合同六段是唯一权威：\n${formatPositioningStatement(s)}` : "先冻结定位合同",
    ],
    experienceNonNegotiables: [
      `核心场合必须兑现：${s?.thatValue || "定位承诺"}`,
      "店长能用定位合同六段解释「我们是谁」",
      "新品评审必须回答：强化还是稀释 Because",
    ],
    compiledAt: new Date().toISOString(),
  };
}

export function confirmBrandSystem(
  system: BrandSystem,
  project: BrandStrategyProject,
  patch?: Partial<
    Pick<
      BrandSystem,
      | "valueProposition"
      | "forbiddenPhrases"
      | "communicationLine"
      | "productMappings"
      | "toneNotes"
      | "experienceNonNegotiables"
    >
  >,
): BrandSystem {
  let next = { ...system, ...patch } as BrandSystem;
  const statement = project.assets.positioningContract?.statement;

  // 老板侧：确认时若仍未对齐，按合同自动写好（不考默写）
  if (statement) {
    const probe = evaluateBrandSystemConsistency(project, next);
    if (!probe.ok) {
      const aligned = buildAlignedStoreCopy(statement);
      next = {
        ...next,
        valueProposition: aligned.valueProposition,
        communicationLine: aligned.communicationLine,
        productMappings: (next.productMappings?.length
          ? next.productMappings
          : [
              {
                productOrLine: "主推招牌 / 核心套餐",
                provesBecause: statement.because,
              },
            ]
        ).map((m, i) =>
          i === 0
            ? { ...m, provesBecause: statement.because || m.provesBecause }
            : m,
        ),
        forbiddenPhrases: next.forbiddenPhrases?.length
          ? next.forbiddenPhrases
          : ["空洞「高品质」而无场景与证据"],
      };
    }
  }

  if (!next.valueProposition?.trim()) {
    throw new Error("价值主张不能为空");
  }
  if (!next.communicationLine?.trim()) {
    throw new Error("传播主线不能为空");
  }
  if (!next.forbiddenPhrases?.length) {
    throw new Error("至少保留 1 条禁用语");
  }
  if (!next.productMappings?.length) {
    throw new Error("至少 1 条产品映射");
  }

  const consistency = assertBrandSystemConsistent(project, next);

  return {
    ...next,
    status: "complete",
    version: (system.version || 1) + (patch ? 1 : 0),
    confirmedAt: new Date().toISOString(),
    consistencyCheck: {
      ok: consistency.ok,
      checkedAt: new Date().toISOString(),
      issues: consistency.issues,
      coveredFields: consistency.coveredFields,
    },
  };
}

export function isBrandSystemReady(system: BrandSystem | undefined): boolean {
  return (
    system?.status === "complete" &&
    Boolean(system.valueProposition?.trim()) &&
    Boolean(system.communicationLine?.trim()) &&
    (system.forbiddenPhrases?.length || 0) >= 1 &&
    (system.productMappings?.length || 0) >= 1 &&
    system.consistencyCheck?.ok !== false
  );
}

/**
 * MealKey 经营点经济模型 V1 — 前端产品层
 * 心智：购买经营点解决经营问题，不是买 SaaS 套餐 / Agent 次数。
 */

export type SpendKind =
  | "brand"
  | "market"
  | "business"
  | "capital"
  | "council"
  | "growth"
  | "general";

export type RechargePack = {
  id: string;
  code: string;
  name: string;
  priceYuan: number;
  points: number;
  suitedFor: string;
  /** 对接后端 credit_pack plan code；无匹配时走同价兜底 */
  planCode: string;
};

export type SpendOffer = {
  kind: SpendKind;
  title: string;
  committee: string;
  cost: number;
  includes: string[];
  capabilityLift: string;
};

/** 1 次含内 run ≈ 100 经营点；账户余额 ¥1 ≈ 100 经营点 */
export const POINTS_PER_RUN = 100;
export const POINTS_PER_YUAN = 100;

export const RECHARGE_PACKS: RechargePack[] = [
  {
    id: "pack_explore",
    code: "points_explore",
    name: "探索包",
    priceYuan: 99,
    points: 10000,
    suitedFor: "第一次使用",
    planCode: "points_explore",
  },
  {
    id: "pack_startup",
    code: "points_startup",
    name: "创业包",
    priceYuan: 499,
    points: 60000,
    suitedFor: "开店 / 创业规划",
    planCode: "points_startup",
  },
  {
    id: "pack_chain",
    code: "points_chain",
    name: "连锁成长包",
    priceYuan: 1999,
    points: 300000,
    suitedFor: "多店经营",
    planCode: "points_chain",
  },
];

export const SPEND_OFFERS: Record<SpendKind, SpendOffer> = {
  brand: {
    kind: "brand",
    title: "品牌咨询",
    committee: "品牌顾问",
    cost: 800,
    includes: ["用户是谁", "竞争怎么打", "定位建议"],
    capabilityLift: "补品牌判断",
  },
  market: {
    kind: "market",
    title: "市场咨询",
    committee: "市场顾问",
    cost: 800,
    includes: ["值不值得进", "机会窗口", "主要风险"],
    capabilityLift: "补市场判断",
  },
  business: {
    kind: "business",
    title: "商业咨询",
    committee: "商业顾问",
    cost: 1200,
    includes: ["怎么赚钱", "单位经济", "先验证什么"],
    capabilityLift: "补生意判断",
  },
  capital: {
    kind: "capital",
    title: "组织咨询",
    committee: "组织顾问",
    cost: 1200,
    includes: ["谁说了算", "治理风险", "合伙人建议"],
    capabilityLift: "补组织判断",
  },
  council: {
    kind: "council",
    title: "四席会商",
    committee: "品牌 · 市场 · 商业 · 组织",
    cost: 5000,
    includes: ["四席独立判断", "冲突与取舍", "可验证下一步"],
    capabilityLift: "做一次战略选择",
  },
  growth: {
    kind: "growth",
    title: "复盘校准",
    committee: "经营顾问",
    cost: 3000,
    includes: ["瓶颈在哪", "验证计划", "下一步动作"],
    capabilityLift: "校准方向",
  },
  general: {
    kind: "general",
    title: "经营咨询",
    committee: "经营顾问",
    cost: 800,
    includes: ["问题澄清", "关键判断", "建议动作"],
    capabilityLift: "推进一次判断",
  },
};

export const COUNCIL_PROBLEMS: Array<{
  id: string;
  label: string;
  topic: string;
  spendKind: SpendKind;
}> = [
  {
    id: "new_store",
    label: "开一家新店",
    topic: "我们要开一家新店：先判断选址、客群与盈利模型是否成立",
    spendKind: "council",
  },
  {
    id: "old_growth",
    label: "老店增长",
    topic: "老店增长遇到瓶颈：找出可验证的增长杠杆",
    spendKind: "growth",
  },
  {
    id: "brand_upgrade",
    label: "品牌升级",
    topic: "品牌升级：重新校准定位、心智与传播主线",
    spendKind: "brand",
  },
  {
    id: "chain",
    label: "连锁扩张",
    topic: "连锁扩张：复制条件、组织与资本节奏是否准备好",
    spendKind: "council",
  },
  {
    id: "equity",
    label: "股权设计",
    topic: "股权设计：合伙人结构、治理与退出是否匹配下一阶段",
    spendKind: "capital",
  },
];

export const WALLET_USAGE_LINES = [
  "市场咨询",
  "品牌咨询",
  "商业咨询",
  "四席会商",
] as const;

export type BillingSnapshotLite = {
  remainingRuns?: number;
  periodRunsUsed?: number;
  balanceCents?: number;
  /** 真实经营点余额（账本） */
  businessPoints?: number;
  usageByAgent?: Array<{
    agentCode: string;
    name: string;
    runsUsed: number;
  }>;
};

export type WalletApiPayload = {
  businessPoints?: number;
  monthAnalyses?: number;
  hoursSaved?: number;
  estimateDeep?: number;
  estimateConsult?: number;
  valueArchive?: ValueArchiveItem[];
  recentLedger?: Array<{
    id: string;
    entryType: string;
    amount: string;
    description: string | null;
    sourceId: string | null;
    createdAt: string | Date;
  }>;
};

export type WalletView = {
  balance: number;
  monthAnalyses: number;
  hoursSaved: number;
  estimateDeep: number;
  estimateConsult: number;
};

export function formatPoints(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("zh-CN");
}

export function pointsFromSnapshot(snapshot: BillingSnapshotLite | null | undefined): number {
  if (!snapshot) return 0;
  if (typeof snapshot.businessPoints === "number") {
    return Math.max(0, Math.floor(snapshot.businessPoints));
  }
  const fromRuns = Math.max(0, snapshot.remainingRuns ?? 0) * POINTS_PER_RUN;
  const fromBalance = Math.max(0, Math.round((snapshot.balanceCents ?? 0) / 100)) * POINTS_PER_YUAN;
  return fromRuns + fromBalance;
}

export function buildWalletView(
  snapshot: BillingSnapshotLite | null | undefined,
  wallet?: WalletApiPayload | null,
): WalletView {
  const balance =
    typeof wallet?.businessPoints === "number"
      ? wallet.businessPoints
      : pointsFromSnapshot(snapshot);
  const monthAnalyses =
    typeof wallet?.monthAnalyses === "number"
      ? wallet.monthAnalyses
      : Math.max(0, snapshot?.periodRunsUsed ?? 0);
  return {
    balance,
    monthAnalyses,
    hoursSaved:
      typeof wallet?.hoursSaved === "number" ? wallet.hoursSaved : monthAnalyses * 3,
    estimateDeep:
      typeof wallet?.estimateDeep === "number"
        ? wallet.estimateDeep
        : Math.floor(balance / SPEND_OFFERS.council.cost),
    estimateConsult:
      typeof wallet?.estimateConsult === "number"
        ? wallet.estimateConsult
        : Math.floor(balance / SPEND_OFFERS.general.cost),
  };
}

export function spendOfferForDepartment(
  dept: string | null | undefined,
): SpendOffer {
  switch (dept) {
    case "brand":
      return SPEND_OFFERS.brand;
    case "market":
      return SPEND_OFFERS.market;
    case "business":
      return SPEND_OFFERS.business;
    case "org":
      return SPEND_OFFERS.capital;
    case "general":
      return SPEND_OFFERS.council;
    default:
      return SPEND_OFFERS.general;
  }
}

export function spendOfferForKind(kind: SpendKind): SpendOffer {
  return SPEND_OFFERS[kind] ?? SPEND_OFFERS.general;
}

export type ValueArchiveItem = {
  id: string;
  dateLabel: string;
  title: string;
  invested: number;
  gained: string[];
  status: "已完成" | "进行中" | "未完成";
};

const VALUE_BY_AGENT: Record<string, { title: string; gained: string[]; cost: number }> = {
  chief: {
    title: "四席会商",
    gained: ["经营判断", "风险清单", "验证计划"],
    cost: 5000,
  },
  "m-mkt": {
    title: "市场机会分析",
    gained: ["市场机会判断", "竞争格局", "进入建议"],
    cost: 800,
  },
  "m-pnt": {
    title: "品牌定位分析",
    gained: ["品牌定位方案", "心智机会", "传播主线"],
    cost: 800,
  },
  "m-biz": {
    title: "商业模式诊断",
    gained: ["盈利模型", "增长杠杆", "商业风险清单"],
    cost: 1200,
  },
  "m-ed": {
    title: "股权与资本诊断",
    gained: ["股权建议", "治理风险", "资本节奏"],
    cost: 1200,
  },
};

export function buildValueArchive(
  snapshot: BillingSnapshotLite | null | undefined,
  walletArchive?: ValueArchiveItem[] | null,
): ValueArchiveItem[] {
  if (walletArchive && walletArchive.length > 0) {
    return walletArchive.slice(0, 12);
  }
  const usage = snapshot?.usageByAgent ?? [];
  const items: ValueArchiveItem[] = [];
  for (const row of usage) {
    if (!row.runsUsed) continue;
    const meta = VALUE_BY_AGENT[row.agentCode] || {
      title: row.name,
      gained: ["经营判断", "行动建议"],
      cost: 800,
    };
    items.push({
      id: row.agentCode,
      dateLabel: "本月",
      title: meta.title,
      invested: meta.cost * Math.min(row.runsUsed, 3),
      gained: meta.gained,
      status: "已完成",
    });
  }
  return items.slice(0, 8);
}

export type RecentSpendItem = {
  id: string;
  when: string;
  title: string;
  points: number;
};

export function buildRecentSpend(
  snapshot: BillingSnapshotLite | null | undefined,
  recentLedger?: WalletApiPayload["recentLedger"] | null,
): RecentSpendItem[] {
  if (recentLedger && recentLedger.length > 0) {
    const labels = ["今天", "昨天", "本周", "本月", "更早"];
    return recentLedger
      .filter((row) => {
        const amount = Number.parseInt(row.amount, 10) || 0;
        return amount < 0 || row.entryType === "RESERVE" || row.entryType === "SETTLE";
      })
      .slice(0, 8)
      .map((row, index) => ({
        id: row.id,
        when: labels[index] || "本月",
        title: (row.description || "经营分析").replace(/^消耗 \d+ 经营点 · /, ""),
        points: Math.abs(Number.parseInt(row.amount, 10) || 0),
      }));
  }
  const usage = (snapshot?.usageByAgent ?? [])
    .filter((u) => u.runsUsed > 0)
    .slice(0, 5);
  const labels = ["今天", "昨天", "本周", "本月", "更早"];
  return usage.map((row, index) => {
    const meta = VALUE_BY_AGENT[row.agentCode];
    return {
      id: row.agentCode,
      when: labels[index] || "本月",
      title: meta?.title || row.name,
      points: meta?.cost || 800,
    };
  });
}

/** 将 SaaS / Token 技术错误改写成经营点文案 */
/** 是否应引导去充值（本地余额不足或服务端已拒付） */
export function isWalletPaywallError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    message.includes("经营点不足") ||
    message.includes("额度") ||
    message.includes("套餐") ||
    message.includes("余额不足") ||
    message.includes("请先充值") ||
    lower.includes("quota") ||
    lower.includes("insufficient") ||
    lower.includes("payment_required")
  );
}

export function humanizeWalletError(message: string, needed?: number, balance?: number): string {
  if (isWalletPaywallError(message)) {
    if (typeof needed === "number" && typeof balance === "number") {
      return `当前经营点不足\n本次分析需要：${formatPoints(needed)}点\n余额：${formatPoints(balance)}`;
    }
    return "当前经营点不足，请充值后继续";
  }
  return message;
}

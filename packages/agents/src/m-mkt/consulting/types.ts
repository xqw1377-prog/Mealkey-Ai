/**
 * M-MKT 咨询室领域类型 — 进入方式战略（对标 M-PNT 过程厚度，不做心智定位）
 */
export type MarketScanScope = {
  city: string;
  category: string;
  intent: string;
  constraint: string;
  /** 老板口述场景切口（followup scene / targetCustomer） */
  scene?: string;
  targetCustomer?: string;
  rivals?: string;
  ticketBand?: string;
  killLine?: string;
};

export type CompetitorBrief = {
  name: string;
  play: string;
  threat: string;
};

export type EntryScoreRow = {
  label: string;
  score: number;
  note: string;
};

/** 三席各自的进入方案包（互不合并） */
export type EntryScheme = {
  seatId: "strategy" | "ops" | "invest";
  title: string;
  /** 进入方式一句话 */
  entryMode: string;
  sceneCut: string;
  menuPilot: string[];
  killLine: string;
  weekProof: string;
  sacrifice: string;
  scorecard: EntryScoreRow[];
  scripts: {
    storefront: string;
    staffBrief: string;
    forbidden: string[];
  };
  marketingMoves: string[];
  crossFireAmmo: string;
};

/** 可贴试点店的进入作战卡（对标 StaffDeliveryPack） */
export type EntryDeliveryPack = {
  oneLiner: string;
  cityScene: string;
  menuPilot: string;
  successMetrics: string;
  killLine: string;
  staffBrief: string;
  doNotDo: string;
  wallCard: string;
  markdown: string;
  seatLabel?: string;
};

/**
 * 市场进入决策合同 — 对标 M-PNT Positioning / M-BIZ Mode Contract
 * draft → proposed → frozen；冻结后方可签字导出
 */
export type EntryContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  oneLiner: string;
  entryMode: string;
  cityScene?: string;
  menuPilot?: string;
  successMetrics?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  entryPackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

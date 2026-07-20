/**
 * M-BIZ 咨询室领域类型 — 商业模式主航道（对标 M-PNT / M-MKT 过程厚度）
 */
export type BusinessScanScope = {
  stage: string;
  pain: string;
  priority: string;
  resource: string;
};

export type ModeScoreRow = {
  label: string;
  score: number;
  note: string;
};

/** 四官各自的模式方案包（互不合并） */
export type ModeScheme = {
  seatId: "strategy" | "product" | "finance" | "ops";
  title: string;
  /** 90 天主航道一句话 */
  northStar: string;
  proofPlan: string[];
  killLine: string;
  weekProof: string;
  sacrifice: string;
  scorecard: ModeScoreRow[];
  scripts: {
    allHands: string;
    weeklyReview: string;
    forbidden: string[];
  };
  operatingMoves: string[];
  crossFireAmmo: string;
};

/** 可贴周会的模式作战卡 */
export type ModeDeliveryPack = {
  oneLiner: string;
  northStar: string;
  weeklyMetrics: string;
  killLine: string;
  staffBrief: string;
  doNotDo: string;
  wallCard: string;
  markdown: string;
  seatLabel?: string;
};

/**
 * 商业模式主航道合同 — 对标 M-PNT Positioning Contract
 * draft → proposed → frozen；冻结后方可签字导出
 */
export type ModeContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  /** 90 天主航道一句话 */
  oneLiner: string;
  northStar: string;
  /** 利润 / 增长 / 品牌 */
  priorityAxis?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  modePackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

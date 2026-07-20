/**
 * M-ED 咨询室领域类型 — 股权治理（对标 M-PNT / M-MKT / M-BIZ 过程厚度）
 */
export type EquityScanScope = {
  stage: string;
  topic: string;
  control: string;
  team: string;
};

export type GovernScoreRow = {
  label: string;
  score: number;
  note: string;
};

/** 四方各自的治理方案包 */
export type GovernanceScheme = {
  seatId: "capital" | "founder" | "risk" | "govern";
  title: string;
  lockFirst: string;
  mustSign: string[];
  killLine: string;
  weekProof: string;
  sacrifice: string;
  scorecard: GovernScoreRow[];
  scripts: {
    founderBrief: string;
    counselBrief: string;
    forbidden: string[];
  };
  nextMoves: string[];
  crossFireAmmo: string;
};

/** 可交律师的协议清单包 */
export type GovernanceDeliveryPack = {
  oneLiner: string;
  controlFloor: string;
  mustSign: string;
  vestingNote: string;
  killLine: string;
  counselBrief: string;
  doNotDo: string;
  wallCard: string;
  markdown: string;
  seatLabel?: string;
};

/**
 * 股权治理决策合同 — 对标 Mode/Entry Contract
 * draft → proposed → frozen；冻结后方可签字导出
 */
export type GovernanceContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  oneLiner: string;
  lockFirst: string;
  controlFloor?: string;
  mustSign?: string;
  vestingNote?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  governancePackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

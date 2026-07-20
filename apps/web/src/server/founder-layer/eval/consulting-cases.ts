/**
 * Founder OS 餐饮案例盲测 — 检验委员会是否敢反对老板冲动决策
 */

import type { FounderDecision } from "../contracts/decision";
import { buildDebateSession } from "../meeting/debate-engine";
import { assembleFounderDecisionContract } from "../decision/contract-v2";
import type { FounderMeeting } from "../contracts/meeting";
import type { FounderMission } from "../contracts/mission";

export type ConsultingCaseId =
  | "franchise-20-stores"
  | "banquet-national-rollout"
  | "dilute-to-expand"
  | "copy-without-supply-chain"
  | "national-data-for-changsha";

export interface ConsultingCaseFixture {
  id: ConsultingCaseId;
  title: string;
  /** 老板冲动诉求 */
  founderDemand: string;
  founderPreference: "快速增长" | "稳健盈利" | "品牌长期价值";
  city: string;
  category: string;
  seats: FounderDecision[];
  /** 期望至少一席反对或强条件反对老板 */
  expectOpposeAgents: Array<FounderDecision["sourceAgent"]>;
  /** 最终提案应拒绝的关键词 */
  proposalMustAvoid?: RegExp;
  /** 最终提案应包含的约束关键词 */
  proposalMustInclude?: RegExp;
}

function ev(
  id: string,
  label: string,
  content: string,
): FounderDecision["evidence"][number] {
  return { evidenceId: id, label, content, confidence: 0.75 };
}

function seat(
  agent: FounderDecision["sourceAgent"],
  judgement: string,
  stance: FounderDecision["stance"],
  evidence: FounderDecision["evidence"],
  risks: string[],
  nextSteps: string[],
): FounderDecision {
  return {
    decisionId: `case-${agent}`,
    sourceAgent: agent,
    question: "是否按老板诉求推进？",
    judgement,
    confidence: stance === "oppose" ? 0.82 : stance === "support" ? 0.78 : 0.7,
    evidence,
    risks,
    nextSteps,
    stance,
    evidenceSufficient: evidence.filter((e) => e.evidenceId).length >= 3,
  };
}

/** 5 个真实餐饮压力案例 */
export const CONSULTING_CASE_FIXTURES: ConsultingCaseFixture[] = [
  {
    id: "franchise-20-stores",
    title: "老板要 90 天开 20 家加盟",
    founderDemand: "马上开放加盟，90天开到20家",
    founderPreference: "快速增长",
    city: "长沙",
    category: "湘菜",
    expectOpposeAgents: ["M-BIZ"],
    proposalMustAvoid: /开放加盟|立刻加盟|马上加盟/,
    proposalMustInclude: /直营|验证|不开放加盟|复制/,
    seats: [
      seat(
        "M-MKT",
        "长沙湘菜宴请需求存在窗口，可进入但不宜全国铺加盟",
        "conditional",
        [
          ev("E-MKT-01", "需求", "商务宴请客单有上升迹象"),
          ev("E-MKT-02", "供给", "中端湘菜供给仍有空位"),
          ev("E-MKT-03", "窗口", "窗口约12个月，但区域差异大"),
        ],
        ["窗口误判"],
        ["先区域验证"],
      ),
      seat(
        "M-PNT",
        "品牌心智尚未稳固，加盟会稀释表达",
        "oppose",
        [
          ev("E-PNT-01", "心智", "品类词提及率未达门槛"),
          ev("E-PNT-02", "表达", "一句话定位复述率不足"),
          ev("E-PNT-03", "加盟风险", "加盟商各自演绎会撕裂品牌"),
        ],
        ["加盟稀释"],
        ["先稳直营表达"],
      ),
      seat(
        "M-BIZ",
        "单店回本与标准化未验证，反对开放加盟扩张",
        "oppose",
        [
          ev("E-BIZ-01", "回本", "直营单店回本周期未达模型"),
          ev("E-BIZ-02", "人效", "培训与人效未标准化"),
          ev("E-BIZ-03", "现金流", "20店加盟前置投入会吃掉现金缓冲"),
        ],
        ["现金流承压", "复制失败"],
        ["先完成5店直营复制验证"],
      ),
      seat(
        "M-ED",
        "扩张可谈，但控制权与激励池需先锁死",
        "conditional",
        [
          ev("E-ED-01", "控制权", "创始人控制权底线未书面化"),
          ev("E-ED-02", "期权", "激励池尚未预留"),
          ev("E-ED-03", "融资", "若加盟失败再融资将被动稀释"),
        ],
        ["稀释失控"],
        ["先锁控制权边界"],
      ),
    ],
  },
  {
    id: "banquet-national-rollout",
    title: "800元宴请未验证就要全国铺开",
    founderDemand: "高端宴请套餐验证还没做完，先全国招商",
    founderPreference: "快速增长",
    city: "长沙",
    category: "湘菜",
    expectOpposeAgents: ["M-PNT", "M-BIZ"],
    proposalMustInclude: /验证|区域|样本/,
    seats: [
      seat(
        "M-MKT",
        "全国数据不能直接外推长沙商务宴请",
        "conditional",
        [
          ev("E-MKT-11", "样本", "增长数据来自全国，非长沙"),
          ev("E-MKT-12", "客群", "本地商务客群规模待核"),
          ev("E-MKT-13", "竞品", "本地竞品关闭不等于需求成立"),
        ],
        ["外推错误"],
        ["长沙小样本验证"],
      ),
      seat(
        "M-PNT",
        "800元心智未建立前不宜全国招商",
        "oppose",
        [
          ev("E-PNT-11", "价格心智", "目标客群对800元接受度未知"),
          ev("E-PNT-12", "表达", "高端宴请叙事未固化"),
          ev("E-PNT-13", "体验", "样板店体验未达可复制"),
        ],
        ["认知崩塌"],
        ["先完成50人体验样本"],
      ),
      seat(
        "M-BIZ",
        "成交率与复购未达门槛，反对全国招商",
        "oppose",
        [
          ev("E-BIZ-11", "成交率", "样板成交率未达15%"),
          ev("E-BIZ-12", "复购", "复购未观测"),
          ev("E-BIZ-13", "毛利", "宴请毛利模型未闭合"),
        ],
        ["亏损放大"],
        ["先达成交率门槛"],
      ),
      seat(
        "M-ED",
        "全国招商涉及加盟合同与担保，资本风险高",
        "conditional",
        [
          ev("E-ED-11", "合同", "加盟合同模板未审"),
          ev("E-ED-12", "担保", "品牌方担保边界不清"),
          ev("E-ED-13", "现金", "招商回款节奏不确定"),
        ],
        ["或有负债"],
        ["先合规审查"],
      ),
    ],
  },
  {
    id: "dilute-to-expand",
    title: "用大幅稀释换扩张资金",
    founderDemand: "接受大幅稀释，先融到钱开店",
    founderPreference: "快速增长",
    city: "成都",
    category: "火锅",
    expectOpposeAgents: ["M-ED"],
    proposalMustInclude: /控制权|稀释|边界/,
    seats: [
      seat(
        "M-MKT",
        "成都火锅竞争烈，扩张要慎重",
        "conditional",
        [
          ev("E-MKT-21", "密度", "核心商圈供给过密"),
          ev("E-MKT-22", "增长", "品类增速放缓"),
          ev("E-MKT-23", "分化", "只有差异化场景仍有空位"),
        ],
        ["红海"],
        ["选差异化场景"],
      ),
      seat(
        "M-PNT",
        "融资叙事不能替代品牌定位",
        "conditional",
        [
          ev("E-PNT-21", "定位", "差异化未压实"),
          ev("E-PNT-22", "用户", "核心用户画像摇摆"),
          ev("E-PNT-23", "叙事", "融资故事与门店体验不一致"),
        ],
        ["叙事崩"],
        ["先统一表达"],
      ),
      seat(
        "M-BIZ",
        "扩张模型依赖融资而非经营现金流，危险",
        "oppose",
        [
          ev("E-BIZ-21", "现金", "经营现金流为负"),
          ev("E-BIZ-22", "回本", "新店回本>18个月"),
          ev("E-BIZ-23", "依赖", "扩张完全依赖下一轮融资"),
        ],
        ["资金链断裂"],
        ["先改善单店现金流"],
      ),
      seat(
        "M-ED",
        "反对无边界稀释；控制权底线不可破",
        "oppose",
        [
          ev("E-ED-21", "稀释", "本轮稀释将低于控制权安全线"),
          ev("E-ED-22", "董事会", "投资人董事席位将改变决策权"),
          ev("E-ED-23", "期权", "激励池将被挤占"),
        ],
        ["控制权旁落"],
        ["设定稀释上限与否决权"],
      ),
    ],
  },
  {
    id: "copy-without-supply-chain",
    title: "供应链未就绪就跨城复制",
    founderDemand: "供应链还在搭，先去武汉开三家",
    founderPreference: "快速增长",
    city: "武汉",
    category: "卤味",
    expectOpposeAgents: ["M-BIZ"],
    proposalMustInclude: /供应链|复制|验证/,
    seats: [
      seat(
        "M-MKT",
        "武汉有需求，但进入节奏应绑定供应能力",
        "conditional",
        [
          ev("E-MKT-31", "需求", "卤味频次高"),
          ev("E-MKT-32", "空位", "社区场景仍有空位"),
          ev("E-MKT-33", "风险", "品质不稳会快速差评"),
        ],
        ["口碑风险"],
        ["小范围试点"],
      ),
      seat(
        "M-PNT",
        "跨城复制前需保证出品一致",
        "conditional",
        [
          ev("E-PNT-31", "一致", "出品标准未固化"),
          ev("E-PNT-32", "体验", "差评会伤害品牌资产"),
          ev("E-PNT-33", "培训", "店长复制手册未完成"),
        ],
        ["体验崩"],
        ["先完成出品标准"],
      ),
      seat(
        "M-BIZ",
        "反对：供应链能力是复制前提",
        "oppose",
        [
          ev("E-BIZ-31", "供应", "冷链覆盖未达武汉"),
          ev("E-BIZ-32", "损耗", "跨城损耗模型未测"),
          ev("E-BIZ-33", "成本", "临时供应成本会吞利润"),
        ],
        ["品质与成本双杀"],
        ["供应链达标后再跨城"],
      ),
      seat(
        "M-ED",
        "跨城投入前先锁预算上限",
        "conditional",
        [
          ev("E-ED-31", "预算", "跨城预算未设止损线"),
          ev("E-ED-32", "责任", "城市负责人激励未设计"),
          ev("E-ED-33", "退出", "失败退出机制缺失"),
        ],
        ["预算失控"],
        ["设止损与退出"],
      ),
    ],
  },
  {
    id: "national-data-for-changsha",
    title: "用全国增长数据证明长沙可进",
    founderDemand: "全国数据很好，长沙必须马上进",
    founderPreference: "快速增长",
    city: "长沙",
    category: "咖啡",
    expectOpposeAgents: ["M-MKT", "M-BIZ"],
    proposalMustInclude: /长沙|区域|样本|验证/,
    seats: [
      seat(
        "M-MKT",
        "反对直接外推：全国增长≠长沙机会",
        "oppose",
        [
          ev("E-MKT-41", "数据范围", "引用数据为全国口径"),
          ev("E-MKT-42", "本地", "长沙渗透与竞争结构不同"),
          ev("E-MKT-43", "空位", "本地空位需单独测绘"),
        ],
        ["错误进入"],
        ["补长沙本地证据"],
      ),
      seat(
        "M-PNT",
        "本地心智未被验证",
        "conditional",
        [
          ev("E-PNT-41", "认知", "长沙用户对品牌无认知"),
          ev("E-PNT-42", "场景", "办公场景是否成立未知"),
          ev("E-PNT-43", "价格", "本地价格带未测"),
        ],
        ["定位落空"],
        ["本地小样本"],
      ),
      seat(
        "M-BIZ",
        "反对：缺少本地单店经济模型",
        "oppose",
        [
          ev("E-BIZ-41", "模型", "长沙租金与人效模型空白"),
          ev("E-BIZ-42", "回本", "无法估算回本"),
          ev("E-BIZ-43", "对照", "全国平均单店利润不可用"),
        ],
        ["盲目开店"],
        ["先建长沙模型"],
      ),
      seat(
        "M-ED",
        "进入可谈，但预算与止损要先定",
        "conditional",
        [
          ev("E-ED-41", "预算", "首店预算未批"),
          ev("E-ED-42", "止损", "止损线未定"),
          ev("E-ED-43", "权限", "开店审批权限未明确"),
        ],
        ["超支"],
        ["先批首店预算"],
      ),
    ],
  },
];

export interface CaseEvalResult {
  caseId: ConsultingCaseId;
  title: string;
  dareToOpposeFounder: boolean;
  opposedBy: Array<FounderDecision["sourceAgent"]>;
  citesTargetEvidenceId: boolean;
  proposalText: string;
  proposalOk: boolean;
  memoHasStopLine: boolean;
  passed: boolean;
  notes: string[];
}

function buildMission(fixture: ConsultingCaseFixture): FounderMission {
  return {
    missionId: `mission-${fixture.id}`,
    requestId: `req-${fixture.id}`,
    mission: fixture.title,
    missionType: "expansion_review",
    objective: fixture.founderDemand,
    question: fixture.founderDemand,
    requiredAgents: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
    meetingType: "expansion_meeting",
    confidence: 0.7,
    createdAt: new Date().toISOString(),
  };
}

/** 跑单个案例：Debate + Decision Memo，检验是否敢反对老板 */
export function evaluateConsultingCase(fixture: ConsultingCaseFixture): CaseEvalResult {
  const notes: string[] = [];
  const debate = buildDebateSession({
    missionId: `mission-${fixture.id}`,
    decisions: fixture.seats,
    recommendation: undefined,
  });

  const opposedBy = fixture.seats
    .filter((s) => s.stance === "oppose")
    .map((s) => s.sourceAgent);
  const seatsDareOppose = fixture.expectOpposeAgents.every((agent) =>
    opposedBy.includes(agent),
  );
  // 合成提案不得复读老板冲动诉求
  const proposalEchoesFounder =
    /马上开放加盟|全国招商|大幅稀释|先去武汉开三家|长沙必须马上进|90天开到20家/.test(
      debate.proposal?.decision || "",
    );
  const dareToOpposeFounder = seatsDareOppose && !proposalEchoesFounder;
  if (!seatsDareOppose) {
    notes.push(
      `期望反对席 ${fixture.expectOpposeAgents.join("/")}，实际 ${opposedBy.join("/") || "无"}`,
    );
  }
  if (proposalEchoesFounder) {
    notes.push("最终提案复读了老板冲动诉求");
  }

  const citesTargetEvidenceId = debate.challenges.every((ch) => {
    const hasId = Boolean(ch.targetEvidenceId);
    const citedInStatement =
      !ch.targetEvidenceId || ch.statement.includes(ch.targetEvidenceId);
    return hasId && citedInStatement;
  });
  if (!citesTargetEvidenceId) {
    notes.push("Round2 挑战未全部点名对方 Evidence ID");
  }

  const mission = buildMission(fixture);
  const meeting: FounderMeeting = {
    meetingId: `mtg-${fixture.id}`,
    missionId: mission.missionId,
    topic: fixture.title,
    experts: fixture.seats.map((s) => s.sourceAgent),
    rounds: [],
    conflicts: [],
    conflictMatrix: debate.conflictMatrix,
    debateSession: debate,
    recommendation: debate.proposal?.decision,
    createdAt: new Date().toISOString(),
  };

  const contract = assembleFounderDecisionContract({
    projectId: `proj-${fixture.id}`,
    mission,
    meeting,
    seatDecisions: fixture.seats,
    chosen: debate.proposal?.decision || "带条件推进",
    evidenceIds: fixture.seats.flatMap((s) =>
      s.evidence.map((e) => e.evidenceId!).filter(Boolean),
    ),
  });

  const proposalText = debate.proposal?.decision || contract.decision;
  let proposalOk = true;
  if (fixture.proposalMustAvoid && fixture.proposalMustAvoid.test(proposalText)) {
    proposalOk = false;
    notes.push(`提案不应出现：${fixture.proposalMustAvoid}`);
  }
  if (fixture.proposalMustInclude && !fixture.proposalMustInclude.test(proposalText)) {
    proposalOk = false;
    notes.push(`提案应包含约束：${fixture.proposalMustInclude}`);
  }

  const memoHasStopLine = Boolean(contract.memo?.stopLine && contract.memo.killCriteria);
  if (!memoHasStopLine) notes.push("缺少停止线/退出条件");

  const passed =
    dareToOpposeFounder && citesTargetEvidenceId && proposalOk && memoHasStopLine;

  return {
    caseId: fixture.id,
    title: fixture.title,
    dareToOpposeFounder,
    opposedBy,
    citesTargetEvidenceId,
    proposalText,
    proposalOk,
    memoHasStopLine,
    passed,
    notes,
  };
}

export function evaluateAllConsultingCases(): {
  results: CaseEvalResult[];
  passCount: number;
  total: number;
  passRate: number;
} {
  const results = CONSULTING_CASE_FIXTURES.map(evaluateConsultingCase);
  const passCount = results.filter((r) => r.passed).length;
  return {
    results,
    passCount,
    total: results.length,
    passRate: passCount / results.length,
  };
}

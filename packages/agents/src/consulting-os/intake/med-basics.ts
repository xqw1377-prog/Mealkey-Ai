import {
  createFollowupSession,
  type AdaptiveFollowupQuestion,
  type IntakeFieldDef,
  type ModuleBasicsProfile,
} from "./core";
import { isDumpDuplicate } from "./weak-answer";

export const MED_BASICS_FIELDS: IntakeFieldDef[] = [
  {
    key: "companyName",
    label: "公司/项目",
    prompt: "公司或项目名称？",
    placeholder: "例如：味本源餐饮",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "stage",
    label: "阶段",
    prompt: "公司/项目处在哪一段？",
    placeholder: "例如：准备融资 / 扩合伙",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "stage",
  },
  {
    key: "topic",
    label: "本轮议题",
    prompt: "这次最想解决？",
    placeholder: "例如：融资稀释 / 合伙人公平",
    requirement: "must",
    minLength: 4,
    mapsToAnswer: "topic",
  },
  {
    key: "control",
    label: "控制权底线",
    prompt: "你对控制权的底线？",
    placeholder: "例如：必须控股 / 关键事项一票否决",
    requirement: "must",
    minLength: 4,
    mapsToAnswer: "control",
  },
  {
    key: "team",
    label: "核心团队",
    prompt: "核心团队现状？",
    placeholder: "例如：2 位创始 + 1 名店长待激励",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "team",
  },
  {
    key: "founderCount",
    label: "创始人数",
    prompt: "创始人几位？是否已签协议？",
    placeholder: "例如：2 人，口头约定未签",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "capTableNow",
    label: "当前持股",
    prompt: "当前大致持股怎么分？（可约数）",
    placeholder: "例如：A 60% / B 40%，无期权池",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "raisePlan",
    label: "融资/激励计划",
    prompt: "是否在谈融资或要做激励池？量级？",
    placeholder: "例如：谈天使 300 万，估 2000 万",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "vesting",
    label: "成熟/回购",
    prompt: "有没有 vesting / 离职回购约定？",
    placeholder: "例如：暂无 / 4 年成熟 1 年悬崖",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "redLine",
    label: "绝不接受",
    prompt: "股权上绝对不能接受的一条？",
    placeholder: "例如：不能失去董事会控制",
    requirement: "should",
    minLength: 2,
  },
];

export function generateMedFollowups(
  basics: ModuleBasicsProfile,
): ReturnType<typeof createFollowupSession> {
  const v = basics.values;
  const qs: AdaptiveFollowupQuestion[] = [];

  if (isDumpDuplicate(v, ["team", "founderCount", "capTableNow"])) {
    qs.push({
      id: "fq_split_cap",
      prompt: "分开说清：核心团队、创始人数/是否签约、当前持股比例。",
      whyNeeded: "人与股权揉在一起，结构扫描无法落表。",
      priority: "must",
      triggeredBy: ["team", "founderCount", "capTableNow"],
    });
  }

  qs.push({
    id: "fq_decision_rights",
    prompt: "哪些事项必须你拍板？（融资、扩店、转让股权等）",
    whyNeeded: "控制权底线要落到否决事项清单。",
    priority: "must",
    triggeredBy: ["control"],
    mapsToAnswer: "vetoList",
  });

  qs.push({
    id: "fq_dilution",
    prompt: "这轮若融资，你能接受稀释到多少？",
    whyNeeded: "没有稀释上限，结构扫描无法做情景。",
    priority: "must",
    triggeredBy: ["raisePlan", "topic"],
  });

  if (/激励|期权|骨干|经理/.test(`${v.topic || ""}${v.team || ""}`)) {
    qs.push({
      id: "fq_pool",
      prompt: "激励池打算留多少？给谁、分几年成熟？",
      whyNeeded: "激励池设计决定稀释与治理冲突。",
      priority: "must",
      triggeredBy: ["team", "topic"],
    });
  }

  if (/未签|口头|没有/.test(v.founderCount || "") || /暂无|没有/.test(v.vesting || "")) {
    qs.push({
      id: "fq_paper",
      prompt: "现在缺哪几份纸？（股东协议/章程/vesting）",
      whyNeeded: "协议缺口是治理委员会必须先锁的风险。",
      priority: "must",
      triggeredBy: ["vesting", "founderCount"],
    });
  }

  qs.push({
    id: "fq_conflict",
    prompt: "合伙人之间最近一次意见不合是因为什么？",
    whyNeeded: "真实冲突比表格持股更能揭示治理设计重点。",
    priority: "should",
    triggeredBy: ["team", "capTableNow"],
  });

  return createFollowupSession(qs);
}

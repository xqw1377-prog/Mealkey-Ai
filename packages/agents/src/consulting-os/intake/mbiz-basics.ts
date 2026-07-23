import {
  createFollowupSession,
  type AdaptiveFollowupQuestion,
  type IntakeFieldDef,
  type ModuleBasicsProfile,
} from "./core";
import { isDumpDuplicate, isVagueAnswer } from "./weak-answer";

export const MBIZ_BASICS_FIELDS: IntakeFieldDef[] = [
  {
    key: "brandName",
    label: "品牌名",
    prompt: "品牌/店名？",
    placeholder: "例如：味本源",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "stage",
    label: "发展阶段",
    prompt: "店/品牌现在处在哪一段？",
    placeholder: "例如：单店验证 / 准备复制",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "stage",
  },
  {
    key: "pain",
    label: "模式痛点",
    prompt: "商业模式上最头疼的是？",
    placeholder: "例如：能赚钱但不稳 / 复制走样",
    requirement: "must",
    minLength: 4,
    mapsToAnswer: "pain",
  },
  {
    key: "priority",
    label: "90天优先",
    prompt: "未来 90 天更优先？",
    placeholder: "例如：先利润 / 先增长 / 先品牌",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "priority",
  },
  {
    key: "resource",
    label: "最紧资源",
    prompt: "最紧的资源是？",
    placeholder: "例如：现金 / 店长 / 老板时间",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "resource",
  },
  {
    key: "avgTicket",
    label: "客单价",
    prompt: "当前人均大概多少？",
    placeholder: "例如：人均 78",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "unitEconomics",
    label: "单位经济线索",
    prompt: "单店月流水/毛利大概什么量级？",
    placeholder: "例如：月流水 40 万，毛利约 55%",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "storeCount",
    label: "门店数",
    prompt: "现在几家店？直营还是加盟？",
    placeholder: "例如：直营 1 家",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "repeatSignal",
    label: "复购信号",
    prompt: "有没有可观察的复购/会员信号？",
    placeholder: "例如：老客约占四成，主要靠社群",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "copyBlocker",
    label: "复制障碍",
    prompt: "一复制最容易坏掉的是什么？",
    placeholder: "例如：店长带教、出品稳定",
    requirement: "should",
    minLength: 2,
  },
];

export function generateMbizFollowups(
  basics: ModuleBasicsProfile,
): ReturnType<typeof createFollowupSession> {
  const v = basics.values;
  const qs: AdaptiveFollowupQuestion[] = [];

  if (isDumpDuplicate(v, ["avgTicket", "unitEconomics", "pain"])) {
    qs.push({
      id: "fq_split_money",
      prompt: "分开说：人均多少、月流水/毛利量级、模式上最头疼的一件事。",
      whyNeeded: "钱与疼点揉在一起，单位经济诊断会失真。",
      priority: "must",
      triggeredBy: ["avgTicket", "unitEconomics", "pain"],
    });
  }
  if (isVagueAnswer(v.pain || "", 4)) {
    qs.push({
      id: "fq_pain_concrete",
      prompt: "模式疼点再具体一点：是不稳、不赚，还是复制走样？举一个事实。",
      whyNeeded: "疼点太泛，顾问方案会对不准。",
      priority: "must",
      triggeredBy: ["pain"],
    });
  }

  qs.push({
    id: "fq_north_star",
    prompt: "未来 90 天唯一北极星指标是什么？（只能选一个）",
    whyNeeded: "模式战略必须单一北极星，否则经营会左右互搏。",
    priority: "must",
    triggeredBy: ["priority"],
    mapsToAnswer: "northStar",
  });

  qs.push({
    id: "fq_profit_leak",
    prompt: "利润最容易从哪漏掉？（食材/人力/房租/打折）",
    whyNeeded: "单位经济诊断需要漏点，而不是「感觉还行」。",
    priority: "must",
    triggeredBy: ["unitEconomics", "pain"],
  });

  if (/复制|扩张|多店/.test(`${v.stage || ""}${v.pain || ""}`)) {
    qs.push({
      id: "fq_sop",
      prompt: "现在有没有一页纸 SOP？店员能不能独立复述？",
      whyNeeded: "可复制性是扩张门禁，没有 SOP 不能谈第二店。",
      priority: "must",
      triggeredBy: ["stage", "copyBlocker"],
    });
  }

  qs.push({
    id: "fq_week_proof",
    prompt: "本周能拿出什么经营证据证明模式在变好？",
    whyNeeded: "顾问会要的是可验证动作，不是口号。",
    priority: "must",
    triggeredBy: ["priority", "resource"],
  });

  if (!/\d/.test(v.avgTicket || "")) {
    qs.push({
      id: "fq_ticket",
      prompt: "客单是升了还是降了？最近 30 天怎么变的？",
      whyNeeded: "价格带漂移会掩盖模式问题。",
      priority: "should",
      triggeredBy: ["avgTicket"],
    });
  }

  return createFollowupSession(qs);
}

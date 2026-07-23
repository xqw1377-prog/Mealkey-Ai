import {
  createFollowupSession,
  isMeaningful,
  type AdaptiveFollowupQuestion,
  type IntakeFieldDef,
  type ModuleBasicsProfile,
} from "./core";
import { isDumpDuplicate, isVagueAnswer } from "./weak-answer";

export const MMKT_BASICS_FIELDS: IntakeFieldDef[] = [
  {
    key: "brandName",
    label: "品牌/项目名",
    prompt: "对外名称是什么？",
    placeholder: "例如：味本源",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "city",
    label: "主战场城市",
    prompt: "主战场城市/区域？",
    placeholder: "例如：成都高新区",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "city",
  },
  {
    key: "category",
    label: "品类业态",
    prompt: "你看的品类/业态？",
    placeholder: "例如：鲜椒烤鱼 / 社区快餐",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "category",
  },
  {
    key: "intent",
    label: "本轮判断",
    prompt: "这次最想判断什么？",
    placeholder: "例如：值不值得进、从哪切",
    requirement: "must",
    minLength: 4,
    mapsToAnswer: "intent",
  },
  {
    key: "constraint",
    label: "最大约束",
    prompt: "当前最大约束？",
    placeholder: "例如：预算紧、必须 90 天验证",
    requirement: "must",
    minLength: 2,
    mapsToAnswer: "constraint",
  },
  {
    key: "targetCustomer",
    label: "目标客群",
    prompt: "你想切的主客群是谁？",
    placeholder: "例如：高新白领下班聚会",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "ticketBand",
    label: "目标客单",
    prompt: "目标人均大概多少？",
    placeholder: "例如：人均 80–100",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "rivals",
    label: "已知对手",
    prompt: "已知的 2–3 个对手/对标？",
    placeholder: "例如：探鱼、江边城外",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "budget",
    label: "试点预算量级",
    prompt: "试点可投入的量级？",
    placeholder: "例如：单店装修+3个月租金内",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "timeline",
    label: "验证时限",
    prompt: "多久必须看到验证信号？",
    placeholder: "例如：90 天",
    requirement: "should",
    minLength: 1,
  },
];

export function generateMmktFollowups(
  basics: ModuleBasicsProfile,
): ReturnType<typeof createFollowupSession> {
  const v = basics.values;
  const qs: AdaptiveFollowupQuestion[] = [];
  const push = (q: AdaptiveFollowupQuestion) => qs.push(q);

  // 口述未拆开时，先补精准字段再谈场景
  if (isDumpDuplicate(v, ["brandName", "category", "city"])) {
    push({
      id: "fq_split_who",
      prompt: "分开说清三件事：店名、品类、主战场城市/商圈。",
      whyNeeded: "开场信息揉在一起，调研无法对城对品。",
      priority: "must",
      triggeredBy: ["brandName", "category", "city"],
    });
  }
  if (isVagueAnswer(v.targetCustomer || "", 4)) {
    push({
      id: "fq_customer_concrete",
      prompt: "主客群再具体一点：什么人、什么时候来、为什么来？",
      whyNeeded: "客群太泛，进入切口会漂。",
      priority: "must",
      triggeredBy: ["targetCustomer"],
    });
  }

  push({
    id: "fq_scene",
    prompt: "主场景是什么？（工作日午餐 / 朋友小聚 / 家庭周末）",
    whyNeeded: "进入切口必须钉死场景，否则市场扫描会漂。",
    priority: "must",
    triggeredBy: ["targetCustomer", "intent"],
    mapsToAnswer: "scene",
  });

  push({
    id: "fq_proof",
    prompt: "怎样算「值得进」？请给一个可观察指标（客流/复购/原话）。",
    whyNeeded: "没有杀出线，试点会无限期自我安慰。",
    priority: "must",
    triggeredBy: ["intent", "timeline"],
    mapsToAnswer: "killLine",
  });

  const rivals = (v.rivals || "").split(/[,，、]/).filter((s) => s.trim().length >= 2);
  if (rivals.length < 2) {
    push({
      id: "fq_rival_more",
      prompt: "再补 1–2 个客人会拿来对比的店名。",
      whyNeeded: "竞争集太少，进入空位判断会失真。",
      priority: "must",
      triggeredBy: ["rivals"],
      mapsToAnswer: "rivals",
    });
  }

  if (!/\d/.test(v.ticketBand || "")) {
    push({
      id: "fq_price",
      prompt: "和主要对手比，你想更贵、持平还是更便宜？差多少？",
      whyNeeded: "价格带决定战场与菜单试点。",
      priority: "should",
      triggeredBy: ["ticketBand"],
    });
  }

  if (/能不能进|值不值得/.test(v.intent || "") || (v.intent || "").length < 8) {
    push({
      id: "fq_why_now",
      prompt: "为什么是现在做这个判断，而不是半年后？",
      whyNeeded: "时机决定试点激进度。",
      priority: "must",
      triggeredBy: ["intent"],
    });
  }

  if (!isMeaningful(v.budget, 4)) {
    push({
      id: "fq_budget",
      prompt: "最坏情况下，亏多少你还能停得下来？",
      whyNeeded: "约束预算上限，避免调研建议脱离资源。",
      priority: "must",
      triggeredBy: ["budget", "constraint"],
    });
  }

  return createFollowupSession(qs);
}

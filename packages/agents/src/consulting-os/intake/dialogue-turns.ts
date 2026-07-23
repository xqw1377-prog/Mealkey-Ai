/**
 * 咨询 Intake 对话题组（SSOT）
 * UI 少问几句；解析层把口述拆回字段。
 */

export type DialogueTurnDef = {
  id: string;
  label: string;
  prompt: string;
  hint?: string;
  required?: boolean;
  keys: string[];
  /** 微追问：某 key 未拆出时的精准问法 */
  microPrompts?: Record<string, string>;
};

export type ConsultingDialogueAgent =
  | "m-pnt"
  | "m-mkt"
  | "m-biz"
  | "m-ed";

const MMKT: DialogueTurnDef[] = [
  {
    id: "who",
    label: "你是谁",
    prompt: "项目叫什么？做什么品类？主战场在哪？",
    hint: "味本源，鲜椒烤鱼，成都高新",
    required: true,
    keys: ["brandName", "category", "city"],
    microPrompts: {
      brandName: "对外店名/项目名具体叫什么？",
      category: "客人会把你们归到哪个品类？",
      city: "主战场城市或商圈是哪？",
    },
  },
  {
    id: "judge",
    label: "这轮判断",
    prompt: "这轮最想先拍板什么？最大约束是什么？",
    hint: "值不值得进；预算紧，90 天要看到信号",
    required: true,
    keys: ["intent", "constraint"],
    microPrompts: {
      intent: "这轮最想先拍板的那件事，用一句话说清。",
      constraint: "最大约束是钱、时间还是人？说到具体限度。",
    },
  },
  {
    id: "guest",
    label: "客人与对手",
    prompt: "主客群是谁？目标人均多少？最凶的 2–3 个对手？",
    hint: "高新白领小聚，人均 80–100；探鱼、江边城外",
    required: true,
    keys: ["targetCustomer", "ticketBand", "rivals"],
    microPrompts: {
      targetCustomer: "主客群是谁？尽量说到场景（谁、什么时候来）。",
      ticketBand: "目标人均大概多少钱？给个数字区间。",
      rivals: "客人最常拿来对比的 2–3 个店名？",
    },
  },
  {
    id: "pilot",
    label: "试点条件",
    prompt: "试点能投多少？多久必须看到值得继续的信号？",
    hint: "装修+3 个月租金内；90 天看复购",
    required: true,
    keys: ["budget", "timeline"],
    microPrompts: {
      budget: "试点大概能投多少量级？",
      timeline: "多久必须看到「值得继续」的信号？",
    },
  },
];

const MBIZ: DialogueTurnDef[] = [
  {
    id: "stage",
    label: "店到哪了",
    prompt: "店名？现在处在哪一段？几家店、直营还是加盟？",
    hint: "味本源，单店验证，直营 1 家",
    required: true,
    keys: ["brandName", "stage", "storeCount"],
    microPrompts: {
      brandName: "品牌/店名是什么？",
      stage: "现在是单店验证、准备复制，还是别的阶段？",
      storeCount: "几家店？直营还是加盟？",
    },
  },
  {
    id: "money",
    label: "钱与疼点",
    prompt: "人均多少？单店月流水/毛利量级？模式上最头疼的一件事？",
    hint: "人均 78；月流水约 40 万；能赚钱但不稳",
    required: true,
    keys: ["avgTicket", "unitEconomics", "pain"],
    microPrompts: {
      avgTicket: "当前人均大概多少？",
      unitEconomics: "单店月流水或毛利大概什么量级？",
      pain: "商业模式上最头疼的一件事是什么？",
    },
  },
  {
    id: "focus",
    label: "90 天优先",
    prompt: "90 天更优先利润、增长还是品牌？最紧资源？有复购信号吗？",
    hint: "先利润；最紧店长；老客约四成",
    required: true,
    keys: ["priority", "resource", "repeatSignal"],
    microPrompts: {
      priority: "未来 90 天更优先利润、增长还是品牌？",
      resource: "最紧的资源是现金、店长还是老板时间？",
      repeatSignal: "有没有可观察的复购/会员信号？",
    },
  },
  {
    id: "copy",
    label: "复制风险",
    prompt: "一复制最容易坏掉的是什么？（没有就说暂无）",
    hint: "店长带教、出品稳定",
    required: false,
    keys: ["copyBlocker"],
    microPrompts: {
      copyBlocker: "复制时最容易坏掉的是哪一块？",
    },
  },
];

const MED: DialogueTurnDef[] = [
  {
    id: "case",
    label: "这轮议题",
    prompt: "公司/项目叫什么？处在哪一段？股权上最想先解决什么？",
    hint: "味本源餐饮，准备融资；怕稀释失控",
    required: true,
    keys: ["companyName", "stage", "topic"],
    microPrompts: {
      companyName: "公司或项目名称？",
      stage: "现在处在融资、扩合伙还是别的阶段？",
      topic: "这次股权上最想先解决哪一件？",
    },
  },
  {
    id: "people",
    label: "人与股权",
    prompt: "核心团队？创始人几位、协议签了没？持股大概怎么分？",
    hint: "2 创始；口头未签；A 60% / B 40%",
    required: true,
    keys: ["team", "founderCount", "capTableNow"],
    microPrompts: {
      team: "核心团队现状？",
      founderCount: "创始人几位？协议签了没？",
      capTableNow: "当前持股大概怎么分？",
    },
  },
  {
    id: "lines",
    label: "底线与计划",
    prompt: "控制权底线？融资/激励池量级？有 vesting/回购吗？绝不能接受的一条？",
    hint: "必须控股；天使 300 万；暂无 vesting；不能丢董事会",
    required: true,
    keys: ["control", "raisePlan", "vesting", "redLine"],
    microPrompts: {
      control: "你对控制权的底线是什么？",
      raisePlan: "是否在谈融资或激励池？量级？",
      vesting: "有没有 vesting / 离职回购约定？",
      redLine: "股权上绝对不能接受的一条？",
    },
  },
];

const MPNT: DialogueTurnDef[] = [
  {
    id: "who",
    label: "品牌是谁",
    prompt: "品牌叫什么？品类是什么？主战场在哪个城市/商圈？",
    hint: "味本源·烤鱼，鲜椒烤鱼，成都高新",
    required: true,
    keys: ["brandName", "category", "region"],
    microPrompts: {
      brandName: "对外品牌名是什么？",
      category: "客人会把你们归到哪一类？",
      region: "主战场城市/商圈？",
    },
  },
  {
    id: "scale",
    label: "生意体量",
    prompt: "几家店（直营/加盟）？营收量级？人均大概多少？",
    hint: "直营 2 家；单店月均 35–45 万；人均 85–100",
    required: true,
    keys: ["storeScale", "annualRevenue", "avgTicket"],
    microPrompts: {
      storeScale: "现在几家店？直营还是加盟？",
      annualRevenue: "年营收或单店月均流水什么量级？",
      avgTicket: "人均大概多少？",
    },
  },
  {
    id: "fight",
    label: "怎么打",
    prompt: "一句话怎么介绍自己？最凶对手？最难被抄走的一点？广告语？（没有说暂无）",
    hint: "适合聚会的鲜椒烤鱼；探鱼；鲜椒配方；广告语暂无",
    required: true,
    keys: ["currentPositioning", "competitors", "advantages", "slogan"],
    microPrompts: {
      currentPositioning: "你现在怎么一句话介绍自己？",
      competitors: "抢客人最凶的 2–3 个对手店名？",
      advantages: "相对对手最难被抄走的一点是什么？",
      slogan: "正在用的广告语？（没有就说暂无）",
    },
  },
  {
    id: "goal",
    label: "这轮目标",
    prompt: "这轮最想先做成哪一件？和品牌有关、最头疼的一件事？",
    hint: "先把心智说清楚；好吃但记不住",
    required: true,
    keys: ["businessGoal", "mainPain"],
    microPrompts: {
      businessGoal: "这轮定位咨询最想先做成哪一件？",
      mainPain: "和品牌有关、最头疼的一件事？",
    },
  },
];

const BY_AGENT: Record<ConsultingDialogueAgent, DialogueTurnDef[]> = {
  "m-pnt": MPNT,
  "m-mkt": MMKT,
  "m-biz": MBIZ,
  "m-ed": MED,
};

export function getIntakeDialogueTurns(
  agent: ConsultingDialogueAgent,
): DialogueTurnDef[] {
  return BY_AGENT[agent];
}

export function getDialogueTurn(
  agent: ConsultingDialogueAgent,
  turnId: string,
): DialogueTurnDef | undefined {
  return BY_AGENT[agent].find((t) => t.id === turnId);
}

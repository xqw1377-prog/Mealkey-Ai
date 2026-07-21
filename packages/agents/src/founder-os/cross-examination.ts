/**
 * Cross-Examination Engine — 七常委交叉质询引擎
 *
 * 真正的董事会不是各自发言，而是互相攻击立场、暴露盲区。
 * 本引擎负责：
 * 1. 根据每位常委的 Natural Bias + Veto Protocol + Question Bank 生成针对性挑战
 * 2. 每个挑战必须指向对方的 Evidence ID
 * 3. 自动检测「立场不一致」（支持的市场方向却反对资金投入）
 * 4. 生成质询冲突热力图
 */

import { CONFLICT_AXES } from "./catalog";
import { getPersonaV2 } from "./persona-v2";
import type {
  CouncilOpinion,
  CouncilRoleId,
  EvidencePacket,
} from "./types";

// 每位常委对其他常委的核心挑战维度
const CHALLENGE_MATRIX: Record<CouncilRoleId, Partial<Record<CouncilRoleId, string[]>>> = {
  CSO: {
    CMO: [
      "你看到的窗口是真需求还是短暂趋势？这个市场 3 年后还有多大？",
      "如果行业竞争格局变化，你的需求假设还成立吗？",
    ],
    CBO: [
      "品牌定位是否限制了战略灵活性？为了心智清晰是否放弃了更大的市场机会？",
      "长期品牌资产 vs 短期市场窗口，你的取舍依据是什么？",
    ],
    BMO: [
      "单位经济成立不代表战略正确。如果市场方向错误，再好的商业模式也是为错误加速。",
      "你验证的是「能赚钱」还是「值得做」？",
    ],
    CFO: [
      "我理解现金安全，但过度保守的资本配置正在让我们错过窗口期。等待的成本是多少？",
      "战略机会的窗口成本 vs 现金安全的代价，你的计算考虑了时间价值吗？",
    ],
    COO: [
      "执行可行性是必要条件，但不应成为战略选择的否决条件。组织的成长要匹配战略野心。",
      "如果战略正确，组织能力可以通过时间补齐。你的判断是否过度依赖现状？",
    ],
    CRO: [
      "识别风险是你的职责，但风险为零的策略通常收益也为零。你的风险容忍度是否与企业战略目标匹配？",
      "最坏情况概率是多少？如果概率低于 5%，我们的决策是否被尾部风险过度绑架？",
    ],
  },
  CMO: {
    CSO: [
      "你说的长期方向，用户真的需要吗？没有需求支撑的战略是空中楼阁。",
      "战略的正确性最终要由市场验证。你有来自用户的证据吗？",
    ],
    CBO: [
      "品牌认知和市场需求是两回事。消费者记得你，不代表他们会购买。",
      "你说的差异化定位，市场上有支付意愿支撑吗？",
    ],
    BMO: [
      "成本结构和收入模型都成立，但如果需求不存在呢？商业模型不能创造需求。",
      "你的模型假设了稳定的客流，市场变化时需求弹性你考虑了吗？",
    ],
    CFO: [
      "现金安全的前提是市场存在。如果市场是真的，投入不足同样是风险。",
      "资本效率最高的时候，往往是市场窗口刚打开时。你判断窗口的依据是什么？",
    ],
    COO: [
      "运营标准化很好，但如果市场不需要标准化的产品呢？执行不能替代战略选择。",
      "你的 SOP 是基于当前需求的假设。如果需求变化，柔性够吗？",
    ],
    CRO: [
      "你说的风险哪些是真实的、高概率的？哪些是小概率事件？",
      "市场进入风险 vs 不进入的错失风险，你的评估不平衡。",
    ],
  },
  CBO: {
    CSO: [
      "战略方向要考虑品牌资产的可累积性。每换一次方向，品牌清零一次。",
      "你的战略选择是否能沉淀为品牌认知资产？还是每次重新教育消费者？",
    ],
    CMO: [
      "市场机会存在，但用户的品牌认知归谁？先入者是否已占位？",
      "进入市场的时机不仅要考虑需求，还要考虑心智占位的窗口。",
    ],
    BMO: [
      "赚钱很重要，但品牌资产的累积需要一致性。频繁调整定位会摧毁溢价能力。",
      "商业扩张是否稀释了品牌的核心认知？每开一家新店是强化还是稀释？",
    ],
    CFO: [
      "品牌建设需要持续投入，且回报周期长。你给品牌投资的等待时间够吗？",
      "品牌资产的价值在财务报表上不体现，但它是长期溢价的来源。你的模型考虑了吗？",
    ],
    COO: [
      "标准化是效率，但过度标准化可能牺牲品牌体验的差异化。",
      "运营效率 vs 品牌体验，你的平衡点在哪里？可复制的标准是否削弱了品牌独特性？",
    ],
    CRO: [
      "品牌风险确实存在，但品牌的最大风险是默默无闻而不是被讨论。",
      "声誉风险的缓释方案是什么？预防比危机应对成本更低。",
    ],
  },
  BMO: {
    CSO: [
      "战略方向必须有可行的商业模式支撑。如果赚不到钱，再好的战略也是慈善。",
      "你考虑的机会，单位经济成立吗？LTV/CAC 多少？回本周期多长？",
    ],
    CMO: [
      "需求存在不等于能赚钱。用户的支付意愿是否覆盖成本结构？",
      "市场规模很大，但可获取的利润池在哪？不是所有需求都是好生意。",
    ],
    CBO: [
      "品牌溢价建立在成本控制之上。没有利润支撑的品牌故事不可持续。",
      "定位很好，但消费者愿意为此多付多少钱？品牌溢价假设需要验证。",
    ],
    CFO: [
      "资本结构要匹配商业模式。如果烧钱扩张，必须有明确的单位经济拐点。",
      "ROIC 的门槛应该高于商业模式的风险溢价，你的计算考虑了经营杠杆吗？",
    ],
    COO: [
      "运营效率直接决定利润。单店模型中的损耗率、人效、坪效数据在哪？",
      "你的执行方案中，哪些环节是利润的关键变量？如何监控？",
    ],
    CRO: [
      "我同意风险需要管理，但商业模式的核心是承担计算过的风险。零风险 = 零利润。",
      "关键利润变量的风险缓释方案是什么？供应链中断时模型还能撑多久？",
    ],
  },
  CFO: {
    CSO: [
      "战略愿景很好，但资金从哪来？不考虑资本约束的战略是幻想。",
      "你的战略规划中有没有考虑过「如果融不到钱」的情景？",
    ],
    CMO: [
      "市场机会需要资金投入来获取。你的获客成本占收入比例是多少？投入产出比可接受吗？",
      "市场验证需要时间，但每一周的烧钱都在缩短跑道。验证周期和资金计划对得上吗？",
    ],
    CBO: [
      "品牌建设是长期投入，短期财务表现可能不好看。你有足够的耐心和资金吗？",
      "品牌投资回报周期超过18个月的，必须有明确的阶段性里程碑。",
    ],
    BMO: [
      "我支持验证单位经济，但验证本身也在消耗现金。验证成本计入模型了吗？",
      "你的利润模型中最乐观的假设是哪个？如果这个假设不成立，模型还成立吗？",
    ],
    COO: [
      "标准化的前期投入很大。SOP 建设的资本开支和 ROI 是多少？",
      "扩张需要营运资金。你的现金计划中，每个新店的资金需求预测准确吗？",
    ],
    CRO: [
      "风险管理部门也要考虑成本。你的所有缓释方案加起来的成本是多少？",
      "保险/合规/品控的成本 vs 风险敞口，ROI 是多少？不是所有风险都值得花大钱缓释。",
    ],
  },
  COO: {
    CSO: [
      "战略执行靠组织。如果团队接不住，战略再好也没用。你有组织能力评估吗？",
      "你的战略时间表与组织建设节奏匹配吗？人才不是一天能招到的。",
    ],
    CMO: [
      "市场需求增长很快，但我们的产能跟得上吗？品质如何保证？",
      "扩张速度受限于人才供给。你的市场计划考虑了组织成长的周期吗？",
    ],
    CBO: [
      "品牌体验最终由一线交付。品牌承诺和实际体验之间有多大差距？",
      "标准化执行是否会稀释品牌体验的差异化？一线员工能理解品牌定位吗？",
    ],
    BMO: [
      "你的模型假设了稳定的运营效率。但新店爬坡期的效率通常只有成熟店的 60-70%。",
      "规模的运营复杂度不是线性的。管理幅度超过 7 个店时效率会下降，你考虑了吗？",
    ],
    CFO: [
      "资金到位了，但人到位了吗？有钱没人 = 有锅没米。",
      "扩张的运营资金需求往往被低估。你有做过运营资金的详细预测吗？",
    ],
    CRO: [
      "运营风险是高频低冲击，但累积效应很大。你的运营风控是系统性的还是点状的？",
      "一线员工的合规意识培训覆盖率是多少？制度写在纸上不算执行。",
    ],
  },
  CRO: {
    CSO: [
      "你的战略假设中最脆弱的点是什么？如果这个点破裂，备选方案是什么？",
      "战略风险不只是外部竞争，还有执行走样。你有想过战略被错误执行的最坏结果吗？",
    ],
    CMO: [
      "市场扩张带来的合规风险你评估了吗？跨城市/跨区域的监管差异你知道吗？",
      "用户数据、食品安全、劳动法规——这些合规成本你纳入市场计划了吗？",
    ],
    CBO: [
      "品牌定位越鲜明，声誉风险越大。一旦出事，品牌受损程度也越大。你有危机预案吗？",
      "品牌承诺和消费者期望的落差是最大的声誉风险源。你如何管理这种预期落差？",
    ],
    BMO: [
      "商业模式越复杂，风险点越多。加盟/直营/合伙——每种模式的法律责任边界清楚吗？",
      "供应链单一来源风险 > 30% 时模型很脆弱。你有应急供应商吗？",
    ],
    CFO: [
      "我同意关注现金安全。但你衡量了决策的整体风险敞口吗？不只是现金，还有品牌、法律、运营。",
      "你的财务模型中最坏情景的参数是什么？这个参数的历史依据在哪？",
    ],
    COO: [
      "SOP 覆盖率多少？如果 100 家店同时运营，品控如何保证？",
      "一线员工的决策权限和责任边界在哪？授权过大是风险，授权过小是效率损失。",
    ],
  },
};

/** 生成某常委对其他所有常委的质询集 */
export function generateCrossExaminations(
  target: CouncilRoleId,
  opinions: CouncilOpinion[],
  evidencePacket?: EvidencePacket,
): Array<{
  from: CouncilRoleId;
  to: CouncilRoleId;
  question: string;
  targetEvidenceId?: string;
  conflictAxis: string;
  severity: "high" | "medium" | "low";
}> {
  const challenges: Array<{
    from: CouncilRoleId;
    to: CouncilRoleId;
    question: string;
    targetEvidenceId?: string;
    conflictAxis: string;
    severity: "high" | "medium" | "low";
  }> = [];

  const targetOp = opinions.find((o) => o.member === target);
  if (!targetOp) return challenges;

  for (const [challenger, questions] of Object.entries(CHALLENGE_MATRIX)) {
    if (challenger === target) continue;
    const qs = (questions as Partial<Record<CouncilRoleId, string[]>>)[target];
    if (!qs?.length) continue;

    // 找冲突轴
    const conflictAxis = CONFLICT_AXES.find(
      (ax) => ax.sides.includes(challenger as CouncilRoleId) && ax.sides.includes(target),
    );

    // 根据立场差异决定质询数量
    const challengerOp = opinions.find((o) => o.member === challenger);
    const positionDiff =
      challengerOp && targetOp.position !== challengerOp.position;

    const questionPool = positionDiff ? qs : qs.slice(0, Math.min(1, qs.length));

    for (const q of questionPool) {
      // 校验 evidence ID 是否在证据包中；无随机——优先第一条有效引用，保证可复现
      const evidenceIds = targetOp.evidence_used ?? [];
      const targetEvidenceId = evidenceIds[0];
      const validEvidence =
        targetEvidenceId &&
        evidencePacket?.items?.some((i) => i.evidenceId === targetEvidenceId)
          ? targetEvidenceId
          : evidencePacket?.items?.[0]?.evidenceId;

      const cited = evidencePacket?.items?.find(
        (i) => i.evidenceId === validEvidence,
      );
      const weakCite =
        !cited ||
        cited.strength === "weak" ||
        (evidencePacket?.gaps?.length || 0) > 0;
      let severity: "high" | "medium" | "low" = "medium";
      if (positionDiff) severity = "high";
      else if (weakCite) severity = "medium";
      else severity = "low";

      challenges.push({
        from: challenger as CouncilRoleId,
        to: target,
        question: q,
        targetEvidenceId: validEvidence,
        conflictAxis: conflictAxis?.label ?? "观点分歧",
        severity,
      });
    }
  }

  return challenges;
}

/** 为指定花名册生成完整质询包 */
export function generateExaminationPacket(input: {
  roster: CouncilRoleId[];
  opinions: CouncilOpinion[];
  evidencePacket?: EvidencePacket;
}): Array<{
  from: CouncilRoleId;
  to: CouncilRoleId;
  question: string;
  targetEvidenceId?: string;
  conflictAxis: string;
  severity: "high" | "medium" | "low";
}> {
  const all: Array<{
    from: CouncilRoleId;
    to: CouncilRoleId;
    question: string;
    targetEvidenceId?: string;
    conflictAxis: string;
    severity: "high" | "medium" | "low";
  }> = [];

  for (const target of input.roster) {
    const challenges = generateCrossExaminations(
      target,
      input.opinions,
      input.evidencePacket,
    );
    all.push(...challenges);
  }

  // 去重
  const seen = new Set<string>();
  return all.filter((c) => {
    const key = `${c.from}->${c.to}:${c.question.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 根据质询包生成 Round2 的 challenge_to_others 字段 */
export function buildChallengeResponses(
  roleId: CouncilRoleId,
  examinationPacket: Array<{
    from: CouncilRoleId;
    to: CouncilRoleId;
    question: string;
  }>,
): string[] {
  const incoming = examinationPacket.filter((c) => c.to === roleId);
  return incoming.map(
    (c) => `[${c.from}→${roleId}] ${c.question}`,
  );
}

/** 生成质询文本块（用于注入 prompt） */
export function renderExaminationBlock(
  roleId: CouncilRoleId,
  examinationPacket: Array<{
    from: CouncilRoleId;
    to: CouncilRoleId;
    question: string;
    targetEvidenceId?: string;
    severity: string;
  }>,
): string {
  const outgoing = examinationPacket.filter((c) => c.from === roleId);
  const incoming = examinationPacket.filter((c) => c.to === roleId);

  const blocks: string[] = [];

  if (outgoing.length > 0) {
    blocks.push("## 你的质询（对其他常委）");
    blocks.push("你必须对以下议题提出挑战，引用对方的 Evidence ID：");
    for (const c of outgoing) {
      const ev = c.targetEvidenceId ? `（依据：${c.targetEvidenceId}）` : "";
      blocks.push(`- [${c.severity === "high" ? "🔥" : "📌"}] ${c.to}: ${c.question} ${ev}`);
    }
  }

  if (incoming.length > 0) {
    blocks.push("## 你收到的质询（须回应）");
    blocks.push("你必须逐一回应以下挑战，可维持原判或改判：");
    for (const c of incoming) {
      blocks.push(`- 来自 ${c.from}: ${c.question}`);
    }
  }

  return blocks.join("\n");
}

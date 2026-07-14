/**
 * 三理论 Agent 知识加载器
 *
 * 从 knowledge/ 目录加载理论规则和案例资产，
 * 供三个理论 Agent 在 evaluate() 中使用。
 *
 * 当前为内嵌知识库模式（内置全量数据），
 * 后续可改为文件系统扫描或知识引擎 API 调用。
 */

export interface TheoryRule {
  id: string;
  theory_source: "ries" | "trout" | "ye_maozhong";
  name: string;
  principle: string;
  decision_question: string;
  applicable_context: string[];
  key_variables: string[];
  decision_rules: string[];
  anti_patterns: string[];
  output_implication: string;
}

export interface CaseAsset {
  id: string;
  brand_name: string;
  category: string;
  city_context: string;
  market_stage: string;
  project_stage: string;
  initial_problem: string;
  resource_condition: string;
  competition_context: string;
  candidate_positions: string[];
  final_position: string;
  why_choose: string;
  why_not_others: string;
  differentiation_design: string;
  execution_actions: string[];
  market_feedback: string;
  result_summary: string;
  success_or_failure: string;
  quality_tier: string;
  mental_takeaway: string;
  reusable_principles: string[];
  risk_lessons: string[];
  theory_tags: string[];
}

/**
 * 获取某理论体系的完整知识上下文（理论规则+参考案例）
 * 用于注入 Agent 的 systemPrompt
 */
export function getTheoryKnowledge(
  source: "ries" | "trout" | "ye_maozhong",
): string {
  const rules = theoryRules.filter((r) => r.theory_source === source);
  const cases = caseAssets
    .filter((c) => c.theory_tags.includes(source))
    .slice(0, 4); // 最多展示4个相关案例

  const parts: string[] = [];

  // ── 理论规则 ──
  parts.push(`【${labelOf(source)} 核心判断规则（${rules.length}条）】\n`);
  for (const rule of rules) {
    parts.push(`■ ${rule.name}`);
    parts.push(`  原理：${rule.principle}`);
    parts.push(`  判断问题：${rule.decision_question}`);
    parts.push(`  决策规则：`);
    for (const r of rule.decision_rules) parts.push(`    · ${r}`);
    parts.push(`  反模式（禁止）：`);
    for (const a of rule.anti_patterns) parts.push(`    · ${a}`);
    parts.push("");
  }

  // ── 参考案例 ──
  if (cases.length > 0) {
    parts.push(`【${labelOf(source)} 视角参考案例】\n`);
    for (const c of cases) {
      parts.push(`■ ${c.brand_name}（${c.category}·${c.city_context}）`);
      parts.push(`  初始问题：${c.initial_problem}`);
      parts.push(`  最终定位：${c.final_position}`);
      parts.push(`  选择理由：${c.why_choose}`);
      parts.push(`  差异设计：${c.differentiation_design}`);
      parts.push(`  结果：${c.result_summary}`);
      parts.push(`  心智启示：${c.mental_takeaway}`);
      parts.push("");
    }
  }

  return parts.join("\n");
}

// ══════════════════════════════════════════════════════════════════
// 知识规则库 — 从各理论体系的知识文件中合并
// ══════════════════════════════════════════════════════════════════

import { riesRules } from "./knowledge-ries";
import { troutRules } from "./knowledge-trout";
import { yeRules } from "./knowledge-ye";

const theoryRules: TheoryRule[] = [
  ...riesRules,
  ...troutRules,
  ...yeRules,
];

// ── 案例库 ──────────────────────────────────────────────────────

const caseAssets: CaseAsset[] = [
  {
    id: "case-haidilao",
    brand_name: "海底捞",
    category: "火锅",
    city_context: "全国",
    market_stage: "成熟期",
    project_stage: "品牌跃升",
    initial_problem: "火锅品类极度同质化，消费者无法区分品牌",
    resource_condition: "早期有限，团队有服务经验",
    competition_context: "心智被正宗川味占据",
    candidate_positions: ["最好川味火锅", "服务最好火锅", "年轻人火锅"],
    final_position: "服务最好火锅——以极致服务建立品类区隔",
    why_choose: "服务是火锅品类中无人占据的心智空位",
    why_not_others: "最好川味是正面冲突，年轻人火锅太泛",
    differentiation_design: "等位美甲拉面生日惊喜等极致服务触点",
    execution_actions: ["服务即产品", "招聘选服务意识", "每个触点设计成可转述的故事"],
    market_feedback: "服务成为第一联想超越口味本身",
    result_summary: "品类区隔经典案例：差异化不在锅里在锅外",
    success_or_failure: "success",
    quality_tier: "gold_case",
    mental_takeaway: "同质化品类可在非产品维度找到空位",
    reusable_principles: ["换维度竞争", "服务文化比菜品配方难抄袭", "消费者口碑比广告有效"],
    risk_lessons: ["服务差异靠人管理成本极高", "不学文化只学服务会消失"],
    theory_tags: ["trout", "ye_maozhong"],
  },
  {
    id: "case-chayan",
    brand_name: "茶颜悦色",
    category: "茶饮",
    city_context: "长沙",
    market_stage: "成长期",
    project_stage: "品牌创立",
    initial_problem: "茶饮市场已被喜茶奈雪CoCo占满",
    resource_condition: "初创资金有限，团队有文创背景",
    competition_context: "高端=喜茶/茶+包=奈雪/性价比=CoCo",
    candidate_positions: ["更好的茶饮", "长沙本地茶饮", "中国风茶饮"],
    final_position: "中国风茶饮——以中式美学建立品类第一",
    why_choose: "西式日式审美主流中中国风是显眼心智空位",
    why_not_others: "更好无心智位置，本地天花板太低",
    differentiation_design: "古典logo诗词文案坚果奶油顶永久求偿权",
    execution_actions: ["深耕长沙不急于扩张", "每杯茶配诗词成社交素材", "永久求偿权建信任", "中式庭院空间"],
    market_feedback: "长沙必打卡品牌排队破纪录",
    result_summary: "利用文化符号在心智中建立第一位置",
    success_or_failure: "success",
    quality_tier: "gold_case",
    mental_takeaway: "文化表达是被忽视的差异化维度",
    reusable_principles: ["换维度占不同而非更好", "文化符号难被模仿", "区域第一也是第一"],
    risk_lessons: ["出长沙后品牌力需验证", "国风需持续投入"],
    theory_tags: ["ries", "trout"],
  },
  {
    id: "case-wanglaoji",
    brand_name: "王老吉",
    category: "凉茶",
    city_context: "全国",
    market_stage: "成长期",
    project_stage: "品牌重塑",
    initial_problem: "凉茶地方品类全国无认知",
    resource_condition: "加多宝有强大渠道能力",
    competition_context: "可乐/茶饮/功能饮料三分天下无凉茶位置",
    candidate_positions: ["正宗广东凉茶", "健康草本饮料", "怕上火喝王老吉"],
    final_position: "怕上火喝王老吉——全民焦虑+高频场景绑定",
    why_choose: "上火是全民焦虑凉茶去火有基础认知",
    why_not_others: "正宗广东太窄健康饮料太宽",
    differentiation_design: "红色包装怕上火心理暗示绑定火锅烧烤场景",
    execution_actions: ["广告全国轰炸", "绑定火锅烧烤夜宵", "红色罐装视觉霸盘", "统一零售价"],
    market_feedback: "最成功广告语之一年销超200亿",
    result_summary: "冲突营销教科书：焦虑+场景+方案=条件反射",
    success_or_failure: "success",
    quality_tier: "gold_case",
    mental_takeaway: "最好的定位是利用已有焦虑而非创造新概念",
    reusable_principles: ["冲突是消费者本就在意的", "定位语=条件反射触发器", "高频场景绑定效率最高"],
    risk_lessons: ["单一功能有天花板", "品牌延伸困难"],
    theory_tags: ["ye_maozhong", "ries"],
  },
  {
    id: "case-guyue",
    brand_name: "古茗茶饮",
    category: "茶饮",
    city_context: "浙江台州",
    market_stage: "成长后期",
    project_stage: "定位清晰化",
    initial_problem: "中低端茶饮品牌心智模糊无差异",
    resource_condition: "区域供应链扎实有茶叶背景",
    competition_context: "高端喜茶/中低端CoCo一点点/极致低价蜜雪",
    candidate_positions: ["更好的奶茶", "水果茶专家", "每天一杯喝不腻"],
    final_position: "每天一杯喝不腻+区域密集深耕策略",
    why_choose: "不追网红化而做日常高频复购",
    why_not_others: "更好无位置水果茶门槛不高",
    differentiation_design: "水果加茶清爽不贵社区小店模型",
    execution_actions: ["区域深耕密度优先", "不投全国广告", "比喜茶便宜30-50%", "自建供应链控品质"],
    market_feedback: "逆势增长成为中国门店规模最大的茶饮品牌之一",
    result_summary: "验证里斯聚焦理论的区域版",
    success_or_failure: "success",
    quality_tier: "gold_case",
    mental_takeaway: "日常首选比网红打卡更有长期价值",
    reusable_principles: ["先区域第一再全国第一", "中端定位=日常首选而非比高端便宜", "高频复购重于网红流量"],
    risk_lessons: ["区域策略品牌势能输全国", "不投传播是双刃剑"],
    theory_tags: ["ries", "ye_maozhong"],
  },
  {
    id: "case-xian-noodle",
    brand_name: "张小花骨汤面（化名）",
    category: "面馆",
    city_context: "西安",
    market_stage: "成熟期",
    project_stage: "从零创业",
    initial_problem: "西安面食极度饱和，竞品全打老字号传统",
    resource_condition: "预算仅20万，无品牌背景",
    competition_context: "老字号占据心智高地",
    candidate_positions: ["正宗西安面", "年轻人的面馆", "骨汤不勾兑喝完不口渴"],
    final_position: "骨汤不勾兑喝完不口渴——攻击竞品弱点",
    why_choose: "预算极少时攻击竞品弱点是最低成本策略",
    why_not_others: "正宗打不过老字号，年轻人不是场景",
    differentiation_design: "透明厨房展示骨汤熬制不勾兑承诺",
    execution_actions: ["门头打不用勾兑汤", "展示真骨头", "抖音吃面不口渴挑战", "汤底免费续建信任"],
    market_feedback: "开业引发本地讨论6个月盈亏平衡",
    result_summary: "极低预算用小博大验证侧翼战+冲突论",
    success_or_failure: "success",
    quality_tier: "gold_case",
    mental_takeaway: "预算越少定位越要锋利",
    reusable_principles: ["攻击竞品弱点是零成本策略", "最好差异来自竞品不敢说的弱点", "不做什么比做什么易传播"],
    risk_lessons: ["攻击策略会引来反击", "真材实料否则口碑崩塌"],
    theory_tags: ["trout", "ye_maozhong"],
  },
  {
    id: "case-chongqing-daily",
    brand_name: "味道重庆（化名）",
    category: "川菜",
    city_context: "重庆",
    market_stage: "红海",
    project_stage: "品牌升级",
    initial_problem: "重庆菜品牌全打正宗无人做场景差异",
    resource_condition: "8家门店年营收3000万",
    competition_context: "全部讲味道正宗无其他差异",
    candidate_positions: ["重庆第一江湖菜", "重庆人的家庭食堂", "游客必吃榜"],
    final_position: "重庆人的家庭食堂——绑定本地家庭日常场景",
    why_choose: "竞品全做网红必吃无人做日常场景是空位",
    why_not_others: "第一自封无法验证游客依赖旅游周期",
    differentiation_design: "家庭套餐设计社区定价2-3人份量",
    execution_actions: ["调低客单价至家庭区间", "套餐按2-3人设计", "社区口碑不做网红", "周日家庭特惠"],
    market_feedback: "复购率45%远超重庆餐饮平均水平",
    result_summary: "红海通过场景切割找到蓝海",
    success_or_failure: "success",
    quality_tier: "silver_case",
    mental_takeaway: "红海最佳策略不是更好是找日常空位",
    reusable_principles: ["日常是最好空位", "场景定位复购率远高于品类定位", "本地日常比游客打卡可持续"],
    risk_lessons: ["不网红传播慢", "需熬过冷启动期"],
    theory_tags: ["trout", "ries"],
  },
  {
    id: "case-feiyue-dumpling",
    brand_name: "飞跃饺子",
    category: "饺子",
    city_context: "长沙",
    market_stage: "成熟期",
    project_stage: "品牌升级",
    initial_problem: "饺子品牌同质化严重消费者觉得都差不多",
    resource_condition: "预算60万团队4人有中央厨房",
    competition_context: "竞品全定位手工水饺东北风味无差异",
    candidate_positions: ["长沙最好吃饺子", "每天现拌馅", "年轻人的饺子局"],
    final_position: "年轻人的饺子局——夜间社交场景切割",
    why_choose: "饺子有家的味道也容易老气夜间社交场景是竞品空白",
    why_not_others: "最好吃无法验证现拌馅对面都在用",
    differentiation_design: "深夜食堂氛围单人双人套餐精酿搭配社交动线",
    execution_actions: ["暖色改冷调工业风", "菜单瘦身40%", "开夜宵时段", "主推年轻人的饺子局"],
    market_feedback: "夜间占比45%客单价升22%复购高15%",
    result_summary: "以场景切割在全品类中找到差异化空位",
    success_or_failure: "success",
    quality_tier: "silver_case",
    mental_takeaway: "同质化品类最佳差异不是产品是场景",
    reusable_principles: ["产品同质时场景切割优于产品升级", "夜间经济是年轻化用户池", "场景定位需配套门店体验"],
    risk_lessons: ["晚间客流需3个月爬坡", "场景过窄可能丢失午餐客群"],
    theory_tags: ["trout", "ye_maozhong"],
  },
  {
    id: "case-laohu-hotpot",
    brand_name: "老街老火锅",
    category: "火锅",
    city_context: "重庆",
    market_stage: "红海",
    project_stage: "筹备开店",
    initial_problem: "重庆火锅极度饱和头部品牌心智固化",
    resource_condition: "预算200万有底料配方无连锁经验",
    competition_context: "海底捞服务/周师兄毛肚/珮姐回家路线",
    candidate_positions: ["正宗重庆老火锅", "一人食精致火锅", "火锅小酒馆"],
    final_position: "一个人也要好好吃火锅——一人食场景切割",
    why_choose: "一人食是火锅品类未被占稳的空位单身经济趋势明确",
    why_not_others: "正宗与头部正面冲突酒馆执行不支持",
    differentiation_design: "单人小锅高吧台套餐化一人食环境",
    execution_actions: ["吧台单人座60%", "3款一人食套餐", "8分钟上齐", "主攻下班后一人食"],
    market_feedback: "6个月盈亏平衡一人食占比70%复购32%",
    result_summary: "红海中找到场景空位验证区隔理论实战价值",
    success_or_failure: "success",
    quality_tier: "silver_case",
    mental_takeaway: "即使红海只要切出真实场景空位仍有进入窗口",
    reusable_principles: ["饱和市场找场景空位不打正面战", "一人食前提是不尴尬不浪费不等", "品类越成熟场景切割越锋利"],
    risk_lessons: ["午市上座率不足", "翻台压力大厨房动线需提前设计"],
    theory_tags: ["trout", "ye_maozhong"],
  },
  {
    id: "case-failure-bread",
    brand_name: "巴黎贝甜（化名·中国案例）",
    category: "烘焙",
    city_context: "上海",
    market_stage: "成熟期",
    project_stage: "品牌重塑",
    initial_problem: "烘焙品牌无差异消费者看距离选店",
    resource_condition: "50家店预算200万",
    competition_context: "好利来蛋糕/85°C咖啡面包/幸福西饼线上",
    candidate_positions: ["最好吃面包", "每日新鲜现烤", "不卖隔夜面包"],
    final_position: "不卖隔夜面包——新鲜承诺",
    why_choose: "听起来有冲突感可打击竞品潜规则",
    why_not_others: "最好吃和现烤都是通用话术",
    differentiation_design: "晚8点折扣清货透明厨房当日清货系统",
    execution_actions: ["清货系统投入", "打折处理当日未售出", "不卖隔夜传播"],
    market_feedback: "初期有话题但三方矛盾暴露：打折降品牌感知/晚7点后无货可选/损耗吞噬利润",
    result_summary: "定位看似锋利执行中盈利模型崩溃：定位承诺与盈利模式冲突",
    success_or_failure: "failure",
    quality_tier: "silver_case",
    mental_takeaway: "定位承诺须在品牌产品和盈利三个方向上都成立",
    reusable_principles: ["定位承诺必须经成本倒推检验", "不做什么承诺比做什么更难兑现", "消费者对价格比对承诺更敏感"],
    risk_lessons: ["打折破坏正价购买体验", "执行前必须做成本模型测算", "不要选择伤害盈利模型的定位"],
    theory_tags: ["ye_maozhong", "trout"],
  },
  {
    id: "case-teayeah-failure",
    brand_name: "茶悦（化名）",
    category: "茶饮",
    city_context: "武汉",
    market_stage: "成长期",
    project_stage: "品牌升级",
    initial_problem: "国潮茶饮定位在茶颜霸王等强势品牌心智下逐渐模糊",
    resource_condition: "预算150万已有12家门店",
    competition_context: "茶颜长沙国风/霸王健康轻负担/喜茶灵感之茶",
    candidate_positions: ["武汉人自己的茶饮", "鲜果茶清爽不甜腻", "年轻人的第三空间"],
    final_position: "武汉人自己的茶饮——地域情感绑定",
    why_choose: "创始人认为武汉消费者会支持本地品牌",
    why_not_others: "其他两个方向无资源支撑且竞品已在跑",
    differentiation_design: "武汉方言包装黄鹤楼联名本地食材入茶",
    execution_actions: ["方言包装更换", "黄鹤楼联名限时3个月", "本地人喝本地茶话题", "老照片墙"],
    market_feedback: "联名期销量涨30%结束后回落80%本地人认证未能形成持续心智",
    result_summary: "失败：地域标签未与真实消费者心理冲突结合沦为一次性话题",
    success_or_failure: "failure",
    quality_tier: "bronze_case",
    mental_takeaway: "XX人自己的XX是自嗨型定位除非有外来品牌入侵的真实冲突",
    reusable_principles: ["地域标签必须有具体冲突或情感对立面支撑", "联名带来的流量不构建品牌资产", "定位需要每天被消费方式验证"],
    risk_lessons: ["高估地域自豪感在决策中的权重", "缺乏持续性场景绑定", "竞品降价联名跟随后差异消失"],
    theory_tags: ["ries", "trout"],
  },
];

function labelOf(source: string): string {
  switch (source) {
    case "ries": return "里斯定位";
    case "trout": return "特劳特定位";
    case "ye_maozhong": return "叶茂中冲突营销";
    default: return source;
  }
}

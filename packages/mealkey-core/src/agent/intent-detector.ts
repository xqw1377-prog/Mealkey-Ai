/**
 * Intent Detector — 意图检测器
 *
 * 解决了 README 中描述但未实现的 "detectLaunchIntent()" 功能。
 *
 * 用户消息 → detectLaunchIntent()
 *   ├── true → LaunchAgent (AgentRuntime + WorkflowEngine)
 *   └── false → ChiefAgent (规则判断链 + ProblemUnderstandingEngine)
 *
 * 检测维度:
 *   1. 开店意图 — "想开一家..." "准备开..." "计划开店"
 *   2. 项目评估 — "能不能做" "值不值得" "可行性"
 *   3. 选址咨询 — "选址" "位置" "哪里开"
 *   4. 品牌定位 — "品牌" "定位" "做什么品类"
 *   5. 投资咨询 — "投资" "预算" "多少钱"
 */

export interface IntentDetectionResult {
  /** 是否为开店/创业类意图 */
  isLaunchIntent: boolean;
  /** 意图类型 */
  intentType: LaunchIntentType | null;
  /** 置信度 0-1 */
  confidence: number;
  /** 检测理由 */
  reasoning: string;
  /** 提取的关键实体 */
  entities: Record<string, string>;
}

export type LaunchIntentType =
  | "new_project"         // 新开店铺
  | "feasibility"         // 可行性评估
  | "location"            // 选址咨询
  | "branding"            // 品牌定位
  | "investment"          // 投资咨询
  | "general_advice";     // 一般经营建议

/**
 * 检测用户消息是否为开店/创业意图
 *
 * 规则检测（快速路径）+ 关键词辅助
 */
export function detectLaunchIntent(message: string): IntentDetectionResult {
  const lower = message.toLowerCase();
  const entities: Record<string, string> = {};
  let isLaunchIntent = false;
  let intentType: LaunchIntentType | null = null;
  let confidence = 0;
  const reasons: string[] = [];

  // ═══════════════════════════════════════════
  // 规则 1: 新开店
  // ═══════════════════════════════════════════
  const newProjectPatterns = [
    /准备开/, /计划开/, /打算开/, /想做个/,
    /筹备开/, /正在找项目/, /想创业/, /想进入餐饮/, /第一次开店/,
    /想弄一个/, /想搞个/, /想做餐饮/, /想开/, /想开店/, /打算开店/,
    /计划开店/, /要开店/, /要开一/, /开一[家个]/, /开个店/,
  ];
  if (newProjectPatterns.some(p => p.test(lower))) {
    isLaunchIntent = true;
    intentType = "new_project";
    confidence = Math.max(confidence, 0.85);
    reasons.push("检测到新开店意图");
  }

  // ═══════════════════════════════════════════
  // 规则 2: 可行性评估
  // ═══════════════════════════════════════════
  const feasibilityPatterns = [
    /能不能做/, /值不值得/, /可行性/, /风险大吗/, /有前景吗/,
    /赚不赚钱/, /利润怎么样/, /好不好做/, /适合做吗/,
    /能做吗/, /行不行/, /有没有搞头/,
  ];
  if (feasibilityPatterns.some(p => p.test(lower))) {
    isLaunchIntent = true;
    intentType = "feasibility";
    confidence = Math.max(confidence, 0.8);
    reasons.push("检测到可行性评估意图");
  }

  // ═══════════════════════════════════════════
  // 规则 3: 选址咨询
  // ═══════════════════════════════════════════
  const locationPatterns = [
    /选址/, /哪里开/, /位置/, /地段/, /商圈/, /选址在/,
    /什么地方/, /开在哪/, /哪个区域/, /铺位/, /店面位置/,
  ];
  if (locationPatterns.some(p => p.test(lower))) {
    if (!isLaunchIntent) {
      isLaunchIntent = true;
    }
    intentType = "location";
    confidence = Math.max(confidence, 0.75);
    reasons.push("检测到选址咨询意图");
  }

  // ═══════════════════════════════════════════
  // 规则 4: 品牌定位（可进一步路由到 M-PNT）
  // ═══════════════════════════════════════════
  const brandingPatterns = [
    /什么品类/, /做什么菜/, /品牌定位/, /做什么好/, /做什么合适/,
    /选什么品/, /品类选择/, /做什么类型/,
    /定位策略/, /心智位置/, /差异化/, /客群画像/, /价格带/, /品牌调性/,
  ];
  if (brandingPatterns.some(p => p.test(lower))) {
    if (!isLaunchIntent) {
      isLaunchIntent = true;
    }
    intentType = "branding";
    confidence = Math.max(confidence, 0.7);
    reasons.push("检测到品牌定位咨询");
  }

  // ═══════════════════════════════════════════
  // 规则 5: 投资咨询
  // ═══════════════════════════════════════════
  const investmentPatterns = [
    /投资.*多少/, /预算.*多少/, /需要.*钱/, /投入.*多少/,
    /启动资金/, /开店成本/, /多少钱/, /投资预算/,
  ];
  if (investmentPatterns.some(p => p.test(lower))) {
    if (!isLaunchIntent) {
      isLaunchIntent = true;
    }
    intentType = "investment";
    confidence = Math.max(confidence, 0.7);
    reasons.push("检测到投资咨询意图");
  }

  // ═══════════════════════════════════════════
  // 提取实体
  // ═══════════════════════════════════════════

  // 城市
  const cities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "武汉", "南京", "苏州", "长沙", "西安", "天津"];
  for (const city of cities) {
    if (message.includes(city)) {
      entities.city = city;
      break;
    }
  }

  // 品类
  const categories = ["湘菜", "川菜", "粤菜", "火锅", "烧烤", "奶茶", "咖啡", "西餐", "日料", "快餐", "面馆", "小吃", "烘焙", "茶饮"];
  for (const cat of categories) {
    if (message.includes(cat)) {
      entities.category = cat;
      break;
    }
  }

  // 面积
  const areaMatch = message.match(/(\d+)\s*(平|㎡|平方|平米)/);
  if (areaMatch) {
    entities.area = areaMatch[1];
  }

  // 投资额
  const investMatch = message.match(/(\d+)\s*万/);
  if (investMatch) {
    entities.investment = investMatch[1];
  }

  // 如果没有匹配任何规则，不是开店意图
  if (!isLaunchIntent) {
    return {
      isLaunchIntent: false,
      intentType: "general_advice",
      confidence: 0.5,
      reasoning: "未检测到明确的开店/创业意图",
      entities,
    };
  }

  return {
    isLaunchIntent,
    intentType: intentType!,
    confidence: Math.min(1, confidence + (Object.keys(entities).length * 0.05)),
    reasoning: reasons.join("; "),
    entities,
  };
}

/**
 * 快速判断是否应该使用 LaunchAgent
 * 用于主路由
 */
export function shouldUseLaunchAgent(message: string): boolean {
  return detectLaunchIntent(message).isLaunchIntent;
}

/**
 * 纯定位意图 — 优先调度 M-PNT（餐饮定位 Agent）
 * 与 Launch 开店总包区分：无「开店/筹备」强信号时走 m-pnt
 */
export function detectPositioningIntent(message: string): boolean {
  if (!message?.trim()) return false;
  return /定位|品牌定位|心智|差异化|价格带|客群画像|品类分析|品牌调性|定位策略/.test(
    message.toLowerCase(),
  );
}

/**
 * 是否应路由到 M-PNT
 * - branding 意图 → m-pnt
 * - 定位关键词且非「新开店总包」话术 → m-pnt
 */
export function shouldUseMPntAgent(message: string): boolean {
  const launch = detectLaunchIntent(message);
  if (launch.intentType === "branding") return true;
  if (
    detectPositioningIntent(message) &&
    !/准备开|计划开|想开店|开一家|第一次开店|筹备开/.test(message)
  ) {
    return true;
  }
  return false;
}

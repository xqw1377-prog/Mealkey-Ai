import type { Evidence, MKContext, MKDecision } from "@mealkey/agent-sdk";

export function asList(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/[,，、;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function projectLabel(context: MKContext): string {
  const p = context.project;
  return p.name || `${p.category || "餐饮"}·${p.city || "目标城市"}`;
}

export function budgetNumber(context: MKContext): number | undefined {
  const b = context.project.budget as number | string | null | undefined;
  if (b === undefined || b === null || b === "") return undefined;
  const n = typeof b === "number" ? b : Number(String(b).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function evidence(
  source: string,
  content: string,
  relevance = 0.8,
): Evidence {
  return { source, content, relevance };
}

export function decision(partial: {
  idPrefix: string;
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  evidence: Evidence[];
  /** Stored as evidence source "structured" (frozen MKDecision has no payload field) */
  payload?: Record<string, unknown>;
}): MKDecision {
  const confidence = Math.max(0, Math.min(1, partial.confidence));
  const evidence = [...partial.evidence];
  if (partial.payload) {
    evidence.push({
      source: "structured",
      content: JSON.stringify(partial.payload),
      relevance: 0.9,
    });
  }
  return {
    id: `${partial.idPrefix}_${Date.now()}`,
    problem: partial.problem,
    observation: partial.observation,
    diagnosis: partial.diagnosis,
    judgement: partial.judgement,
    strategy: partial.strategy,
    action: partial.action,
    confidence,
    evidence,
  };
}

export function readPayload(
  d: MKDecision,
): Record<string, unknown> | undefined {
  const hit = d.evidence.find((e) => e.source === "structured");
  if (!hit) return undefined;
  try {
    return JSON.parse(hit.content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Lightweight category heuristics used by offline capabilities. */
export function categoryBenchmark(category?: string) {
  const c = (category || "").toLowerCase();
  const table: Record<
    string,
    {
      label: string;
      lifecycle: string;
      priceBand: [number, number];
      foodCost: [number, number];
      turn: [number, number];
      notes: string;
    }
  > = {
    湘菜: {
      label: "湘菜",
      lifecycle: "成熟期",
      priceBand: [60, 120],
      foodCost: [0.32, 0.38],
      turn: [2.0, 3.5],
      notes: "口味记忆强、标准化中等、区域竞争密度高",
    },
    川菜: {
      label: "川菜",
      lifecycle: "成熟期",
      priceBand: [50, 110],
      foodCost: [0.3, 0.36],
      turn: [2.2, 3.8],
      notes: "全国化程度高、同质化严重、需强区隔",
    },
    火锅: {
      label: "火锅",
      lifecycle: "成熟期偏红海",
      priceBand: [70, 150],
      foodCost: [0.28, 0.35],
      turn: [1.5, 2.5],
      notes: "客流强但租金与人力敏感，差异化常落在锅底/场景",
    },
    茶饮: {
      label: "茶饮",
      lifecycle: "成长期",
      priceBand: [12, 28],
      foodCost: [0.25, 0.32],
      turn: [8, 20],
      notes: "标准化高、可复制强、心智锚点易被跟风",
    },
    烧烤: {
      label: "烧烤",
      lifecycle: "成熟期",
      priceBand: [50, 100],
      foodCost: [0.3, 0.36],
      turn: [1.2, 2.0],
      notes: "场景强（夜经济）、合规与排烟约束大",
    },
    粤菜: {
      label: "粤菜",
      lifecycle: "成熟期",
      priceBand: [80, 200],
      foodCost: [0.30, 0.38],
      turn: [1.5, 2.8],
      notes: "食材要求高、品牌溢价空间大、适合中高端定位",
    },
    日料: {
      label: "日料",
      lifecycle: "成长期",
      priceBand: [80, 500],
      foodCost: [0.25, 0.35],
      turn: [1.5, 2.5],
      notes: "品类分化明显（omakase/居酒屋/拉面），高端需品牌力",
    },
    西餐: {
      label: "西餐",
      lifecycle: "成熟期",
      priceBand: [60, 300],
      foodCost: [0.28, 0.35],
      turn: [1.2, 2.5],
      notes: "商务/约会场景为主，时段利用率需优化",
    },
    快餐: {
      label: "快餐",
      lifecycle: "成熟期",
      priceBand: [15, 40],
      foodCost: [0.28, 0.34],
      turn: [5, 12],
      notes: "人效与标准化是核心，翻台率决定盈利能力",
    },
    面馆: {
      label: "面馆",
      lifecycle: "成熟期",
      priceBand: [12, 35],
      foodCost: [0.25, 0.32],
      turn: [4, 10],
      notes: "极致人效模型，夫妻店模式优势大，品牌化空间高",
    },
    咖啡: {
      label: "咖啡",
      lifecycle: "成长期",
      priceBand: [15, 45],
      foodCost: [0.22, 0.30],
      turn: [2, 6],
      notes: "第三空间 vs 快取模式分化，复购率与会员体系关键",
    },
    烘焙: {
      label: "烘焙",
      lifecycle: "成长期",
      priceBand: [15, 60],
      foodCost: [0.22, 0.30],
      turn: [3, 8],
      notes: "产品力是核心，颜值经济但复购需口味支撑",
    },
    小吃: {
      label: "小吃",
      lifecycle: "成长期",
      priceBand: [8, 30],
      foodCost: [0.25, 0.33],
      turn: [6, 15],
      notes: "低投入启动、标准化易，但竞争壁垒低",
    },
    奶茶: {
      label: "奶茶",
      lifecycle: "成熟期偏红海",
      priceBand: [8, 25],
      foodCost: [0.22, 0.30],
      turn: [10, 25],
      notes: "极度红海，品牌化/产品创新/供应链缺一不可",
    },
    酸菜鱼: {
      label: "酸菜鱼",
      lifecycle: "成熟期",
      priceBand: [40, 80],
      foodCost: [0.28, 0.35],
      turn: [2.5, 4.5],
      notes: "太二重新定义赛道，后来者需强差异化",
    },
    烤鱼: {
      label: "烤鱼",
      lifecycle: "成熟期",
      priceBand: [45, 90],
      foodCost: [0.30, 0.38],
      turn: [2.0, 3.5],
      notes: "场景化强（聚餐），口味和仪式感是差异化方向",
    },
    西北菜: {
      label: "西北菜",
      lifecycle: "成长后期",
      priceBand: [40, 90],
      foodCost: [0.28, 0.35],
      turn: [2.0, 3.5],
      notes: "西贝领头，品类认知已建立，健康/地域特色有机会",
    },
    早餐: {
      label: "早餐",
      lifecycle: "成熟期",
      priceBand: [5, 20],
      foodCost: [0.25, 0.32],
      turn: [8, 20],
      notes: "人效为王，时段集中，选址类型决定客群",
    },
    小龙虾: {
      label: "小龙虾",
      lifecycle: "成熟期",
      priceBand: [60, 150],
      foodCost: [0.32, 0.40],
      turn: [1.5, 2.5],
      notes: "季节性明显（4-10月旺季），需淡季解决方案",
    },
    轻食沙拉: {
      label: "轻食沙拉",
      lifecycle: "成长期",
      priceBand: [20, 50],
      foodCost: [0.28, 0.35],
      turn: [3, 6],
      notes: "健康趋势驱动，客群窄但复购高，外卖占比较高",
    },
    卤味: {
      label: "卤味",
      lifecycle: "成长期",
      priceBand: [10, 40],
      foodCost: [0.25, 0.32],
      turn: [5, 12],
      notes: "标准化高、可复制强、零食化趋势、多场景覆盖",
    },
    饺子: {
      label: "饺子",
      lifecycle: "成熟期",
      priceBand: [12, 30],
      foodCost: [0.28, 0.35],
      turn: [4, 8],
      notes: "国民级认知、标准化易、堂食+外卖双引擎",
    },
  };

  for (const [key, value] of Object.entries(table)) {
    if (c.includes(key) || (category || "").includes(key)) return value;
  }

  return {
    label: category || "综合餐饮",
    lifecycle: "需进一步判定",
    priceBand: [40, 100] as [number, number],
    foodCost: [0.3, 0.35] as [number, number],
    turn: [1.5, 3.0] as [number, number],
    notes: "通用餐饮基准，建议补充品类专项数据",
  };
}

export function saturationLabel(storesPer10k?: number): string {
  if (storesPer10k === undefined) return "数据不足，按中度竞争假设";
  if (storesPer10k < 5) return "蓝海";
  if (storesPer10k < 10) return "适度竞争";
  if (storesPer10k < 20) return "饱和竞争";
  return "红海";
}

/**
 * 轻量市场情报库（品类×城市）
 * 供调研采集在联网失败时仍能给出机构级骨架
 */
export type LocalCompetitorHit = {
  brand: string;
  position: string;
  budget?: "强" | "中" | "弱";
  note?: string;
};

export type LocalMarketHit = {
  leaders: LocalCompetitorHit[];
  whiteSpots: string[];
  priceBand: [number, number];
  saturation: "极高" | "高" | "中" | "低";
  stage: "导入期" | "成长期" | "成熟期" | "衰退期";
  note?: string;
};

const DB: Record<string, Record<string, LocalMarketHit>> = {
  湘菜: {
    长沙: {
      leaders: [
        { brand: "费大厨", position: "辣椒炒肉·品类第一", budget: "强", note: "全国连锁心智强" },
        { brand: "炊烟", position: "小炒黄牛肉·品类第一", budget: "强", note: "长沙地标" },
        { brand: "一盏灯", position: "地道湘菜·老字号信任", budget: "中" },
      ],
      whiteSpots: ["夜间场景湘菜", "一人食湘菜", "家庭日常湘菜", "精致湘菜（客单150+）"],
      priceBand: [50, 120],
      saturation: "极高",
      stage: "成熟期",
      note: "头部占稳，新品牌宜切场景或价格带空位",
    },
    深圳: {
      leaders: [
        { brand: "费大厨", position: "全国湘菜领导品牌", budget: "强" },
        { brand: "农耕记", position: "湖南土菜·食材原产地", budget: "强" },
      ],
      whiteSpots: ["精致湘菜", "商务湘菜", "湘菜+酒"],
      priceBand: [60, 130],
      saturation: "高",
      stage: "成熟期",
    },
  },
  火锅: {
    重庆: {
      leaders: [
        { brand: "海底捞", position: "极致服务火锅", budget: "强" },
        { brand: "小龙坎", position: "网红重庆火锅", budget: "强" },
      ],
      whiteSpots: ["一人锅", "清油养生锅", "社区平价锅"],
      priceBand: [70, 150],
      saturation: "极高",
      stage: "成熟期",
    },
  },
  茶饮: {
    上海: {
      leaders: [
        { brand: "喜茶", position: "新茶饮心智第一梯队", budget: "强" },
        { brand: "奈雪的茶", position: "茶+软欧包", budget: "强" },
      ],
      whiteSpots: ["健康低糖茶", "社区高复购茶", "中式茶点场景"],
      priceBand: [15, 35],
      saturation: "极高",
      stage: "成熟期",
    },
  },
};

function normalize(s: string) {
  return (s || "").replace(/\s/g, "").trim();
}

export function lookupLocalMarket(
  category: string,
  city: string,
): LocalMarketHit | null {
  const cat = normalize(category);
  const cty = normalize(city);
  for (const [k, cities] of Object.entries(DB)) {
    if (cat.includes(k) || k.includes(cat)) {
      for (const [cityKey, hit] of Object.entries(cities)) {
        if (cty.includes(cityKey) || cityKey.includes(cty)) return hit;
      }
      // 品类命中但城市未命中：返回该品类任一城市作参照并标注
      const first = Object.values(cities)[0];
      if (first) {
        return {
          ...first,
          note: `${first.note || ""}（参照其他城市格局，需用本地联网数据校正）`.trim(),
        };
      }
    }
  }
  return null;
}

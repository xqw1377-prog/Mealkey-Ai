/**
 * 对比不同城市/品类的竞争数据覆盖情况
 */
import { getCompetitionData, getMentalWords, getCompetitionNarrative } from "../src/m-pnt/matrix/market-intel";

const testCases = [
  { cat: "湘菜", city: "长沙" },
  { cat: "湘菜", city: "深圳" },
  { cat: "湘菜", city: "北京" },
  { cat: "火锅", city: "重庆" },
  { cat: "火锅", city: "成都" },
  { cat: "火锅", city: "上海" },
  { cat: "茶饮", city: "长沙" },
  { cat: "茶饮", city: "上海" },
  { cat: "川菜", city: "成都" },
  { cat: "烧烤", city: "长沙" },
  { cat: "烧烤", city: "哈尔滨" },
  { cat: "面馆", city: "上海" },
  { cat: "面馆", city: "西安" },
  { cat: "饺子", city: "北京" },
  { cat: "饺子", city: "沈阳" },
  { cat: "快餐", city: "北京" },
  { cat: "快餐", city: "上海" },
  { cat: "烘焙", city: "上海" },
  { cat: "日料", city: "上海" },
  { cat: "日料", city: "北京" },
  { cat: "粤菜", city: "广州" },
  { cat: "粤菜", city: "深圳" },
  { cat: "潮汕菜", city: "深圳" },
  { cat: "串串", city: "成都" },
  { cat: "兰州拉面", city: "上海" },
  { cat: "螺蛳粉", city: "柳州" },
  { cat: "轻食", city: "上海" },
  { cat: "烤鱼", city: "重庆" },
  { cat: "小龙虾", city: "长沙" },
  { cat: "云南菜", city: "昆明" },
  { cat: "云南菜", city: "北京" },
  { cat: "本帮菜", city: "上海" },
  { cat: "东南亚菜", city: "上海" },
  { cat: "居酒屋", city: "上海" },
  { cat: "小吃", city: "长沙" },
  { cat: "炸鸡", city: "北京" },       // 需要城市模糊匹配
  { cat: "麻辣香锅", city: "北京" },
  { cat: "咖喱", city: "上海" },
];

console.log("=== 品类竞争数据覆盖检查 ===\n");
let hit = 0, total = 0;

for (const { cat, city } of testCases) {
  total++;
  const data = getCompetitionData(cat, city);
  const mental = getMentalWords(cat);
  const hasData = !!data;
  const hasMental = !!mental;
  if (hasData) hit++;

  const status = hasData ? (hasMental ? "✅" : "⚠️缺心智词") : "❌";
  console.log(`  ${status} ${cat}@${city}`);
  if (hasData) {
    const narrative = getCompetitionNarrative(cat, city);
    console.log(`     ${narrative.substring(0, 100)}`);
  }
}

console.log(`\n覆盖: ${hit}/${total} (${Math.round(hit/total*100)}%)`);

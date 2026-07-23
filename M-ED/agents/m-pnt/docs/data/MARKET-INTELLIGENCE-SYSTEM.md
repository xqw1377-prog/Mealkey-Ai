# M-PNT 市场情报系统设计

## 当前瓶颈

现在的竞争数据是静态写死在 `market-intel.ts` 里的：
```
费大厨 → "辣椒炒肉·品类第一"（只知道这一句话）
炊烟 → "小炒黄牛肉·品类第一"（只知道这一句话）
```

真实竞争情报应该是：
```
费大厨 → 心智位置：辣椒炒肉
          门店数：长沙20家，全国80家
          客单价：85元
          抖音话题量：2.3亿
          大众点评评分：4.6
          消费者关键词：下饭、招牌、排队
          供应链：自建辣椒基地
          扩张速度：2024年新开30家
```

## 数据采集架构

```
爬虫层（Python/Node.js）
    ├── 大众点评/美团 → 门店数据、评分、客单价、评论关键词
    ├── 抖音/小红书 → 话题量、品牌词频、消费者心智词
    ├── 百度地图/高德 → 门店分布、商圈密度
    ├── 天眼查/企查查 → 品牌融资、门店数、扩张速度
    └── 行业报告 → 品类趋势、价格带分布
    
         ↓ 数据处理
    
分析层
    ├── 心智占有率计算（评论词频 / 话题量 / 搜索指数）
    ├── 竞争饱和度评估（门店密度 / 客单价重叠度）
    ├── 空白区识别（心智词未被占用的组合）
    └── 趋势预测（扩张速度 / 品类生命周期）
    
         ↓ 数据入库
    
数据层（market-intel.ts 动态加载）
    ├── 品牌数据：品牌名、心智位置、门店数、客单价、评分
    ├── 品类数据：品类名、饱和度、生命周期、价格带
    ├── 城市数据：城市名、品类×城市的竞争格局
    └── 心智数据：品类高频词、场景词、情感词
```

## 数据结构升级

```typescript
// 当前
interface CompetitorProfile {
  brand: string;
  position: string;
  budget?: "强" | "中" | "弱";
}

// 升级后
interface CompetitorProfile {
  brand: string;
  position: string;            // 心智位置
  storeCount: number;           // 门店数（城市级）
  totalStoreCount: number;      // 门店数（全国）
  avgPrice: number;             // 客单价
  rating: number;               // 评分 0-5
  reviewCount: number;          // 评论数
  douyinTopic: string;          // 抖音话题量
  xiaohongshuNotes: number;     // 小红书笔记数
  consumerKeywords: string[];   // 消费者评价高频词
  supplyChain: string;          // 供应链特点
  expansionRate: string;        // 扩张速度
  fundingStage: string;         // 融资阶段
  budget: "强" | "中" | "弱";   // 资源强度（由以上指标综合判断）
}
```

## 爬虫优先级

| 优先级 | 数据源 | 用途 | 难度 |
|---|---|---|---|
| P0 | 大众点评/美团 | 门店数、评分、客单价、评论关键词 | 中（有反爬） |
| P0 | 抖音 | 话题量、品牌声量、消费者心智词 | 低（开放API） |
| P1 | 小红书 | 品牌心智、场景词、情感词 | 低（开放API） |
| P1 | 百度地图 | 门店分布、商圈密度 | 低（开放API） |
| P2 | 天眼查 | 融资、门店数、扩张速度 | 中（有反爬） |

## 落地方案（推荐做法）

1. **爬虫项目**：在 `M-PNT/packages/crawler/` 下独立
   - 用 Node.js + Puppeteer 爬大众点评
   - 用抖音开放 API 获取品牌话题量
   - 定时任务（每周更新一次）

2. **数据处理**：爬取的数据 → JSON → `market-intel.ts` 的接口函数

3. **数据加载**：
   ```typescript
   // market-intel.ts 保持接口不变
   // 数据源从静态 JS 对象改为 JSON 文件 + 内存缓存
   export function getCompetitionData(category, city) {
     return loadFromCache(category, city) || loadFromJsonFile(category, city) || null;
   }
   ```

4. **与 MealKey 集成**：
   - MealKey 的 knowledgeEngine 可以缓存竞争数据
   - 每次 M-PNT 启动时从 knowledgeEngine 拉取最新的品类数据
   - 运行时通过 `runtimeConfig.knowledgeEngine` 注入

/** 月度汇总（可由日明细聚合；也可单独导入补成本费用） */
export type MonthlyLedgerRow = {
  month: string; // YYYY-MM
  revenue: number;
  cost: number;
  expense: number;
  profit: number;
};

/** 日 × 餐段经营明细（经营分析硬门槛） */
export type DailyOpsRow = {
  date: string; // YYYY-MM-DD
  mealPeriod: string; // 午市/晚市/下午茶/夜宵…
  zone: string; // 大厅/包厢/外摆/外卖…
  guests: number;
  avgTicket: number;
  revenue: number;
  cost?: number;
  expense?: number;
  profit?: number;
};

/** 菜品销售结构明细 */
export type DishSalesRow = {
  date: string;
  mealPeriod: string;
  zone: string;
  dishName: string;
  category: string;
  qty: number;
  amount: number;
  cost?: number;
};

export type MenuItemRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost?: number;
  kind: "dish" | "drink" | "other";
};

export type FinanceImportResult = {
  rows: MonthlyLedgerRow[];
  fileName: string;
  warnings: string[];
};

export type DailyOpsImportResult = {
  rows: DailyOpsRow[];
  fileName: string;
  warnings: string[];
};

export type DishSalesImportResult = {
  rows: DishSalesRow[];
  fileName: string;
  warnings: string[];
};

export type MenuImportResult = {
  items: MenuItemRow[];
  fileName: string;
  source: "excel" | "csv" | "photo" | "paste";
  warnings: string[];
  photoDataUrl?: string;
};

export const DAILY_OPS_TEMPLATE_CSV = `日期,餐段,区域,来客数,人均消费,营收,成本,费用,利润
2026-01-03,午市,大厅,36,72,2592,980,520,1092
2026-01-03,晚市,大厅,58,95,5510,1980,860,2670
2026-01-03,晚市,包厢,18,168,3024,1050,420,1554
2026-01-04,午市,大厅,40,70,2800,1020,530,1250
2026-01-04,晚市,大厅,62,92,5704,2050,870,2784
2026-01-04,晚市,包厢,16,175,2800,980,400,1420
2026-02-01,午市,大厅,33,74,2442,940,510,992
2026-02-01,晚市,大厅,51,98,4998,1820,840,2338
2026-02-01,晚市,包厢,14,170,2380,860,380,1140
2026-03-01,午市,大厅,30,76,2280,900,500,880
2026-03-01,晚市,大厅,48,100,4800,1760,830,2210
2026-03-01,晚市,包厢,12,180,2160,820,360,980
`;

export const DISH_SALES_TEMPLATE_CSV = `日期,餐段,区域,菜名,分类,销量,销售额,成本
2026-01-03,午市,大厅,剁椒鱼头,热菜,8,704,256
2026-01-03,午市,大厅,小炒黄牛肉,热菜,12,816,336
2026-01-03,午市,大厅,酸梅汤,饮品,20,240,60
2026-01-03,晚市,大厅,剁椒鱼头,热菜,16,1408,512
2026-01-03,晚市,包厢,剁椒鱼头,热菜,6,528,192
2026-01-03,晚市,大厅,酸梅汤,饮品,28,336,84
2026-02-01,晚市,大厅,剁椒鱼头,热菜,14,1232,448
2026-02-01,晚市,大厅,小炒黄牛肉,热菜,18,1224,504
2026-03-01,晚市,大厅,剁椒鱼头,热菜,12,1056,384
2026-03-01,晚市,大厅,酸梅汤,饮品,22,264,66
`;

/** @deprecated 仅兼容旧月度模板；经营分析请用日×餐段明细 */
export const FINANCE_TEMPLATE_CSV = `月份,营收,成本,费用,利润
2026-01,180000,72000,45000,63000
2026-02,165000,70000,44000,51000
2026-03,158000,69000,46000,43000
`;

export const MENU_TEMPLATE_CSV = `菜名,分类,售价,成本,类型
剁椒鱼头,热菜,88,32,dish
小炒黄牛肉,热菜,68,28,dish
酸梅汤,饮品,12,3,drink
米饭,主食,2,0.6,other
`;

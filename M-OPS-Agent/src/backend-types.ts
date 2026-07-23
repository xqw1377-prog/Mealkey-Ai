import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";

export type ExternalSourceName =
  | "dianping"
  | "meituan"
  | "xiaohongshu"
  | "douyin"
  | "map"
  | "manual";

export type RestaurantStage =
  | "single_store"
  | "growth"
  | "chain"
  | "franchise"
  | "mature";

export type RestaurantProfile = {
  restaurantId: string;
  brand: string;
  storeName?: string;
  city?: string;
  district?: string;
  category?: string;
  address?: string;
  priceRange?: string;
  stage?: RestaurantStage;
  businessModel?: string;
  operatingModel?: string;
  tags?: string[];
  contactPhone?: string;
  manualFacts?: Array<{
    kind: string;
    claim: string;
    asOf?: string;
  }>;
  manualEvidence?: ContextPackageV1["evidence"];
  createdAt: string;
  updatedAt: string;
};

export type RestaurantScanPlan = {
  restaurantId: string;
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  sources: ExternalSourceName[];
  lastRun?: string;
  nextRun?: string;
  updatedAt: string;
};

export type RestaurantRegistrationInput = Omit<
  RestaurantProfile,
  "createdAt" | "updatedAt"
> & {
  scanPlan?: Partial<
    Omit<RestaurantScanPlan, "restaurantId" | "updatedAt" | "lastRun" | "nextRun">
  >;
};

/** 分页查询基础 */
export type PaginationQuery = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** API 统一响应格式 */
export type ApiResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: Record<string, unknown>;
};

/** 餐厅搜索过滤条件 */
export type RestaurantFilter = {
  query?: string;
  city?: string;
  category?: string;
  stage?: RestaurantStage;
  tags?: string[];
  scanEnabled?: boolean;
  hasProfile?: boolean;
};

/** 批量操作结果 */
export type BatchOperationResult = {
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
};

/** 数据导出格式 */
export type ExportFormat = "json" | "csv";

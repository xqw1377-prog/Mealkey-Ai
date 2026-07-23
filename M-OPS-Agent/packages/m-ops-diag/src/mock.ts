import type {
  DiagnosisEvidenceItem,
  RestaurantDiagnosisRequest,
} from "./contracts";

/** Phase 1 本地联调用 mock 评论证据 */
export function mockConsumerEvidence(): DiagnosisEvidenceItem[] {
  return [
    {
      id: "m1",
      source: "dianping",
      claim: "菜还可以，但是等了四十分钟，服务员也不怎么理人",
      sentiment: "negative",
      theme: "wait",
      observedAt: new Date().toISOString(),
    },
    {
      id: "m2",
      source: "dianping",
      claim: "上菜太慢了，带小孩根本等不及",
      sentiment: "negative",
      theme: "wait",
    },
    {
      id: "m3",
      source: "xiaohongshu",
      claim: "味道不错，环境也干净，就是高峰排队劝退",
      sentiment: "negative",
      theme: "wait",
    },
    {
      id: "m4",
      source: "dianping",
      claim: "红烧肉很下饭，会回购",
      sentiment: "positive",
      theme: "product",
    },
    {
      id: "m5",
      source: "douyin",
      claim: "服务态度一般，喊了三次才来加水",
      sentiment: "negative",
      theme: "wait",
    },
  ];
}

export function mockDiagnosisRequest(
  overrides?: Partial<RestaurantDiagnosisRequest>,
): RestaurantDiagnosisRequest {
  return {
    restaurantContext: {
      brandName: "示例小馆",
      category: "中式正餐",
      city: "上海",
      stage: "single_store",
    },
    facts: [
      {
        kind: "channel",
        claim: "主渠道为大众点评 + 到店",
      },
    ],
    evidence: mockConsumerEvidence(),
    focus: "overall",
    horizon: "7d",
    ...overrides,
  };
}

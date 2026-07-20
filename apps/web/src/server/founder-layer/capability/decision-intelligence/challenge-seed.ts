/**
 * 扩店议题最小压力测试意见（辩论墙种子）
 * 完整七常委仍走 decision-room；此处写入 Context.expertOpinions 供 Trace。
 */
import type { ExpertOpinionSliceV1 } from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

export const EXPANSION_CHALLENGE_OPINIONS: ExpertOpinionSliceV1[] = [
  {
    roleId: "cfo",
    stance: "oppose",
    claim: "现金与利润缓冲未充分验证时，立即扩张会放大财务风险。",
    challengeTo: "立即开第二家",
  },
  {
    roleId: "coo",
    stance: "conditional",
    claim: "店长无法独立前，第二店会变成老板分身危机。",
    challengeTo: "可复制运营",
  },
  {
    roleId: "cso",
    stance: "support",
    claim: "第二增长曲线方向成立，但前提是单店模型可复制。",
  },
  {
    roleId: "cmo",
    stance: "observe",
    claim: "区域竞争与客群是否支撑第二店，需对照选址再定。",
  },
];

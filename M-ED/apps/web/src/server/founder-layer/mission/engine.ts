import type {
  FounderAgentName,
  FounderMeetingType,
  FounderMission,
  FounderMissionRequest,
  FounderMissionType,
} from "../contracts";

function buildMissionId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `founder-mission-${Date.now()}`;
}

function inferMissionType(message: string): FounderMissionType {
  const text = message.trim();
  if (/股权|组织|激励|合伙人|治理|控制权/.test(text)) return "organization_review";
  if (/定位|品牌|心智|客群|差异/.test(text)) return "positioning_review";
  if (/市场|进入|开店城市|品类机会|竞争/.test(text)) return "market_entry";
  if (/赚钱|模式|利润|单店|现金流|商业/.test(text)) return "business_diagnosis";
  if (/扩张|加盟|复制|连锁|百店/.test(text)) return "expansion_review";
  return "mixed_strategy";
}

function inferRequiredAgents(
  missionType: FounderMissionType,
  message: string,
): FounderAgentName[] {
  if (missionType === "positioning_review") return ["M-PNT", "M-MKT"];
  if (missionType === "market_entry") return ["M-MKT", "M-BIZ"];
  if (missionType === "business_diagnosis") return ["M-BIZ", "M-PNT"];
  if (missionType === "organization_review") return ["M-ED", "M-BIZ"];
  if (missionType === "expansion_review") return ["M-MKT", "M-PNT", "M-BIZ", "M-ED"];

  const agents = new Set<FounderAgentName>();
  if (/市场|进入|城市|品类/.test(message)) agents.add("M-MKT");
  if (/定位|品牌/.test(message)) agents.add("M-PNT");
  if (/赚钱|模式|扩张|商业/.test(message)) agents.add("M-BIZ");
  if (/股权|组织|激励/.test(message)) agents.add("M-ED");
  if (agents.size === 0) {
    return ["M-MKT", "M-PNT", "M-BIZ", "M-ED"];
  }
  return [...agents];
}

function inferMeetingType(missionType: FounderMissionType): FounderMeetingType {
  if (missionType === "positioning_review") return "positioning_council";
  if (missionType === "market_entry") return "entry_meeting";
  if (missionType === "business_diagnosis") return "diagnosis_meeting";
  if (missionType === "expansion_review") return "expansion_meeting";
  return "strategy_meeting";
}

function buildMissionTitle(missionType: FounderMissionType, message: string) {
  const clipped = message.replace(/\s+/g, " ").trim().slice(0, 48);
  if (missionType === "expansion_review") return `扩张可行性评审：${clipped}`;
  if (missionType === "positioning_review") return `品牌定位评审：${clipped}`;
  if (missionType === "market_entry") return `市场进入评审：${clipped}`;
  if (missionType === "business_diagnosis") return `商业模式诊断：${clipped}`;
  if (missionType === "organization_review") return `组织与股权评审：${clipped}`;
  return `战略评审：${clipped}`;
}

export function buildFounderMission(request: FounderMissionRequest): FounderMission {
  const missionType = inferMissionType(request.message);
  const requiredAgents = inferRequiredAgents(missionType, request.message);
  const question = request.message.trim() || "当前最关键的经营判断是什么";

  return {
    missionId: buildMissionId(),
    requestId: request.requestId,
    mission: buildMissionTitle(missionType, question),
    missionType,
    objective: question,
    question,
    requiredAgents,
    meetingType: inferMeetingType(missionType),
    confidence: 0.72,
    createdAt: new Date().toISOString(),
  };
}

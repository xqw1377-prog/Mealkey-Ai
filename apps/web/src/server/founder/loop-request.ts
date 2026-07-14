import type { FounderMissionRequest } from "@/server/founder-layer/contracts";
import type { CompanyContext } from "@/server/founder";

export function buildFounderLoopRequest(input: {
  project: {
    id: string;
    name: string;
    category: string | null;
    stage: string | null;
  };
  userId: string;
  message: string;
  companyContext: CompanyContext;
}): FounderMissionRequest {
  const { companyContext, message, project, userId } = input;

  return {
    requestId: `req_${Date.now().toString(36)}`,
    projectId: project.id,
    userId,
    message,
    companyContext: {
      companyId: project.id,
      basicInfo: {
        name: companyContext.brandName,
        industry: companyContext.industry,
        city: companyContext.city || "待补充",
        stage: companyContext.stageLabel || project.stage || "经营校准期",
      },
      brand: {
        name: companyContext.brandName,
        positioning: companyContext.strategicSummary,
      },
      business: {
        scale: companyContext.storeCount,
      },
      goals: [companyContext.yearlyGoal, message].filter(Boolean) as string[],
    },
    createdAt: new Date().toISOString(),
  };
}

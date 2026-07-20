import type {
  CapabilityRequest,
  OsKernelContext,
} from "../contracts/capability";
import type { FounderMissionRequest } from "../contracts";
import { emptyMemorySnapshot } from "../memory";

export function buildOsKernelContext(
  request: CapabilityRequest,
): OsKernelContext {
  return {
    mission: request.mission,
    companyContext: request.companyContext,
    memory: request.memory ?? emptyMemorySnapshot(),
  };
}

/** 从旧 MissionRequest 拼 CapabilityRequest（默认战略会议） */
export function capabilityRequestFromMissionRequest(
  request: FounderMissionRequest,
  mission: CapabilityRequest["mission"],
  mode: CapabilityRequest["mode"] = "strategy_meeting",
): CapabilityRequest {
  return {
    requestId: request.requestId,
    projectId: request.projectId,
    userId: request.userId,
    mode,
    mission,
    companyContext: request.companyContext,
    memory: request.currentMemory ?? null,
    assetContextBlock: request.assetContextBlock,
  };
}

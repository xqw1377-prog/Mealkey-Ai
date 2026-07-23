/**
 * Launch Agent - 开店战略顾问
 * 
 * MealKey 第一个标准 Agent 产品。
 * 
 * 产品组成:
 * - manifest: 身份证
 * - workflow: 分析流程
 * - capabilities: 能力集合
 * - prompt: 系统提示词
 * - reportTemplate: 报告模板
 */

import type { AgentDefinition, CapabilityDefinition } from "@mealkey/agent-sdk";
import { launchManifest } from "./manifest";
import { launchWorkflow } from "./workflow";
import { launchCapabilities } from "./capabilities";
import { LAUNCH_SYSTEM_PROMPT } from "./prompts/system";
import { launchReportTemplate } from "./reports/template";

export const LaunchAgent: AgentDefinition = {
  manifest: launchManifest as AgentDefinition["manifest"],
  workflow: launchWorkflow as AgentDefinition["workflow"],
  capabilities: launchCapabilities,
  prompt: LAUNCH_SYSTEM_PROMPT,
};

// 单独导出，方便测试
export { launchManifest } from "./manifest";
export { launchWorkflow } from "./workflow";
export { launchCapabilities } from "./capabilities";
export { LAUNCH_SYSTEM_PROMPT } from "./prompts/system";
export { launchReportTemplate } from "./reports/template";

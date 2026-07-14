/**
 * Launch Agent - 能力注册
 */

import type { CapabilityDefinition } from "@mealkey/agent-sdk";
import { diagnosisCapability } from "./diagnosis";
import { marketCapability } from "./market";
import { positioningCapability } from "./positioning";
import { financeCapability } from "./finance";

export const launchCapabilities: CapabilityDefinition[] = [
  diagnosisCapability,
  marketCapability,
  positioningCapability,
  financeCapability,
];

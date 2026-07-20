import type { ConsultingAgentKind } from "../types";
import {
  compileAnswersFromIntake,
  evaluateModuleIntakeChecklist,
  upsertBasics,
  type AdaptiveFollowupSession,
  type IntakeFieldDef,
  type ModuleBasicsProfile,
  type ModuleIntakeChecklist,
} from "./core";
import { MMKT_BASICS_FIELDS, generateMmktFollowups } from "./mmkt-basics";
import { MBIZ_BASICS_FIELDS, generateMbizFollowups } from "./mbiz-basics";
import { MED_BASICS_FIELDS, generateMedFollowups } from "./med-basics";

export type ModuleIntakeConfig = {
  agentId: ConsultingAgentKind;
  fields: IntakeFieldDef[];
  generateFollowups: (basics: ModuleBasicsProfile) => AdaptiveFollowupSession;
};

const CONFIGS: Record<ConsultingAgentKind, ModuleIntakeConfig> = {
  "m-mkt": {
    agentId: "m-mkt",
    fields: MMKT_BASICS_FIELDS,
    generateFollowups: generateMmktFollowups,
  },
  "m-biz": {
    agentId: "m-biz",
    fields: MBIZ_BASICS_FIELDS,
    generateFollowups: generateMbizFollowups,
  },
  "m-ed": {
    agentId: "m-ed",
    fields: MED_BASICS_FIELDS,
    generateFollowups: generateMedFollowups,
  },
};

export function getModuleIntakeConfig(
  agentId: ConsultingAgentKind,
): ModuleIntakeConfig {
  return CONFIGS[agentId];
}

export function upsertModuleBasics(
  agentId: ConsultingAgentKind,
  existing: ModuleBasicsProfile | undefined,
  patch: Record<string, string>,
): ModuleBasicsProfile {
  const cfg = getModuleIntakeConfig(agentId);
  return upsertBasics(cfg.fields, existing, patch);
}

export function generateModuleFollowups(
  agentId: ConsultingAgentKind,
  basics: ModuleBasicsProfile,
): AdaptiveFollowupSession {
  return getModuleIntakeConfig(agentId).generateFollowups(basics);
}

export function compileModuleIntakeAnswers(
  agentId: ConsultingAgentKind,
  basics: ModuleBasicsProfile,
  followups?: AdaptiveFollowupSession | null,
): Record<string, string> {
  const cfg = getModuleIntakeConfig(agentId);
  return compileAnswersFromIntake({
    fields: cfg.fields,
    basics,
    followups,
  });
}

export function evaluateAgentIntakeChecklist(input: {
  agentId: ConsultingAgentKind;
  basics?: ModuleBasicsProfile | null;
  followups?: AdaptiveFollowupSession | null;
  research?: {
    status?: string;
    collectionMode?: string;
    sources?: unknown[];
    sections?: unknown[];
  } | null;
}): ModuleIntakeChecklist {
  const cfg = getModuleIntakeConfig(input.agentId);
  return evaluateModuleIntakeChecklist({
    fields: cfg.fields,
    basics: input.basics,
    followups: input.followups,
    research: input.research,
  });
}

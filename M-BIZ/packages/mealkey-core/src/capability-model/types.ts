export type BusinessCapabilityId =
  | "strategy"
  | "product"
  | "operation"
  | "growth"
  | "management";

export type BusinessCapabilityScoreSource =
  | "owner_capability"
  | "owner_background"
  | "project_profile"
  | "default";

export interface BusinessSubCapability {
  id: string;
  label: string;
  summary: string;
}

export interface BusinessCapabilityDefinition {
  id: BusinessCapabilityId;
  label: string;
  summary: string;
  aliases: string[];
  subCapabilities: BusinessSubCapability[];
}

export interface BusinessCapabilityScorecardItem {
  id: BusinessCapabilityId;
  label: string;
  value: number;
  source: BusinessCapabilityScoreSource;
}

export interface RawBusinessCapabilityInput {
  name?: string | null;
  category?: string | null;
  score?: number | null;
}

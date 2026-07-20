import type {
  ActionRecord,
  BrandProfile,
  BusinessProfile,
  CapabilityProfile,
  DecisionRecord,
  LearningRecord,
  RestaurantBrainSnapshot,
  RestaurantProfile,
} from "../domain/types";
import type { DnaPatchPropose } from "../events/memory-event";
import type {
  DecisionMemoryUpsert,
  DecisionMemoryValidated,
} from "../events/decision-event";

export type UpsertBusinessContextInput = Partial<BusinessProfile> & {
  restaurantId: string;
};
export type UpsertCapabilityInput = Partial<CapabilityProfile> & {
  restaurantId: string;
};
export type CreateActionMemoryInput = Omit<
  ActionRecord,
  "id" | "createdAt" | "updatedAt" | "status"
> & { status?: ActionRecord["status"] };
export type CreateLearningMemoryInput = Omit<
  LearningRecord,
  "id" | "createdAt" | "updatedAt" | "appliedCount"
> & { appliedCount?: number };

export interface RestaurantBrainMemoryApi {
  ensureBrain(input: {
    projectId: string;
    ownerId: string;
  }): Promise<RestaurantBrainSnapshot>;

  getSnapshot(restaurantId: string): Promise<RestaurantBrainSnapshot | null>;

  updateProfile(
    restaurantId: string,
    patch: Partial<RestaurantProfile>,
  ): Promise<RestaurantProfile>;

  upsertBrand(
    restaurantId: string,
    patch: Partial<BrandProfile>,
  ): Promise<BrandProfile>;

  upsertBusinessContext(
    input: UpsertBusinessContextInput,
  ): Promise<BusinessProfile>;

  upsertCapabilityProfile(
    input: UpsertCapabilityInput,
  ): Promise<CapabilityProfile>;

  proposeDnaPatch(
    patch: DnaPatchPropose,
  ): Promise<{ accepted: boolean; snapshot: RestaurantBrainSnapshot }>;

  upsertDecisionMemory(input: DecisionMemoryUpsert): Promise<DecisionRecord>;

  validateDecisionMemory(
    input: DecisionMemoryValidated,
  ): Promise<{ decision: DecisionRecord; learning?: LearningRecord }>;

  createActionMemory(input: CreateActionMemoryInput): Promise<ActionRecord>;

  completeActionMemory(input: {
    actionId: string;
    result: unknown;
    status?: "done" | "blocked" | "cancelled";
  }): Promise<ActionRecord>;

  createLearningMemory(
    input: CreateLearningMemoryInput,
  ): Promise<LearningRecord>;
}

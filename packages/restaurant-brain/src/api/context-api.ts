import type { AgentRestaurantContext } from "../domain/types";

export type LoadBrainContextInput = {
  projectId: string;
  ownerId: string;
  question?: string;
};

export interface RestaurantBrainContextApi {
  loadContext(input: LoadBrainContextInput): Promise<AgentRestaurantContext>;
  loadPriorBlock(input: LoadBrainContextInput): Promise<string>;
}

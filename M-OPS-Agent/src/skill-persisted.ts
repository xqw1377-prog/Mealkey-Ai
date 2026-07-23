import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import {
  getLatestDiagnosisSnapshot,
  listDiagnosisLearnings,
  persistDiagnosisRun,
} from "./diagnosis-persistence";
import {
  runRestaurantDiagnosisSkill,
  type DiagnosisSkillResult,
} from "./skill";

export function runRestaurantDiagnosisSkillPersisted(
  ctx: ContextPackageV1,
): DiagnosisSkillResult {
  return runRestaurantDiagnosisSkill(ctx, {
    previousSnapshot: getLatestDiagnosisSnapshot(ctx.restaurantId),
    previousLearnings: listDiagnosisLearnings(ctx.restaurantId),
    onResult: ({ result }) => {
      persistDiagnosisRun({
        restaurantId: ctx.restaurantId,
        result,
      });
    },
  });
}

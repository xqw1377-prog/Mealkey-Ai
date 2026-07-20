/**
 * 七常委决策室进行中草稿 — 存 Project.profile.activeCouncilDraft
 * 决策板就绪 / 待创始人裁决时写入；裁决关闭后清除。
 */

import { z } from "zod";

export const ActiveCouncilDraftSchema = z.object({
  status: z.enum(["board_ready", "awaiting_founder"]),
  sessionId: z.string().min(1),
  caseId: z.string().min(1),
  topic: z.string().min(1).max(400),
  level: z.string().max(8).optional(),
  recommendedAction: z.string().max(80).optional(),
  insightCount: z.number().int().nonnegative().optional(),
  /** 常委真实票数（非 insightCount 估算） */
  supportCount: z.number().int().nonnegative().optional(),
  opposeCount: z.number().int().nonnegative().optional(),
  observeCount: z.number().int().nonnegative().optional(),
  biggestDispute: z.string().max(400).optional(),
  /** 完整会话 JSON，供续裁恢复 */
  session: z.unknown(),
  updatedAt: z.string(),
});

export type ActiveCouncilDraft = z.infer<typeof ActiveCouncilDraftSchema>;

export function parseActiveCouncilDraft(
  value: unknown,
): ActiveCouncilDraft | null {
  const parsed = ActiveCouncilDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

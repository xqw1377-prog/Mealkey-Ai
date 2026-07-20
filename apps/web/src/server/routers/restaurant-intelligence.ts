/**
 * Restaurant Intelligence Profile tRPC — R1 生成 / 读取 / 确认门禁
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import type { BusinessIdentityV1 } from "@/server/founder-layer/contracts/business-identity";
import {
  confirmRipSnapshot,
  generateIdentityOnlyRip,
  getCurrentRipSnapshot,
  needsRipConfirmGate,
  readRipStore,
  refreshRipDaily,
  ripPagePath,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import { syncConfirmedRipToBrain } from "@/server/founder-layer/capability/restaurant-intelligence/dna-seed";
import {
  diffRipSnapshots,
  signalsFromRipDiff,
} from "@/server/founder-layer/capability/restaurant-intelligence/rip-diff";

async function requireOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      ownerId: true,
      profile: true,
      category: true,
    },
  });
  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "项目不存在或无权限",
    });
  }
  return project;
}

function identityFromProfile(
  profile: Record<string, unknown>,
): BusinessIdentityV1 | null {
  const raw = profile.businessIdentity;
  if (!raw || typeof raw !== "object") return null;
  return raw as BusinessIdentityV1;
}

export const restaurantIntelligenceRouter = router({
  /** 当前画像 + 是否需要确认门禁 */
  get: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<
        string,
        unknown
      >;
      const store = readRipStore(profile);
      const snapshot = getCurrentRipSnapshot(store);
      return {
        store,
        snapshot,
        needsConfirm: needsRipConfirmGate(store),
        identity: identityFromProfile(profile),
        pagePath: ripPagePath(project.id),
      };
    }),

  /** Identity-only 生成（可幂等复用待确认稿） */
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<
        string,
        unknown
      >;
      const identity = identityFromProfile(profile);
      if (!identity?.brandName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请先完成经营身份速写",
        });
      }
      const category =
        (typeof profile.category === "string" && profile.category) ||
        (typeof profile.businessType === "string" && profile.businessType) ||
        project.category ||
        undefined;

      const snapshot = await generateIdentityOnlyRip({
        projectId: project.id,
        ownerId: project.ownerId,
        identity,
        category,
        force: input.force,
      });

      return {
        snapshot,
        redirectTo: ripPagePath(project.id),
      };
    }),

  /** 确认门禁：准确 / 修改 / 不符合 */
  confirm: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        snapshotId: z.string().min(1),
        action: z.enum(["confirm", "revise", "reject"]),
        founderClaim: z.string().max(200).optional(),
        revise: z
          .object({
            stageLabel: z.string().max(80).optional(),
            category: z.string().max(80).optional(),
            founderClaim: z.string().max(200).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const result = await confirmRipSnapshot({
        projectId: project.id,
        ownerId: project.ownerId,
        snapshotId: input.snapshotId,
        action: input.action,
        revise: input.revise,
        founderClaim: input.founderClaim,
      });

      if (input.action === "confirm") {
        try {
          await syncConfirmedRipToBrain(prisma, {
            projectId: project.id,
            ownerId: project.ownerId,
            snapshot: result.snapshot,
          });
        } catch {
          // Brain 投影失败不阻断进驾驶舱
        }
      }

      return result;
    }),

  /** R4：日更重采 → 差分 → 可供 Scan 升格的信号（不写 Decision 行） */
  refreshDaily: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<
        string,
        unknown
      >;
      const identity = identityFromProfile(profile);
      if (!identity?.brandName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请先完成经营身份速写",
        });
      }
      const category =
        (typeof profile.category === "string" && profile.category) ||
        project.category ||
        undefined;

      const { snapshot, previous } = await refreshRipDaily({
        projectId: project.id,
        ownerId: project.ownerId,
        identity,
        category,
      });
      const diff = diffRipSnapshots(previous, snapshot);
      const signals = signalsFromRipDiff({
        projectId: project.id,
        brandName: identity.brandName,
        storeName: identity.objectName,
        city: identity.city,
        decisionHorizon: identity.decisionHorizon,
        diff,
        current: snapshot,
      });

      return {
        snapshot,
        previousSnapshotId: previous?.snapshotId ?? null,
        diff,
        signalCount: signals.length,
        signals,
      };
    }),
});

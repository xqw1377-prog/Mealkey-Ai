/**
 * Mobile Agent Phase 1 — 说 / 给 / 看 + Goal Compiler
 * 真源：docs/MEALKEY_MOBILE_AGENT_V1.md
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  compileGoalTurn,
  readMobileAgentState,
  applyCompileToState,
  writeMobileAgentIntoProfile,
  buildKnownCompileContext,
} from "@/server/founder-layer/goal-compiler";
import { compileHostWithLlm } from "@/server/founder-layer/goal-compiler/llm-compile";
import { invokeCapabilitiesForCompile } from "@/server/founder-layer/goal-compiler/capability-invoke";
import {
  appendSeedMetricsFromCompile,
  seedMetricsBrief,
} from "@/server/founder-layer/goal-compiler/seed-metrics";
import {
  emptyMobileAgentState,
  type CompileTrigger,
} from "@/server/founder-layer/contracts/goal-compiler";
import { ingestSignalsAndEvolve } from "@/server/founder-layer/intelligence/evolve";
import type { BehaviorSignal } from "@/server/founder-layer/contracts/intelligence-profile";
import {
  applySkillToState,
  getDrillById,
  runSkillTurn,
  shouldHandleSkillTurn,
  skillResultToCompileOutput,
} from "@/server/founder-layer/skill-engine";
import {
  readEvolutionLoop,
  recordCompileEvolution,
  recordSkillEvolution,
  resolveDispatchLane,
} from "@/server/founder-layer/evolution-loop";

async function loadOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      name: true,
      profile: true,
      owner: { select: { id: true, name: true } },
    },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
  }
  return project;
}

const fileRefSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "xlsx",
    "csv",
    "image",
    "pdf",
    "doc",
    "chat_export",
    "other",
  ]),
  label: z.string().optional(),
});

async function loadFileText(
  userId: string,
  projectId: string,
  fileRefs?: Array<{ id: string }>,
): Promise<string> {
  if (!fileRefs?.length) return "";
  const ids = fileRefs.map((f) => f.id);
  const assets = await prisma.asset.findMany({
    where: {
      id: { in: ids },
      projectId,
      owner: { userId },
    },
    select: {
      title: true,
      fileName: true,
      extractedText: true,
      transcript: true,
      summary: true,
    },
  });
  return assets
    .map((a) => {
      const body =
        a.extractedText?.trim() ||
        a.transcript?.trim() ||
        a.summary?.trim() ||
        "";
      if (!body) return "";
      return `【${a.title || a.fileName}】\n${body.slice(0, 12000)}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export const mobileAgentRouter = router({
  getState: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const state = readMobileAgentState(profile);
      const known = buildKnownCompileContext(
        profile,
        state,
        project.owner.name ?? undefined,
      );
      const evolution = readEvolutionLoop(profile);
      return {
        projectId: project.id,
        projectName: project.name,
        ownerName: project.owner.name ?? undefined,
        state,
        known: {
          brandName: known.brandName,
          city: known.city,
          category: known.category,
          focus: known.focus,
        },
        seed: seedMetricsBrief(
          state.seedMetrics ?? {
            events: [],
            compileCount: 0,
            assetCount: 0,
            returnCount: 0,
          },
        ),
        evolution: {
          totalEvents: evolution.aggregate.totalEvents,
          skillDrillCount: evolution.aggregate.skillDrillCount,
          compileCount: evolution.aggregate.compileCount,
          recentLessons: evolution.aggregate.recentLessons.slice(0, 3),
          lastDispatchLane: evolution.aggregate.lastDispatchLane ?? null,
        },
      };
    }),

  compile: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        trigger: z.enum([
          "utterance",
          "file",
          "observe",
          "continue",
          "confirm_slot",
        ]),
        utterance: z.string().max(4000).optional(),
        fileRefs: z.array(fileRefSchema).max(5).optional(),
        slotPatches: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
        goalId: z.string().optional(),
        signalId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const prev = readMobileAgentState(profile);
      const known = buildKnownCompileContext(
        profile,
        prev,
        project.owner.name ?? undefined,
      );

      const trigger = input.trigger as CompileTrigger;
      const utterance = input.utterance?.trim() ?? "";
      if (
        trigger === "utterance" &&
        !utterance &&
        !(input.fileRefs && input.fileRefs.length)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请先说一句经营问题，或上传文件",
        });
      }
      if (trigger === "observe" && !utterance && !prev.activeGoal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请选择一条经营动态建议，或先说一句经营问题",
        });
      }

      const fileText = await loadFileText(
        ctx.userId!,
        project.id,
        input.fileRefs,
      );

      // Skill Engine：陪练意图优先（不经宿主 LLM，保证可评分闭环）
      if (
        shouldHandleSkillTurn({
          trigger,
          utterance,
          activeDrill: prev.activeDrill,
        })
      ) {
        const skillResult = runSkillTurn({
          utterance,
          activeDrill: prev.activeDrill,
        });
        const output = skillResultToCompileOutput(
          skillResult,
          project.id,
          prev.activeGoal,
        );
        const nextState = applySkillToState(
          prev,
          skillResult,
          output,
          utterance,
        );
        try {
          await updateProjectProfile(
            project.id,
            (current) => {
              let nextProfile = writeMobileAgentIntoProfile(current, nextState);
              if (skillResult.kind === "evaluate" && skillResult.evaluation) {
                const drill = getDrillById(
                  skillResult.activeDrill?.drillId ?? "",
                );
                nextProfile = recordSkillEvolution(nextProfile, {
                  role: (skillResult.activeDrill?.role ??
                    "owner") as "owner" | "manager" | "server" | "chef",
                  drillId: skillResult.activeDrill?.drillId ?? "unknown",
                  skillKey: drill?.skillKey,
                  score: skillResult.evaluation.score,
                  lesson:
                    skillResult.evaluation.improvements[0] ||
                    skillResult.evaluation.strengths[0] ||
                    `陪练 ${drill?.title ?? ""} L${skillResult.evaluation.level}`,
                  scenarioKey: drill?.id ?? "skill_drill",
                });
              }
              return nextProfile;
            },
            { ownerId: project.owner.id },
          );
        } catch (e) {
          const conflict = toProfileConflictTRPC(e);
          if (conflict) throw conflict;
          throw e;
        }
        return {
          output,
          state: nextState,
          meta: {
            hostLlm: false,
            provider: "skill-engine",
            stub: false,
            fileTextChars: 0,
            fileReadable: false,
            capabilities: ["skill-engine.v1"],
            capabilityDegraded: false,
            skill: skillResult.kind,
            dispatchLane: "skill" as const,
          },
        };
      }

      const dispatch = resolveDispatchLane({ utterance });

      // 脚手架（结构）→ 宿主大模型（理解与专业表达，始终在线）
      const scaffold = compileGoalTurn(
        {
          restaurantRef: project.id,
          trigger,
          utterance: utterance || undefined,
          fileRefs: input.fileRefs,
          slotPatches: input.slotPatches,
          goalId: input.goalId ?? prev.activeGoal?.goalId,
          signalId: input.signalId,
        },
        {
          state: prev,
          ownerName: project.owner.name ?? undefined,
          fileText: fileText || undefined,
          known,
        },
      );

      let output = scaffold;
      let hostMeta: { usedLlm: boolean; provider: string; stub: boolean };
      try {
        const host = await compileHostWithLlm({
          scaffold,
          known,
          fileText: fileText || undefined,
          utterance: utterance || undefined,
        });
        output = host.output;
        hostMeta = host.meta;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "宿主编译需要大模型在线";
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message,
        });
      }

      // 有资产时再加深专业段落（失败诚实降级，不挡主路径）
      let capabilityMeta = { invoked: [] as string[], degraded: true };
      if (output.artifacts.length > 0 && !hostMeta.stub) {
        const cap = await invokeCapabilitiesForCompile({
          output,
          known,
          fileText: fileText || undefined,
          projectId: project.id,
        });
        output = cap.output;
        capabilityMeta = {
          invoked: cap.invoked,
          degraded: cap.degraded,
        };
      }

      const userText =
        utterance ||
        (input.fileRefs?.[0]?.label
          ? `上传：${input.fileRefs[0].label}`
          : trigger === "continue"
            ? "继续"
            : trigger === "observe"
              ? "跟进经营动态"
              : "补充信息");

      let nextState = applyCompileToState(prev, output, userText);
      nextState = appendSeedMetricsFromCompile({
        prev,
        next: nextState,
        output,
        known,
        trigger,
      });

      try {
        await updateProjectProfile(
          project.id,
          (current) => {
            let nextProfile = writeMobileAgentIntoProfile(current, nextState);
            nextProfile = recordCompileEvolution(nextProfile, {
              utterance: userText,
              dispatchLane: dispatch.lane,
              rolePerspective: dispatch.rolePerspective,
              scenarioKey: dispatch.scenarioKey,
              goalTitle: output.goal?.title,
              assetCount: output.artifacts?.length ?? 0,
            });
            return nextProfile;
          },
          { ownerId: project.owner.id },
        );
      } catch (e) {
        const conflict = toProfileConflictTRPC(e);
        if (conflict) throw conflict;
        throw e;
      }

      return {
        output,
        state: nextState,
        meta: {
          hostLlm: hostMeta.usedLlm,
          provider: hostMeta.provider,
          stub: hostMeta.stub,
          fileTextChars: fileText.length,
          fileReadable: fileText.trim().length > 0,
          capabilities: capabilityMeta.invoked,
          capabilityDegraded: capabilityMeta.degraded,
          dispatchLane: dispatch.lane,
          dispatchReason: dispatch.reason,
        },
      };
    }),

  /**
   * 删除历史对话项：
   * - asset：移除经营资产（侧栏「历史对话」主体）
   * - current：清空当前线程（等同开新对话，保留其余资产）
   */
  deleteHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        kind: z.enum(["asset", "current"]),
        id: z.string().min(1).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const prev = readMobileAgentState(profile);
      const now = new Date().toISOString();

      let next = prev;
      if (input.kind === "asset") {
        const before = prev.assets.length;
        const assets = prev.assets.filter((a) => a.assetId !== input.id);
        if (assets.length === before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "未找到该历史对话",
          });
        }
        next = {
          ...prev,
          assets,
          turns: prev.turns.filter(
            (t) => !(t.artifactIds || []).includes(input.id),
          ),
          updatedAt: now,
        };
      } else {
        // current：清对话线程，保留历史资产
        next = {
          ...emptyMobileAgentState(),
          assets: prev.assets,
          memoryHints: prev.memoryHints,
          seedMetrics: prev.seedMetrics,
          turns: [],
          updatedAt: now,
        };
      }

      const seedBase = next.seedMetrics ?? {
        events: [],
        compileCount: 0,
        assetCount: next.assets.length,
        returnCount: 0,
      };
      next = {
        ...next,
        seedMetrics: {
          ...seedBase,
          assetCount: next.assets.length,
          events: [
            ...seedBase.events,
            {
              name: "mobile.memory_signal" as const,
              at: now,
              payload: {
                kind: "delete_history",
                targetKind: input.kind,
                id: input.id,
              },
            },
          ].slice(-80),
        },
      };

      try {
        await updateProjectProfile(
          project.id,
          (current) => writeMobileAgentIntoProfile(current, next),
          { ownerId: project.owner.id },
        );
      } catch (e) {
        const conflict = toProfileConflictTRPC(e);
        if (conflict) throw conflict;
        throw e;
      }
      return { state: next, deleted: { kind: input.kind, id: input.id } };
    }),

  /** 色卡中间草稿：刷新可续填（正式写入仍走 compile.slotPatches） */
  saveSlotDrafts: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        drafts: z.record(z.string().max(2000)).refine(
          (o) => Object.keys(o).length <= 24,
          "草稿槽位过多",
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const prev = readMobileAgentState(profile);
      const pending = new Set(prev.pendingQuestions.map((q) => q.slot));
      const drafts: Record<string, string> = {};
      for (const [k, v] of Object.entries(input.drafts)) {
        if (!pending.has(k)) continue;
        const t = v.trim();
        if (!t) continue;
        drafts[k.slice(0, 80)] = t.slice(0, 2000);
      }
      const next = {
        ...prev,
        slotDrafts: drafts,
        updatedAt: new Date().toISOString(),
      };
      try {
        await updateProjectProfile(
          project.id,
          (current) => writeMobileAgentIntoProfile(current, next),
          { ownerId: project.owner.id },
        );
      } catch (e) {
        const conflict = toProfileConflictTRPC(e);
        if (conflict) throw conflict;
        throw e;
      }
      return { ok: true as const, slotDrafts: drafts };
    }),

  /** 开启新目标（保留 memoryHints / 历史资产） */
  startFreshGoal: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const prev = readMobileAgentState(profile);
      const next = {
        ...emptyMobileAgentState(),
        assets: prev.assets,
        memoryHints: prev.memoryHints,
        turns: [],
        updatedAt: new Date().toISOString(),
      };

      // 放弃进行中目标 = 合法 override 燃料（四类之一）
      const signals: BehaviorSignal[] = [];
      if (prev.activeGoal) {
        signals.push({
          kind: "override_ai",
          recommendation: prev.activeGoal.title,
          userChoice: "开启新目标",
          reason: prev.activeGoal.currentStage
            ? `离开阶段：${prev.activeGoal.currentStage}`
            : "放弃当前目标重新开始",
          laterOutcome: "unknown",
          at: new Date().toISOString(),
        });
      }

      // 保留 seedMetrics；训练事件记一笔
      next.seedMetrics = {
        ...(prev.seedMetrics ?? {
          events: [],
          compileCount: 0,
          assetCount: 0,
          returnCount: 0,
        }),
        events: [
          ...(prev.seedMetrics?.events ?? []),
          {
            name: "mobile.memory_signal" as const,
            at: new Date().toISOString(),
            payload: { kind: "override_ai", action: "start_fresh_goal" },
          },
        ].slice(-80),
      };

      try {
        await updateProjectProfile(
          project.id,
          (current) => {
            let nextProfile = writeMobileAgentIntoProfile(current, next);
            if (signals.length) {
              nextProfile = ingestSignalsAndEvolve(nextProfile, signals);
            }
            return nextProfile;
          },
          { ownerId: project.owner.id },
        );
      } catch (e) {
        const conflict = toProfileConflictTRPC(e);
        if (conflict) throw conflict;
        throw e;
      }
      return { state: next };
    }),

  /**
   * 从 Agent 待确认决策进入决策室前记录 — decision_choice 燃料
   * （未拍板，choice=进入决策室审视）
   */
  acknowledgePendingDecision: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1).max(200),
        action: z.enum(["open_decision_room", "dismiss"]).default("open_decision_room"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const state = readMobileAgentState(profile);
      const hit =
        state.pendingDecisions.find((d) => d.title === input.title) ||
        state.pendingDecisions[0];
      if (!hit) {
        return { ok: false as const, reason: "no_pending" };
      }

      const signal: BehaviorSignal = {
        kind: "decision_choice",
        topic: hit.title,
        optionsShown: ["去决策室确认", "稍后"],
        choice:
          input.action === "dismiss" ? "稍后处理" : "进入决策室确认",
        vsRecommended:
          input.action === "dismiss" ? "modified" : "aligned",
        at: new Date().toISOString(),
      };

      let nextState = state;
      if (input.action === "dismiss") {
        nextState = {
          ...state,
          pendingDecisions: state.pendingDecisions.filter(
            (d) => d.title !== hit.title,
          ),
          updatedAt: new Date().toISOString(),
        };
      }
      const seedBase = nextState.seedMetrics ?? {
        events: [],
        compileCount: 0,
        assetCount: 0,
        returnCount: 0,
      };
      nextState = {
        ...nextState,
        seedMetrics: {
          ...seedBase,
          events: [
            ...seedBase.events,
            {
              name: "mobile.memory_signal" as const,
              at: new Date().toISOString(),
              payload: {
                kind: "decision_choice",
                action: input.action,
                topic: hit.title,
              },
            },
          ].slice(-80),
        },
      };

      try {
        await updateProjectProfile(
          project.id,
          (current) => {
            let nextProfile = writeMobileAgentIntoProfile(current, nextState);
            nextProfile = ingestSignalsAndEvolve(nextProfile, [signal]);
            return nextProfile;
          },
          { ownerId: project.owner.id },
        );
      } catch (e) {
        const conflict = toProfileConflictTRPC(e);
        if (conflict) throw conflict;
        throw e;
      }
      return {
        ok: true as const,
        href: `/projects/${project.id}/decision-room?topic=${encodeURIComponent(hit.title)}`,
      };
    }),
});

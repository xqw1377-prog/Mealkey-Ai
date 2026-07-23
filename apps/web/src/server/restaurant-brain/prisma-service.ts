/**
 * PrismaRestaurantBrainService — Restaurant Brain V1 实现（web 侧）
 *
 * Package 定义接口；本类负责 Prisma 读写。
 * 权威：docs/ARCHITECTURE_INTEGRATION_REPORT.md
 */

import {
  BrainEventType,
  buildRestaurantContext,
  createEmptyBrain,
  mergeDnaPatch,
  recomputeEvolution,
  thinStartBrand,
  type AgentRestaurantContext,
  type BrainEvent,
  type DecisionRecord,
  type DnaPatchPropose,
  type LearningRecord,
  type RestaurantBrainService,
  type RestaurantBrainSnapshot,
  type RestaurantContext,
  type RestaurantStage,
} from "@mealkey/restaurant-brain";
import type { PrismaClient } from "@/generated/prisma";

function mapStage(stage: string): RestaurantStage {
  if (stage === "opening" || stage === "setup") return "opening";
  if (stage === "growth" || stage === "expanding" || stage === "operating")
    return "growth";
  if (stage === "mature") return "mature";
  if (stage === "expansion") return "expansion";
  if (stage === "idea" || stage === "positioning" || stage === "location")
    return "idea";
  return "unknown";
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clip(text: string, max = 280): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export class PrismaRestaurantBrainService implements RestaurantBrainService {
  constructor(private readonly prisma: PrismaClient) {}

  /** 用户计划别名 → getRestaurantContext */
  async loadContext(restaurantId: string): Promise<RestaurantContext> {
    return this.getRestaurantContext(restaurantId);
  }

  async getRestaurantContext(restaurantId: string): Promise<RestaurantContext> {
    const snapshot = await this.loadSnapshot(restaurantId);
    if (!snapshot) {
      throw new Error(`Restaurant Brain 不存在: ${restaurantId}`);
    }
    return buildRestaurantContext(snapshot);
  }

  /** 用户计划别名 → updateKnowledge */
  async recordEvent(event: BrainEvent): Promise<void> {
    return this.updateKnowledge(event);
  }

  async updateKnowledge(event: BrainEvent): Promise<void> {
    await this.prisma.brainEvent.create({
      data: {
        restaurantId: event.restaurantId,
        type: event.type,
        payloadJson: JSON.stringify(event.payload ?? {}),
        source: event.source || "system",
      },
    });
  }

  async recordDecision(decision: DecisionRecord): Promise<void> {
    const existing = decision.mkDecisionId
      ? await this.prisma.decisionRecord.findUnique({
          where: { mkDecisionId: decision.mkDecisionId },
        })
      : null;

    if (existing) {
      await this.prisma.decisionRecord.update({
        where: { id: existing.id },
        data: {
          type: decision.type,
          question: decision.question,
          chosenOption: decision.chosenOption ?? null,
          status: decision.status,
          learningGenerated: decision.learningGenerated,
          contextJson: decision.context
            ? JSON.stringify(decision.context)
            : existing.contextJson,
          optionsJson: decision.options
            ? JSON.stringify(decision.options)
            : existing.optionsJson,
          aiAssessmentJson:
            decision.aiAssessment !== undefined
              ? JSON.stringify(decision.aiAssessment)
              : existing.aiAssessmentJson,
          councilResultJson:
            decision.councilResult !== undefined
              ? JSON.stringify(decision.councilResult)
              : existing.councilResultJson,
          expectedOutcomeJson:
            decision.expectedOutcome !== undefined
              ? JSON.stringify(decision.expectedOutcome)
              : existing.expectedOutcomeJson,
          actualOutcomeJson:
            decision.actualOutcome !== undefined
              ? JSON.stringify(decision.actualOutcome)
              : existing.actualOutcomeJson,
        },
      });
      await this.updateKnowledge({
        restaurantId: decision.restaurantId,
        type: BrainEventType.DECISION_CREATED,
        payload: {
          decisionRecordId: existing.id,
          mkDecisionId: decision.mkDecisionId,
          question: decision.question,
          updated: true,
        },
        source: "decision",
        at: new Date().toISOString(),
      });
      return;
    }

    const created = await this.prisma.decisionRecord.create({
      data: {
        ...(decision.id.startsWith("pending_") ? {} : { id: decision.id }),
        restaurantId: decision.restaurantId,
        mkDecisionId: decision.mkDecisionId ?? null,
        type: decision.type,
        question: decision.question,
        contextJson: decision.context
          ? JSON.stringify(decision.context)
          : null,
        optionsJson: decision.options
          ? JSON.stringify(decision.options)
          : null,
        chosenOption: decision.chosenOption ?? null,
        aiAssessmentJson:
          decision.aiAssessment !== undefined
            ? JSON.stringify(decision.aiAssessment)
            : null,
        councilResultJson:
          decision.councilResult !== undefined
            ? JSON.stringify(decision.councilResult)
            : null,
        expectedOutcomeJson:
          decision.expectedOutcome !== undefined
            ? JSON.stringify(decision.expectedOutcome)
            : null,
        actualOutcomeJson:
          decision.actualOutcome !== undefined
            ? JSON.stringify(decision.actualOutcome)
            : null,
        learningGenerated: decision.learningGenerated,
        status: decision.status,
      },
    });

    await this.prisma.evolutionState.updateMany({
      where: { restaurantId: decision.restaurantId },
      data: {
        decisionCount: { increment: 1 },
        lastEvolutionAt: new Date(),
      },
    });

    await this.updateKnowledge({
      restaurantId: decision.restaurantId,
      type: BrainEventType.DECISION_CREATED,
      payload: {
        decisionRecordId: created.id,
        mkDecisionId: decision.mkDecisionId ?? null,
        question: decision.question,
      },
      source: "decision",
      at: new Date().toISOString(),
    });
  }

  /** 用户计划别名 → learn */
  async recordLearning(learning: LearningRecord): Promise<void> {
    return this.learn(learning);
  }

  async learn(learning: LearningRecord): Promise<void> {
    const created = await this.prisma.brainLearning.create({
      data: {
        ...(learning.id.startsWith("pending_") ? {} : { id: learning.id }),
        restaurantId: learning.restaurantId,
        sourceType: learning.sourceType,
        sourceId: learning.sourceId ?? null,
        pattern: learning.pattern,
        insight: learning.insight,
        confidence: learning.confidence,
        appliedCount: learning.appliedCount,
      },
    });

    await this.prisma.evolutionState.updateMany({
      where: { restaurantId: learning.restaurantId },
      data: {
        learningCount: { increment: 1 },
        lastEvolutionAt: new Date(),
      },
    });

    await this.updateKnowledge({
      restaurantId: learning.restaurantId,
      type: BrainEventType.LEARNING_CREATED,
      payload: {
        learningId: created.id,
        pattern: learning.pattern,
      },
      source: "learning",
      at: new Date().toISOString(),
    });
  }

  // ─── 编排辅助（非接口，供 Factory / createDecision 使用）───

  async ensureByProject(input: {
    projectId: string;
    ownerId: string;
  }): Promise<RestaurantBrainSnapshot> {
    const existing = await this.prisma.restaurant.findUnique({
      where: { projectId: input.projectId },
    });
    if (existing) {
      const snap = await this.loadSnapshot(existing.id);
      if (snap) return snap;
    }

    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: input.projectId },
    });
    const profileExtra = parseJson<Record<string, unknown>>(project.profile, {});
    const name =
      (typeof profileExtra.brandName === "string" && profileExtra.brandName) ||
      project.name;
    const thin = thinStartBrand({
      brandName: name,
      category:
        (typeof profileExtra.category === "string" && profileExtra.category) ||
        project.category ||
        undefined,
      positioning:
        (typeof profileExtra.mentalPosition === "string" &&
          profileExtra.mentalPosition) ||
        undefined,
      targetCustomer:
        (typeof profileExtra.targetCustomers === "string" &&
          profileExtra.targetCustomers) ||
        project.target ||
        undefined,
      priceRange:
        (typeof profileExtra.priceRange === "string" &&
          profileExtra.priceRange) ||
        undefined,
    });

    const storeFromProfile = Number(profileExtra.storeCount);
    const empty = createEmptyBrain({
      projectId: project.id,
      ownerId: project.ownerId,
      displayName: name,
      category: thin.profile.category,
      stage: mapStage(project.stage),
      location:
        [project.city, project.district].filter(Boolean).join(" · ") ||
        (typeof profileExtra.city === "string" ? profileExtra.city : undefined) ||
        undefined,
      storeCount:
        Number.isFinite(storeFromProfile) && storeFromProfile > 0
          ? Math.round(storeFromProfile)
          : 1,
    });

    empty.brand = { ...empty.brand, ...thin.brand };
    empty.profile = { ...empty.profile, ...thin.profile };
    empty.evolution = recomputeEvolution(empty);

    // projectId 唯一：并发/重复 ensure 时用 upsert，避免 Unique constraint 打爆页面
    const created = await this.prisma.restaurant.upsert({
      where: { projectId: project.id },
      update: {},
      create: {
        projectId: project.id,
        ownerId: project.ownerId,
        name,
        status: "active",
        profile: {
          create: {
            category: empty.profile.category,
            stage: empty.profile.stage,
            city: empty.profile.city,
            storeCount: empty.profile.storeCount,
            priceRange: empty.profile.priceRange,
          },
        },
        brand: {
          create: {
            positioning: empty.brand.positioning,
            targetCustomer: empty.brand.targetCustomer,
            confidence: empty.brand.confidence,
          },
        },
        business: { create: {} },
        capability: { create: {} },
        founder: { create: {} },
        evolution: {
          create: {
            understandingScore: empty.evolution.understandingScore,
            dataCompleteness: empty.evolution.dataCompleteness,
          },
        },
      },
    });

    const snap = await this.loadSnapshot(created.id);
    return snap ?? empty;
  }

  async loadAgentContext(input: {
    projectId: string;
    ownerId: string;
  }): Promise<AgentRestaurantContext> {
    const snapshot = await this.ensureByProject(input);
    return buildRestaurantContext(snapshot);
  }

  /**
   * Decision → DecisionRecord 关联写回（不复制完整决策正文）
   */
  async linkFromMkDecision(input: {
    projectId: string;
    ownerId: string;
    mkDecisionId: string;
    type: string;
    question: string;
    judgementSummary?: string;
  }): Promise<void> {
    const snapshot = await this.ensureByProject({
      projectId: input.projectId,
      ownerId: input.ownerId,
    });

    const factContext: Record<string, unknown> = {
      storeCount: snapshot.profile.storeCount,
      stage: snapshot.profile.stage,
      category: snapshot.profile.category,
      organizationScore: snapshot.capability.organizationScore,
      netMargin: snapshot.business.netMargin,
      riskPreference: snapshot.founder.riskPreference,
      at: new Date().toISOString(),
    };

    await this.recordDecision({
      id: `pending_${input.mkDecisionId}`,
      restaurantId: snapshot.restaurant.id,
      mkDecisionId: input.mkDecisionId,
      type: input.type || "general",
      question: clip(input.question, 500),
      context: factContext,
      chosenOption: input.judgementSummary
        ? clip(input.judgementSummary, 200)
        : undefined,
      learningGenerated: false,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 黄金场景演示数据（仅填已有字段，不扩 Schema）
   * 「一家店 · 要不要开第二家」
   */
  async seedExpansionScenarioFacts(restaurantId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.restaurantProfile.update({
        where: { restaurantId },
        data: {
          category: "湘菜",
          stage: "growth",
          storeCount: 1,
          city: "上海",
          priceRange: "60-100",
        },
      }),
      this.prisma.brandProfile.update({
        where: { restaurantId },
        data: {
          positioning: "年轻人的高性价比湘菜",
          targetCustomer: "25-35 白领",
          brandRisk: "扩张时品牌稀释",
          confidence: 0.65,
        },
      }),
      this.prisma.businessProfile.update({
        where: { restaurantId },
        data: {
          monthlyRevenue: 450000,
          grossMargin: 0.55,
          netMargin: 0.08,
        },
      }),
      this.prisma.capabilityProfile.update({
        where: { restaurantId },
        data: {
          strategyScore: 68,
          marketScore: 70,
          productScore: 75,
          financeScore: 62,
          operationScore: 60,
          organizationScore: 55,
          overallScore: 65,
          confidence: 0.6,
        },
      }),
      this.prisma.founderProfile.update({
        where: { restaurantId },
        data: {
          decisionStyle: "高速增长型",
          riskPreference: "激进",
          experience: "5年单店",
        },
      }),
    ]);

    const prior = await this.prisma.decisionRecord.findFirst({
      where: {
        restaurantId,
        type: "EXPANSION",
        question: { contains: "扩张" },
      },
    });
    if (!prior) {
      await this.recordDecision({
        id: `pending_exp_${restaurantId}`,
        restaurantId,
        type: "EXPANSION",
        question: "是否快速加盟扩张？",
        chosenOption: "开",
        actualOutcome: { result: "组织跟不上，半年不及预期" },
        learningGenerated: true,
        status: "validated",
        createdAt: new Date().toISOString(),
      });
      await this.learn({
        id: `pending_learn_${restaurantId}`,
        restaurantId,
        sourceType: "decision",
        pattern: "Expansion_Risk_Pattern",
        insight: "组织能力不足时禁止扩张；增长瓶颈常在店长体系而非市场",
        confidence: 0.75,
        appliedCount: 1,
        createdAt: new Date().toISOString(),
      });
    }

    const snap = await this.loadSnapshot(restaurantId);
    if (snap) {
      const evo = recomputeEvolution(snap);
      await this.prisma.evolutionState.update({
        where: { restaurantId },
        data: {
          understandingScore: evo.understandingScore,
          dataCompleteness: evo.dataCompleteness,
          lastEvolutionAt: new Date(),
        },
      });
    }
  }

  async proposeAndMaybeMergeDna(
    patch: DnaPatchPropose,
  ): Promise<{ accepted: boolean; completenessOverall: number }> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: patch.projectId },
    });
    const base = await this.ensureByProject({
      projectId: patch.projectId,
      ownerId: project.ownerId,
    });

    const merged = mergeDnaPatch(base, patch);
    await this.updateKnowledge({
      restaurantId: base.restaurant.id,
      type: BrainEventType.DNA_PATCH,
      payload: patch as unknown as Record<string, unknown>,
      source: patch.source,
      at: new Date().toISOString(),
    });

    if (!merged.accepted) {
      return {
        accepted: false,
        completenessOverall: base.evolution.dataCompleteness,
      };
    }

    const evo = recomputeEvolution(merged.snapshot);
    await this.prisma.$transaction([
      this.prisma.brandProfile.update({
        where: { restaurantId: base.restaurant.id },
        data: {
          positioning: merged.snapshot.brand.positioning,
          targetCustomer: merged.snapshot.brand.targetCustomer,
          consumptionScene: merged.snapshot.brand.consumptionScene,
          brandPromise: merged.snapshot.brand.brandPromise,
          competitiveAdvantage: merged.snapshot.brand.competitiveAdvantage,
          brandRisk: merged.snapshot.brand.brandRisk,
          confidence: merged.snapshot.brand.confidence,
        },
      }),
      this.prisma.businessProfile.update({
        where: { restaurantId: base.restaurant.id },
        data: { grossMargin: merged.snapshot.business.grossMargin },
      }),
      this.prisma.founderProfile.update({
        where: { restaurantId: base.restaurant.id },
        data: {
          decisionStyle: merged.snapshot.founder.decisionStyle,
          riskPreference: merged.snapshot.founder.riskPreference,
          strengthsJson: merged.snapshot.founder.strengths
            ? JSON.stringify(merged.snapshot.founder.strengths)
            : undefined,
          blindSpotsJson: merged.snapshot.founder.blindSpots
            ? JSON.stringify(merged.snapshot.founder.blindSpots)
            : undefined,
        },
      }),
      this.prisma.evolutionState.update({
        where: { restaurantId: base.restaurant.id },
        data: {
          understandingScore: evo.understandingScore,
          dataCompleteness: evo.dataCompleteness,
          lastEvolutionAt: new Date(),
        },
      }),
    ]);

    return { accepted: true, completenessOverall: evo.dataCompleteness };
  }

  async listDecisionHistory(
    restaurantId: string,
    take = 20,
  ): Promise<
    Array<{
      id: string;
      mkDecisionId: string | null;
      question: string;
      chosenOption: string | null;
      status: string;
      createdAt: Date;
    }>
  > {
    return this.prisma.decisionRecord.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        mkDecisionId: true,
        question: true,
        chosenOption: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private async loadSnapshot(
    restaurantId: string,
  ): Promise<RestaurantBrainSnapshot | null> {
    const row = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        profile: true,
        brand: true,
        business: true,
        capability: true,
        founder: true,
        evolution: true,
        decisions: { orderBy: { createdAt: "desc" }, take: 5 },
        actions: { orderBy: { createdAt: "desc" }, take: 5 },
        learnings: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!row) return null;

    const empty = createEmptyBrain({
      projectId: row.projectId,
      ownerId: row.ownerId,
      displayName: row.name,
      restaurantId: row.id,
    });

    const snapshot: RestaurantBrainSnapshot = {
      restaurant: {
        id: row.id,
        projectId: row.projectId,
        ownerId: row.ownerId,
        name: row.name,
        status: row.status as "active" | "archived" | "paused",
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      profile: row.profile
        ? {
            id: row.profile.id,
            restaurantId: row.id,
            category: row.profile.category,
            stage: row.profile.stage as RestaurantStage,
            city: row.profile.city ?? undefined,
            storeCount: row.profile.storeCount,
            priceRange: row.profile.priceRange ?? undefined,
            description: row.profile.description ?? undefined,
          }
        : empty.profile,
      brand: row.brand
        ? {
            id: row.brand.id,
            restaurantId: row.id,
            positioning: row.brand.positioning ?? undefined,
            targetCustomer: row.brand.targetCustomer ?? undefined,
            consumptionScene: row.brand.consumptionScene ?? undefined,
            brandPromise: row.brand.brandPromise ?? undefined,
            competitiveAdvantage: row.brand.competitiveAdvantage ?? undefined,
            brandRisk: row.brand.brandRisk ?? undefined,
            confidence: row.brand.confidence,
          }
        : empty.brand,
      business: row.business
        ? {
            id: row.business.id,
            restaurantId: row.id,
            monthlyRevenue: row.business.monthlyRevenue ?? undefined,
            grossMargin: row.business.grossMargin ?? undefined,
            netMargin: row.business.netMargin ?? undefined,
            averageTicket: row.business.averageTicket ?? undefined,
            dailyOrders: row.business.dailyOrders ?? undefined,
            laborRatio: row.business.laborRatio ?? undefined,
            rentRatio: row.business.rentRatio ?? undefined,
            businessModel: row.business.businessModel ?? undefined,
          }
        : empty.business,
      capability: row.capability
        ? {
            id: row.capability.id,
            restaurantId: row.id,
            strategyScore: row.capability.strategyScore,
            marketScore: row.capability.marketScore,
            productScore: row.capability.productScore,
            financeScore: row.capability.financeScore,
            operationScore: row.capability.operationScore,
            organizationScore: row.capability.organizationScore,
            overallScore: row.capability.overallScore,
            confidence: row.capability.confidence,
          }
        : empty.capability,
      founder: row.founder
        ? {
            id: row.founder.id,
            restaurantId: row.id,
            experience: row.founder.experience ?? undefined,
            decisionStyle: row.founder.decisionStyle ?? undefined,
            riskPreference: row.founder.riskPreference ?? undefined,
            strengths: parseJson(row.founder.strengthsJson, undefined),
            weaknesses: parseJson(row.founder.weaknessesJson, undefined),
            blindSpots: parseJson(row.founder.blindSpotsJson, undefined),
            growthTrend: parseJson(row.founder.growthTrendJson, undefined),
          }
        : empty.founder,
      recentDecisions: row.decisions.map((d) => ({
        id: d.id,
        restaurantId: row.id,
        mkDecisionId: d.mkDecisionId ?? undefined,
        type: d.type,
        question: d.question,
        context: parseJson(d.contextJson, undefined),
        options: parseJson(d.optionsJson, undefined),
        chosenOption: d.chosenOption ?? undefined,
        aiAssessment: parseJson(d.aiAssessmentJson, undefined),
        councilResult: parseJson(d.councilResultJson, undefined),
        expectedOutcome: parseJson(d.expectedOutcomeJson, undefined),
        actualOutcome: parseJson(d.actualOutcomeJson, undefined),
        learningGenerated: d.learningGenerated,
        status: d.status as DecisionRecord["status"],
        createdAt: d.createdAt.toISOString(),
      })),
      recentActions: row.actions.map((a) => ({
        id: a.id,
        restaurantId: row.id,
        decisionId: a.decisionId ?? undefined,
        action: a.action,
        owner: a.owner ?? undefined,
        deadline: a.deadline?.toISOString(),
        status: a.status as
          | "pending"
          | "doing"
          | "done"
          | "blocked"
          | "cancelled",
        result: parseJson(a.resultJson, undefined),
        createdAt: a.createdAt.toISOString(),
      })),
      recentLearnings: row.learnings.map((l) => ({
        id: l.id,
        restaurantId: row.id,
        sourceType: l.sourceType,
        sourceId: l.sourceId ?? undefined,
        pattern: l.pattern,
        insight: l.insight,
        confidence: l.confidence,
        appliedCount: l.appliedCount,
        createdAt: l.createdAt.toISOString(),
      })),
      evolution: row.evolution
        ? {
            id: row.evolution.id,
            restaurantId: row.id,
            understandingScore: row.evolution.understandingScore,
            dataCompleteness: row.evolution.dataCompleteness,
            decisionCount: row.evolution.decisionCount,
            learningCount: row.evolution.learningCount,
            actionCount: row.evolution.actionCount,
            lastEvolutionAt: row.evolution.lastEvolutionAt?.toISOString(),
          }
        : empty.evolution,
    };

    snapshot.evolution = recomputeEvolution(snapshot);
    return snapshot;
  }
}

export function createRestaurantBrainService(
  prisma: PrismaClient,
): PrismaRestaurantBrainService {
  return new PrismaRestaurantBrainService(prisma);
}

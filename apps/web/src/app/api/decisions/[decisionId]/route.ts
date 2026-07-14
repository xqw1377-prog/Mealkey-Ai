/**
 * 决策反馈 API
 *
 * POST /api/decisions/:decisionId
 * 需要认证
 * Body: { score: number, result: string, correct: string[], incorrect: string[], lessons: string[] }
 *
 * 提交决策执行结果，触发学习引擎。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { LearningEngine } from "@mealkey/core";

export async function POST(
  request: Request,
  { params }: { params: { decisionId: string } }
) {
  try {
    const authUser = await requireAuth();

    const body = (await request.json()) as {
      score: number;
      result: string;
      correct?: string[];
      incorrect?: string[];
      lessons?: string[];
    };

    if (typeof body.score !== "number" || body.score < 0 || body.score > 1) {
      return NextResponse.json({ error: "评分必须在 0-1 之间" }, { status: 400 });
    }

    // 查找决策并验证所有权
    const decision = await prisma.decision.findFirst({
      where: { id: params.decisionId, owner: { userId: authUser.id } },
    });

    if (!decision) {
      return NextResponse.json({ error: "决策不存在" }, { status: 404 });
    }

    // 更新决策结果
    await prisma.decision.update({
      where: { id: params.decisionId },
      data: {
        outcome: JSON.stringify({ result: body.result, score: body.score }),
        learning: body.lessons ? JSON.stringify({ lessons: body.lessons }) : null,
      },
    });

    // 触发学习引擎
    const mkDecision = {
      id: decision.id,
      problem: decision.problem,
      observation: decision.observation,
      diagnosis: decision.diagnosis,
      judgement: decision.judgement,
      strategy: decision.strategy,
      action: decision.action,
      confidence: decision.confidence,
      evidence: (() => { try { return JSON.parse(decision.evidence); } catch { return []; } })(),
    };

    const owner = await prisma.owner.findUnique({ where: { userId: authUser.id } });
    if (owner) {
      const learningEngine = new LearningEngine({
        saveMemory: async (ownerId, memory) => {
          const existing = await prisma.memory.findFirst({
            where: {
              ownerId,
              projectId: memory.projectId ?? null,
              key: memory.key,
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.memory.update({
              where: { id: existing.id },
              data: {
                content: JSON.stringify(memory.value),
                source: memory.source,
                importance: Math.round(memory.importance * 100),
                projectId: memory.projectId ?? null,
              },
            });
            return;
          }

          await prisma.memory.create({
            data: {
              ownerId,
              projectId: memory.projectId ?? null,
              type: memory.layer.toUpperCase(),
              key: memory.key,
              content: JSON.stringify(memory.value),
              source: memory.source,
              importance: Math.round(memory.importance * 100),
            },
          });
        },
      });

      await learningEngine.learnFromOutcome(owner.id, mkDecision, {
        decisionId: decision.id,
        result: body.result,
        score: body.score,
        correct: body.correct ?? [],
        incorrect: body.incorrect ?? [],
        lessons: body.lessons ?? [],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "提交反馈失败" }, { status: 500 });
  }
}

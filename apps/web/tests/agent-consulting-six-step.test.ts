/**
 * M-MKT / M-BIZ / M-ED 六步咨询路径冒烟
 */
import { describe, expect, it } from "vitest";
import {
  SixStepId,
  answerIntake,
  createAgentConsultingProject,
  resolveSixStepNext,
  confirmResearchPack,
  acceptRoadmap,
} from "../../../packages/agents/src/consulting-os";
import { mmktBlueprint } from "../../../packages/agents/src/m-mkt/consulting";
import { mbizBlueprint } from "../../../packages/agents/src/m-biz/consulting";
import { medBlueprint } from "../../../packages/agents/src/m-ed/consulting";

const blueprints = [
  { name: "m-mkt", bp: mmktBlueprint },
  { name: "m-biz", bp: mbizBlueprint },
  { name: "m-ed", bp: medBlueprint },
] as const;

/**
 * 给项目注入 basics + adaptiveFollowups，使 resolveSixStepNext 通过 INTAKE 门禁
 */
function seedIntakeAssets(project: ReturnType<typeof createAgentConsultingProject>) {
  return {
    ...project,
    assets: {
      ...project.assets,
      basics: {
        artifactId: "basics_seeded",
        status: "complete" as const,
        values: { city: "长沙", name: "测试店", category: "湘菜", priority: "利润" },
        missingMust: [],
        missingShould: [],
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      adaptiveFollowups: {
        sessionId: "afu_seeded",
        status: "ready_to_compile" as const,
        questions: [],
        answers: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

describe.each(blueprints)("$name six-step journey", ({ bp }) => {
  it("intake → research → advisors → vote → report → roadmap → done", () => {
    let project = createAgentConsultingProject(bp.agentId, "proj_demo");
    project = seedIntakeAssets(project);
    expect(resolveSixStepNext(project, bp).step).toBe(SixStepId.INTAKE);

    for (const q of bp.intakeQuestions) {
      project = answerIntake(project, bp, q.id, q.choices[0]!.text);
    }
    expect(project.intakeStatus).toBe("complete");

    const research = bp.buildResearch(project.intakeAnswers, {
      city: "长沙",
      name: "测试店",
    });
    expect(research.headline.length).toBeGreaterThan(5);
    const confirmed = confirmResearchPack(research);

    const advisors = bp.buildAdvisors(project.intakeAnswers, confirmed);
    expect(advisors.strategies.length).toBeGreaterThanOrEqual(3);

    // 确认调研后应停在顾问步（尚未开会）
    project = {
      ...project,
      assets: { ...project.assets, research: confirmed, advisors },
      updatedAt: new Date().toISOString(),
    };
    const afterAdvisors = resolveSixStepNext(project, bp);
    expect(afterAdvisors.step).toBe(SixStepId.ADVISORS);
    expect(afterAdvisors.actionId).toBe("warroom.open");

    let room = bp.buildWarRoom(advisors);
    expect(room.status).toBe("awaiting_user");
    expect(room.decisionCard?.options.length).toBeGreaterThanOrEqual(3);
    expect(room.turns.some((t) => t.agendaPhase === "crossfire")).toBe(true);
    expect(room.currentAgenda).toBe("founder_vote");

    room = bp.applyVote(room, advisors, "blend", "综合落地");
    expect(room.status).toBe("agreed");
    expect(room.consensusOneLiner).toBeTruthy();
    expect(room.currentAgenda).toBe("resolution");

    const report = bp.buildReportMarkdown({
      projectName: "测试店",
      city: "长沙",
      answers: project.intakeAnswers,
      research: confirmed,
      advisors,
      warRoom: room,
    });
    expect(report).toContain(bp.reportTitle);
    expect(report).toContain(room.consensusOneLiner!);
    // 报告应用中文席位名，不用 advisorId 当标题
    for (const a of bp.advisors) {
      expect(report).toContain(a.name);
    }

    const roadmap = bp.buildRoadmap(
      room.consensusOneLiner!,
      project.intakeAnswers,
    );
    expect(roadmap.milestones.length).toBeGreaterThanOrEqual(3);
    const accepted = acceptRoadmap(roadmap);

    project = {
      ...project,
      assets: {
        ...project.assets,
        research: confirmed,
        advisors,
        warRoom: room,
        strategyReportMarkdown: report,
        strategyConfirmedAt: new Date().toISOString(),
        executionRoadmap: accepted,
      },
      updatedAt: new Date().toISOString(),
    };
    expect(resolveSixStepNext(project, bp).actionId).toBe("done");
  });
});

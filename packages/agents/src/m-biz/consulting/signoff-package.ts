/**
 * M-BIZ 签字交付包 — L5 就绪校验 + Markdown 存档
 */
import {
  evaluateSeatSignOffReadiness,
  type SeatSignOffCheck,
  type SeatSignOffReadiness,
} from "../../consulting-os/delivery-gates";
import type { AgentConsultingProject } from "../../consulting-os/types";
import type { ModeContract } from "./types";

export type MbizSignOffCheck = SeatSignOffCheck;
export type MbizSignOffReadiness = SeatSignOffReadiness;

export function evaluateMbizSignOffReadiness(
  project: AgentConsultingProject,
): MbizSignOffReadiness {
  const contract = project.assets.modeContract as ModeContract | undefined;
  const pack = project.assets.executionRoadmap?.modePack;
  return evaluateSeatSignOffReadiness(project, {
    contractFrozen: contract?.status === "frozen",
    packReady: Boolean(pack?.wallCard || contract?.wallCard),
    contractLabel: "模式主航道合同已冻结",
    packLabel: "模式作战卡已生成",
  });
}

export function signMbizStrategyReport(
  project: AgentConsultingProject,
  input: { signedBy: string; note?: string },
): AgentConsultingProject {
  const signedBy = input.signedBy.trim();
  if (!signedBy) throw new Error("请填写签字人");
  const readiness = evaluateMbizSignOffReadiness(project);
  if (!readiness.ok) {
    throw new Error(`签字前未就绪：${readiness.blockers.join("；")}`);
  }
  return {
    ...project,
    assets: {
      ...project.assets,
      signOffStatus: "signed",
      signedBy,
      signedAt: new Date().toISOString(),
      signOffNote: input.note?.trim() || undefined,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildMbizSignOffPackageMarkdown(
  project: AgentConsultingProject,
  opts?: { preview?: boolean },
): string {
  const contract = project.assets.modeContract as ModeContract | undefined;
  const decision = project.assets.decisionArtifact;
  const readiness = evaluateMbizSignOffReadiness(project);
  const signed = project.assets.signOffStatus === "signed";
  const isPreview = Boolean(opts?.preview) || !signed;
  const report = project.assets.strategyReportMarkdown || "";
  const pack = project.assets.executionRoadmap?.modePack;

  return [
    `# 商业模式主航道 · 签字交付包${isPreview ? "（草稿预览）" : ""}`,
    "",
    isPreview
      ? "> ⚠️ 本文件为草稿预览，非正式签字存档。正式交付请先完成创始人签字后再导出。"
      : "> ✓ 本文件为签字后正式存档版本。",
    "",
    `**咨询 ID：** ${project.consultingId}`,
    `**项目 ID：** ${project.projectId}`,
    `**打包时间：** ${new Date().toISOString()}`,
    `**签字状态：** ${project.assets.signOffStatus || "draft"}`,
    project.assets.signedBy ? `**签字人：** ${project.assets.signedBy}` : "",
    project.assets.signedAt ? `**签字时间：** ${project.assets.signedAt}` : "",
    project.assets.signOffNote
      ? `**签字备注：** ${project.assets.signOffNote}`
      : "",
    "",
    "---",
    "",
    "## 0. 交付就绪清单",
    "",
    ...readiness.checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.label}`),
    "",
    readiness.ok ? "全部就绪。" : `未就绪项：${readiness.blockers.join("；")}`,
    "",
    "---",
    "",
    "## 1. Mode Contract（模式主航道合同）",
    "",
    contract
      ? [
          `状态：${contract.status}`,
          contract.frozenAt ? `冻结时间：${contract.frozenAt}` : "",
          `拍板席：${contract.seatLabel || "—"}`,
          contract.priorityAxis ? `优先轴：${contract.priorityAxis}` : "",
          "",
          `**一句话：** ${contract.oneLiner}`,
          `**北极星：** ${contract.northStar}`,
          "",
          `**取舍：** ${contract.tradeoffAccepted}`,
          "",
          "### 否决条件",
          ...contract.killCriteria.map((k) => `- ${k}`),
          "",
          "### 本周动作",
          ...contract.mondayMoves.map((m) => `- ${m}`),
          "",
          "### 证据引用",
          ...(contract.evidenceUsed.length
            ? contract.evidenceUsed.map((e) => `- ${e}`)
            : ["- （无）"]),
        ]
          .filter(Boolean)
          .join("\n")
      : "（无合同）",
    "",
    "## 2. 决策包摘要",
    "",
    decision
      ? [
          `治理问题：${decision.governingQuestion}`,
          `建议：${decision.recommendation}`,
          `取舍：${decision.tradeoffAccepted}`,
        ].join("\n")
      : "（无）",
    "",
    "## 3. 模式作战卡",
    "",
    pack?.markdown || contract?.modePackMarkdown || contract?.wallCard || "（无）",
    "",
    "---",
    "",
    "## 4. 策略报告正文",
    "",
    report || "（尚未生成）",
    "",
  ].join("\n");
}

export function mbizSignOffPackageFilename(
  project: AgentConsultingProject,
  opts?: { preview?: boolean },
): string {
  const date = new Date().toISOString().slice(0, 10);
  const tag =
    opts?.preview || project.assets.signOffStatus !== "signed"
      ? "草稿"
      : "正式";
  return `商业模式主航道_签字交付包_${tag}_${date}.md`;
}

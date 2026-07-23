/**
 * Report Service — 报告业务逻辑
 *
 * 对齐 Kernel Schema V1: Project.ownerId → Owner.id
 */
import type { PrismaClient, Prisma } from "@/generated/prisma";

const reportInclude = {
  project: {
    select: { id: true, name: true },
  },
} satisfies Prisma.ReportInclude;

type ReportRecord = Prisma.ReportGetPayload<{
  include: typeof reportInclude;
}>;

export type ReportResponse = {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function parseJsonField<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toReportResponse(report: ReportRecord): ReportResponse {
  return {
    id: report.id,
    projectId: report.projectId,
    projectName: report.project.name,
    type: report.type,
    title: report.title,
    summary: report.summary,
    content: parseJsonField(report.content),
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

async function findOwnerId(prisma: PrismaClient, userId: string): Promise<string | null> {
  const owner = await prisma.owner.findUnique({ where: { userId }, select: { id: true } });
  return owner?.id ?? null;
}

export async function getReport(
  prisma: PrismaClient,
  reportId: string,
  userId: string
): Promise<ReportResponse | null> {
  const ownerId = await findOwnerId(prisma, userId);
  if (!ownerId) return null;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      project: { ownerId },
    },
    include: reportInclude,
  });
  return report ? toReportResponse(report) : null;
}

export async function listReports(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<ReportResponse[]> {
  const ownerId = await findOwnerId(prisma, userId);
  if (!ownerId) return [];

  const reports = await prisma.report.findMany({
    where: {
      projectId,
      project: { ownerId },
    },
    orderBy: { createdAt: "desc" },
    include: reportInclude,
  });
  return reports.map(toReportResponse);
}

export async function createReport(
  prisma: PrismaClient,
  data: {
    projectId: string;
    type: string;
    title: string;
    summary?: string;
    content?: Record<string, unknown>;
    status?: string;
  },
  userId: string
): Promise<ReportResponse | null> {
  const ownerId = await findOwnerId(prisma, userId);
  if (!ownerId) return null;

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, ownerId },
  });
  if (!project) return null;

  const report = await prisma.report.create({
    data: {
      projectId: data.projectId,
      type: data.type,
      title: data.title,
      summary: data.summary ?? null,
      content: data.content ? JSON.stringify(data.content) : null,
      status: data.status ?? "draft",
    },
    include: reportInclude,
  });
  return toReportResponse(report);
}

export async function deleteReport(
  prisma: PrismaClient,
  reportId: string,
  userId: string
): Promise<boolean> {
  const ownerId = await findOwnerId(prisma, userId);
  if (!ownerId) return false;

  const report = await prisma.report.findFirst({
    where: { id: reportId, project: { ownerId } },
  });
  if (!report) return false;

  await prisma.report.delete({ where: { id: reportId } });
  return true;
}

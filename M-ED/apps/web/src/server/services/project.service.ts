/**
 * Project Service — 项目业务逻辑
 *
 * 对齐 Kernel Schema V1:
 * - Project.ownerId → Owner.id
 * - Project 新增 target, budget 字段
 * - 移除 areaModel, investment（合并到 profile JSON）
 */
import type { PrismaClient, Prisma } from "@/generated/prisma";
import { parseJsonField } from "@/lib/prisma";

const projectInclude = {
  reports: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
  owner: {
    select: { id: true, name: true, experience: true, overallScore: true },
  },
} satisfies Prisma.ProjectInclude;

type ProjectRecord = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

export type ProjectResponse = {
  id: string;
  name: string;
  status: string;
  stage: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  target: string | null;
  budget: number | null;
  profile: Record<string, unknown> | null;
  healthScore: number | null;
  confidence: number | null;
  ownerName: string | null;
  reports: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    status: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

function toProjectResponse(project: ProjectRecord): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    stage: project.stage,
    city: project.city,
    district: project.district,
    category: project.category,
    target: project.target,
    budget: project.budget,
    profile: parseJsonField(project.profile),
    healthScore: project.healthScore,
    confidence: project.confidence,
    ownerName: project.owner?.name ?? null,
    reports: project.reports.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      summary: r.summary,
      status: r.status,
      createdAt: r.createdAt,
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * 查找或创建 Owner
 */
async function ensureOwner(prisma: PrismaClient, userId: string) {
  let owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    owner = await prisma.owner.create({
      data: {
        userId,
        name: user?.name,
        email: user?.email,
      },
    });
  }
  return owner;
}

export async function getProject(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<ProjectResponse | null> {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return null;

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: owner.id },
    include: projectInclude,
  });
  return project ? toProjectResponse(project) : null;
}

export async function listProjects(
  prisma: PrismaClient,
  userId: string
): Promise<ProjectResponse[]> {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return [];

  const projects = await prisma.project.findMany({
    where: { ownerId: owner.id, status: "active" },
    orderBy: { updatedAt: "desc" },
    include: projectInclude,
  });
  return projects.map(toProjectResponse);
}

export async function createProject(
  prisma: PrismaClient,
  data: {
    name: string;
    stage?: string;
    city?: string;
    district?: string;
    category?: string;
    target?: string;
    budget?: number;
    profile?: Record<string, unknown>;
  },
  userId: string
): Promise<ProjectResponse> {
  const owner = await ensureOwner(prisma, userId);

  const project = await prisma.project.create({
    data: {
      ownerId: owner.id,
      name: data.name,
      stage: data.stage ?? "idea",
      city: data.city,
      district: data.district,
      category: data.category,
      target: data.target,
      budget: data.budget,
      profile: data.profile ? JSON.stringify(data.profile) : null,
    },
    include: projectInclude,
  });
  return toProjectResponse(project);
}

export async function updateProject(
  prisma: PrismaClient,
  projectId: string,
  data: {
    name?: string;
    stage?: string;
    city?: string;
    district?: string;
    category?: string;
    target?: string;
    budget?: number;
    status?: string;
    profile?: Record<string, unknown>;
  },
  userId: string
): Promise<ProjectResponse | null> {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return null;

  const existing = await prisma.project.findFirst({
    where: { id: projectId, ownerId: owner.id },
  });
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.district !== undefined) updateData.district = data.district;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.target !== undefined) updateData.target = data.target;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.profile !== undefined) updateData.profile = JSON.stringify(data.profile);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: projectInclude,
  });
  return toProjectResponse(project);
}

export async function deleteProject(
  prisma: PrismaClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return false;

  const result = await prisma.project.deleteMany({
    where: { id: projectId, ownerId: owner.id },
  });
  return result.count > 0;
}

/**
 * 品牌切换/修改后，统一刷新依赖当前品牌的查询与本地 store。
 */
import type { trpc } from "@/lib/trpc";
import type { ProjectItem } from "@/types/operating";
import { useProjectStore } from "@/stores/projectStore";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

export async function invalidateBrandDependentQueries(
  utils: TrpcUtils,
  projectId: string,
) {
  // 先 reset 咨询卷宗缓存，避免 invalidate 后短暂继续展示旧品牌正文
  await Promise.all([
    utils.mPntConsulting.getProject.reset({ projectId }),
    utils.mMktConsulting.getProject.reset({ projectId }),
    utils.mBizConsulting.getProject.reset({ projectId }),
    utils.mEdConsulting.getProject.reset({ projectId }),
  ]);
  await Promise.all([
    utils.project.listBrands.invalidate({ projectId }),
    utils.project.getById.invalidate({ id: projectId }),
    utils.project.list.invalidate(),
    utils.dashboard.getHome.invalidate(),
    utils.dashboard.getProjectOverview.invalidate({ projectId }),
    utils.dashboard.getAdvisorWorkspace.invalidate({ projectId }),
    utils.dashboard.getOwnerPortrait.invalidate(),
    utils.agent.positioningMeta.invalidate(),
    utils.agent.positioningReports.invalidate({ projectId }),
    utils.founder.getCapabilityStatus.invalidate({ projectId }),
    utils.founder.getMemorySnapshot.invalidate({ projectId }),
    utils.founder.getBriefHint.invalidate({ projectId }),
    utils.agent.positioningContext.invalidate({ projectId }),
    utils.agent.latestPositioning.invalidate({ projectId }),
    utils.agent.positioningHistory.invalidate({ projectId }),
    utils.mPntConsulting.getProject.invalidate({ projectId }),
    utils.mPntConsulting.meta.invalidate(),
    utils.mMktConsulting.getProject.invalidate({ projectId }),
    utils.mBizConsulting.getProject.invalidate({ projectId }),
    utils.mEdConsulting.getProject.invalidate({ projectId }),
    utils.agent.marketContext.invalidate({ projectId }),
    utils.agent.latestMarket.invalidate({ projectId }),
    utils.agent.equityContext.invalidate({ projectId }),
    utils.agent.latestEquity.invalidate({ projectId }),
    utils.agent.businessContext.invalidate({ projectId }),
    utils.decisionArchive.list.invalidate({ projectId }),
    utils.decisionArchive.stats.invalidate({ projectId }),
    utils.validationOs.listActive.invalidate({ projectId }),
  ]);
}

/** 用最新 getById 结果回写 zustand，避免壳层仍显示旧品牌名 */
export async function syncProjectStoreAfterBrandChange(
  utils: TrpcUtils,
  projectId: string,
) {
  const project = await utils.project.getById.fetch({ id: projectId });
  if (!project) return;
  const brandName =
    (project as { brandName?: string | null }).brandName ||
    (project.profile as { brandName?: string } | null)?.brandName ||
    project.name;
  const item: ProjectItem = {
    id: project.id,
    // 企业名保持 Project.name；品牌名写在 profile，避免今日页和企业逻辑被品牌名污染
    name: project.name,
    status: project.status,
    stage: project.stage,
    city: project.city,
    district: project.district,
    category: project.category,
    target: project.target,
    budget: project.budget,
    profile: {
      ...((project.profile || null) as ProjectItem["profile"]),
      brandName,
    } as ProjectItem["profile"],
    healthScore: project.healthScore,
    confidence: project.confidence,
    ownerName: project.ownerName,
    reports: (project.reports || []) as ProjectItem["reports"],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  useProjectStore.getState().setCurrentProject(item);
}

export async function refreshBrandAcrossApp(
  utils: TrpcUtils,
  projectId: string,
) {
  await invalidateBrandDependentQueries(utils, projectId);
  await syncProjectStoreAfterBrandChange(utils, projectId);
}

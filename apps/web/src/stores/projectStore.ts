"use client";

import { create } from "zustand";
import type { ProjectItem } from "@/types/operating";

type ProjectStore = {
  /** 当前激活的项目（页面间共享） */
  currentProject: ProjectItem | null;
  currentProjectId: string | null;

  /** 设置当前项目 */
  setCurrentProject: (project: ProjectItem) => void;
  setCurrentProjectId: (id: string | null) => void;

  /** 更新项目字段（用于 Agent 输出回写） */
  updateProjectField: <K extends keyof ProjectItem>(key: K, value: ProjectItem[K]) => void;

  /** 更新 profile 内的字段 */
  updateProfileField: (key: string, value: unknown) => void;

  /** 重置 */
  reset: () => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  currentProjectId: null,

  setCurrentProject: (project) =>
    set({
      currentProject: project,
      currentProjectId: project.id,
    }),

  setCurrentProjectId: (id) =>
    set({ currentProjectId: id }),

  updateProjectField: (key, value) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: { ...state.currentProject, [key]: value },
      };
    }),

  updateProfileField: (key, value) =>
    set((state) => {
      if (!state.currentProject) return state;
      const profile = { ...(state.currentProject.profile || {}), [key]: value };
      return {
        currentProject: { ...state.currentProject, profile },
      };
    }),

  reset: () => set({ currentProject: null, currentProjectId: null }),
}));

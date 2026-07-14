/**
 * 判断模型注册表
 */

import type { JudgmentFramework } from "../types";
import { RESTAURANT_SUCCESS_FRAMEWORK } from "./restaurant-success";
import { FEASIBILITY_FRAMEWORK } from "./feasibility";
import { BRAND_POSITIONING_FRAMEWORK } from "./brand-positioning";

// ─── 模型注册表 ───

const frameworks = new Map<string, JudgmentFramework>();

// 注册内置模型
frameworks.set(RESTAURANT_SUCCESS_FRAMEWORK.id, RESTAURANT_SUCCESS_FRAMEWORK);
frameworks.set(FEASIBILITY_FRAMEWORK.id, FEASIBILITY_FRAMEWORK);
frameworks.set(BRAND_POSITIONING_FRAMEWORK.id, BRAND_POSITIONING_FRAMEWORK);

/**
 * 获取判断框架
 */
export function getFramework(id: string): JudgmentFramework | undefined {
  return frameworks.get(id);
}

/**
 * 获取所有框架
 */
export function getAllFrameworks(): JudgmentFramework[] {
  return Array.from(frameworks.values());
}

/**
 * 按分类获取框架
 */
export function getFrameworksByCategory(category: string): JudgmentFramework[] {
  return Array.from(frameworks.values()).filter(f => f.category === category);
}

/**
 * 根据用户问题推荐框架
 */
export function recommendFramework(
  userMessage: string,
  projectInfo?: Record<string, unknown>
): JudgmentFramework {
  const message = userMessage.toLowerCase();

  // 新项目可行性评估
  if (
    message.includes("想开") ||
    message.includes("准备开") ||
    message.includes("想做") ||
    message.includes("可行性")
  ) {
    return frameworks.get("restaurant-success-5vars")!;
  }

  // 快速可行性检查
  if (
    message.includes("能不能做") ||
    message.includes("值得做吗") ||
    message.includes("风险大吗")
  ) {
    return frameworks.get("feasibility-3questions")!;
  }

  // 品牌定位
  if (
    message.includes("品牌") ||
    message.includes("定位") ||
    message.includes("差异化")
  ) {
    return frameworks.get("brand-positioning-4layers")!;
  }

  // 默认使用餐饮成功五变量
  return frameworks.get("restaurant-success-5vars")!;
}

// 导出模型
export { RESTAURANT_SUCCESS_FRAMEWORK } from "./restaurant-success";
export { FEASIBILITY_FRAMEWORK } from "./feasibility";
export { BRAND_POSITIONING_FRAMEWORK } from "./brand-positioning";

import { Compass, Layers, Sparkles, Target, TrendingUp } from "lucide-react";
import type { ShellNavItem } from "./BottomNav";
import type { NavSection } from "@/types/operating";

/**
 * Founder OS V2 一级导航（决策闭环）
 * 今日（决策 HQ）→ 能力（含咨询）→ 决策（decision-room）→ 行动（打卡）→ 成长
 */
export function createShellNavItems(defaultProjectId?: string | null): ShellNavItem[] {
  const hasWorld = Boolean(defaultProjectId);

  return [
    { label: "今日", href: "/dashboard", section: "today", icon: Compass },
    {
      label: "能力",
      href: hasWorld ? `/projects/${defaultProjectId}/capability` : "/capability",
      section: "capability",
      icon: Layers,
      disabled: !hasWorld,
      disabledHint: "先建立企业",
    },
    {
      label: "决策",
      href: hasWorld
        ? `/projects/${defaultProjectId}/decision-room`
        : "/projects",
      section: "meeting",
      icon: Sparkles,
      disabled: !hasWorld,
      disabledHint: "先建立企业",
    },
    {
      label: "行动",
      href: hasWorld ? `/projects/${defaultProjectId}/decisions` : "/projects",
      section: "action",
      icon: Target,
      disabled: !hasWorld,
      disabledHint: "先建立企业",
    },
    {
      label: "成长",
      href: hasWorld
        ? `/projects/${defaultProjectId}/runtime?tab=growth`
        : "/profile",
      section: "growth",
      icon: TrendingUp,
      disabled: !hasWorld,
      disabledHint: "先建立企业",
    },
  ];
}

function normalizeSection(section: NavSection): NavSection {
  if (section === "world") return "capability";
  if (section === "decision") return "action";
  if (section === "brain") return "growth";
  return section;
}

export function detectShellSection(pathname: string): NavSection {
  if (pathname.startsWith("/dashboard")) return "today";
  if (pathname.startsWith("/capability")) return "capability";
  // 管理平台有独立壳，不占用老板端「成长」导航高亮
  if (pathname.startsWith("/platform")) return "today";
  if (pathname.startsWith("/projects/") && pathname.includes("/capability")) {
    return "capability";
  }
  if (pathname.startsWith("/projects/") && pathname.includes("/restaurant")) {
    return "capability";
  }
  if (pathname.startsWith("/projects/") && pathname.includes("/mission")) return "capability";
  // 顾问咨询 = 能力（可另设咨询品牌），不与今日决策抢主导航高亮
  if (pathname.startsWith("/projects/") && pathname.includes("/advisor")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/decision-room")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/decision-case")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/positioning")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/market")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/equity")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/business")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/decisions")) return "action";
  // 成长 Tab 深链到 Runtime·成长；其余 Runtime 子流程也归成长（流程权入口）
  if (pathname.startsWith("/projects/") && pathname.includes("/runtime")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/report")) return "action";
  // 我的餐厅 = Restaurant Brain 读模型，归成长（认知沉淀）
  if (pathname.startsWith("/projects/") && pathname.includes("/restaurant")) {
    return "growth";
  }

  if (pathname.startsWith("/projects/") && pathname.includes("/score")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/detail")) return "capability";
  if (pathname.startsWith("/projects/") && pathname.includes("/knowledge")) return "growth";
  if (pathname.startsWith("/projects")) return "capability";
  if (pathname.startsWith("/knowledge")) return "growth";
  if (pathname.startsWith("/advisor")) return "capability";
  if (pathname.startsWith("/report")) return "action";
  if (pathname.startsWith("/score")) return "capability";
  if (pathname.startsWith("/reports/")) return "action";
  if (pathname.startsWith("/profile")) return "growth";
  if (pathname.includes("/settings")) return "growth";
  if (pathname.startsWith("/billing")) return "growth";
  return "today";
}

type ShellContext = {
  contextHref: string | null;
  contextLabel: string | null;
};

function resolveShellContext(pathname: string, projectId: string | null): ShellContext {
  if (!projectId) {
    if (pathname.startsWith("/projects") || pathname.startsWith("/profile")) {
      return { contextHref: "/dashboard", contextLabel: "回到今日" };
    }
    return { contextHref: null, contextLabel: null };
  }

  if (/^\/projects\/[^/]+\/advisor$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/capability`, contextLabel: "返回能力" };
  }

  if (/^\/projects\/[^/]+\/(decision-room|decision-case)$/.test(pathname)) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  if (/^\/projects\/[^/]+\/decisions$/.test(pathname)) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  if (/^\/projects\/[^/]+\/runtime$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/capability`, contextLabel: "返回能力" };
  }

  if (/^\/projects\/[^/]+\/capability$/.test(pathname)) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  if (/^\/projects\/[^/]+\/restaurant$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}`, contextLabel: "回企业" };
  }

  if (/^\/projects\/[^/]+\/(report|score|positioning|knowledge|equity|market|business|runtime|restaurant)$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/capability`, contextLabel: "返回能力" };
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/capability`, contextLabel: "进入能力" };
  }

  if (pathname.startsWith("/platform") || pathname.startsWith("/profile") || pathname.startsWith("/billing")) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  return { contextHref: null, contextLabel: null };
}

type ShellNavigation = ShellContext & {
  section: NavSection;
};

export function resolveShellNavigation(pathname: string, projectId: string | null): ShellNavigation {
  return {
    section: normalizeSection(detectShellSection(pathname)),
    ...resolveShellContext(pathname, projectId),
  };
}

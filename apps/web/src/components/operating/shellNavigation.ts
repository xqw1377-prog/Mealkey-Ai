import { MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import type { ShellNavItem } from "./BottomNav";
import type { NavSection } from "@/types/operating";

/**
 * Mobile Agent Phase 1 一级导航（冻结：说/给/看为主，禁五 Tab 功能墙）
 * 对话（Agent）→ 拍板 → 我的
 * 雷达/能力沉到 Agent 内链与「我的」，不占底栏。
 */
export function createShellNavItems(defaultProjectId?: string | null): ShellNavItem[] {
  const hasWorld = Boolean(defaultProjectId);

  return [
    {
      label: "对话",
      // 无企业时也进 dashboard：空态会一键建店并直达 Agent
      href: hasWorld ? `/projects/${defaultProjectId}/agent` : "/dashboard",
      section: "today",
      icon: MessageCircle,
      disabled: false,
      disabledHint: "先建立企业",
    },
    {
      label: "拍板",
      href: hasWorld
        ? `/projects/${defaultProjectId}/decision-room`
        : "/projects",
      section: "meeting",
      icon: Sparkles,
      disabled: !hasWorld,
      disabledHint: "先建立企业",
    },
    {
      label: "我的",
      href: "/profile",
      section: "growth",
      icon: TrendingUp,
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
  // 经营动态不占底栏高亮（避免人在雷达却亮「对话」）
  if (pathname.startsWith("/dashboard")) return "capability";
  // Mobile Agent = 主对话入口
  if (pathname.startsWith("/projects/") && pathname.includes("/agent")) return "today";
  if (pathname.startsWith("/capability")) return "growth";
  if (pathname.startsWith("/platform")) return "today";
  if (pathname.startsWith("/projects/") && pathname.includes("/capability")) {
    return "growth";
  }
  if (pathname.startsWith("/projects/") && pathname.includes("/restaurant")) {
    return "growth";
  }
  if (pathname.startsWith("/projects/") && pathname.includes("/mission")) return "today";
  if (pathname.startsWith("/projects/") && pathname.includes("/advisor")) return "today";
  if (pathname.startsWith("/projects/") && pathname.includes("/decision-room")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/decision-case")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/positioning")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/market")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/equity")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/business")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/decisions")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/runtime")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/report")) return "meeting";
  if (pathname.startsWith("/projects/") && pathname.includes("/score")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/detail")) return "growth";
  if (pathname.startsWith("/projects/") && pathname.includes("/knowledge")) return "growth";
  if (pathname.startsWith("/projects")) return "today";
  if (pathname.startsWith("/knowledge")) return "growth";
  if (pathname.startsWith("/advisor")) return "today";
  if (pathname.startsWith("/report")) return "meeting";
  if (pathname.startsWith("/score")) return "growth";
  if (pathname.startsWith("/reports/")) return "meeting";
  if (pathname.startsWith("/profile")) return "growth";
  if (pathname.startsWith("/my-agents")) return "growth";
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
      return { contextHref: "/dashboard?radar=1", contextLabel: "经营动态" };
    }
    return { contextHref: null, contextLabel: null };
  }

  if (/^\/projects\/[^/]+\/agent$/.test(pathname)) {
    return {
      contextHref: `/dashboard?radar=1`,
      contextLabel: "经营动态",
    };
  }

  if (/^\/projects\/[^/]+\/advisor$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/(decision-room|decision-case)$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/decisions$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/runtime$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/capability$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/restaurant$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+\/(report|score|positioning|knowledge|equity|market|business|runtime|restaurant)$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "回对话" };
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}/agent`, contextLabel: "进入对话" };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      contextHref: `/projects/${projectId}/agent`,
      contextLabel: "回对话",
    };
  }

  if (pathname.startsWith("/platform") || pathname.startsWith("/profile") || pathname.startsWith("/billing")) {
    return {
      contextHref: projectId ? `/projects/${projectId}/agent` : "/dashboard",
      contextLabel: "回对话",
    };
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

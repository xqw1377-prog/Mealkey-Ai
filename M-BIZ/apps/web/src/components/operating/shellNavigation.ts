import { Brain, Compass, Globe2, History, Sparkles } from "lucide-react";
import type { ShellNavItem } from "./BottomNav";
import type { NavSection } from "@/types/operating";

const baseNavItems: ShellNavItem[] = [
  { label: "今日", href: "/dashboard", section: "today", icon: Brain },
  { label: "世界", href: "/projects", section: "world", icon: Globe2 },
  { label: "决策", href: "/projects", section: "decision", icon: History },
  { label: "认知", href: "/profile", section: "brain", icon: Compass },
];

export function createShellNavItems(defaultProjectId?: string | null): ShellNavItem[] {
  const hasWorld = Boolean(defaultProjectId);

  return [
    baseNavItems[0],
    {
      ...baseNavItems[1],
      // 有世界时直接进详情，不再停在列表卡墙上
      href: hasWorld ? `/projects/${defaultProjectId}` : "/projects",
    },
    {
      label: "会议",
      href: hasWorld ? `/projects/${defaultProjectId}/advisor` : "/projects",
      section: "meeting",
      icon: Sparkles,
      disabled: !hasWorld,
      disabledHint: "先建立企业世界",
    },
    {
      ...baseNavItems[2],
      href: hasWorld ? `/projects/${defaultProjectId}/decisions` : "/projects",
      disabled: !hasWorld,
      disabledHint: "先建立企业世界",
    },
    baseNavItems[3],
  ];
}

export function detectShellSection(pathname: string): NavSection {
  if (pathname.startsWith("/dashboard")) return "today";
  if (pathname.startsWith("/platform")) return "brain";
  if (pathname.startsWith("/projects/") && pathname.includes("/mission")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/advisor")) return "meeting";
  // 定位/市场/股权/商业模式都属于世界下的专项，不应高亮「会议」
  if (pathname.startsWith("/projects/") && pathname.includes("/positioning")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/market")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/equity")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/business")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/decisions")) return "decision";
  if (pathname.startsWith("/projects/") && pathname.includes("/report")) return "decision";
  if (pathname.startsWith("/projects/") && pathname.includes("/score")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/detail")) return "world";
  if (pathname.startsWith("/projects/") && pathname.includes("/knowledge")) return "brain";
  if (pathname.startsWith("/projects")) return "world";
  if (pathname.startsWith("/knowledge")) return "brain";
  if (pathname.startsWith("/advisor")) return "meeting";
  if (pathname.startsWith("/report")) return "decision";
  if (pathname.startsWith("/score")) return "world";
  if (pathname.startsWith("/reports/")) return "decision";
  if (pathname.startsWith("/profile")) return "brain";
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
    return { contextHref: `/projects/${projectId}`, contextLabel: "退出会议" };
  }

  if (/^\/projects\/[^/]+\/decisions$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}`, contextLabel: "返回世界" };
  }

  if (/^\/projects\/[^/]+\/(report|score|positioning|knowledge|equity|market|business)$/.test(pathname)) {
    return { contextHref: `/projects/${projectId}`, contextLabel: "返回世界" };
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { contextHref: "/projects", contextLabel: "返回世界列表" };
  }

  if (pathname.startsWith("/platform")) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  if (pathname.startsWith("/profile")) {
    return { contextHref: "/dashboard", contextLabel: "回到今日" };
  }

  return { contextHref: null, contextLabel: null };
}

type ShellNavigation = ShellContext & {
  section: NavSection;
};

export function resolveShellNavigation(pathname: string, projectId: string | null): ShellNavigation {
  return {
    section: detectShellSection(pathname),
    ...resolveShellContext(pathname, projectId),
  };
}

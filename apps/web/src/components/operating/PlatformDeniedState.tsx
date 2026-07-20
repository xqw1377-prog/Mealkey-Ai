import { PageErrorState } from "@/components/operating/PageState";

type Props = {
  surface: "observe" | "admin";
  error: unknown;
  currentEmail?: string | null;
};

function describePlatformDenied(
  surface: Props["surface"],
  error: unknown,
  currentEmail?: string | null,
): {
  title: string;
  description: string;
  highlights: string[];
  primaryAction: { href: string; label: string };
  secondaryAction: { href: string; label: string };
} {
  const message = error instanceof Error ? error.message : "平台访问失败";
  const needLogin = message === "请先登录";
  const forbidden = message === "仅平台管理员可访问";
  const callback =
    surface === "admin" ? "%2Fplatform%2Fadmin" : "%2Fplatform";
  const emailHint = currentEmail?.trim()
    ? `当前登录邮箱：${currentEmail.trim()}`
    : "当前登录邮箱未能读取，请到账号设置确认";

  if (needLogin) {
    return {
      title: "需要先登录管理员账号",
      description: "平台观测与管理控制台仅对已登录的平台管理员开放。",
      highlights: [
        "用白名单内的管理员邮箱登录",
        "或请负责人把你的邮箱写入 PLATFORM_ADMIN_EMAILS 后重启服务",
      ],
      primaryAction: {
        href: `/login?callbackUrl=${callback}`,
        label: "去登录管理员账号",
      },
      secondaryAction: { href: "/dashboard", label: "回今日看板" },
    };
  }

  if (forbidden) {
    return {
      title: "当前账号不是平台管理员",
      description:
        "你已登录，但邮箱不在平台管理员白名单中，因此无法打开观测台或管理控制台。",
      highlights: [
        emailHint,
        "把该邮箱写入根目录或 apps/web 的 .env：PLATFORM_ADMIN_EMAILS=你的邮箱",
        "保存后重启 next dev，再刷新本页",
        "临时验收旁路仅在本机且显式打开 MK_ALLOW_PUBLIC_PREVIEW_AUTH=1、且白名单为空时生效",
      ],
      primaryAction: {
        href: `/login?callbackUrl=${callback}`,
        label: "切换账号登录",
      },
      secondaryAction: { href: "/dashboard", label: "回今日看板" },
    };
  }

  return {
    title:
      surface === "admin" ? "平台管理端暂时无法打开" : "平台监控暂时无法生成",
    description: message,
    highlights: currentEmail ? [emailHint] : [],
    primaryAction: { href: "/dashboard", label: "回今日看板" },
    secondaryAction: { href: "/projects", label: "我的企业" },
  };
}

export function PlatformDeniedState({
  surface,
  error,
  currentEmail,
}: Props) {
  const state = describePlatformDenied(surface, error, currentEmail);
  return (
    <div className="space-y-5 pb-2 pt-6 md:pt-8">
      <PageErrorState
        eyebrow={surface === "admin" ? "平台管理" : "平台观测"}
        title={state.title}
        description={state.description}
        highlights={state.highlights}
        primaryAction={state.primaryAction}
        secondaryAction={state.secondaryAction}
      />
    </div>
  );
}

import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  getPlatformAdminAccess,
} from "@/lib/auth-helpers";

/**
 * 轻量权限探测：供壳层做角色感知导航，不返回业务数据。
 * 已登录时附带当前邮箱，便于本机配置 PLATFORM_ADMIN_EMAILS。
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  const access = await getPlatformAdminAccess();

  return NextResponse.json({
    ok: true,
    authenticated: Boolean(user),
    isAdmin: access.isAdmin,
    reason: access.reason,
    email: user?.email || null,
  });
}

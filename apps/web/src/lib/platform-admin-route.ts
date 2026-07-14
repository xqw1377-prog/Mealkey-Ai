import { AuthError, forbiddenResponse, unauthorizedResponse } from "./auth-helpers";
import { NextResponse } from "next/server";

export function platformAdminErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    if (error.message === "请先登录") {
      return unauthorizedResponse(error.message);
    }

    return forbiddenResponse(error.message);
  }

  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : "平台管理接口执行失败",
    },
    { status: 500 },
  );
}

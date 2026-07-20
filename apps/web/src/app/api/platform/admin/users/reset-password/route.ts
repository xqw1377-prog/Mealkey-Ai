import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";
import { issuePasswordResetToken } from "@/server/services/password-reset.service";

const Schema = z.object({
  email: z.string().email(),
});

/** 管理员签发一次性重置链接（复制发给用户；不发邮件） */
export async function POST(request: Request) {
  try {
    const user = await requirePlatformAdmin();
    const limited = await enforcePlatformAdminWriteRateLimit(
      request,
      user.id,
      "users.reset_password",
      6,
      60_000,
    );
    if (limited) return limited;

    const body = Schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const issued = await issuePasswordResetToken(prisma, {
      email,
      requestedFrom: "admin",
    });

    if (!issued.issued || !issued.resetUrl) {
      return NextResponse.json(
        { ok: false, error: "未找到该邮箱的可重置账号" },
        { status: 404 },
      );
    }

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/users/reset-password",
      action: "users.reset_password",
      targetType: "user",
      input: { email },
      result: {
        email,
        expiresAt: issued.expiresAt ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      resetUrl: issued.resetUrl,
      expiresAt: issued.expiresAt,
      message:
        "重置链接仅可用于一次性复制转发，请勿在控制台长期展示；1 小时内有效，用过后失效。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "请输入有效邮箱" },
        { status: 400 },
      );
    }
    return platformAdminErrorResponse(error);
  }
}

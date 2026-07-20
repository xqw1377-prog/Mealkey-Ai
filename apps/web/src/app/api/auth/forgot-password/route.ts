import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { issuePasswordResetToken } from "@/server/services/password-reset.service";

const Schema = z.object({
  email: z.string().email(),
});

const GENERIC_OK =
  "若该邮箱已注册，管理员可协助签发重置链接。未配置邮件时请联系平台管理员。";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = await rateLimit(`forgot-password:${ip}`, 8, 15 * 60 * 1000);
    if (!limited.ok) {
      return Response.json(
        { error: "申请过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((limited.resetAt - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    const body = Schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const issued = await issuePasswordResetToken(prisma, {
      email,
      requestedFrom: "forgot",
    });

    // 防枚举：生产始终同一文案；开发返回 resetUrl 方便联调
    if (issued.issued && process.env.NODE_ENV !== "production") {
      console.info("[forgot-password] resetUrl", issued.resetUrl);
      return Response.json({
        ok: true,
        message: GENERIC_OK,
        resetUrl: issued.resetUrl,
        expiresAt: issued.expiresAt,
      });
    }

    return Response.json({ ok: true, message: GENERIC_OK });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
    }
    console.error("[forgot-password]", error);
    return Response.json({ error: "申请失败，请稍后重试" }, { status: 500 });
  }
}

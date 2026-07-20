import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { consumePasswordResetToken } from "@/server/services/password-reset.service";

const Schema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = await rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return Response.json(
        { error: "尝试过于频繁，请稍后再试" },
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
    const result = await consumePasswordResetToken(prisma, {
      token: body.token,
      newPassword: body.password,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ ok: true, message: "密码已更新，请用新密码登录" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "请求格式不正确" }, { status: 400 });
    }
    console.error("[reset-password]", error);
    return Response.json({ error: "重置失败，请稍后重试" }, { status: 500 });
  }
}

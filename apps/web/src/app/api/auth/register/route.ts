import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "密码需包含字母")
    .regex(/[0-9]/, "密码需包含数字"),
  name: z.string().min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = await rateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return Response.json(
        { error: "注册过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limited.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const rawBody = RegisterSchema.parse(await request.json());
    const body = {
      ...rawBody,
      email: rawBody.email.trim().toLowerCase(),
      name: rawBody.name.trim(),
    };
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        onboarded: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // 同步创建 Owner 画像，避免后续 Agent 路径报「经营者信息不存在」
    await prisma.owner.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "注册信息格式错误", details: error.flatten() },
        { status: 400 },
      );
    }

    return Response.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type ApplyBody = {
  type?: string;
  displayName?: string;
  legalName?: string;
  website?: string;
  contactEmail?: string;
  direction?: string;
};

const ALLOWED_TYPES = new Set(["individual", "company", "partner_org"]);

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as ApplyBody;
    const type = (body.type ?? "").trim();
    const displayName = (body.displayName ?? "").trim();
    const contactEmail = (body.contactEmail ?? "").trim().toLowerCase();
    const direction = (body.direction ?? "").trim();
    const legalName = (body.legalName ?? "").trim() || null;
    const website = (body.website ?? "").trim() || null;

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false, error: "主体类型无效" }, { status: 400 });
    }
    if (!displayName || displayName.length > 120) {
      return NextResponse.json({ ok: false, error: "展示名称必填" }, { status: 400 });
    }
    if (!contactEmail || !contactEmail.includes("@") || contactEmail.length > 200) {
      return NextResponse.json({ ok: false, error: "联系邮箱无效" }, { status: 400 });
    }
    if (user.email && contactEmail !== user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "联系邮箱必须与当前登录邮箱一致" },
        { status: 400 },
      );
    }
    if (!direction || direction.length > 2000) {
      return NextResponse.json({ ok: false, error: "请填写产品方向" }, { status: 400 });
    }

    const byUser = await prisma.developerAccount.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (byUser) {
      return NextResponse.json({
        ok: true,
        id: byUser.id,
        message: "已有开发者账号，可直接进入 Console。",
        existing: true,
      });
    }

    const byEmail = await prisma.developerAccount.findFirst({
      where: { contactEmail },
      orderBy: { createdAt: "desc" },
    });
    if (byEmail) {
      if (byEmail.userId && byEmail.userId !== user.id) {
        return NextResponse.json(
          {
            ok: false,
            error: "该联系邮箱已绑定其他登录账号，请使用原账号或联系管理员",
          },
          { status: 403 },
        );
      }
      // 未绑定 userId 的申请：认领到当前登录用户
      if (!byEmail.userId) {
        const claimed = await prisma.developerAccount.update({
          where: { id: byEmail.id },
          data: { userId: user.id },
        });
        return NextResponse.json({
          ok: true,
          id: claimed.id,
          message: "已有开发者账号，可直接进入 Console。",
          existing: true,
        });
      }
      return NextResponse.json({
        ok: true,
        id: byEmail.id,
        message: "已有开发者账号，可直接进入 Console。",
        existing: true,
      });
    }

    const row = await prisma.developerAccount.create({
      data: {
        type,
        displayName,
        legalName,
        website,
        contactEmail,
        direction,
        status: "applied",
        userId: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      message: "申请已入库。进入 Console 创建 Agent；上架仍须审核。",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    console.error("[developers/apply]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "提交失败" },
      { status: 500 },
    );
  }
}

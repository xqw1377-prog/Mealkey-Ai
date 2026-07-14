import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { createAssetFromUpload } from "@/server/services/asset.service";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth();

    const limited = await rateLimit(`asset-upload:${authUser.id}`, 30, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "上传过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limited.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的资料" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 与 asset.service MAX_ASSET_UPLOAD_BYTES 对齐
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "文件过大，请控制在 15MB 以内" }, { status: 400 });
    }

    const projectId = formData.get("projectId");
    const conversationId = formData.get("conversationId");
    const categoryId = formData.get("categoryId");
    const categorySlug = formData.get("categorySlug");
    const title = formData.get("title");
    const transcriptHint = formData.get("transcriptHint");
    const tags = formData.getAll("tags").filter((item): item is string => typeof item === "string");

    const asset = await createAssetFromUpload(prisma, {
      userId: authUser.id,
      file,
      projectId: typeof projectId === "string" ? projectId : null,
      conversationId: typeof conversationId === "string" ? conversationId : null,
      categoryId: typeof categoryId === "string" ? categoryId : null,
      categorySlug: typeof categorySlug === "string" ? categorySlug : null,
      title: typeof title === "string" ? title : null,
      tags,
      transcriptHint: typeof transcriptHint === "string" ? transcriptHint : null,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }

    const message = error instanceof Error ? error.message : "未知错误";
    const isClientError =
      /不支持|过大|为空|无权限|不存在|校验失败|安全考虑/.test(message);

    console.error("[assets/upload]", message);
    return NextResponse.json(
      { error: isClientError ? message : "资料上传失败，请稍后重试" },
      { status: isClientError ? 400 : 500 },
    );
  }
}

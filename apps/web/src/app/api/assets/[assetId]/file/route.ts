import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { readBlobByStoragePath } from "@/server/storage/blob-store";

/**
 * 鉴权下载资料文件（替代 public/uploads 直链）
 * GET /api/assets/[assetId]/file
 */
export async function GET(
  _request: Request,
  context: { params: { assetId: string } },
) {
  try {
    const authUser = await requireAuth();
    const assetId = context.params.assetId;

    const owner = await prisma.owner.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });
    if (!owner) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, ownerId: owner.id },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        storagePath: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "资料不存在" }, { status: 404 });
    }

    const buffer = await readBlobByStoragePath(asset.storagePath);
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    console.error("[assets/file]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "文件读取失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { getPublicStoreListingBySlug } from "@/lib/store/store-service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { slug } = await context.params;
    const listing = await getPublicStoreListingBySlug(slug);
    if (!listing) {
      return NextResponse.json({ ok: false, error: "未找到或未公开" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, listing });
  } catch (error) {
    console.error("[store/listings/slug]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

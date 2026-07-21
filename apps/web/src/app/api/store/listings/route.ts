import { NextResponse } from "next/server";

import { listPublicStoreListings } from "@/lib/store/store-service";

export async function GET() {
  try {
    const listings = await listPublicStoreListings();
    return NextResponse.json({ ok: true, listings });
  } catch (error) {
    console.error("[store/listings]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

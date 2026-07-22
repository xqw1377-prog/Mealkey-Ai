import { NextResponse } from "next/server";
import { listMiniShellCatalog } from "@/server/mini-shell/catalog";

/** GET /api/v1/mini-shell/catalog — Shell CapabilityCatalog projection (S1) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    items: listMiniShellCatalog(),
  });
}

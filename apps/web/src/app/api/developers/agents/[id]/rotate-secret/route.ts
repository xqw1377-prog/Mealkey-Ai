import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import {
  DeveloperAccessError,
  assertConsoleAccess,
  resolveDeveloperAccount,
} from "@/lib/developers/access";
import { rotateClientSecret } from "@/lib/developers/agent-service";

function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }
  if (error instanceof DeveloperAccessError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[developers/rotate-secret]", error);
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "轮换失败" },
    { status: 500 },
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);
    const result = await rotateClientSecret(account.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}

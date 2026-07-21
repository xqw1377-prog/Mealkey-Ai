import { NextResponse } from "next/server";
import { GatewayError } from "./types";

export function gatewayJson(
  data: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(data, { status });
}

export function gatewayErrorResponse(error: unknown): NextResponse {
  if (error instanceof GatewayError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.httpStatus },
    );
  }
  return NextResponse.json(
    {
      ok: false,
      code: "INTERNAL",
      message: error instanceof Error ? error.message : "Gateway error",
    },
    { status: 500 },
  );
}

/** Next.js app route path used for HMAC (no query) */
export function gatewayPathFromUrl(url: string, prefix = "/api"): string {
  const u = new URL(url);
  let path = u.pathname;
  // SDK signs `/v1/gateway/...`；Next 挂在 `/api/v1/gateway/...`
  if (path.startsWith(`${prefix}/v1/gateway`)) {
    path = path.slice(prefix.length);
  }
  return path;
}

export function parseScopes(raw: string | null): Array<
  "basic" | "facts" | "review" | "operation" | "market" | "dna"
> {
  if (!raw?.trim()) return ["basic"];
  const allowed = new Set([
    "basic",
    "facts",
    "review",
    "operation",
    "market",
    "dna",
  ]);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is "basic" | "facts" | "review" | "operation" | "market" | "dna" =>
      allowed.has(s),
    );
}

/**
 * 限流：生产优先 Upstash（原子 INCR+EXPIRE）；未配置时 fail-closed。
 * 非生产可回退内存桶。
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

const INCR_EXPIRE_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`.trim();

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  const sorted = [...buckets.entries()].sort(
    (a, b) => a[1].resetAt - b[1].resetAt,
  );
  const overflow = buckets.size - MAX_BUCKETS;
  for (let i = 0; i < overflow; i += 1) {
    const key = sorted[i]?.[0];
    if (key) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  backend?: "redis" | "memory" | "fail-closed";
};

export function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/** 生产默认要求分布式限流；显式放行方可用内存桶 */
export function allowMemoryRateLimitFallback(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.RATE_LIMIT_ALLOW_MEMORY === "1";
}

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const cfg = redisConfig();
  if (!cfg) return null;

  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    // Upstash REST：EVAL 保证首击设 TTL，避免永不过期键
    const res = await fetch(`${cfg.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        INCR_EXPIRE_LUA,
        "1",
        redisKey,
        String(windowSec),
      ]),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as { result?: unknown };
    const tuple = payload.result;
    let count = 0;
    let ttl = windowSec;
    if (Array.isArray(tuple) && tuple.length >= 1) {
      count = Number(tuple[0]) || 0;
      ttl = Number(tuple[1]);
      if (!Number.isFinite(ttl) || ttl < 0) ttl = windowSec;
    } else if (typeof tuple === "number") {
      count = tuple;
    } else {
      return null;
    }

    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
    if (count > limit) {
      return { ok: false, remaining: 0, resetAt, backend: "redis" };
    }
    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      resetAt,
      backend: "redis",
    };
  } catch {
    return null;
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, backend: "memory" };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      backend: "memory",
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    backend: "memory",
  };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisResult = await redisRateLimit(key, limit, windowMs);
  if (redisResult) return redisResult;

  // 未配 Redis，或 Redis 调用失败：
  // - 生产默认 fail-closed（防多实例限流失效）
  // - 非生产 / 显式 RATE_LIMIT_ALLOW_MEMORY=1 才回退内存桶
  if (!allowMemoryRateLimitFallback()) {
    return {
      ok: false,
      remaining: 0,
      resetAt: Date.now() + windowMs,
      backend: "fail-closed",
    };
  }

  return memoryRateLimit(key, limit, windowMs);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/** 测试 / 运维：当前桶数量 */
export function memoryRateLimitSize(): number {
  return buckets.size;
}

/** 测试用：清空内存桶 */
export function resetMemoryRateLimitForTests(): void {
  buckets.clear();
}

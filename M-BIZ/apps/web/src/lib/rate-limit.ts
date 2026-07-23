/**
 * 限流实现
 *
 * - 单实例 / 开发环境：内存 Map
 * - 生产多实例 / Serverless：设置 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 自动切换 Redis
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

// ─── Redis (Upstash) ───

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const cfg = redisConfig();
  if (!cfg) return null;

  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // INCR + EXPIRE pipeline
    const incrRes = await fetch(`${cfg.url}/incr/${redisKey}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!incrRes.ok) return null;
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      // First request in window — set TTL
      await fetch(`${cfg.url}/expire/${redisKey}/${windowSec}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
      });
    }

    const ttlRes = await fetch(`${cfg.url}/ttl/${redisKey}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    const { result: ttl } = (await ttlRes.json()) as { result: number };
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

    if (count > limit) {
      return { ok: false, remaining: 0, resetAt };
    }

    return { ok: true, remaining: Math.max(0, limit - count), resetAt };
  } catch {
    // Redis 不可用时降级到内存限流
    return null;
  }
}

// ─── 内存限流（fallback）───

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

// ─── 公开接口 ───

/**
 * @param key 限流键（如 ip:register / userId:agent）
 * @param limit 窗口内最大次数
 * @param windowMs 窗口毫秒
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisResult = await redisRateLimit(key, limit, windowMs);
  if (redisResult) return redisResult;
  return memoryRateLimit(key, limit, windowMs);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

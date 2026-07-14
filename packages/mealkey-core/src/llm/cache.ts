/**
 * LLM Cache — LLM 调用缓存
 *
 * 避免相同上下文的重复 LLM 调用。
 * 基于 prompt hash 做缓存，TTL 可配置。
 *
 * 使用方式：
 * ```ts
 * const cache = new LLMCache();
 * const response = await cache.getOrFetch(prompt, () => llm.chat({...}));
 * ```
 */

interface CacheEntry {
  result: string;
  timestamp: number;
  ttl: number; // ms
}

export class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0 };

  constructor(private defaultTTL: number = 5 * 60 * 1000) {} // 默认5分钟

  /**
   * 生成缓存 key
   */
  private hash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `llm_${hash}_${input.length}`;
  }

  /**
   * 获取缓存或执行 fetch
   */
  async getOrFetch(
    messages: Array<{ role: string; content: string }>,
    temperature: number | undefined,
    fetch: () => Promise<string>,
    ttl?: number
  ): Promise<string> {
    // 只缓存 temperature <= 0.5 的确定性调用
    const isDeterministic = (temperature ?? 0.7) <= 0.5;

    if (isDeterministic) {
      const key = this.hash(JSON.stringify({ messages, temperature }));
      const existing = this.cache.get(key);

      if (existing && Date.now() - existing.timestamp < existing.ttl) {
        this.stats.hits++;
        return existing.result;
      }

      this.stats.misses++;
      const result = await fetch();
      this.cache.set(key, {
        result,
        timestamp: Date.now(),
        ttl: ttl ?? this.defaultTTL,
      });
      return result;
    }

    // 非确定性调用不缓存
    return fetch();
  }

  /**
   * 清除过期缓存
   */
  prune(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// 全局单例
export const globalLLMCache = new LLMCache();

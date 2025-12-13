// src/utils/cache.ts
type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class InMemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  constructor(private defaultTtlMs = 60_000) {}

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

export function buildCacheKey(prefix: string, payload?: unknown): string {
  if (!payload) return prefix;
  return `${prefix}:${JSON.stringify(payload)}`;
}

// Shared cache instance for simple cross-route reuse.
export const cache = new InMemoryCache();

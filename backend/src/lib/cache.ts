/**
 * Small in-memory TTL cache with request coalescing: concurrent callers for
 * the same key share one in-flight promise instead of each hitting upstream.
 * Failed loads are never cached; if a refresh fails while an expired value is
 * still around, that stale value is served instead (stale-if-error).
 */
export class TtlCache<T = unknown> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000,
  ) {}

  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .catch((err) => {
        if (hit) return hit.value; // upstream down: better slightly old than an error page
        throw err;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  set(key: string, value: T) {
    this.entries.delete(key); // re-insert so eviction order follows recency
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.entries.clear();
  }
}

/**
 * Caps concurrent calls and enforces a minimum gap between call starts. Put one
 * in front of each third-party source so neither the sync nor user traffic can
 * hammer it (and get our IP blocked).
 */
export function createLimiter(concurrency: number, minGapMs = 0) {
  let active = 0;
  let lastStart = 0;
  const waiting: (() => void)[] = [];

  const next = () => {
    if (active >= concurrency || waiting.length === 0) return;
    const wait = Math.max(0, lastStart + minGapMs - Date.now());
    if (wait > 0) {
      setTimeout(next, wait);
      return;
    }
    active++;
    lastStart = Date.now();
    waiting.shift()!();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

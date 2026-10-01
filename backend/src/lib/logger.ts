type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, scope: string, message: string, extra?: unknown) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  const out = level === "error" || level === "warn" ? console.error : console.log;
  if (extra === undefined) out(line);
  // Errors keep their stack: a message alone rarely explains a production failure.
  else out(line, extra instanceof Error ? (extra.stack ?? extra.message) : extra);
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, extra?: unknown) => write("debug", scope, msg, extra),
    info: (msg: string, extra?: unknown) => write("info", scope, msg, extra),
    warn: (msg: string, extra?: unknown) => write("warn", scope, msg, extra),
    error: (msg: string, extra?: unknown) => write("error", scope, msg, extra),
  };
}

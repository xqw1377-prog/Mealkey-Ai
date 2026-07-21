const LOG_LEVEL = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "warn" : "debug");

const LEVEL_PRIORITY: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: string): boolean {
  return (LEVEL_PRIORITY[level] ?? 0) >= (LEVEL_PRIORITY[LOG_LEVEL] ?? 0);
}

function fmt(level: string, service: string, message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    service,
    msg: message,
    ...meta,
  };
  return JSON.stringify(entry);
}

export function createLogger(service: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("debug")) console.debug(fmt("debug", service, message, meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("info")) console.info(fmt("info", service, message, meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("warn")) console.warn(fmt("warn", service, message, meta));
    },
    error(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("error")) console.error(fmt("error", service, message, meta));
    },
  };
}

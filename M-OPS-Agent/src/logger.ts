export type LogLevel = "info" | "warn" | "error";

export function createLogger(scope: string) {
  return function log(level: LogLevel, message: string, meta?: unknown) {
    const ts = new Date().toISOString();
    const prefix = `[${scope}] [${ts}] [${level.toUpperCase()}]`;
    if (meta !== undefined) {
      console[level](`${prefix} ${message}`, meta);
    } else {
      console[level](`${prefix} ${message}`);
    }
  };
}

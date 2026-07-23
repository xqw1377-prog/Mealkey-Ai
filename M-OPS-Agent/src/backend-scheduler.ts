import { createLogger } from "./logger";
import { runDueRestaurantScans, seedSampleRestaurants } from "./backend-service";

const log = createLogger("m-ops-scheduler");

export function startBackendScheduler(
  intervalMs = Number(process.env.M_OPS_SCAN_INTERVAL_MS || 60_000),
) {
  if (intervalMs < 10_000) {
    log("warn", `扫描间隔 ${intervalMs}ms 过短，已自动调整为 10s`);
    intervalMs = 10_000;
  }

  seedSampleRestaurants();

  const timer = setInterval(async () => {
    try {
      const startTime = Date.now();
      const results = await runDueRestaurantScans();
      const elapsed = Date.now() - startTime;

      if (results.length) {
        const ok = results.filter((item) => item.ok).length;
        const fail = results.length - ok;
        log(
          fail > 0 ? "warn" : "info",
          `执行=${results.length} 成功=${ok} 失败=${fail} 耗时=${elapsed}ms`,
          fail > 0
            ? results
                .filter((r) => !r.ok)
                .map((r) => ({ restaurantId: r.restaurantId, error: r.error }))
            : undefined,
        );
      }
    } catch (error) {
      log("error", "定时扫描执行异常", error instanceof Error ? error.message : String(error));
    }
  }, intervalMs);

  log("info", `定时扫描已启动 interval=${intervalMs}ms`);
  log("info", `首次扫描将在 ${Math.round(intervalMs / 1000)} 秒后执行`);

  return {
    stop() {
      clearInterval(timer);
      log("info", "定时扫描已停止");
    },
    getInterval() {
      return intervalMs;
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\\\/g, "/")}`) {
  startBackendScheduler();
}

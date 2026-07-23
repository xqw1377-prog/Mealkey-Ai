import { createLogger } from "./logger";
import { seedSampleRestaurants } from "./backend-service";
import { loadPersistedPatternLibrary } from "./diagnosis-persistence";
import { startBackendScheduler } from "./backend-scheduler";
import { startBackendServer } from "./backend-server";

const log = createLogger("m-ops-backend");

export function startBackendRuntime() {
  log("info", "M-OPS-Agent 后端运行时启动中...");
  log("info", `Node.js ${process.version} ${process.platform} ${process.arch}`);
  log("info", `工作目录: ${process.cwd()}`);

  if (loadPersistedPatternLibrary()) {
    log("info", "已恢复进化模式库");
  }

  seedSampleRestaurants();

  const server = startBackendServer();
  const scheduler = startBackendScheduler();

  log("info", "后端运行时启动完成");

  return {
    stop() {
      log("info", "正在停止后端运行时...");
      scheduler.stop();
      server.close();
      log("info", "后端运行时已停止");
    },
    server,
    scheduler,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\\\/g, "/")}`) {
  startBackendRuntime();
}

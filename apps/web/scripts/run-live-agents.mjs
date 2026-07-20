/**
 * 真实引擎冒烟：LIVE_AGENTS=1 跑 founder-live-agents.smoke.test.ts
 *
 *   npm run test:live-agents
 *   node scripts/run-live-agents.mjs
 *
 * 需先启动 M-BIZ / M-MKT / M-ED，并配置 MBIZ_* / MMKT_* / MED_*。
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "..");

function stripTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

/** 探测外呼健康；失败打印中文 checklist，不代替 vitest */
async function preflightHealth() {
  const checks = [
    {
      id: "m-biz",
      label: "M-BIZ",
      url: process.env.MBIZ_API_BASE_URL,
      hint: "MBIZ_API_BASE_URL（例 http://127.0.0.1:8000/api/v1/bmjm）",
    },
    {
      id: "m-mkt",
      label: "M-MKT",
      url: process.env.MMKT_API_BASE_URL,
      hint: "MMKT_API_BASE_URL（例 http://127.0.0.1:8002）",
    },
    {
      id: "m-ed",
      label: "M-ED",
      url: process.env.MED_API_BASE_URL,
      hint: "MED_API_BASE_URL（例 http://127.0.0.1:8001）",
    },
  ];

  const missing = checks.filter((c) => !c.url);
  if (missing.length) {
    console.error("\n[LIVE 预检] 缺少环境变量：");
    for (const m of missing) {
      console.error(`  - ${m.hint}`);
    }
    console.error(
      "\n先配置 env，或：docker compose -f docker-compose.agents.yml up -d\n详见 docs/AGENTS.md\n",
    );
    return false;
  }

  const results = await Promise.all(
    checks.map(async (c) => {
      const base = stripTrailingSlash(c.url);
      const candidates = [`${base}/health`, `${base}/`];
      let ok = false;
      let detail = "unreachable";
      for (const target of candidates) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(target, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok || res.status === 404) {
            // 404 也说明进程在听端口（部分引擎无 /health）
            ok = true;
            detail = `HTTP ${res.status}`;
            break;
          }
          detail = `HTTP ${res.status}`;
        } catch (err) {
          detail = err instanceof Error ? err.message : "fetch failed";
        }
      }
      return { ...c, ok, detail };
    }),
  );

  const down = results.filter((r) => !r.ok);
  console.log("\n[LIVE 预检] 外呼可达性：");
  for (const r of results) {
    console.log(`  ${r.ok ? "OK" : "DOWN"}  ${r.label}  ${r.detail}`);
  }
  if (down.length) {
    console.error("\n引擎未就绪，LIVE 冒烟大概率失败。请先：");
    console.error("  docker compose -f docker-compose.agents.yml up -d");
    console.error("  或按 docs/AGENTS.md 分别启动 8000/8001/8002");
    console.error("仍将继续跑 vitest（便于看具体断言）…\n");
  } else {
    console.log("");
  }
  return down.length === 0;
}

const env = { ...process.env, LIVE_AGENTS: "1", HEURISTIC_ONLY: "false" };

await preflightHealth();

const result = spawnSync(
  "npx",
  ["vitest", "run", "tests/founder-live-agents.smoke.test.ts"],
  { cwd: webRoot, env, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);

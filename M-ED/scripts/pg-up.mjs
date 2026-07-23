/**
 * 启动 Postgres 容器，切换 schema，db push，seed。
 * 用法（仓库根目录）:
 *   node scripts/pg-up.mjs
 *   node scripts/pg-up.mjs --keep-pg-schema
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const web = path.join(root, "apps", "web");
const prismaDir = path.join(web, "prisma");
const keepPg = process.argv.includes("--keep-pg-schema");

const PG_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres")
    ? process.env.DATABASE_URL
    : "postgresql://postgres:postgres@localhost:5432/mealkey";

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      cwd: opts.cwd || root,
      env: { ...process.env, ...opts.env },
      shell: true,
    });
  } catch (err) {
    if (opts.retryOnce && /EPERM|operation not permitted/i.test(String(err))) {
      console.warn("Retrying after file lock (close next dev if running)...");
      // brief wait then retry once
      execSync("node -e \"Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,3000)\"", {
        stdio: "ignore",
        shell: true,
      });
      execSync(cmd, {
        stdio: "inherit",
        cwd: opts.cwd || root,
        env: { ...process.env, ...opts.env },
        shell: true,
      });
      return;
    }
    throw err;
  }
}

function copy(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}

console.log("=== MealKey Postgres bootstrap ===");
console.log(`DATABASE_URL=${PG_URL}`);

run("docker compose up -d postgres");

console.log("\nWaiting for postgres health...");
for (let i = 0; i < 40; i++) {
  try {
    execSync("docker compose exec -T postgres pg_isready -U postgres", {
      cwd: root,
      stdio: "pipe",
      shell: true,
    });
    console.log("postgres is ready");
    break;
  } catch {
    if (i === 39) throw new Error("postgres health check timeout");
    await sleep(2000);
  }
}

const schema = path.join(prismaDir, "schema.prisma");
const schemaSqlite = path.join(prismaDir, "schema.sqlite.prisma");
const schemaPg = path.join(prismaDir, "schema.postgresql.prisma");

if (!fs.existsSync(schemaPg)) {
  throw new Error("missing prisma/schema.postgresql.prisma");
}

const current = fs.readFileSync(schema, "utf8");
if (current.includes('provider = "sqlite"')) {
  copy(schema, schemaSqlite);
}
copy(schemaPg, schema);

run("npx prisma generate", { cwd: web, env: { DATABASE_URL: PG_URL }, retryOnce: true });
run("npx prisma db push --accept-data-loss", {
  cwd: web,
  env: { DATABASE_URL: PG_URL },
  retryOnce: true,
});
run("npx tsx prisma/seed.ts", { cwd: web, env: { DATABASE_URL: PG_URL } });
run("npx tsx scripts/verify-pg.ts", { cwd: web, env: { DATABASE_URL: PG_URL } });

if (!keepPg) {
  if (fs.existsSync(schemaSqlite)) {
    copy(schemaSqlite, schema);
    run("npx prisma generate", {
      cwd: web,
      env: { DATABASE_URL: "file:./dev.db" },
    });
    console.log("\nRestored SQLite schema for local dev.");
    console.log("Postgres data remains in Docker. To develop against PG:");
    console.log("  npm run db:pg:prepare");
    console.log(`  set DATABASE_URL=${PG_URL}`);
    console.log("  cd apps/web && npx prisma generate");
  }
} else {
  console.log("\nKept PostgreSQL schema active (--keep-pg-schema).");
}

console.log("\n=== Postgres bootstrap done ===");

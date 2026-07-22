/**
 * Vercel 构建前准备：切换到 PostgreSQL schema + 迁移
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const prismaDir = "apps/web/prisma";
const schema = `${prismaDir}/schema.prisma`;
const schemaPg = `${prismaDir}/schema.postgresql.prisma`;
const schemaSqlite = `${prismaDir}/schema.sqlite.prisma`;

if (!process.env.DATABASE_URL?.startsWith("postgresql://")) {
  console.log("[vercel-build-prep] DATABASE_URL is not PostgreSQL, skipping schema swap");
  process.exit(0);
}

if (!fs.existsSync(schemaPg)) {
  console.log("[vercel-build-prep] No schema.postgresql.prisma found, skipping");
  process.exit(0);
}

console.log("[vercel-build-prep] Swapping to PostgreSQL schema...");
fs.copyFileSync(schema, schemaSqlite);
fs.copyFileSync(schemaPg, schema);

// Remove .env files that override Vercel's environment variables
const webEnv = "apps/web/.env";
const webEnvLocal = "apps/web/.env.local";
for (const f of [webEnv, webEnvLocal]) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`[vercel-build-prep] Removed ${f}`);
  }
}

const dbUrl = process.env.DATABASE_URL;
console.log(`[vercel-build-prep] DATABASE_URL starts with: ${dbUrl?.slice(0, 15)}...`);

console.log("[vercel-build-prep] Running prisma generate...");
execSync("npx prisma generate", { cwd: "apps/web", stdio: "inherit" });

console.log("[vercel-build-prep] Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { cwd: "apps/web", stdio: "inherit" });

console.log("[vercel-build-prep] Done!");

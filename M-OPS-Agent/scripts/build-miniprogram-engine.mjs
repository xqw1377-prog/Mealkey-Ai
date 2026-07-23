/**
 * 将 @mealkey/m-ops-diag 打成微信小程序可 require 的 CJS 包（无 Node API）。
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(root, "miniprogram", "libs", "m-ops-diag.js");

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "packages/m-ops-diag/src/miniprogram-entry.ts")],
  outfile,
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: ["es2019"],
  minify: false,
  sourcemap: false,
  logLevel: "info",
  // 小程序无 process；用字面量兜底
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("wrote", outfile);

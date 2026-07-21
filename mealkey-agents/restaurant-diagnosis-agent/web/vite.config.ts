import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(agentRoot, "../..");

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@mealkey/agent-sdk/platform": path.join(
        repoRoot,
        "packages/agent-sdk/src/platform/index.ts",
      ),
      "@mealkey/m-ops-diag": path.join(
        repoRoot,
        "packages/m-ops-diag/src/index.ts",
      ),
      "@mealkey/tool-agent-kit": path.join(
        repoRoot,
        "packages/tool-agent-kit/src/index.ts",
      ),
      "@agent/skill": path.join(agentRoot, "src/skill.ts"),
    },
  },
});

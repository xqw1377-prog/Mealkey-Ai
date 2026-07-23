import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
        root,
        "packages/agent-sdk/src/platform/index.ts",
      ),
      "@mealkey/m-ops-diag": path.join(root, "packages/m-ops-diag/src/index.ts"),
      "@mealkey/tool-agent-kit": path.join(
        root,
        "packages/tool-agent-kit/src/index.ts",
      ),
      "@agent/skill": path.join(root, "src/skill.ts"),
    },
  },
});

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mealkey/business-signal-engine": path.resolve(
        __dirname,
        "../../packages/business-signal-engine/src/index.ts",
      ),
    },
  },
});

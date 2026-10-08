import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts: simulation engines are pure TypeScript
// and don't need the React Router or MDX plugins.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
  },
});

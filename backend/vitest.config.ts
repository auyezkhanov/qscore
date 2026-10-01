import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Unit tests never touch the database; these only satisfy config validation.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret-at-least-16-chars",
      SYNC_ENABLED: "false",
    },
  },
});

import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["services/api/tests/**/*.test.ts", "apps/admin-web/src/**/*.test.tsx"], testTimeout: 15000, hookTimeout: 30000 } });

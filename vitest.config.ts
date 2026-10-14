import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@server": fileURLToPath(new URL("./server", import.meta.url)),
      // Unit tests run in Node; stub out the build-time client-import
      // guard so server modules remain importable (and testable).
      "server-only": fileURLToPath(
        new URL("./tests/unit/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});

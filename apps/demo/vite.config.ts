import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The demo doubles as the library's live dev harness: package imports are
// aliased to source, so editing packages/* hot-reloads here.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@react-form-engine/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@react-form-engine/renderers-html": fileURLToPath(
        new URL("../../packages/renderers-html/src/index.ts", import.meta.url),
      ),
    },
  },
});

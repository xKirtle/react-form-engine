import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const source = (path: string) =>
  fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

// The demo doubles as the library's live dev harness: package imports are
// aliased to source, so editing packages/* hot-reloads here. Array form:
// entries match in order, so subpaths must precede their package name.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@react-form-engine/renderers-html/styles.css",
        replacement: source("renderers-html/src/styles.css"),
      },
      {
        find: "@react-form-engine/renderers-html",
        replacement: source("renderers-html/src/index.ts"),
      },
      {
        find: "@react-form-engine/core",
        replacement: source("core/src/index.ts"),
      },
    ],
  },
});

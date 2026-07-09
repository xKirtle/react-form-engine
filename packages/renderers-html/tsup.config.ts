import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/styles.css"],
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
});

import { build } from "bun";

build({
  sourcemap: true,
  format: "esm",
  target: "bun",
  entrypoints: ["./src/index.ts", "./src/schema.ts"],
  outdir: "dist",
});

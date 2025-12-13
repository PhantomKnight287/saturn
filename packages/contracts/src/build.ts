import { build, Glob } from "bun";

// Run build from the src directory so outputs mirror src/* directly under dist/*
const srcDir = new URL(".", import.meta.url).pathname;
process.chdir(srcDir);

const entrypoints = Array.from(new Glob("**/*.ts").scanSync());

await build({
  entrypoints,
  outdir: "../dist",
  target: "bun",
  sourcemap: true,
  format: "esm",
});

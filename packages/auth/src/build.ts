Bun.build({
  entrypoints: ["./src/index.ts", "./src/auth.ts", "./src/permissions.ts"],
  outdir: "./dist",
  target: "bun",
  sourcemap: true,
  format: "esm",
});

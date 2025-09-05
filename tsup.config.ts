import { defineConfig } from "tsup";
import { execSync } from "child_process";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"], // Build both CommonJS and ESM versions
  dts: true, // Generate declaration files
  splitting: false,
  sourcemap: true,
  clean: true, // Clean output directory before build
  minify: false,
  external: ["uuid"], // Don't bundle uuid
  noExternal: [],
  outDir: "dist",
  outExtension: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".mjs",
  }),
  onSuccess: async () => {
    // Run bundle creation only if not in CI
    if (!process.env.CI) {
      console.log("Creating bundle...");
      execSync("npm run bundle", { stdio: "inherit" });
    } else {
      console.log("Skipping bundle on CI");
    }
  },
});

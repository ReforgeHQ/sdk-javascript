import { defineConfig } from "tsup";
import { execSync } from "child_process";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("./package.json");

export default defineConfig({
  entry: ["index.ts", "src/prefetch.ts"],
  format: ["cjs", "esm"], // Build both CommonJS and ESM versions
  dts: true, // Generate declaration files
  splitting: true, // Enable code splitting for smaller imports
  sourcemap: true,
  clean: true, // Clean output directory before build
  minify: true,
  external: [],
  noExternal: [],
  outDir: "dist",
  define: {
    __SDK_VERSION__: JSON.stringify(packageJson.version),
  },
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

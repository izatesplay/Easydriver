import esbuild from "esbuild";

async function build() {
  console.log("⚡ Bundling server.ts via programmatic esbuild API...");
  try {
    await esbuild.build({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      sourcemap: true,
      outfile: "dist/server.cjs",
    });
    console.log("🟢 Server bundled successfully into dist/server.cjs");
  } catch (err) {
    console.error("🔴 Bundle failed:", err);
    process.exit(1);
  }
}

build();

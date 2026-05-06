/* global console, process */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const statusPath = resolve(projectRoot, "demo-status.json");
if (!existsSync(statusPath)) {
  console.error("[demo:export] Missing demo-status.json. Run npm run demo:status first.");
  process.exit(1);
}

const status = JSON.parse(readFileSync(statusPath, "utf8"));
const now = new Date();
const ts = now.toISOString().replaceAll(":", "-").replace(".", "-");
const outDir = resolve(projectRoot, "demo-export", ts);
mkdirSync(outDir, { recursive: true });

const filesToCopy = [
  status.latestReport,
  status.latestBundleZip,
  resolve(projectRoot, "demo-status.json"),
  resolve(projectRoot, "demo-status.md"),
];

for (const path of filesToCopy) {
  if (!existsSync(path)) {
    console.error(`[demo:export] Missing required artifact: ${path}`);
    process.exit(1);
  }
  const filename = path.split(/[\\/]/).at(-1) ?? "artifact";
  copyFileSync(path, resolve(outDir, filename));
}

writeFileSync(resolve(projectRoot, "demo-export", "LATEST.txt"), `${outDir}\n`, "utf8");
console.log(`[demo:export] Export snapshot created at ${outDir}`);

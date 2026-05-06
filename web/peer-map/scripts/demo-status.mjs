/* global console, process */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const reportsDir = resolve(projectRoot, "demo-reports");
const bundlesDir = resolve(projectRoot, "demo-bundles");
const latestBundlePathFile = resolve(bundlesDir, "LATEST.txt");
const statusDir = resolve(projectRoot, "demo-status");

function newestFile(dir, suffix) {
  if (!existsSync(dir)) return "";
  const entries = readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => resolve(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return entries[0] ?? "";
}

const latestReport = newestFile(reportsDir, ".md");
if (!latestReport) {
  console.error("[demo:status] No report found. Run npm run demo:report first.");
  process.exit(1);
}

if (!existsSync(latestBundlePathFile)) {
  console.error("[demo:status] Missing demo-bundles/LATEST.txt. Run npm run demo:bundle first.");
  process.exit(1);
}

const latestBundle = readFileSync(latestBundlePathFile, "utf8").trim();
const latestBundleZip = `${latestBundle}.zip`;
if (!latestBundle || !existsSync(latestBundle)) {
  console.error(`[demo:status] Latest bundle path invalid: ${latestBundle}`);
  process.exit(1);
}
if (!existsSync(latestBundleZip)) {
  console.error(`[demo:status] Latest bundle archive missing: ${latestBundleZip}`);
  process.exit(1);
}

const latestManifestPath = resolve(latestBundle, "manifest.json");
if (!existsSync(latestManifestPath)) {
  console.error(`[demo:status] Missing manifest in bundle: ${latestManifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(latestManifestPath, "utf8"));
const zipSizeMb = statSync(latestBundleZip).size / (1024 * 1024);

const statusJson = {
  generatedAt: new Date().toISOString(),
  latestReport,
  latestBundle,
  latestBundleZip,
  latestBundleZipSizeMb: Number(zipSizeMb.toFixed(2)),
  manifest,
};

const statusMd = [
  "# Demo Status",
  "",
  `- Generated: ${statusJson.generatedAt}`,
  `- Latest report: ${latestReport}`,
  `- Latest bundle: ${latestBundle}`,
  `- Latest bundle zip: ${latestBundleZip} (${zipSizeMb.toFixed(2)} MB)`,
  `- APK sha256: ${manifest.apkSha256}`,
  "",
].join("\n");

if (!existsSync(statusDir)) {
  // Single output directory for quick "is demo ready?" checks.
  mkdirSync(statusDir, { recursive: true });
  writeFileSync(resolve(statusDir, ".keep"), "", "utf8");
}
writeFileSync(resolve(projectRoot, "demo-status.json"), `${JSON.stringify(statusJson, null, 2)}\n`, "utf8");
writeFileSync(resolve(projectRoot, "demo-status.md"), `${statusMd}\n`, "utf8");
console.log("[demo:status] Wrote demo-status.json and demo-status.md");

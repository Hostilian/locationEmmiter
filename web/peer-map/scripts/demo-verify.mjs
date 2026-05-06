/* global console, process */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const statusPath = resolve(projectRoot, "demo-status.json");

if (!existsSync(statusPath)) {
  console.error("[demo:verify] Missing demo-status.json. Run npm run demo:status first.");
  process.exit(1);
}

const status = JSON.parse(readFileSync(statusPath, "utf8"));
const { latestReport, manifest } = status;

if (!existsSync(latestReport)) {
  console.error(`[demo:verify] Latest report missing: ${latestReport}`);
  process.exit(1);
}

const reportContent = readFileSync(latestReport, "utf8");
const reportShaMatch = reportContent.match(/- APK sha256:\s*([a-f0-9]{64})/i);
if (!reportShaMatch) {
  console.error(`[demo:verify] Could not parse APK sha256 from report: ${latestReport}`);
  process.exit(1);
}

const reportSha = reportShaMatch[1].toLowerCase();
const manifestSha = String(manifest?.apkSha256 ?? "").toLowerCase();
if (!manifestSha || reportSha !== manifestSha) {
  console.error(
    `[demo:verify] SHA mismatch between report (${reportSha}) and manifest (${manifestSha}).`,
  );
  process.exit(1);
}

console.log("[demo:verify] Report, bundle manifest, and status SHA values are consistent.");

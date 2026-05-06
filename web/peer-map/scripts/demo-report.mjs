/* global console, process */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const reportsDir = resolve(projectRoot, "demo-reports");
const apkPath = resolve(
  projectRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

if (!existsSync(apkPath)) {
  console.error(`[demo:report] APK missing at ${apkPath}. Run npm run cap:apk first.`);
  process.exit(1);
}

mkdirSync(reportsDir, { recursive: true });

const apkBuffer = readFileSync(apkPath);
const sha256 = createHash("sha256").update(apkBuffer).digest("hex");
const sizeMb = statSync(apkPath).size / (1024 * 1024);
const now = new Date();
const ts = now.toISOString().replaceAll(":", "-").replace(".", "-");
const reportPath = resolve(reportsDir, `demo-report-${ts}.md`);

const report = [
  "# Demo Report",
  "",
  `- Generated: ${now.toISOString()}`,
  `- Node: ${process.version}`,
  `- Platform: ${process.platform} ${process.arch}`,
  `- APK: ${apkPath}`,
  `- APK size (MB): ${sizeMb.toFixed(2)}`,
  `- APK sha256: ${sha256}`,
  "",
].join("\n");

writeFileSync(reportPath, report, "utf8");
console.log(`[demo:report] Wrote ${reportPath}`);

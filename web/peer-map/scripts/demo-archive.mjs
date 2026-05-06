/* global console, process */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const bundlesDir = resolve(projectRoot, "demo-bundles");
const latestPathFile = resolve(bundlesDir, "LATEST.txt");

if (!existsSync(latestPathFile)) {
  console.error("[demo:archive] Missing demo-bundles/LATEST.txt. Run npm run demo:bundle first.");
  process.exit(1);
}

const latestBundlePath = readFileSync(latestPathFile, "utf8").trim();
if (!latestBundlePath || !existsSync(latestBundlePath)) {
  console.error(`[demo:archive] Latest bundle path is invalid: ${latestBundlePath}`);
  process.exit(1);
}

const zipPath = `${latestBundlePath}.zip`;
const bundleGlob = latestBundlePath + String.raw`\*`;
const command = `powershell -NoProfile -Command "Compress-Archive -Path '${bundleGlob}' -DestinationPath '${zipPath}' -Force"`;
execSync(command, { stdio: "inherit" });

console.log(`[demo:archive] Created ${zipPath}`);

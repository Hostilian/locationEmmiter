/* global console, process */
import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

function runStep(name, command) {
  console.log(`\n[demo:crosscheck] ${name}`);
  execSync(command, { stdio: "inherit" });
}

const apkPath = resolve(
  process.cwd(),
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

runStep("Linting project", "npm run lint");
runStep("Running demo preflight", "npm run demo:preflight");
runStep("Running type checks", "npm run typecheck");
runStep("Running unit tests", "npm run test");
runStep("Running end-to-end tests", "npm run test:e2e");
runStep("Building demo debug APK", "npm run cap:apk");
runStep("Generating demo report", "npm run demo:report");
runStep("Packaging demo bundle", "npm run demo:bundle");
runStep("Archiving latest demo bundle", "npm run demo:archive");
runStep("Housekeeping old demo artifacts", "npm run demo:housekeep");
runStep("Generating demo latest status", "npm run demo:status");
runStep("Verifying report/bundle/status consistency", "npm run demo:verify");
runStep("Exporting release-ready demo snapshot", "npm run demo:export");

if (!existsSync(apkPath)) {
  console.error(`[demo:crosscheck] APK missing at ${apkPath}`);
  process.exit(1);
}

const apkSizeMb = statSync(apkPath).size / (1024 * 1024);
console.log(
  `\n[demo:crosscheck] Success. APK verified: ${apkPath} (${apkSizeMb.toFixed(2)} MB)`,
);

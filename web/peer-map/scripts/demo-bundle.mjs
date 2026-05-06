/* global console, process */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
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
const bundlesDir = resolve(projectRoot, "demo-bundles");

if (!existsSync(apkPath)) {
  console.error(`[demo:bundle] APK missing at ${apkPath}. Run npm run cap:apk first.`);
  process.exit(1);
}

mkdirSync(bundlesDir, { recursive: true });

const now = new Date();
const ts = now.toISOString().replaceAll(":", "-").replace(".", "-");
const bundleDir = resolve(bundlesDir, ts);
mkdirSync(bundleDir, { recursive: true });

const apkTargetPath = resolve(bundleDir, "app-debug.apk");
copyFileSync(apkPath, apkTargetPath);

const apkBuffer = readFileSync(apkTargetPath);
const sha256 = createHash("sha256").update(apkBuffer).digest("hex");
const apkSizeMb = statSync(apkTargetPath).size / (1024 * 1024);

const manifest = {
  generatedAt: now.toISOString(),
  apkPath: apkTargetPath,
  apkSha256: sha256,
  apkSizeMb: Number(apkSizeMb.toFixed(2)),
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
};

writeFileSync(resolve(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(resolve(bundlesDir, "LATEST.txt"), `${bundleDir}\n`, "utf8");

console.log(`[demo:bundle] Bundle created at ${bundleDir}`);

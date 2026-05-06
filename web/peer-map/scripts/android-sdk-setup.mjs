import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { EOL, homedir, platform } from "node:os";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const localPropertiesPath = resolve(projectRoot, "android", "local.properties");

function getSdkDirFromLocalProperties() {
  if (!existsSync(localPropertiesPath)) {
    return "";
  }
  const text = readFileSync(localPropertiesPath, "utf8");
  const match = text.match(/(^|\n)\s*sdk\.dir\s*=\s*(.+)\s*($|\n)/);
  return match?.[2]?.trim() ?? "";
}

function pickSdkDir() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) return fromEnv;

  if (platform() === "win32") {
    const userProfile = process.env.USERPROFILE || homedir();
    const candidates = [
      resolve(userProfile, "AppData", "Local", "Android", "Sdk"),
      resolve("C:/Android", "Sdk"),
    ];
    return candidates.find((dir) => existsSync(dir)) ?? "";
  }

  return "";
}

function escapeForGradle(pathValue) {
  return pathValue.replaceAll("\\", "\\\\");
}

const existing = getSdkDirFromLocalProperties();
if (existing) {
  console.log(`[android-sdk-setup] local.properties already configured: ${existing}`);
  process.exit(0);
}

const sdkDir = pickSdkDir();
if (!sdkDir) {
  console.error(
    [
      "[android-sdk-setup] Could not detect Android SDK path.",
      "[android-sdk-setup] Set ANDROID_HOME / ANDROID_SDK_ROOT, then rerun this command.",
      String.raw`[android-sdk-setup] Expected common path: C:\Users\<you>\AppData\Local\Android\Sdk`,
    ].join(EOL),
  );
  process.exit(1);
}

writeFileSync(localPropertiesPath, `sdk.dir=${escapeForGradle(sdkDir)}${EOL}`, "utf8");
console.log(`[android-sdk-setup] Wrote ${localPropertiesPath}`);
console.log(`[android-sdk-setup] sdk.dir=${sdkDir}`);

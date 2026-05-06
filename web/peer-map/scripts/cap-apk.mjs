/* global console, process */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

const androidDir = resolve(process.cwd(), "android");
const localPropertiesPath = resolve(androidDir, "local.properties");
const hasAndroidHome = Boolean(process.env.ANDROID_HOME);
const hasAndroidSdkRoot = Boolean(process.env.ANDROID_SDK_ROOT);
function hasSdkDirInLocalProperties() {
  if (!existsSync(localPropertiesPath)) {
    return false;
  }
  const localProperties = readFileSync(localPropertiesPath, "utf8");
  return /(^|\n)\s*sdk\.dir\s*=/.test(localProperties);
}

run("npm run demo:ready");
run("npm run android:sdk:setup");

const hasSdkDir = hasSdkDirInLocalProperties();

if (!hasAndroidHome && !hasAndroidSdkRoot && !hasSdkDir) {
  console.error(
    [
      "",
      "[cap:apk] Android SDK path is missing.",
      "[cap:apk] Set ANDROID_HOME or ANDROID_SDK_ROOT, or add sdk.dir in android/local.properties.",
      "[cap:apk] Example local.properties line:",
      String.raw`sdk.dir=C:\Users\<you>\AppData\Local\Android\Sdk`,
      "",
    ].join("\n"),
  );
  process.exit(1);
}

run(
  'powershell -NoProfile -Command "Set-Location android; ./gradlew.bat assembleDebug"',
);

console.log(
  "\n[cap:apk] Success. APK at android/app/build/outputs/apk/debug/app-debug.apk",
);

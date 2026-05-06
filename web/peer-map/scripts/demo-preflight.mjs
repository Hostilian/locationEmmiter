/* global console, process */
import { execSync } from "node:child_process";

function check(label, command, required = true) {
  try {
    const out = execSync(command, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
    console.log(`[demo:preflight] ${label}: ${out || "ok"}`);
  } catch {
    if (required) {
      console.error(`[demo:preflight] Missing/failed required tool: ${label}`);
      process.exit(1);
    }
    console.warn(`[demo:preflight] Optional tool unavailable: ${label}`);
  }
}

console.log("[demo:preflight] Running local environment checks...");
check("node", "node -v");
check("npm", "npm -v");
check("java", "java -version");
check("capacitor", "npx cap --version");
check("adb", "adb version", false);
console.log("[demo:preflight] Environment looks good.");

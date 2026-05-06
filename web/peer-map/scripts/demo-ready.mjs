/* global console, process */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const androidDir = resolve(process.cwd(), "android");

function runStep(name, command) {
  process.stdout.write(`\n[demo-ready] ${name}\n`);
  execSync(command, { stdio: "inherit" });
}

if (!existsSync(androidDir)) {
  console.error(
    `[demo-ready] Missing Android project at ${androidDir}. Run "npx cap add android" first.`,
  );
  process.exit(1);
}

runStep("Checking Capacitor environment", "npx cap doctor");
runStep("Running type checks", "npm run typecheck");
runStep("Running unit tests", "npm run test");
runStep("Running production build", "npm run build");
runStep("Syncing web assets to Android", "npx cap sync android");

console.log(
  "\n[demo-ready] Success. Next step: npm run cap:open (or npm run demo:studio).",
);

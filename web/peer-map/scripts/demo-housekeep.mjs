/* global console, process */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const reportsDir = resolve(projectRoot, "demo-reports");
const bundlesDir = resolve(projectRoot, "demo-bundles");
const keepCount = Number.parseInt(process.env.DEMO_KEEP ?? "5", 10);

function pruneByMtime(dir, matcher) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir)
    .filter(matcher)
    .map((name) => {
      const path = resolve(dir, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return entries.slice(keepCount);
}

const oldReports = pruneByMtime(reportsDir, (name) => name.endsWith(".md"));
for (const entry of oldReports) {
  rmSync(entry.path, { force: true });
}

const oldBundles = pruneByMtime(
  bundlesDir,
  (name) => !name.endsWith(".zip") && name !== "LATEST.txt",
);
for (const entry of oldBundles) {
  rmSync(entry.path, { recursive: true, force: true });
}

const oldBundleZips = pruneByMtime(bundlesDir, (name) => name.endsWith(".zip"));
for (const entry of oldBundleZips) {
  rmSync(entry.path, { force: true });
}

console.log(
  `[demo:housekeep] Kept latest ${keepCount}; removed reports=${oldReports.length}, bundles=${oldBundles.length}, zips=${oldBundleZips.length}`,
);

#!/usr/bin/env node
/**
 * Minimal LEP gateway daemon:
 * - reads lines from stdin (or --file)
 * - decodes LEP/LRM1 via tools/decode-packet.mjs
 * - forwards JSON to stdout and optional HTTP endpoint (--http)
 *
 * This is intentionally small and offline-friendly; wire MQTT/serial adapters externally.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const decodeTool = join(__dirname, '..', 'decode-packet.mjs');

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1] ?? null;
}

const file = arg('--file');
const http = arg('--http');

const input =
  file != null ? fs.readFileSync(file, 'utf8') : process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8');

if (!input.trim()) {
  console.error('gateway-daemon: provide --file <path> or pipe lines on stdin');
  process.exit(1);
}

const r = spawnSync(process.execPath, [decodeTool, '--all-lines', '--jsonl'], {
  input,
  encoding: 'utf8',
  maxBuffer: 16 << 20,
});

if (r.status !== 0) {
  process.stderr.write(r.stderr || r.stdout || 'decode failed');
  process.exit(r.status ?? 1);
}

const rows = r.stdout
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => JSON.parse(s));

for (const row of rows) {
  console.log(JSON.stringify(row));
  if (http) {
    try {
      await fetch(http, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(row),
      });
    } catch {
      /* keep forwarding to stdout even if network sink fails */
    }
  }
}

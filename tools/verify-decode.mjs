#!/usr/bin/env node
/**
 * Cross-platform verify: golden LEP, mesh unwrap, intentional failure, JSONL batch.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const decode = join(__dirname, 'decode-packet.mjs');

function run(args, input) {
  const r = spawnSync(process.execPath, [decode, ...args], {
    input,
    encoding: 'utf8',
    maxBuffer: 10 << 20,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const goldenLep = '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
const lepNonSos =
  '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
const meshNonSos = `4c524d310300${lepNonSos}`;

let failed = false;

{
  const r = run(['--quiet', goldenLep], null);
  if (r.status !== 0) {
    console.error('golden LEP decode failed', r.stderr);
    failed = true;
  }
}

{
  const r = run(['--quiet', meshNonSos], null);
  if (r.status !== 0) {
    console.error('golden mesh decode failed', r.stderr);
    failed = true;
  }
}

{
  const r = run(['--quiet', 'deadbeef'], null);
  if (r.status !== 3) {
    console.error('expected exit 3 for bad decode, got', r.status, r.stdout, r.stderr);
    failed = true;
  }
}

{
  const fixture = join(__dirname, 'fixtures', 'verify-decode-lines.txt');
  const text = readFileSync(fixture, 'utf8');
  const r = run(['--all-lines', '--jsonl', '--quiet'], text);
  if (r.status !== 0) {
    console.error('jsonl batch failed', r.status, r.stderr);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);

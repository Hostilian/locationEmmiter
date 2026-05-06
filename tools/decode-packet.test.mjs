import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'decode-packet.mjs');

function run(args, input) {
  return spawnSync(process.execPath, [script, ...args], {
    input,
    encoding: 'utf8',
  });
}

test('help exits 0', () => {
  const r = run(['--help'], null);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /decode-packet/);
});

test('version exits 0', () => {
  const r = run(['--version'], null);
  assert.equal(r.status, 0);
});

test('golden LEP decode quiet', () => {
  const hex = '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
  const r = run(['--quiet', hex], null);
  assert.equal(r.status, 0);
});

test('bad hex exits 3', () => {
  const r = run(['--quiet', 'deadbeef'], null);
  assert.equal(r.status, 3);
});

test('invalid hex letters are rejected', () => {
  const r = run(['--quiet', '4c47gg'], null);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /invalid hex character/i);
});

test('file mode all-lines jsonl', () => {
  const f = join(__dirname, 'fixtures', 'verify-decode-lines.txt');
  const r = run(['--file', f, '--all-lines', '--jsonl'], null);
  assert.equal(r.status, 0);
  const lines = r.stdout.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, 3);
  for (const ln of lines) {
    const o = JSON.parse(ln);
    assert.equal(o.ok, true);
  }
});

test('stdin pipe', () => {
  const hex = '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
  const r = spawnSync(process.execPath, [script, '--all-lines'], {
    input: `${hex}\n`,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
});

test('fixture file readable', () => {
  const f = join(__dirname, 'fixtures', 'verify-decode-lines.txt');
  const t = readFileSync(f, 'utf8');
  assert.ok(t.includes('4c47454f'));
});

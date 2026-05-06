import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'encode-packet.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

test('encode full-only matches golden prefix', () => {
  const r = run([
    '--lat',
    '48.85837',
    '--lon',
    '2.29481',
    '--unix',
    '1700000000',
    '--alt',
    '35',
    '--accuracy',
    '12',
    '--battery',
    '87',
    '--device',
    '0102030405060708',
    '--relay',
    '--full-only',
  ]);
  assert.equal(r.status, 0);
  const golden =
    '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
  assert.equal(r.stdout.trim().replace(/\s+/g, ' '), golden.replace(/(.{2})/g, '$1 ').trim());
  assert.equal(r.stdout.trim().replace(/\s/g, ''), golden);
});

test('encode JSON mode returns three keys', () => {
  const r = run(['--lat', '0', '--lon', '0', '--unix', '0', '--device', '0102030405060708']);
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.ok(j.full && j.ble && j.mesh);
});

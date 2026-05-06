import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'lora-airtime.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

test('help exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
});

test('version exits 0', () => {
  const r = run(['--version']);
  assert.equal(r.status, 0);
});

test('missing args exits 2', () => {
  const r = run([]);
  assert.equal(r.status, 2);
});

test('SF7 BW125 CR5 payload 10 produces JSON with timeOnAirMs', () => {
  const r = run(['--sf', '7', '--bw', '125', '--cr', '5', '--payload', '10']);
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.sf, 7);
  assert.ok(j.timeOnAirMs > 0);
  assert.ok(j.payloadSymbols > 0);
});

test('SF12 BW125 CR8 payload 24', () => {
  const r = run(['--sf', '12', '--bw', '125', '--cr', '8', '--payload', '24', '--preamble', '8']);
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.sf, 12);
  assert.equal(j.preambleSymbols, 8);
  assert.ok(j.timeOnAirMs > 50);
});

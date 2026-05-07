import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tool = path.join(__dirname, 'export-packets.mjs');
const fixture = path.join(__dirname, 'fixtures', 'verify-decode-lines.txt');

test('export-packets.mjs exports to gpx', () => {
  const result = spawnSync('node', [tool, '--file', fixture, '--format', 'gpx']);
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.toString().includes('<gpx'));
  assert.ok(result.stdout.toString().includes('</gpx>'));
});

test('export-packets.mjs exports to csv', () => {
  const result = spawnSync('node', [tool, '--file', fixture, '--format', 'csv']);
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.toString().includes('unix_time,iso_time,lat,lon'));
});

test('export-packets.mjs exports to geojson', () => {
  const result = spawnSync('node', [tool, '--file', fixture, '--format', 'geojson']);
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.toString().includes('"type": "FeatureCollection"'));
});

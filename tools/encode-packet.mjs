#!/usr/bin/env node
/**
 * Encode GNSS-style LEP v1 (+ optional BLE short + LRM1 mesh wrapper).
 * Requires: npm run build (packet + mesh)
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { encodeBleShort, encodeFull, FLAG_RELAY_ELIGIBLE, FLAG_SOS } from '../shared/packet/dist/index.js';
import { encodeMeshFromPacket } from '../shared/mesh/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function packetLibVersion() {
  try {
    const pj = JSON.parse(fs.readFileSync(join(__dirname, '../shared/packet/package.json'), 'utf8'));
    return typeof pj.version === 'string' ? pj.version : '0.0.0';
  } catch {
    return 'unknown';
  }
}

function toHexSpaced(buf) {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function parseDeviceId(s) {
  const hex = s.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length !== 16) return { error: '--device must be 16 hex chars (8 bytes)' };
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { id: out };
}

function usage() {
  console.log(`encode-packet.mjs — build LEP hex (full / BLE / mesh)

Required:
  --lat <deg> --lon <deg>

Optional:
  --alt <m> (default 0)   --accuracy <m> (default 10)   --unix <sec> (default now)
  --battery <0-255> (default 255 unknown)
  --device <16 hex> (8 bytes, default 0102030405060708)
  --text <note> (≤ 32 UTF-8 bytes)
  --sos   --relay
  --mesh-only | --ble-only | --full-only   (default: print JSON with all three hex strings)

  -h / --help     --version / -v
`);
}

function parseArgs(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    return { kind: 'help' };
  }
  const out = {
    lat: null,
    lon: null,
    alt: 0,
    accuracy: 10,
    unix: Math.floor(Date.now() / 1000),
    battery: 255,
    device: '0102030405060708',
    text: '',
    sos: false,
    relay: false,
    mode: 'all',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null) throw new Error(`${a} requires a value`);
      return v;
    };
    if (a === '--lat') out.lat = Number(next());
    else if (a === '--lon') out.lon = Number(next());
    else if (a === '--alt') out.alt = Number(next());
    else if (a === '--accuracy') out.accuracy = Number(next());
    else if (a === '--unix') out.unix = Number(next()) >>> 0;
    else if (a === '--battery') out.battery = Number(next());
    else if (a === '--device') out.device = next();
    else if (a === '--text') out.text = next();
    else if (a === '--sos') out.sos = true;
    else if (a === '--relay') out.relay = true;
    else if (a === '--mesh-only') out.mode = 'mesh';
    else if (a === '--ble-only') out.mode = 'ble';
    else if (a === '--full-only') out.mode = 'full';
    else throw new Error(`unknown arg: ${a}`);
  }
  return { kind: 'ok', opts: out };
}

const argv0 = process.argv.slice(2);
if (argv0.length === 1 && (argv0[0] === '--version' || argv0[0] === '-v' || argv0[0] === '-V')) {
  console.log(`encode-packet @location-emitter/packet ${packetLibVersion()}`);
  process.exit(0);
}

let parsed;
try {
  parsed = parseArgs(argv0);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
}

if (argv0.length === 0 || parsed.kind === 'help') {
  usage();
  process.exit(parsed.kind === 'help' ? 0 : 2);
}

const o = parsed.opts;
if (o.lat == null || o.lon == null || !Number.isFinite(o.lat) || !Number.isFinite(o.lon)) {
  console.error('--lat and --lon are required (finite numbers)');
  process.exit(2);
}

const dev = parseDeviceId(o.device);
if ('error' in dev) {
  console.error(dev.error);
  process.exit(2);
}

let flags = 0;
if (o.sos) flags |= FLAG_SOS;
if (o.relay) flags |= FLAG_RELAY_ELIGIBLE;

const packet = {
  version: 1,
  flags,
  unixTime: o.unix,
  latE7: Math.round(o.lat * 1e7),
  lonE7: Math.round(o.lon * 1e7),
  altM: Math.round(o.alt),
  hAccuracyM: Math.min(65535, Math.max(0, Math.round(o.accuracy))),
  batteryPct: Math.min(255, Math.max(0, Math.round(o.battery))),
  deviceId: dev.id,
  text: o.text,
};

try {
  const full = encodeFull(packet);
  const ble = encodeBleShort(packet);
  const mesh = encodeMeshFromPacket(packet);
  const fullH = toHexSpaced(full);
  const bleH = toHexSpaced(ble);
  const meshH = toHexSpaced(mesh);
  if (o.mode === 'full') {
    console.log(fullH);
  } else if (o.mode === 'ble') {
    console.log(bleH);
  } else if (o.mode === 'mesh') {
    console.log(meshH);
  } else {
    console.log(JSON.stringify({ full: fullH, ble: bleH, mesh: meshH }, null, 2));
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
}

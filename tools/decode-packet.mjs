#!/usr/bin/env node
/**
 * Decode hex dump to JSON. Supports raw LEP (full/BLE short) or mesh-wrapped LoRa (LRM1 + LEP).
 *
 * Usage:
 *   node tools/decode-packet.mjs 4C 47 45 4F ...
 *   node tools/decode-packet.mjs --file path/to/dump.txt
 *   node tools/decode-packet.mjs --file dump.txt --all-lines
 *   node tools/decode-packet.mjs --file dump.txt --all-lines --jsonl
 *   echo 4c47454f... | node tools/decode-packet.mjs --all-lines
 *   node tools/decode-packet.mjs --help
 *   node tools/decode-packet.mjs --version
 *   node tools/decode-packet.mjs -q 4c47454f…   # quiet: exit code only if OK
 *
 * Hex may be space/comma/newline-separated or one continuous run; optional 0x prefixes stripped.
 * Default: if input has multiple lines, only line 1 is decoded. With --all-lines, every non-empty line is decoded.
 * Requires: npm run build (packet + mesh)
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeAny, decodeFull } from '../shared/packet/dist/index.js';
import { unwrapMeshFrame } from '../shared/mesh/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function packetLibVersion() {
  try {
    const pj = JSON.parse(fs.readFileSync(join(__dirname, '../shared/packet/package.json'), 'utf8'));
    return typeof pj.version === 'string' ? pj.version : '0.0.0';
  } catch {
    return 'unknown';
  }
}

function parseHexBytes(source) {
  const hex = source.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (hex.length === 0) {
    return null;
  }
  if (hex.length % 2 !== 0) {
    return { error: 'odd number of hex digits (check input)' };
  }
  return Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
}

function packetJson(p) {
  return {
    ...p,
    deviceId: Buffer.from(p.deviceId).toString('hex'),
    lat: p.latE7 / 1e7,
    lon: p.lonE7 / 1e7,
  };
}

/** Decode one frame; mesh or full/BLE short. */
function decodeOneBuf(buf) {
  if (buf.length >= 6 && buf[0] === 0x4c && buf[1] === 0x52 && buf[2] === 0x4d && buf[3] === 0x31) {
    const u = unwrapMeshFrame(buf);
    if (!u) {
      return { ok: false, transport: 'mesh', error: 'invalid mesh frame' };
    }
    const d = decodeFull(u.lepWire);
    return {
      ok: d.ok,
      transport: 'mesh',
      hopRemaining: u.hopRemaining,
      lep: d.ok ? packetJson(d.packet) : d,
    };
  }
  const d = decodeAny(buf);
  return {
    ok: d.ok,
    transport: 'lep',
    wire: d.ok ? d.wire : undefined,
    decode: d.ok ? packetJson(d.packet) : d,
  };
}

function parseCli() {
  const raw = process.argv.slice(2);
  if (raw.length === 1 && (raw[0] === '-h' || raw[0] === '--help')) {
    return { kind: 'help' };
  }

  let allLines = false;
  let jsonl = false;
  let quiet = false;
  let filePath = null;
  const args = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === '--all-lines' || a === '-a') {
      allLines = true;
      continue;
    }
    if (a === '--jsonl') {
      jsonl = true;
      continue;
    }
    if (a === '--quiet' || a === '-q') {
      quiet = true;
      continue;
    }
    if (a === '--file') {
      const path = raw[++i];
      if (!path) {
        return { kind: 'error', message: '--file requires a path' };
      }
      filePath = path;
      continue;
    }
    args.push(a);
  }

  if (filePath) {
    try {
      return { kind: 'text', text: fs.readFileSync(filePath, 'utf8'), allLines, jsonl, quiet };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { kind: 'error', message: `read ${filePath}: ${msg}` };
    }
  }

  if (args.length > 0) {
    return { kind: 'text', text: args.join(' '), allLines, jsonl, quiet };
  }
  if (process.stdin.isTTY) {
    return { kind: 'empty' };
  }
  return { kind: 'text', text: fs.readFileSync(0, 'utf8'), allLines, jsonl, quiet };
}

const argv0 = process.argv.slice(2);
if (argv0.length === 1 && (argv0[0] === '--version' || argv0[0] === '-V' || argv0[0] === '-v')) {
  console.log(`decode-packet @location-emitter/packet ${packetLibVersion()}`);
  process.exit(0);
}

const cli = parseCli();
if (cli.kind === 'help') {
  console.log(`decode-packet.mjs — LEP / mesh hex → JSON

  node tools/decode-packet.mjs <hex>
  node tools/decode-packet.mjs --file dump.txt
  node tools/decode-packet.mjs --file dump.txt --all-lines
  echo <hex> | node tools/decode-packet.mjs --all-lines

Without --all-lines: multiple input lines → only line 1 is decoded.
With --all-lines: each non-empty line is decoded; default JSON is { count, results }.
  --jsonl (with --all-lines only): one JSON object per line on stdout (NDJSON).
  --quiet / -q: no stdout on success; decode errors go to stderr. With --all-lines, never prints the batch JSON.
  (On Windows PowerShell, prefer --quiet — bare -q can be eaten by the shell.)
  --version / -V / -v: print @location-emitter/packet semver (from shared/packet).
Exit 3 if any line fails to decode.`);
  process.exit(0);
}
if (cli.kind === 'error') {
  console.error(cli.message);
  process.exit(1);
}
if (cli.kind === 'empty') {
  console.error(
    'Usage: node tools/decode-packet.mjs <hex…> | --file <path> [--all-lines] [--jsonl] | pipe stdin …',
  );
  process.exit(1);
}

if (cli.kind === 'text' && cli.jsonl && !cli.allLines) {
  console.error('--jsonl requires --all-lines');
  process.exit(1);
}

const textRaw = cli.text.trim();
const lines = textRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

if (cli.allLines) {
  if (lines.length === 0) {
    console.error('no non-empty lines');
    process.exit(1);
  }
  const results = [];
  let worstExit = 0;
  for (let i = 0; i < lines.length; i++) {
    const buf = parseHexBytes(lines[i]);
    if (buf === null || (typeof buf === 'object' && 'error' in buf)) {
      results.push({
        line: i + 1,
        ok: false,
        error: buf && typeof buf === 'object' && 'error' in buf ? buf.error : 'no hex',
      });
      worstExit = 3;
      continue;
    }
    const r = decodeOneBuf(buf);
    results.push({ line: i + 1, ...r });
    if (!r.ok) {
      worstExit = 3;
    }
  }
  if (!cli.quiet) {
    if (cli.jsonl) {
      for (const r of results) {
        console.log(JSON.stringify(r));
      }
    } else {
      console.log(JSON.stringify({ count: lines.length, results }, null, 2));
    }
  }
  process.exit(worstExit);
}

let text = textRaw;
if (lines.length > 1) {
  text = lines[0] ?? text;
}

const buf = parseHexBytes(text);
if (buf === null || (typeof buf === 'object' && 'error' in buf)) {
  console.error(
    buf && typeof buf === 'object' && 'error' in buf
      ? buf.error
      : 'no hex found in input',
  );
  process.exit(1);
}

const single = decodeOneBuf(buf);
if (single.transport === 'mesh') {
  const s = JSON.stringify(
    { transport: 'mesh', hopRemaining: single.hopRemaining, lep: single.lep },
    null,
    2,
  );
  if (cli.quiet) {
    if (!single.ok) {
      console.error(s);
    }
  } else {
    console.log(s);
  }
  process.exit(single.ok ? 0 : 3);
}

const lepOut = JSON.stringify(
  { transport: 'lep', decode: single.decode, wire: single.ok ? single.wire : undefined },
  null,
  2,
);
if (cli.quiet) {
  if (!single.ok) {
    console.error(lepOut);
  }
} else {
  console.log(lepOut);
}
process.exit(single.ok ? 0 : 3);

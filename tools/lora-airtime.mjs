#!/usr/bin/env node
/**
 * Approximate LoRa **time on air** (ms) for PHY planning / duty-cycle sanity checks.
 * Uses the usual Semtech-style symbol count (explicit header, CRC enabled in PHY).
 *
 * Usage:
 *   node tools/lora-airtime.mjs --sf 9 --bw 125 --cr 7 --payload 80
 *   node tools/lora-airtime.mjs --sf 12 --bw 125 --cr 8 --payload 24 --preamble 8
 *   node tools/lora-airtime.mjs --help
 *   node tools/lora-airtime.mjs --version
 *
 * --bw is in **kHz** (e.g. 125). --cr is RadioLib-style **5–8** (4/5 … 4/8).
 * Not legal advice; verify ETSI / FCC rules for your band and device class.
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: node tools/lora-airtime.mjs --sf <6-12> --bw <kHz> --cr <5-8> --payload <bytes> [--preamble <sym>]

Example: node tools/lora-airtime.mjs --sf 9 --bw 125 --cr 7 --payload 72

  --help / -h
  --version / -V / -v   (semver from @location-emitter/packet)`;

function packetLibVersion() {
  try {
    const pj = JSON.parse(fs.readFileSync(join(__dirname, '../shared/packet/package.json'), 'utf8'));
    return typeof pj.version === 'string' ? pj.version : '0.0.0';
  } catch {
    return 'unknown';
  }
}

function usage() {
  console.error(HELP);
  process.exit(2);
}

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { preamble: 8 };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--sf') o.sf = Number(a[++i]);
    else if (k === '--bw') o.bw = Number(a[++i]);
    else if (k === '--cr') o.cr = Number(a[++i]);
    else if (k === '--payload') o.payload = Number(a[++i]);
    else if (k === '--preamble') o.preamble = Number(a[++i]);
    else usage();
  }
  if (![o.sf, o.bw, o.cr, o.payload].every((x) => Number.isFinite(x))) usage();
  if (o.sf < 6 || o.sf > 12 || o.cr < 5 || o.cr > 8 || o.payload < 0 || o.bw <= 0) usage();
  return o;
}

/** Symbol duration (seconds). */
function symbolSec(sf, bwKhz) {
  return 2 ** sf / (bwKhz * 1000);
}

/**
 * Payload symbol count (explicit header, CRC on).
 * cr: RadioLib 5..8. DE = 1 when SF >= 12 per LoRaWAN-style low data rate optimize.
 */
function payloadSymbolCount(payloadBytes, sf, cr) {
  const de = sf >= 12 ? 1 : 0;
  const H = 1; // explicit header
  const num = 8 * payloadBytes - 4 * sf + 28 + 16 * H - 20;
  const den = 4 * (sf - 2 * de);
  const ratio = Math.max(num / den, 0);
  const ceilPart = Math.ceil(ratio - 1e-12);
  return 8 + ceilPart * cr;
}

function main() {
  const av = process.argv.slice(2);
  if (av.length === 1 && (av[0] === '--help' || av[0] === '-h')) {
    console.log(HELP);
    process.exit(0);
  }
  if (av.length === 1 && (av[0] === '--version' || av[0] === '-V' || av[0] === '-v')) {
    console.log(`lora-airtime @location-emitter/packet ${packetLibVersion()}`);
    process.exit(0);
  }

  const { sf, bw, cr, payload, preamble } = parseArgs();
  const ts = symbolSec(sf, bw);
  const nPayload = payloadSymbolCount(payload, sf, cr);
  const nTotal = preamble + 4.25 + nPayload;
  const toaMs = nTotal * ts * 1000;

  /** Rough EU planning hints: 1% ≈ 36 s airtime / h often cited for some ISM rules (verify). */
  const airtimeBudget1Pct = 36;
  const airtimeBudget01Pct = 3.6;
  const toaS = toaMs / 1000;
  const perHour1 = toaS > 0 ? Math.floor(airtimeBudget1Pct / toaS) : 0;
  const perHour01 = toaS > 0 ? Math.floor(airtimeBudget01Pct / toaS) : 0;

  console.log(JSON.stringify({
    sf,
    bwKhz: bw,
    cr,
    payloadBytes: payload,
    preambleSymbols: preamble,
    symbolTimeMs: ts * 1000,
    payloadSymbols: nPayload,
    totalSymbols: nTotal,
    timeOnAirMs: Math.round(toaMs * 1000) / 1000,
    hints: {
      note: 'EU sub-bands differ (0.1% vs 1% vs 10%); this uses coarse 36 s/h (1%) and 3.6 s/h (0.1%) illustration only.',
      similarPacketsPerHourAtRough1PercentDuty: perHour1,
      similarPacketsPerHourAtRough0Point1PercentDuty: perHour01,
    },
  }, null, 2));
}

main();

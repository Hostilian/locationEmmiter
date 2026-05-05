import {
  decodeFull,
  type LocationEmitterPacketV1,
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
} from '@location-emitter/packet';
import { unwrapMeshFrame, wrapLepWithMesh } from './envelope.js';

const DEDUPE_TTL_MS = 15 * 60 * 1000;
const RELAY_GAP_SOS_MS = 10_000;
const RELAY_GAP_NORMAL_MS = 30_000;

function deviceIdHex(id: Uint8Array): string {
  return [...id].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** FNV-1a 32-bit over exact LEP wire (stable dedupe for identical frames). */
export function fnv1a32Hex(data: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export type RelayProcessResult = {
  /** Decoded position when frame was accepted (first time for this dedupe key). */
  delivered: LocationEmitterPacketV1 | null;
  /** Retransmit this mesh wire (same LEP bytes, hop decremented). */
  forwardWire: Uint8Array | null;
  dropReason?: string;
};

/**
 * Store-and-forward policy from [RECEIVERS_AND_RELAY.md](../../docs/RECEIVERS_AND_RELAY.md).
 * Call once per received LoRa mesh frame.
 */
export class RelayEngine {
  private dedupe = new Map<string, number>();
  private lastRelayOut = new Map<string, number>();

  constructor(private readonly nowMs: () => number = () => Date.now()) {}

  private gc(): void {
    const t = this.nowMs();
    for (const [k, exp] of this.dedupe) {
      if (exp <= t) this.dedupe.delete(k);
    }
  }

  processReceivedMeshFrame(meshWire: Uint8Array): RelayProcessResult {
    this.gc();
    const un = unwrapMeshFrame(meshWire);
    if (!un) return { delivered: null, forwardWire: null, dropReason: 'bad_mesh' };
    if (un.hopRemaining === 0) {
      return { delivered: null, forwardWire: null, dropReason: 'hop_zero' };
    }

    const dec = decodeFull(un.lepWire);
    if (!dec.ok) return { delivered: null, forwardWire: null, dropReason: 'lep_decode' };

    const p = dec.packet;
    const key = fnv1a32Hex(un.lepWire);
    const t = this.nowMs();
    const exp = this.dedupe.get(key);
    if (exp !== undefined && exp > t) {
      return { delivered: null, forwardWire: null, dropReason: 'deduped' };
    }
    this.dedupe.set(key, t + DEDUPE_TTL_MS);

    const dev = deviceIdHex(p.deviceId);
    const sos = (p.flags & FLAG_SOS) !== 0;
    const gap = sos ? RELAY_GAP_SOS_MS : RELAY_GAP_NORMAL_MS;

    const mayRelay = (p.flags & FLAG_RELAY_ELIGIBLE) !== 0 && un.hopRemaining > 1;
    if (!mayRelay) {
      return { delivered: p, forwardWire: null };
    }

    const last = this.lastRelayOut.get(dev) ?? 0;
    if (t - last < gap) {
      return { delivered: p, forwardWire: null, dropReason: 'rate_limited' };
    }

    const newHop = un.hopRemaining - 1;
    const forwardWire = wrapLepWithMesh(un.lepWire, newHop, un.reserved);
    this.lastRelayOut.set(dev, t);
    return { delivered: p, forwardWire };
  }
}
